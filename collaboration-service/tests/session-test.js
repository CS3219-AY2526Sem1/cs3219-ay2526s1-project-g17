// test-client.js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3002', {
  // If your service requires auth, add token here
  // auth: { token: 'your-jwt-token' }
});

// Simulate user joining a session
const sessionId = 'session-123';
const userId = 'user-456';

socket.on('connect', () => {
  console.log('Connected to collaboration service');
  socket.emit('joinSession', { sessionId, userId });
});

// Listen for events
socket.on('userJoined', (data) => {
  console.log('User joined:', data);
});

socket.on('codeUpdate', (code) => {
  console.log('Received code update:', code);
});

socket.on('sessionTerminated', () => {
  console.log('Session terminated!');
  socket.disconnect();
});

// Simulate code change after 2 seconds
setTimeout(() => {
  socket.emit('codeChange', { sessionId, code: 'console.log("Hello from test client!");' });
}, 2000);

// Terminate after 5 seconds
setTimeout(() => {
  socket.emit('terminateSession', { sessionId });
}, 5000);