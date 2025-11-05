/** @typedef {import("../types").MatchRequest} MatchRequest */
/** @typedef {import("../types").MessageToServer} MessageToServer */
/** @typedef {import("../types").Notification} Notification */
/** @typedef {import("../types").Criteria} Criteria */
/** @typedef {import("../types").MatchFoundNotification} MatchFoundNotification */

import axios from "axios";
import { io } from "socket.io-client";
import { MATCHING_SERVICE_URL, QUESTION_SERVICE_URL } from "../constants";

const WS_URL = MATCHING_SERVICE_URL;

/**
 * Socket.IO connection manager
 */
class MatchingSocketIOService {
  constructor() {
    this.socket = null;
    this.messageHandlers = new Map();
    this.userId = null;
  }

  isConnected() {
    if (this.socket) {
      return this.socket.connected;
    } else {
      return false;
    }
  }
  /**
   * Connect to the Socket.IO server
   * @param {string} userId
   * @returns {Promise<void>}
   */
  connect(userId) {
    return new Promise((resolve, reject) => {
      try {
        this.userId = userId;

        // Create Socket.IO connection with query parameters
        this.socket = io(WS_URL, {
          query: { userId },
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 2000,
          reconnectionDelayMax: 10000,
          timeout: 10000,
        });

        this.socket.on("connect", () => {
          console.log("Socket.IO connected");
          resolve();
        });

        this.socket.on("message", (message) => {
          console.log("Received message:", message);
          this.handleMessage(message);
        });

        this.socket.on("match-found", (data) => {
          console.log("Match found:", data);
          this.handleMessage({ type: "match-found", ...data });
        });

        this.socket.on("disconnect", (reason) => {
          console.log("Socket.IO disconnected:", reason);
        });

        this.socket.on("connect_error", (error) => {
          console.error("Socket.IO connection error:", error);
          reject(error);
        });

        this.socket.on("error", (error) => {
          console.error("Socket.IO error:", error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send a message through Socket.IO with acknowledgment
   * @param {string} eventName
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  sendMessage(eventName, data) {
    return new Promise((resolve, reject) => {
      if (this.socket.connected && this.socket) {
        this.socket.emit(eventName, data, (response) => {
          if (response && response.success) {
            resolve(response);
          } else {
            reject(new Error(response?.message || "Message failed"));
          }
        });
      } else {
        reject(new Error("Socket.IO not connected"));
      }
    });
  }

  /**
   * @param {Notification} message
   */
  handleMessage(message) {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    }
  }

  /**
   * Register a message handler
   * @param {string} messageType
   * @param {Function} handler
   */
  onMessage(messageType, handler) {
    console.log("Registering handler for:", messageType);
    this.messageHandlers.set(messageType, handler);
  }

  /**
   * Remove a message handler
   * @param {string} messageType
   */
  removeMessageHandler(messageType) {
    this.messageHandlers.delete(messageType);
  }

  /**
   * Disconnect from Socket.IO
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Check if socket is connected
   * @returns {boolean}
   */
  isSocketConnected() {
    return this.socket && this.socket.connected;
  }
}

// Create a singleton instance
const socketService = new MatchingSocketIOService();

/**
 * Get the Socket.IO service instance
 * @returns {MatchingSocketIOService}
 */
export const getWebSocketService = () => socketService;

/**
 * Fetches available topics from the server
 * @returns {Promise<string[]>} Array of topic strings
 */
export const fetchTopics = async () => {
  try {
    console.log(QUESTION_SERVICE_URL);
    const res = await axios.get(`${QUESTION_SERVICE_URL}/topics`);
    return res.data;
  } catch (error) {
    console.error("Error fetching questions: ", error);
    throw error;
  }
};

/**
 * Submits a matching request via Socket.IO
 * @param {string} userId
 * @param {MatchRequest} matchRequest - The matching request object
 * @returns {Promise<Object>} Server response
 */
export async function submitMatchRequestViaWebSocket(userId, matchRequest) {
  try {
    // Ensure Socket.IO connection is established
    if (!socketService.isConnected()) {
      await socketService.connect(userId);
    }

    // Send the match request with acknowledgment
    const response = await socketService.sendMessage(
      "match-request",
      matchRequest
    );

    return {
      success: true,
      message: "Match request sent via Socket.IO",
      requestId: matchRequest.requestId,
      response: response,
    };
  } catch (error) {
    console.error("Error sending match request via Socket.IO:", error);
    throw new Error(
      "Failed to send match request via Socket.IO: " + error.message
    );
  }
}
