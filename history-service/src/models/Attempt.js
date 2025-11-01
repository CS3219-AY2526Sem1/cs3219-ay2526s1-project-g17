import mongoose from "mongoose";

const QuestionAttemptSchema = new mongoose.Schema(
  {
    //the below should be auto generated so no need to create it here
    // attemptId: {
    //   type: String,
    //   required: true,
    //   unique: true,
    //   index: true, // fast lookup or idempotent insert
    // },

    userId: {
      type: String,
      required: true,
      index: true, // allows per-user queries and pagination
    },

    questionId: {
      type: String,
      required: true,
      index: true, // needed for analytics (e.g., how many users did Qn X)
    },

    submissionCode: {
      type: String
    },

    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true, // adds createdAt / updatedAt
  }
);

// compound indexes for efficient querying
QuestionAttemptSchema.index({ userId: 1, timestamp: -1 }); // get latest attempts quickly
QuestionAttemptSchema.index({ userId: 1, questionId: 1 }); // check if user attempted before
QuestionAttemptSchema.index({ questionId: 1, status: 1 }); // for analytics by question
QuestionAttemptSchema.index({ difficulty: 1, topic: 1 }); // optional for topic-wise stats

export const QuestionAttempt = mongoose.model("QuestionAttempt", QuestionAttemptSchema);
