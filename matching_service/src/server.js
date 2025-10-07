import http from "http";
import index from "./index.js";
import { connectToDB } from "./model/repository.js";
import { WebSocketServer } from "ws";
import { randomUUID } from "crypto";
import {
  sendMatchNotification,
  sendMessage,
  sendSessionToUser,
} from "./utility/ws_util.js";

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
 * @property {UUID} id
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
 * @typedef {import("crypto").UUID} UUID;
 */

/**
 * @typedef {Object} MatchPair
 * @property {UUID} partner
 * @property {boolean} accepted
 */

/**
 * @typedef {Object} AcceptanceTimeoutNotification
 * @property {String} reason
 */

/** @type {Map<UUID, MatchRequest>} */
const userRequests = new Map();
/** @type {Map<UUID, UserInstance>} */
const userConnections = new Map();
/** @type {Map<UUID, MatchPair>} */
const matchedPairTable = new Map();

wss.on("connection", (ws, request) => {
  console.log("New WebSocket connection");
  /** @type {UserInstance} */
  // @ts-ignore
  const userInstance = { id: randomUUID(), ws: ws };

  ws.on("message", async (message) => {
    try {
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

  ws.on("close", async () => {
    await handleDisconnect(userInstance);
  });
});

/**
 * @param {Message} message
 * @param {UserInstance} ws
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
      sendMessage(ws.ws, { message: "Invalid request typename" });
  }
}

/**
 * @param {UserInstance} ws
 */
async function matchAcceptHandler(ws) {
  const p = matchedPairTable.get(ws.id);
  if (!p) {
    throw new Error("No match entry for " + ws.id);
  }
  p.accepted = true;
  console.log(matchedPairTable.get(ws.id));

  console.log(`${ws.id} has accepted`);
}

/**
 * @param {UserInstance} userInstance
 */
async function handleDisconnect(userInstance) {
  userConnections.delete(userInstance.id);
  // await cancelMatch(id);
}

/**
 * @param {UserInstance} ws
 * @param {MatchRequest} data
 */
async function handleMatchRequest(ws, data) {
  try {
    userConnections.set(ws.id, ws);
    /** @type {Array<[UUID, Criteria[]]>} */
    const matchedRequest = [];
    for (const [k, v] of userRequests.entries()) {
      if (hasMatchingCriteria(data.criterias, v.criterias)) {
        matchedRequest.push([k, v.criterias]);
      }
    }
    if (matchedRequest.length !== 0) {
      matchedRequest.sort();

      /** @type {[UUID, Criteria[]] | undefined} */
      const other = matchedRequest.at(0);
      if (!other) {
        throw new Error("No matching found");
      }
      const [otherUUID, otherCriterias] = other;
      const otherConnection = userConnections.get(otherUUID);
      const criteria = findMatchingCriteria(data.criterias, otherCriterias);

      if (criteria && otherConnection) {
        updateMatchedPairTable(otherUUID, ws.id);
        sendMatchNotification(ws.ws, criteria);
        /**@type {WebSocket} */

        sendMatchNotification(otherConnection.ws, criteria);
        sendMessage(ws.ws, { message: "match found notification sent" });

        // timeout will determine if both are accepted
        setTimeout(async () => {
          const userEntry = matchedPairTable.get(ws.id);
          const otherEntry = matchedPairTable.get(otherUUID);
          if (!userEntry || !otherEntry) {
            return;
          }
          const userAccepts = userEntry.accepted;
          const otherAccepts = otherEntry.accepted;
          const shouldCreateSession = userAccepts && otherAccepts;
          if (shouldCreateSession) {
            const session = await getCollaborationSession();
            sendSessionToUser(ws, session);
            sendSessionToUser(otherConnection, session);
          } else {
            // Sends notification
            sendAcceptanceTimeoutNotification(ws);
            sendAcceptanceTimeoutNotification(otherConnection);

            // clear match pair table
            clearMatchedPairTable(ws.id, otherConnection.id);

            // disconnect from matching for non-accepting user
            if (!userAccepts) {
              ws.ws.close();
            }
            if (!otherAccepts) {
              otherConnection.ws.close();
            }
          }
        }, Number(process.env.ACCEPTANCE_TIMEOUT));
      }
    } else {
      userRequests.set(ws.id, data);
      // await storeMatchRequest(ws.id, "waiting", data.criterias);
      sendMessage(ws.ws, { message: "client request processed" });
    }
  } catch (error) {
    console.error("Error while handling match request", error);
  }
}

/**
 * @param {UserInstance} ws
 */
function sendAcceptanceTimeoutNotification(ws) {
  /**@type {AcceptanceTimeoutNotification} */
  const notification = {
    reason: "one of the user never accepts within time limit",
  };
  sendMessage(ws.ws, notification);
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
