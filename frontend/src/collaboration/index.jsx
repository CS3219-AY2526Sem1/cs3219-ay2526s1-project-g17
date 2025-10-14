import { useParams } from "react-router-dom";
import CollabEditor from "./CollabEditor";
import "./collab.css";

export default function CollabPage() {
    const { sessionId } = useParams();
    if (!sessionId) return <div style={{ padding: 16 }}>Missing sessionId in URL</div>;

    return (
        <div className="collab-container">
            <header className="collab-header">
                <h2>Session: {sessionId}</h2>
            </header>
            <main className="collab-editor">
                <CollabEditor sessionId={sessionId} />
            </main>
        </div>
    );
}
