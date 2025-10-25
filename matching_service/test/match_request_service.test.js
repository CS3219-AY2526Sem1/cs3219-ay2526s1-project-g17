import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
} from "@jest/globals";
import { MatchRequestService } from "../src/service/match_request_service.js";
import { MATCH_REQUEST_PREFIX } from "../src/constants.js";
import dotenv from "dotenv";
import {
  createRedisClient,
  RedisRepository,
} from "../src/model/redis_repository.js";

// Load environment variables
dotenv.config();

describe("MatchRequestService", () => {
  /** @type {import('redis').RedisClientType} */
  let redisClient;
  /** @type {import('redis').RedisClientType} */
  let redisSubscriber;
  /** @type {MatchRequestService} */
  let matchRequestService;
  /** @type {RedisRepository} */
  let redisRepository;

  const TEST_REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
  const TEST_INDEX_NAME = MATCH_REQUEST_PREFIX;

  beforeAll(async () => {
    // Create Redis clients for testing
    redisClient = createRedisClient(TEST_REDIS_URL);

    redisSubscriber = createRedisClient(TEST_REDIS_URL);

    redisRepository = new RedisRepository(redisClient, redisSubscriber);
    await redisRepository.connect();


    // Create the service instance
    matchRequestService = new MatchRequestService(
      redisRepository.client,
      redisRepository.subscriber
    );

  });

  afterAll(async () => {
    // Clean up search index
    try {
      await redisClient.ft.dropIndex(TEST_INDEX_NAME);
    } catch (error) {
      // Index might not exist, ignore error
      console.log("Test index cleanup: Index might not exist");
    }

    await redisRepository.disconnect();
  });

  beforeEach(async () => {
    // Clean up any existing test data
    const keys = await redisClient.keys(`${MATCH_REQUEST_PREFIX}:test_*`);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  });

  afterEach(async () => {
    // Clean up test data after each test
    const keys = await redisClient.keys(`${MATCH_REQUEST_PREFIX}:test_*`);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  });

  /**
   * Create a test match request entity
   * @param {string} userId
   * @param {object} overrides
   * @returns {import('../src/types.js').MatchRequestEntity}
   */
  function createTestMatchRequest(userId, overrides = {}) {
    return {
      userId,
      status: /** @type {'waiting'} */ ("waiting"),
      criterias: [
        {
          difficulty: /** @type {'medium'} */ ("medium"),
          language: "JavaScript",
          topic: "Binary Tree",
        },
      ],
      time: Date.now(),
      ...overrides,
    };
  }

  /**
   * Create test criteria array
   * @param {object} overrides
   * @returns {import('../src/types.js').Criteria[]}
   */
  function createTestCriteria(overrides = {}) {
    return [
      {
        difficulty: /** @type {'medium'} */ ("medium"),
        language: "JavaScript",
        topic: "Binary Tree",
        ...overrides,
      },
    ];
  }

  describe("storeUserRequest", () => {
    it("should store a match request successfully", async () => {
      const testRequest = createTestMatchRequest("test_user_1");

      const result = await matchRequestService.storeUserRequest(testRequest);

      expect(result).toBe(true);

      // Verify it was stored
      const stored = await matchRequestService.getUserRequest("test_user_1");
      expect(stored).toEqual(testRequest);
    });

    it("should update an existing match request", async () => {
      const testRequest = createTestMatchRequest("test_user_2");

      // Store initial request
      await matchRequestService.storeUserRequest(testRequest);

      /** @type {import("../src/types.js").MatchRequestEntity} */
      const updatedRequest = {
        ...testRequest,
        status: "pending",
        time: Date.now() + 1000,
      };

      const result = await matchRequestService.storeUserRequest(updatedRequest);
      expect(result).toBe(true);

      const stored = await matchRequestService.getUserRequest("test_user_2");
      expect(stored.status).toBe("pending");
    });
  });

  describe("getUserRequest", () => {
    it("should retrieve an existing match request", async () => {
      const testRequest = createTestMatchRequest("test_user_3");

      await matchRequestService.storeUserRequest(testRequest);

      const retrieved = await matchRequestService.getUserRequest("test_user_3");
      expect(retrieved).toEqual(testRequest);
    });

    it("should return null for non-existent user", async () => {
      const retrieved = await matchRequestService.getUserRequest(
        "non_existent_user"
      );
      expect(retrieved).toBeNull();
    });
  });

  describe("removeUserRequest", () => {
    it("should remove an existing match request", async () => {
      const testRequest = createTestMatchRequest("test_user_4");

      // Store the request
      await matchRequestService.storeUserRequest(testRequest);

      // Verify it exists
      let retrieved = await matchRequestService.getUserRequest("test_user_4");
      expect(retrieved).toEqual(testRequest);

      // Remove it
      await matchRequestService.removeUserRequest("test_user_4");

      // Verify it's gone
      retrieved = await matchRequestService.getUserRequest("test_user_4");
      expect(retrieved).toBeNull();
    });

    it("should not throw error when removing non-existent request", async () => {
      await expect(
        matchRequestService.removeUserRequest("non_existent_user")
      ).resolves.not.toThrow();
    });
  });

  describe("findOldestMatch", () => {
    beforeEach(async () => {
      // Wait a bit for index to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it("should find matching request based on criteria", async () => {
      const criterias = createTestCriteria();

      // Store a matching request
      const matchingRequest = createTestMatchRequest("test_user_5", {
        criterias,
        time: Date.now() - 1000, // Older time
      });

      await matchRequestService.storeUserRequest(matchingRequest);

      // Wait for indexing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const found = await matchRequestService.findOldestMatch(
        criterias,
        "different_user"
      );
      expect(found).toBeTruthy();
      expect(found.userId).toBe("test_user_5");
    });

    it("should return null when no matching request exists", async () => {
      const criterias = createTestCriteria({
        difficulty: /** @type {'hard'} */ ("hard"),
        language: "Python",
        topic: "Graph",
      });

      const found = await matchRequestService.findOldestMatch(
        criterias,
        "test_user_6"
      );
      expect(found).toBeNull();
    });

    it("should exclude the requesting user from results", async () => {
      const criterias = createTestCriteria({
        difficulty: /** @type {'easy'} */ ("easy"),
        language: "Java",
        topic: "Array",
      });

      // Store request from the same user
      const sameUserRequest = createTestMatchRequest("test_user_7", {
        criterias,
      });
      await matchRequestService.storeUserRequest(sameUserRequest);

      // Wait for indexing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not find own request
      const found = await matchRequestService.findOldestMatch(
        criterias,
        "test_user_7"
      );
      expect(found).toBeNull();
    });

    it("should return oldest matching request when multiple exist", async () => {
      const criterias = createTestCriteria({
        topic: "Stack",
      });

      const now = Date.now();

      // Store multiple matching requests
      const olderRequest = createTestMatchRequest("test_user_8", {
        criterias,
        time: now - 2000,
      });

      const newerRequest = createTestMatchRequest("test_user_9", {
        criterias,
        time: now - 1000,
      });

      await matchRequestService.storeUserRequest(newerRequest);
      await matchRequestService.storeUserRequest(olderRequest);

      // Wait for indexing
      await new Promise((resolve) => setTimeout(resolve, 200));

      const found = await matchRequestService.findOldestMatch(
        criterias,
        "different_user"
      );
      expect(found).toBeTruthy();
      expect(found.userId).toBe("test_user_8"); // Should return the older one
    });
  });

  describe("updateUserRequest", () => {
    it("should update user status successfully", async () => {
      const testRequest = createTestMatchRequest("test_user_10");

      // Store initial request
      await matchRequestService.storeUserRequest(testRequest);

      // Update status
      await matchRequestService.updateUserRequest(
        "test_user_10",
        /** @type {'pending'} */ ("pending")
      );

      // Verify status was updated
      const updated = await matchRequestService.getUserRequest("test_user_10");
      expect(updated.status).toBe("pending");
    });

    it("should handle updating non-existent user gracefully", async () => {
      // This should not throw an error, but might not update anything
      await expect(
        matchRequestService.updateUserRequest(
          "non_existent_user",
          /** @type {'pending'} */ ("pending")
        )
      ).resolves.not.toThrow();
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete match flow", async () => {
      const criterias = createTestCriteria();

      // User 1 creates a match request
      const user1Request = createTestMatchRequest("test_user_11", {
        criterias,
        time: Date.now() - 1000,
      });

      await matchRequestService.storeUserRequest(user1Request);

      // Wait for indexing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // User 2 looks for a match
      const matchFound = await matchRequestService.findOldestMatch(
        criterias,
        "test_user_12"
      );
      expect(matchFound).toBeTruthy();
      expect(matchFound.userId).toBe("test_user_11");

      // Update both users to matched status
      await matchRequestService.updateUserRequest(
        "test_user_11",
        /** @type {'matched'} */ ("matched")
      );
      await matchRequestService.updateUserRequest(
        "test_user_12",
        /** @type {'matched'} */ ("matched")
      );

      // Verify updates
      const user1Updated = await matchRequestService.getUserRequest(
        "test_user_11"
      );
      expect(user1Updated.status).toBe("matched");

      // Clean up
      await matchRequestService.removeUserRequest("test_user_11");
      await matchRequestService.removeUserRequest("test_user_12");
    });
  });
});
