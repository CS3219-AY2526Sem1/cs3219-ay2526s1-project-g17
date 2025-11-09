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
- Upstash Redis account

**Steps:**

1. Clone repository:
```bash
git clone https://github.com/your-org/cs3219-ay2526s1-project-g17.git
cd cs3219-ay2526s1-project-g17/question_service
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
PORT=5001
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://your-api-identifier
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

4. Start development server:
```bash
npm run dev
```

5. Verify service:
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
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis REST URL | `https://your-redis.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis authentication token | `your-token` |

### MongoDB Configuration

**Connection String Format:**
```
mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

**Database Name:** `peerprep` (or as specified in connection string)  
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

### Rate Limiting Configuration

**Upstash Redis:**
- Rate limits managed by Upstash dashboard
- Default limits: 100 requests per 15 minutes per IP
- Adjust limits based on traffic patterns

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

### Metrics

**Key Metrics to Monitor:**

1. **Request Rate:**
   - Requests per second
   - Peak traffic times

2. **Response Time:**
   - Average response time
   - p95 and p99 latency

3. **Error Rate:**
   - 4xx errors (client errors)
   - 5xx errors (server errors)

4. **Database Metrics:**
   - Query execution time
   - Connection pool utilization
   - Failed connection attempts

5. **Resource Utilization:**
   - CPU usage
   - Memory usage
   - Network I/O

**Monitoring Tools:**
- Google Cloud Monitoring for Cloud Run deployments
- MongoDB Atlas monitoring dashboard
- Upstash Redis dashboard

### Alerts

**Recommended Alerts:**

1. **Service Down:** Alert if health check fails for 5 minutes
2. **High Error Rate:** Alert if 5xx error rate exceeds 5% for 10 minutes
3. **High Latency:** Alert if p95 latency exceeds 2 seconds for 10 minutes
4. **Database Connection Failures:** Alert on any database connection errors
5. **Rate Limit Exceeded:** Alert if rate limiting is frequently triggered

## Troubleshooting

### Common Issues

#### Issue: Service Won't Start

**Symptoms:**
- Server crashes immediately after start
- "Cannot connect to MongoDB" error

**Diagnosis:**
```bash
# Check environment variables
cat .env

# Test MongoDB connection
mongosh "mongodb+srv://username:password@cluster.mongodb.net/database"

# Check if port is already in use
netstat -an | grep 5001
```

**Solutions:**
1. Verify `MONGO_URI` is correct in `.env`
2. Check MongoDB Atlas network access allows your IP
3. Ensure MongoDB user has correct permissions
4. Kill process using port 5001: `lsof -ti:5001 | xargs kill -9`

#### Issue: Authentication Errors (401/403)

**Symptoms:**
- POST/PUT/DELETE requests return 401 or 403
- "Unauthorized" or "Insufficient permissions" error

**Diagnosis:**
```bash
# Test with valid token
curl -X POST http://localhost:5001/api/questions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test", "question":"Test", "difficulty":"Beginner", "topics":["test"], "link":"http://example.com"}'
```

**Solutions:**
1. Verify Auth0 domain and audience in `.env`
2. Check token has `admin:all` permission in Auth0 dashboard
3. Ensure token is not expired (check exp claim)
4. Verify middleware is correctly configured in routes

#### Issue: Random Question Not Found (404)

**Symptoms:**
- `GET /api/questions/randomQuestion` returns 404
- "No question matches the defined criteria" error

**Diagnosis:**
```bash
# Check available topics
curl http://localhost:5001/api/questions/topics

# Check available topics by difficulty
curl http://localhost:5001/api/questions/topicsByDifficulty

