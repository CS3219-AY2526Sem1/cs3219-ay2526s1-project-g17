import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { runCode } from "./JudgeClient.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/healthz", (_, res) => res.send("OK"));

app.post("/run", async (req, res) => {
    try {
        const { source_code, language_id, stdin } = req.body;
        const result = await runCode(source_code, language_id, stdin);
        res.json(result);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
