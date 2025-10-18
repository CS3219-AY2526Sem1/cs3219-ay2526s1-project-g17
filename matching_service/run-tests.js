#!/usr/bin/env node

/**
 * Simple test runner for WebSocket integration tests
 * This script helps you run WebSocket tests against the matching service
 */

import { spawn } from "child_process";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

console.log("🚀 WebSocket Integration Test Runner");
console.log("=====================================\n");

// Check if server is running
console.log("📋 Pre-test checklist:");
console.log(
  "1. ✅ Ensure your matching service server is running on localhost:3001"
);
console.log("2. ✅ Ensure MongoDB is connected and accessible");
console.log(
  "3. ✅ Install test dependencies: npm install @jest/globals jest\n"
);

// Run tests
console.log("🧪 Running WebSocket integration tests...\n");

const testProcess = spawn(
  "npm",
  ["run", "test", "--", "--silent=false", "--verbose"],
  {
    stdio: "inherit",
    shell: true,
  }
);

testProcess.on("close", (code) => {
  if (code === 0) {
    console.log("\n✅ All tests completed successfully!");
  } else {
    console.log("\n❌ Some tests failed. Check the output above for details.");
  }
  process.exit(code);
});

testProcess.on("error", (error) => {
  console.error("❌ Error running tests:", error.message);
  console.log("\n💡 Make sure Jest is installed:");
  console.log("   npm install @jest/globals jest --save-dev");
  process.exit(1);
});
