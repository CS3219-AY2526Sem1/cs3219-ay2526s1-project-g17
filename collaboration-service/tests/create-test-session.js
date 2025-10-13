// scripts/create-test-session.js
import mongoose from 'mongoose';
import Session from '../model/session-model.js';
import dotenv from 'dotenv';
import * as Y from 'yjs';

dotenv.config({ path: './.env' });

const sessionId = 'session-123';
const userId = 'user-456';
const questionId = 'q-789'; // can be any string for testing

async function createTestSession() {
  try {
    const DB_URI = process.env.DB_CLOUD_URI;
    await mongoose.connect(DB_URI);

    // Delete existing test session
    await Session.deleteOne({ sessionId });

    // Create a dummy Yjs document
    const ydoc = new Y.Doc();
    const yText = ydoc.getText('sharedText');
    yText.insert(0, 'Dummy content for testing'); // Add dummy content
    const serializedYDoc = Y.encodeStateAsUpdate(ydoc); // Serialize the Yjs document


    const session = new Session({
      sessionId,
      users: [userId],
      questionId,
      code: '// Happy coding!',
      yDoc: Buffer.from(serializedYDoc), // Store the serialized Yjs document
      isActive: true
    });

    await session.save();
    console.log('Test session created:', session.sessionId);
  } catch (err) {
    console.error('Failed to create session:', err);
  } finally {
    await mongoose.connection.close();
  }
}

createTestSession();