/**
 * Redis Integration Test
 * This demonstrates how to use the Redis client and change listeners
 */

import {
  redisRepository,
  initializeRedis,
  listenToMatchChanges,
} from "../src/model/redis_integration.js";
import { configDotenv } from "dotenv";

// Load environment variables
configDotenv();

async function testRedisIntegration() {
  try {
    console.log("🚀 Starting Redis Integration Test...\n");

    // 1. Initialize Redis connection
    console.log("1️⃣ Connecting to Redis...");
    await initializeRedis();

    // 2. Test basic operations
    console.log("\n2️⃣ Testing basic operations...");

    // Store a user request
    const testUserId = "test-user-123";
    const testRequest = {
      typename: "matchRequest",
      criterias: [
        {
          difficulty: "easy",
          language: "JavaScript",
          topic: "Array",
        },
      ],
      time: Date.now(),
    };

    await redisRepository.storeUserRequest(testUserId, testRequest);
    console.log("✅ Stored user request");

    // Retrieve the user request
    const retrievedRequest = await redisRepository.getUserRequest(testUserId);
    console.log("✅ Retrieved user request:", retrievedRequest);

    // 3. Test change listeners
    console.log("\n3️⃣ Testing change listeners...");

    const unsubscribe = listenToMatchChanges(testUserId, (changeData) => {
      console.log("🔔 Change detected:", changeData);
    });

    // 4. Test matched pair operations
    console.log("\n4️⃣ Testing matched pair operations...");

    const userId1 = "user-1";
    const userId2 = "user-2";
    const matchInfo = {
      criteria: {
        difficulty: "medium",
        language: "Python",
        topic: "Binary Tree",
      },
      matchedAt: Date.now(),
    };

    await redisRepository.storeMatchedPair(userId1, userId2, matchInfo);
    console.log("✅ Stored matched pair");

    const matchData = await redisRepository.getMatchedPair(userId1);
    console.log("✅ Retrieved match data:", matchData);

    // Update acceptance
    const updatedMatch = await redisRepository.updateMatchAcceptance(
      userId1,
      userId2,
      userId1
    );
    console.log("✅ Updated acceptance:", updatedMatch);

    // 5. Test session operations
    console.log("\n5️⃣ Testing session operations...");

    const sessionId = "session-123";
    const sessionData = {
      id: sessionId,
      users: [userId1, userId2],
      status: "active",
      problem: "Two Sum",
    };

    await redisRepository.storeSession(sessionId, sessionData);
    console.log("✅ Stored session");

    const retrievedSession = await redisRepository.getSession(sessionId);
    console.log("✅ Retrieved session:", retrievedSession);

    // 6. Test statistics
    console.log("\n6️⃣ Getting Redis statistics...");
    const stats = await redisRepository.getStats();
    console.log("📊 Redis stats:", {
      connected: stats.connected,
      changeListeners: stats.changeListeners,
    });

    // 7. Cleanup test data
    console.log("\n7️⃣ Cleaning up test data...");

    await redisRepository.removeUserRequest(testUserId);
    await redisRepository.removeMatchedPair(userId1, userId2);
    await redisRepository.removeSession(sessionId);

    unsubscribe(); // Remove change listener

    console.log("✅ Cleanup completed");

    console.log("\n🎉 Redis Integration Test completed successfully!");
  } catch (error) {
    console.error("❌ Redis Integration Test failed:", error);
  } finally {
    // Disconnect from Redis
    await redisRepository.disconnect();
    console.log("👋 Disconnected from Redis");
    process.exit(0);
  }
}

// Demonstrate real-time change detection
async function demonstrateChangeDetection() {
  try {
    console.log("\n🔍 Demonstrating real-time change detection...");

    await initializeRedis();

    const testUserId = "change-test-user";

    // Set up change listener
    const unsubscribe = redisRepository.listenToKeyChanges(
      `user_request:${testUserId}`,
      (change) => {
        console.log("🔔 Detected change:", change);
      }
    );

    // Make some changes
    console.log("Making changes to trigger notifications...");

    await redisRepository.storeUserRequest(testUserId, {
      typename: "matchRequest",
      criterias: [
        { difficulty: "easy", language: "JavaScript", topic: "Array" },
      ],
      time: Date.now(),
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await redisRepository.removeUserRequest(testUserId);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    unsubscribe();
    await redisRepository.disconnect();
  } catch (error) {
    console.error("❌ Change detection demo failed:", error);
  }
}

// Run the test
if (process.argv.includes("--change-demo")) {
  demonstrateChangeDetection();
} else {
  testRedisIntegration();
}
