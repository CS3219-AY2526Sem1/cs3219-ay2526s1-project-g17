import { EventEmitter } from "events";
import { createClient, SCHEMA_FIELD_TYPE } from "redis";
import { MATCH_REQUEST_PREFIX, MATCH_REQUEST_IDX } from "../constants.js";
import * as types from "../types.js";
import { UserService } from "../service/user_service.js";

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

    // Stream configuration
    this.sessionCreatedEventStream = "session_created_events";
    this.createSessionMessageStream = "create_session_messages";
    this.matchedEventStream = "matched_events";
    this.sessionConsumerGroup = "session_processors";
    this.matchedConsumerGroup = "matched_processors";
    this.consumerName = `processor-${process.pid}-${Date.now()}`;
    this.isProcessing = false;
    this.sessionEventListeners = new Map();
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

      // Setup session stream consumer groups
      await this.createSessionConsumerGroups();

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

  // ==================== SESSION STREAM METHODS ====================

  /**
   * Create consumer groups for session streams
   */
  async createSessionConsumerGroups() {
    try {
      // Create consumer group for CreateSessionMessageStream (single consumer)
      await this.client.xGroupCreate(
        this.createSessionMessageStream,
        this.sessionConsumerGroup,
        "0",
        { MKSTREAM: true }
      );
      console.log(
        `✅ Consumer group '${this.sessionConsumerGroup}' created for stream '${this.createSessionMessageStream}'`
      );
    } catch (error) {
      if (error.message.includes("BUSYGROUP")) {
        console.log(
          `ℹ️  Consumer group '${this.sessionConsumerGroup}' already exists for stream '${this.createSessionMessageStream}'`
        );
      } else {
        console.error(
          `❌ Error creating consumer group for ${this.createSessionMessageStream}:`,
          error
        );
        throw error;
      }
    }

    try {
      // Create consumer group for MatchedEventStream (single consumer)
      await this.client.xGroupCreate(
        this.matchedEventStream,
        this.matchedConsumerGroup,
        "0",
        { MKSTREAM: true }
      );
      console.log(
        `✅ Consumer group '${this.matchedConsumerGroup}' created for stream '${this.matchedEventStream}'`
      );
    } catch (error) {
      if (error.message.includes("BUSYGROUP")) {
        console.log(
          `ℹ️  Consumer group '${this.matchedConsumerGroup}' already exists for stream '${this.matchedEventStream}'`
        );
      } else {
        console.error(
          `❌ Error creating consumer group for ${this.matchedEventStream}:`,
          error
        );
        throw error;
      }
    }
  }

  /**
   * Publish a session created event to the SessionCreatedEventStream
   * This is for broadcast-style listening (everyone listens)
   * @param {CollaborationSession} collaboration
   */
  async publishSessionCreatedEvent(collaboration) {
    try {
      const messageId = await this.client.xAdd(
        this.sessionCreatedEventStream,
        "*",
        {
          userId1: collaboration.userIds[0],
          userId2: collaboration.userIds[1],
          sessionId: collaboration.sessionId,
          questionId: collaboration.sessionId,
          criteria: JSON.stringify(collaboration.criteria),
          timestamp: Date.now().toString(),
        }
      );

      console.log(
        `📢 Published session created event: ${messageId} for users ${collaboration.userIds[0]}, ${collaboration.userIds[1]}`
      );
      return messageId;
    } catch (error) {
      console.error("❌ Error publishing session created event:", error);
      throw error;
    }
  }

  /**
   * Add a message to CreateSessionMessageStream for single-consumer processing
   * @param {object} messageData - Session message data
   * @param {string} messageData.userId1 - First user ID
   * @param {string} messageData.userId2 - Second user ID
   * @param {import("../types.js").Criteria} messageData.criteria - Second user ID
   */
  async addCreateSessionMessage(messageData) {
    try {
      const messageId = await this.client.xAdd(
        this.createSessionMessageStream,
        "*",
        {
          userId1: messageData.userId1,
          userId2: messageData.userId2,
          criteria: JSON.stringify(messageData.criteria),
          timestamp: Date.now().toString(),
        }
      );

      console.log(
        `📨 Added create session message: ${messageId} for users ${messageData.userId1}, ${messageData.userId2}`
      );
      return messageId;
    } catch (error) {
      console.error("❌ Error adding create session message:", error);
      throw error;
    }
  }

  /**
   * Start listening to SessionCreatedEventStream for broadcast-style events
   * All instances will listen to this stream
   * @param {function} eventHandler - Handler function for session events
   */
  async startListeningToSessionEvents(eventHandler) {
    const listenerId = `session-listener-${Date.now()}`;
    let isListening = true;
    let lastMessageId = "0";

    console.log(
      `👂 Started listening to session created events with listener: ${listenerId}`
    );

    const processEvents = async () => {
      while (isListening && this.isConnected) {
        try {
          // Read from the stream without consumer groups (broadcast style)
          const messages = await this.client.xRead(
            [
              {
                key: this.sessionCreatedEventStream,
                id: lastMessageId,
              },
            ],
            {
              COUNT: 10,
              BLOCK: 1000,
            }
          );

          if (messages && messages.length > 0) {
            for (const stream of messages) {
              for (const message of stream.messages) {
                lastMessageId = message.id;
                const {
                  userId1,
                  userId2,
                  sessionId,
                  questionId,
                  criteria,
                  timestamp,
                } = message.message;
                console.log(
                  `🎯 Processing session event for connected users: ${userId1}, ${userId2}`
                );

                const eventData = {
                  userId1,
                  userId2,
                  sessionId,
                  questionId,
                  criteria: JSON.parse(criteria),
                  timestamp: parseInt(timestamp),
                };

                await eventHandler(eventData);
              }
            }
          }
        } catch (error) {
          if (error.message.includes("NOSTREAM")) {
            // Stream doesn't exist yet, continue listening
            continue;
          }
          console.error("❌ Error processing session events:", error);
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait before retry
        }
      }
    };

    // Start processing in background
    processEvents().catch((error) => {
      console.error("❌ Fatal error in session event processing:", error);
    });

    // Store listener for cleanup
    this.sessionEventListeners.set(listenerId, () => {
      isListening = false;
    });

    return () => {
      isListening = false;
      this.sessionEventListeners.delete(listenerId);
    };
  }

  /**
   * Start processing CreateSessionMessageStream with single-consumer guarantee
   * @param {function} messageHandler - Handler function for create session messages
   */
  async startProcessingCreateSession(messageHandler) {
    this.isProcessing = true;
    console.log(
      `🎯 Starting create session processing with consumer: ${this.consumerName}`
    );
    const processEvent = async () => {
      while (this.isProcessing && this.isConnected) {
        try {
          const messages = await this.client.xReadGroup(
            this.sessionConsumerGroup,
            this.consumerName,
            [
              {
                key: this.createSessionMessageStream,
                id: ">",
              },
            ],
            {
              COUNT: 1,
            }
          );

          if (messages && messages.length > 0) {
            for (const stream of messages) {
              for (const message of stream.messages) {
                await this.processCreateSessionMessage(message, messageHandler);
                // Acknowledge message after successful processing
                await this.client.xAck(
                  this.createSessionMessageStream,
                  this.sessionConsumerGroup,
                  message.id
                );
              }
            }
          }
        } catch (error) {
          if (error.message.includes("NOGROUP")) {
            console.log("⚠️ Consumer group not ready yet, retrying...");
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }
          console.error("❌ Error processing create session messages:", error);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    };
    processEvent().catch((error) => console.error(error));
  }

  /**
   * Process individual create session message
   * @param {object} message - Redis stream message
   * @param {function} messageHandler - Handler function
   */
  async processCreateSessionMessage(message, messageHandler) {
    try {
      const { userId1, userId2, criteria, timestamp } = message.message;

      console.log(
        `🔄 Processing create session message for users ${userId1}, ${userId2}`
      );

      const messageData = {
        userId1,
        userId2,
        criteria,
        timestamp: parseInt(timestamp),
      };

      await messageHandler(messageData);

      console.log(
        `✅ Successfully processed create session message for users ${userId1}, ${userId2}`
      );
    } catch (error) {
      console.error("❌ Error processing create session message:", error);
      throw error;
    }
  }

  /**
   * Add a matched event to MatchedEventStream for single-consumer processing
   * @param {object} eventData - Matched event data
   * @param {string} eventData.userId1 - First user ID
   * @param {string} eventData.userId2 - Second user ID
   * @param {import("../types.js").Criteria} eventData.criteria - Matching criteria
   * @param {string} eventData.matchedAt - Timestamp when match occurred
   */
  async addMatchedEvent(eventData) {
    try {
      const messageId = await this.client.xAdd(this.matchedEventStream, "*", {
        userId1: eventData.userId1,
        userId2: eventData.userId2,
        criteria: JSON.stringify(eventData.criteria),
        matchedAt: eventData.matchedAt,
        timestamp: Date.now().toString(),
      });

      console.log(
        `📊 Added matched event: ${messageId} for users ${eventData.userId1}, ${eventData.userId2}`
      );
      return messageId;
    } catch (error) {
      console.error("❌ Error adding matched event:", error);
      throw error;
    }
  }

  /**
   * Start processing MatchedEventStream with single-consumer guarantee
   * @param {function} eventHandler - Handler function for matched events
   */
  async startProcessingMatchedEvents(eventHandler) {
    console.log(
      `🎯 Starting matched events processing with consumer: ${this.consumerName}`
    );

    const processEvents = async () => {
      while (this.isProcessing && this.isConnected) {
        try {
          const messages = await this.client.xReadGroup(
            this.matchedConsumerGroup,
            this.consumerName,
            [
              {
                key: this.matchedEventStream,
                id: ">",
              },
            ],
            {
              COUNT: 1,
            }
          );

          if (messages && messages.length > 0) {
            for (const stream of messages) {
              for (const message of stream.messages) {
                await this.processMatchedEvent(message, eventHandler);
                // Acknowledge message after successful processing
                await this.client.xAck(
                  this.matchedEventStream,
                  this.matchedConsumerGroup,
                  message.id
                );
              }
            }
          }
        } catch (error) {
          if (error.message.includes("NOGROUP")) {
            console.log(
              "⚠️ Matched events consumer group not ready yet, retrying..."
            );
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }
          console.error("❌ Error processing matched events:", error);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    };

    // Start processing in background
    processEvents().catch((error) => {
      console.error("❌ Fatal error in matched events processing:", error);
    });
  }

  /**
   * Process individual matched event
   * @param {object} message - Redis stream message
   * @param {function} eventHandler - Handler function
   */
  async processMatchedEvent(message, eventHandler) {
    try {
      const { userId1, userId2, criteria, matchedAt, timestamp } =
        message.message;

      console.log(
        `🔄 Processing matched event for users ${userId1}, ${userId2}`
      );

      const eventData = {
        userId1,
        userId2,
        criteria: JSON.parse(criteria),
        matchedAt,
        timestamp: parseInt(timestamp),
      };

      await eventHandler(eventData);

      console.log(
        `✅ Successfully processed matched event for users ${userId1}, ${userId2}`
      );
    } catch (error) {
      console.error("❌ Error processing matched event:", error);
      throw error;
    }
  }

  /**
   * Stop session stream processing
   */
  async stopSessionProcessing() {
    this.isProcessing = false;

    // Stop all session event listeners
    for (const [listenerId, stopFn] of this.sessionEventListeners) {
      stopFn();
    }
    this.sessionEventListeners.clear();

    console.log("🛑 Session stream processing stopped");
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
      // Stop session processing first
      await this.stopSessionProcessing();

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
