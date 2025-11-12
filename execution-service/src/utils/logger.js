import config from "./config.js";

const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
};

class Logger {
    constructor() {
        this.level = LOG_LEVELS[config.logging.level] ?? LOG_LEVELS.info;
        this.enableConsole = config.logging.enableConsole;
    }

    _log(level, message, meta = {}) {
        if (LOG_LEVELS[level] > this.level || !this.enableConsole) return;

        const timestamp = new Date().toISOString();
        const logData = {
            timestamp,
            level: level.toUpperCase(),
            message,
            ...meta,
        };

        const output = JSON.stringify(logData);

        switch (level) {
            case "error":
                console.error(output);
                break;
            case "warn":
                console.warn(output);
                break;
            default:
                console.log(output);
        }
    }

    error(message, meta) {
        this._log("error", message, meta);
    }

    warn(message, meta) {
        this._log("warn", message, meta);
    }

    info(message, meta) {
        this._log("info", message, meta);
    }

    debug(message, meta) {
        this._log("debug", message, meta);
    }
}

export const logger = new Logger();
export default logger;