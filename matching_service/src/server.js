import http from "http";
import index from "./index.js";
import { Server } from "socket.io";
import {} from "./types.js";
import { MatchingService } from "./service/matching_service.js";
import { initializeRedis } from "./model/redis_integration.js";

import { MatchRequestService } from "./service/match_request_service.js";
import { MatchedDetailsService } from "./service/matched_details_service.js";
import { CollaborationService } from "./service/collaboration_service.js";

/** @typedef {import("./types.js").MatchRequest} MatchRequest */
/** @typedef {import("./types.js").UserInstance} UserInstance */
/** @typedef {import("./types.js").Criteria} Criteria */
/** @typedef {import("./types.js").UserMessage} UserMessage */
/** @typedef {import("./types.js").MatchCancelRequest} MatchCancelRequest */

const port = process.env.PORT || 3001;

const server = http.createServer(index);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

export const redisRepository = await initializeRedis();

// AI Generated Block =================
console.log("=== Environment Configuration ===");
console.log("NODE_ENV:", process.env.NODE_ENV || "not set");
console.log("ENV:", process.env.ENV || "not set");
console.log("PORT:", process.env.PORT || "not set");
console.log("REDIS_URL:", process.env.REDIS_URL ? "✓ Set" : "✗ Not set");
console.log("AUTH0_DOMAIN:", process.env.AUTH0_DOMAIN ? "✓ Set" : "✗ Not set");
console.log(
  "AUTH0_AUDIENCE:",
  process.env.AUTH0_AUDIENCE ? "✓ Set" : "✗ Not set"
);
console.log("ACCEPTANCE_TIMEOUT:", process.env.ACCEPTANCE_TIMEOUT || "not set");
console.log("=====================================");
//======================================

try {
  // await redisRepository.flushAll();
  server.listen(port);
  console.log("Matching service server listening on http://localhost:" + port);
} catch (err) {
  console.error("Failed to connect to DB");
  console.error(err);
  process.exit(1);
}

export const matchRequestService = new MatchRequestService(
  redisRepository.client,
  redisRepository.subscriber
);
export const matchedDetailsService = new MatchedDetailsService(
  redisRepository.client
);
export const collaborationService = new CollaborationService(
  redisRepository.client
);
export const matchingService = new MatchingService(
  redisRepository,
  matchRequestService,
  matchedDetailsService,
  collaborationService
);
await matchingService.initializeSessionStreams();

process.on("SIGINT", () => {
  server.close(async () => {
    if (redisRepository) await redisRepository.disconnect();
  });
});

// AI changed from ws to socket.io
io.on("connection", (socket) => {
  const userId = Array.isArray(socket.handshake.query.userId)
    ? socket.handshake.query.userId[0]
    : socket.handshake.query.userId;

  console.log("Socket.IO userId:", userId);
  /** @type {UserInstance} */
  const userInstance = { id: userId, ws: socket };
  console.log("New Socket.IO connection");

  socket.join(`user:${userId}`);

  socket.on("match-request", async (data, callback) => {
    try {
      /** @type {MatchRequest} */
      data.time = Date.now();
      await matchingService.addRequest(userInstance, data);

      if (callback && typeof callback === "function") {
        callback({
          type: "ack",
          requestId: data.requestId,
          success: true,
        });
      }
    } catch (error) {
      console.error("Error handling match-request:", error);
      if (callback && typeof callback === "function") {
        callback({
          type: "error",
          requestId: data.requestId,
          success: false,
          message: "Failed to process match request",
          error: error.message,
        });
      }
    }
  });

  socket.on("disconnect", async (reason) => {
    console.log("Socket.IO disconnect event, reason:", reason);
    switch (reason) {
      case "transport error":
      case "transport close":
      case "parse error":
      case "ping timeout":
        break;

      case "forced close":
      case "server shutting down":
      case "forced server close":
      case "client namespace disconnect":
      case "server namespace disconnect":
        await matchingService.disposeUser(userInstance.id);
        break;
    }
  });

  socket.on("error", (error) => {
    console.error("Socket.IO error:", error);
  });
});
