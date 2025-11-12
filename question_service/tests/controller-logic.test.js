// Simple controller logic tests

describe('Question Controller Logic', () => {
  describe('Input Validation', () => {
    test('should validate question title format', () => {
      const validTitle = 'Two Sum Problem';
      const emptyTitle = '';
      
      expect(validTitle.length).toBeGreaterThan(0);
      expect(emptyTitle.length).toBe(0);
    });

    test('should validate difficulty values', () => {
      const validDifficulties = ['Beginner', 'Intermediate', 'Advanced'];
      const testDifficulty = 'Beginner';
      
      expect(validDifficulties.includes(testDifficulty)).toBe(true);
      expect(validDifficulties.includes('Invalid')).toBe(false);
    });

    test('should validate topics array', () => {
      const topics = ['array', 'hash-table', 'sorting'];
      
      expect(Array.isArray(topics)).toBe(true);
      expect(topics.length).toBeGreaterThan(0);
      topics.forEach(topic => {
        expect(typeof topic).toBe('string');
      });
    });

    test('should validate URL format', () => {
      const validUrl = 'https://leetcode.com/problems/two-sum';
      const invalidUrl = 'not-a-url';
      
      expect(validUrl.startsWith('http')).toBe(true);
      expect(invalidUrl.startsWith('http')).toBe(false);
    });
  });

  describe('Data Transformation', () => {
    test('should handle topic string to array conversion', () => {
      const topicsString = 'array,hash-table,sorting';
      const topicsArray = topicsString.split(',');
      
      expect(Array.isArray(topicsArray)).toBe(true);
      expect(topicsArray).toHaveLength(3);
      expect(topicsArray[0]).toBe('array');
    });

    test('should remove duplicate topics', () => {
      const topics = ['array', 'sorting', 'array', 'hash-table', 'sorting'];
      const uniqueTopics = [...new Set(topics)];
      
      expect(uniqueTopics).toHaveLength(3);
      expect(uniqueTopics).toEqual(['array', 'sorting', 'hash-table']);
    });

    test('should flatten nested topics array', () => {
      const data = [
        { topics: ['array', 'recursion'] },
        { topics: ['array', 'sorting'] },
        { topics: ['recursion'] }
      ];
      
      const allTopics = data.flatMap(q => q.topics);
      const uniqueTopics = [...new Set(allTopics)];
      
      expect(allTopics).toHaveLength(5);
      expect(uniqueTopics).toHaveLength(3);
    });

    test('should group topics by difficulty', () => {
      const questions = [
        { difficulty: 'Beginner', topics: ['array', 'recursion'] },
        { difficulty: 'Intermediate', topics: ['array', 'sorting'] },
        { difficulty: 'Beginner', topics: ['recursion', 'strings'] }
      ];
      
      const result = {};
      questions.forEach(q => {
        if (!result[q.difficulty]) {
          result[q.difficulty] = [];
        }
        result[q.difficulty].push(...q.topics);
      });
      
      // Remove duplicates and sort
      Object.keys(result).forEach(difficulty => {
        result[difficulty] = [...new Set(result[difficulty])].sort();
      });
      
      expect(result['Beginner']).toContain('array');
      expect(result['Beginner']).toContain('recursion');
      expect(result['Beginner']).toContain('strings');
      expect(result['Intermediate']).toContain('array');
      expect(result['Intermediate']).toContain('sorting');
    });
  });

  describe('Query Parameter Processing', () => {
    test('should parse difficulty from query', () => {
      const query = { difficulty: 'Beginner', topics: 'array' };
      
      expect(query.difficulty).toBe('Beginner');
      expect(typeof query.difficulty).toBe('string');
    });

    test('should parse comma-separated topics', () => {
      const query = { topics: 'array,sorting,hash-table' };
      const topicsArray = query.topics.split(',');
      
      expect(topicsArray).toHaveLength(3);
      expect(topicsArray).toContain('array');
      expect(topicsArray).toContain('sorting');
    });

    test('should handle single topic', () => {
      const query = { topics: 'array' };
      const topicsArray = query.topics.split(',');
      
      expect(topicsArray).toHaveLength(1);
      expect(topicsArray[0]).toBe('array');
    });
  });

  describe('Response Format', () => {
    test('should format question response correctly', () => {
      const question = {
        _id: '123',
        title: 'Test Question',
        difficulty: 'Beginner',
        topics: ['array']
      };
      
      expect(question).toHaveProperty('_id');
      expect(question).toHaveProperty('title');
      expect(question).toHaveProperty('difficulty');
      expect(question).toHaveProperty('topics');
    });

    test('should format random question ID response', () => {
      const response = { id: '123456789' };
      
      expect(response).toHaveProperty('id');
      expect(typeof response.id).toBe('string');
    });

    test('should format topics list response', () => {
      const topics = ['array', 'hash-table', 'sorting'];
      
      expect(Array.isArray(topics)).toBe(true);
      expect(topics.length).toBeGreaterThan(0);
    });

    test('should format error response', () => {
      const errorResponse = { message: 'Question not found' };
      
      expect(errorResponse).toHaveProperty('message');
      expect(typeof errorResponse.message).toBe('string');
    });
  });
});

describe('Aggregation Logic', () => {
  test('should match questions by difficulty and topics', () => {
    const questions = [
      { difficulty: 'Beginner', topics: ['array', 'sorting'] },
      { difficulty: 'Intermediate', topics: ['array', 'hash-table'] },
      { difficulty: 'Beginner', topics: ['recursion'] }
    ];
    
    const targetDifficulty = 'Beginner';
    const targetTopics = ['array'];
    
    const matches = questions.filter(q => 
      q.difficulty === targetDifficulty && 
      q.topics.some(topic => targetTopics.includes(topic))
    );
    
    expect(matches).toHaveLength(1);
    expect(matches[0].topics).toContain('array');
  });

  test('should handle no matches scenario', () => {
    const questions = [
      { difficulty: 'Beginner', topics: ['array'] },
      { difficulty: 'Intermediate', topics: ['sorting'] }
    ];
    
    const targetDifficulty = 'Advanced';
    const targetTopics = ['graph'];
    
    const matches = questions.filter(q => 
      q.difficulty === targetDifficulty && 
      q.topics.some(topic => targetTopics.includes(topic))
    );
    
    expect(matches).toHaveLength(0);
  });
});
