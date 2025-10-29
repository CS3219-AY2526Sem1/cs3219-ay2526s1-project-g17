import express from "express";
import { createAttempt, getUsersHistory, updateAttempt
 } from "../controller/historyController.js";


const router = express.Router();

router.get("/:userId", getUsersHistory)
//router.get("/:attemptId", getAttempt)
router.post("/create-attempt", createAttempt);
router.put("/update-attempt/:id", updateAttempt)
//router.delete("/delete-attempt", deleteAttempt)

export default router;