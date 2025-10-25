import { MATCH_REQUEST_PREFIX } from "../constants.js";
import { RedisRepository } from "../model/redis_repository.js";
import {
  delay,
  findMatchingCriteria,
  matchRequestToEntity,
} from "../utility/utility.js";

import { sendMessage } from "../utility/ws_util.js";
import { CollaborationService } from "./collaboration_service.js";
import { MatchRequestService } from "./match_request_service.js";
import { MatchedDetailsService } from "./matched_details_service.js";
import { TimeoutService } from "./timeout_service.js";
import { UserService } from "./user_service.js";

/** @typedef {import("ws").WebSocket} WebSocket*/
/** @typedef {import("../types.js").UserInstance} UserInstance */
/** @typedef {import("../types.js").MatchRequest} MatchRequest */
/** @typedef {import("../types.js").MatchRequestEntity} MatchRequestEntity */
/** @typedef {import("../types.js").Criteria} Criteria */
/** @typedef {import("../types.js").CollaborationSession} CollaborationSession */
/** @typedef {import("../types.js").MatchFound} MatchFound */

export class MatchingService {
  constructor(
    /** @type {RedisRepository} */ redisRepository,
    /** @type {MatchRequestService} */ matchRequestService,
    /** @type {MatchedDetailsService} */ matchedDetailsService,
    /** @type {CollaborationService} */ collaborationService
  ) {
    /** @private */
    this.redisRepository = redisRepository;
    /** @private */
    this.userService = new UserService();
    /** @private */
    this.redisRepository;
    /** @private */
    this.acceptanceTimeout = new TimeoutService();
    /** @private */
    this.activeListeners = new Map();
    /**
     * @private
     * @type {MatchRequestService}
     */
    this.matchRequestService = matchRequestService;

    /**
     * @private
     * @type {MatchedDetailsService}
     */
    this.matchedDetailsService = matchedDetailsService;

    /**
     * @private
     * @type {CollaborationService}
     */
    this.collaborationService = collaborationService;
  }

  /**
   * @param {string} userId
   */
  async disposeUser(userId) {
    console.log("Dispose user");
    const userInstance = this.userService.getUser(userId);
    if (userInstance) {
      userInstance.ws.disconnect();
      this.userService.deleteUser(userId);
    }
    const unsub = this.activeListeners.get(userId);
    if (unsub) {
      unsub();
      this.activeListeners.delete(userId);
    }

    await this.matchRequestService.removeUserRequest(userId);
  }

  /**
   * @param {MatchRequest} request
   * @param {UserInstance} userInstance
   */
  async addRequest(userInstance, request) {
    console.log(`Requst added: ${userInstance.id}`);
    request.time = Date.now();
    this.userService.addUser(userInstance);

    const matchRequestEntity = matchRequestToEntity(userInstance, request);
    await this.matchRequestService.storeUserRequest(matchRequestEntity);

    this.listenToRequestChange(userInstance.id);
    this.searchUser(userInstance.id);
  }

  /**
   * @param {string} userId
   */
  async listenToRequestChange(userId) {
    const requestKey = `${MATCH_REQUEST_PREFIX}:${userId}`;
    const listener = this.redisRepository.listenToKeyChanges(
      requestKey,
      async (change) => {
        switch (change.operation) {
          case "json.set":
            try {
              await this.#onRequestSet(requestKey);
            } catch (error) {
              console.error(error);
            }
            break;
          case "json.del":
            {
              await this.disposeUser(requestKey);
            }
            break;
          default:
            console.log("Unaccounted operation:", change.operation);
            break;
        }
      }
    );
    this.activeListeners.set(userId, listener);
  }

  /**
   * @param {string} requestKey
   */
  async #onRequestSet(requestKey) {
    console.log(requestKey);
    const userId = requestKey.replace(`${MATCH_REQUEST_PREFIX}:`, "");
    const requestData = await this.matchRequestService.getUserRequest(userId);
    console.log(`On Set: ${requestKey}: ${requestData.status}`);
    switch (requestData.status) {
      case "matched":
        await this.handleMatched(userId);
        break;
      case "waiting":
        break;
      default:
        throw new Error(`Unrecognized status: ${requestData.status}`);
    }
  }

  /**
   * @param {string} userId
   */
  async handleMatched(userId) {
    // to wait till matched Details is created
    await delay(1000);
    const userInstance = this.userService.getUser(userId);
    const matchedDetails = await this.matchedDetailsService.getMatchedDetails(
      userId
    );
    const partner = matchedDetails.partner;
    const collaborationSession =
      await this.collaborationService.createCollaborationSession(
        userId,
        partner,
        matchedDetails.criteria
      );
    /** @type {MatchFound} */
    const matchFoundMessage = {
      type: "match-found",
      session: collaborationSession,
    };
    console.log("Sent message", matchFoundMessage);
    sendMessage(userInstance.ws, matchFoundMessage);

    await this.disposeUser(userId);
  }

  /**
   * @param {string} userId
   * @private
   */
  async searchUser(userId) {
    const backoffList = [500, 1000, 1500, 2000, 2500, 3000, 5000];
    let backoffStage = 0;
    while (true) {
      const backoffTime = backoffList[backoffStage];
      console.log(
        `Back off time: ${backoffTime}, back off stage: ${backoffStage}`
      );
      await delay(backoffTime);
      if (backoffStage < backoffList.length - 1) {
        backoffStage += 1;
      }
      const matchRequestEntity = await this.matchRequestService.getUserRequest(
        userId
      );

      if (!matchRequestEntity || matchRequestEntity.status === "matched") {
        break;
      }

      const existingMatch = await this.matchRequestService.findOldestMatch(
        userId,
        matchRequestEntity.criterias
      );

      if (!existingMatch) {
        continue;
      }

      console.log(`${userId} found existing match`);

      const isSuccess =
        await this.matchRequestService.atomicTransitionUsersState(
          userId,
          existingMatch.userId,
          "waiting",
          "matched"
        );

      if (isSuccess) {
        const criteria = findMatchingCriteria(
          matchRequestEntity.criterias,
          existingMatch.criterias
        );
        console.log("Similar criteria", criteria);
        this.matchedDetailsService.storeMatchedDetails(
          userId,
          existingMatch.userId,
          criteria
        );
        this.matchedDetailsService.storeMatchedDetails(
          existingMatch.userId,
          userId,
          criteria
        );
        break;
      } else {
        continue;
      }
    }
  }
}
