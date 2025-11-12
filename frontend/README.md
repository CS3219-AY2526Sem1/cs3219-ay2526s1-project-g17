# Frontend (PeerPrep) — Development & Run Guide

This folder contains the React + Vite frontend for the PeerPrep project. It includes the collaborative coding UI (Monaco editor), chat, and integration with the matching and collaboration microservices.

This README explains how to run the frontend locally, what environment variables it uses, and how to run it with Docker for quick testing.

## Prerequisites
- Node.js 18+ (LTS recommended)
- npm
- (Optional) Docker / Docker Compose for containerized testing

## Quick start — local development

1. Install dependencies

```bash
cd frontend
npm ci
```

2. Start dev server (Vite)

```bash
npm run dev
```

The dev server uses port 5173 by default. Open http://localhost:5173.

### Environment variables

The frontend uses Vite environment variables prefixed with `VITE_`. You can set them in your shell or place them in a `.env` file at the `frontend/` root before starting the dev server.

Important variables used by the frontend in this repo:

- `VITE_MATCHING_SERVICE_BASE` — Base URL for the matching service (e.g. `http://localhost:3001`). The matching service notifies clients when a match is found and provides the `sessionId`.
- `VITE_COLLABORATION_SERVICE_BASE` — Base URL for the collaboration service API (e.g. `http://localhost:3002`). Used for REST calls (session termination, submissions) and to build WS URLs.

Example `.env` (frontend/.env):

```env
VITE_MATCHING_SERVICE_BASE=http://localhost:3001
VITE_COLLABORATION_SERVICE_BASE=http://localhost:3002
```

## How the frontend integrates with matching & collaboration

- The frontend initiates matching via the matching service. When a match is found the matching service notifies the clients (via WebSocket) and returns a `sessionId`.
- The collaboration UI reads `sessionId` from the route (e.g. `/collab/:sessionId`) and connects to the collaboration service (Yjs / y-websocket) using that `sessionId`.
- The collaboration service persists session metadata in MongoDB and can save/load the Yjs CRDT document state.

If you want to run the end-to-end flow locally, start the matching service (port 3001), collaboration service (port 3002 with DB), then the frontend (port 5173). The frontend `.env` should point to the two services.

## Troubleshooting

- WebSocket issues (y-websocket): check browser console and collaboration-service logs for import/export errors (packages must match the server-side y-websocket version).
- CORS / proxy: during development the frontend calls external services directly; if you hit CORS issues, configure the backend or use a local proxy.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

# running frontend via docker
1. cd frontend
2. docker build -t frontend .
3. docker run -p 5173:5173 frontend