import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export default function ChatPanel({ sessionId, userId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null); // Add this

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Connect to Socket.IO
  useEffect(() => {
    // Connect to Socket.IO (for session management)
    const SOCKET_IO_BASE = import.meta.env.VITE_SOCKET_IO_BASE || "http://127.0.0.1:3002";
    const socket = io(SOCKET_IO_BASE, { reconnection: true });
    socketRef.current = socket;


    socket.on("connect", () => {
        console.log("Connected to Socket.IO server");
        socket.emit("joinSession", { sessionId, userId: `user-chat-${Math.floor(Math.random() * 1000)}` });
    });

    socket.on("disconnect", () => {
        console.log("Disconnected from Socket.IO server");
    });

    socket.on("loadHistory", (history) => {
        console.log('Chat history loaded:', history);
        // Set the state with the full history array
        setMessages(history); 
    });

    socket.on("userJoined", (data) => {
        console.log(`User joined: ${data.userId}`);
    });

    socket.on("sessionTerminated", () => {
        console.log("Session terminated by server");
        editor.updateOptions({ readOnly: true });
    });

    // Listen for messages
    socket.on("receiveMessage", (msg) => {
      console.log('New message received:', msg);
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, userId]);

const handleSubmit = (e) => {
  e.preventDefault();
  if (!input.trim()) return;

  const socket = socketRef.current; // Get the persistent socket instance

  if (socket && socket.connected) {
      socket.emit('sendMessage', { sessionId, message: input });
  } else {
      console.error("Socket is not connected. Message not sent.");
  }
  setInput('');
};

  return (
    <div style={{ padding: '15px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 10px' }}>Collaborative Chat</h3>
      
      <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          border: '1px solid #ccc', 
          padding: '10px',
          marginBottom: '10px',
          borderRadius: '4px'
        }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: '8px' }}>
            <strong>{msg.userId}:</strong> {msg.message}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          style={{ flex: 1, padding: '8px', marginRight: '8px' }}
        />
        <button type="submit" style={{ padding: '8px 12px' }}>Send</button>
      </form>
    </div>
  );
}