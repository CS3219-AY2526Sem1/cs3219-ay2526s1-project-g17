// index.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { MongodbPersistence } from 'y-mongodb';
import app from './server.js';
import Session from './model/session-model.js';
import { LeveldbPersistence } from 'y-leveldb';
import { GoogleGenAI } from "@google/genai";


dotenv.config();

const PORT = process.env.PORT || 3002;
const DB_URI = process.env.DB_CLOUD_URI;
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Track pending timeouts for sessions
const sessionTimeouts = new Map();
const SESSION_GRACE_PERIOD = 30_000; // 30 seconds grace before ending session


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


io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  


  socket.onAny((event, ...args) => {
    console.log(`Socket.IO event: ${event}`, ...args);
  });

  socket.on('joinSession', async ({ sessionId, userId }) => {
    socket.join(sessionId);
    socket.data.sessionId = sessionId;
    socket.data.userId = userId;
    
    // const ydoc = await getSessionYDoc(sessionId);
    // socket.emit('initialDoc', Y.encodeStateAsUpdate(ydoc));

    const session = await Session.findOne({ sessionId });
      // Only allow if user is in the authorized list
      if (!session.users.includes(userId)){
        console.warn('User not authorized for this session');
        socket.emit('error', 'User not authorized for this session');
        return;
      };

      // Add to active users if not already there
      if (!session.activeUsers.includes(userId)) {
        session.activeUsers.push(userId);
        await session.save();
      }

      // Send submission status
      if (session.submittedUsers && session.submittedUsers.includes(userId)) {
        socket.emit('alreadySubmitted', { userId });
      }
      
      // 💥 LOAD AND SEND CHAT HISTORY 💥
      if (session && session.chatHistory) {
          // Send history as an initial block of messages
          socket.emit('loadHistory', session.chatHistory.map(msg => ({
              ...msg.toObject(),
              timestamp: msg.timestamp.toISOString() // Format Date for client
          })));
      }

      // Cancel pending termination if user rejoins
      if (sessionTimeouts.has(sessionId)) {
        clearTimeout(sessionTimeouts.get(sessionId));
        sessionTimeouts.delete(sessionId);
        console.log(`⏳ Cancelled termination timeout for session ${sessionId} (user rejoined).`);
      }


    // Notify others in session
  
    socket.to(sessionId).emit('userJoined', { userId });
    console.log(`👥 Active users for ${sessionId}:`, session.activeUsers);
  });

  // Message: Handle chat messages
  socket.on('sendMessage', async ({ sessionId, message }) => {
    // Ensure user has joined this session
    console.log(`Message from ${socket.data.userId} in session ${socket.data.sessionId}: ${message}`);

    if (!socket.rooms.has(sessionId)) {
      console.warn('User not in session room');
      return;
    }
    
    const userId = socket.data.userId;
    if (!userId) return;

let history = []; // Declared in the outer scope, as fixed before

    const session = await Session.findOne({ sessionId });

    if (session) {
      if (!session.users.includes(userId)) {
        console.warn('User not authorized for this session');
        socket.emit('error', 'User not authorized for this session');
        return;
      }
      console.log('Session found:', sessionId);


      // 1. Combine the current message with the history from the DB
      const fullConversation = [
          ...session.chatHistory.map(msg => ({
              userId: msg.userId,
              message: msg.message
          })),
          { userId: userId, message: message } // The *new* message
      ];

      // 2. Group consecutive messages by their role (human/model)
      const groupedHistory = [];
      for (const msg of fullConversation) {
        // Determine the Gemini role ('user' for any human, 'model' for the AI)
        const geminiRole = msg.userId === 'gemini' ? 'model' : 'user';

        // Get the last item added to the final history array
        const lastTurn = groupedHistory[groupedHistory.length - 1];

        // If the role is the same as the last message, merge the content
        if (lastTurn && lastTurn.role === geminiRole) {
            // Append new text to the last part's text, adding the author and a newline
            const newText = `\n[${msg.userId}]: ${msg.message}`;
            lastTurn.parts[0].text += newText;

        } else {
            // Otherwise, start a new turn (Content object)
            // For human users, prepend the user ID to the message text for context
            const initialText = geminiRole === 'user' 
                ? `[${msg.userId}]: ${msg.message}` 
                : msg.message;

            groupedHistory.push({
                role: geminiRole,
                parts: [{ text: initialText }]
            });
        }
      }

      history = groupedHistory;
    } else {
      console.warn('Session not found:', sessionId);
      // If session is not found, history will remain empty, which is fine
    }


    // Persist message to DB
    const payload = {
      userId,
      message,
      timestamp: new Date()
    };

    try {
        await Session.findOneAndUpdate(
            { sessionId },
            { $push: { chatHistory: payload } }, // Use $push to append to the array
            { new: true, runValidators: true }
        );
    } catch (error) {
        console.error('Error persisting chat message:', error);
        // Decide how to handle DB error (e.g., abort broadcast or log and continue)
        return;
    }

    // Check for AI trigger words
    if (message.includes('@gemini ')) {
      try {
        const chat = ai.chats.create({
          model: "gemini-2.5-flash-lite",
          history: history
        })

      const response = await chat.sendMessage({
        message: message.replace('@gemini ', 'In 50 words, respond directly without any preamble: ')
      });

        // const response = await ai.models.generateContent({
        //   model: "gemini-2.5-flash-lite",
        //   // Send the whole chat history including the new message
        //   contents: [
        //     { role: "user", parts: [{ text: "Answer in 50 words: " + message }] }
        //   ],
        //   generationConfig: { maxOutputTokens: 50 }
          
        // })
        console.log(response.text);
        

        const aiMessage = response.text;

        const aiPayload = {
          userId: 'gemini',
          message: aiMessage,
          timestamp: new Date()
        };

        // Persist AI message to DB
        await Session.findOneAndUpdate(
          { sessionId },
          { $push: { chatHistory: aiPayload } },
          { new: true, runValidators: true }
        );

        // Broadcast AI message
        io.to(sessionId).emit('receiveMessage', aiPayload);
      } catch (error) {
        console.error('Error generating AI response:', error);
      }
    }
  });

  socket.on('userSubmitted', async ({ sessionId, userId }) => {
    try {
      const session = await Session.findOne({ sessionId });
      if (!session) return;

      if (!session.submittedUsers) {
        session.submittedUsers = [];
      }

      if (!session.submittedUsers.includes(userId)) {
        session.submittedUsers.push(userId);
        await session.save();
      }

      // Notify users in the session
      io.to(sessionId).emit('partnerSubmitted', {
        userId,
        submittedUsers: session.submittedUsers
      });

      console.log(`User ${userId} submitted in session ${sessionId}`);
    } catch (err) {
      console.error('Error handling user submission:', err);
    }
  });

