import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const BASE = process.env.JUDGE0_BASE;
const HOST = process.env.RAPIDAPI_HOST;
const KEY  = process.env.RAPIDAPI_KEY;

export async function runCode(source_code, language_id = 63, stdin = "") {
    try {
        const res = await axios.post(
            `${BASE}/submissions?base64_encoded=false&wait=true`,
            { source_code, language_id, stdin },
            {
                headers: {
                    "content-type": "application/json",
                    "x-rapidapi-key": KEY,
                    "x-rapidapi-host": HOST,
                },
            }
        );

        return res.data;
    } catch (err) {
        throw new Error(err.response?.data?.message || err.message);
    }
}
