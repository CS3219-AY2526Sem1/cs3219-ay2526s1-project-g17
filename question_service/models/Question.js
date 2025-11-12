import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        question: {
            type: String,
            required: true,
        },
        difficulty: {
            type: String,
            enum: ['Beginner', 'Intermediate', 'Advanced'],
            required: true,
        },
        topics: {
            type: [String],
            required: true,
        },
        testCases: [String],
        constraints: String,
        hints: String,
        solution: String,
    },
    { timestamps: true }
);

// index for finding a random question by difficulty and topics
questionSchema.index({ difficulty: 1, topics: 1 });

const Question = mongoose.model("Question", questionSchema);

export default Question;