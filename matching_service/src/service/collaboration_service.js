/** @typedef {import("../types.js").CollaborationSession} CollaborationSession */
/** @typedef {import("../types.js").Criteria} Criteria */
/** @typedef {import("redis").RedisClientType} RedisClientType*/

// AI generated file

import {
  COLLABORATION_SESSION_PREFIX,
} from "../constants.js";

export class CollaborationService {
  constructor(/** @type {RedisClientType} */ redisClient) {
    this.client = redisClient;
  }

  /**
   * @param {string} userId1
   * @param {string} userId2
   */
  formulateKey(userId1, userId2) {
    return `${COLLABORATION_SESSION_PREFIX}:${[userId1, userId2]
      .sort()
      .join("")}`;
  }

  /**
   * Create a collaboration session
   * @param {CollaborationSession} collaborationSession
   * @returns {Promise<CollaborationSession>}
   */
  async createCollaborationSession(collaborationSession) {
    try {
      // Validate input parameters
      if (
        !collaborationSession ||
        !collaborationSession.userIds ||
        !collaborationSession.userIds[0] ||
        !collaborationSession.userIds[1]
      ) {
        console.log(
          `❌ Invalid collaboration session or userIds: ${JSON.stringify(
            collaborationSession
          )}`
        );
        return null;
      }

      const [userId1, userId2] = collaborationSession.userIds;
      const key = this.formulateKey(userId1, userId2);
      const result = await this.client.json.set(key, "$", collaborationSession);

      if (result === "OK") {
        console.log(
          `✅ Created collaboration session ${collaborationSession.sessionId} ${key}}]`
        );
        return collaborationSession;
      } else {
        console.log(
          `❌ Failed to store collaboration session ${collaborationSession.sessionId}`
        );
        return null;
      }
    } catch (error) {
      console.error(`❌ Error creating collaboration session:`, error);
      return null;
    }
  }

  /**
   * @param {string} userId1
   * * @param {string} userId2
   * @returns {Promise<CollaborationSession | null>}
   */
  async getCollaborationSession(userId1, userId2) {
    // Validate input parameters
    if (!userId1 || !userId2) {
      console.log(
        `❌ Invalid parameters: userId1=${userId1}, userId2=${userId2}`
      );
      return null;
    }

    const key = this.formulateKey(userId1, userId2);
    try {
      /** @type {CollaborationSession | null} */
      // @ts-ignore
      const session = await this.client.json.get(key);

      if (session) {
        console.log(`✅ Retrieved collaboration session ${session}`);
        return session;
      } else {
        console.log(`❌ Collaboration session ${key} not found`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error retrieving collaboration session ${key}:`, error);
      return null;
    }
  }

  /**
   * @param {string} userId1
   * * @param {string} userId2
   * @returns {Promise<boolean>}
   */
  async deleteCollaborationSession(userId1, userId2) {
    // Validate input parameters
    if (!userId1 || !userId2) {
      console.log(
        `❌ Invalid parameters: userId1=${userId1}, userId2=${userId2}`
      );
      return false;
    }

    const key = this.formulateKey(userId1, userId2);
    try {
      const result = await this.client.json.del(key);
      if (result > 0) {
        console.log(`🗑️ Deleted collaboration session ${key}`);
        return true;
      } else {
        console.log(`❌ Collaboration session ${key} not found for deletion`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error deleting collaboration session ${key}:`, error);
      return false;
    }
  }
}
