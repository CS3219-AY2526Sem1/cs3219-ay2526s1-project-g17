import mongoose from 'mongoose';


const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  users: [{ type: String, required: true }], // user IDs
  questionId: { type: String, required: true },
  code: { type: String, default: '' }, // collaborative code content
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  endedAt: { type: Date }
});

export default mongoose.model('Session', sessionSchema);
