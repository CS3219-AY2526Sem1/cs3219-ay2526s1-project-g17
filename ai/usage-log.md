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
2025-10-16
##### Tool:
Gemini 2.5 Pro
##### Prompt/Command:
Prompted Gemini to generate new questions to populate the question service databse
##### Output Summary:
Gemini created new questions and formartted them as a .json object
##### Action Taken:
- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected
##### Author Notes:
Checked for validity of each question and appended it to the original json file containing the 20 example questions


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

##### Date/Time:
2025-10-30 (30 Oct)
##### Tool:
ChatGPT (GPT-5 Thinking)
##### Prompt/Command:
Asked ChatGPT to write unit tests for the routes in the history controller, and another separate test to make sure that the auth0 environment variables are being read properly since this was coming up as an error sometimes.
##### Output Summary:
It wrote the unit tests
##### Action Taken:
- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected
##### Author Notes:
For many of the tests, had to modify the details of the test itself, for example by changing the body of the request to match what the actual request body looks like and had to append code to some tests to include checks for the correct error code and message. 

# Execution Service

# Frontend
##### Date/Time:
2025-08 to 2025-09?
##### Tool:
Github copilot claude sonnet 3.5/4
##### Prompt/Command:
Asked chat to create a UI for matching service's dialog pop up and timer.
##### Output Summary:
Created a working UI for matching criteria selection dialog and timer. But the communication with the backend is not working.
##### Action Taken:
- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected
##### Author Notes:
Only the css and design is kept as it is.
The some UI logic and communication with the backend servers have to be manually added.

##### Date/Time:
2025-10-30 (30 Oct)
##### Tool:
ChatGPT (GPT-5 Thinking)
##### Prompt/Command:
Asked chatGPT to implement a memoised function / react hook to fetch the history in attempt to try to speed up the frontend profile page
##### Output Summary:
Gave me a useMemo and useCallback hook which I had to modify to call the correct backend service, and had to fix the dependency array to make it actually work and fix the trycatch error block to catch the correct error.
##### Action Taken:
- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected
##### Author Notes:
Was initially not functioning properly and so the trycatch error block had to be manually corrected, and the dependency array and the actual API calls had to be modified for it to work properly. 

##### Date/Time:
2025-10-30 (30 Oct)
##### Tool:
ChatGPT (GPT-5 Thinking)
##### Prompt/Command:
Asked ChatGPT to write s useEffect hook to load the questions, given the props that I had selected to pass to the component. 
##### Output Summary:
Gave me a useEffect with an asynchronous function to load the questions
##### Action Taken:
- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected
##### Author Notes:
The initial was a little bit more complicated then necessary so cut down some lines of code, and changed some of the API calls to work with the deployment and then changed the dependency array to match the changes. Verified correctness later by testing the frontend manually with different situations on both local and cloud deployment