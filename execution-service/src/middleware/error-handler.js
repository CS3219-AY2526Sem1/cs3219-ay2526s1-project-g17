import logger from "../utils/logger.js";

export function errorHandler(err, req, res, next) {
    logger.error("Request error", {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
    });

    // status code
    let statusCode = err.statusCode || 500;

    if (err.name === "ValidationError") {
        statusCode = 400;
    } else if (err.name === "UnauthorizedError") {
        statusCode = 401;
    } else if (err.message && err.message.includes("timeout")) {
        statusCode = 504;
    }

    const response = {
        error: err.name || "internal_error",
        message: err.message || "An unexpected error occurred",
    };

    // testing
    if (process.env.NODE_ENV === "development") {
        response.stack = err.stack;
        response.details = err;
    }

    res.status(statusCode).json(response);
}

export function notFoundHandler(req, res) {
    logger.warn("Route not found", {
        path: req.path,
        method: req.method,
    });

    res.status(404).json({
        error: "not_found",
        message: `Route ${req.method} ${req.path} not found`,
    });
}
