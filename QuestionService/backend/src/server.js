import express from "express";
import dotenv from "dotenv"

import routes from "./routes/route.js"
import { connectDB } from "../config/db.js";
import rateLimiter from "../middleware/rateLimiter.js";

const app = express();
dotenv.config()
const PORT = process.env.PORT || 5001;

connectDB();

// middleware
app.use(express.json());

app.use(rateLimiter);


app.use("/api/notes", routes);
connectDB(() => {
    app.listen(PORT, () => {
        console.log("server started on port: 5001");
    });
});
