# Collaboration Service Architecture

This document explains the architecture and logic of the **Collaboration Service**, which enables real-time collaborative code editing using **CRDTs (Yjs)**, **WebSocket**, and **Socket.IO**.

---

## Core Design Principles

The service follows a **hybrid architecture** that separates concerns:

| Layer | Technology | Purpose |
|------|-----------|--------|
| **Collaborative Editing** | Yjs + raw WebSocket (`/collab`) | Sync code/content using CRDTs (conflict-free, efficient) |
| **Session & Presence Logic** | Socket.IO | Manage users, rooms, metadata, and auto-cleanup |
| **Persistence** \(To be implemented) | MongoDB | Store session metadata (Nice-to-have(To be implemented): Yjs state via `y-mongodb`) |

This design ensures:
- ✅ **True real-time collaboration** (no lost edits)
- ✅ **Efficient delta sync** (not full document)
- ✅ **Automatic session cleanup** after inactivity
- ✅ **Scalable separation** of sync vs. app logic

---
## Architecture Diagram

![Architecture Diagram](collaboration-service%20architecture%20diagram.png)
---

## Sequence Diagram: Peer Interaction Flow

Below is the sequence of events when two users collaborate on a session.

```mermaid
sequenceDiagram
    participant ClientA as Client A
    participant ClientB as Client B
    participant SocketIO as Socket.IO Server
    participant YjsWS as Yjs WebSocket Server (/collab)
    participant DB as MongoDB

    Note over ClientA,ClientB: 1. Join Session (App Logic)

    ClientA->>SocketIO: joinSession({ sessionId, userId: "A" })
    SocketIO->>DB: (Optional) Fetch session metadata
    SocketIO-->>ClientA: (Optional) codeUpdate / metadata
    SocketIO->>ClientB: userJoined({ userId: "A" })

    ClientB->>SocketIO: joinSession({ sessionId, userId: "B" })
    SocketIO->>ClientA: userJoined({ userId: "B" })

    Note over ClientA,ClientB: 2. Connect to Yjs Doc (Collaboration)

    ClientA->>YjsWS: WebSocket CONNECT /collab?sessionId=abc
    YjsWS->>YjsWS: Create or reuse Y.Doc("abc")

    ClientB->>YjsWS: WebSocket CONNECT /collab?sessionId=abc
    YjsWS->>YjsWS: Join existing Y.Doc("abc")

    Note over ClientA,ClientB: 3. Real-Time Editing (CRDT Sync)

    ClientA->>YjsWS: Yjs binary update (insert "hello")
    YjsWS->>ClientB: Forward Yjs update
    ClientB->>ClientB: Apply CRDT → UI updates

    ClientB->>YjsWS: Yjs binary update (append " world")
    YjsWS->>ClientA: Forward Yjs update
    ClientA->>ClientA: Apply CRDT → UI updates

    Note over ClientA,ClientB: 4. Auto-Cleanup on Inactivity

    ClientA->>SocketIO: DISCONNECT
    ClientB->>SocketIO: DISCONNECT

    SocketIO->>SocketIO: Start 30s idle timer
    alt No one reconnects
        SocketIO->>DB: Mark session as inactive
        SocketIO->>ClientA: sessionTerminated (if reconnected)
        SocketIO->>ClientB: sessionTerminated (if reconnected)
    end