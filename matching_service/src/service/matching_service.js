import { userRequestKeyPrefix } from "../constants.js";
import redisRepository from "../model/redis_repository.js";
import { ACCEPTANCE_TIMEOUT } from "../server_config.js";
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
/** @typedef {import("../types").MatchFoundNotification} MatchFoundNotification */
/** @typedef {import("../types").MatchRequestStatus} MatchRequestStatus*/
/** @typedef {import("../types.js").MatchFoundResponse} MatchFoundResponse */

class TimeoutService {
  /**
   * @type {Map<string, NodeJS.Timeout>}
   * @private
   */
  timeoutMap = new Map();

  /**
   * @param {string} id
   * @param {NodeJS.Timeout} timeout
   */
  addTimeout(id, timeout) {
    this.timeoutMap.set(id, timeout);
  }

  /**
   * @param {string} id
   */
  removeTimeout(id) {
    const timeout = this.timeoutMap.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeoutMap.delete(id);
    }
  }
}
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
  /** @private */
  userService = new UserService();
  /** @private */
  redisRepository = redisRepository;
  /** @private */
  acceptanceTimeout = new TimeoutService();

  /**
   * @param {string} userId
   */
  async disposeUser(userId) {
    const userInstance = this.userService.getUser(userId);
    if (userInstance) {
      userInstance.ws.close();
      this.userService.deleteUser(userId);
    }

    await this.redisRepository.removeUserRequest(userId);
  }

  /**
   * @param {MatchRequest} request
   * @param {UserInstance} userInstance
   */
  async addRequest(userInstance, request) {
    request.time = Date.now();
    this.userService.addUser(userInstance);
    const matchRequestEntity = matchRequestToEntity(userInstance, request);

    await this.redisRepository.storeUserRequest(
      userInstance.id,
      matchRequestEntity
    );
    this.listenToRequestChange(userInstance.id);
    await this.redisRepository.updateUserRequest(userInstance.id, "waiting");
  }

  /**
   * @param {string} userId
   * @param {MatchFoundResponse} message
   */
  async handleUserMatchFoundResponse(userId, message) {
    switch (message.response) {
      case "accept":
        {
          const matchedDetails = await this.redisRepository.getMatchedDetails(
            userId
          );
          if (!matchedDetails) {
            console.log("No matched details");
            return;
          }

          const partnerDetails = await this.redisRepository.getMatchedDetails(
            matchedDetails.partner
          );
          if (!partnerDetails) {
            console.log("Partner disconnected");
            const key = [userId, matchedDetails.partner].sort().join("");
            this.acceptanceTimeout.removeTimeout(key);
            await this.redisRepository.updateUserRequest(userId, "waiting");
            return;
          }

          if (partnerDetails.accepts) {
            const key = [userId, matchedDetails.partner].sort().join("");
            this.acceptanceTimeout.removeTimeout(key);

            const session = await this.#getSession();
            await this.redisRepository.storeCollaborationSession(
              session,
              userId,
              matchedDetails.partner
            );
            const isSuccess =
              await this.redisRepository.atomicTransitionUsersState(
                userId,
                matchedDetails.partner,
                "pending",
                "matched"
              );

            if (!isSuccess) {
              console.error(
                "Error: Unable to transition from pending -> matched"
              );
              await this.redisRepository.removeUserRequest(userId);
              await this.redisRepository.removeUserRequest(
                matchedDetails.partner
              );
            }
          }
        }
        break;
      case "reject":
        {
          await this.redisRepository.removeUserRequest(userId);
        }
        break;
    }
  }

  /**
   * @param {Criteria[]} criterias
   * @private
   */
  async findExistingMatch(criterias) {
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
          try {
            await this.#onRequestSet(requestKey);
          } catch (error) {
            console.error(error);
          }
        case "del":
          {
            await this.onRequestDelete(requestKey);
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
    console.log(requestKey);
    const userId = requestKey.replace(userRequestKeyPrefix, "");
    const requestData = await this.redisRepository.getUserRequest(userId);
    console.log(`On Set: ${requestKey}: ${requestData.status}`);
    switch (requestData.status) {
      case "waiting":
        await this.handleWaiting(userId, requestData);
        break;
      case "pending":
        await this.handlePending(userId);
        break;
      case "matched":
        await this.handleMatched(userId);
        break;
      case "initial":
        console.log("Initial state, do nothing");
        break;
      default:
        throw new Error("Unrecognized state");
    }
  }

  /**
   * @param {string} userId
   */
  async handleMatched(userId) {
    const userInstance = this.userService.getUser(userId);
    const matchedDetails = await this.redisRepository.getMatchedDetails(userId);
    const partner = matchedDetails.partner;
    const collaborationSession =
      await this.redisRepository.getCollaborationSession(userId, partner);
    sendMessage(userInstance.ws, collaborationSession);
  }

  /**
   * @param {string} userId
   * @private
   */
  async handlePending(userId) {
    // Send match found to user
    const userInstance = this.userService.getUser(userId);
    if (!userInstance) {
      throw new Error("Invalid system state: Not user Id: " + userId);
    }
    const matchedDetails = await this.redisRepository.getMatchedDetails(userId);
    if (!matchedDetails) {
      throw new Error("No matched details for ID: " + userId);
    }

    /** @type {MatchFoundNotification} */
    const message = {
      type: "matchFound",
      criteria: matchedDetails.criteria,
    };
    sendMessage(userInstance.ws, message);
    console.log(`${userId}: MatchFoundNotification Sent`);
  }

  /**
   * @param {string} userId1
   * @param {string} userId2
   * @param {Criteria} criteria
   */
  async createMatchDetails(userId1, userId2, criteria) {
    await this.redisRepository.storeMatchedDetails(userId1, {
      criteria: criteria,
      partner: userId2,
      accepts: false,
    });
    await this.redisRepository.storeMatchedDetails(userId2, {
      criteria: criteria,
      partner: userId1,
      accepts: false,
    });
  }

  /**
   * @param {string} userId
   * @param {MatchRequestEntity} matchRequestEntity
   * @private
   */
  async handleWaiting(userId, matchRequestEntity) {
    const existingMatches = await this.findExistingMatch(
      matchRequestEntity.criterias
    );

    const hasExisting = existingMatches.length !== 0;
    if (!hasExisting) {
      console.log(`${userId} did not found existing match`);
      return;
    }
    console.log(`${userId} found existing match`);

    existingMatches.sort((a, b) => a[1].time - b[1].time);
    const [partnerId, partnerMatchRequest] = existingMatches[0];
    const matchingCriteria = findMatchingCriteria(
      matchRequestEntity.criterias,
      partnerMatchRequest.criterias
    );

    const isSuccess = await this.redisRepository.atomicTransitionUsersState(
      userId,
      partnerId,
      "waiting",
      "pending"
    );

    if (!isSuccess) {
      return;
    }

    try {
      await this.createMatchDetails(userId, partnerId, matchingCriteria);
    } catch (error) {
      console.error("Error while creating match details", error);
    }

    // to delete or resume after timeout based on result
    const timeout = setTimeout(async () => {
      const [userMatchDetails, partnerMatchDetails] =
        await this.redisRepository.getPairMatchDetails(userId, partnerId);
      const userResult = userMatchDetails ? userMatchDetails.accepts : false;
      const partnerResult = partnerMatchDetails
        ? userMatchDetails.accepts
        : false;

      if (!userResult) {
        this.redisRepository.removeUserRequest(userId);
      } else {
        this.redisRepository.updateUserRequest(userId, "waiting");
      }
      if (!partnerResult) {
        this.redisRepository.removeUserRequest(partnerId);
      } else {
        this.redisRepository.updateUserRequest(partnerId, "waiting");
      }
    }, ACCEPTANCE_TIMEOUT);
    const key = [userId, partnerId].sort().join();
    this.acceptanceTimeout.addTimeout(key, timeout);
  }
  /**
   * @param {string} userId
   * @private
   */
  async onRequestDelete(userId) {
    await this.redisRepository.removeMatchedDetails(userId);
    await this.disposeUser(userId);
  }
}
