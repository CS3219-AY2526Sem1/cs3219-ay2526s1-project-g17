// Jest setup file for WebSocket tests
import { jest } from "@jest/globals";
// const jest = require("@jest/globals");

// Global test configuration
global.console = {
  ...console,
  log: console.log,
  warn: console.warn,
  error: console.error,
};

// Set default timeout for all tests
jest.setTimeout(150000);
