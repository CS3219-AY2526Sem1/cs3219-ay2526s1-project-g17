# Question Service API Guide

## Endpoints

### Get All Questions

- **HTTP Method:** `GET`
- **Endpoint:** `http://localhost:5001/api/questions`
- **Description:** Retrieves all questions from the database.

| Response Code | Explanation                                 |
|--------------|---------------------------------------------|
| 200 (OK)     | Success, all questions returned              |
| 500          | Internal server error                        |

---

### Get Question by ID

- **HTTP Method:** `GET`
- **Endpoint:** `http://localhost:5001/api/questions/{questionId}`
- **Parameters:**
	- Required: `questionId` path parameter
	- Example: `http://localhost:5001/api/questions/60c72b2f9b1d4c3a2e5f8b4c`

| Response Code | Explanation                                 |
|--------------|---------------------------------------------|
| 200 (OK)     | Success, question data returned              |
| 404          | Question not found                           |
| 500          | Internal server error                        |

---

### Create Question

- **HTTP Method:** `POST`
- **Endpoint:** `http://localhost:5001/api/questions`
- **Headers:**
	- Required: `Authorization: Bearer <JWT_ACCESS_TOKEN>` (admin only)
- **Body:**
	- Required: `title`, `question`, `difficulty`, `topics`, `link`
	- Optional: `testCases`, `constraints`, `hints`, `solution`

| Response Code | Explanation                                 |
|--------------|---------------------------------------------|
| 201 (Created)| Question created successfully                |
| 400          | Missing required fields                      |
| 401/403      | Unauthorized or insufficient permissions     |
| 500          | Internal server error                        |

---

### Edit Question

- **HTTP Method:** `PUT`
- **Endpoint:** `http://localhost:5001/api/questions/{questionId}`
- **Headers:**
	- Required: `Authorization: Bearer <JWT_ACCESS_TOKEN>` (admin only)
- **Body:**
	- At least one of the question fields to update

| Response Code | Explanation                                 |
|--------------|---------------------------------------------|
| 200 (OK)     | Success, question updated                    |
| 404          | Question not found                           |
| 401/403      | Unauthorized or insufficient permissions     |
| 500          | Internal server error                        |

---

### Delete Question

- **HTTP Method:** `DELETE`
- **Endpoint:** `http://localhost:5001/api/questions/{questionId}`
- **Headers:**
	- Required: `Authorization: Bearer <JWT_ACCESS_TOKEN>` (admin only)

| Response Code | Explanation                                 |
|--------------|---------------------------------------------|
| 200 (OK)     | Success, question deleted                    |
| 404          | Question not found                           |
| 401/403      | Unauthorized or insufficient permissions     |
| 500          | Internal server error                        |

---

### Get Random Question ID by Difficulty and Topics

- **HTTP Method:** `GET`
- **Endpoint:** `http://localhost:5001/api/questions/randomQuestion`
- **Query Parameters:**
	- `difficulty` (string)
	- `topics` (comma-separated string, e.g. `array,recursion`)
- **Description:** Returns the ID of a random question matching the criteria.

| Response Code | Explanation                                 |
|--------------|---------------------------------------------|
| 200 (OK)     | Success, question ID returned                |
| 404          | No matching question found                   |
| 500          | Internal server error                        |

---

### Get All Topics

- **HTTP Method:** `GET`
- **Endpoint:** `http://localhost:5001/api/questions/topics`
- **Description:** Returns a list of all unique topics.

| Response Code | Explanation                                 |
|--------------|---------------------------------------------|
| 200 (OK)     | Success, topics returned                     |
| 500          | Internal server error                        |

---

### Get Topics by Difficulty

- **HTTP Method:** `GET`
- **Endpoint:** `http://localhost:5001/api/questions/topicsByDifficulty`
- **Description:** Returns a mapping of difficulty levels to their unique topics.

| Response Code | Explanation                                 |
|--------------|---------------------------------------------|
| 200 (OK)     | Success, topics by difficulty returned       |
| 500          | Internal server error                        |

---

**Note:**
- All endpoints return JSON responses.
- Admin-only endpoints require a valid JWT with admin privileges.
