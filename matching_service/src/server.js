import http from "http";
import index from "./index.js";
import { WebSocketServer } from "ws";
import { sendMessage } from "./utility/ws_util.js";
import {} from "./types.js";
import { MatchingService } from "./service/matching_service.js";
import { initializeRedis } from "./model/redis_integration.js";
import redisRepository from "./model/redis_repository.js";
import { randomUUID } from "crypto";

/** @typedef {import("./types.js").MatchRequest} MatchRequest */
/** @typedef {import("./types.js").UserInstance} UserInstance */
/** @typedef {import("./types.js").MatchAck} MatchAck */
/** @typedef {import("./types.js").Message} Message */
/** @typedef {import("./types.js").Criteria} Criteria */
/** @typedef {import("./types.js").AcceptanceTimeoutNotification} AcceptanceTimeoutNotification */

const port = process.env.PORT || 3001;

const server = http.createServer(index);
const wss = new WebSocketServer({ server, clientTracking: true });
const matchingService = new MatchingService();
process.on("SIGINT", () => {
  server.close(async () => {
    await redisRepository.disconnect();
  });
});
await initializeRedis()
  .then(async () => {
    await redisRepository.flushAll();
    server.listen(port);
    console.log(
      "Matching service server listening on http://localhost:" + port
    );
  })
  .catch((err) => {
    console.error("Failed to connect to DB");
    console.error(err);
    process.exit(1);
  });

wss.on("connection", (ws, request) => {
  // const url = new URL(request.url, `http://${request.headers.host}`);
  // const userId = url.searchParams.get("userId");
  // console.log("New WebSocket connection");
  // /** @type {UserInstance} */
  // const userInstance = { id: userId, ws: ws };

  /** @type {UserInstance} */
  const userInstance = { id: randomUUID(), ws: ws };
  console.log("New WebSocket connection");

  ws.on("message", async (message) => {
    try {
      // @ts-ignore
      const data = JSON.parse(message);
      console.log("Received message", data);
      await handleMessage(userInstance, data);
    } catch (error) {
      console.error("Error while parsing or handling message", message, error);
      ws.send(
        JSON.stringify({ type: "error", message: "Invalid JSON", e: error })
      );
    }
  });

  ws.on("close", async () => {
    await matchingService.disposeUser(userInstance.id);
  });

  ws.on("error", (e) => {
    console.error(e);
  });
});

/**
 * @param {Message} message
 * @param {UserInstance} userInstance
 */
async function handleMessage(userInstance, message) {
  switch (message.type) {
    case "matchRequest":
      /** @type {MatchRequest} */
      message;
      message.time = Date.now();
      await matchingService.addRequest(userInstance, message);
      break;
    case "matchAck":
      /** @type {MatchAck} */
      message;
      switch (message.response) {
        case "accept":
          await matchingService.handleUserAccept(userInstance);
          break;
        case "reject":
          // TODO: user reject should short circuit the wait
          break;
      }
      break;
    default:
      sendMessage(userInstance.ws, { message: "Invalid request typename" });
  }
}
