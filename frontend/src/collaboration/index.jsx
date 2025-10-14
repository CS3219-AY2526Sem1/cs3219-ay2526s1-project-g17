import { useParams } from "react-router-dom";
import CollabEditor from "./CollabEditor";

export default function CollabPage() {
    const { sessionId } = useParams();
    if (!sessionId) return <div style={{padding:16}}>Missing sessionId in URL</div>;
    return (
        <div style={{padding:16}}>
            <h2>Session: {sessionId}</h2>
            <CollabEditor sessionId={sessionId} />
        </div>
    );
}
