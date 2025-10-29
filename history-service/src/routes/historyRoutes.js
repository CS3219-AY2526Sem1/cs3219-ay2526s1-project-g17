import express from "express";
import { createAttempt, getUsersHistory, updateAttempt
 } from "../controller/historyController.js";
import { verifyAccessToken } from "../middleware/basic-access-control.js";


const router = express.Router();

router.get("/:userId", verifyAccessToken, getUsersHistory)
//router.get("/:attemptId", getAttempt)
router.post("/create-attempt", createAttempt);
router.put("/update-attempt/:id", updateAttempt)
//router.delete("/delete-attempt", deleteAttempt)

export default router;