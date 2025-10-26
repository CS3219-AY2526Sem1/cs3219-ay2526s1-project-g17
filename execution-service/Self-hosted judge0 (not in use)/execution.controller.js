import { LANG } from "../utils/languages.js";
import { submitAndWait, listLanguages } from "./judge0.service.js";

export async function healthz(_req, res) {
    res.status(200).send("ok");
}

export async function languages(_req, res) {
    const langs = await listLanguages();
    res.json(langs);
}

export async function execute(req, res) {
    const { language = "javascript", source = "", stdin = "" } = req.body || {};
    const language_id = LANG[language];
    if (!language_id) return res.status(400).json({ error: "Unsupported language" });
    if (!source) return res.status(400).json({ error: "source is required" });

    try {
        const result = await submitAndWait({ language_id, source_code: source, stdin });
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: "execution failed", detail: e.message });
    }
}
