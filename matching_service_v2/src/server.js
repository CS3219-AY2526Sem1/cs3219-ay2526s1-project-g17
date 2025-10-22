import http from "http";
import index from "./index.js";
import { WebSocketServer } from "ws";
import {} from "./types.js";
import { MatchingService } from "./service/matching_service.js";
import { initializeRedis } from "./model/redis_integration.js";

import { randomUUID } from "crypto";
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
const wss = new WebSocketServer({ server, clientTracking: true });

export const redisRepository = await initializeRedis();

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

process.on("SIGINT", () => {
  server.close(async () => {
    if (redisRepository) await redisRepository.disconnect();
  });
});

wss.on("connection", (ws, request) => {
  const urlObj = new URL(request.url, `http://${request.headers.host}`);
  const userId = urlObj.searchParams.get("userId");

  console.log("WebSocket userId:", userId);
  /** @type {UserInstance} */
  const userInstance = { id: userId, ws: ws };
  console.log("New WebSocket connection");

  ws.on("message", async (message) => {
    try {
      /** @type {UserMessage} */
      // @ts-ignore
      const data = JSON.parse(message);
      console.log("Received message", data);
      switch (data.type) {
        case "match-request":
          {
            /** @type {MatchRequest} */
            data;
            data.time = Date.now();
            await matchingService.addRequest(userInstance, data);
          }
          break;
        case "match-cancel":
          console.log("match cancelled by user");
          ws.close();
          break;
        default:
          console.log("unaccounted type", data);
          break;
      }
    } catch (error) {
      console.error("Error while parsing or handling message", message, error);
      ws.send(
        JSON.stringify({ type: "error", message: "Invalid JSON", e: error })
      );
    }
  });

  ws.on("close", async () => {
    console.log("On webserver close event");
    await matchingService.disposeUser(userInstance.id);
  });

  ws.on("error", (e) => {
    console.error(e);
  });
});
