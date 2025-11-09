import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
} from "@jest/globals";
import { createClient } from "redis";
import { MatchedDetailsService } from "../src/service/matched_details_service.js";
import dotenv from "dotenv";

// AI Generated File

// Load environment variables
dotenv.config();

describe("MatchedDetailsService", () => {
  /** @type {import('redis').RedisClientType} */
  let redisClient;
  /** @type {MatchedDetailsService} */
  let matchedDetailsService;

  const TEST_REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

  beforeAll(async () => {
    // Create Redis client for testing
    redisClient = createClient({
      url: TEST_REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      },
    });

    await redisClient.connect();

    // Create the service instance
    matchedDetailsService = new MatchedDetailsService(redisClient);

    console.log("✅ Test setup complete");
  }, 30000);

  afterAll(async () => {
    // Clean up all test data
    await redisClient.flushAll();
    await redisClient.quit();
    console.log("✅ Test cleanup complete");
  });

  beforeEach(async () => {
    // Clean up any existing test data
    const keys = await redisClient.keys("MATCHED_DETAILS:test_*");
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  });

  afterEach(async () => {
    // Clean up test data after each test
    const keys = await redisClient.keys("MATCHED_DETAILS:test_*");
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  });

  /**
   * Create test criteria
   * @returns {import('../src/types.js').Criteria}
   */
  function createTestCriteria() {
    return {
      type: "criteria",
      difficulty: /** @type {'medium'} */ ("medium"),
      language: "JavaScript",
      topic: "Binary Tree",
    };
  }

  describe("createMatchedDetails", () => {
    it("should create matched details successfully", async () => {
      const userId = "test_user_1";
      const partnerId = "test_user_2";
      const criteria = createTestCriteria();

      const result = await matchedDetailsService.storeMatchedDetails(
        userId,
        partnerId,
        criteria
      );

      expect(result).toBe(true);

      // Verify the details were stored correctly
      const storedDetails = await matchedDetailsService.getMatchedDetails(
        userId
      );
      expect(storedDetails).toBeTruthy();
      expect(storedDetails.partner).toBe(partnerId);
      expect(storedDetails.criteria).toEqual(criteria);
    });

    it("should overwrite existing matched details", async () => {
      const userId = "test_user_3";
      const partnerId1 = "test_user_4";
      const partnerId2 = "test_user_5";
      const criteria = createTestCriteria();

      // Create first matched details
      await matchedDetailsService.storeMatchedDetails(
        userId,
        partnerId1,
        criteria
      );

      // Create second matched details (should overwrite)
      const result = await matchedDetailsService.storeMatchedDetails(
        userId,
        partnerId2,
        criteria
      );

      expect(result).toBe(true);

      // Verify the second partner is stored
      const storedDetails = await matchedDetailsService.getMatchedDetails(
        userId
      );
      expect(storedDetails.partner).toBe(partnerId2);
    });

    it("should handle Redis errors gracefully", async () => {
      // Disconnect client to simulate error
      await redisClient.quit();

      await expect(
        matchedDetailsService.storeMatchedDetails(
          "test_user",
          "partner",
          createTestCriteria()
        )
      ).rejects.toThrow();

      // Reconnect for cleanup
      await redisClient.connect();
    });
  });

  describe("getMatchedDetails", () => {
    it("should retrieve existing matched details", async () => {
      const userId = "test_user_6";
      const partnerId = "test_user_7";
      const criteria = createTestCriteria();

      // Create matched details first
      await matchedDetailsService.storeMatchedDetails(
        userId,
        partnerId,
        criteria
      );

      // Retrieve and verify
      const result = await matchedDetailsService.getMatchedDetails(userId);

      expect(result).toBeTruthy();
      expect(result.partner).toBe(partnerId);
      expect(result.criteria).toEqual(criteria);
    });

    it("should return null for non-existent matched details", async () => {
      const result = await matchedDetailsService.getMatchedDetails(
        "non_existent_user"
      );
      expect(result).toBeNull();
    });

    it("should handle Redis errors gracefully", async () => {
      // Disconnect client to simulate error
      await redisClient.quit();

      await expect(
        matchedDetailsService.getMatchedDetails("test_user")
      ).rejects.toThrow();

      // Reconnect for cleanup
      await redisClient.connect();
    });
  });

  describe("deleteMatchedDetails", () => {
    beforeEach(async () => {
      // Create test matched details for each test
      await matchedDetailsService.storeMatchedDetails(
        "test_user_10",
        "test_user_11",
        createTestCriteria()
      );
    });

    it("should delete existing matched details", async () => {
      const userId = "test_user_10";

      // Verify it exists first
      const beforeDelete = await matchedDetailsService.getMatchedDetails(
        userId
      );
      expect(beforeDelete).toBeTruthy();

      // Delete
      const result = await matchedDetailsService.removeMatchedDetails(userId);
      expect(result).toBe(true);

      // Verify it's gone
      const afterDelete = await matchedDetailsService.getMatchedDetails(userId);
      expect(afterDelete).toBeNull();
    });

    it("should return false for non-existent matched details", async () => {
      const result = await matchedDetailsService.removeMatchedDetails(
        "non_existent_user"
      );
      expect(result).toBe(false);
    });

    it("should handle Redis errors gracefully", async () => {
      // Disconnect client to simulate error
      await redisClient.quit();

      await expect(
        matchedDetailsService.removeMatchedDetails("test_user")
      ).rejects.toThrow();

      // Reconnect for cleanup
      await redisClient.connect();
    });
  });
});
