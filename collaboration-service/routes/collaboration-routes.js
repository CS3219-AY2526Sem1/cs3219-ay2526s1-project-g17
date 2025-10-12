// Import the Express library to create routes
import express from 'express';
// Import the controller functions for handling collaboration-related logic
import {
  createSessionHandler, // Handles creating a new session
  joinSessionHandler,   // Handles joining an existing session
  terminateSessionHandler, // Handles terminating a session
  getSessionHandler     // Handles retrieving session details
} from '../controller/collaboration-controller.js';

// Create a new router instance from Express
const router = express.Router();

// Define a POST route for creating a new session
router.post('/session', createSessionHandler);

// Define a POST route for joining an existing session
router.post('/session/join', joinSessionHandler);

// Define a POST route for terminating a session
router.post('/session/terminate', terminateSessionHandler);

// Define a GET route for retrieving session details by sessionId
router.get('/session/:sessionId', getSessionHandler);

// Export the router so it can be used in other parts of the application
export default router;
