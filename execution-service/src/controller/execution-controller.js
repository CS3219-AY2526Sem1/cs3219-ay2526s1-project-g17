import {
    listLanguages as j0List,
    submitAndWait as j0Run,
    healthCheck as j0Health,
} from "../judge0-service.js";
import logger from "../utils/logger.js";

const LANGUAGE_MAP = {
    cpp: 54,
    "c++": 54,
    java: 62,
    python: 71,
    python3: 71,
    typescript: 74,
    ts: 74,
    javascript: 63,
    js: 63,
};

function toLanguageId(languageOrId) {
    if (languageOrId == null) return undefined;

    if (typeof languageOrId === "number") return languageOrId;

    const parsed = parseInt(languageOrId, 10);
    if (!isNaN(parsed)) return parsed;

    const key = String(languageOrId).trim().toLowerCase();
    return LANGUAGE_MAP[key];
}

export const healthz = async (req, res) => {
    try {
        const health = await j0Health();
        const isHealthy = health.selfHosted.available || health.rapidApi.available;

        res.status(isHealthy ? 200 : 503).json({
            status: isHealthy ? "ok" : "degraded",
            timestamp: new Date().toISOString(),
            providers: health,
        });
    } catch (error) {
        logger.error("Health check failed", { error: error.message });
        res.status(503).json({
            status: "error",
            timestamp: new Date().toISOString(),
            error: error.message,
        });
    }
};

export const languages = async (req, res, next) => {
    try {
        logger.info("Fetching languages");
        const data = await j0List();

        res.json({
            success: true,
            count: data.length,
            languages: data,
        });
    } catch (error) {
        logger.error("Failed to fetch languages", { error: error.message });
        next(error);
    }
};

export const execute = async (req, res, next) => {
    try {
        const { language, source, stdin = "" } = req.body;
        const language_id = toLanguageId(language);

        if (!language_id) {
            return res.status(400).json({
                error: "invalid_language",
                message: "Invalid or unsupported language",
                supportedLanguages: Object.keys(LANGUAGE_MAP),
            });
        }

        logger.info("Executing code", { language, language_id });
        const startTime = Date.now();

        const result = await j0Run({ language_id, source_code: source, stdin });

        const executionTime = Date.now() - startTime;
        logger.info("Execution completed", {
            language_id,
            executionTime,
            status: result.status?.description,
        });

        res.json({
            success: true,
            stdout: result.stdout ?? "",
            stderr: result.stderr ?? "",
            compile_output: result.compile_output ?? "",
            time: result.time ?? null,
            memory: result.memory ?? null,
            status: {
                id: result.status?.id ?? null,
                description: result.status?.description ?? null,
            },
            metadata: {
                execution_time_ms: executionTime,
                token: result.token ?? null,
            },
        });
    } catch (error) {
        logger.error("Execution failed", {
            error: error.message,
            language: req.body?.language,
        });
        next(error);
    }
};

export const run = async (req, res, next) => {
    try {
        const { language_id, source_code, stdin = "" } = req.body;

        logger.info("Running code", { language_id });
        const startTime = Date.now();

        const result = await j0Run({ language_id, source_code, stdin });

        const executionTime = Date.now() - startTime;
        logger.info("Run completed", {
            language_id,
            executionTime,
            status: result.status?.description,
        });

        res.json({
            success: true,
            ...result,
            metadata: {
                execution_time_ms: executionTime,
            },
        });
    } catch (error) {
        logger.error("Run failed", {
            error: error.message,
            language_id: req.body?.language_id,
        });
        next(error);
    }
};

export const getSupportedLanguages = (req, res) => {
    res.json({
        success: true,
        languages: LANGUAGE_MAP,
    });
};

export default {
    healthz,
    languages,
    execute,
    run,
    getSupportedLanguages,
};