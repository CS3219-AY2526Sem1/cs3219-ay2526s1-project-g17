import http from "http";
import index from "./index.js";
import { connectToDB } from "./model/repository.js";
import { configDotenv } from "dotenv";
import { WebSocketServer } from "ws";
import { randomUUID } from "crypto";
import { sendMessage } from "./utility/ws_util.js";
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
 * @typedef {Object} MatchRequest
 * @property {"matchRequest"} typename
 * @property {Array<Criteria>} [criterias]
 * @property {number} time
 */

/**
 * @typedef {Object} MatchAck
 * @property {"matchAck"} typename
 * @property {"accept" | "reject"} response
 */

/**
 * @typedef {import("crypto").UUID} UUID;
 */

/**
 * @typedef {Object} MatchPair
 * @property {UUID} partner
 * @property {bool} accepted
 */

/**
 * @typedef {Object} AcceptanceTimeoutNotification
 * @property {String} reason
 */

/** @type {Map<UUID, MatchRequest>} */
const userRequests = new Map();
const userConnections = new Map();
/** @type {Map<UUID, MatchPair>} */
const matchedPairTable = new Map();

wss.on("connection", (ws, request) => {
  console.log("New WebSocket connection");
  ws.id = randomUUID();

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);
      console.log("Received message", data);
      await handleMessage(ws, data);
    } catch (error) {
      console.error("Error while parsing or handling message", error);
      ws.send(
        JSON.stringify({ type: "error", message: "Invalid JSON", e: error })
      );
    }
  });

  ws.on("close", async () => {
    await handleDisconnect(ws.id);
  });
});

/**
 * @param {Message} message
 * @param {WebSocket} ws
 */
async function handleMessage(ws, message) {
  switch (message.typename) {
    case "matchRequest":
      /** @type {MatchRequest} */
      message;
      message["time"] = Date.now();
      await handleMatchRequest(ws, message);
      break;
    case "matchAck":
      /** @type {MatchAck} */
      message;
      switch (message.response) {
        case "accept":
          matchAcceptHandler(ws);
          break;
        case "reject":
          // TODO: user reject should short circuit the wait
          break;
      }
      break;
    default:
      sendMessage(ws, { message: "Invalid request typename" });
  }
}

/**
 * @param {WebSocket} ws
 */
async function matchAcceptHandler(ws) {
  const p = matchedPairTable.get(ws.id);
  p.accepted = true;
  console.log(matchedPairTable.get(ws.id));

  console.log(`${ws.id} has accepted`);
}

async function handleDisconnect(id) {
  userConnections.delete(id);
  // await cancelMatch(id);
}

/**
 * @param {WebSocket} ws
 * @param {MatchRequest} data
 */
async function handleMatchRequest(ws, data) {
  try {
    userConnections.set(ws.id, ws);
    /** @type {Array<[UUID, Criteria[]]>} */
    const matchedRequest = [];
    console.log("data", data);
    for (const [k, v] of userRequests.entries()) {
      console.log("v", v);
      if (hasMatchingCriteria(data.criterias, v.criterias)) {
        matchedRequest.push([k, v.criterias]);
      }
    }
    if (matchedRequest.length !== 0) {
      matchedRequest.sort((a, b) => a - b);
      /** @type {[UUID, Criteria[]]} */
      const [otherUUID, otherCriterias] = matchedRequest.at(0);
      const criteria = findMatchingCriteria(data.criterias, otherCriterias);
      updateMatchedPairTable(otherUUID, ws.id);
      sendMatchNotification(ws, criteria);
      /**@type {WebSocket} */
      const otherConnection = userConnections.get(otherUUID);
      sendMatchNotification(otherConnection, criteria);
      sendMessage(ws, { message: "match found notification sent" });

      // timeout will determine if both are accepted
      setTimeout(async () => {
        const userAccepts = matchedPairTable.get(ws.id).accepted;
        const otherAccepts = matchedPairTable.get(otherUUID).accepted;
        const shouldCreateSession = userAccepts && otherAccepts;
        if (shouldCreateSession) {
          const session = await getCollaborationSession();
          sendMessage(ws, { type: "matchOutcome", session: session });
          sendMessage(otherConnection, {
            type: "matchOutcome",
            session: session,
          });
        } else {
          // Sends notification
          sendAcceptanceTimeoutNotification(ws);
          sendAcceptanceTimeoutNotification(otherConnection);

          // clear match pair table
          clearMatchedPairTable(ws.id, otherConnection);

          // disconnect from matching for non-accepting user
          if (!userAccepts) {
            ws.close();
          }
          if (!otherAccepts) {
            otherConnection.close();
          }
        }
      }, process.env.ACCEPTANCE_TIMEOUT);
    } else {
      userRequests.set(ws.id, data);
      // await storeMatchRequest(ws.id, "waiting", data.criterias);
      sendMessage(ws, { message: "client request processed" });
    }
  } catch (error) {
    console.error("Error while handling match request", error);
  }
}

/**
 * @param {WebSocket} ws
 */
function sendAcceptanceTimeoutNotification(ws) {
  /**@type {AcceptanceTimeoutNotification} */
  const notification = {
    reason: "one of the user never accepts within time limit",
  };
  sendMessage(ws, notification);
  console.log(`${ws.id} did not accept`);
}

/**
 * @param {UUID} uuid1
 * @param {UUID} uuid2
 */
function clearMatchedPairTable(uuid1, uuid2) {
  matchedPairTable.delete(uuid1);
  matchedPairTable.delete(uuid2);
  console.log("Delete matchedPairTable for:\n", uuid1, "\n", uuid2);
}

/**
 *
 */
async function getCollaborationSession() {
  return "Some random session";
}

/**
 * @param {UUID} uuid1
 * @param {UUID} uuid2
 */
function updateMatchedPairTable(uuid1, uuid2) {
  matchedPairTable.set(uuid1, {
    partner: uuid2,
    accepted: false,
  });
  matchedPairTable.set(uuid2, {
    partner: uuid1,
    accepted: false,
  });
  console.log("Update matchedPairTable for:\n", uuid1, "\n", uuid2);
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
 * @param {WebSocket} ws
 * @param {Criteria} criteria
 */
function sendMatchNotification(ws, criteria) {
  sendMessage(ws, {
    type: "matchFound",
    details: criteria,
  });
}

/**
 * @param {Array<Criteria>} criterias
 * @param {Array<Criteria>} otherCriterias
 * @returns {boolean}
 */
function hasMatchingCriteria(criterias, otherCriterias) {
  const totalLength = criterias.length + otherCriterias.length;
  console.log("otherCriterias", otherCriterias);
  const serializedCriterias = criterias.map((c) => JSON.stringify(c));
  const serializedOtherCriterias = otherCriterias.map((c) => JSON.stringify(c));

  const appendCriteria = [...serializedCriterias, ...serializedOtherCriterias];
  const set = new Set(appendCriteria);
  return set.size !== totalLength;
}

await connectToDB()
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
