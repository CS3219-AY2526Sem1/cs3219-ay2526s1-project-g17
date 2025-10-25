export const env = {
    PORT: process.env.PORT || 3010,
    JUDGE0_URL: process.env.JUDGE0_URL || "http://localhost:2358",
    AUTH_HEADER: process.env.AUTH_HEADER || "",        // if Judge0 AUTH enabled
    AUTH_TOKEN: process.env.AUTH_TOKEN || "",
    MAX_WAIT_MS: +(process.env.MAX_WAIT_MS || 8000),
};
