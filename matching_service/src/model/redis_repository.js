import { EventEmitter } from "events";
import { createClient } from "redis";

/** @typedef {Promise<import("../types.js").CollaborationSession>} CollaborationSession */
/** @typedef {import("../types.js").MatchRequestEntity} MatchRequestEntity */
/** @typedef {import("../types.js").MatchedDetails} MatchedDetails*/

class RedisRepository extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.subscriber = null;
    this.isConnected = false;
    this.changeListeners = new Map();
  }

  /**
   * @param {string} redisUrl
   * @returns {Promise<void>}
   */
  async connect(redisUrl) {
    try {
      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (/** @type {number}*/ retries) => {
            console.log(`Redis reconnection attempt ${retries}`);
            return Math.min(retries * 50, 500);
          },
        },
      });

      this.subscriber = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (/** @type {number}*/ retries) => {
            console.log(`Redis subscriber reconnection attempt ${retries}`);
            return Math.min(retries * 50, 500);
          },
        },
      });

      this.client.on("error", (/** @type {Error}*/ err) => {
        console.error("Redis Client Error:", err);
        this.emit("error", err);
      });

      this.subscriber.on("error", (/** @type {Error}*/ err) => {
        console.error("Redis Subscriber Error:", err);
        this.emit("error", err);
      });

      // Connection events
      this.client.on("connect", () => {
        console.log("Redis client connected");
        this.isConnected = true;
        this.emit("connected");
      });

      this.client.on("disconnect", () => {
        console.log("Redis client disconnected");
        this.isConnected = false;
        this.emit("disconnected");
      });

      await Promise.all([this.client.connect(), this.subscriber.connect()]);

      // Enable keyspace notifications for change detection
      await this.client.configSet("notify-keyspace-events", "KEA");

      // Setup keyspace notification listener
      await this.setupKeyspaceNotifications();

      console.log("🚀 Redis Repository initialized successfully");
    } catch (error) {
      console.error("Failed to connect to Redis:", error);
      throw error;
    }
  }

  /**
   * Setup keyspace notifications for change detection
   */
  async setupKeyspaceNotifications() {
    try {
      // Listen to all keyspace events
      // @ts-ignore
      await this.subscriber.pSubscribe(
        "__keyspace@0__:*",
        (message, channel) => {
          // Extract key from channel name
          const key = channel.replace("__keyspace@0__:", "");
          const operation = message;

          console.log(
            `🔔 Redis key change detected: ${key} - operation: ${operation}`
          );

          // Notify specific listeners
          this.notifyChangeListeners(key, operation);
        }
      );

      console.log("📡 Keyspace notifications setup complete");
    } catch (error) {
      console.error("Failed to setup keyspace notifications:", error);
      throw error;
    }
  }

  /**
   * Notify change listeners for a specific key
   * @param {string} key - Redis key that changed
   * @param {string} operation - Type of operation (set, del, expire, etc.)
   */
  notifyChangeListeners(key, operation) {
    const listeners = this.changeListeners.get(key);
    if (listeners && listeners.size > 0) {
      listeners.forEach((callback) => {
        try {
          callback({ key, operation, timestamp: Date.now() });
        } catch (error) {
          console.error(`Error in change listener for key ${key}:`, error);
        }
      });
    }
  }

  /**
   * Listen for changes to a specific Redis key
   * @param {string} key - Redis key to watch
   * @param {(change: {key: string, operation: string, timestamp: number}) => void} callback - Callback function to call on change
   * @returns {Function} Unsubscribe function
   */
  listenToKeyChanges(key, callback) {
    if (!this.changeListeners.has(key)) {
      this.changeListeners.set(key, new Set());
    }

    this.changeListeners.get(key).add(callback);

    console.log(`👂 Started listening to changes for key: ${key}`);

    // Return unsubscribe function
    return () => {
      const listeners = this.changeListeners.get(key);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.changeListeners.delete(key);
        }
      }
      console.log(`🔇 Stopped listening to changes for key: ${key}`);
    };
  }

  /**
   * Store a match request
   * @param {string} userId - User ID
   * @param {MatchRequestEntity} request - Match request object
   * @param {number} ttl - TTL in seconds
   */
  async storeUserRequest(userId, request, ttl = 300) {
    const key = `${userRequestKeyPrefix}${userId}`;
    const value = JSON.stringify({
      ...request,
      storedAt: Date.now(),
    });

    await this.client.setEx(key, ttl, value);
    console.log(`Stored user request for ${userId}`);
  }

  /**
   * Store a match request
   * @param {string} userId - User ID
   * @param {"waiting" | "pending" | "matched"} status
   */
  async updateUserRequest(userId, status) {
    const retries = 5;
    var tries = 0;

    const key = `${userRequestKeyPrefix}${userId}`;
    const request = await this.getUserRequest(userId);
    request.status = status;
    const value = JSON.stringify(request);

    while (tries < retries) {
      await this.client.watch([key]);

      try {
        const result = await this.client
          .multi()
          .set(key, value, { KEEPTTL: true })
          .exec();
        if (result) {
          await this.client.unwatch();
          console.log("User updated");
          return;
        } else {
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
    const key = `${userRequestKeyPrefix}${userId}`;
    const value = await this.client.get(key);

    if (!value) return null;

    // @ts-ignore
    return JSON.parse(value);
  }

  /**
   * Remove a user's match request
   * @param {string} userId - User ID
   */
  async removeUserRequest(userId) {
    const key = `${userRequestKeyPrefix}${userId}`;
    await this.client.del(key);
    console.log(`🗑️ Removed user request for ${userId}`);
  }

  /**
   * Get all active user requests
   * @returns {Promise<Map<string, MatchRequestEntity>>}
   */
  async getAllUserRequests() {
    const pattern = `${userRequestKeyPrefix}*`;
    /** @type {string[]} */
    const keys = await this.client.keys(pattern).then((k) => k.map(toString));
    const requests = new Map();

    for (const key of keys) {
      const userId = key.replace(userRequestKeyPrefix, "");
      const value = await this.client.get(key).then((e) => e.toString());
      if (value) {
        requests.set(userId, JSON.parse(value));
      }
    }

    return requests;
  }

  // ==================== MATCHED DETAILS OPERATIONS ====================

  /**
   * Store matched pair information
   * @param {string} userId
   * @param {MatchedDetails} matchedDetails
   */
  async storeMatchedDetails(userId, matchedDetails) {
    const ttl = 172800; // 2 days

    const key = `${matchedDetailsPrefix}${userId}`;
    const value = JSON.stringify(matchedDetails);
    await this.client.setEx(key, ttl, value);

    console.log(`👥 Stored matched details: ${userId}`);
  }

  /**
   * Get matched pair information
   * @param {string} userId
   * @returns {Promise<MatchedDetails>}
   */
  async getMatchedDetails(userId) {
    const key = `${matchedDetailsPrefix}${userId}`;

    const value = await this.client.get(key);

    // @ts-ignore
    return value ? JSON.parse(value) : null;
  }

  /**
   * @param {string} userId1
   * @param {string} userId2
   * @returns {Promise<[MatchedDetails|null, MatchedDetails |null]>}
   */
  async getPairMatchDetails(userId1, userId2) {
    const key1 = `${matchedDetailsPrefix}${userId1}`;
    const key2 = `${matchedDetailsPrefix}${userId2}`;
    const [value1, value2] = await this.client.mGet([key1, key2]);
    // @ts-ignore
    const ret1 = value1 ? JSON.parse(value1) : null;
    // @ts-ignore
    const ret2 = value2 ? JSON.parse(value2) : null;
    return [ret1, ret2];
  }

  /**
   * @param {string} userId
   * @param {MatchedDetails} matchDetails
   */
  async updateMatchedDetails(userId, matchDetails) {
    const key = `${matchedDetailsPrefix}${userId}`;
    const value = JSON.stringify(matchDetails);
    await this.client.set(key, value, { KEEPTTL: true });
  }

  /**
   * @param {string} userId
   */
  async removeMatchedDetails(userId) {
    const key = `${matchedDetailsPrefix}${userId}`;
    await this.client.del(key),
      console.log(`🗑️👥 Removed matched details: ${userId}`);
  }

  // ==================== COLLABORATION METHODS ====================
  /**
   * @param {string} userId1
   * @param {string} userId2
   */
  #getCollaborationKey(userId1, userId2) {
    const ids = [userId1, userId2];
    ids.sort();
    const key = `${collaborationSessionPrefix}${ids[0]}:${ids[1]}`;
    return key;
  }

  /**
   * Store matched pair information
   * @param {string} session
   * @param {string} userId1
   * @param {string} userId2
   */
  async storeCollaborationSession(session, userId1, userId2) {
    const ttl = 172800; // 2 days
    const value = JSON.stringify({
      session: session,
    });
    const key = this.#getCollaborationKey(userId1, userId2);
    await this.client.setEx(key, ttl, value),
      console.log(`👥 Stored collaboration session: ${userId1} <-> ${userId2}`);
  }

  /**
   * @param {string} userId1
   * @param {string} userId2
   * @returns {Promise<import("../types.js").CollaborationSession>}
   */
  async getCollaborationSession(userId1, userId2) {
    const key = this.#getCollaborationKey(userId1, userId2);
    const value = await this.client.get(key);
    // @ts-ignore
    return value ? JSON.parse(value) : null;
  }

  /**
   * @param {string} userId1
   * @param {string} userId2
   */
  async removeCollaborationSession(userId1, userId2) {
    const key = this.#getCollaborationKey(userId1, userId2);
    await this.client.del(key),
      console.log(
        `🗑️👥 Removed Collaboration session: \n${userId1}\n${userId2} `
      );
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Check if Redis is connected
   * @returns {boolean}
   */
  isRedisConnected() {
    return this.isConnected;
  }

  /**
   * Get Redis client stats
   * @returns {Promise<object>}
   */
  async getStats() {
    if (!this.isConnected) {
      throw new Error("Redis not connected");
    }

    const info = await this.client.info();
    return {
      connected: this.isConnected,
      info: info,
      changeListeners: this.changeListeners.size,
    };
  }

  /**
   * Flush all data (use with caution!)
   */
  async flushAll() {
    if (!this.isConnected) {
      throw new Error("Redis not connected");
    }

    await this.client.flushAll();
    console.log("🗑️🔥 Flushed all Redis data");
  }

  /**
   * Close Redis connections
   */
  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
      }
      if (this.subscriber) {
        await this.subscriber.quit();
      }

      this.isConnected = false;
      console.log("👋 Redis connections closed");
    } catch (error) {
      console.error("Error disconnecting from Redis:", error);
    }
  }
}

// Create and export singleton instance
const redisRepository = new RedisRepository();
export default redisRepository;
