import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import WebSocket from 'ws';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import { setupWSConnection } from 'y-websocket/bin/utils.js';
import Session from './model/session-model.js';

dotenv.config();
const PORT = process.env.PORT || 3002;
const DB_URI = process.env.DB_CLOUD_URI;

const server = http.createServer();

// Map to store Yjs documents by sessionId
const docs = new Map();

// Set up the y-websocket server
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws, req) => {
  const urlParams = new URLSearchParams(req.url.slice(1));
  const sessionId = urlParams.get('sessionId');

  if (!sessionId) {
    ws.close(1008, 'Missing sessionId');
    return;
  }

  // Get or create the Yjs document for the session
  let doc = docs.get(sessionId);
  if (!doc) {
    doc = new Y.Doc();
    docs.set(sessionId, doc);
  }

  // Set up the WebSocket connection for the Yjs document
  setupWSConnection(ws, req, { doc });

  // Handle custom events
  ws.on('message', async (message) => {
    const parsedMessage = JSON.parse(message);

    switch (parsedMessage.type) {
      case 'joinSession':
        console.log(`User joined session: ${sessionId}`);
        break;

      case 'terminateSession':
        console.log(`Terminating session: ${sessionId}`);
        docs.delete(sessionId);
        ws.close(1000, 'Session terminated');
        break;

      case 'saveDocument':
        try {
          const binaryData = Y.encodeStateAsUpdate(doc);
          await Session.findOneAndUpdate(
            { sessionId },
            { yDoc: Buffer.from(binaryData) },
            { new: true, upsert: true }
          );
          console.log(`Document saved for session: ${sessionId}`);
        } catch (error) {
          console.error(`Failed to save document for session: ${sessionId}`, error);
        }
        break;

      case 'loadDocument':
        try {
          const session = await Session.findOne({ sessionId });
          if (session && session.yDoc) {
            Y.applyUpdate(doc, new Uint8Array(session.yDoc));
            console.log(`Document loaded for session: ${sessionId}`);
          } else {
            console.log(`No document found for session: ${sessionId}`);
          }
        } catch (error) {
          console.error(`Failed to load document for session: ${sessionId}`, error);
        }
        break;

      default:
        console.log(`Unknown event type: ${parsedMessage.type}`);
    }
  });
});

mongoose.connect(DB_URI)
  .then(() => {
    server.listen(PORT, () => console.log(`Collaboration service using y-websocket running on port ${PORT}`));
  })
  .catch(err => console.error('DB connection failed:', err.message));