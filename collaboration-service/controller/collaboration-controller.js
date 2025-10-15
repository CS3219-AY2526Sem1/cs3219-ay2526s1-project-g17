import { createSession, joinSession, terminateSession, getSession } from '../model/repository.js';

export const createSessionHandler = async (req, res) => {
  const { sessionId, users, questionId } = req.body;
  try {
    const session = await createSession(sessionId, users, questionId);
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const joinSessionHandler = async (req, res) => {
  const { sessionId } = req.params;
  const { userId } = req.body;
  try {
    const session = await joinSession(sessionId, userId);
    res.status(200).json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const terminateSessionHandler = async (req, res) => {
  const { sessionId } = req.params;
  try {
    const session = await terminateSession(sessionId);
    res.status(200).json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getSessionHandler = async (req, res) => {
  const { sessionId } = req.params;
  try {
    const session = await getSession(sessionId);
    res.status(200).json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
