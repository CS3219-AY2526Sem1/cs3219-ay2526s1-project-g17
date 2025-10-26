import fetch from "node-fetch";
import { env } from "../utils/env.js";

function authHeaders() {
    const h = {};
    for (const {h: k, v} of env.AUTH) h[k] = v;
    return h;
}

export async function listLanguages() {
    const r = await fetch(`${env.JUDGE0_URL}/languages`, { headers: authHeaders() });
    if (!r.ok) throw new Error(`languages failed: ${r.status}`);
    return r.json();
}

export async function submitAndWait({ language_id, source_code, stdin = "" }) {
    const payload = { language_id, source_code, stdin };

    const submit = await fetch(`${env.JUDGE0_URL}/submissions?base64_encoded=false&wait=false`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
    });
    if (!submit.ok) throw new Error(`submit failed: ${submit.status}`);
    const { token } = await submit.json();

    const start = Date.now();
    for (;;) {
        const r = await fetch(`${env.JUDGE0_URL}/submissions/${token}?base64_encoded=false`, {
            headers: authHeaders(),
        });
        if (!r.ok) throw new Error(`poll failed: ${r.status}`);
        const res = await r.json();
        if (res.status && res.status.id >= 3) return res;   // 3+ = finished
        if (Date.now() - start > env.MAX_WAIT_MS) return { token, status: { id: 2, description: "Processing" } };
        await new Promise(s => setTimeout(s, 300));
    }
}
