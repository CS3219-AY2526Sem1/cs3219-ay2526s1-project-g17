import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
} from "@jest/globals";
import { CollaborationService } from "../src/service/collaboration_service.js";
import { COLLABORATION_SESSION_PREFIX } from "../src/constants.js";
import dotenv from "dotenv";
import {
  createRedisClient,
  RedisRepository,
} from "../src/model/redis_repository.js";

// AI Generated File

// Load environment variables
dotenv.config();

describe("CollaborationService", () => {
  /** @type {import('redis').RedisClientType} */
  let redisClient;
  /** @type {import('redis').RedisClientType} */
  let redisSubscriber;
  /** @type {CollaborationService} */
  let collaborationService;
  /** @type {RedisRepository} */
  let redisRepository;

  const TEST_REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

  beforeAll(async () => {
    // Create Redis clients for testing
    redisClient = createRedisClient(TEST_REDIS_URL);
    redisSubscriber = createRedisClient(TEST_REDIS_URL);

    redisRepository = new RedisRepository(redisClient, redisSubscriber);
    await redisRepository.connect();

    // Create the service instance
    collaborationService = new CollaborationService(redisRepository.client);
  });

  afterAll(async () => {
    await redisRepository.disconnect();
  });

  beforeEach(async () => {
    // Clean up any existing test data - including all collaboration sessions
    const keys = await redisClient.keys(`${COLLABORATION_SESSION_PREFIX}*`);
    if (keys.length > 0) {
      // Use json.del for RedisJSON data
      for (const key of keys) {
        try {
          await redisClient.json.del(key);
        } catch (error) {
          // Fallback to regular del if json.del fails
          await redisClient.del(key);
        }
      }
    }
  });

  afterEach(async () => {
    // Clean up test data after each test - including all collaboration sessions
    const keys = await redisClient.keys(`${COLLABORATION_SESSION_PREFIX}*`);
    if (keys.length > 0) {
      // Use json.del for RedisJSON data
      for (const key of keys) {
        try {
          await redisClient.json.del(key);
        } catch (error) {
          // Fallback to regular del if json.del fails
          await redisClient.del(key);
        }
      }
    }
  });

  /**
   * Helper function to create test collaboration session data
   * @param {object} overrides
   * @returns {import("../src/types.js").CollaborationSession}
   */
  function createTestCollaborationSession(overrides = {}) {
    return {
      sessionId: `session_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      userIds: ["test_user_1", "test_user_2"],
      criteria: {
        type: "criteria",
        difficulty: "medium",
        language: "javascript",
        topic: "algorithms",
      },
      questionId: "test_question_id",
      ...overrides,
    };
  }

  /**
   * Helper function to create test collaboration criteria data
   * @param {object} overrides
   * @returns {object}
   */
  function createTestCollaborationData(overrides = {}) {
    return {
      userIds: ["test_user_1", "test_user_2"],
      criteria: {
        type: "criteria",
        difficulty: "medium",
        language: "javascript",
        topic: "algorithms",
      },
      ...overrides,
    };
  }

  describe("createCollaborationSession", () => {
    it("should create a collaboration session successfully", async () => {
      const sessionData = createTestCollaborationSession();

      const collaborationSession =
        await collaborationService.createCollaborationSession(sessionData);

      expect(collaborationSession).not.toBeNull();
      expect(collaborationSession.sessionId).toBeDefined();
      expect(typeof collaborationSession.sessionId).toBe("string");
      expect(collaborationSession.userIds).toEqual(sessionData.userIds);
      expect(collaborationSession.criteria).toEqual(sessionData.criteria);
      expect(collaborationSession.questionId).toEqual(sessionData.questionId);

      // Verify the session was stored correctly
      const stored = await collaborationService.getCollaborationSession(
        sessionData.userIds[0],
        sessionData.userIds[1]
      );
      expect(stored).toEqual(collaborationSession);
    });

    it("should create sessions with different criteria", async () => {
      const sessionData = createTestCollaborationSession({
        criteria: {
          type: "criteria",
          difficulty: "hard",
          language: "python",
          topic: "data-structures",
        },
      });

      const collaborationSession =
        await collaborationService.createCollaborationSession(sessionData);

      expect(collaborationSession).not.toBeNull();
      expect(collaborationSession.criteria.difficulty).toBe("hard");
      expect(collaborationSession.criteria.language).toBe("python");
      expect(collaborationSession.criteria.topic).toBe("data-structures");

      const stored = await collaborationService.getCollaborationSession(
        sessionData.userIds[0],
        sessionData.userIds[1]
      );
      expect(stored.criteria.difficulty).toBe("hard");
      expect(stored.criteria.language).toBe("python");
      expect(stored.criteria.topic).toBe("data-structures");
    });

    it("should fail when criteria is null or undefined", async () => {
      const result1 = await collaborationService.createCollaborationSession(
        null
      );
      const result2 = await collaborationService.createCollaborationSession(
        undefined
      );

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it("should fail when userId is null or undefined", async () => {
      const sessionWithNullUserId1 = createTestCollaborationSession({
        userIds: [null, "user2"],
      });
      const sessionWithNullUserId2 = createTestCollaborationSession({
        userIds: ["user1", undefined],
      });

      const result1 = await collaborationService.createCollaborationSession(
        sessionWithNullUserId1
      );
      const result2 = await collaborationService.createCollaborationSession(
        sessionWithNullUserId2
      );

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it("should generate unique session IDs for different user pairs", async () => {
      const sessionData1 = createTestCollaborationSession();
      const sessionData2 = createTestCollaborationSession({
        userIds: ["user3", "user4"],
      });

      const collaborationSession1 =
        await collaborationService.createCollaborationSession(sessionData1);
      const collaborationSession2 =
        await collaborationService.createCollaborationSession(sessionData2);

      expect(collaborationSession1).not.toBeNull();
      expect(collaborationSession2).not.toBeNull();
      expect(collaborationSession1.sessionId).not.toBe(
        collaborationSession2.sessionId
      );

      // Both sessions should exist independently
      const stored1 = await collaborationService.getCollaborationSession(
        sessionData1.userIds[0],
        sessionData1.userIds[1]
      );
      const stored2 = await collaborationService.getCollaborationSession(
        sessionData2.userIds[0],
        sessionData2.userIds[1]
      );

      expect(stored1.userIds).toEqual(sessionData1.userIds);
      expect(stored2.userIds).toEqual(sessionData2.userIds);
    });

    it("should overwrite existing session for same user pair", async () => {
      const sessionData = createTestCollaborationSession();

      // Create first session
      const collaborationSession1 =
        await collaborationService.createCollaborationSession(sessionData);
      expect(collaborationSession1).not.toBeNull();

      // Create second session with same user pair but different criteria
      const sessionData2 = createTestCollaborationSession({
        userIds: sessionData.userIds, // same user pair
        criteria: {
          type: "criteria",
          difficulty: "easy",
          language: "java",
          topic: "sorting",
        },
        questionId: "different_question_id",
      });

      const collaborationSession2 =
        await collaborationService.createCollaborationSession(sessionData2);
      expect(collaborationSession2).not.toBeNull();

      // Verify the session was overwritten
      const stored = await collaborationService.getCollaborationSession(
        sessionData.userIds[0],
        sessionData.userIds[1]
      );
      expect(stored.sessionId).toBe(collaborationSession2.sessionId);
      expect(stored.criteria.language).toBe("java");
      expect(stored.questionId).toBe("different_question_id");
    });
  });

  describe("getCollaborationSession", () => {
    it("should retrieve an existing collaboration session", async () => {
      const sessionData = createTestCollaborationSession();

      // Create the session first
      const collaborationSession =
        await collaborationService.createCollaborationSession(sessionData);

      // Retrieve the session
      const retrieved = await collaborationService.getCollaborationSession(
        sessionData.userIds[0],
        sessionData.userIds[1]
      );

      expect(retrieved).not.toBeNull();
      expect(retrieved.sessionId).toBe(collaborationSession.sessionId);
      expect(retrieved.userIds).toEqual(sessionData.userIds);
      expect(retrieved.criteria).toEqual(sessionData.criteria);
    });

    it("should return null for non-existent session", async () => {
      const result = await collaborationService.getCollaborationSession(
        "non_existent_user1",
        "non_existent_user2"
      );
      expect(result).toBeNull();
    });

    it("should return null for null or undefined userIds", async () => {
      const result1 = await collaborationService.getCollaborationSession(
        null,
        "user2"
      );
      const result2 = await collaborationService.getCollaborationSession(
        "user1",
        null
      );
      const result3 = await collaborationService.getCollaborationSession(
        undefined,
        "user2"
      );
      const result4 = await collaborationService.getCollaborationSession(
        "user1",
        undefined
      );

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
      expect(result4).toBeNull();
    });

    it("should return null for empty string userIds", async () => {
      const result1 = await collaborationService.getCollaborationSession(
        "",
        "user2"
      );
      const result2 = await collaborationService.getCollaborationSession(
        "user1",
        ""
      );

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe("deleteCollaborationSession", () => {
    it("should delete an existing collaboration session", async () => {
      const sessionData = createTestCollaborationSession();

      // Create the session first
      const collaborationSession =
        await collaborationService.createCollaborationSession(sessionData);

      // Verify it exists
      const beforeDelete = await collaborationService.getCollaborationSession(
        sessionData.userIds[0],
        sessionData.userIds[1]
      );
      expect(beforeDelete).not.toBeNull();

      // Delete the session
      const deleteResult =
        await collaborationService.deleteCollaborationSession(
          sessionData.userIds[0],
          sessionData.userIds[1]
        );
      expect(deleteResult).toBe(true);

      // Verify it's gone
      const afterDelete = await collaborationService.getCollaborationSession(
        sessionData.userIds[0],
        sessionData.userIds[1]
      );
      expect(afterDelete).toBeNull();
    });

    it("should return false when trying to delete non-existent session", async () => {
      const result = await collaborationService.deleteCollaborationSession(
        "non_existent_user1",
        "non_existent_user2"
      );
      expect(result).toBe(false);
    });

    it("should return false for null or undefined userIds", async () => {
      const result1 = await collaborationService.deleteCollaborationSession(
        null,
        "user2"
      );
      const result2 = await collaborationService.deleteCollaborationSession(
        "user1",
        null
      );
      const result3 = await collaborationService.deleteCollaborationSession(
        undefined,
        "user2"
      );
      const result4 = await collaborationService.deleteCollaborationSession(
        "user1",
        undefined
      );

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
      expect(result4).toBe(false);
    });

    it("should return false for empty string userIds", async () => {
      const result1 = await collaborationService.deleteCollaborationSession(
        "",
        "user2"
      );
      const result2 = await collaborationService.deleteCollaborationSession(
        "user1",
        ""
      );

      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });
  });

  describe("formulateKey", () => {
    it("should generate consistent keys regardless of user order", async () => {
      const key1 = collaborationService.formulateKey("user1", "user2");
      const key2 = collaborationService.formulateKey("user2", "user1");

      expect(key1).toBe(key2);
      expect(key1).toContain("user1");
      expect(key1).toContain("user2");
    });

    it("should include the collaboration session prefix", async () => {
      const key = collaborationService.formulateKey("user1", "user2");
      expect(key.startsWith(COLLABORATION_SESSION_PREFIX)).toBe(true);
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete collaboration session lifecycle", async () => {
      const sessionData = createTestCollaborationSession();

      // 1. Create session
      const collaborationSession =
        await collaborationService.createCollaborationSession(sessionData);

      expect(collaborationSession).not.toBeNull();
      expect(typeof collaborationSession).toBe("object");
      expect(typeof collaborationSession.sessionId).toBe("string");

      // 2. Session should be retrievable
      const retrieved = await collaborationService.getCollaborationSession(
        sessionData.userIds[0],
        sessionData.userIds[1]
      );
      expect(retrieved).not.toBeNull();
      expect(retrieved.sessionId).toBe(collaborationSession.sessionId);

      // 3. Delete session
      const deleteResult =
        await collaborationService.deleteCollaborationSession(
          sessionData.userIds[0],
          sessionData.userIds[1]
        );
      expect(deleteResult).toBe(true);

      // 4. Session should no longer exist
      const afterDelete = await collaborationService.getCollaborationSession(
        sessionData.userIds[0],
        sessionData.userIds[1]
      );
      expect(afterDelete).toBeNull();
    });

    it("should handle multiple concurrent sessions for different user pairs", async () => {
      const sessions = [
        createTestCollaborationSession(),
        createTestCollaborationSession({
          userIds: ["user3", "user4"],
        }),
        createTestCollaborationSession({
          userIds: ["user5", "user6"],
          criteria: {
            type: "criteria",
            difficulty: "easy",
            language: "python",
            topic: "arrays",
          },
          questionId: "different_question",
        }),
      ];

      const collaborationSessions = [];

      // Create all sessions
      for (const sessionData of sessions) {
        const collaborationSession =
          await collaborationService.createCollaborationSession(sessionData);
        expect(collaborationSession).not.toBeNull();
        collaborationSessions.push(collaborationSession);
      }

      // Verify all sessions exist and are retrievable
      for (let i = 0; i < collaborationSessions.length; i++) {
        const collaborationSession = collaborationSessions[i];
        const sessionData = sessions[i];

        const retrieved = await collaborationService.getCollaborationSession(
          sessionData.userIds[0],
          sessionData.userIds[1]
        );
        expect(retrieved).not.toBeNull();
        expect(retrieved.sessionId).toBe(collaborationSession.sessionId);
        expect(retrieved.userIds).toEqual(sessionData.userIds);
      }

      // Delete middle session
      await collaborationService.deleteCollaborationSession(
        sessions[1].userIds[0],
        sessions[1].userIds[1]
      );

      // Verify only 2 sessions remain accessible
      const remaining1 = await collaborationService.getCollaborationSession(
        sessions[0].userIds[0],
        sessions[0].userIds[1]
      );
      const remaining2 = await collaborationService.getCollaborationSession(
        sessions[1].userIds[0],
        sessions[1].userIds[1]
      );
      const remaining3 = await collaborationService.getCollaborationSession(
        sessions[2].userIds[0],
        sessions[2].userIds[1]
      );

      expect(remaining1).not.toBeNull();
      expect(remaining2).toBeNull();
      expect(remaining3).not.toBeNull();
    });
  });
});
