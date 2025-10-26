export async function runCode({ language, source }) {
    const res = await fetch("http://localhost:4000/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            source_code: source,
            language_id: mapLang(language),
        }),
    });

    if (!res.ok) throw new Error(`Backend error: ${res.status}`);
    return res.json();
}

function mapLang(language) {
    const ids = { javascript: 63, python: 71, cpp: 54, java: 62 };
    return ids[language] || 63;
}
