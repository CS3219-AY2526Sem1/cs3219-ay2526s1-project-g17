/** @typedef {import("../types.js").MatchedDetails} MatchedDetails */
/** @typedef {import("../types.js").Criteria} Criteria */
/** @typedef {import("redis").RedisClientType} RedisClientType*/

import { MATCHED_DETAILS_PREFIX } from "../constants.js";

export class MatchedDetailsService {
  constructor(/** @type {RedisClientType} */ redisClient) {
    this.client = redisClient;
  }

  /**
   * Create matched details for a pair of users
   * @param {string} userId - Primary user ID
   * @param {string} partnerId - Partner user ID
   * @param {Criteria} criteria - Match criteria
   * @returns {Promise<boolean>} - Success status
   */
  async storeMatchedDetails(userId, partnerId, criteria) {
    try {
      /** @type {MatchedDetails} */
      const matchedDetails = {
        partner: partnerId,
        criteria,
      };

      const key = `${MATCHED_DETAILS_PREFIX}:${userId}`;
      const result = await this.client.json.set(key, "$", matchedDetails);
      console.log(
        `✅ Created matched details for ${userId} with partner ${partnerId}`
      );
      return result === "OK";
    } catch (error) {
      console.error(`❌ Error creating matched details for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get matched details for a user
   * @param {string} userId - User ID
   * @returns {Promise<MatchedDetails | null>} - Matched details or null if not found
   */
  async getMatchedDetails(userId) {
    try {
      const key = `${MATCHED_DETAILS_PREFIX}:${userId}`;
      /** @type {MatchedDetails} */
      // @ts-ignore
      const value = await this.client.json.get(key);

      if (value) {
        console.log(`📖 Retrieved matched details for ${userId}`);
        return value;
      }

      console.log(`📭 No matched details found for ${userId}`);
      return null;
    } catch (error) {
      console.error(`❌ Error getting matched details for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete matched details for a user
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} - Success status
   */
  async removeMatchedDetails(userId) {
    try {
      const key = `${MATCHED_DETAILS_PREFIX}:${userId}`;
      const result = await this.client.json.del(key);
      console.log(`🗑️ Deleted matched details for ${userId}`);
      return result > 0; // json.del returns number of keys deleted
    } catch (error) {
      console.error(`❌ Error deleting matched details for ${userId}:`, error);
      throw error;
    }
  }
}
