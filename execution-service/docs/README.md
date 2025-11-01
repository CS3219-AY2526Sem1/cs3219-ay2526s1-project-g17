# Execution Service

This microservice is responsible for executing user-submitted code within Peerprep platform.

## Quick Start
### 1. Install dependencies:
```
npm install
```
### 2. Configure environment variables:
```
cp .env.example .env
```

### 3. Run the service:
```
npm start
```
Or with auto-reload during development:
```
npm run dev
```

You should see:
```
{"level":"INFO","message":"Configuration validated successfully"}
{"level":"INFO","message":"Server started","port":----}
```

## Configuration
Copy `.env.example` to `.env` and fill in your Judge0 URLs:

### Required Configuration
* `SELF_JUDGE0_URL`: Your self-hosted Judge0 instance URL (e.g., http://localhost:2358)

### Optional Configuration
**RapidAPI Fallback:**
* `RAPIDAPI_BASE`: RapidAPI Judge0 base URL
* `RAPIDAPI_HOST`: RapidAPI host
* `RAPIDAPI_KEY`: Your RapidAPI key

**Server Settings:**
* `PORT`: Server port (default: 4000)

**Execution Settings:**
* `MAX_WAIT_MS`: Maximum wait time for code execution (default: 30000)
* `POLL_INTERVAL_MS`: Polling interval (default: 500)
* `REQUEST_TIMEOUT`: HTTP request timeout (default: 35000)

**Circuit Breaker:**
* `CIRCUIT_BREAKER_THRESHOLD`: Failures before circuit opens (default: 5)
* `CIRCUIT_BREAKER_RESET_MS`: Time before retry (default: 60000)

**Logging:**
* `LOG_LEVEL`: Logging level - error, warn, info, debug (default: info)

## API Endpoints

* `GET /healthz` - Health check
* `GET /languages` - List available programming languages
* `GET /supported-languages` - Get language name mappings
* `POST /execute` - Execute code (using self-hosted Judge0)
* `POST /run` - Execute code (using RAPIDAPI Judge0 API)