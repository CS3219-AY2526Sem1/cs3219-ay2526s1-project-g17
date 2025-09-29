import express from "express";
import dotenv from "dotenv"

import routes from "./routes/route.js"
import { connectDB } from "../config/db.js";
import rateLimiter from "../middleware/rateLimiter.js";

const app = express();
const test = dotenv.config()
const PORT = process.env.PORT || 5001;

connectDB();

// middleware
app.use(express.json());

app.use(rateLimiter);

// app.use((req, res, next)=> {
//     console.log(`Req method is ${req.method} and Req URL is ${req.url}`);
//     next();
// })

app.use("/api/notes", routes);
connectDB(() => {
    app.listen(PORT, () => {
        console.log("server started on port: 5001");
    });
});
