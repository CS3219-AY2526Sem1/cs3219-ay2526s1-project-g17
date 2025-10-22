// index.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './server.js';
import Session from './model/session-model.js';
import { LeveldbPersistence } from 'y-leveldb';
import * as Y from 'yjs';

dotenv.config();

const PORT = process.env.PORT || 3002;
const DB_URI = process.env.DB_CLOUD_URI;
const SESSION_IDLE_TIMEOUT = 30_000; // 30 seconds

const server = http.createServer(app);


// const ydoc = new Y.Doc()
// ydoc.getArray('arr').insert(0, [1, 2, 3])
// ydoc.getArray('arr').toArray() // => [1, 2, 3]

// // store document updates retrieved from other clients
// ldbPersistence.storeUpdate('test-session', Y.encodeStateAsUpdate(ydoc));

// ====== 1. Socket.IO for session & presence logic ======
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Track pending auto-close timeouts per session
const sessionTimeouts = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.onAny((event, ...args) => {
    console.log(`Socket.IO event: ${event}`, ...args);
  });

  socket.on('joinSession', async ({ sessionId, userId }) => {
    socket.join(sessionId);
    socket.data.sessionId = sessionId;
    socket.data.userId = userId;

    const ydoc = await getSessionYDoc(sessionId);
    socket.emit('initialDoc', Y.encodeStateAsUpdate(ydoc));

    // Cancel any pending auto-close for this session
    if (sessionTimeouts.has(sessionId)) {
      clearTimeout(sessionTimeouts.get(sessionId));
      sessionTimeouts.delete(sessionId);
    }

    // Notify others in session
    socket.to(sessionId).emit('userJoined', { userId });

    // Optional: send fallback code (if still used)
    const session = await Session.findOne({ sessionId });
    if (session?.code) {
      socket.emit('codeUpdate', session.code);
    }
  });

  // Message: Handle chat messages
  socket.on('sendMessage', ({ sessionId, message }) => {
    // Ensure user has joined this session
    console.log(`Message from ${socket.data.userId} in session ${socket.data.sessionId}: ${message}`);

    if (!socket.rooms.has(sessionId)) {
      console.warn('User not in session room');
      return;
    }
    
    const userId = socket.data.userId;
    if (!userId) return;

    const payload = {
      userId,
      message,
      timestamp: new Date().toISOString()
    };

    // Broadcast to all others in the session
    socket.to(sessionId).emit('receiveMessage', payload);
    // Also echo to sender (optional)
    socket.emit('receiveMessage', payload);
  });

  socket.on('terminateSession', async ({ sessionId }) => {
    await Session.findOneAndUpdate(
      { sessionId },
      { isActive: false, endedAt: new Date() },
      { new: true }
    );
    io.to(sessionId).emit('sessionTerminated');
    io.in(sessionId).socketsLeave(sessionId);
  });

  socket.on('disconnecting', () => {
    const sessionId = socket.data?.sessionId;
    if (!sessionId) return;

    // Schedule auto-termination after timeout if room becomes empty
    const timeoutId = setTimeout(async () => {
      const sockets = await io.in(sessionId).fetchSockets();
      if (sockets.length === 0) {
        console.log(`Auto-terminating idle session: ${sessionId}`);
        await Session.findOneAndUpdate(
          { sessionId },
          { isActive: false, endedAt: new Date() },
          { new: true }
        );
        io.to(sessionId).emit('sessionTerminated');
      }
    }, SESSION_IDLE_TIMEOUT);

    sessionTimeouts.set(sessionId, timeoutId);
  });
});

// ====== 2. Yjs WebSocket for collaborative editing (/collab) ======
const { WebSocketServer } = await import('ws');
import { setupWSConnection } from '@y/websocket-server/utils';
const ldbPersistence = new LeveldbPersistence('./yjs-docs'); // Local LevelDB persistence


export async function getSessionYDoc(sessionId) {
  // Returns the persisted Y.Doc if exists, otherwise creates new
  const ydoc = await ldbPersistence.getYDoc(sessionId);
  return ydoc;
}


const yjsWSS = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;

  if (pathname === '/collab') {
    yjsWSS.handleUpgrade(req, socket, head, (ws) => {
      setupWSConnection(ws, req, {
        docName: new URL(req.url, 'http://localhost').searchParams.get('sessionId'),
        persistence: ldbPersistence
      });
    });
  } else {
    socket.destroy(); // let Socket.IO handle /socket.io, etc.
  }
});

yjsWSS.on('connection', (ws, req) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname !== '/collab') {
    ws.close(1008, 'Invalid path');
    return;
  }
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      ws.close(1008, 'Missing sessionId');
      return;
    }

    // Let y-websocket handle Yjs sync (CRDT)
    setupWSConnection(ws, req, {
      docName: sessionId,
      gc: true, // garbage collect deleted content
      persistence: ldbPersistence // Use LevelDB persistence
      // Add `persistence: new MongodbPersistence(DB_URI)` later if needed
    });
  } catch (err) {
    console.error('Yjs connection error:', err);
    ws.close(1011, 'Internal error');
  }
});

// ====== 3. Start server ======
mongoose.connect(DB_URI)
  .then(() => {
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`   - Socket.IO: for session events`);
      console.log(`   - Yjs WS:   ws://localhost:${PORT}/collab?sessionId=...`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

export { server };