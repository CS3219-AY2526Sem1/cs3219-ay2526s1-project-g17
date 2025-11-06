import Session from './session-model.js';

export const createSession = async (sessionId, users, questionId) => {
  const session = new Session({ sessionId, users, questionId, isActive: true, createdAt: new Date() });
  return await session.save();
};

export const joinSession = async (sessionId, userId) => {
  return await Session.findOneAndUpdate(
    { sessionId },
    { $addToSet: { users: userId } },
    { new: true }
  );
};

export const deleteSession = async (sessionId) => {
  return await Session.findOneAndDelete({ sessionId });
};

export const terminateSession = async (sessionId) => {
  return await Session.findOneAndUpdate(
    { sessionId },
    { isActive: false, endedAt: new Date() },
    { new: true }
  );
};

export const getSession = async (sessionId) => {
  return await Session.findOne({ sessionId });
};
