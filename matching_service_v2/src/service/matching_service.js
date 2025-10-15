import { MATCH_REQUEST_PREFIX } from "../constants.js";
import { RedisRepository } from "../model/redis_repository.js";
import { ACCEPTANCE_TIMEOUT } from "../server_config.js";
import {
  delay,
  findMatchingCriteria,
  hasMatchingCriteria,
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
      userInstance.ws.close();
      this.userService.deleteUser(userId);
    }
    const unsub = this.activeListeners.get(userId);
    if (unsub) {
      unsub();
      this.activeListeners.delete(userId);
    }

    await this.matchRequestService.removeUserRequest(userId);
    await this.matchedDetailsService.removeMatchedDetails(userId);
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
      // case "waiting":
      //   await this.handleWaiting(userId, requestData);
      //   break;
      case "matched":
        await this.handleMatched(userId);
        break;
      default:
        throw new Error("Unrecognized state");
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
    console.log("Sent message", collaborationSession);
    sendMessage(userInstance.ws, collaborationSession);

    await this.disposeUser(userId);
  }

  /**
   * @param {string} userId
   * @private
   */
  async searchUser(userId) {
    while (true) {
      await delay(500);
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
        const userCriterias = matchRequestEntity.criterias.map((c) =>
          JSON.stringify(c)
        );
        const existingMatchCriteria = existingMatch.criterias.map((c) =>
          JSON.stringify(c)
        );

        const criteria = userCriterias.filter((c) =>
          existingMatchCriteria.includes(c)
        )[0];
        console.log("Similar criteria", criteria);
        this.matchedDetailsService.storeMatchedDetails(
          userId,
          existingMatch.userId,
          JSON.parse(criteria)
        );
        this.matchedDetailsService.storeMatchedDetails(
          existingMatch.userId,
          userId,
          JSON.parse(criteria)
        );
        break;
      } else {
        continue;
      }
    }
  }
}
