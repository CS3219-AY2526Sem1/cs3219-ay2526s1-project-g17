import express from "express";

import {
    getAllQuestions,
    getQuestionById,
    createQuestion,
    editQuestion,
    deleteQuestion,
    getRandomQuestionByDificultyAndTopic,
    getListOfQuestionsByDificultyAndTopic
} from "../controllers/questionsController.js";

const router = express.Router();

router.get("/", getAllQuestions);
router.get("/randomlist", getListOfQuestionsByDificultyAndTopic);
router.get("/random", getRandomQuestionByDificultyAndTopic);
router.get("/:id", getQuestionById);
router.post("/", createQuestion);
router.put("/:id", editQuestion);
router.delete("/:id", deleteQuestion);

export default router;