import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import collaborationRoutes from './routes/collaboration-routes.js';
import Session from './model/session-model.js';

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

	socket.on('joinSession', async ({ sessionId, userId }) => {
		socket.join(sessionId);
		// Notify others in the room
		socket.to(sessionId).emit('userJoined', { userId });
		// Optionally send current code to the new user
		const session = await Session.findOne({ sessionId });
		if (session) {
			socket.emit('codeUpdate', session.code);
		}
	});

	socket.on('codeChange', async ({ sessionId, code }) => {
		// Update code in DB
		await Session.findOneAndUpdate(
			{ sessionId },
			{ code },
			{ new: true }
		);
		// Notify others in the room
		socket.to(sessionId).emit('codeUpdate', code);
	});

	socket.on('disconnecting', () => {
		// Notify others in all rooms this socket is part of
		for (const room of socket.rooms) {
			if (room !== socket.id) {
				socket.to(room).emit('userDisconnected', { socketId: socket.id });
			}
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
});

mongoose.connect(DB_URI)
	.then(() => {
		server.listen(PORT, () => console.log(`Collaboration service running on port ${PORT}`));
	})
	.catch(err => {
		console.error('Failed to connect to DB:', err.message);
	});
