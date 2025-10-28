const BASE = import.meta.env.VITE_EXEC_BASE || "http://localhost:4000";

export async function runCode({ language, source, stdin = "" }) {
    try {
        const response = await fetch(`${BASE}/execute`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                language,
                source,    // the code to execute
                stdin      // optional input
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.message ||
                errorData.error ||
                `Backend error: ${response.status}`
            );
        }

        const data = await response.json();

        return normalizeResponse(data);

    } catch (error) {
        console.error("Execution error:", error);
        throw error;
    }
}

/**
 * Normalize the backend response to a consistent format
 */
function normalizeResponse(response) {
    return {
        stdout: response.stdout || "",
        stderr: response.stderr || "",
        compile_output: response.compile_output || "",
        status: {
            id: response.status?.id || null,
            description: response.status?.description || "Unknown"
        },
        time: response.time || null,
        memory: response.memory || null,
        token: response.metadata?.token || response.token || null,
    };
}

export async function getLanguages() {
    try {
        const response = await fetch(`${BASE}/languages`);
        if (!response.ok) {
            throw new Error(`Failed to fetch languages: ${response.status}`);
        }
        const data = await response.json();
        return data.languages || [];
    } catch (error) {
        console.error("Failed to fetch languages:", error);
        return [];
    }
}

export async function getSupportedLanguages() {
    try {
        const response = await fetch(`${BASE}/supported-languages`);
        if (!response.ok) {
            throw new Error(`Failed to fetch supported languages: ${response.status}`);
        }
        const data = await response.json();
        return data.languages || {};
    } catch (error) {
        console.error("Failed to fetch supported languages:", error);
        return {};
    }
}
