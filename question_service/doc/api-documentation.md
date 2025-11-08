# Question Service API Documentation

## Overview

The Question Service provides a REST API for managing coding questions in the PeerPrep application. It handles CRUD operations for questions, retrieval of topics, and random question selection based on difficulty and topics.

**Base URL:** `http://localhost:5001/api/questions`

**Authentication:** Auth0 JWT Bearer tokens required for admin operations (create, update, delete).

## Endpoints

### 1. Get All Questions

Retrieves all questions from the database.

**Request:**
```
GET /api/questions
```

**Headers:**
- None required

**Response:**

Status Code: `200 OK`
```json
[
  {
    "_id": "60c72b2f9b1d4c3a2e5f8b4c",
    "title": "Two Sum",
    "question": "Given an array of integers...",
    "difficulty": "Beginner",
    "topics": ["array", "hash table"],
    "testCases": ["[2,7,11,15], target=9", "[3,2,4], target=6"],
    "constraints": "2 <= nums.length <= 10^4",
    "hints": "Use a hash map to store seen numbers",
    "solution": "Iterate through array and check if complement exists in map",
    "createdAt": "2021-06-14T10:30:00.000Z",
    "updatedAt": "2021-06-14T10:30:00.000Z"
  }
]
```

Status Code: `500 Internal Server Error`
```json
{
  "message": "Internal server error"
}
```

### 2. Get Question by ID

Retrieves a single question by its MongoDB ObjectId.

**Request:**
```
GET /api/questions/:id
```

**Path Parameters:**
- `id` (string, required): MongoDB ObjectId of the question

**Example:**
```
GET /api/questions/60c72b2f9b1d4c3a2e5f8b4c
```

**Response:**

Status Code: `200 OK`
```json
{
  "_id": "60c72b2f9b1d4c3a2e5f8b4c",
  "title": "Two Sum",
  "question": "Given an array of integers...",
  "difficulty": "Beginner",
  "topics": ["array", "hash table"],
  "testCases": ["[2,7,11,15], target=9"],
  "constraints": "2 <= nums.length <= 10^4",
  "hints": "Use a hash map",
  "solution": "Iterate and check complement",
  "createdAt": "2021-06-14T10:30:00.000Z",
  "updatedAt": "2021-06-14T10:30:00.000Z"
}
```

Status Code: `404 Not Found`
```json
{
  "message": "Question not found"
}
```

Status Code: `500 Internal Server Error`
```json
{
  "message": "Internal server error"
}
```

### 3. Create Question

Creates a new question. Requires admin authentication.

**Request:**
```
POST /api/questions
```

**Headers:**
- `Authorization: Bearer <JWT_ACCESS_TOKEN>` (required)
- `Content-Type: application/json` (required)

**Body:**
```json
{
  "title": "Two Sum",
  "question": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
  "difficulty": "Beginner",
  "topics": ["array", "hash table"],
  "testCases": ["[2,7,11,15], target=9", "[3,2,4], target=6"],
  "constraints": "2 <= nums.length <= 10^4",
  "hints": "Use a hash map to store seen numbers",
  "solution": "Iterate through array and check if complement exists in map"
}
```

**Required Fields:**
- `title` (string): Question title
- `question` (string): Full question description
- `difficulty` (string): Must be one of "Beginner", "Intermediate", or "Advanced"
- `topics` (array of strings): List of topics/categories

**Optional Fields:**
- `testCases` (array of strings): Test case examples
- `constraints` (string): Problem constraints
- `hints` (string): Hints for solving the problem
- `solution` (string): Solution description or approach

**Response:**

