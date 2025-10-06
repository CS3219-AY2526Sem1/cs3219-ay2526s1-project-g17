// scripts/create-test-session.js
import mongoose from 'mongoose';
import Session from '../model/session-model.js';
import dotenv from 'dotenv';

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

    const session = new Session({
      sessionId,
      users: [userId],
      questionId,
      code: '// Happy coding!',
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