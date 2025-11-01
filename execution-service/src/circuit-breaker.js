import config from "./utils/config.js";
import logger from "./utils/logger.js";

class CircuitBreaker {
    constructor(name, options = {}) {
        this.name = name;
        this.failureThreshold = options.failureThreshold || config.circuitBreaker.failureThreshold;
        this.resetTimeoutMs = options.resetTimeoutMs || config.circuitBreaker.resetTimeoutMs;

        this.state = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.successCount = 0;
    }

    async execute(fn) {
        if (this.state === "OPEN") {
            if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
                logger.info(`Circuit breaker ${this.name} transitioning to HALF_OPEN`);
                this.state = "HALF_OPEN";
                this.successCount = 0;
            } else {
                const error = new Error(`Circuit breaker ${this.name} is OPEN`);
                error.circuitOpen = true;
                throw error;
            }
        }

        try {
            const result = await fn();
            this._onSuccess();
            return result;
        } catch (error) {
            this._onFailure();
            throw error;
        }
    }

    _onSuccess() {
        this.failureCount = 0;

        if (this.state === "HALF_OPEN") {
            this.successCount++;
            if (this.successCount >= 2) {
                logger.info(`Circuit breaker ${this.name} transitioning to CLOSED`);
                this.state = "CLOSED";
                this.successCount = 0;
            }
        }
    }

    _onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.failureCount >= this.failureThreshold) {
            logger.warn(`Circuit breaker ${this.name} transitioning to OPEN`, {
                failureCount: this.failureCount,
                threshold: this.failureThreshold,
            });
            this.state = "OPEN";
        }
    }

    getState() {
        return {
            name: this.name,
            state: this.state,
            failureCount: this.failureCount,
            lastFailureTime: this.lastFailureTime,
        };
    }

    reset() {
        this.state = "CLOSED";
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.successCount = 0;
        logger.info(`Circuit breaker ${this.name} manually reset`);
    }
}

export default CircuitBreaker;