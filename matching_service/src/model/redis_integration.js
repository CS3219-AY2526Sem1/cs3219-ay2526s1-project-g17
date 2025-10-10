import { configDotenv } from "dotenv";
import redisRepository from "./redis_repository.js";

export async function initializeRedis() {
  configDotenv();
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("REDIS_URL environment variable is required");
  }

  await redisRepository.connect(redisUrl);
  console.log("🔌 Redis integration initialized");
}

/**
 * Create a change listener for matched pairs
 * This is useful for real-time updates when match status changes
 * @param {string} userId - User ID to listen for match changes
 * @param {Function} callback - Callback function to handle changes
 * @returns {Function} Unsubscribe function
 */
export function listenToMatchChanges(userId, callback) {
  const matchKey = `matched_pair:${userId}`;

  return redisRepository.listenToKeyChanges(matchKey, async (change) => {
    try {
      // Get the updated match data
      const matchData = await redisRepository.getMatchedPair(userId);
      callback({
        userId,
        change,
        matchData,
      });
    } catch (error) {
      console.error(`Error handling match change for ${userId}:`, error);
    }
  });
}

/**
 * Create a change listener for user requests
 * @param {string} userId - User ID to listen for request changes
 * @param {Function} callback - Callback function to handle changes
 * @returns {Function} Unsubscribe function
 */
export function listenToRequestChanges(userId, callback) {
  const requestKey = `user_request:${userId}`;

  return redisRepository.listenToKeyChanges(requestKey, async (change) => {
    try {
      const requestData = await redisRepository.getUserRequest(userId);
      callback({
        userId,
        change,
        requestData,
      });
    } catch (error) {
      console.error(`Error handling request change for ${userId}:`, error);
    }
  });
}

export { redisRepository };

export async function cleanup() {
  await redisRepository.disconnect();
  console.log("🧹 Redis cleanup completed");
}
