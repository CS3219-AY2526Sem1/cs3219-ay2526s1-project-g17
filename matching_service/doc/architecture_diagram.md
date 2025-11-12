# Architecture diagram
![High Level Architecture Diagram](./High%20Level%20Matching%20Service%20Architecture%20Diagram.drawio.png)

## Collaboration service
Keeps tracks of collaboration information temporarily. Is removed once the session is over. The collaboration service server will keep a persistent copy.

It holds the ids of the user, the match criteria such as topic, difficulty and language, the question id and session id.

**Note**
Needs to know both user's id to retrieve this information.

## Match Request Service
Keeps track of match request from client. Once client is matched with a user, the relevent requests will then be removed from the redis.

## Matched Details Service
Keeps track of the match details of the matched users. It is used in conjunction with collaboration service to keep track of the ongoing session. It holds the partner's id and matched criteria.

Unlike collaboration service, this information can be retrieved without needing to know the partner's id. Thus, this is solely used to retrieve the collaboration service.

## User service
Keeps track of user id and websocket instance to communicate with the client.