import { Model } from "mongoose";

import Question from "../../models/Question.js";

export async function getAllQuestions(_, res) {
    try {
        const questions = await Question.find();
        res.status(200).json(questions);
    } catch (error) {
        console.error("Error in getAllQuestions controller", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function getQuestionById(req, res) {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) return res.status(404).json({ message: "Question not found" })

        res.status(200).json(question);
    } catch (error) {
        console.error("Error in getQuestionById controller", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function createQuestion(req, res) {
    try {
        const { title, question, difficulty, topics, testCases, constraints, hints, solution } = req.body;
        const newQuestion = new Question({ title, question, difficulty, topics, testCases, constraints, hints, solution });
        const savedQuestion = await newQuestion.save();
        res.status(201).json({ savedQuestion });
    } catch (error) {
        console.error("Error in createQuestion controller", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function editQuestion(req, res) {
    try {
        const { title, question, difficulty, topics, testCases, constraints, hints, solution } = req.body;
        const editedQuestion = await Question.findByIdAndUpdate(
            req.params.id,
            { title, question, difficulty, topics, testCases, constraints, hints, solution },
            { new: true }
        );
        if (!editedQuestion) return res.status(404).json({ message: "Question not found" });
        res.status(200).json(editedQuestion);
    } catch (error) {
        console.error("Error in editQuestion controller", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function deleteQuestion(req, res) {
    try {
        const deletedQuestion = await Question.findByIdAndDelete(req.params.id);
        if (!deletedQuestion) return res.status(404).json({ message: "Question not found" });
        res.status(200).json({ message: "Question deleted successfully" })
    } catch (error) {
        console.error("Error in deleteQuestion controller", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function getRandomQuestionByDificultyAndTopic(req, res) {
    try {
        const { difficulty, topics } = req.body;

        const data = await Question.aggregate()
            .match({
                difficulty: difficulty,
                topics: { $in: topics } // will return a list of matches as long as one of the topics in the request is present in the database
            })
            .sample(1); // picks at random from matched list

        // if multiple topics are specified (for eg. array, oop):
        // like q1 has [array, recursion]
        // and  q2 has [recursion, oop]
        // match will return both q1 and q2 then size will pick one at random

        // does not work if no topic selected
        // does not work if no difficulty selected

        res.status(200).json(data);
    } catch (error) {
        console.error("Error in getRandomQuestionByDificultyAndTopic controller", error);
        res.status(500).json({ message: "Internal server error" });
    }
}