# --- template
##### Date/Time:
YYYY-MM-DD HH:MM
##### Tool:
(e.g., ChatGPT, GitHub Copilot)
##### Prompt/Command:
(copy the main prompt or describe the request)
##### Output Summary:
(short summary of what the AI produced)
##### Action Taken:
- [ ] Accepted as-is
- [ ] Modified
- [ ] Rejected
##### Author Notes:
(what you changed, why, and how you verified correctness)
# ---

# CI/CD

##### Date/Time:
2025-10-25
##### Tool:
GitHub Copilot claude sonnet 4
##### Prompt/Command:
Create for me CI file template and CD file template.
##### Output Summary:
Created two file skeleton for CI CD pipeline
##### Action Taken:
- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected
##### Author Notes:
The skeleton is not useful. Have to make changes to fix my project's needs. For the CD, can't remember if copied from github's template, youtube or from copilot.

# Matching service

##### Date/Time:
2025-09-01 to 2025-11-05
##### Tool:
GitHub Copilot claude sonnet 4
##### Prompt/Command:
Create for me tests for collaboration_service and matched_details_service. Use jest for testing.
##### Output Summary:
Created a test file and util files that are necessary for test.
##### Action Taken:
- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected
##### Author Notes:
Cant remember if the jest config is copied and set-up myself or by copilot as I have to tinker and adjust myself to make it run on node env.

Have to modify a bit for testing environment variables initially. Also asked copilot update and adjust accordingly.

---

##### Date/Time:
2025-10-22
##### Tool:
GitHub Copilot claude sonnet 4
##### Prompt/Command:
Asked copilot to migrate from ws to socket.io
##### Output Summary:
Changed ws to socket io
##### Action Taken:
- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected
##### Author Notes:
The initial change has problem that doesn't work. Have to add reconnection logic and disconnection logic to fit my needs.

---

##### Date/Time:
2025-09 to 2025-10
##### Tool:
GitHub Copilot claude sonnet 4
##### Prompt/Command:
asked copilot to help me fix and debug error for redis search
##### Output Summary:
the ai used regex to search
##### Action Taken:
- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected
##### Author Notes:
no modification were made to it

---

##### Date/Time:
2025-09 to 2025-10
##### Tool:
GitHub Copilot claude sonnet 4
##### Prompt/Command:
asked ai to generate template for atomic transaction
##### Output Summary:
The ai generated a function that change the state of match request atomically.
##### Action Taken:
- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected
##### Author Notes:
Does not work initially. Have debugged using ai and modified during refactoring.

---

##### Date/Time:
2025-09
##### Tool:
GitHub Copilot claude sonnet 4
##### Prompt/Command:
asked ai to separate matching service's matched_details and collaboration functions to two separate class like match request service.
##### Output Summary:
Ai created the files and added comments and logging with emojis.
##### Action Taken:
- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected
##### Author Notes:
The needs changed with times so the files get modified naturally.

---

##### Date/Time:
2025-09
##### Tool:
GitHub Copilot claude sonnet 4
##### Prompt/Command:
Asked ai to migrate from use of mongodb to redis
##### Output Summary:
created redis_integration.js and redis_repository.js
##### Action Taken:
- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected
##### Author Notes:
The code is further changed by me and also with the use of AI down the road.

---

##### Date/Time:
2025-11-03
##### Tool:
GitHub Copilot claude sonnet 4
##### Prompt/Command:
Asked AI to create template  functions for message and event streams.
##### Output Summary:
AI added fuctions for streams for messages and events. The affected files are matching_service.js and resdis_repository.js.
##### Action Taken:
- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected
##### Author Notes:
The generated code is just a template, thus have to add my log message/event handling logic.

---

##### Date/Time:
2025-11-03
##### Tool:
GitHub Copilot claude sonnet 4
##### Prompt/Command:
Asked AI to create template for pub/sub redis function
##### Output Summary:
AI added fuctions pub/sub
##### Action Taken:
- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected
##### Author Notes:
Most of the pub/sub functions are removed and only the necessary functions are kept.


# Question Service

##### Date/Time:
2025-10-24
##### Tool:
GitHub Copilot GPT-4.1
##### Prompt/Command:
Prompted Copilot to create unit tests for the question Service and implement testing using Jest
##### Output Summary:
Copilot created unit tests under the question_service/tests folder
##### Action Taken:
- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected
##### Author Notes:
Appended my own test cases using the same format that was provided by Copilot on top of what was initially already created

# Collaboration Service

# History Service

# Execution Service