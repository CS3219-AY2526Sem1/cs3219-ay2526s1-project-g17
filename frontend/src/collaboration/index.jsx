import { useParams } from "react-router-dom";
import CollabEditor from "./CollabEditor";
// Assuming you'll create these components
import QuestionPanel from "./QuestionPanel"; 
import ChatPanel from "./ChatPanel"; 
import "./collab.css";

// --- New layout structure ---

export default function CollabPage() {
    const { sessionId } = useParams();
    
    if (!sessionId) return <div style={{ padding: 16 }}>Missing sessionId in URL</div>;

    // The main container will manage the overall page layout (e.g., using CSS Grid or Flexbox)
    return (
        <div className="collab-page-layout"> 
            
            {/* 1. TOP BAR / HEADER */}
            <header className="collab-header">
                <h2>Session: {sessionId}</h2>
                {/* You might add a "Run Code" or "Submit" button here */}
            </header>

            {/* 2. MAIN CONTENT AREA (The collaboration space) */}
            <main className="collab-main-content">
                
                {/* 2A. LEFT COLUMN: Question and Chat */}
                <div className="left-panel-column">
                    
                    {/* TOP LEFT: Question Panel */}
                    <div className="question-panel-area">
                        {/* This component will display the problem description */}
                        <QuestionPanel sessionId={sessionId} /> 
                    </div>

                    {/* BOTTOM LEFT: Chat Panel */}
                    <div className="chat-panel-area">
                        {/* This component will handle and display chat messages */}
                        <ChatPanel sessionId={sessionId} /> 
                    </div>
                </div>

                {/* 2B. RIGHT COLUMN: Code Editor */}
                <div className="right-panel-column">
                    {/* The existing collaborative editor */}
                    <CollabEditor sessionId={sessionId} />
                </div>

            </main>
            
        </div>
    );
}