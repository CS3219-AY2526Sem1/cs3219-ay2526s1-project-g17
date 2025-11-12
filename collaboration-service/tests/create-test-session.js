// scripts/create-test-session.js
import mongoose from 'mongoose';
import Session from '../model/session-model.js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const sessionId = 'test-session';
const userId1 = 'user-456';
const userId2 = 'user-567';
const questionId = 'q-789'; // can be any string for testing

async function createTestSession() {
  try {
    const DB_URI = process.env.DB_CLOUD_URI;
    await mongoose.connect(DB_URI);

    // Delete existing test session
    await Session.deleteOne({ sessionId });

    const dummyChatHistory = [
        {
            userId: 'system',
            message: 'Welcome to the test session! Chat history is loading correctly.',
            timestamp: new Date(Date.now() - 60000) // 1 minute ago
        },
        {
            userId: 'tester-user',
            message: 'Checking persistence!',
            timestamp: new Date()
        }
    ];


    const session = new Session({
      sessionId,
      users: [userId1, userId2],
      chatHistory: dummyChatHistory,
      questionId,
      createdAt: new Date(),
      endedAt: null,
      // code:
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