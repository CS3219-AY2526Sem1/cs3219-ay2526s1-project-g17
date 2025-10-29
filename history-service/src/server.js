import express from "express";
import historyRoutes from "./routes/historyRoutes.js";
import { connectDB } from "./config/db.js";
import "./config/env.js";
import rateLimiter from "./middleware/rateLimiter.js";
import cors from "cors";
import { errorHandler } from "./middleware/error.middleware.js";
import { error } from "console";

const app = express();
const PORT = process.env.PORT || 3004



// middleware
app.use(express.json());
app.use(rateLimiter);
app.use(cors());

app.use("/history", historyRoutes)

app.use(errorHandler);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log("Server started on PORT: 3004")
  })
})
