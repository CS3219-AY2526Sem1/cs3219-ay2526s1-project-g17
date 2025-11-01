import fetch from "node-fetch";
import axios from "axios";
import config from "./utils/config.js";
import logger from "./utils/logger.js";
import CircuitBreaker from "./circuit-breaker.js";

const selfCircuitBreaker = new CircuitBreaker("self-hosted", {
    failureThreshold: 5,
    resetTimeoutMs: 60000,
});

const rapidCircuitBreaker = new CircuitBreaker("rapidapi", {
    failureThreshold: 5,
    resetTimeoutMs: 60000,
});

// Self-hosted Judge0 Functions
async function selfListLanguages() {
    const url = `${config.selfJudge0.url}/languages`;
    logger.debug("Fetching languages from self-hosted", { url });

    const response = await fetch(url, {
        headers: config.selfJudge0.headers,
        timeout: config.execution.timeout,
    });

    if (!response.ok) {
        throw new Error(`Self-hosted languages failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

async function selfSubmitAsync({ language_id, source_code, stdin = "" }) {
    const url = `${config.selfJudge0.url}/submissions?base64_encoded=false&wait=false`;
    logger.debug("Submitting to self-hosted (async)", { language_id, url });

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...config.selfJudge0.headers,
        },
        body: JSON.stringify({ language_id, source_code, stdin }),
        timeout: config.execution.timeout,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Self-hosted submit failed: ${response.status} - ${errorText}`);
    }

    return response.json();
}

async function selfGetSubmission(token) {
    const url = `${config.selfJudge0.url}/submissions/${token}?base64_encoded=false`;

    const response = await fetch(url, {
        headers: config.selfJudge0.headers,
        timeout: config.execution.timeout,
    });

    if (response.status === 404 || response.status === 204) {
        return null;
    }

    if (!response.ok) {
        throw new Error(`Self-hosted poll failed: ${response.status}`);
    }

    return response.json();
}

