// Jest setup file for WebSocket tests
// import { jest } from "@jest/globals";
const jest = require("@jest/globals");

// Global test configuration
global.console = {
  ...console,
  // Suppress console.log during tests unless debugging
  log: process.env.DEBUG_TESTS ? console.log : jest.fn(),
  warn: console.warn,
  error: console.error,
};

// Set default timeout for all tests
jest.setTimeout(15000);
