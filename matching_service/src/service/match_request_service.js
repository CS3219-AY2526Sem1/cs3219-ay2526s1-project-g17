import { MATCH_REQUEST_PREFIX } from "../constants.js";

/** @typedef {import("../types").MatchRequestEntity} MatchRequestEntity */
/** @typedef {import("../types").Criteria} Criteria */
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
   * @param {Criteria[]} criterias
   * @param {string} userId
   */
  async findOldestMatch(criterias, userId) {
    // 1. Format the OR clause for topics: {Stack | Queue | Binary Tree}
    const topicFilter = criterias.map((c) => c.topic).join("|");
    const language = criterias[0].language;
    const difficulty = criterias[0].difficulty;
    // 2. Build the FT.SEARCH query string
    const query = `@difficulty:{${difficulty}} @language:{${language}} @topic:{${topicFilter}} @status:{"waiting"} -@userId:{${userId}}`;

    // 3. Execute the search command
    // Use Redis OM's ft.search API
    const result = await this.client.ft.search("matchIdx", query, {
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
    return result.documents[0].value;
  }

  /**
   * Store a match request
   * @param {string} userId - User ID
   * @param {"waiting" | "pending" | "matched"} status
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
}