Status Code: `201 Created`
```json
{
  "savedQuestion": {
    "_id": "60c72b2f9b1d4c3a2e5f8b4c",
    "title": "Two Sum",
    "question": "Given an array of integers nums...",
    "difficulty": "Beginner",
    "topics": ["array", "hash table"],
    "testCases": ["[2,7,11,15], target=9"],
    "constraints": "2 <= nums.length <= 10^4",
    "hints": "Use a hash map",
    "solution": "Iterate and check complement",
    "createdAt": "2021-06-14T10:30:00.000Z",
    "updatedAt": "2021-06-14T10:30:00.000Z"
  }
}
```

Status Code: `401 Unauthorized` or `403 Forbidden`
```json
{
  "message": "Insufficient permissions"
}
```

Status Code: `500 Internal Server Error`
```json
{
  "message": "Internal server error"
}
```

### 4. Edit Question

Updates an existing question. Requires admin authentication.

**Request:**
```
PUT /api/questions/:id
```

**Path Parameters:**
- `id` (string, required): MongoDB ObjectId of the question to update

**Headers:**
- `Authorization: Bearer <JWT_ACCESS_TOKEN>` (required)
- `Content-Type: application/json` (required)

**Body:**
```json
{
  "title": "Two Sum (Updated)",
  "question": "Updated question description...",
  "difficulty": "Intermediate",
  "topics": ["array", "hash table", "dynamic programming"],
  "testCases": ["[2,7,11,15], target=9", "[3,2,4], target=6", "[3,3], target=6"],
  "constraints": "2 <= nums.length <= 10^4",
  "hints": "Consider using a hash map for O(n) solution",
  "solution": "Use hash map to store complements"
}
```

**Note:** All fields are optional in the request body. Only provided fields will be updated.

**Response:**

Status Code: `200 OK`
```json
{
  "_id": "60c72b2f9b1d4c3a2e5f8b4c",
  "title": "Two Sum (Updated)",
  "question": "Updated question description...",
  "difficulty": "Intermediate",
  "topics": ["array", "hash table", "dynamic programming"],
  "testCases": ["[2,7,11,15], target=9", "[3,2,4], target=6", "[3,3], target=6"],
  "constraints": "2 <= nums.length <= 10^4",
  "hints": "Consider using a hash map for O(n) solution",
  "solution": "Use hash map to store complements",
  "createdAt": "2021-06-14T10:30:00.000Z",
  "updatedAt": "2021-06-14T11:45:00.000Z"
}
```

Status Code: `404 Not Found`
```json
{
  "message": "Question not found"
}
```

Status Code: `401 Unauthorized` or `403 Forbidden`
```json
{
  "message": "Insufficient permissions"
}
```

Status Code: `500 Internal Server Error`
```json
{
  "message": "Internal server error"
}
```

### 5. Delete Question

Deletes a question from the database. Requires admin authentication.

**Request:**
```
DELETE /api/questions/:id
```

**Path Parameters:**
- `id` (string, required): MongoDB ObjectId of the question to delete

**Headers:**
- `Authorization: Bearer <JWT_ACCESS_TOKEN>` (required)

**Response:**

Status Code: `200 OK`
```json
{
  "message": "Question deleted successfully"
}
```

Status Code: `404 Not Found`
```json
{
  "message": "Question not found"
}
```

Status Code: `401 Unauthorized` or `403 Forbidden`
```json
{
  "message": "Insufficient permissions"
}
```

Status Code: `500 Internal Server Error`
```json
{
  "message": "Internal server error"
}
```

### 6. Get Random Question ID by Difficulty and Topic

Returns the ID of a random question that matches the specified difficulty and contains at least one of the specified topics.

**Request:**
```
GET /api/questions/randomQuestion?difficulty=<difficulty>&topics=<topic>
```

**Query Parameters:**
- `difficulty` (string, required): One of "Beginner", "Intermediate", or "Advanced"
- `topics` (string, required): Single topic string

**Example:**
```
GET /api/questions/randomQuestion?difficulty=Intermediate&topics=array
```

**Response:**

Status Code: `200 OK`
```json
"60c72b2f9b1d4c3a2e5f8b4c"
```

