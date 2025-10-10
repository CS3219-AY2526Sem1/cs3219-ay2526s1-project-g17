/**
 * Updated server.js with Redis integration
 * This shows how to integrate Redis with your existing WebSocket server
 */

import http from "http";
import index from "./index.js";
import { connectToDB } from "./model/repository.js";
import { WebSocketServer } from "ws";
import { randomUUID } from "crypto";
import { configDotenv } from "dotenv";
import {
  sendMatchNotification,
  sendMessage,
  sendSessionToUser,
} from "./utility/ws_util.js";

// Redis integration
import {
  initializeRedis,
  listenToMatchChanges,
  createCollaborationSession,
  redisRepository,
  cleanup as redisCleanup,
} from "./model/redis_integration.js";

configDotenv();

const port = process.env.PORT || 3001;

const server = http.createServer(index);
const wss = new WebSocketServer({ server, clientTracking: true });

/**
 * @typedef {Object} Criteria
 * @property {"easy" | "medium" | "hard"} difficulty
 * @property {string} language
 * @property {string} topic
 */

/**
 * @typedef {MatchRequest | MatchAck} Message
 */

/**
 * @typedef {Object} UserInstance
 * @property {WebSocket} ws
 * @property {string} id
 */

/**
 * @typedef {Object} MatchRequest
 * @property {"matchRequest"} typename
 * @property {Array<Criteria>} criterias
 * @property {number} time
 */

/**
 * @typedef {Object} MatchAck
 * @property {"matchAck"} typename
 * @property {"accept" | "reject"} response
 */

/**
 * @typedef {Object} MatchPair
 * @property {string} partner
 * @property {boolean} accepted
 */

// Keep in-memory maps for WebSocket connections (cannot be stored in Redis)
/** @type {Map<string, UserInstance>} */
const userConnections = new Map();

// Change listeners storage
const activeChangeListeners = new Map();

wss.on("connection", (ws, request) => {
  console.log("🔌 New WebSocket connection");

  /** @type {UserInstance} */
  const userInstance = { id: randomUUID(), ws: ws };

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);
      console.log("📨 Received message", data);
      await handleMessage(userInstance, data);
    } catch (error) {
      console.error("❌ Error while parsing or handling message", error);
      ws.send(
        JSON.stringify({ type: "error", message: "Invalid JSON", e: error })
      );
    }
  });

  ws.on("close", async () => {
    await handleDisconnect(userInstance);
  });
});

/**
 * @param {UserInstance} userInstance
 * @param {Message} message
 */
async function handleMessage(userInstance, message) {
  switch (message.typename) {
    case "matchRequest":
      message["time"] = Date.now();
      await handleMatchRequest(userInstance, message);
      break;
    case "matchAck":
      switch (message.response) {
        case "accept":
          await matchAcceptHandler(userInstance);
          break;
        case "reject":
          await matchRejectHandler(userInstance);
          break;
      }
      break;
    default:
      sendMessage(userInstance.ws, { message: "Invalid request typename" });
  }
}

/**
 * @param {UserInstance} userInstance
 */
async function matchAcceptHandler(userInstance) {
  try {
    const matchData = await redisRepository.getMatchedPair(userInstance.id);
    if (!matchData) {
      throw new Error("No match entry for " + userInstance.id);
    }

    // Update acceptance in Redis
    const updatedMatch = await redisRepository.updateMatchAcceptance(
      matchData.users[0],
      matchData.users[1],
      userInstance.id
    );

    console.log(`✅ ${userInstance.id} has accepted`);

    // Check if both users have accepted
    if (updatedMatch.user1Accepted && updatedMatch.user2Accepted) {
      console.log("🎉 Both users accepted - creating session");
      await createSessionForMatch(updatedMatch);
    }
  } catch (error) {
    console.error("❌ Error in match accept handler:", error);
  }
}

/**
 * @param {UserInstance} userInstance
 */
async function matchRejectHandler(userInstance) {
  try {
    const matchData = await redisRepository.getMatchedPair(userInstance.id);
    if (!matchData) {
      console.log("⚠️ No match found for rejection");
      return;
    }

    const partnerId = matchData.users.find((id) => id !== userInstance.id);

    // Remove the match from Redis
    await redisRepository.removeMatchedPair(
      matchData.users[0],
      matchData.users[1]
    );

    // Remove user request (they rejected, so they're out of matching)
    await redisRepository.removeUserRequest(userInstance.id);

    // Notify partner and put them back in matching pool
    const partnerConnection = userConnections.get(partnerId);
    if (partnerConnection) {
      sendMessage(partnerConnection.ws, {
        type: "matchRejected",
        reason: "Partner rejected the match",
      });

      // Partner can stay in matching pool - their request should still be in Redis
    }

    // Disconnect the rejecting user
    userInstance.ws.close();

    console.log(`❌ ${userInstance.id} rejected match with ${partnerId}`);
  } catch (error) {
    console.error("❌ Error in match reject handler:", error);
  }
}

