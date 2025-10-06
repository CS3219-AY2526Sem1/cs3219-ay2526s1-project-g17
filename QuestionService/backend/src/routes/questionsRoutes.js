import express from "express";

import {
    getAllQuestions,
    getQuestionById,
    createQuestion,
    editQuestion,
    deleteQuestion,
    getRandomQuestionByDifficultyAndTopic,
    getListOfQuestionsByDifficultyAndTopic,
    getListOfTopicsByDifficulty,
    getAllTopics
} from "../controllers/questionsController.js";

const router = express.Router();

router.get("/", getAllQuestions);
router.get("/randomList", getListOfQuestionsByDifficultyAndTopic);
router.get("/randomQuestion", getRandomQuestionByDifficultyAndTopic);
router.get("/topics", getAllTopics);
router.get("/topicsByDifficulty", getListOfTopicsByDifficulty);
router.get("/:id", getQuestionById);
router.post("/", createQuestion);
router.put("/:id", editQuestion);
router.delete("/:id", deleteQuestion);

export default router;