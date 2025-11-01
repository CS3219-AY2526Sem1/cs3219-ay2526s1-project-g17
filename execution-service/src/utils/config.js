import dotenv from "dotenv";
dotenv.config();

export const config = {
    // Server
    port: parseInt(process.env.PORT || "4000", 10),
    nodeEnv: process.env.NODE_ENV || "development",

    // Self-hosted Judge0
    selfJudge0: {
        url: process.env.SELF_JUDGE0_URL || "",
        enabled: !!process.env.SELF_JUDGE0_URL,
        headers: parseCustomHeaders(),
    },

    // RapidAPI Judge0 (fallback)
    rapidApi: {
        base: process.env.RAPIDAPI_BASE || "",
        host: process.env.RAPIDAPI_HOST || "",
        key: process.env.RAPIDAPI_KEY || "",
        enabled: !!(process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_BASE),
    },

    // Execution settings
    execution: {
        maxWaitMs: parseInt(process.env.MAX_WAIT_MS || "30000", 10),
        pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || "500", 10),
        maxRetries: parseInt(process.env.MAX_RETRIES || "3", 10),
        timeout: parseInt(process.env.REQUEST_TIMEOUT || "35000", 10),
    },

    // Circuit breaker
    circuitBreaker: {
        failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || "5", 10),
        resetTimeoutMs: parseInt(process.env.CIRCUIT_BREAKER_RESET_MS || "60000", 10),
    },

    // Logging
    logging: {
        level: process.env.LOG_LEVEL || "info",
        enableConsole: process.env.LOG_CONSOLE !== "false",
    },
};

function parseCustomHeaders() {
    const headers = {};
    for (const [key, value] of Object.entries(process.env)) {
        if (key.startsWith("SELF_JUDGE0_HEADER_") && value && value.includes(":")) {
            const [headerKey, ...rest] = value.split(":");
            headers[headerKey.trim()] = rest.join(":").trim();
        }
    }
    return headers;
}

// Validate critical configuration
export function validateConfig() {
    const errors = [];

    if (!config.selfJudge0.enabled && !config.rapidApi.enabled) {
        errors.push("Either SELF_JUDGE0_URL or RapidAPI credentials must be configured");
    }

    if (config.rapidApi.enabled) {
        if (!config.rapidApi.base) errors.push("RAPIDAPI_BASE is required when using RapidAPI");
        if (!config.rapidApi.host) errors.push("RAPIDAPI_HOST is required when using RapidAPI");
        if (!config.rapidApi.key) errors.push("RAPIDAPI_KEY is required when using RapidAPI");
    }

    if (config.execution.maxWaitMs < 1000) {
        errors.push("MAX_WAIT_MS must be at least 1000ms");
    }

    if (errors.length > 0) {
        throw new Error(`Configuration errors:\n${errors.join("\n")}`);
    }
}

export default config;