/**
 * @param {UserInstance} userInstance
 */
async function handleDisconnect(userInstance) {
  try {
    userConnections.delete(userInstance.id);

    // Clean up Redis data
    await redisRepository.removeUserConnection(userInstance.id);
    await redisRepository.removeUserRequest(userInstance.id);

    // Remove any active match
    const matchData = await redisRepository.getMatchedPair(userInstance.id);
    if (matchData) {
      await redisRepository.removeMatchedPair(
        matchData.users[0],
        matchData.users[1]
      );
    }

    // Clean up change listeners
    const unsubscribe = activeChangeListeners.get(userInstance.id);
    if (unsubscribe) {
      unsubscribe();
      activeChangeListeners.delete(userInstance.id);
    }

    console.log(`👋 User ${userInstance.id} disconnected and cleaned up`);
  } catch (error) {
    console.error("❌ Error handling disconnect:", error);
  }
}

/**
 * @param {UserInstance} userInstance
 * @param {MatchRequest} data
 */
async function handleMatchRequest(userInstance, data) {
  try {
    // Store user connection
    userConnections.set(userInstance.id, userInstance);
    await redisRepository.storeUserConnection(userInstance.id, {
      id: userInstance.id,
      connectedAt: Date.now(),
    });

    // Get all existing user requests from Redis
    const allRequests = await redisRepository.getAllUserRequests();
    const matchedRequest = [];

    // Find matching requests
    for (const [userId, request] of allRequests.entries()) {
      if (
        userId !== userInstance.id &&
        hasMatchingCriteria(data.criterias, request.criterias)
      ) {
        matchedRequest.push([userId, request.criterias]);
      }
    }

    if (matchedRequest.length > 0) {
      // Sort and get the first match
      matchedRequest.sort();
      const [otherUserId, otherCriterias] = matchedRequest[0];
      const criteria = findMatchingCriteria(data.criterias, otherCriterias);

      if (criteria) {
        // Create match in Redis
        await redisRepository.storeMatchedPair(userInstance.id, otherUserId, {
          criteria,
          matchedAt: Date.now(),
        });

        // Remove both user requests from matching pool
        await redisRepository.removeUserRequest(userInstance.id);
        await redisRepository.removeUserRequest(otherUserId);

        // Send notifications
        const otherConnection = userConnections.get(otherUserId);

        sendMatchNotification(userInstance.ws, criteria);
        if (otherConnection) {
          sendMatchNotification(otherConnection.ws, criteria);
        }

        // Set up change listeners for real-time updates
        setupMatchChangeListener(userInstance.id);
        if (otherConnection) {
          setupMatchChangeListener(otherUserId);
        }

        // Set timeout for acceptance
        setTimeout(async () => {
          await handleAcceptanceTimeout(userInstance.id, otherUserId);
        }, Number(process.env.ACCEPTANCE_TIMEOUT) || 30000);

        sendMessage(userInstance.ws, {
          message: "Match found and notifications sent",
        });
      }
    } else {
      // No match found, store request in Redis
      await redisRepository.storeUserRequest(userInstance.id, data);
      sendMessage(userInstance.ws, {
        message: "Request stored, waiting for match",
      });
    }
  } catch (error) {
    console.error("❌ Error while handling match request", error);
    sendMessage(userInstance.ws, {
      type: "error",
      message: "Failed to process match request",
    });
  }
}

/**
 * Set up change listener for a matched user
 * @param {string} userId - User ID to set up listener for
 */
function setupMatchChangeListener(userId) {
  const unsubscribe = listenToMatchChanges(userId, (changeData) => {
    console.log(`🔄 Match change detected for ${userId}:`, changeData);

    const userConnection = userConnections.get(userId);
    if (userConnection) {
      sendMessage(userConnection.ws, {
        type: "matchUpdate",
        data: changeData,
      });
    }
  });

  // Store unsubscribe function for cleanup
  activeChangeListeners.set(userId, unsubscribe);
}

