// tests/session-test.js
import { io } from 'socket.io-client';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

const PORT = 3002;
const SESSION_ID = 'test-session';
const USER_1 = 'user-1';
const USER_2 = 'user-2';

console.log(`[END] Starting integration test for session: ${SESSION_ID}\n`);

// --- Helper: delay ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- 1. Client 1: Join via Socket.IO + Connect Yjs ---
const socket1 = io(`http://localhost:${PORT}`, { reconnection: false });
const ydoc1 = new Y.Doc();
const ytext1 = ydoc1.getText('notebook');

socket1.on('initialDoc', (encodedUpdate) => {
  Y.applyUpdate(ydoc1, encodedUpdate);
  console.log('[DOC] user-1 loaded initial content from server:', ydoc1.getText('notebook').toString());
});

const provider1 = new WebsocketProvider(
  `ws://localhost:${PORT}`,
  SESSION_ID,
  ydoc1,
  { WebSocket: (await import('ws')).default }
);

// Join session
socket1.emit('joinSession', { sessionId: SESSION_ID, userId: USER_1 });

socket1.on('connect', () => console.log('[CONNECTION] Client 1: Socket.IO connected'));
socket1.on('userJoined', (data) => console.log(`[USER JOINED] Client 1: User joined: ${data.userId}`));
socket1.on('sessionTerminated', () => console.log('[SESSION TERMINATED] Client 1: Session terminated'));


ytext1.observe(() => {
  console.log('[DOCUMENT] Client 1 sees:', `"${ytext1.toString()}"`);
});

// --- 2. Client 2: Same ---
const socket2 = io(`http://localhost:${PORT}`, { reconnection: false });
const ydoc2 = new Y.Doc();
const ytext2 = ydoc2.getText('notebook');

const provider2 = new WebsocketProvider(
  `ws://localhost:${PORT}`,
  SESSION_ID,
  ydoc2,
  { WebSocket: (await import('ws')).default }
);

socket2.on('initialDoc', (encodedUpdate) => {
  Y.applyUpdate(ydoc2, encodedUpdate);
  console.log('[DOC] user-2 loaded initial content from server:', ydoc2.getText('notebook').toString());
});

socket2.emit('joinSession', { sessionId: SESSION_ID, userId: USER_2 });

socket2.on('connect', () => console.log('[CONNECTION] Client 2: Socket.IO connected'));
socket2.on('userJoined', (data) => console.log(`[USER JOINED] Client 2: User joined: ${data.userId}`));
socket2.on('sessionTerminated', () => console.log('[SESSION TERMINATED] Client 2: Session terminated'));

ytext2.observe(() => {
  console.log('[DOCUMENT] Client 2 sees:', `"${ytext2.toString()}"`);
});

// --- 3. Simulate collaboration ---
// Client 1 types initial code
setTimeout(() => {
  console.log('\n[WRITE] Client 1 types initial code...');
  ytext1.insert(0, '// Client 1 code ');
}, 2000);

// Both clients type simultaneously
setTimeout(() => {
  ytext1.insert(0, 'A');
  ytext2.insert(0, 'B');
}, 1000);


// Client 1 later types "hello" at start
setTimeout(() => {
  console.log('\n[WRITE] Client 1 types "hello" at start...');
  ytext1.insert(0, 'hello ');
}, 3000); // ← Later!

// Client 2 appends
setTimeout(() => {
  console.log('\n[WRITE] Client 2 appends...');
  ytext2.insert(ytext2.length, '// Client 2 code');
}, 4000);

// Client 2 adds "world"
setTimeout(() => {
  console.log('\n[WRITE] Client 2 types "world" at end...');
  ytext2.insert(5, ' world');
}, 5000);


// --- 4. Test auto-close: disconnect both after 6s ---
setTimeout(async () => {
  console.log('\n[DISCONNECT] Disconnecting both clients...');
  socket1.disconnect();
  socket2.disconnect();
  provider1.destroy();
  provider2.destroy();

  console.log('[WAIT] Waiting 1s to test auto-termination...');
  await sleep(1_000);

  // Try to reconnect — should still work if session not terminated,
  // but your server will have emitted 'sessionTerminated'
  console.log('[END] Test completed.');
  process.exit(0);
}, 6000);