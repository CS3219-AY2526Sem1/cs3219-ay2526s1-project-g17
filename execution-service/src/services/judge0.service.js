import fetch from "node-fetch";
import { env } from "../utils/env.js";

// if AUTH is enabled for Judge0 (for now, no)
const baseHeaders = () =>
    env.AUTH_TOKEN && env.AUTH_HEADER
        ? { [env.AUTH_HEADER]: env.AUTH_TOKEN }
        : {};

export async function listLanguages() {
    const r = await fetch(`${env.JUDGE0_URL}/languages`, { headers: baseHeaders() });
    return r.json();
}

export async function submitAndWait({ language_id, source_code, stdin = "" }) {
    const payload = {
        language_id,
        source_code,
        stdin,
    };

    const sub = await fetch(`${env.JUDGE0_URL}/submissions?base64_encoded=false&wait=false`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...baseHeaders() },
        body: JSON.stringify(payload),
    });
    const { token } = await sub.json();

    const start = Date.now();
    while (Date.now() - start < env.MAX_WAIT_MS) {
        const r = await fetch(`${env.JUDGE0_URL}/submissions/${token}?base64_encoded=false`, {
            headers: baseHeaders(),
        });
        const result = await r.json();
        if (result.status && result.status.id >= 3) return result; // 3=Accepted/Done or final state
        await new Promise((res) => setTimeout(res, 300));
    }
    return { token, status: { id: 2, description: "Processing" } };
}