# Try with known good parameters
curl "http://localhost:5001/api/questions/randomQuestion?difficulty=Beginner&topics=array"
```

**Solutions:**
1. Verify questions exist with the requested difficulty and topic
2. Check spelling of difficulty (case-sensitive: "Beginner", "Intermediate", "Advanced")
3. Ensure topic parameter is a single topic string, not comma-separated
4. Add questions with required difficulty/topic combination

#### Issue: Tests Fail on Windows

**Symptoms:**
- `npm test` fails with "NODE_OPTIONS is not recognized"
- Jest configuration errors

**Diagnosis:**
```bash
# Check package.json test script
type package.json | findstr "test"
```

**Solutions:**
1. Ensure `cross-env` is installed: `npm install cross-env --save-dev`
2. Update test script in package.json:
   ```json
   "test": "cross-env NODE_OPTIONS=--experimental-vm-modules jest"
   ```
3. Clear Jest cache: `npx jest --clearCache`

#### Issue: Docker Build Fails

**Symptoms:**
- Docker build stops with error
- "Cannot find module" errors in container

**Diagnosis:**
```bash
# Check Dockerfile syntax
docker build --no-cache -t question-service .

# Check .dockerignore
type .dockerignore
```

**Solutions:**
1. Ensure `node_modules` is in `.dockerignore`
2. Verify `package.json` and `package-lock.json` exist
3. Check for missing dependencies in `package.json`
4. Use `npm ci` instead of `npm install` in Dockerfile

#### Issue: High Memory Usage

**Symptoms:**
- Container restarts frequently
- Out of memory errors in logs

**Diagnosis:**
```bash
# Check container memory usage
docker stats question-service

# Check MongoDB connection pool
# View logs for "too many connections" warnings
```

**Solutions:**
1. Increase container memory limit
2. Reduce MongoDB connection pool size in Mongoose config
3. Check for memory leaks in controller functions
4. Implement pagination for large result sets

### Database Issues

#### Issue: Slow Query Performance

**Symptoms:**
- High response times on endpoints
- Timeout errors

**Diagnosis:**
1. Check MongoDB Atlas monitoring dashboard
2. View slow query logs in Atlas
3. Analyze query execution plans

**Solutions:**
1. Verify indexes are created: `db.questions.getIndexes()`
2. Add indexes for frequently queried fields
3. Use aggregation pipelines instead of client-side processing
4. Enable query result caching

#### Issue: Database Connection Pool Exhausted

**Symptoms:**
- "No connection available" errors
- Intermittent 500 errors under load

**Solutions:**
1. Increase connection pool size in Mongoose config
2. Ensure connections are properly closed after use
3. Check for long-running queries blocking connections
4. Scale MongoDB cluster to handle more connections

### Rate Limiting Issues

#### Issue: Legitimate Users Rate Limited

**Symptoms:**
- Users report 429 errors
- Rate limit triggered frequently

**Diagnosis:**
```bash
# Check Upstash Redis dashboard
# View rate limit metrics
```

**Solutions:**
1. Increase rate limits in Upstash configuration
2. Implement user-based rate limiting instead of IP-based
3. Add authenticated user exemptions
4. Use sliding window instead of fixed window

## Maintenance

### Database Maintenance

**Regular Tasks:**

1. **Backup Database:**
   - MongoDB Atlas automated backups enabled
   - Manual snapshot: Atlas dashboard > Backup > Take Snapshot

2. **Index Maintenance:**
   - Check index usage: `db.questions.aggregate([{$indexStats:{}}])`
   - Drop unused indexes to save storage

3. **Data Cleanup:**
   - Remove duplicate questions (if any)
   - Archive old or deprecated questions

**Commands:**

```javascript
// Connect to MongoDB
mongosh "mongodb+srv://cluster.mongodb.net/peerprep"

// Check collection stats
db.questions.stats()

// View all indexes
db.questions.getIndexes()

// Rebuild indexes (if needed)
db.questions.reIndex()

