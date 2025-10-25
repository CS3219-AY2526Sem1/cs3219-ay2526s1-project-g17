/** @typedef {import("ws").WebSocket} WebSocket*/
/** @typedef {import("socket.io").Socket} SocketIOSocket*/

/**
 * @param {SocketIOSocket} ws
 * @param {Object} jsonObject
 */
export function sendMessage(ws, jsonObject) {
  ws.emit("message", jsonObject);
}

/**
 * @param {SocketIOSocket} socket
 * @param {string} eventName
 * @param {Object} data
 * @param {Function} [callback]
 */
export function emitToSocket(socket, eventName, data, callback) {
  if (callback) {
    socket.emit(eventName, data, callback);
  } else {
    socket.emit(eventName, data);
  }
}

/**
 * @param {import("socket.io").Server} io
 * @param {string} room
 * @param {string} eventName
 * @param {Object} data
 */
export function emitToRoom(io, room, eventName, data) {
  io.to(room).emit(eventName, data);
}
