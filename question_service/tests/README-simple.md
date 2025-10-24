# Test Suite for Question Service

## Test Files

### 1. `simple.test.js` - Basic Sanity Tests
- Verifies Jest is working correctly
- Tests basic JavaScript operations
- Validates question model structure
- Checks environment setup

### 2. `controller-logic.test.js` - Controller Logic Tests
- Tests input validation logic
- Tests data transformation functions
- Tests query parameter processing
- Tests response formatting
- Tests aggregation logic

## Running the Tests

### Prerequisites
```bash
# Install Jest (only needed once)
npm install --save-dev jest
```

### Run All Simple Tests
```bash
npm test
```

Or with Node experimental VM modules:
```bash
NODE_OPTIONS=--experimental-vm-modules npx jest
```

### Run Specific Test Files
```bash
# Run only simple.test.js
NODE_OPTIONS=--experimental-vm-modules npx jest tests/simple.test.js

# Run only controller-logic.test.js  
NODE_OPTIONS=--experimental-vm-modules npx jest tests/controller-logic.test.js
```

### Watch Mode (Auto-rerun on changes)
```bash
NODE_OPTIONS=--experimental-vm-modules npx jest --watch
```

### With Coverage Report
```bash
NODE_OPTIONS=--experimental-vm-modules npx jest --coverage
```

## What These Tests Cover

✅ **No External Dependencies Required**
- No database connection needed
- No API calls needed
- No mocking required

✅ **Pure Logic Testing**
- Input validation
- Data transformations
- Array operations
- String manipulations
- Object operations

✅ **Quick Execution**
- Run in milliseconds
- No async operations
- No network calls

## Test Structure

Each test follows the **Arrange-Act-Assert** pattern:

```javascript
test('should do something', () => {
  // Arrange - Set up test data
  const input = 'test';
  
  // Act - Execute the logic
  const result = input.toUpperCase();
  
  // Assert - Verify the result
  expect(result).toBe('TEST');
});
```

## Adding More Tests

To add new simple tests:

1. Create a new `.test.js` file in the `tests` folder
2. Write test cases using `describe` and `test` blocks
3. Use Jest's `expect` assertions
4. Run with `npx jest`

Example:
```javascript
describe('My Feature', () => {
  test('should work correctly', () => {
    expect(1 + 1).toBe(2);
  });
});
```