// Check for duplicates
db.questions.aggregate([
  { $group: { _id: "$title", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
```

### Dependency Updates

**Check for Updates:**
```bash
npm outdated
```

**Update Dependencies:**
```bash
# Update all dependencies to latest compatible versions
npm update

# Update specific dependency
npm update express

# Update to latest major version
npm install express@latest
```

**Test After Updates:**
```bash
npm test
npm run dev
# Verify all endpoints work correctly
```

### Security Updates

**Monitor Security Vulnerabilities:**
```bash
npm audit
```

**Fix Vulnerabilities:**
```bash
# Automatically fix vulnerabilities
npm audit fix

# Force update (may introduce breaking changes)
npm audit fix --force
```

**Update Node.js:**
- Update base Docker image to latest Node.js 22 version
- Test thoroughly before deploying

### Scaling

**Horizontal Scaling:**

1. **Docker Compose:**
```bash
docker-compose up -d --scale question-service=3
```

2. **Kubernetes:**
```yaml
replicas: 3
```

3. **Google Cloud Run:**
   - Configure auto-scaling: Min 1, Max 10 instances
   - Set concurrency per instance: 80 requests

**Database Scaling:**
- MongoDB Atlas auto-scales within cluster tier
- Upgrade cluster tier for more resources
- Add read replicas for read-heavy workloads

### Backup and Recovery

**Backup Strategies:**

1. **Database Backup:**
   - MongoDB Atlas continuous backups (point-in-time recovery)
   - Daily snapshots retained for 7 days

2. **Configuration Backup:**
   - Store `.env` template in secure location
   - Document all environment variable values

3. **Code Backup:**
   - GitHub repository with commit history
   - Tag releases: `git tag -a v1.0.0 -m "Release 1.0.0"`

**Recovery Procedures:**

**Restore Database:**
1. Go to MongoDB Atlas dashboard
2. Navigate to Backups tab
3. Select snapshot to restore
4. Choose restore to new cluster or download

**Rollback Deployment:**
```bash
# List previous revisions
gcloud run revisions list --service question-service

# Rollback to specific revision
gcloud run services update-traffic question-service \
  --to-revisions=question-service-00001-abc=100
```

**Restore Service Configuration:**
1. Retrieve previous commit: `git checkout v1.0.0`
2. Redeploy service with previous version
3. Verify functionality

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

### Database Connection Lost

**Actions:**

1. Check MongoDB Atlas status
2. Verify network connectivity
3. Check IP whitelist in Atlas
4. Restart service to re-establish connection
5. If issue persists, restore from backup to new cluster

### Security Incident

**Actions:**

1. Rotate credentials immediately:
   - MongoDB password
   - Auth0 client secrets
   - Upstash Redis tokens

2. Review access logs for suspicious activity

3. Update environment variables in deployment

4. Restart services with new credentials

5. Notify team and document incident

## Contact and Escalation

**Development Team:**
- Primary Contact: [Team Lead Email]
- Secondary Contact: [Developer Email]
- On-Call Rotation: [Schedule Link]

**External Dependencies:**
- MongoDB Atlas Support: support.mongodb.com
- Auth0 Support: support.auth0.com
- Upstash Support: support@upstash.com
- Google Cloud Support: cloud.google.com/support

**Escalation Path:**
1. Check this runbook for known issues
2. Review logs and metrics
3. Contact development team
4. If infrastructure issue, contact cloud provider support
5. If database issue, contact MongoDB Atlas support

## Additional Resources

**Documentation:**
- API Documentation: `doc/api-documentation.md`
- Design Documentation: `doc/design-documentation.md`
- README: `README.MD`

**External Links:**
- Express Documentation: https://expressjs.com/
- Mongoose Documentation: https://mongoosejs.com/
- Auth0 Documentation: https://auth0.com/docs
- MongoDB Atlas Documentation: https://docs.atlas.mongodb.com/
- Docker Documentation: https://docs.docker.com/
- Google Cloud Run Documentation: https://cloud.google.com/run/docs

**Code Repository:**
- GitHub: https://github.com/your-org/cs3219-ay2526s1-project-g17

## Changelog

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2024-01-XX | 1.0.0 | Initial runbook creation | Team |

---

**Last Updated:** 2024  
**Document Owner:** Development Team  
**Review Schedule:** Quarterly
