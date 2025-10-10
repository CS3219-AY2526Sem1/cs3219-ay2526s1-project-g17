import { EventEmitter } from "events";
import { createClient } from "redis";

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
   * @param {Function} callback - Callback function to call on change
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
   * @param {import("../server.js").MatchRequest} request - Match request object
   * @param {number} ttl - TTL in seconds
   */
  async storeUserRequest(userId, request, ttl = 300) {
    const key = `user_request:${userId}`;
    const value = JSON.stringify({
      ...request,
      storedAt: Date.now(),
    });

    await this.client.setEx(key, ttl, value);
    console.log(`Stored user request for ${userId}`);
  }

  /**
   * Get a user's match request
   * @param {string} userId - User ID
   * @returns {Promise<import("../server").MatchRequest|null>}
   */
  async getUserRequest(userId) {
    const key = `user_request:${userId}`;
    const value = await this.client.get(key);

    if (!value) return null;

    return JSON.parse(value);
  }

  /**
   * Remove a user's match request
   * @param {string} userId - User ID
   */
  async removeUserRequest(userId) {
    const key = `user_request:${userId}`;
    await this.client.del(key);
    console.log(`🗑️ Removed user request for ${userId}`);
  }

  /**
   * Get all active user requests
   * @returns {Promise<Map<string, import("../server.js").MatchRequest>>}
   */
  async getAllUserRequests() {
    const pattern = "user_request:*";
    const keys = await this.client.keys(pattern);
    const requests = new Map();

    for (const key of keys) {
      const userId = key.replace("user_request:", "");
      const value = await this.client.get(key);
      if (value) {
        requests.set(userId, JSON.parse(value));
      }
    }

    return requests;
  }

  // ==================== USER CONNECTIONS OPERATIONS ====================

  /**
   * Store user connection info
   * @param {string} userId - User ID
   * @param {object} connectionInfo - Connection information
   */
  async storeUserConnection(userId, connectionInfo) {
    const key = `user_connection:${userId}`;
    const value = JSON.stringify({
      ...connectionInfo,
      connectedAt: Date.now(),
    });

    await this.client.setEx(key, 7200, value); // 2 hours TTL
    console.log(`🔌 Stored connection info for ${userId}`);
  }

  /**
   * Get user connection info
   * @param {string} userId - User ID
   * @returns {Promise<object|null>}
   */
  async getUserConnection(userId) {
    const key = `user_connection:${userId}`;
    const value = await this.client.get(key);

    if (!value) return null;

    return JSON.parse(value);
  }

  /**
   * Remove user connection
   * @param {string} userId - User ID
   */
  async removeUserConnection(userId) {
    const key = `user_connection:${userId}`;
    await this.client.del(key);
    console.log(`🔌❌ Removed connection info for ${userId}`);
  }

  // ==================== MATCHED PAIR OPERATIONS ====================

  /**
   * Store matched pair information
   * @param {string} userId1
   * @param {string} userId2
   * @param {number} [ttl=360] 360 seconds default
   */
  async storeMatchedPair(userId1, userId2, ttl = 360) {
    const createData = (partnerId) => ({
      partner: partnerId,
      accepted: false,
    });

    const pairKey = `matched_pair:${userId1}`;
    const reversePairKey = `matched_pair:${userId2}:${userId1}`;

    const value1 = JSON.stringify(createData(userId2));
    const value2 = JSON.stringify(createData(userId1));

    await Promise.all([
      this.client.setEx(pairKey, ttl, value1),
      this.client.setEx(reversePairKey, ttl, value2),
    ]);

    console.log(`👥 Stored matched pair: ${userId1} <-> ${userId2}`);
  }

  /**
   * Get matched pair information
   * @param {string} userId - User ID to find their match
   * @returns {Promise<object|null>}
   */
  async getMatchedPair(userId) {
    const key = `matched_pair:${userId}`;

    const value = await this.client.get(key);

    return value ? JSON.parse(value) : null;
  }

  /**
   * Update match acceptance status
   * @param {string} userId1 - First user ID
   */
  async updateMatchAcceptance(userId1) {
    const pairKey = `matched_pair:${userId1}`;

    const existingData = await this.client.get(pairKey);
    if (!existingData) {
      throw new Error("Match pair not found");
    }

    const pairData = JSON.parse(existingData);

    pairData.accepted = true;
    pairData.lastUpdated = Date.now();

    const value = JSON.stringify(pairData);

    await Promise.all([this.client.set(pairKey, value, { KEEPTTL: true })]);

    console.log(`✅ Updated acceptance for ${userId1}`);

    return pairData;
  }

  /**
   * @param {string} userId
   */
  async removeMatchedPair(userId) {
    const pairKey = `matched_pair:${userId}`;
    await this.client.del(pairKey),
      console.log(`🗑️👥 Removed matched pair: ${userId}`);
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
