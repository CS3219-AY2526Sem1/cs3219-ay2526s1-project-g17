# Matching Service Sequence Diagrams

This document contains sequence diagrams for the matching service WebSocket flow based on `server.js`.

## 1. Successful Match Flow

```mermaid
sequenceDiagram
    participant C1 as Client A
    participant C2 as Client B
    participant WS as WebSocket Server
    participant Redis as Redis Store
    participant Timer as Timeout Timer

    Note over C1,Timer: User A joins matching queue
    C1->>WS: WebSocket Connection
    WS->>WS: Generate UUID for User A
    C1->>WS: matchRequest {criterias, time}
    WS->>Redis: getAllUserRequests()
    Redis-->>WS: Empty requests
    WS->>Redis: storeUserRequest(userA, request)
    WS->>Redis: listenToRequestChanges(userA)
    WS-->>C1: "client request processed"

    Note over C1,Timer: User B joins with matching criteria
    C2->>WS: WebSocket Connection
    WS->>WS: Generate UUID for User B
    C2->>WS: matchRequest {same criterias}
    WS->>Redis: getAllUserRequests()
    Redis-->>WS: [userA request]
    WS->>WS: hasMatchingCriteria(criteriaA, criteriaB)
    WS->>WS: findMatchingCriteria()
    
    Note over WS: Match found!
    WS->>Redis: storeMatchedPair(userA, userB)
    WS->>C1: matchFound {criteria}
    WS->>C2: matchFound {criteria}
    WS-->>C2: "match found notification sent"
    WS->>Timer: setTimeout(ACCEPTANCE_TIMEOUT)

    Note over C1,C2: Both users accept
    C1->>WS: matchAck {response: "accept"}
    WS->>WS: matchAcceptHandler(userA)
    WS->>WS: Set userA.accepted = true
    
    C2->>WS: matchAck {response: "accept"}
    WS->>WS: matchAcceptHandler(userB)
    WS->>WS: Set userB.accepted = true

    Note over Timer: Timeout triggers
    Timer->>WS: Timeout callback
    WS->>WS: Check both accepted = true
    WS->>WS: getCollaborationSession()
    WS->>C1: sessionCreated {session}
    WS->>C2: sessionCreated {session}
```

## 2. Match Rejection Flow

```mermaid
sequenceDiagram
    participant C1 as Client A
    participant C2 as Client B
    participant WS as WebSocket Server
    participant Redis as Redis Store
    participant Timer as Timeout Timer

    Note over C1,Timer: Users already matched
    C1->>WS: matchAck {response: "accept"}
    WS->>WS: Set userA.accepted = true
    
    C2->>WS: matchAck {response: "reject"}
    Note over WS: Rejection handling (TODO in code)

    Note over Timer: Timeout triggers
    Timer->>WS: Timeout callback
    WS->>WS: Check acceptances
    WS->>WS: userA.accepted = true, userB.accepted = false
    
    WS->>C1: timeoutNotification {reason}
    WS->>C2: timeoutNotification {reason}
    WS->>WS: clearMatchedPairTable(userA, userB)
    WS->>C2: Close WebSocket (non-accepting user)
```

## 3. Timeout Flow (No Response)

```mermaid
sequenceDiagram
    participant C1 as Client A
    participant C2 as Client B
    participant WS as WebSocket Server
    participant Timer as Timeout Timer

    Note over C1,Timer: Users matched but no responses
    Timer->>WS: Timeout callback
    WS->>WS: Check acceptances
    WS->>WS: Both userA.accepted = false, userB.accepted = false
    
    WS->>C1: timeoutNotification {reason}
    WS->>C2: timeoutNotification {reason}
    WS->>WS: clearMatchedPairTable(userA, userB)
    WS->>C1: Close WebSocket
    WS->>C2: Close WebSocket
```

## 4. Redis Change Notification Flow

```mermaid
sequenceDiagram
    participant C1 as Client A
    participant WS as WebSocket Server
    participant Redis as Redis Store
    participant Listener as Redis Listener

    C1->>WS: matchRequest {criterias}
    WS->>Redis: getAllUserRequests()
    Redis-->>WS: No matches
    WS->>Redis: storeUserRequest(userA, request)
    WS->>Redis: listenToRequestChanges(userA)
    
    Note over Redis,Listener: Redis change notification setup
    Redis->>Listener: Key change event
    Listener->>WS: onChange callback
    
    alt operation === "set"
        WS->>WS: Check current status
        WS->>WS: Search for matching criteria
        Note over WS: Handle based on status (waiting/pending/matched)
    else operation === "del" || "expired"
        WS->>WS: Close WebSocket connection
        WS->>WS: Cleanup unsubscriptions
    else
        WS->>WS: Log unknown operation
    end
```

## 5. Disconnection Flow

```memmaid
sequenceDiagram
    participant C1 as Client A
    participant WS as WebSocket Server
    participant Redis as Redis Store

    C1->>WS: WebSocket Close Event
    WS->>WS: handleDisconnect(userInstance)
    WS->>WS: userConnections.delete(userA.id)
    
    Note over WS: TODO: Cleanup logic
    Note over WS: Should remove from Redis
    Note over WS: Should cancel active matches
    Note over WS: Should notify partners
```

## 6. Error Handling Flow

```mermaid
sequenceDiagram
    participant C1 as Client A
    participant WS as WebSocket Server

    C1->>WS: Invalid JSON message
    WS->>WS: JSON.parse() throws error
    WS-->>C1: {type: "error", message: "Invalid JSON"}

    C1->>WS: {typename: "unknown"}
    WS->>WS: handleMessage() default case
    WS-->>C1: {message: "Invalid request typename"}

    Note over WS: Match request processing error
    WS->>WS: handleMatchRequest() throws
    WS->>WS: console.error()
    Note over WS: No error response sent to client
```

## Message Types

### Client to Server Messages

```typescript
// Match Request
{
  typename: "matchRequest",
  criterias: [
    {
      difficulty: "easy" | "medium" | "hard",
      language: string,
      topic: string
    }
  ],
  time: number
}

// Match Acknowledgment
{
  typename: "matchAck", 
  response: "accept" | "reject"
}
```

### Server to Client Messages

```typescript
// Match Found Notification
{
  type: "matchFound",
  details: Criteria
}

// Session Created
{
  session: string // "Some random session"
}

// Timeout Notification
{
  reason: "one of the user never accepts within time limit"
}

// Processing Confirmations
{
  message: "client request processed" | "match found notification sent"
}

// Error Response
{
  type: "error",
  message: string,
  e: Error
}
```

## Redis Operations

### Key Patterns
- **User Requests**: `user_request:{userId}`
- **Matched Pairs**: `matched_pair:{userId1}:{userId2}`
- **Sessions**: `session:{sessionId}`

### Operations Flow
1. **Store Request**: `storeUserRequest(userId, request)`
2. **Get All Requests**: `getAllUserRequests()` 
3. **Store Match**: `storeMatchedPair(user1, user2)`
4. **Listen Changes**: `listenToRequestChanges(userId, callback)`

## Configuration

- **Port**: `process.env.PORT || 3001`
- **Timeout**: `process.env.ACCEPTANCE_TIMEOUT`
- **Redis**: Initialized via `initializeRedis()`

## Notes

- The server uses both in-memory maps and Redis for different purposes
- Change notifications are handled via Redis keyspace events
- Timeout handling uses JavaScript `setTimeout`
- Error handling could be improved (many operations don't send error responses)
- Disconnection cleanup is incomplete (marked as TODO)
- Match rejection logic is not fully implemented