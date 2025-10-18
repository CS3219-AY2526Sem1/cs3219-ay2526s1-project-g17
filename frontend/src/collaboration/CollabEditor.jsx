import { useEffect, useRef } from "react";
import { Editor } from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import { io } from "socket.io-client";

export default function CollabEditor({ sessionId }) {
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const socketRef = useRef(null);

  const onMount = (editor, monaco) => {
    // Create Yjs document
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("monaco");
    ydocRef.current = ydoc;

    // Connect to Socket.IO (for session management)
    const SOCKET_IO_BASE =
      import.meta.env.VITE_SOCKET_IO_BASE || "http://localhost:3002";
    const socket = io(SOCKET_IO_BASE, { reconnection: true });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to Socket.IO server");
      socket.emit("joinSession", {
        sessionId,
        userId: `user-${Math.floor(Math.random() * 1000)}`,
      });
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
    const provider = new WebsocketProvider(
      `${WS_BASE}/collab?sessionId=${encodeURIComponent(sessionId)}`,
      sessionId,
      ydoc
    );
    providerRef.current = provider;

    // Bind Monaco Editor <-> Yjs
    const model = editor.getModel();
    const binding = new MonacoBinding(ytext, model, new Set([editor]), provider.awareness);
    bindingRef.current = binding;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      bindingRef.current?.destroy?.();
      providerRef.current?.destroy?.();
      ydocRef.current?.destroy?.();
      socketRef.current?.disconnect?.();
    };
  }, []);

  return (
    <Editor
      height="70vh"
      defaultLanguage="javascript"
      defaultValue="// Start typing together…"
      options={{ minimap: { enabled: false }, automaticLayout: true, fontSize: 14 }}
      onMount={onMount}
    />
  );
}
