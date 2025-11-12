import { describe, expect, it, beforeEach, afterEach, jest } from "@jest/globals";

// AI Assistance Disclosure:
// Tool: ChatGPT (model: GPT‑5 Thinking), date: 30-10-2025
// Scope: Generated unit test cases that I specified to test the environment variables are read properly
// Author review: Validated correctness by changing the body of the ai-generated request to match what the 
// actual request body looks like and had to append code to some tests to include checks for the correct error code and message.

describe("verifyAccessToken middleware", () => {
  const originalAudience = process.env.AUTH0_AUDIENCE;
  const originalDomain = process.env.AUTH0_DOMAIN;

  beforeEach(() => {
    jest.resetModules();
    process.env.AUTH0_AUDIENCE = "test-audience";
    process.env.AUTH0_DOMAIN = "tenant.example.com";
  });

  afterEach(() => {
    if (originalAudience === undefined) {
      delete process.env.AUTH0_AUDIENCE;
    } else {
      process.env.AUTH0_AUDIENCE = originalAudience;
    }

    if (originalDomain === undefined) {
      delete process.env.AUTH0_DOMAIN;
    } else {
      process.env.AUTH0_DOMAIN = originalDomain;
    }
  });

  it("configures express-oauth2-jwt-bearer using env bootstrap", async () => {
    const authMock = jest.fn().mockReturnValue("auth-middleware");

    jest.unstable_mockModule("express-oauth2-jwt-bearer", () => ({
      auth: authMock,
    }));

    const { verifyAccessToken } = await import("../src/middleware/basic-access-control.js");

    expect(authMock).toHaveBeenCalledWith({
      audience: "test-audience",
      issuerBaseURL: "https://tenant.example.com",
      algorithms: ["RS256"],
    });
    expect(verifyAccessToken).toBe("auth-middleware");
  });
});
