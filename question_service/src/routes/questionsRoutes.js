import express from "express";

import {
    getAllQuestions,
    getQuestionById,
    createQuestion,
    editQuestion,
    deleteQuestion,
    getRandomQuestionIdByDifficultyAndTopic,
    getListOfQuestionsByDifficultyAndTopic,
    getListOfTopicsByDifficulty,
    getAllTopics
} from "../controllers/questionsController.js";

import { auth, requiredScopes, claimCheck, InsufficientScopeError } from "express-oauth2-jwt-bearer";
import { checkRequiredPermissions, verifyAccessToken } from "../../middleware/authentication.middleware.js";


const router = express.Router();


router.get("/", getAllQuestions);
router.get("/randomList", getListOfQuestionsByDifficultyAndTopic);
router.get("/randomQuestion", getRandomQuestionIdByDifficultyAndTopic);
router.get("/topics", getAllTopics);
router.get("/topicsByDifficulty", getListOfTopicsByDifficulty);
router.get("/:id", getQuestionById);
router.post("/", verifyAccessToken, checkRequiredPermissions(['admin:all']), createQuestion);
router.put("/:id", verifyAccessToken, checkRequiredPermissions(["admin:all"]), editQuestion);
router.delete("/:id", verifyAccessToken, checkRequiredPermissions(["admin:all"]), deleteQuestion);

export default router;