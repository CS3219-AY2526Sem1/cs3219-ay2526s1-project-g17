import http from "http";
import index from "./index.js";
// import { connectToDB } from "./model/repository.js";
import { WebSocketServer } from "ws";
import { randomUUID } from "crypto";
import {
  sendMatchNotification,
  sendMessage,
  sendSessionToUser,
} from "./utility/ws_util.js";
import {
  initializeRedis,
  listenToRequestChanges,
  redisRepository,
} from "./model/redis_integration.js";
import {} from "./types.js";

/** @typedef {import("./types.js").MatchRequest} MatchRequest */
/** @typedef {import("./types.js").MatchPair} MatchPair */
/** @typedef {import("./types.js").UserInstance} UserInstance */
/** @typedef {import("./types.js").MatchAck} MatchAck */
/** @typedef {import("./types.js").Message} Message */
/** @typedef {import("./types.js").Criteria} Criteria */
/** @typedef {import("./types.js").AcceptanceTimeoutNotification} AcceptanceTimeoutNotification */

const port = process.env.PORT || 3001;

const server = http.createServer(index);
const wss = new WebSocketServer({ server, clientTracking: true });
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

/** @type {Map<string, UserInstance>} */
const userConnections = new Map();
/** @type {Map<string, MatchPair>} */
const matchedPairTable = new Map();
/** @type {Map<string, Function>} */
const unsubscriptions = new Map();

wss.on("connection", (ws, request) => {
  console.log("New WebSocket connection");
  /** @type {UserInstance} */
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

    /** @type {Array<[string, Criteria[]]>} */
    const matchedRequest = [];

    const userRequests = await redisRepository.getAllUserRequests();
    for (const [k, v] of userRequests.entries()) {
      if (hasMatchingCriteria(data.criterias, v.criterias)) {
        matchedRequest.push([k, v.criterias]);
      }
    }
    if (matchedRequest.length !== 0) {
      matchedRequest.sort();

      /** @type {[string, Criteria[]] | undefined} */
      const other = matchedRequest.at(0);
      if (!other) {
        throw new Error("No matching found");
      }
      const [otherUUID, otherCriterias] = other;
      const otherConnection = userConnections.get(otherUUID);
      const criteria = findMatchingCriteria(data.criterias, otherCriterias);

      if (criteria && otherConnection) {
        await redisRepository.storeMatchedPair(otherUUID, ws.id);
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
      await redisRepository.storeUserRequest(ws.id, data);
      const unSub = listenToRequestChanges(
        ws.id,
        ({ key, operation, timestamp }) => {
          if (operation === "set") {
            // get the request
            // check the current status
            // if waiting then search for matching criteria
            // if pending, get from the matched key and send match found noti
            // pending then?
            // matched
            // should get the session and send to user
            // del the request
          } else if (operation === "del" || operation === "expired") {
            // should close websocket
            const userInstance = userConnections.get(key);
            if (userInstance) {
              userInstance.ws.close();
            }

            const unSub = unsubscriptions.get(ws.id);
            if (unSub) {
              unSub();
            }
          } else {
            console.log("Unknown/unaccounted opeation", operation);
          }
        }
      );
      unsubscriptions.set(ws.id, unSub);
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
 * @param {string} uuid1
 * @param {string} uuid2
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
 * @param {string} uuid1
 * @param {string} uuid2
 */
async function updateMatchedPairTable(uuid1, uuid2) {
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
