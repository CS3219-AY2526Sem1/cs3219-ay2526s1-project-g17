# History Service Tests

This directory contains Jest-based unit tests that exercise the `history-service` controllers without requiring a live MongoDB instance.

## Files
- `historyController.test.js` &mdash; covers the happy path and failure modes for `getUsersHistory`, `createAttempt`, and `updateAttempt`.

## Running the Tests
From the `history-service` directory:

```bash
npm install          # first time only, installs jest + cross-env
npm test
```

The `test` script ensures Jest runs in ESM mode (`NODE_OPTIONS=--experimental-vm-modules`) so it can import the service's ES modules.

## Implementation Notes
- Mongoose model methods are mocked, allowing the controllers to be tested in isolation.
- Console errors are suppressed in failure-path assertions to keep the test output readable.
