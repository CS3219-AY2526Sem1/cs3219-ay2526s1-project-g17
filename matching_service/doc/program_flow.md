
## High Level Matching Program Flow

### Initial Matching
``` mermaid
sequenceDiagram
    participant Client as Client App
    participant MS as Matching Service
    participant Redis as Redis Store
    participant CS as Collaboration Service Server
    participant QS as Question Service Server

    Client->>MS: GET /initiateMatch
    MS->>Redis: Get collaboration session
    MS->>CS: Verify session exists
    CS-->>MS: Session status
    alt Has live session
        MS-->>Client: Session details (Live details)
    else No live session
        MS-->>Client: Session details (No Live session message)
        Client->>MS: WebSocket connect + match-request
        MS->>Redis: Store match request
        MS->>MS: Find compatible match
        MS->>Redis: Save match details
        MS->>Redis: Create collaboration session (temporary)
        MS->>CS: Create collaboration Session (persistent)
        MS->>QS: Get random question
        QS-->>MS: Random Question
        MS-->>Client: match-found + session details
    end
```