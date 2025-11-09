import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export default function ChatPanel({ sessionId, userId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const testUserId1 = 'user-4256';
  const testUserId2 = 'user-567';

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Connect to Socket.IO
  useEffect(() => {
    if (!userId) return;

    // Connect to Socket.IO (for session management)
    const SOCKET_IO_BASE = import.meta.env.VITE_SOCKET_IO_BASE || "http://127.0.0.1:3002";
    const socket = io(SOCKET_IO_BASE, { reconnection: true });
    socketRef.current = socket;
    window.__collab_socket__ = socket;

    socket.on("connect", () => {
        console.log("Connected to Socket.IO server");
        socket.emit("joinSession", { sessionId, userId });
        // socket.emit("joinSession", { sessionId, userId: testUserId1 });
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

      //  Handle submission notifications
      socket.on("alreadySubmitted", () => {
          console.log('⚠️ You have already submitted. Editor is read-only.');
          const editor = window.__monaco_editor__;
          if (editor) {
              editor.updateOptions({ readOnly: true });
          }

          const submitBtn = document.querySelector('.submit-button');
          if (submitBtn) {
              submitBtn.textContent = 'Already Submitted';
              submitBtn.disabled = true;
              submitBtn.style.background = '#6c757d';
          }

          alert('You have already submitted. Your editor is read-only. Click "Leave Session" to exit.');
      });

      socket.on("partnerSubmitted", ({ userId: submittedUserId }) => {
          if (submittedUserId === userId) {
              return;
          }

          // Partner submitted - show notification
          setTimeout(() => {
              const choice = window.confirm(
                  `Your partner has submitted their solution!\n\n` +
                  `What would you like to do?\n\n` +
                  `Click OK to SUBMIT your code now\n` +
                  `Click Cancel to CONTINUE WORKING`
              );

              if (choice) {
                  const submitBtn = document.querySelector('.submit-button');
                  if (submitBtn && !submitBtn.disabled) {
                      submitBtn.click();
                  }
              }
          }, 500);
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
      socket.emit('sendMessage', { sessionId, userId, message: input });
  } else {
      console.error("Socket is not connected. Message not sent.");
  }
  setInput('');
};

  return (
    <div className='chat-panel-area'>
      <h3 className='chat-header'>Collaborative Chat</h3>
      
      <div className='chat-container'>
        {messages.map((msg, i) => (
          <div key={i} className='message'>
            <strong className={`chat-user-id ${msg.userId === 'gemini' ? 'gemini' : ''}`}>{msg.userId}:</strong> {msg.message}
          </div>
        ))}
        <div ref={messagesEndRef}/>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className='chat-input-box'
        />
        <button type="submit" className='chat-submit-button'>Send</button>
      </form>
    </div>
  );
}