Status Code: `404 Not Found`
```json
{
  "message": "No question matches the defined criteria"
}
```

Status Code: `500 Internal Server Error`
```json
{
  "message": "Internal server error"
}
```

**Implementation Details:**
- Uses MongoDB aggregation with `$match` to filter by difficulty and topics
- Uses `$sample` to randomly select one question from matching results
- Returns only the `_id` field of the selected question
- If a question has topics `["array", "recursion"]` and the request specifies `topics=array`, it will match
- Both `difficulty` and `topics` parameters are required

### 7. Get All Topics

Returns a sorted list of all unique topics across all questions.

**Request:**
```
GET /api/questions/topics
```

**Headers:**
- None required

**Response:**

Status Code: `200 OK`
```json
[
  "array",
  "binary search",
  "dynamic programming",
  "graph",
  "hash table",
  "linked list",
  "recursion",
  "sorting",
  "string",
  "tree"
]
```

Status Code: `500 Internal Server Error`
```json
{
  "message": "Internal server error"
}
```

**Implementation Details:**
- Uses MongoDB aggregation pipeline
- `$unwind` flattens the topics array from each question
- `$group` collects unique topics
- `$sort` orders topics alphabetically
- Final `$group` consolidates all topics into a single array

### 8. Get Topics by Difficulty

Returns a mapping of difficulty levels to their unique topics.

**Request:**
```
GET /api/questions/topicsByDifficulty
```

**Headers:**
- None required

**Response:**

Status Code: `200 OK`
```json
{
  "Beginner": [
    "array",
    "hash table",
    "linked list",
    "sorting",
    "string"
  ],
  "Intermediate": [
    "array",
    "binary search",
    "dynamic programming",
    "graph",
    "hash table",
    "recursion",
    "tree"
  ],
  "Advanced": [
    "binary search",
    "dynamic programming",
    "graph",
    "recursion",
    "tree"
  ]
}
```

Status Code: `500 Internal Server Error`
```json
{
  "message": "Internal server error"
}
```

**Implementation Details:**
- Retrieves all questions from the database
- Groups topics by difficulty level
- Removes duplicate topics within each difficulty level
- Sorts topics alphabetically within each difficulty level
- Returns object with difficulty levels as keys and sorted topic arrays as values

## Authentication and Authorization

### Protected Endpoints

The following endpoints require authentication and admin permissions:
- `POST /api/questions` (Create Question)
- `PUT /api/questions/:id` (Edit Question)
- `DELETE /api/questions/:id` (Delete Question)

### Authentication Flow

1. Client obtains JWT access token from Auth0
2. Client includes token in `Authorization` header as `Bearer <token>`
3. Service validates token using `express-oauth2-jwt-bearer` middleware
4. Service checks for `admin:all` permission in token claims
5. If valid, request proceeds to controller; otherwise, returns 401/403 error

### Middleware Stack

Protected routes use the following middleware chain:
1. `verifyAccessToken`: Validates JWT signature and expiration
2. `checkRequiredPermissions(['admin:all'])`: Verifies user has admin role

## Error Handling

All endpoints follow consistent error response patterns:

**Error Response Format:**
```json
{
  "message": "Error description"
}
```

**Common Status Codes:**
- `200 OK`: Successful GET, PUT, or DELETE operation
- `201 Created`: Successful POST operation
- `400 Bad Request`: Invalid request body or parameters
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Valid token but insufficient permissions
- `404 Not Found`: Resource does not exist
- `500 Internal Server Error`: Unexpected server error

## Data Model

### Question Schema

```javascript
{
  title: String (required),
  question: String (required),
  difficulty: String (required, enum: ['Beginner', 'Intermediate', 'Advanced']),
  topics: [String] (required),
  testCases: [String] (optional),
  constraints: String (optional),
  hints: String (optional),
  solution: String (optional),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

### Indexes

- Compound index on `{ difficulty: 1, topics: 1 }` for optimized random question queries
