import redisRepository from "../model/redis_repository.js";
import {
  findMatchingCriteria,
  hasMatchingCriteria,
  matchRequestToEntity,
} from "../utility/utility.js";

import { sendMessage } from "../utility/ws_util.js";

/** @typedef {import("ws").WebSocket} WebSocket*/
/** @typedef {import("../types").UserInstance} UserInstance */
/** @typedef {import("../types").MatchRequest} MatchRequest */
/** @typedef {import("../types").MatchRequestEntity} MatchRequestEntity */
/** @typedef {import("../types").Criteria} Criteria */
/** @typedef {import("../types").CollaborationSession} CollaborationSession */

class UserService {
  /** @type {Map<string, UserInstance>} */
  #userConnection = new Map();

  /**
   * @param {UserInstance} userInstance
   */
  addUser(userInstance) {
    this.#userConnection.set(userInstance.id, userInstance);
  }

  /**
   * @param {string} id
   */
  deleteUser(id) {
    this.#userConnection.delete(id);
  }

  /**
   * @param {string} userId
   */
  getUser(userId) {
    const userInstance = this.#userConnection.get(userId);
    if (!userInstance) {
      return null;
    }
    return userInstance;
  }
}

export class MatchingService {
  #userService = new UserService();
  #redisRepository = redisRepository;

  /**
   * @param {string} userId
   */
  async disposeUser(userId) {
    const userInstance = this.#userService.getUser(userId);
    if (userInstance) {
      this.#userService.deleteUser(userId);
      userInstance.ws.close();
    }
  }

  /**
   * @param {MatchRequest} request
   * @param {UserInstance} userInstance
   */
  async addRequest(userInstance, request) {
    request.time = Date.now();
    this.#userService.addUser(userInstance);
    const matchRequestEntity = matchRequestToEntity(userInstance, request);

    await this.#redisRepository.storeUserRequest(
      userInstance.id,
      matchRequestEntity
    );
    this.listenToRequestChange(userInstance.id);
    await this.#redisRepository.updateUserRequest(userInstance.id, "waiting");
  }

  /**
   * @param {UserInstance} userInstance
   */
  async handleUserAccept(userInstance) {
    const matchedDetails = await this.#redisRepository.getMatchedDetails(
      userInstance.id
    );
    if (matchedDetails) {
      matchedDetails.accepts = true;
      await this.#redisRepository.updateMatchedDetails(
        userInstance.id,
        matchedDetails
      );
    } else {
      console.error("Missing Matched Details");
      throw new Error(`Missing Matched Details for ${userInstance.id}`);
    }
  }

  /**
   * @param {Criteria[]} criterias
   */
  async #findExistingMatch(criterias) {
    /** @type {Array<[string, MatchRequestEntity]>} */
    const matchedRequest = [];

    const userRequests = await redisRepository.getAllUserRequests();
    for (const [k, v] of userRequests.entries()) {
      if (v.status !== "waiting") {
        continue;
      }
      if (hasMatchingCriteria(criterias, v.criterias)) {
        matchedRequest.push([k, v]);
      }
    }
    return matchedRequest;
  }

  async #getSession() {
    return "some session";
  }

  /**
   * @param {string} userId
   */
  async listenToRequestChange(userId) {
    const requestKey = `${userRequestKeyPrefix}${userId}`;
    redisRepository.listenToKeyChanges(requestKey, async (change) => {
      switch (change.operation) {
        case "set":
          await this.#onRequestSet(requestKey);
        case "del":
          {
            await this.#onRequestDelete(requestKey);
            const userInstance = this.#userService.getUser(userId);
            if (userInstance) {
              this.#userService.deleteUser(userId);
              userInstance.ws.close();
            }
          }
          break;
        case "expire":
          {
            const userInstance = this.#userService.getUser(userId);
            if (userInstance) {
              this.#userService.deleteUser(userId);
              sendMessage(userInstance.ws, {
                type: "timeout",
                message: "Queue timeout",
              });
              userInstance.ws.close();
            }
          }
          break;
        default:
          console.log("Unaccounted operation:", change.operation);
      }
    });
  }

  /**
   * @param {string} requestKey
   */
  async #onRequestSet(requestKey) {
    const userId = requestKey.replace(userRequestKeyPrefix, "");
    const requestData = await this.#redisRepository.getUserRequest(userId);

    switch (requestData.status) {
      case "waiting":
        {
          // search for existing
          const existingMatches = await this.#findExistingMatch(
            requestData.criterias
          );
          const hasExisting = existingMatches.length !== 0;
          if (!hasExisting) {
            break;
          }
          existingMatches.sort((a, b) => a[1].time - b[1].time);
          const [partnerId, partnerMatchRequest] = existingMatches[0];
          const matchingCriteria = findMatchingCriteria(
            requestData.criterias,
            partnerMatchRequest.criterias
          );
          await this.#redisRepository.storeMatchedDetails(userId, {
            criteria: matchingCriteria,
            partner: partnerId,
            accepts: false,
          });
          await this.#redisRepository.storeMatchedDetails(partnerId, {
            criteria: matchingCriteria,
            partner: userId,
            accepts: false,
          });
          await this.#redisRepository.updateUserRequest(userId, "pending");
          await this.#redisRepository.updateUserRequest(partnerId, "pending");
          setTimeout(async () => {
            const [userMatchDetails, partnerMatchDetails] =
              await this.#redisRepository.getPairMatchDetails(
                userId,
                partnerId
              );
            const userResult = userMatchDetails.accepts ?? false;
            const partnerResult = partnerMatchDetails.accepts ?? false;
            if (userResult && partnerResult) {
              // creates collaboration
              const session = await this.#getSession();
              await this.#redisRepository.storeCollaborationSession(
                session,
                userId,
                partnerId
              );

              // change status
              await this.#redisRepository.updateUserRequest(userId, "matched");
              await this.#redisRepository.updateUserRequest(
                partnerId,
                "matched"
              );
            }
          }, Number(process.env.ACCEPTANCE_TIMEOUT));
        }
        break;
      case "pending": {
        // Send match found to user
        const userInstance = this.#userService.getUser(userId);
        const matchedDetails = await this.#redisRepository.getMatchedDetails(
          userId
        );

        /** @type {import("../types").MatchFound} */
        const message = { criteria: matchedDetails.criteria };
        sendMessage(userInstance.ws, message);
        setTimeout(async () => {
          const matchedDetails = await this.#redisRepository.getMatchedDetails(
            userId
          );
          const userResult = matchedDetails.accepts;

          // remove matched details
          await this.#redisRepository.removeMatchedDetails(userId);
          if (!userResult) {
            // disconnect
            await this.#redisRepository.removeUserRequest(userId);
            this.#userService.deleteUser(userId);
            userInstance.ws.close();
          } else {
            // resume queue
            await this.#redisRepository.updateUserRequest(userId, "waiting");
          }
        }, Number(process.env.ACCEPTANCE_TIMEOUT));
        break;
      }
      case "matched":
        {
          const userInstance = this.#userService.getUser(userId);
          const matchedDetails = await this.#redisRepository.getMatchedDetails(
            userId
          );
          const partner = matchedDetails.partner;
          const collaborationSession =
            await this.#redisRepository.getCollaborationSession(
              userId,
              partner
            );
          sendMessage(userInstance.ws, collaborationSession);
        }
        break;
      case "initial":
        console.log("Initial state, do nothing");
        break;
      default:
        throw new Error("Unrecognized state");
    }
  }

  /**
   * @param {string} requestKey
   */
  async #onRequestDelete(requestKey) {}
}