socket.on('terminateSession', async ({ sessionId }) => {
  const session = await Session.findOneAndUpdate(
    { sessionId },
    { isActive: false, endedAt: new Date() },
    { new: true }
  );

  io.to(sessionId).emit('sessionTerminated');
  io.in(sessionId).socketsLeave(sessionId);
});

socket.on('disconnect', async () => {
  const { userId, sessionId } = socket.data || {};
  if (!userId || !sessionId) return;

  const session = await Session.findOne({ sessionId });
  if (!session) return;
  if (!session.activeUsers.includes(userId)) return;

  // Remove user from active list
  session.activeUsers = session.activeUsers.filter(id => id !== userId);
  await session.save();

  console.log(`User ${userId} disconnected from session ${sessionId}`);
  console.log(`👥 Active users for ${sessionId}:`, session.activeUsers);

  // If session still has active users, do nothing
  if (session.activeUsers.length > 0) return;

  // If already has a timeout scheduled, clear and reset
  if (sessionTimeouts.has(sessionId)) {
    clearTimeout(sessionTimeouts.get(sessionId));
  }


  const endSession = async (userId1, userId2) => {
    try {
      const response = await fetch("/api/matching/endSession", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId1, userId2 }),
      });

      const data = await response.json();
      if (response.ok) {
        console.log("Session closed successfully:", data);
      } else {
        console.error("Failed to close session:", data);
      }
    } catch (err) {
      console.error("Error calling endSession API:", err);
    }
  };

  // Schedule auto-termination after grace period
  const timeoutId = setTimeout(async () => {
    try {
      const checkSession = await Session.findOne({ sessionId });
      if (!checkSession) return;

      // Double-check no one rejoined in the meantime
      if (checkSession.activeUsers.length === 0) {
        checkSession.isActive = false;
        checkSession.endedAt = new Date();
        await checkSession.save();

        io.to(sessionId).emit('sessionTerminated');
        io.in(sessionId).socketsLeave(sessionId);
        
        endSession(checkSession.users[0], checkSession.users[1]);
        console.log(`🕒 Session ${sessionId} terminated after grace period.`);

      }
    } catch (err) {
      console.error('Error during session termination:', err);
    } finally {
      sessionTimeouts.delete(sessionId);
    }
  }, SESSION_GRACE_PERIOD);

  sessionTimeouts.set(sessionId, timeoutId);
});


});

// ====== 2. Yjs WebSocket for collaborative editing (/collab) ======
const { WebSocketServer } = await import('ws');
import { setupWSConnection } from '@y/websocket-server/utils';
// const ldbPersistence = new LeveldbPersistence('./yjs-docs'); // Local LevelDB persistence
const persistence = new MongodbPersistence(DB_URI); // MongoDB persistence


export async function getSessionYDoc(sessionId) {
  // Returns the persisted Y.Doc if exists, otherwise creates new
  const ydoc = await persistence.getYDoc(sessionId);
  return ydoc;
}


const yjsWSS = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;

  if (pathname === '/collab') {
    yjsWSS.handleUpgrade(req, socket, head, (ws) => {
      setupWSConnection(ws, req, {
        docName: new URL(req.url, 'http://localhost').searchParams.get('sessionId'),
        persistence: persistence
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
      persistence: persistence // Use MongoDB persistence
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

// ====== MongoDB Change Stream to sync chat messages ======
mongoose.connection.once('open', () => {
  console.log('🔄 MongoDB change stream started');

  const changeStream = Session.watch([
    { $match: { 'operationType': 'update' } }
  ]);

  changeStream.on('change', async (change) => {
    try {
      const sessionId = change.documentKey._id;
      const updatedFields = change.updateDescription.updatedFields;

      // Only react if chatHistory changed
      if (updatedFields && Object.keys(updatedFields).some(k => k.startsWith('chatHistory'))) {
        const session = await Session.findById(sessionId);
        if (!session) return;

        // Get the last message (most recent one)
        const lastMessage = session.chatHistory[session.chatHistory.length - 1];

        // Broadcast to everyone in that session
        io.to(session.sessionId).emit('receiveMessage', lastMessage);
        console.log(`🛰️ Synced new message in session ${session.sessionId}`);
      }
    } catch (err) {
      console.error('Error in MongoDB change stream handler:', err);
    }
  });

  changeStream.on('error', (err) => {
    console.error('Change stream error:', err);
  });
});

