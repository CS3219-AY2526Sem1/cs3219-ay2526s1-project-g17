/**
 * @param {WebSocket} ws
 * @param {Object} jsonObject
 */
export function sendMessage(ws, jsonObject) {
  ws.send(JSON.stringify(jsonObject));
}
