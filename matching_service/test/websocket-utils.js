import { randomUUID } from "crypto";
import WebSocket from "ws";

// AI Generated File

/** @typedef {import("../src/types.js").MatchRequest} MatchRequest */
/** @typedef {import("../src/types.js").UserInstance} UserInstance */
/** @typedef {import("../src/types.js").Criteria} Criteria */

const WS_URL = "ws://localhost:3001";
const CONNECTION_TIMEOUT = 10000;
const MESSAGE_TIMEOUT = 10000;

/**
 * Helper function to create a WebSocket client with promise-based connection
 * @param {string} url - WebSocket URL
 * @returns {Promise<WebSocket>} Connected WebSocket client
 */
function createWebSocketClient(url = WS_URL) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timeout = setTimeout(() => {
      reject(new Error("Connection timeout"));
    }, CONNECTION_TIMEOUT);

    ws.on("open", () => {
      clearTimeout(timeout);
      resolve(ws);
    });

    ws.on("error", (error) => {
      console.log("error while creating web socket", error);
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Helper function to wait for a specific message type
 * @param {WebSocket} ws - WebSocket client
 * @param {string} messageType - Expected message type
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Object>} Parsed message
 */
function waitForMessage(ws, messageType, timeout = MESSAGE_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout waiting for message type: ${messageType}`));
    }, timeout);

    const messageHandler = (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === messageType || message.typename === messageType) {
          clearTimeout(timeoutId);
          ws.removeListener("message", messageHandler);
          resolve(message);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        ws.removeListener("message", messageHandler);
        reject(error);
      }
    };

    ws.on("message", messageHandler);
  });
}

/**
 * Helper function to create a match request
 * @param {Criteria} criteria - Matching criteria
 * @returns {MatchRequest} Match request object
 */
function createMatchRequest(criteria) {
  return {
    requestId: "dsfg",
    userId: randomUUID(),
    type: "match-request",
    criterias: [criteria],
    time: Date.now(),
  };
}


/**
 * Helper function to close WebSocket clients safely
 * @param {...WebSocket} clients - WebSocket clients to close
 */
function closeClients(...clients) {
  clients.forEach((client) => {
    if (client && client.readyState === WebSocket.OPEN) {
      client.close();
    }
  });
}

/**
 * Helper function to send JSON message
 * @param {WebSocket} ws - WebSocket client
 * @param {Object} message - Message to send
 */
function sendMessage(ws, message) {
  ws.send(JSON.stringify(message));
}

export {
  createWebSocketClient,
  waitForMessage,
  createMatchRequest,
  closeClients,
  sendMessage,
  WS_URL,
  CONNECTION_TIMEOUT,
  MESSAGE_TIMEOUT,
};
