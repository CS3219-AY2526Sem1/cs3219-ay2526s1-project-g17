import express from "express";

import {
    getAllQuestions,
    getQuestionById,
    createQuestion,
    editQuestion,
    deleteQuestion,
    getRandomQuestionByDifficultyAndTopic,
    getListOfQuestionsByDifficultyAndTopic,
    getListOfTopicsByDifficulty
} from "../controllers/questionsController.js";

const router = express.Router();

router.get("/", getAllQuestions);
router.get("/randomlist", getListOfQuestionsByDifficultyAndTopic);
router.get("/random", getRandomQuestionByDifficultyAndTopic);
router.get("/topics", getListOfTopicsByDifficulty);
router.get("/:id", getQuestionById);
router.post("/", createQuestion);
router.put("/:id", editQuestion);
router.delete("/:id", deleteQuestion);

export default router;