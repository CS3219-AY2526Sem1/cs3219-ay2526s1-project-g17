import { configDotenv } from "dotenv";
import redisRepository from "./redis_repository.js";

export async function initializeRedis() {
  configDotenv();
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("REDIS_URL environment variable is required");
  }

  await redisRepository.connect(redisUrl);
  console.log("🔌 Redis integration initialized");
}


export async function cleanup() {
  await redisRepository.disconnect();
  console.log("🧹 Redis cleanup completed");
}