async function selfPollSubmission(token) {
    const startTime = Date.now();
    const maxWait = config.execution.maxWaitMs;
    const pollInterval = config.execution.pollIntervalMs;

    logger.debug("Polling submission", { token, maxWait });

    while (Date.now() - startTime < maxWait) {
        const result = await selfGetSubmission(token);

        if (result && result.status && result.status.id > 2) {
            // status id > 2 means processing is complete
            logger.debug("Submission complete", { token, status: result.status.id });
            return result;
        }

        await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Submission timed out after ${maxWait}ms`);
}

async function selfSubmitAndWait({ language_id, source_code, stdin = "" }) {
    // try synchronous submission
    try {
        const url = `${config.selfJudge0.url}/submissions?base64_encoded=false&wait=true`;
        logger.debug("Submitting to self-hosted (sync)", { language_id, url });

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...config.selfJudge0.headers,
            },
            body: JSON.stringify({ language_id, source_code, stdin }),
            timeout: config.execution.timeout,
        });

        if (response.ok) {
            return response.json();
        }

        logger.warn("Sync submission failed, trying async", { status: response.status });
    } catch (err) {
        logger.warn("Sync submission error, trying async", { error: err.message });
    }

    // fallback to async submission with polling
    const submission = await selfSubmitAsync({ language_id, source_code, stdin });
    return selfPollSubmission(submission.token);
}

// RapidAPI Judge0 Functions
async function rapidListLanguages() {
    logger.debug("Fetching languages from RapidAPI");

    const response = await axios.get(`${config.rapidApi.base}/languages`, {
        headers: {
            "x-rapidapi-key": config.rapidApi.key,
            "x-rapidapi-host": config.rapidApi.host,
        },
        timeout: config.execution.timeout,
    });

    return response.data;
}

async function rapidExecuteSync({ language_id, source_code, stdin = "" }) {
    logger.debug("Executing on RapidAPI (sync)", { language_id });

    const response = await axios.post(
        `${config.rapidApi.base}/submissions?base64_encoded=false&wait=true`,
        { language_id, source_code, stdin },
        {
            headers: {
                "content-type": "application/json",
                "x-rapidapi-key": config.rapidApi.key,
                "x-rapidapi-host": config.rapidApi.host,
            },
            timeout: config.execution.timeout,
        }
    );

    return response.data;
}

async function rapidSubmitAsync({ language_id, source_code, stdin = "" }) {
    logger.debug("Submitting to RapidAPI (async)", { language_id });

    const response = await axios.post(
        `${config.rapidApi.base}/submissions?base64_encoded=false&wait=false`,
        { language_id, source_code, stdin },
        {
            headers: {
                "content-type": "application/json",
                "x-rapidapi-key": config.rapidApi.key,
                "x-rapidapi-host": config.rapidApi.host,
            },
            timeout: config.execution.timeout,
        }
    );

    return response.data;
}

async function rapidGetSubmission(token) {
    const url = `${config.rapidApi.base}/submissions/${token}?base64_encoded=false`;

    const response = await axios.get(url, {
        headers: {
            "x-rapidapi-key": config.rapidApi.key,
            "x-rapidapi-host": config.rapidApi.host,
        },
        timeout: config.execution.timeout,
    });

    return response.data;
}

async function rapidPollSubmission(token) {
    const startTime = Date.now();
    const maxWait = config.execution.maxWaitMs;
    const pollInterval = config.execution.pollIntervalMs;

    logger.debug("Polling RapidAPI submission", { token, maxWait });

    while (Date.now() - startTime < maxWait) {
        const result = await rapidGetSubmission(token);

        if (result && result.status && result.status.id > 2) {
            logger.debug("RapidAPI submission complete", { token, status: result.status.id });
            return result;
        }

        await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`RapidAPI submission timed out after ${maxWait}ms`);
}

async function rapidSubmitAndWait({ language_id, source_code, stdin = "" }) {
    try {
        return await rapidExecuteSync({ language_id, source_code, stdin });
    } catch (err) {
        logger.warn("RapidAPI sync failed, trying async", { error: err.message });
        const submission = await rapidSubmitAsync({ language_id, source_code, stdin });
        return rapidPollSubmission(submission.token);
    }
}

// Logic of both combined
export async function listLanguages() {
    const errors = [];

    // try self-hosted first
    if (config.selfJudge0.enabled) {
        try {
            return await selfCircuitBreaker.execute(() => selfListLanguages());
        } catch (error) {
            logger.error("Self-hosted languages failed", {
                error: error.message,
                circuitState: selfCircuitBreaker.getState().state,
            });
            errors.push({ provider: "self-hosted", error: error.message });
        }
    }

    // fallback to RapidAPI
    if (config.rapidApi.enabled) {
        try {
            return await rapidCircuitBreaker.execute(() => rapidListLanguages());
        } catch (error) {
            logger.error("RapidAPI languages failed", {
                error: error.message,
                circuitState: rapidCircuitBreaker.getState().state,
            });
            errors.push({ provider: "rapidapi", error: error.message });
        }
    }

    // both failed
    const errorMsg = errors.map((e) => `${e.provider}: ${e.error}`).join("; ");
    throw new Error(`All providers failed: ${errorMsg}`);
}

export async function submitAndWait({ language_id, source_code, stdin = "" }) {
    const errors = [];

    // try self-hosted first
    if (config.selfJudge0.enabled) {
        try {
            const result = await selfCircuitBreaker.execute(() =>
                selfSubmitAndWait({ language_id, source_code, stdin })
            );
            logger.info("Execution completed on self-hosted", { language_id });
            return result;
        } catch (error) {
            logger.error("Self-hosted execution failed", {
                error: error.message,
                circuitState: selfCircuitBreaker.getState().state,
                circuitOpen: error.circuitOpen || false,
            });
            errors.push({ provider: "self-hosted", error: error.message });
        }
    }

    // fallback to RapidAPI
    if (config.rapidApi.enabled) {
        try {
            const result = await rapidCircuitBreaker.execute(() =>
                rapidSubmitAndWait({ language_id, source_code, stdin })
            );
            logger.info("Execution completed on RapidAPI", { language_id });
            return result;
        } catch (error) {
            logger.error("RapidAPI execution failed", {
                error: error.message,
                circuitState: rapidCircuitBreaker.getState().state,
                circuitOpen: error.circuitOpen || false,
            });
            errors.push({ provider: "rapidapi", error: error.message });
        }
    }

    // both failed
    const errorMsg = errors.map((e) => `${e.provider}: ${e.error}`).join("; ");
    throw new Error(`All providers failed: ${errorMsg}`);
}

export async function healthCheck() {
    const health = {
        selfHosted: { available: false, circuitState: null },
        rapidApi: { available: false, circuitState: null },
    };

    if (config.selfJudge0.enabled) {
        try {
            await selfListLanguages();
            health.selfHosted.available = true;
        } catch (error) {
            health.selfHosted.error = error.message;
        }
        health.selfHosted.circuitState = selfCircuitBreaker.getState();
    }

    if (config.rapidApi.enabled) {
        try {
            await rapidListLanguages();
            health.rapidApi.available = true;
        } catch (error) {
            health.rapidApi.error = error.message;
        }
        health.rapidApi.circuitState = rapidCircuitBreaker.getState();
    }

    return health;
}

export { selfCircuitBreaker, rapidCircuitBreaker };