import * as Y from "yjs";
import { io } from "socket.io-client";

export class YSocketIOProvider {
    constructor(doc, opts) {
        this.doc = doc;
        this.room = opts.sessionId;

        // connect
        this.socket = io(opts.url, { transports: ["websocket"] });

        // join room on backend
        this.socket.emit("joinSession", { sessionId: this.room, userId: opts.userId });

        // apply incoming Yjs updates
        this.socket.on("yupdate", ({ update }) => {
            try {
                Y.applyUpdate(this.doc, new Uint8Array(update));
            } catch (e) {
                console.error("[yupdate] apply failed:", e);
            }
        });

        // optional initial state (if server sends plain text snapshot)
        this.socket.on("sessionState", ({ code }) => {
            try {
                const ytxt = this.doc.getText("code");
                if (ytxt.toString() !== code) {
                    ytxt.delete(0, ytxt.length);
                    ytxt.insert(0, code);
                }
            } catch (e) {
                console.error("[sessionState] set failed:", e);
            }
        });

        // forward local Yjs updates to server
        this.onDocUpdate = (update) => {
            try {
                this.socket.emit("yupdate", { sessionId: this.room, update: Array.from(update) });
            } catch (e) {
                console.error("[emit yupdate] failed:", e);
            }
        };
        this.doc.on("update", this.onDocUpdate);

        // end-of-session
        this.socket.on("sessionTerminated", () => {
            this.destroy();
        });

        // handy logs when you’re testing
        this.socket.on("connect", () => console.log("[socket] connected", this.socket.id));
        this.socket.on("disconnect", (r) => console.log("[socket] disconnected:", r));
    }

    destroy() {
        try { this.doc.off("update", this.onDocUpdate); } catch {}
        try { this.socket.disconnect(); } catch {}
    }
}
