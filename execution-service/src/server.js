import express from "express";
import cors from "cors";
import config, { validateConfig } from "./utils/config.js";
import logger from "./utils/logger.js";
import router from "./routes/execution.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

// Validate configuration on startup
try {
    validateConfig();
    logger.info("Configuration validated successfully");
} catch (error) {
    logger.error("Configuration validation failed", { error: error.message });
    process.exit(1);
}

const app = express();

app.use(cors());

// Body parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// For logging
app.set("trust proxy", 1);

app.use("/", router);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
const server = app.listen(config.port, () => {
    logger.info("Server started", {
        port: config.port,
        nodeEnv: config.nodeEnv,
        selfHosted: config.selfJudge0.enabled,
        rapidApi: config.rapidApi.enabled,
    });
});

// Handle shutdown signals
process.on("SIGTERM", () => {
    logger.info("SIGTERM received, shutting down gracefully");
    server.close(() => {
        logger.info("Server closed");
        process.exit(0);
    });
});

process.on("SIGINT", () => {
    logger.info("SIGINT received, shutting down gracefully");
    server.close(() => {
        logger.info("Server closed");
        process.exit(0);
    });
});

// Handle unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection", {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined,
    });
});

process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception", {
        error: error.message,
        stack: error.stack,
    });
    process.exit(1);
});

export default app;