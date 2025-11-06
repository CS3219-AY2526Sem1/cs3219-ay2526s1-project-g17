import { MATCH_REQUEST_IDX, MATCH_REQUEST_PREFIX } from "../constants.js";
import { delay } from "../utility/utility.js";

/** @typedef {import("../types.js").MatchRequestEntity} MatchRequestEntity */
/** @typedef {import("../types.js").Criteria} Criteria */
/** @typedef {import("redis").RedisClientType} RedisClientType*/

export class MatchRequestService {
  constructor(
    /** @type {RedisClientType} */ redisClient,
    /** @type {RedisClientType} */ redisSubscriber
  ) {
    this.client = redisClient;
    this.sub = redisSubscriber;
  }

  /**
   * @param {MatchRequestEntity} request
   */
  async storeUserRequest(request) {
    const key = `${MATCH_REQUEST_PREFIX}:${request.userId}`;
    const result = await this.client.json.set(key, "$", request);
    return result === "OK";
  }

  /**
   * Queries the Redis index to find the single oldest matching document.
   * @param {string} userId
   * @param {Criteria[]} criterias
   */
  async findOldestMatch(userId, criterias) {
    const topicFilter = criterias.map((c) => c.topic).join("|");
    const language = criterias[0].language;
    const difficulty = criterias[0].difficulty;

    const escapedUserId = userId.replace(/[^\w]/g, "\\$&");
    const escapedLanguage = language.replace(/[^\w]/g, "\\$&");
    const escapedDifficulty = difficulty.replace(/[^\w]/g, "\\$&");
    const escapedTopics = criterias
      .map((c) => c.topic.replace(/[^\w\s]/g, "\\$&"))
      .join("|");

    const query = `@difficulty:{${escapedDifficulty}} @language:{${escapedLanguage}} @topic:{${escapedTopics}} @status:{waiting} -@userId:{${escapedUserId}}`;

    const result = await this.client.ft.search(MATCH_REQUEST_IDX, query, {
      SORTBY: { BY: "time", DIRECTION: "ASC" },
      LIMIT: { from: 0, size: 1 },
    });

    if (
      result.total === 0 ||
      !result.documents ||
      result.documents.length === 0
    ) {
      return null;
    }

    // The first document is the oldest match
    /** @type {MatchRequestEntity} */
    // @ts-ignore
    const ret = result.documents[0].value;
    return ret;
  }

  /**
   * Store a match request
   * @param {string} userId - User ID
   * @param {"waiting" | "matched"} status
   */
  async updateUserRequest(userId, status) {
    const retries = 5;
    var tries = 0;

    const key = `${MATCH_REQUEST_PREFIX}:${userId}`;
    const request = await this.getUserRequest(userId);
    if (!request) {
      console.log("User Request no longer exists: " + userId);
      return;
    }

    console.log(`Updating user from ${request.status} to ${status}`);
    request.status = status;
    const value = request;

    while (tries < retries) {
      await this.client.watch([key]);

      try {
        const result = await this.client
          .multi()
          .json.set(key, "$", value)
          .exec();
        console.log("Update result", result);
        if (result) {
          await this.client.unwatch();
          console.log(`User Updated on ${tries}th tries`);
          return;
        } else {
          console.log(`Updating ${userId} failed, retrying...`);
          tries += 1;
          await this.client.unwatch();
        }
      } catch (e) {
        tries += 1;
        await this.client.unwatch();
        console.error(e);
      }
    }
  }

  /**
   * Get a user's match request
   * @param {string} userId - User ID
   * @returns {Promise<MatchRequestEntity | null>}
   */
  async getUserRequest(userId) {
    const key = `${MATCH_REQUEST_PREFIX}:${userId}`;
    /** @type {MatchRequestEntity} */
    // @ts-ignore
    const value = await this.client.json.get(key);
    return value ?? null;
  }

  /**
   * Remove a user's match request
   * @param {string} userId - User ID
   */
  async removeUserRequest(userId) {
    const key = `${MATCH_REQUEST_PREFIX}:${userId}`;
    await this.client.json.del(key);
    console.log(`🗑️ Removed user request for ${userId}`);
  }

  /**
   * Atomically transition two users from one status to another
   * @param {string} userId1
   * @param {string} userId2
   * @param {"waiting" | "matched"} initialStatus
   * @param {"waiting" | "matched"} newStatus
   * @returns {Promise<boolean>} Success status
   */
  async atomicTransitionUsersState(userId1, userId2, initialStatus, newStatus) {
    console.log(`Atomic transition from ${initialStatus} -> ${newStatus}`);
    const retries = 5;
    let tries = 0;

    const key1 = `${MATCH_REQUEST_PREFIX}:${userId1}`;
    const key2 = `${MATCH_REQUEST_PREFIX}:${userId2}`;

    console.log(`🔍 Looking for keys: ${key1}, ${key2}`);

    while (tries < retries) {
      try {
        // Start watching the keys
        await this.client.watch([key1, key2]);

        // Get both requests using direct JSON.GET calls
        const [request1, request2] = await Promise.all([
          this.client.json.get(key1),
          this.client.json.get(key2),
        ]);

        console.log(`🔍 Retrieved values:`, { request1, request2 });

        // Check if both users exist
        if (!request1 || !request2) {
          await this.client.unwatch();
          console.log(
            `❌ Transition failed: User ${userId1} or ${userId2} not found`
          );
          return false;
        }

        /** @type {MatchRequestEntity} */
        // @ts-ignore
        const typedRequest1 = request1;
        /** @type {MatchRequestEntity} */
        // @ts-ignore
        const typedRequest2 = request2;

        console.log(
          `📊 Current statuses: ${typedRequest1.status}, ${typedRequest2.status}`
        );

        // Validate current status
        if (
          typedRequest1.status !== initialStatus ||
          typedRequest2.status !== initialStatus
        ) {
          await this.client.unwatch();
          console.log(
            `❌ Transition failed: Expected both users to be '${initialStatus}', but found '${typedRequest1.status}' and '${typedRequest2.status}'`
          );
          return false;
        }

        // Create updated requests with new status
        const updatedRequest1 = { ...typedRequest1, status: newStatus };
        const updatedRequest2 = { ...typedRequest2, status: newStatus };

        console.log(`🔄 Attempting atomic update...`);

        // Execute atomic update using MULTI/EXEC
        const result = await this.client
          .multi()
          .json.set(key1, "$", updatedRequest1)
          .json.set(key2, "$", updatedRequest2)
          .exec();

        console.log(`📋 Transaction result:`, result);

        if (result && result.length >= 2) {
          const allSuccessful = result.every(
            (commandResult) => String(commandResult) === "OK"
          );
          if (allSuccessful) {
            console.log(
              `✅ Successfully transitioned users ${userId1}, ${userId2} from '${initialStatus}' to '${newStatus}'`
            );
            return true;
          }
        }

        tries += 1;
        console.log(
          `🔄 Transition failed due to concurrent modification (attempt ${tries}/${retries})`
        );

        if (tries >= retries) {
          console.log(
            `❌ Failed to transition users after ${retries} attempts`
          );
          return false;
        }

        await delay(Math.random() * 10);
      } catch (error) {
        tries += 1;
        await this.client.unwatch();
        console.error(
          `❌ Error in atomic transition (attempt ${tries}/${retries}):`,
          error
        );

        if (tries >= retries) {
          throw error;
        }

        // Small delay before retry
        await delay(Math.random() * 10);
      }
    }

    return false;
  }
}
