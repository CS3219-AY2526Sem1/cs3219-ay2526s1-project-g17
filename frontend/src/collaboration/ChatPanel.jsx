export default function ChatPanel({ sessionId }) {
    return (
        <div style={{ padding: '15px', height: '100%' }}>
            <h3>Collaborative Chat</h3>
            <p>User1: Ready to start?</p>
            <p>User2: Yep!</p>
            {/* Real implementation would use Socket.IO for message exchange */}
            <input type="text" placeholder="Type a message..." style={{ width: '90%', marginTop: '10px' }} />
        </div>
    );
}