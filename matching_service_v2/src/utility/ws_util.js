/** @typedef {import("ws").WebSocket} WebSocket*/

/**
 * @param {WebSocket} ws
 * @param {Object} jsonObject
 */
export function sendMessage(ws, jsonObject) {
  ws.send(JSON.stringify(jsonObject));
}

/**
 * Sends match found notification to client with criteria as details
 * @param {WebSocket} ws
 * @param {import("../server").Criteria} criteria
 */
export function sendMatchNotification(ws, criteria) {
  sendMessage(ws, {
    type: "matchFound",
    details: criteria,
  });
}

/**
 * @param {import("../server").UserInstance} instance
 * @param {string} session
 */
export function sendSessionToUser(instance, session) {
  sendMessage(instance.ws, { type: "matchOutcome", session: session });
  console.log("Session sent to ", instance.id);
}
