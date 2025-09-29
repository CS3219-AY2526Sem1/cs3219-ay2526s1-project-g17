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
    },
    { timestamps: true }
);

const Question = mongoose.model("Question", questionSchema);

export default Question;