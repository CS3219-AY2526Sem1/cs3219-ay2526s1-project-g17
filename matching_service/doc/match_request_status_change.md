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
