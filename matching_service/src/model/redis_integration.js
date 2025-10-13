import { configDotenv } from "dotenv";
import { createRedisClient, RedisRepository } from "./redis_repository";
import { REDIS_URL } from "../server_config";

export async function initializeRedis() {
  configDotenv();

  const redisUrl = REDIS_URL;

  if (!redisUrl) {
    throw new Error("REDIS_URL environment variable is required");
  }

  const redisRepository = new RedisRepository(
    createRedisClient(redisUrl),
    createRedisClient(redisUrl)
  );

  await redisRepository.connect(redisUrl);
  console.log("🔌 Redis integration initialized");
  return redisRepository;
}
