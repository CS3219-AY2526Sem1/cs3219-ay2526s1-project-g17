import mongoose from "mongoose";
import Question from "../models/Question.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

const questionsPath = path.resolve(__dirname, "../data/questions.json");
const questionsData = JSON.parse(fs.readFileSync(questionsPath, "utf-8"));

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        await Question.deleteMany({});
        await Question.insertMany(questionsData);
        console.log("Database seeded successfully!");
    } catch (err) {
        console.error("Seeding error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

// from backend folder, run "node seeds\seed.js"
seed();