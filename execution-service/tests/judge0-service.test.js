const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

const mock = new MockAdapter(axios);

describe('Judge0 Connection Tests', () => {

  const JUDGE0_URL = process.env.SELF_JUDGE0_URL || 'http://localhost:2358';
  const RAPIDAPI_URL = process.env.RAPIDAPI_BASE || 'https://judge0-ce.p.rapidapi.com';

  afterEach(() => {
    mock.reset();
  });

  // CONNECTION TESTS

  describe('Judge0 Service Connectivity', () => {

    it('should successfully connect to Judge0 service', async () => {
      mock.onGet(`${JUDGE0_URL}/languages`).reply(200, [
        { id: 71, name: 'Python' },
        { id: 63, name: 'JavaScript' }
      ]);

      const response = await axios.get(`${JUDGE0_URL}/languages`);

      expect(response.status).toBe(200);
      expect(response.data).toBeInstanceOf(Array);
      expect(response.data.length).toBeGreaterThan(0);
    });

    it('should handle Judge0 service unavailable', async () => {
      mock.onGet(`${JUDGE0_URL}/languages`).networkError();

      try {
        await axios.get(`${JUDGE0_URL}/languages`);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Network Error');
      }
    });

    it('should handle Judge0 timeout', async () => {
      mock.onGet(`${JUDGE0_URL}/languages`).timeout();

      try {
        await axios.get(`${JUDGE0_URL}/languages`, { timeout: 1000 });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.code).toBe('ECONNABORTED');
      }
    });

    it('should handle Judge0 returning 500 error', async () => {
      mock.onGet(`${JUDGE0_URL}/languages`).reply(500, {
        error: 'Internal Server Error'
      });

      try {
        await axios.get(`${JUDGE0_URL}/languages`);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(500);
      }
    });

    it('should handle Judge0 returning 503 (service unavailable)', async () => {
      mock.onGet(`${JUDGE0_URL}/languages`).reply(503, {
        error: 'Service Temporarily Unavailable'
      });

      try {
        await axios.get(`${JUDGE0_URL}/languages`);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(503);
      }
    });
  });

  // SUBMISSION TESTS

  describe('Code Submission Logic', () => {

    it('should create submission successfully', async () => {
      const submission = {
        language_id: 71,
        source_code: 'print("Hello")',
        stdin: ''
      };

      const mockToken = 'abc123';

      mock.onPost(`${JUDGE0_URL}/submissions`).reply(201, {
        token: mockToken
      });

      const response = await axios.post(`${JUDGE0_URL}/submissions`, submission);

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('token');
      expect(response.data.token).toBe(mockToken);
    });

    it('should retrieve submission results', async () => {
      const token = 'abc123';
      const mockResult = {
        status: { id: 3, description: 'Accepted' },
        stdout: 'Hello\n',
        stderr: null,
        time: '0.001',
        memory: 3456
      };

      mock.onGet(`${JUDGE0_URL}/submissions/${token}`).reply(200, mockResult);

      const response = await axios.get(`${JUDGE0_URL}/submissions/${token}`);

      expect(response.status).toBe(200);
      expect(response.data.status.id).toBe(3);
      expect(response.data.stdout).toBe('Hello\n');
    });

    it('should handle submission with invalid language_id', async () => {
      const submission = {
        language_id: 99999,
        source_code: 'print("test")',
        stdin: ''
      };

      mock.onPost(`${JUDGE0_URL}/submissions`).reply(422, {
        language_id: ['is not included in the list']
      });

      try {
        await axios.post(`${JUDGE0_URL}/submissions`, submission);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(422);
      }
    });

    it('should handle polling for submission results', async () => {
      const token = 'abc123';

      // First call: still processing
      mock.onGet(`${JUDGE0_URL}/submissions/${token}`)
        .replyOnce(200, {
          status: { id: 2, description: 'Processing' },
          stdout: null,
          stderr: null
        })
        // Second call: completed
        .onGet(`${JUDGE0_URL}/submissions/${token}`)
        .replyOnce(200, {
          status: { id: 3, description: 'Accepted' },
          stdout: 'Done\n',
          stderr: null
        });

      // First poll
      let response = await axios.get(`${JUDGE0_URL}/submissions/${token}`);
      expect(response.data.status.id).toBe(2);

      // Second poll
      response = await axios.get(`${JUDGE0_URL}/submissions/${token}`);
      expect(response.data.status.id).toBe(3);
      expect(response.data.stdout).toBe('Done\n');
    });
  });

  // BATCH SUBMISSION TESTS

  describe('Batch Submission Logic', () => {

    it('should create batch submission', async () => {
      const submissions = [
        { language_id: 71, source_code: 'print(1)', stdin: '' },
        { language_id: 71, source_code: 'print(2)', stdin: '' }
      ];

      mock.onPost(`${JUDGE0_URL}/submissions/batch`).reply(201, [
        { token: 'token1' },
        { token: 'token2' }
      ]);

      const response = await axios.post(`${JUDGE0_URL}/submissions/batch`, {
        submissions
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveLength(2);
      expect(response.data[0]).toHaveProperty('token');
    });

    it('should retrieve batch submission results', async () => {
      const tokens = 'token1,token2';

      mock.onGet(`${JUDGE0_URL}/submissions/batch`, {
        params: { tokens }
      }).reply(200, {
        submissions: [
          { token: 'token1', status: { id: 3 }, stdout: '1\n' },
          { token: 'token2', status: { id: 3 }, stdout: '2\n' }
        ]
      });

      const response = await axios.get(`${JUDGE0_URL}/submissions/batch`, {
        params: { tokens }
      });

      expect(response.data.submissions).toHaveLength(2);
    });
  });

  // FALLBACK LOGIC TESTS

  describe('Fallback to RapidAPI', () => {

    it('should fallback to RapidAPI when self-hosted fails', async () => {
      // Self-hosted fails
      mock.onPost(`${JUDGE0_URL}/submissions`).networkError();

      // RapidAPI succeeds
      mock.onPost(`${RAPIDAPI_URL}/submissions`).reply(201, {
        token: 'rapidapi-token'
      });

      try {
        await axios.post(`${JUDGE0_URL}/submissions`, {
          language_id: 71,
          source_code: 'print("test")'
        });
      } catch (error) {
        // Self-hosted failed, try RapidAPI
        const fallbackResponse = await axios.post(
          `${RAPIDAPI_URL}/submissions`,
          { language_id: 71, source_code: 'print("test")' },
          {
            headers: {
              'X-RapidAPI-Key': 'test-key',
              'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
            }
          }
        );

        expect(fallbackResponse.status).toBe(201);
        expect(fallbackResponse.data.token).toBe('rapidapi-token');
      }
    });
  });

  // ERROR RESPONSE TESTS

  describe('Error Response Handling', () => {

    it('should handle compilation error', async () => {
      const token = 'abc123';

      mock.onGet(`${JUDGE0_URL}/submissions/${token}`).reply(200, {
        status: { id: 6, description: 'Compilation Error' },
        compile_output: 'SyntaxError: invalid syntax',
        stdout: null,
        stderr: null
      });

      const response = await axios.get(`${JUDGE0_URL}/submissions/${token}`);

      expect(response.data.status.id).toBe(6);
      expect(response.data.compile_output).toContain('SyntaxError');
    });

    it('should handle runtime error', async () => {
      const token = 'abc123';

      mock.onGet(`${JUDGE0_URL}/submissions/${token}`).reply(200, {
        status: { id: 11, description: 'Runtime Error (NZEC)' },
        stdout: '',
        stderr: 'NameError: name "x" is not defined'
      });

      const response = await axios.get(`${JUDGE0_URL}/submissions/${token}`);

      expect(response.data.status.id).toBe(11);
      expect(response.data.stderr).toContain('NameError');
    });

    it('should handle time limit exceeded', async () => {
      const token = 'abc123';

      mock.onGet(`${JUDGE0_URL}/submissions/${token}`).reply(200, {
        status: { id: 13, description: 'Time Limit Exceeded' },
        time: '2.000',
        stdout: null,
        stderr: null
      });

      const response = await axios.get(`${JUDGE0_URL}/submissions/${token}`);

      expect(response.data.status.id).toBe(13);
      expect(parseFloat(response.data.time)).toBeGreaterThan(1);
    });

    it('should handle memory limit exceeded', async () => {
      const token = 'abc123';

      mock.onGet(`${JUDGE0_URL}/submissions/${token}`).reply(200, {
        status: { id: 14, description: 'Memory Limit Exceeded' },
        memory: 256000, // 256 MB
        stdout: null,
        stderr: null
      });

      const response = await axios.get(`${JUDGE0_URL}/submissions/${token}`);

      expect(response.data.status.id).toBe(14);
      expect(response.data.memory).toBeGreaterThan(200000);
    });
  });

});
