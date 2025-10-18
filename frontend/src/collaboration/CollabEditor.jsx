import { useEffect, useRef } from "react";
import { Editor } from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import { io } from "socket.io-client";

export default function CollabEditor({
    sessionId,
    userId,
    language = "javascript",
    theme = "vs-dark",
    onAwareness = () => {},
}) {
    const ydocRef = useRef(null);
    const providerRef = useRef(null);
    const bindingRef = useRef(null);
    const socketRef = useRef(null);
    const editorRef = useRef(null);

    const onMount = (editor) => {
        editorRef.current = editor;
        window.__monaco_editor__ = editor;

        // create a Yjs doc + text
        const ydoc = new Y.Doc();
        const ytext = ydoc.getText("code");

        // Connect to Socket.IO (for session management)
        const SOCKET_IO_BASE = import.meta.env.VITE_SOCKET_IO_BASE || "http://localhost:3002";
        const socket = io(SOCKET_IO_BASE, { reconnection: true });
        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("Connected to Socket.IO server");
            socket.emit("joinSession", { sessionId, userId: `user-${Math.floor(Math.random() * 1000)}` });
        });

        socket.on("disconnect", () => {
            console.log("Disconnected from Socket.IO server");
        });

        socket.on("initialDoc", (encodedUpdate) => {
            Y.applyUpdate(ydoc, encodedUpdate);
            console.log("Applied initial document update from server");
        });

        socket.on("userJoined", (data) => {
            console.log(`User joined: ${data.userId}`);
        });

        socket.on("sessionTerminated", () => {
            console.log("Session terminated by server");
            editor.updateOptions({ readOnly: true });
        });

        // Connect to Yjs WebSocket provider
        const WS_BASE = import.meta.env.VITE_WS_BASE || "ws://localhost:3002";
        const wsUrl = `${WS_BASE}/collab?sessionId=${encodeURIComponent(sessionId)}`;
        const provider = new WebsocketProvider(wsUrl, sessionId, ydoc);

        // Set awareness (user info for avatars)
        provider.awareness.setLocalStateField("user", {
            name: userId,
            color: colorFor(userId),
        });

        const updatePeers = () => {
            const peers = Array.from(provider.awareness.getStates().entries()).map(([clientId, s]) => ({
                clientId,
                name: s?.user?.name || "Anon",
                color: s?.user?.color || "#ddd",
            }));
            onAwareness(peers);
        };

        provider.awareness.on("update", updatePeers);
        updatePeers();

        // Bind Monaco Editor <-> Yjs
        const model = editor.getModel();
        const binding = new MonacoBinding(
            ytext,
            model,
            new Set([editor]),
            provider.awareness
        );


        // Cursor position tracking
        editor.onDidChangeCursorPosition((e) => {
            const pos = e.position;
            const el = document.getElementById("cursor-pos");
            if (el) el.textContent = `Ln ${pos.lineNumber}, Col ${pos.column}`;
        });

        // Keep refs for cleanup
        ydocRef.current = ydoc;
        providerRef.current = provider;
        bindingRef.current = binding;
    };

    useEffect(() => {
        return () => {
            bindingRef.current?.destroy?.();
            providerRef.current?.destroy?.();
            ydocRef.current?.destroy?.();
            socketRef.current?.disconnect?.();
            if (window.__monaco_editor__ === editorRef.current) {
                delete window.__monaco_editor__;
            }
        };
    }, []);

    return (
        <Editor
            height="100%"
            width="100%"
            theme={theme}
            defaultLanguage={language}
            defaultValue={`// Welcome to PeerPrep collaboration\n// Session: ${sessionId}\n`}
            options={{
                minimap: { enabled: true },
                fontSize: 16,
                smoothScrolling: true,
                automaticLayout: true,
                scrollBeyondLastLine: false,
                renderWhitespace: "selection",
                bracketPairColorization: { enabled: true },
                tabSize: 2,
                padding: { top: 16 },
                rulers: [100],
            }}
            onMount={onMount}
        />
    );
}

// Utility function to pick a consistent color for each user
function colorFor(id) {
    const colors = ["#ffd166","#06d6a0","#118ab2","#ef476f","#73d2de","#c792ea","#ff9e64"];
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
    return colors[Math.abs(h) % colors.length];
}
