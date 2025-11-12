# Question Service

The Question Service is a RESTful API microservice for managing coding questions in the PeerPrep application. It provides endpoints for creating, reading, updating, and deleting questions, as well as retrieving questions by difficulty and topic, and fetching random questions for matched users.

**Key Features:**
- CRUD operations for coding questions
- Topic-based filtering and queries
- Random question selection by difficulty and topic
- Auth0 JWT authentication for admin operations
- MongoDB for flexible document storage

**Technology Stack:**
- Runtime: Node.js 22
- Framework: Express 5.1.0
- Database: MongoDB Atlas
- Authentication: Auth0
- Containerization: Docker

## Documentation

For comprehensive information about the Question Service, refer to the following documentation:

- **[API Documentation](doc/api-documentation.md)** - Complete API reference with endpoints, request/response formats, and examples
- **[Design Documentation](doc/design-documentation.md)** - Architecture decisions, database design, and technology rationale
- **[Runbook](doc/runbook.md)** - Deployment procedures, configuration, monitoring, and troubleshooting guide

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables in .env
MONGO_URI=your_mongodb_uri
PORT=5001
AUTH0_DOMAIN=your_auth0_domain
AUTH0_AUDIENCE=your_auth0_audience

# Start development server
npm run dev

# Run tests
npm test
```

## API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/questions` | Get all questions | No |
| GET | `/api/questions/:id` | Get question by ID | No |
| GET | `/api/questions/topics` | Get all unique topics | No |
| GET | `/api/questions/topicsByDifficulty` | Get topics grouped by difficulty | No |
| GET | `/api/questions/randomQuestion` | Get random question ID by difficulty and topic | No |
| POST | `/api/questions` | Create a new question | Admin |
| POST | `/api/questions/insertMany` | Bulk insert questions | Admin |
| PUT | `/api/questions/:id` | Update a question | Admin |
| DELETE | `/api/questions/:id` | Delete a question | Admin |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | Yes | MongoDB connection string |
| `PORT` | No | Server port (default: 5001) |
| `AUTH0_DOMAIN` | Yes | Auth0 tenant domain |
| `AUTH0_AUDIENCE` | Yes | Auth0 API identifier |

## Docker

```bash
# Build image
docker build -t question-service .

# Run container
docker run -p 5001:5001 --env-file .env question-service
```