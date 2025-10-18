# Set operation

## status

### waiting

search for existing again
if found then create a matched entry for both then change to pending
The initiator will create the following
matched_pair:user1Id:user2Id (ids are arranged by in order)
user1Accept: false
user2Accept: false

matched_details:user1Id
user2's id
matched_details:user2
user1's id

Only the initiator will listen to the match_pair key
if not found do nothing

# Objects stored on redis

```typescript

type Criteria = {
  difficulty: "easy" | "medium" | "hard";
  language: string;
  topic: string;
};

// Clear on close
type MatchedRequestEntity = {
  userId: String;
  status: "waiting" | "pending" | "matched" | "initial";
  criterias: Criteria[];
  time: number;
};

// Clear on collaboration server request
type CollaborationSession = {
  session: string;
};

// Never clear, should replace
type MatchedDetails = {
  accepts: boolean;
  partner: string;
  criteria: Criteria;
};
```
