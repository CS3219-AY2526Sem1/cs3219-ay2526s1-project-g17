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
import { delay } from "../src/utility/utility.js";
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
        status: "waiting",
        time: Date.now() + 1000,
      };

      const result = await matchRequestService.storeUserRequest(updatedRequest);
      expect(result).toBe(true);

      const stored = await matchRequestService.getUserRequest("test_user_2");
      expect(stored.status).toBe("waiting");
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
        "different_user",
        criterias
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
        "test_user_6",
        criterias
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
        "test_user_7",
        criterias
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
        "different_user",
        criterias
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
      await matchRequestService.updateUserRequest("test_user_10", "matched");

      // Verify status was updated
      const updated = await matchRequestService.getUserRequest("test_user_10");
      expect(updated.status).toBe("matched");
    });

    it("should handle updating non-existent user gracefully", async () => {
      // This should not throw an error, but might not update anything
      await expect(
        matchRequestService.updateUserRequest("non_existent_user", "matched")
      ).resolves.not.toThrow();
    });
  });

  describe("atomicTransitionUsersState", () => {
    beforeEach(async () => {
      // Create test requests for atomic transition tests
      const request1 = createTestMatchRequest("test_user_atomic_1", {
        status: "waiting",
      });
      const request2 = createTestMatchRequest("test_user_atomic_2", {
        status: "waiting",
      });

      await matchRequestService.storeUserRequest(request1);
      await matchRequestService.storeUserRequest(request2);
    });

    it("should successfully transition both users from waiting to matched", async () => {
      const result = await matchRequestService.atomicTransitionUsersState(
        "test_user_atomic_1",
        "test_user_atomic_2",
        "waiting",
        "matched"
      );

      expect(result).toBe(true);

      // Verify both users have been updated
      const user1 = await matchRequestService.getUserRequest(
        "test_user_atomic_1"
      );
      const user2 = await matchRequestService.getUserRequest(
        "test_user_atomic_2"
      );

      expect(user1.status).toBe("matched");
      expect(user2.status).toBe("matched");
    });

    it("should fail when one user doesn't exist", async () => {
      const result = await matchRequestService.atomicTransitionUsersState(
        "test_user_atomic_1",
        "non_existent_user",
        "waiting",
        "matched"
      );

      expect(result).toBe(false);

      // Verify the existing user's status wasn't changed
      const user1 = await matchRequestService.getUserRequest(
        "test_user_atomic_1"
      );
      expect(user1.status).toBe("waiting");
    });

    it("should fail when initial status doesn't match", async () => {
      // Update one user to matched status first
      await matchRequestService.updateUserRequest(
        "test_user_atomic_1",
        "matched"
      );

      const result = await matchRequestService.atomicTransitionUsersState(
        "test_user_atomic_1",
        "test_user_atomic_2",
        "waiting", // Expected status
        "matched"
      );

      expect(result).toBe(false);

      // Verify user2 status wasn't changed
      const user2 = await matchRequestService.getUserRequest(
        "test_user_atomic_2"
      );
      expect(user2.status).toBe("waiting");
    });

    it("should fail when both users have wrong initial status", async () => {
      // Update both users to matched status first
      await matchRequestService.updateUserRequest(
        "test_user_atomic_1",
        "matched"
      );
      await matchRequestService.updateUserRequest(
        "test_user_atomic_2",
        "matched"
      );

      const result = await matchRequestService.atomicTransitionUsersState(
        "test_user_atomic_1",
        "test_user_atomic_2",
        "waiting", // Expected status
        "matched"
      );

      expect(result).toBe(false);

      // Verify both users remain in matched status
      const user1 = await matchRequestService.getUserRequest(
        "test_user_atomic_1"
      );
      const user2 = await matchRequestService.getUserRequest(
        "test_user_atomic_2"
      );
      expect(user1.status).toBe("matched");
      expect(user2.status).toBe("matched");
    });

    it("should successfully transition from matched back to waiting", async () => {
      // First transition to matched
      await matchRequestService.atomicTransitionUsersState(
        "test_user_atomic_1",
        "test_user_atomic_2",
        "waiting",
        "matched"
      );

      // Then transition back to waiting
      const result = await matchRequestService.atomicTransitionUsersState(
        "test_user_atomic_1",
        "test_user_atomic_2",
        "matched",
        "waiting"
      );

      expect(result).toBe(true);

      // Verify both users are back to waiting
      const user1 = await matchRequestService.getUserRequest(
        "test_user_atomic_1"
      );
      const user2 = await matchRequestService.getUserRequest(
        "test_user_atomic_2"
      );

      expect(user1.status).toBe("waiting");
      expect(user2.status).toBe("waiting");
    });

    it("should handle concurrent modifications gracefully", async () => {
      // This test simulates concurrent modification by running two atomic transitions
      const promises = [
        matchRequestService.atomicTransitionUsersState(
          "test_user_atomic_1",
          "test_user_atomic_2",
          "waiting",
          "matched"
        ),
        // Simulate a concurrent update that might interfere
        (async () => {
          await delay(5); // Small delay to start slightly after first operation
          try {
            await matchRequestService.updateUserRequest(
              "test_user_atomic_1",
              "matched"
            );
          } catch (error) {
            // Expected to potentially fail due to watched keys
          }
        })(),
      ];

      const results = await Promise.allSettled(promises);
      const [atomicResult] = results;

      // The atomic operation should either succeed or fail gracefully
      if (atomicResult.status === "fulfilled") {
        expect(typeof atomicResult.value).toBe("boolean");
      } else {
        // If rejected, it should be handled gracefully
        expect(atomicResult.status).toBe("rejected");
      }

      // Verify the final state is consistent
      const user1 = await matchRequestService.getUserRequest(
        "test_user_atomic_1"
      );
      const user2 = await matchRequestService.getUserRequest(
        "test_user_atomic_2"
      );

      // Both users should have the same status (either both waiting or both matched)
      expect(user1.status).toBe(user2.status);
    });

    it("should preserve other fields while updating status", async () => {
      // Get original requests to compare
      const originalUser1 = await matchRequestService.getUserRequest(
        "test_user_atomic_1"
      );
      const originalUser2 = await matchRequestService.getUserRequest(
        "test_user_atomic_2"
      );

      const result = await matchRequestService.atomicTransitionUsersState(
        "test_user_atomic_1",
        "test_user_atomic_2",
        "waiting",
        "matched"
      );

      expect(result).toBe(true);

      const updatedUser1 = await matchRequestService.getUserRequest(
        "test_user_atomic_1"
      );
      const updatedUser2 = await matchRequestService.getUserRequest(
        "test_user_atomic_2"
      );

      // Verify status was updated
      expect(updatedUser1.status).toBe("matched");
      expect(updatedUser2.status).toBe("matched");

      // Verify other fields were preserved
      expect(updatedUser1.userId).toBe(originalUser1.userId);
      expect(updatedUser1.criterias).toEqual(originalUser1.criterias);
      expect(updatedUser1.time).toBe(originalUser1.time);

      expect(updatedUser2.userId).toBe(originalUser2.userId);
      expect(updatedUser2.criterias).toEqual(originalUser2.criterias);
      expect(updatedUser2.time).toBe(originalUser2.time);
    });

    it("should work with same user for both parameters", async () => {
      // Edge case: transition the same user (though not typical usage)
      const result = await matchRequestService.atomicTransitionUsersState(
        "test_user_atomic_1",
        "test_user_atomic_1",
        "waiting",
        "matched"
      );

      expect(result).toBe(true);

      const user = await matchRequestService.getUserRequest(
        "test_user_atomic_1"
      );
      expect(user.status).toBe("matched");
    });

    afterEach(async () => {
      // Clean up atomic test users
      await matchRequestService.removeUserRequest("test_user_atomic_1");
      await matchRequestService.removeUserRequest("test_user_atomic_2");
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
        "test_user_12",
        criterias
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

    it("should handle complete match flow with atomic transitions", async () => {
      const criterias = createTestCriteria();

      // User 1 and User 2 create match requests
      const user1Request = createTestMatchRequest("test_user_13", {
        criterias,
        time: Date.now() - 1000,
        status: /** @type {'waiting'} */ ("waiting"),
      });

      const user2Request = createTestMatchRequest("test_user_14", {
        criterias,
        time: Date.now(),
        status: /** @type {'waiting'} */ ("waiting"),
      });

      await matchRequestService.storeUserRequest(user1Request);
      await matchRequestService.storeUserRequest(user2Request);

      // Wait for indexing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // User 2 looks for a match and finds User 1
      const matchFound = await matchRequestService.findOldestMatch(
        "test_user_14",
        criterias
      );
      expect(matchFound).toBeTruthy();
      expect(matchFound.userId).toBe("test_user_13");

      // Atomically transition both users from waiting to matched
      const transitionResult =
        await matchRequestService.atomicTransitionUsersState(
          "test_user_13",
          "test_user_14",
          "waiting",
          "matched"
        );

      expect(transitionResult).toBe(true);

      // Verify both users are now matched
      const user1Updated = await matchRequestService.getUserRequest(
        "test_user_13"
      );
      const user2Updated = await matchRequestService.getUserRequest(
        "test_user_14"
      );

      expect(user1Updated.status).toBe("matched");
      expect(user2Updated.status).toBe("matched");

      // Clean up
      await matchRequestService.removeUserRequest("test_user_13");
      await matchRequestService.removeUserRequest("test_user_14");
    });
  });
});
