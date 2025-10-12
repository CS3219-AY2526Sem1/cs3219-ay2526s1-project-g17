// test-client.js
import WebSocket from 'ws';
import * as Y from 'yjs';
import Session from '../model/session-model.js';

// Define constants for the test
const TEST_PORT = 4000; // Port for the test WebSocket server
const TEST_SESSION_ID = 'test-session'; // Session ID for testing

const sessionId = 'session-123';
const userId = 'user-456';

// Create a WebSocket connection to the test server
const ws = new WebSocket(`ws://localhost:${TEST_PORT}/?sessionId=${TEST_SESSION_ID}`);

// Create a Yjs document for testing
const ydoc = new Y.Doc();
const yText = ydoc.getText('sharedText');

// Event listener for when the WebSocket connection is opened
ws.on('open', () => {
  console.log('WebSocket connection established');

  // Test the joinSession event
  ws.send(JSON.stringify({ type: 'joinSession' }));

  // Request the Yjs document from the server
  ws.send(JSON.stringify({ type: 'loadDocument' }));
});

// Event listener for receiving messages from the server
ws.on('message', (message) => {
  const parsedMessage = JSON.parse(message);

  if (parsedMessage.type === 'document') {
    // Apply the received Yjs document to the local Yjs document
    const binaryData = new Uint8Array(parsedMessage.data);
    Y.applyUpdate(ydoc, binaryData);
    console.log('Yjs document loaded for Client 1:', yText.toString());

    // Modify the Yjs document and save changes
    yText.insert(0, 'Hello, Client 1!');
    ws.send(JSON.stringify({ type: 'saveDocument' }));
  }
});

// Event listener for when the WebSocket connection is closed
ws.on('close', () => {
  console.log('WebSocket connection closed');
});

// Event listener for WebSocket errors
ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Create a second WebSocket connection to simulate another client
const ws2 = new WebSocket(`ws://localhost:${TEST_PORT}/?sessionId=${TEST_SESSION_ID}`);

// Event listener for when the second WebSocket connection is opened
ws2.on('open', () => {
  console.log('Second WebSocket connection established');

  // Test the joinSession event for the second client
  ws2.send(JSON.stringify({ type: 'joinSession' }));

  // Request the Yjs document from the server
  ws2.send(JSON.stringify({ type: 'loadDocument' }));
});

// Event listener for receiving messages from the server for the second client
ws2.on('message', (message) => {
  const parsedMessage = JSON.parse(message);

  if (parsedMessage.type === 'document') {
    // Apply the received Yjs document to the local Yjs document
    const binaryData = new Uint8Array(parsedMessage.data);
    Y.applyUpdate(ydoc, binaryData);
    console.log('Yjs document loaded for Client 2:', yText.toString());

    // Modify the Yjs document from the second client and save changes
    yText.insert(yText.length, ' Hello from Client 2!');
    ws2.send(JSON.stringify({ type: 'saveDocument' }));

    // Log the final state of the Yjs document
    console.log('Final Yjs document state after Client 2:', yText.toString());
  }
});

// Event listener for when the second WebSocket connection is closed
ws2.on('close', () => {
  console.log('Second WebSocket connection closed');
});

// Event listener for WebSocket errors for the second client
ws2.on('error', (error) => {
  console.error('WebSocket error (Client 2):', error);
});