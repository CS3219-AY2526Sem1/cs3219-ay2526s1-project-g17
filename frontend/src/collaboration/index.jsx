import { useParams, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import CollabEditor from "./CollabEditor";
import QuestionPanel from "./QuestionPanel"; 
import ChatPanel from "./ChatPanel";
import { runCode } from "./ExecutionClient";
import "./collab.css";

export default function CollabPage() {
    const location = useLocation();
    const { sessionId } = useParams();
    const questionId = new URLSearchParams(location.search).get('questionId');
    const [theme, setTheme] = useState("vs-dark");
    const [lang, setLang] = useState("javascript");
    const [peers, setPeers] = useState([]); // awareness list
    const [output, setOutput] = useState({ stdout: "", stderr: "", compile_output: "", status: null });
    const [running, setRunning] = useState(false);
    const userId = useMemo(() => "user-" + Math.floor(Math.random() * 100000), []);

    if (!sessionId) return <div style={{ padding: 16 }}>Missing sessionId in URL</div>;

    async function onRun() {
        const ed = window.__monaco_editor__;
        const code = ed ? ed.getValue() : "";
        setRunning(true);
        try {
            const res = await runCode({ language: lang, source: code });
            setOutput({
                stdout: res.stdout || "",
                stderr: res.stderr || "",
                compile_output: res.compile_output || "",
                status: res.status || null,
            });
        } catch (e) {
            setOutput({ stdout: "", stderr: String(e), compile_output: "", status: { description: "Client error" } });
        } finally {
            setRunning(false);
        }
    }

    return (
        <div className="collab-page-layout" data-theme={theme}> 
            {/* 1. Header */}
            <header className="collab-header">
                <h2>Session: {sessionId}</h2>
                <div className="avatars">
                    {peers.map(p => (
                        <div key={p.clientId} className="avatar" style={{ background: p.color }}>
                            {p.name.slice(0,2).toUpperCase()}
                        </div>
                    ))}
                </div>
            </header>

            {/* 2. Toolbar for language/theme selection and Run */}
            <div className="toolbar">
                <select value={lang} onChange={(e) => setLang(e.target.value)}>
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                </select>

                <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                    <option value="vs-dark">Dark</option>
                    <option value="light">Light</option>
                </select>


                <button onClick={()=>{
                    const ed = window.__monaco_editor__;
                    ed?.getAction('editor.action.formatDocument')?.run();
                }}>Format</button>

                <button onClick={onRun} disabled={running}>
                    {running ? "Running..." : "Run"}
                </button>
            </div>

            {/* 3. Main content */}
            <main className="collab-main-content">
                {/* Left panel: Question + Chat */}
                <div className="left-panel-column">
                    <div className="question-panel-area">
                        <QuestionPanel questionId={questionId} /> 
                    </div>
                    <div className="chat-panel-area">
                        <ChatPanel sessionId={sessionId} /> 
                    </div>
                </div>

                {/* Right panel: Collaborative editor */}
                <div className="right-panel-column">
                    <CollabEditor
                        sessionId={sessionId}
                        userId={userId}
                        language={lang}
                        theme={theme}
                        onAwareness={setPeers}
                    />
                </div>
            </main>

            {/* 4. Footer / status bar */}
            <footer className="statusbar">
                <span className="status-item">User: {userId}</span>
                <span className="status-item">Lang: {lang}</span>
                <span className="status-item">Theme: {theme}</span>
                <span id="cursor-pos" className="status-item"></span>
            </footer>

            {/* 5. Output panel (execution results) */}
            <div className="output-panel">
                <div className="output-header">
                    <span>Execution result</span>
                    <span className="status-pill">
                        Status: {output.status?.description || (running ? "Running..." : "—")}
                    </span>
                    <div className="output-actions">
                        <button onClick={() => {
                            setOutput({ stdout: "", stderr: "", compile_output: "", status: null });
                        }}>Clear</button>
                        <button onClick={async () => {
                            const text = [
                                `# Status: ${output.status?.description || "-"}`,
                                "",
                                "## Stdout",
                                output.stdout || "—",
                                "",
                                "## Stderr",
                                output.stderr || "—",
                                "",
                                "## Compile Output",
                                output.compile_output || "—",
                            ].join("\n");
                            try {
                                await navigator.clipboard.writeText(text);
                                alert("Copied result to clipboard");
                            } catch {
                                alert("Copy failed");
                            }
                        }}>Copy</button>
                    </div>
                </div>

                <div className="output-grid">
                    <div className="output-box">
                        <header>Stdout</header>
                        <pre>{output.stdout || "—"}</pre>
                    </div>
                    <div className="output-box">
                        <header>Stderr</header>
                        <pre>{output.stderr || "—"}</pre>
                    </div>
                    <div className="output-box">
                        <header>Compile Output</header>
                        <pre>{output.compile_output || "—"}</pre>
                    </div>
                </div>
            </div>
        </div>
    );
}
