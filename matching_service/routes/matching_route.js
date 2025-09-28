import express from "express";

import { verifyAccessToken } from "../middleware/basic_access_control.js";

const router = express.Router();

router.post("/login", handleLogin);

router.get("/verify-token", verifyAccessToken, handleVerifyToken);

export default router;
