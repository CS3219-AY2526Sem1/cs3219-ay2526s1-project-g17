/** @typedef {import("../types").MatchRequest} MatchRequest */
/** @typedef {import("../types").MessageToServer} MessageToServer */
/** @typedef {import("../types").Notification} Notification */
/** @typedef {import("../types").CollaborationSessionNotification} CollaborationSessionNotification */
/** @typedef {import("../types").Criteria} Criteria */
/** @typedef {import("../types").MatchFoundNotification} MatchFoundNotification */

import axios from "axios";

const WS_URL = "ws://localhost:3001";

/**
 * WebSocket connection manager
 */
class MatchingWebSocketService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.messageHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.manualDisconnect = false;
  }

  /**
   * Connect to the WebSocket server
   * @returns {Promise<void>}
   */
  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
          console.log("WebSocket connected");
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log(message);
            this.handleMessage(message);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        this.ws.onclose = () => {
          console.log("WebSocket disconnected");
          this.isConnected = false;
          if (!this.manualDisconnect) {
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Attempt to reconnect to the WebSocket server
   */
  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );
      setTimeout(() => {
        this.connect().catch(() => {
          // Will try again if this fails
        });
      }, 2000 * this.reconnectAttempts); // Exponential backoff
    }
  }

  /**
   * Send a message through the WebSocket
   * @param {MessageToServer} message
   */
  sendMessage(message) {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new Error("WebSocket not connected");
    }
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
    console.log(messageType);
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
   * Disconnect from the WebSocket
   */
  disconnect() {
    this.manualDisconnect = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }
}

// Create a singleton instance
const wsService = new MatchingWebSocketService();

/**
 * Get the WebSocket service instance
 * @returns {MatchingWebSocketService}
 */
export const getWebSocketService = () => wsService;

/**
 * Fetches available topics from the server
 * Currently returns dummy data as the backend endpoint is not implemented
 * @returns {Promise<string[]>} Array of topic strings
 */
export const fetchTopics = async () => {
  try {
    const res = await axios.get("http://localhost:5001/api/questions/topics");
    return res.data;
  } catch (error) {
    console.error("Error fetching questions: ", error);
    throw error;
  }
};

/**
 * Submits a matching request via WebSocket
 * @param {MatchRequest} matchRequest - The matching request object
 * @returns {Promise<Object>} Server response
 */
export const submitMatchRequestViaWebSocket = async (matchRequest) => {
  try {
    // Ensure WebSocket connection is established
    if (!wsService.isConnected) {
      await wsService.connect();
    }

    // Send the match request
    wsService.sendMessage(matchRequest);

    return {
      success: true,
      message: "Match request sent via WebSocket",
      requestId: Math.random().toString(36).substring(2, 9),
    };
  } catch (error) {
    console.error("Error sending match request via WebSocket:", error);
    throw new Error("Failed to send match request via WebSocket");
  }
};

/**
 * Cancel a matching request via WebSocket
 * @param {string} requestId - The request ID to cancel
 * @returns {Promise<void>}
 */
export const cancelMatchRequest = async (requestId) => {
  try {
    if (!wsService.isConnected) {
      throw new Error("WebSocket not connected");
    }

    wsService.sendMessage({
      type: "match-cancel",
      requestId: requestId,
      time: Date.now(),
    });
  } catch (error) {
    console.error("Error cancelling match request:", error);
    throw error;
  }
};

/**
 * Accept a match via WebSocket
 * @returns {Promise<void>}
 */
export const acceptMatch = async () => {
  try {
    if (!wsService.isConnected) {
      throw new Error("WebSocket not connected");
    }

    wsService.sendMessage({
      type: "matchFoundResponse",
      response: "accept",
    });
  } catch (error) {
    console.error("Error accepting match:", error);
    throw error;
  }
};

/**
 * Reject a match via WebSocket
 * @param {string} matchId - The match ID to reject
 * @returns {Promise<void>}
 */
export const rejectMatch = async () => {
  try {
    if (!wsService.isConnected) {
      throw new Error("WebSocket not connected");
    }

    wsService.sendMessage({
      type: "matchFoundResponse",
      response: "reject",
    });
  } catch (error) {
    console.error("Error rejecting match:", error);
    throw error;
  }
};
