// Simple sanity tests to verify Jest is working correctly

describe('Basic Test Suite', () => {
  test('basic arithmetic works', () => {
    expect(1 + 1).toBe(2);
    expect(2 * 3).toBe(6);
    expect(10 - 5).toBe(5);
  });

  test('string operations work', () => {
    const str = 'Question Service';
    expect(str).toContain('Question');
    expect(str.length).toBe(16);
    expect(str.toLowerCase()).toBe('question service');
  });

  test('array operations work', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(arr).toHaveLength(5);
    expect(arr).toContain(3);
    expect(arr[0]).toBe(1);
  });

  test('object operations work', () => {
    const obj = { name: 'Test', value: 42 };
    expect(obj).toHaveProperty('name');
    expect(obj.name).toBe('Test');
    expect(obj.value).toBe(42);
  });

  test('async operations work', async () => {
    const promise = Promise.resolve('success');
    await expect(promise).resolves.toBe('success');
  });
});

describe('Question Model Validation', () => {
  test('valid difficulty levels', () => {
    const validDifficulties = ['Beginner', 'Intermediate', 'Advanced'];
    expect(validDifficulties).toContain('Beginner');
    expect(validDifficulties).toContain('Intermediate');
    expect(validDifficulties).toContain('Advanced');
    expect(validDifficulties).toHaveLength(3);
  });

  test('question structure validation', () => {
    const question = {
      title: 'Test Question',
      question: 'What is this?',
      difficulty: 'Beginner',
      topics: ['array', 'sorting'],
      link: 'https://example.com'
    };

    expect(question).toHaveProperty('title');
    expect(question).toHaveProperty('question');
    expect(question).toHaveProperty('difficulty');
    expect(question).toHaveProperty('topics');
    expect(question).toHaveProperty('link');
    expect(Array.isArray(question.topics)).toBe(true);
  });
});

describe('Environment Variables', () => {
  test('environment is set', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });

  test('can access process object', () => {
    expect(process).toBeDefined();
    expect(process.version).toBeDefined();
  });
});
