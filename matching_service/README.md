# Matching Service

> **Note**: This documentation was partially generated with AI.

A real-time matching service that pairs users for collaborative coding sessions based on their preferences and criteria. Built with Node.js, Redis Streams, and WebSocket for high-performance, scalable matching.

## 🚀 Features

- **Real-time User Matching**: Connects users with compatible coding partners
- **Criteria-based Matching**: Matches users based on difficulty level, programming language, and topic preferences
- **Redis Streams Integration**: Uses Redis Streams for guaranteed message delivery and horizontal scaling
- **WebSocket Communication**: Real-time bidirectional communication with connected clients
- **Horizontally Scalable**: Multiple service instances can run concurrently

## 📋 Table of Contents

- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [API Documentation](#-api-documentation)
- [Configuration](#-configuration)
## 🏗 Architecture

### Architecture Diagram

For detailed architecture information, see [Architecture Documentation](./doc/architecture_diagram.md).

## Program Flow

### Matching Process

For detailed flow diagrams and sequence charts, see [Program Flow Documentation](./doc/program_flow.md).

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- Redis 6.2+ with RedisSearch module
- Docker (for containerized deployment to be used to docker compose)

## 📖 API Documentation

For complete API documentation with examples, see [API Documentation](./doc/api.md).

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Service port | `3001` | No |
| `NODE_ENV` | Environment | `development` | No |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` | Yes |
| `AUTH0_DOMAIN` | Auth0 domain | Secret | Yes |
| `AUTH0_AUDIENCE` | Auth0 API audience | Secret| Yes |
| `ACCEPTANCE_TIMEOUT` | Match acceptance timeout (ms) | `30000` | No |
| `COLLABORATION_URL` | Collaboration service URL | Secret | Yes |
| `QUESTION_SERVICE_URL` | Question service URL | Secret | Yes |

### Redis Configuration

The service requires Redis with the following modules:
- **RedisSearch**: For efficient user request searching
- **RedisJSON**: For storing complex data structures


## 🛠 Development

### Key Services

- **`MatchingService`**: Core matching logic and user management
- **`RedisRepository`**: Redis operations and stream management
- **`UserService`**: WebSocket connection management
- **`CollaborationService`**: External service integration
- **`MatchRequestService`**: Match request lifecycle

### Development Commands

```bash
# Start in development mode with hot reload
npm run dev

# Run tests
npm test
```

## 🚀 Deployment

Once the code is merged with the master branch, it will automatically be deployed onto google cloud run. This is done through Continuous Deployment script. See .github/workflows/matching-service-cd.yaml for information.


**Built with by the CS3219 G17**