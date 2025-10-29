#!/usr/bin/env node

/**
 * Environment Variable Test Script
 * Run this to verify that environment variables are properly loaded
 */

console.log("🔍 Environment Variable Check");
console.log("===========================");

const envVars = [
  "NODE_ENV",
  "ENV",
  "PORT",
  "REDIS_URL",
  "AUTH0_DOMAIN",
  "AUTH0_AUDIENCE",
  "ACCEPTANCE_TIMEOUT",
];

let allSet = true;

envVars.forEach((varName) => {
  const value = process.env[varName];
  const status = value ? "✅" : "❌";
  const displayValue = value
    ? varName.includes("URL") || varName.includes("SECRET")
      ? "[REDACTED]"
      : value
    : "NOT SET";

  console.log(`${status} ${varName}: ${displayValue}`);

  if (!value) {
    allSet = false;
  }
});

console.log("===========================");
console.log(
  allSet
    ? "✅ All environment variables are set!"
    : "❌ Some environment variables are missing!"
);

// Test Redis connection if URL is available
if (process.env.REDIS_URL) {
  console.log("\n🔗 Testing Redis connection...");
  try {
    // Basic Redis URL validation
    const url = new URL(process.env.REDIS_URL);
    console.log(
      `✅ Redis URL format valid: ${url.protocol}//${url.hostname}:${url.port}`
    );
  } catch (error) {
    console.log(`❌ Invalid Redis URL format: ${error.message}`);
  }
}

process.exit(allSet ? 0 : 1);
