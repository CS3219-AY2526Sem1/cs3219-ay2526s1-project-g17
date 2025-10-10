import http from "http";
import index from "./index.js";
import { WebSocketServer } from "ws";
import { randomUUID } from "crypto";
import {
  sendMessage,
} from "./utility/ws_util.js";
import {
  initializeRedis,
} from "./model/redis_integration.js";
import {} from "./types.js";
import { MatchingService } from "./service/matching_service.js";

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
await initializeRedis()
  .then(() => {
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
  console.log("New WebSocket connection");
  /** @type {UserInstance} */
  const userInstance = { id: randomUUID(), ws: ws };

  ws.on("message", async (message) => {
    try {
      // @ts-ignore
      const data = JSON.parse(message);
      console.log("Received message", data);
      await handleMessage(userInstance, data);
    } catch (error) {
      console.error("Error while parsing or handling message", error);
      ws.send(
        JSON.stringify({ type: "error", message: "Invalid JSON", e: error })
      );
    }
  });

  ws.on("close", async () => {});
});

/**
 * @param {Message} message
 * @param {UserInstance} userInstance
 */
async function handleMessage(userInstance, message) {
  switch (message.typename) {
    case "matchRequest":
      /** @type {MatchRequest} */
      message;
      message["time"] = Date.now();
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
