# How to run the service using docker
1. cd question_service
2. docker build -t question_service .
3. docker run -p 5001:5001 -e MONGO_URI="insert uri" -e PORT=5001 UPSTASH_REDIS_REST_URL="insert url" -e UPSTASH_REDIS_REST_TOKEN="insert token" question_service