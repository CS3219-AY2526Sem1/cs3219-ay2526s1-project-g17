import { useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import CollabEditor from "./CollabEditor";
import QuestionPanel from "./QuestionPanel"; 
import ChatPanel from "./ChatPanel"; 
import "./collab.css";

export default function CollabPage() {
    const { sessionId } = useParams();
    const [theme, setTheme] = useState("vs-dark");
    const [lang, setLang] = useState("javascript");
    const [peers, setPeers] = useState([]); // awareness list
    const userId = useMemo(() => "user-" + Math.floor(Math.random() * 100000), []);

    if (!sessionId) return <div style={{ padding: 16 }}>Missing sessionId in URL</div>;

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

            {/* 2. Toolbar for language/theme selection */}
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

                <button onClick={() => alert("Run not implemented yet")}>Run</button>
            </div>

            {/* 3. Main content */}
            <main className="collab-main-content">
                {/* Left panel: Question + Chat */}
                <div className="left-panel-column">
                    <div className="question-panel-area">
                        <QuestionPanel sessionId={sessionId} /> 
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
        </div>
    );
}
