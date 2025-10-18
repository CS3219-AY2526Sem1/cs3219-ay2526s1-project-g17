import mongoose from 'mongoose';


const sessionSchema = new mongoose.Schema({
  sessionId: String,
  users: [String],
  questionId: String,
  isActive: Boolean,
  createdAt: Date,
  endedAt: Date
});

export default mongoose.model('Session', sessionSchema);
