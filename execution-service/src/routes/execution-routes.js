import express from "express";
import { healthz, languages, execute, run, getSupportedLanguages,} from "../controller/execution-controller.js";
import { validate, requireApiKey } from "../middleware/validation.js";
import logger from "../utils/logger.js";

const router = express.Router();

router.use((req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
        const duration = Date.now() - start;
        logger.info("Request completed", {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration,
            ip: req.ip,
        });
    });

    next();
});

router.get("/healthz", healthz);
router.get("/health", healthz);

router.get("/languages", languages);
router.get("/supported-languages", getSupportedLanguages);

// Code execution routes with validation
router.post(
    "/execute",
    requireApiKey,
    validate("execute"),
    execute
);

router.post(
    "/run",
    requireApiKey,
    validate("run"),
    run
);

export default router;
