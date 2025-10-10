# Collaboration Service

This microservice provides real-time collaborative coding sessions for matched users on PeerPrep.

## Features
- Create, join, and terminate collaborative sessions
- Real-time code editing (via Socket.io)
- REST API for session management

## Setup
1. Copy `.env.sample` to `.env` and fill in your MongoDB URI and desired port.
2. Run `npm install` to install dependencies.
3. Start the service with `npm start`.

## API Endpoints
- `POST /api/collaboration/session` - Create a new session
- `POST /api/collaboration/session/join` - Join an existing session
- `POST /api/collaboration/session/terminate` - Terminate a session

## Real-time Collaboration
Connect to the Socket.io server at `/` to send/receive code changes in real time.

## Graceful Termination
Sessions can be ended by either user, and resources are cleaned up automatically.

---

See `controller/collaboration-controller.js` and `routes/collaboration-routes.js` for implementation details.
