# History Service Tests

This testing uses jest to test the history service. A live MongoDB connection is not required for this testing.

## Files
- `historyController.test.js` : covers the happy path and failure modes for `getUsersHistory`, `createAttempt`, and `updateAttempt`.
- `basic-access-control.test.js` : verifies the Auth0 middleware loads environment variables properly

## Running the Tests

```bash
cd history-service
npm install          
npm test
```
