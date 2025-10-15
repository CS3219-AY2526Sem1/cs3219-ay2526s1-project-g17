// Import the Express library to create routes
import express from 'express';
// Import the controller functions for handling collaboration-related logic
import {
  createSessionHandler, // Handles creating a new session
  joinSessionHandler,   // Handles joining an existing session
  terminateSessionHandler, // Handles terminating a session
  getSessionHandler,     // Handles retrieving session details
  deleteSessionHandler   // Handles deleting a session
} from '../controller/collaboration-controller.js';

// Create a new router instance from Express
const router = express.Router();

// Define a POST route for creating a new session
router.post('/sessions', createSessionHandler);

// Define a POST route for joining an existing session
router.post('/sessions/:sessionId/join', joinSessionHandler);

// Define a POST route for terminating a session
router.post('/sessions/:sessionId/terminate', terminateSessionHandler);

// Define a GET route for retrieving session details by sessionId
router.get('/sessions/:sessionId', getSessionHandler);

// Define a DELETE route for deleting a session by sessionId
router.delete('/sessions/:sessionId', deleteSessionHandler);

// Export the router so it can be used in other parts of the application
export default router;
