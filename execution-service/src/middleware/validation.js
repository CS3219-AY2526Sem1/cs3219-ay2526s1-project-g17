import logger from "../utils/logger.js";

// Validate schemas
const schemas = {
    execute: {
        language: { type: ["string", "number"], required: true },
        source: { type: "string", required: true, minLength: 1, maxLength: 50000 },
        stdin: { type: "string", required: false, maxLength: 10000 },
    },
    run: {
        language_id: { type: "number", required: true },
        source_code: { type: "string", required: true, minLength: 1, maxLength: 50000 },
        stdin: { type: "string", required: false, maxLength: 10000 },
    },
};

function validateField(value, rules, fieldName) {
    const errors = [];

    // Check required
    if (rules.required && (value === undefined || value === null || value === "")) {
        errors.push(`${fieldName} is required`);
        return errors;
    }

    if (!rules.required && (value === undefined || value === null)) {
        return errors;
    }

    // Check type
    const allowedTypes = Array.isArray(rules.type) ? rules.type : [rules.type];
    const actualType = typeof value;
    if (!allowedTypes.includes(actualType)) {
        errors.push(`${fieldName} must be of type ${allowedTypes.join(" or ")}`);
        return errors;
    }

    // Check string length
    if (actualType === "string") {
        if (rules.minLength !== undefined && value.length < rules.minLength) {
            errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength !== undefined && value.length > rules.maxLength) {
            errors.push(`${fieldName} must be at most ${rules.maxLength} characters`);
        }
    }

    // Check number range
    if (actualType === "number") {
        if (rules.min !== undefined && value < rules.min) {
            errors.push(`${fieldName} must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
            errors.push(`${fieldName} must be at most ${rules.max}`);
        }
    }

    return errors;
}

export function validate(schemaName) {
    const schema = schemas[schemaName];

    if (!schema) {
        throw new Error(`Unknown validation schema: ${schemaName}`);
    }

    return (req, res, next) => {
        const data = req.body || {};
        const errors = [];

        for (const [fieldName, rules] of Object.entries(schema)) {
            const fieldErrors = validateField(data[fieldName], rules, fieldName);
            errors.push(...fieldErrors);
        }

        if (errors.length > 0) {
            logger.warn("Validation failed", { errors, body: req.body });
            return res.status(400).json({
                error: "validation_error",
                message: "Request validation failed",
                details: errors,
            });
        }

        next();
    };
}

export function requireApiKey(req, res, next) {
    const apiKey = req.headers["x-api-key"];
    const validKeys = (process.env.API_KEYS || "").split(",").filter(Boolean);

    // If no API keys configured, skip auth
    if (validKeys.length === 0) {
        return next();
    }

    if (!apiKey || !validKeys.includes(apiKey)) {
        logger.warn("Unauthorized API request", { ip: req.ip, hasKey: !!apiKey });
        return res.status(401).json({
            error: "unauthorized",
            message: "Valid API key required",
        });
    }

    next();
}

export default { validate, requireApiKey };