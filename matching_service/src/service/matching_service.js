import {
  findMatchingCriteria,
  hasMatchingCriteria,
  matchRequestToEntity,
} from "../utility/utility.js";
import {
  initializeRedis,
  listenToRequestChanges,
  redisRepository,
} from "../model/redis_integration.js";
import { sendMessage } from "../utility/ws_util.js";

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
   * @param {UserInstance} userInstance
   */
  deleteUser(userInstance) {
    this.#userConnection.delete(userInstance.id);
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

class MatchingService {
  #userService = new UserService();
  #redisRepository = redisRepository;

  /**
   * @param {MatchRequest} request
   * @param {UserInstance} userInstance
   */
  async addRequest(userInstance, request) {
    request.time = Date.now();
    this.#userService.addUser(userInstance);
    const matchRequestEntity = matchRequestToEntity(userInstance, request);

    const existingMatch = await this.#findExistingMatch(
      matchRequestEntity.criterias
    );
    const hasExisting = existingMatch.length !== 0;

    if (hasExisting) {
      await this.#handleHasExistingMatchCase(matchRequestEntity, existingMatch);
    } else {
      await this.#handleNoExistingMatchCase();
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

  /**
   * @param {MatchRequestEntity} request
   * @param {Array<[string, MatchRequestEntity]>} existingMatches
   */
  async #handleHasExistingMatchCase(request, existingMatches) {
    request.status = "pending";
    await this.#redisRepository.storeUserRequest(request.userId, request);
    // listen to the key change

    // when matched
  }

  async #handleNoExistingMatchCase() {}

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
          await this.#onRequestDelete(requestKey);
          break;
        case "expire":
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
          await this.#redisRepository.storeMatchedPair(userId, partnerId);
          await this.#redisRepository.storeMatchedDetails(userId, {
            criteria: matchingCriteria,
            partner: partnerId,
            accepts: false
          });
          await this.#redisRepository.storeMatchedDetails(userId, {
            criteria: matchingCriteria,
            partner: userId,
            accepts: false
          });
          setTimeout(async () => {
            const matchedPairResult =
              await this.#redisRepository.getMatchedPair(userId, partnerId);
            const userResult = matchedPairResult[userId];
            const partnerResult = matchedPairResult[partnerId];

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
          // if found then  create a matched entry for both then change to pending
          // The initiator will create the following
          // matched_pair:user1Id:user2Id (ids are arranged by in order)
          //  - user1Accept: false
          //  - user2Accept: false
          // matched_details:user1Id
          //  - user2's id
          // matched_details:user2
          //  - user1's id
          // Only the initiator will listen to the match_pair key
          // if not found do nothing
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
          const matchedPairResult = await this.#redisRepository.getMatchedPair(
            userId,
            matchedDetails.partner
          );
          const userResult = matchedPairResult[userId];
          // remove matched pair
          // remove matched details
          if (!userResult) {
            // disconnect
          } else {
            // resume queue
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
    }
  }

  /**
   * @param {string} requestKey
   */
  async #onRequestDelete(requestKey) {}
}

const matchingService = new MatchingService();
export default matchingService;
