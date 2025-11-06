import mongoose from 'mongoose';


const messageSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  sessionId: String,
  users: [String],
  questionId: String,
  activeUsers: [String],
  chatHistory: [messageSchema],
  isActive: Boolean,
  createdAt: Date,
  endedAt: Date
});

export default mongoose.model('Session', sessionSchema);
