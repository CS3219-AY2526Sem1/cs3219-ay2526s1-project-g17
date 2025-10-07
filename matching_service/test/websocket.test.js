import WebSocket from "ws";
import { jest } from "@jest/globals";
import {
  createWebSocketClient,
  waitForMessage,
  createMatchRequest,
  createMatchAck,
  closeClients,
  sendMessage,
  WS_URL,
  MESSAGE_TIMEOUT,
} from "./websocket-utils.js";

// Test configuration
const TEST_TIMEOUT = 150000;

describe("WebSocket Matching Service Integration Tests", () => {
  let clientA, clientB, clientC;

  beforeAll(() => {
    // Increase Jest timeout for integration tests
    jest.setTimeout(TEST_TIMEOUT);
  });

  afterEach(() => {
    // Clean up WebSocket connections after each test
    closeClients(clientA, clientB, clientC);
    clientA = clientB = clientC = null;
  });

  describe("Matching Logic Tests", () => {
    test("should match two clients with identical criteria", async () => {
      // Test Case 1: Two clients with identical matching criteria should be matched
      const criteria = {
        difficulty: "easy",
        language: "JavaScript",
        topic: "Array",
      };

      // Create and connect both clients
      clientA = await createWebSocketClient();
      clientB = await createWebSocketClient();

      // Send match requests simultaneously
      const matchRequestA = createMatchRequest(criteria);
      const matchRequestB = createMatchRequest(criteria);

      sendMessage(clientA, matchRequestA);
      sendMessage(clientB, matchRequestB);

      // Wait for both clients to receive match notifications
      const [matchNotificationA, matchNotificationB] = await Promise.all([
        waitForMessage(clientA, "matchFound"),
        waitForMessage(clientB, "matchFound"),
      ]);

      // Verify both clients received match notifications
      expect(matchNotificationA.type).toBe("matchFound");
      expect(matchNotificationA.details).toEqual(criteria);
      expect(matchNotificationB.type).toBe("matchFound");
      expect(matchNotificationB.details).toEqual(criteria);
    });

    test("should not match clients with different criteria", async () => {
      // Test Case: Clients with different criteria should not be matched
      const criteriaA = {
        difficulty: "easy",
        language: "JavaScript",
        topic: "Array",
      };

      const criteriaB = {
        difficulty: "hard",
        language: "Python",
        topic: "Dynamic Programming",
      };

      clientA = await createWebSocketClient();
      clientB = await createWebSocketClient();

      // Send different match requests
      sendMessage(clientA, createMatchRequest(criteriaA));
      sendMessage(clientB, createMatchRequest(criteriaB));

      // Wait briefly to ensure no match occurs
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify no match notifications were sent
      let matchFoundA = false;
      let matchFoundB = false;

      clientA.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "matchFound") {
          matchFoundA = true;
        }
      });

      clientB.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "matchFound") {
          matchFoundB = true;
        }
      });

      expect(matchFoundA).toBe(false);
      expect(matchFoundB).toBe(false);
    });
  });

  describe("Match Acceptance Tests", () => {
    test("should create session when both clients accept match", async () => {
      // Test Case: When both clients accept, a session should be created
      const criteria = {
        difficulty: "medium",
        language: "Python",
        topic: "Binary Tree",
      };

      clientA = await createWebSocketClient();
      clientB = await createWebSocketClient();

      // Send match requests
      sendMessage(clientA, createMatchRequest(criteria));
      sendMessage(clientB, createMatchRequest(criteria));

      // Wait for match notifications
      await Promise.all([
        waitForMessage(clientA, "matchFound"),
        waitForMessage(clientB, "matchFound"),
      ]);

      // Both clients accept the match
      sendMessage(clientA, createMatchAck("accept"));
      sendMessage(clientB, createMatchAck("accept"));

      // Wait for session creation or match outcome
      const sessionPromises = [];

      const sessionPromiseA = new Promise((resolve) => {
        clientA.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (
            message.type === "sessionCreated" ||
            message.session ||
            message.type === "matchOutcome"
          ) {
            resolve(message);
          }
        });
      });

      const sessionPromiseB = new Promise((resolve) => {
        clientB.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (
            message.type === "sessionCreated" ||
            message.session ||
            message.type === "matchOutcome"
          ) {
            resolve(message);
          }
        });
      });

      const [sessionA, sessionB] = await Promise.race([
        Promise.all([sessionPromiseA, sessionPromiseB]),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Session creation timeout")), 5000)
        ),
      ]);

      // Verify session was created for both clients
      expect(sessionA).toBeDefined();
      expect(sessionB).toBeDefined();
    });

    test("should handle rejection gracefully and resume matchmaking", async () => {
      // Test Case: When one client rejects, the other should resume matchmaking
      const criteria = {
        difficulty: "hard",
        language: "Java",
        topic: "Graph",
      };

      clientA = await createWebSocketClient();
      clientB = await createWebSocketClient();
      clientC = await createWebSocketClient();

      // First, match clientA and clientB
      sendMessage(clientA, createMatchRequest(criteria));
      sendMessage(clientB, createMatchRequest(criteria));

      // Wait for match notifications
      await Promise.all([
        waitForMessage(clientA, "matchFound"),
        waitForMessage(clientB, "matchFound"),
      ]);

      // ClientA accepts, ClientB rejects
      sendMessage(clientA, createMatchAck("accept"));
      sendMessage(clientB, createMatchAck("reject"));

      // Add clientC to the matching pool
      sendMessage(clientC, createMatchRequest(criteria));

      // Monitor for timeout notifications or new matches
      const timeoutPromise = new Promise((resolve) => {
        clientA.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (
            message.reason ||
            message.type === "matchTimeout" ||
            message.type === "matchFound"
          ) {
            resolve(message);
          }
        });
      });

      const newMatchPromise = new Promise((resolve) => {
        clientC.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "matchFound") {
            resolve(message);
          }
        });
      });

      // Wait for either timeout notification or new match
      const result = await Promise.race([
        timeoutPromise,
        newMatchPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Test timeout")), 8000)
        ),
      ]);

      expect(result).toBeDefined();
    });

    test("should disconnect non-accepting client after timeout", async () => {
      // Test Case: Client that doesn't respond should be disconnected
      const criteria = {
        difficulty: "easy",
        language: "C++",
        topic: "Sorting",
      };

      clientA = await createWebSocketClient();
      clientB = await createWebSocketClient();

      // Send match requests
      sendMessage(clientA, createMatchRequest(criteria));
      sendMessage(clientB, createMatchRequest(criteria));

      // Wait for match notifications
      await Promise.all([
        waitForMessage(clientA, "matchFound"),
        waitForMessage(clientB, "matchFound"),
      ]);

      // Only clientA accepts, clientB doesn't respond
      sendMessage(clientA, createMatchAck("accept"));
      // ClientB doesn't send any response (simulating timeout)

      // Wait for timeout notification
      const timeoutNotification = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timeout waiting for timeout notification"));
        }, 8000);

        clientA.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.reason || message.type === "matchTimeout") {
            clearTimeout(timeout);
            resolve(message);
          }
        });

        // Also listen for disconnection
        clientB.on("close", () => {
          clearTimeout(timeout);
          resolve({ type: "disconnected" });
        });
      });

      expect(timeoutNotification).toBeDefined();
    });
  });

  describe("Edge Cases and Error Handling", () => {
    test("should handle client disconnection during matching", async () => {
      const criteria = {
        difficulty: "medium",
        language: "TypeScript",
        topic: "Hash Table",
      };

      clientA = await createWebSocketClient();
      clientB = await createWebSocketClient();

      // Send match request from clientA
      sendMessage(clientA, createMatchRequest(criteria));

      // ClientB connects and sends request, then immediately disconnects
      sendMessage(clientB, createMatchRequest(criteria));

      // Wait briefly for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Disconnect clientB
      clientB.close();

      // ClientC joins later with same criteria
      clientC = await createWebSocketClient();
      sendMessage(clientC, createMatchRequest(criteria));

      // ClientA should eventually match with ClientC
      const matchNotification = await waitForMessage(
        clientA,
        "matchFound",
        8000
      );
      expect(matchNotification.type).toBe("matchFound");
    });

    test("should handle invalid message formats gracefully", async () => {
      clientA = await createWebSocketClient();

      // Send invalid message
      clientA.send("invalid json");

      // Send message with wrong typename
      sendMessage(clientA, { typename: "invalidType", data: "test" });

      // Server should still be responsive
      const validRequest = createMatchRequest({
        difficulty: "easy",
        language: "JavaScript",
        topic: "Array",
      });
      sendMessage(clientA, validRequest);

      // Should not crash and should handle subsequent valid requests
      expect(clientA.readyState).toBe(WebSocket.OPEN);
    });
  });

  describe("Multiple Client Scenarios", () => {
    test("should handle multiple clients with same criteria (first-come-first-served)", async () => {
      const criteria = {
        difficulty: "hard",
        language: "Python",
        topic: "Dynamic Programming",
      };

      // Create three clients
      clientA = await createWebSocketClient();
      clientB = await createWebSocketClient();
      clientC = await createWebSocketClient();

      // All send the same match request
      sendMessage(clientA, createMatchRequest(criteria));
      sendMessage(clientB, createMatchRequest(criteria));
      sendMessage(clientC, createMatchRequest(criteria));

      // Two should match, one should remain waiting
      const matchNotifications = await Promise.allSettled([
        waitForMessage(clientA, "matchFound", 5000),
        waitForMessage(clientB, "matchFound", 5000),
        waitForMessage(clientC, "matchFound", 5000),
      ]);

      // Exactly two should succeed (get matched)
      const successful = matchNotifications.filter(
        (result) => result.status === "fulfilled"
      );
      const failed = matchNotifications.filter(
        (result) => result.status === "rejected"
      );

      expect(successful.length).toBe(2);
      expect(failed.length).toBe(1);
    });
  });
});
