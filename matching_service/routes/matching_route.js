import express from "express";

import MatchingModel from "../model/matching_model.js";
import { storeMatchRequest } from "../model/repository.js";

const router = express.Router();

// router.get("/verify-token", verifyAccessToken, (req, res) => {});
router.get("/", (req, res) => {
  res.status(200).json({ message: "Hello from matching service" });
});

router.get("/match", async (req, res) => {
  try {
    const matches = await MatchingModel.find({});
    res.status(200).json(matches);
  } catch (error) {
    console.error("Fetching error occured", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/match", async (req, res) => {
  try {
    const { userId, status, criterias } = req.body;
    await storeMatchRequest(userId, status, criterias);
    console.log("New match created successfully");
    res.status(201).json({ message: "Match created successfully" });
  } catch (error) {
    console.error("Creating matching error", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
