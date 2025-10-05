import express from 'express';
import {
  createSessionHandler,
  joinSessionHandler,
  terminateSessionHandler,
  getSessionHandler
} from '../controller/collaboration-controller.js';

const router = express.Router();

router.post('/session', createSessionHandler);
router.post('/session/join', joinSessionHandler);
router.post('/session/terminate', terminateSessionHandler);
router.get('/session/:sessionId', getSessionHandler);

export default router;
