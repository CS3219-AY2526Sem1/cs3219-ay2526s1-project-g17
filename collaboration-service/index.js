// index.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './server.js';
import Session from './model/session-model.js';

dotenv.config();

const PORT = process.env.PORT || 3002;
const DB_URI = process.env.DB_CLOUD_URI;
const SESSION_IDLE_TIMEOUT = 30_000; // 30 seconds

const server = http.createServer(app);

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


const yjsWSS = new WebSocketServer({ server, path: '/collab' });

yjsWSS.on('connection', (ws, req) => {
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
      gc: true // garbage collect deleted content
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