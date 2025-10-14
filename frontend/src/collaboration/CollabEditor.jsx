import { useEffect, useRef } from "react";
import { Editor } from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";

export default function CollabEditor({ sessionId }) {
    const ydocRef = useRef(null);
    const providerRef = useRef(null);
    const bindingRef = useRef(null);

    const onMount = (editor) => {
        // create a Yjs doc + text
        const ydoc = new Y.Doc();
        const ytext = ydoc.getText("code");

        // connect to backend’s Yjs server at /collab?sessionId=...
        const WS_BASE = import.meta.env.VITE_WS_BASE || "ws://localhost:3002";
        const wsUrl = `${WS_BASE}/collab?sessionId=${encodeURIComponent(sessionId)}`;
        const provider = new WebsocketProvider(wsUrl, sessionId, ydoc);

        // bind Monaco <-> Yjs
        const model = editor.getModel();
        const binding = new MonacoBinding(ytext, model, new Set([editor]), ydoc);

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
