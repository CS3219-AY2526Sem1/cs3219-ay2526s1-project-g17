import { EventEmitter } from "events";
import { createClient, SCHEMA_FIELD_TYPE } from "redis";
import {
  MATCH_REQUEST_PREFIX,
  MATCH_REQUEST_IDX,
} from "../constants.js";

/** @typedef {import("redis").RedisClientType} RedisClientType */
/** @typedef {import("../types.js").CollaborationSession} CollaborationSession */
/** @typedef {import("../types.js").MatchRequestEntity} MatchRequestEntity */
/** @typedef {import("../types.js").MatchedDetails} MatchedDetails*/

/**
 * @param {string} redisUrl
 * @returns {RedisClientType}
 */
export function createRedisClient(redisUrl) {
  return createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (/** @type {number}*/ retries) => {
        console.log(`Redis reconnection attempt ${retries}`);
        return Math.min(retries * 50, 500);
      },
    },
  });
}

/**
 * @property {RedisClientType} client
 * @property {RedisClientType} subscriber
 */
export class RedisRepository extends EventEmitter {
  constructor(
    /** @type {RedisClientType} */ client,
    /** @type {RedisClientType} */ subscriber
  ) {
    super();
    this.client = client;
    this.subscriber = subscriber;
    this.isConnected = false;
    this.changeListeners = new Map();
  }

  /**
   * @returns {Promise<void>}
   */
  async connect() {
    try {
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
      await this.flushAll();

      // Enable keyspace notifications for change detection
      await this.client.configSet("notify-keyspace-events", "KEA");

      // Setup keyspace notification listener
      await this.setupKeyspaceNotifications();

      await this.setupMatchRequestSchema();

      console.log("🚀 Redis Repository initialized successfully");
    } catch (error) {
      console.error("Failed to connect to Redis:", error);
      throw error;
    }
  }

  async setupMatchRequestSchema() {
    const schema = {
      "$.criterias[*].difficulty": {
        type: SCHEMA_FIELD_TYPE.TAG,
        AS: "difficulty",
      },
      "$.criterias[*].language": {
        type: SCHEMA_FIELD_TYPE.TAG,
        AS: "language",
      },
      "$.criterias[*].topic": {
        type: SCHEMA_FIELD_TYPE.TAG,
        AS: "topic",
      },
      "$.status": {
        type: SCHEMA_FIELD_TYPE.TAG,
        AS: "status",
      },
      "$.time": {
        type: SCHEMA_FIELD_TYPE.NUMERIC,
        AS: "time",
        SORTABLE: true,
      },
      "$.userId": {
        type: SCHEMA_FIELD_TYPE.TAG,
        AS: "userId",
      },
    };

    try {
      await this.client.ft.create(MATCH_REQUEST_IDX, schema, {
        ON: "JSON",
        PREFIX: `${MATCH_REQUEST_PREFIX}:`,
      });
      console.log("MatchRequest schema setup complete");
    } catch (e) {
      if (e.message === "Index already exists") {
        console.log("Index exists already, skipped creation.");
      } else {
        // Something went wrong, perhaps RediSearch isn't installed...
        console.error(e);
        process.exit(1);
      }
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
   */
  async storeUserRequest(userId, request) {
    const key = `${MATCH_REQUEST_PREFIX}${userId}`;
    const value = JSON.stringify({
      ...request,
      storedAt: Date.now(),
    });

    await this.client.set(key, value);
    console.log(`Stored user request for ${userId}`);
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
        try {
          await this.client.quit();
          console.log("✅ Main Redis client closed");
        } catch (error) {
          console.error("❌ Error closing main client:", error);
          this.client.destroy();
        }
      }
      if (this.subscriber) {
        try {
          await this.subscriber.pUnsubscribe("__keyspace@0__:*");
          console.log("✅ Unsubscribed from keyspace notifications");

          await this.subscriber.unsubscribe();
          console.log("✅ Unsubscribed from all channels");

          await this.subscriber.quit();
          console.log("✅ Subscriber connection closed");
        } catch (error) {
          console.error("❌ Error closing subscriber:", error);
          this.subscriber.destroy();
        }
      }

      this.isConnected = false;
      console.log("👋 Redis connections closed");
    } catch (error) {
      console.error("Error disconnecting from Redis:", error);
    }
  }
}
