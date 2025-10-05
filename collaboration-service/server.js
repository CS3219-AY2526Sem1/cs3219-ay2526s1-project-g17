import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import collaborationRoutes from './routes/collaboration-routes.js';

dotenv.config();
const app = express();
app.use(express.json());

app.use('/api/collaboration', collaborationRoutes);

const PORT = process.env.PORT || 3002;
const DB_URI = process.env.DB_CLOUD_URI;

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('joinSession', (sessionId) => {
    socket.join(sessionId);
  });
  socket.on('codeChange', ({ sessionId, code }) => {
    socket.to(sessionId).emit('codeUpdate', code);
  });
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

mongoose.connect(DB_URI)
  .then(() => {
    server.listen(PORT, () => console.log(`Collaboration service running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to connect to DB:', err.message);
  });