/**
 * Handle acceptance timeout
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 */
async function handleAcceptanceTimeout(userId1, userId2) {
  try {
    const matchData = await redisRepository.getMatchedPair(userId1);
    if (!matchData) {
      return; // Match already handled
    }

    const user1Accepted = matchData.user1Accepted;
    const user2Accepted = matchData.user2Accepted;

    if (user1Accepted && user2Accepted) {
      // Both accepted - create session
      await createSessionForMatch(matchData);
    } else {
      // Timeout occurred - handle non-accepting users
      const user1Connection = userConnections.get(userId1);
      const user2Connection = userConnections.get(userId2);

      // Send timeout notifications
      if (user1Connection) {
        sendMessage(user1Connection.ws, {
          type: "matchTimeout",
          reason: "Acceptance timeout reached",
        });
      }
      if (user2Connection) {
        sendMessage(user2Connection.ws, {
          type: "matchTimeout",
          reason: "Acceptance timeout reached",
        });
      }

      // Clean up match
      await redisRepository.removeMatchedPair(userId1, userId2);

      // Disconnect non-accepting users
      if (!user1Accepted && user1Connection) {
        user1Connection.ws.close();
      }
      if (!user2Accepted && user2Connection) {
        user2Connection.ws.close();
      }

      console.log(`⏰ Match timeout between ${userId1} and ${userId2}`);
    }
  } catch (error) {
    console.error("❌ Error handling acceptance timeout:", error);
  }
}

/**
 * Create session for a successful match
 * @param {object} matchData - Match data from Redis
 */
async function createSessionForMatch(matchData) {
  try {
    const [userId1, userId2] = matchData.users;
    const sessionId = await createCollaborationSession(
      userId1,
      userId2,
      matchData.criteria
    );

    // Send session info to both users
    const user1Connection = userConnections.get(userId1);
    const user2Connection = userConnections.get(userId2);

    const sessionInfo = {
      type: "sessionCreated",
      sessionId,
      partner: null, // Will be set individually
    };

    if (user1Connection) {
      sendMessage(user1Connection.ws, {
        ...sessionInfo,
        partner: userId2,
      });
    }

    if (user2Connection) {
      sendMessage(user2Connection.ws, {
        ...sessionInfo,
        partner: userId1,
      });
    }

    // Clean up match data
    await redisRepository.removeMatchedPair(userId1, userId2);

    console.log(
      `🎉 Session ${sessionId} created for ${userId1} and ${userId2}`
    );
  } catch (error) {
    console.error("❌ Error creating session:", error);
  }
}

/**
 * @param {Array<Criteria>} criterias
 * @param {Array<Criteria>} otherCriterias
 * @returns {Criteria | undefined}
 */
function findMatchingCriteria(criterias, otherCriterias) {
  const otherCriteriaStrings = new Set(
    otherCriterias.map((c) => JSON.stringify(c))
  );
  for (const criteria of criterias) {
    const criteriaString = JSON.stringify(criteria);
    if (otherCriteriaStrings.has(criteriaString)) {
      return criteria;
    }
  }
  return undefined;
}

/**
 * @param {Array<Criteria>} criterias
 * @param {Array<Criteria>} otherCriterias
 * @returns {boolean}
 */
function hasMatchingCriteria(criterias, otherCriterias) {
  const totalLength = criterias.length + otherCriterias.length;
  const serializedCriterias = criterias.map((c) => JSON.stringify(c));
  const serializedOtherCriterias = otherCriterias.map((c) => JSON.stringify(c));

  const appendCriteria = [...serializedCriterias, ...serializedOtherCriterias];
  const set = new Set(appendCriteria);
  return set.size !== totalLength;
}

// Graceful shutdown handling
process.on("SIGINT", async () => {
  console.log("🛑 Received SIGINT, shutting down gracefully...");

  // Clean up all change listeners
  for (const unsubscribe of activeChangeListeners.values()) {
    unsubscribe();
  }

  // Clean up Redis
  await redisCleanup();

  // Close server
  server.close(() => {
    console.log("👋 Server closed");
    process.exit(0);
  });
});

// Initialize services and start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectToDB();
    console.log("✅ MongoDB connected");

    // Initialize Redis
    await initializeRedis();
    console.log("✅ Redis connected");

    // Start HTTP server
    server.listen(port, () => {
      console.log(
        `🚀 Matching service server listening on http://localhost:${port}`
      );
      console.log("🎯 WebSocket endpoint: ws://localhost:" + port);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
