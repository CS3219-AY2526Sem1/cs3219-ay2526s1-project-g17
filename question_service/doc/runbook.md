# Question Service Runbook

## Service Overview

**Service Name:** Question Service  
**Runtime:** Node.js 22  
**Framework:** Express 5.1.0  
**Database:** MongoDB Atlas  
**Port:** 5001  
**Repository:** cs3219-ay2526s1-project-g17/question_service  

## Quick Reference

### Service Status Check

```bash
# Check if service is running locally
curl http://localhost:5001/api/questions

# Check Docker container status
docker ps | grep question-service

# Check service logs
docker logs question-service
```

### Common Commands

```bash
# Start service locally
npm run dev

# Start service in production
npm start

# Run tests
npm test

# Build Docker image
docker build -t question-service .

# Start with Docker Compose
docker-compose up question-service
```

## Deployment

### Local Development Setup

**Prerequisites:**
- Node.js 22 or higher
- MongoDB Atlas account with cluster
- Auth0 account with API configured

**Steps:**

1. Clone repository:
```bash
git clone https://github.com/your-org/cs3219-ay2526s1-project-g17.git
cd cs3219-ay2526s1-project-g17/question_service
```

1. Install dependencies:
```bash
npm install
```

1. Create `.env` file:
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
PORT=5001
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://your-api-identifier
```

1. Start development server:
```bash
npm run dev
```

1. Verify service:
```bash
curl http://localhost:5001/api/questions
```

### Docker Deployment

**Build Docker Image:**
```bash
docker build -t question-service:latest .
```

**Run Container:**
```bash
docker run -d \
  --name question-service \
  -p 5001:5001 \
  --env-file .env \
  question-service:latest
```

**Docker Compose:**
```bash
# Start all services
docker-compose up -d

# Start only question service
docker-compose up -d question-service

# View logs
docker-compose logs -f question-service

# Stop services
docker-compose down
```

### Production Deployment (Google Cloud Run)

**Prerequisites:**
- Google Cloud account
- `gcloud` CLI installed and authenticated
- GitHub repository with CI/CD workflows configured

**Manual Deployment:**

1. Build and tag image:
```bash
docker build -t gcr.io/PROJECT_ID/question-service:TAG .
```

2. Push to Google Container Registry:
```bash
docker push gcr.io/PROJECT_ID/question-service:TAG
```

3. Deploy to Cloud Run:
```bash
gcloud run deploy question-service \
  --image gcr.io/PROJECT_ID/question-service:TAG \
  --platform managed \
  --region REGION \
  --allow-unauthenticated \
  --set-env-vars MONGO_URI=$MONGO_URI,AUTH0_DOMAIN=$AUTH0_DOMAIN
```

**Automated Deployment:**

GitHub Actions workflows automatically deploy on push to master:
- `.github/workflows/question-service-ci.yaml`: Builds and tests
- `.github/workflows/question-service-cd.yaml`: Deploys to Cloud Run

**Deployment Verification:**

1. Check deployment status:
```bash
gcloud run services describe question-service --region REGION
```

2. Test deployed service:
```bash
curl https://question-service-HASH-REGION.run.app/api/questions
```

## Configuration

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `MONGO_URI` | Yes | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `PORT` | No | Server port (default: 5001) | `5001` |
| `AUTH0_DOMAIN` | Yes | Auth0 tenant domain | `your-tenant.auth0.com` |
| `AUTH0_AUDIENCE` | Yes | Auth0 API identifier | `https://your-api-identifier` |

### MongoDB Configuration

**Connection String Format:**
```
mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

**Database Name:** `question_service_db` (or as specified in connection string)  
**Collection Name:** `questions`

**Required Indexes:**
- Default `_id` index (automatic)
- Compound index on `{difficulty: 1, topics: 1}` (created by schema)

**Connection Pool Settings:**
- Default Mongoose connection pool (100 connections)
- Connection timeout: 30 seconds
- Server selection timeout: 30 seconds

### Auth0 Configuration

**Required Settings:**
- API created in Auth0 dashboard
- Audience identifier configured
- Permissions: `admin:all` for admin users
- Token expiration: 1 hour (configurable)

**Middleware Configuration:**
- `express-oauth2-jwt-bearer` validates JWT signatures
- Custom middleware checks for required permissions

## Monitoring

### Health Checks

**Basic Health Check:**
```bash
curl http://localhost:5001/api/questions
```

Expected response: HTTP 200 with array of questions (or empty array)

**Database Connectivity Check:**
```bash
curl http://localhost:5001/api/questions/topics
```

Expected response: HTTP 200 with array of topics

### Logging

**Development Logging:**
- Console logs to stdout
- Error messages include stack traces

**Production Logging:**
- Logs sent to Google Cloud Logging (Cloud Run)
- Access logs available in Cloud Run console

**View Logs:**

Local/Docker:
```bash
docker logs question-service --tail 100 -f
```

Google Cloud Run:
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=question-service" --limit 100
```

## Troubleshooting

### Common Issues

#### Issue: Service Won't Start

**Symptoms:**
- Server crashes immediately after start
- "Cannot connect to MongoDB" error

**Solutions:**
1. Verify `MONGO_URI` is correct in `.env`
2. Check MongoDB Atlas network access allows your IP
3. Ensure MongoDB user has correct permissions
4. Kill process using port 5001: `lsof -ti:5001 | xargs kill -9`

#### Issue: Authentication Errors (401/403)

**Symptoms:**
- POST/PUT/DELETE requests return 401 or 403
- "Unauthorized" or "Insufficient permissions" error

**Solutions:**
1. Verify Auth0 domain and audience in `.env`
2. Check token has `admin:all` permission in Auth0 dashboard
3. Ensure token is not expired (check exp claim)
4. Verify middleware is correctly configured in routes

#### Issue: Random Question Not Found (404)

**Symptoms:**
- `GET /api/questions/randomQuestion` returns 404
- "No question matches the defined criteria" error

**Solutions:**
1. Verify questions exist with the requested difficulty and topic
2. Check spelling of difficulty (case-sensitive: "Beginner", "Intermediate", "Advanced")
3. Ensure topic parameter is a single topic string, not comma-separated
4. Add questions with required difficulty/topic combination

## Emergency Procedures

### Service Outage

**Immediate Actions:**

1. Check service status:
```bash
curl http://localhost:5001/api/questions
gcloud run services describe question-service
```

2. Check logs for errors:
```bash
docker logs question-service --tail 100
gcloud logging read "resource.type=cloud_run_revision" --limit 100
```

3. Verify dependencies:
   - MongoDB Atlas status: Check Atlas dashboard
   - Auth0 status: Check Auth0 status page
   - Upstash Redis status: Check Upstash dashboard

4. Restart service:
```bash
# Docker
docker restart question-service

# Cloud Run (redeploy latest working version)
gcloud run deploy question-service --image gcr.io/PROJECT_ID/question-service:LAST_GOOD_TAG
```
