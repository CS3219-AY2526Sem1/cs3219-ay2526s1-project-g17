import express, { Router } from "express";
import { execute, healthz, languages } from "./execution.controller.js";
// import { requireAuth } from "../middleware/auth.js";
// import { rateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

router.get("/healthz", healthz);

router.get("/languages", languages);

router.post("/execute", /* requireAuth, rateLimit, */ execute);

export default router;
