# Matching Service API Documentation
> **Note**: This documentation was partially generated with AI.

## Overview

The Matching Service is a real-time matching system that connects users based on their preferences for coding sessions. It provides both REST API endpoints and WebSocket connections for real-time communication.

**Base URL**: `http://localhost:3001` (development) or your deployed service URL

## Authentication

The service uses Auth0 for authentication. Protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Required environment variables:

- `AUTH0_DOMAIN`: Your Auth0 domain
- `AUTH0_AUDIENCE`: Your Auth0 API identifier

## REST API Endpoints

### Health Check

#### GET /

Check if the service is running.

**Response:**

```json
{
  "message": "Hello World from matching service"
}
```

### Matching Operations

#### GET /api/matching/initiateMatch

Check for existing matches and initiate the matching process.

**Authentication**: Required (JWT Bearer token)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string | Yes | The user ID to check for matches |

**Response Codes:**

- `200 OK`: Success
- `400 Bad Request`: Missing or invalid parameters
- `401 Unauthorized`: Invalid or missing authentication token
- `500 Internal Server Error`: Server error

**Response Body:**

_Case 1: Has existing active session_

```json
{
  "code": "has-existing",
  "session": {
    "sessionId": "session_123456789",
    "userIds": ["user1", "user2"],
    "criteria": {
      "type": "criteria",
      "difficulty": "medium",
      "language": "javascript",
      "topic": "algorithms"
    },
    "questionId": "question_123"
  }
}
```

_Case 2: No existing session_

```json
{
  "code": "no-existing"
}
```

**Example Request:**

```bash
curl -X GET "http://localhost:3001/api/matching/initiateMatch?userId=user123" \
  -H "Authorization: Bearer your-jwt-token"
```

#### DELETE /api/matching/endSession

End a collaboration session between two users.

**Authentication**: Not required

**Request Body:**

```json
{
  "userId1": "string",
  "userId2": "string"
}
```

**Response:**

```json
{
  "message": "Session closed"
}
```

**Response Codes:**

- `200 OK`: Session successfully closed
- `400 Bad Request`: Missing userId1 or userId2
- `500 Internal Server Error`: Server error

**Example Request:**

```bash
curl -X DELETE "http://localhost:3001/api/matching/endSession" \
  -H "Content-Type: application/json" \
  -d '{
    "userId1": "user123",
    "userId2": "user456"
  }'
```

## WebSocket API

The service provides real-time matching functionality through Socket.IO WebSocket connections.

### Connection

**Endpoint**: `ws://localhost:3001` (or your deployed service URL)

**Connection Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string | Yes | The user ID (passed as query parameter) |

**Example Connection:**

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3001", {
  query: {
    userId: "user123",
  },
});
```

### Socket Events

#### Client → Server Events

##### `match-request`

Submit a request to find a match based on criteria.

**Payload:**

```javascript
{
  "userId": "string",
  "type": "match-request",
  "criterias": [
    {
      "type": "criteria",
      "difficulty": "easy" | "medium" | "hard",
      "language": "string",
      "topic": "string"
    }
  ],
  "requestId": "string"  // Unique identifier for this request
}
```

#### Server → Client Events

##### `match-found`

Sent when a match is found for the user.

**Payload:**

```javascript
{
  "type": "match-found",
  "session": {
    "sessionId": "string",
    "userIds": ["string", "string"],
    "criteria": {
      "type": "criteria",
      "difficulty": "easy" | "medium" | "hard",
      "language": "string",
      "topic": "string"
    },
    "questionId": "string"
  }
}
```

## Data Types

### Criteria

```typescript
interface Criteria {
  type: "criteria";
  difficulty: "easy" | "medium" | "hard";
  language: string;
  topic: string;
}
```

### CollaborationSession

```typescript
interface CollaborationSession {
  sessionId: string;
  userIds: [string, string];
  criteria: Criteria;
  questionId: string;
}
```

### MatchedDetails

```typescript
interface MatchedDetails {
  partner: string;
  criteria: Criteria;
}
```

## Error Handling

### Common Error Responses

**400 Bad Request:**

```json
{
  "error": {
    "message": "bad request body"
  }
}
```

**401 Unauthorized:**

```json
{
  "error": {
    "message": "Unauthorized"
  }
}
```

**404 Not Found:**

```json
{
  "error": {
    "message": "Route Not Found"
  }
}
```

**500 Internal Server Error:**

```json
{
  "error": {
    "message": "Internal Server Error"
  }
}
```

