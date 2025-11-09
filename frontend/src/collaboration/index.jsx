import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import {useAuth0} from "@auth0/auth0-react";
import CollabEditor from "./CollabEditor";
import QuestionPanel from "./QuestionPanel";
import ChatPanel from "./ChatPanel";
import { runCode } from "./ExecutionClient";
import { submitAttempt, terminateSession } from "./SubmissionClient";
import "./collab.css";

export default function CollabPage() {
    const { user, isLoading } = useAuth0();
    const navigate = useNavigate();
    const location = useLocation();
    const { sessionId } = useParams();
    const questionId = new URLSearchParams(location.search).get('questionId');
    const matchedLanguage = new URLSearchParams(location.search).get('language');
    const { getAccessTokenSilently } = useAuth0();
    const [theme, setTheme] = useState("vs-dark");
    const [lang, setLang] = useState(null);
    const [peers, setPeers] = useState([]);
    const [output, setOutput] = useState({ stdout: "", stderr: "", compile_output: "", status: null });
    const [running, setRunning] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const userId = user?.sub;


    // Wait for user and language
    useEffect(() => {
        if (matchedLanguage) {
        setLang(matchedLanguage);
        } else {
        setLang("JavaScript"); // fallback
        }
    }, [matchedLanguage]);

    if (isLoading) return <div style={{ padding: 16 }}>Loading user info...</div>;
    if (!user) return <div style={{ padding: 16 }}>User not authenticated</div>;
    if (!sessionId) return <div style={{ padding: 16 }}>Missing sessionId in URL</div>;
    if (!lang) return <div style={{ padding: 16 }}>Loading...</div>;

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

    async function onSubmit() {
        const ed = window.__monaco_editor__;
        const code = ed ? ed.getValue() : "";

        if (!code.trim()) {
            alert("Please write some code before submitting!");
            return;
        }

        if (ed.getOptions().get(monaco.editor.EditorOption.readOnly)) {
            alert("You have already submitted!");
            return;
        }

        const confirmSubmit = window.confirm(
            "Are you sure you want to submit?\n\n" +
            "Your editor will be frozen, but your partner can continue working."
        );

        if (!confirmSubmit) return;

        setSubmitting(true);

        try {
            // submit the attempt to history service
            await submitAttempt({
                userId: userId,
                questionId: questionId,
                submissionCode: code
            });

            const socket = window.__collab_socket__;
            if (socket && socket.connected) {
                socket.emit('userSubmitted', { sessionId, userId });
            }

            // freeze user's editor
            ed.updateOptions({ readOnly: true });

            navigate('/');

        } catch (error) {
            console.error("Submission error:", error);
            alert(`Failed to submit: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="collab-page-layout" data-theme={theme}>
            {/* Header */}
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

            {/* Toolbar */}
            <div className="toolbar">
                <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                    <option value="vs-dark">Dark</option>
                    <option value="vs">Light</option>
                </select>

                <button onClick={()=>{
                    const ed = window.__monaco_editor__;
                    ed?.getAction('editor.action.formatDocument')?.run();
                }}>Format</button>

                <button onClick={onRun} disabled={running}>
                    {running ? "Running..." : "Run"}
                </button>

                <button
                    onClick={onSubmit}
                    disabled={submitting}
                    className="submit-button"
                    style={{
                        marginLeft: 'auto',
                        background: '#28a745',
                        color: 'white',
                        fontWeight: 'bold'
                    }}
                >
                    {submitting ? "Submitting..." : "Submit"}
                </button>

                <button
                    onClick={() => {
                        const confirm = window.confirm("Are you sure you want to leave this session?");
                        if (confirm) {
                            navigate('/');
                        }
                    }}
                    style={{
                        background: '#6c757d',
                        color: 'white',
                        fontWeight: 'bold'
                    }}
                >
                    Leave Session
                </button>
            </div>

            {/* Main content */}
            <main className="collab-main-content">
                <div className="left-panel-column">
                    <div className="question-panel-area">
                        <QuestionPanel questionId={questionId} />
                    </div>
                    <div className="chat-panel-area">
                        <ChatPanel sessionId={sessionId} userId={userId} />
                    </div>
                </div>

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

            <footer className="statusbar">
                <span className="status-item">User: {userId}</span>
                <span className="status-item">Lang: {matchedLanguage || lang}</span>
                <span className="status-item">Theme: {theme}</span>
                <span id="cursor-pos" className="status-item"></span>
            </footer>

            <div className="output-panel">
                {/* Output panel code remains the same */}
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