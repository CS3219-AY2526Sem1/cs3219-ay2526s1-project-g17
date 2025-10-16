import { useEffect, useRef } from "react";
import { Editor } from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import { io } from "socket.io-client";

export default function CollabEditor({
                                         sessionId,
                                         userId,
                                         language = "javascript", // Now, selection of languages is available. Change this to allow matching-service to determine this.
                                         theme = "vs-dark",
                                         onAwareness = () => {},
                                     }) {
    const ydocRef = useRef(null);
    const providerRef = useRef(null);
    const bindingRef = useRef(null);
    const editorRef = useRef(null);

    const onMount = (editor) => {
        editorRef.current = editor;
        window.__monaco_editor__ = editor;

        // create a Yjs doc + text
        const ydoc = new Y.Doc();
        const ytext = ydoc.getText("code");

        // connect to Socket.IO for session management
        const SOCKET_IO_BASE = import.meta.env.VITE_SOCKET_IO_BASE || "http://localhost:3002";
        const socket = io(SOCKET_IO_BASE, { reconnection: true });

        // logs
        socket.on('connect', () => {
            console.log('Connected to Socket.IO server');
            socket.emit('joinSession', { sessionId, userId: `user-${Math.floor(Math.random() * 1000)}` });
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from Socket.IO server');
        });

        socket.on('initialDoc', (encodedUpdate) => {
            Y.applyUpdate(ydoc, encodedUpdate);
            console.log('Applied initial document update from server');
        });

        socket.on('userJoined', (data) => {
            console.log(`User joined: ${data.userId}`);
        });

        socket.on('sessionTerminated', () => {
            console.log('Session terminated by server');
            // Optionally handle session termination (e.g., disable editor)
        });

        // connect to backend's Yjs server at /collab?sessionId=...
        const WS_BASE = import.meta.env.VITE_WS_BASE || "ws://localhost:3002";
        const wsUrl = `${WS_BASE}/collab?sessionId=${encodeURIComponent(sessionId)}`;
        const provider = new WebsocketProvider(wsUrl, sessionId, ydoc);

        // "awareness" as in header avatars will appear on the top-right if a user joins
        // this also sets the name/colour for those header avatars
        provider.awareness.setLocalStateField("user", {
            name: userId,
            color: colorFor(userId),
        });
        const updatePeers = () => {
            const peers = Array.from(provider.awareness.getStates().entries()).map(([clientId, s]) => ({
                clientId, name: s?.user?.name || "Anon", color: s?.user?.color || "#ddd"
            }));
            onAwareness(peers);
        };
        provider.awareness.on("update", updatePeers);
        updatePeers();

        // bind Monaco and Yjs
        const model = editor.getModel();
        const binding = new MonacoBinding(ytext, model, new Set([editor]), ydoc);

        // cursor position and detection
        editor.onDidChangeCursorPosition((e) => {
            const pos = e.position;
            const el = document.getElementById("cursor-pos");
            if (el) el.textContent = `Ln ${pos.lineNumber}, Col ${pos.column}`;
        });

        // keep refs for cleanup
        ydocRef.current = ydoc;
        providerRef.current = provider;
        bindingRef.current = binding;
    };

    useEffect(() => {
        return () => {
            bindingRef.current?.destroy?.();
            providerRef.current?.destroy?.();
            ydocRef.current?.destroy?.();
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

function colorFor(id) {
    const colors = ["#ffd166","#06d6a0","#118ab2","#ef476f","#73d2de","#c792ea","#ff9e64"];
    let h = 0; for (let i=0;i<id.length;i++) h = (h*31 + id.charCodeAt(i)) & 0xffffffff;
    return colors[Math.abs(h) % colors.length];
}