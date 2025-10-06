import express from "express";
import dotenv from "dotenv"

import { connectDB } from "../config/db.js";
import rateLimiter from "../middleware/rateLimiter.js";
import questionRouter from "./routes/questionsRoutes.js";

const app = express();
dotenv.config()
const PORT = process.env.PORT || 5001;

// middleware
app.use(express.json());

app.use(rateLimiter);

app.use("/api/questions", questionRouter);

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log("server started on port: 5001");
    });
});

// from backend folder, npm run dev to start the server (use non-sch wifi)