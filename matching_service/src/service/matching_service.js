import { randomUUID } from "crypto";
import { MATCH_REQUEST_PREFIX } from "../constants.js";
import { RedisRepository } from "../model/redis_repository.js";
import {
  delay,
  findMatchingCriteria,
  getRandomQuestion,
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
   * Initialize session stream processing
   */
  async initializeSessionStreams() {
    // Start listening to session created events (broadcast)
    await this.redisRepository.startListeningToSessionEvents(
      this.handleSessionCreatedEvent.bind(this)
    );
    console.log("1");

    // Start processing create session messages (single consumer)
    await this.redisRepository.startProcessingCreateSession(
      this.handleCreateSessionMessage.bind(this)
    );
    console.log("2");

    // Start processing matched events (single consumer)
    await this.redisRepository.startProcessingMatchedEvents(
      this.handleMatchedEvent.bind(this)
    );
    console.log("3");

    console.log("🎯 Session streams initialized");
  }

  /**
   * Handle session created event (broadcast to all connected users)
   * @param {object} eventData - Session event data
   */
  async handleSessionCreatedEvent(eventData) {
    console.log("Handling session created event");
    let { userId1, userId2, sessionId, questionId, criteria } = eventData;

    // Check if either user is connected to this service instance
    const user1 = this.userService.getUser(userId1);
    const user2 = this.userService.getUser(userId2);

    if (typeof criteria === "string") {
      criteria = JSON.parse(criteria);
    }
    /** @type {CollaborationSession} */
    const collaborationSession = {
      userIds: [userId1, userId2],
      criteria: criteria,
      questionId: questionId,
      sessionId: sessionId,
    };

    /** @type {MatchFound} */
    const matchFoundMessage = {
      type: "match-found",
      session: collaborationSession,
    };

    if (user1) {
      sendMessage(user1.ws, matchFoundMessage);
      console.log(`📢 Sent session created event to user ${userId1}`);
      await this.disposeUser(user1.id);
    }

    if (user2) {
      sendMessage(user2.ws, matchFoundMessage);
      console.log(`📢 Sent session created event to user ${userId2}`);
      await this.disposeUser(user2.id);
    }
  }

  /**
   * Handle create session message (single consumer processing)
   * @param {object} messageData - Create session message data
   */
  async handleCreateSessionMessage(messageData) {
    let { userId1, userId2, criteria } = messageData;

    console.log(
      `🔧 Processing create session message for users ${userId1}, ${userId2}`
    );
    console.log("Message received", messageData);

    try {
      if (typeof criteria === "string") {
        criteria = JSON.parse(criteria);
      }
      const sessionId = randomUUID();
      const questionId = await getRandomQuestion(criteria);

      /** @type {CollaborationSession} */
      const collaboration = {
        userIds: [userId1, userId2],
        criteria: criteria,
        questionId: questionId,
        sessionId: sessionId,
      };
      await this.collaborationService.createCollaborationSession(collaboration);
      console.log("Collaboration Service server request", collaboration);
      await this.redisRepository.publishSessionCreatedEvent(collaboration);
    } catch (error) {
      console.error(error);
    }
    console.log(
      `✅ Create session processing completed for users: ${userId1}, ${userId2}`
    );
  }

  /**
   * Handle matched event (single consumer processing)
   * @param {object} eventData - Matched event data
   */
  async handleMatchedEvent(eventData) {
    const { userId1, userId2, criteria, matchedAt } = eventData;

    console.log(
      `📊 Processing matched event for users ${userId1}, ${userId2} at ${matchedAt}`
    );

    try {
      this.matchedDetailsService.storeMatchedDetails(
        userId1,
        userId2,
        criteria
      );
      this.matchedDetailsService.storeMatchedDetails(
        userId2,
        userId1,
        criteria
      );

      await this.redisRepository.addCreateSessionMessage({
        userId1,
        userId2,
        criteria,
      });

      console.log(
        `✅ Matched event processing completed for users ${userId1}, ${userId2}`
      );
    } catch (error) {
      console.error(
        `❌ Error processing matched event for users ${userId1}, ${userId2}:`,
        error
      );
      throw error;
    }
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
   * Publishes a matched event to the matched event stream
   * @param {string} userId1 - First user ID
   * @param {string} userId2 - Second user ID
   * @param {Criteria} criteria - Session ID
   * @private
   */
  async publishMatchedEvent(userId1, userId2, criteria) {
    try {
      await this.redisRepository.addMatchedEvent({
        userId1: userId1,
        userId2: userId2,
        criteria: criteria,
        matchedAt: Date.now().toString(),
      });

      console.log(
        `🎯 Published matched event for users ${userId1}, ${userId2}`
      );
    } catch (error) {
      console.error("❌ Error publishing matched event:", error);
      // Don't throw - we don't want to break the matching flow
    }
  }

  // /**
  //  * @param {string} userId
  //  * @private
  //  */
  // async searchUser(userId) {
  //   const backoffList = [500, 1000, 1500, 2000, 2500, 3000, 5000];
  //   let backoffStage = 0;
  //   while (true) {
  //     const backoffTime = backoffList[backoffStage];
  //     console.log(
  //       `Back off time: ${backoffTime}, back off stage: ${backoffStage}`
  //     );
  //     await delay(backoffTime);
  //     if (backoffStage < backoffList.length - 1) {
  //       backoffStage += 1;
  //     }
  //     const matchRequestEntity = await this.matchRequestService.getUserRequest(
  //       userId
  //     );

  //     if (!matchRequestEntity || matchRequestEntity.status === "matched") {
  //       break;
  //     }

  //     const existingMatch = await this.matchRequestService.findOldestMatch(
  //       userId,
  //       matchRequestEntity.criterias
  //     );

  //     if (!existingMatch) {
  //       continue;
  //     }

  //     console.log(`${userId} found existing match`);

  //     const isSuccess =
  //       await this.matchRequestService.atomicTransitionUsersState(
  //         userId,
  //         existingMatch.userId,
  //         "waiting",
  //         "matched"
  //       );

  //     if (isSuccess) {
  //       const criteria = findMatchingCriteria(
  //         matchRequestEntity.criterias,
  //         existingMatch.criterias
  //       );
  //       console.log("Similar criteria", criteria);

  //       // Publish matched event to the stream
  //       await this.publishMatchedEvent(userId, existingMatch.userId, criteria);

  //       break;
  //     } else {
  //       continue;
  //     }
  //   }
  // }

  /**
  //  * @param {string} userId
  //  * @private
  //  */
  async searchUser(userId) {
    const matchRequestEntity = await this.matchRequestService.getUserRequest(
      userId
    );

    if (!matchRequestEntity || matchRequestEntity.status === "matched") {
      return;
    }

    const existingMatch = await this.matchRequestService.findOldestMatch(
      userId,
      matchRequestEntity.criterias
    );

    if (!existingMatch) {
      return;
    }

    console.log(`${userId} found existing match`);

    const isSuccess = await this.matchRequestService.atomicTransitionUsersState(
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

      // Publish matched event to the stream
      await this.publishMatchedEvent(userId, existingMatch.userId, criteria);
    }
  }
}
