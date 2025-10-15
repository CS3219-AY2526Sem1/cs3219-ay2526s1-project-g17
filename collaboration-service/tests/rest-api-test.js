// Node 18+ has fetch built-in
const BASE_URL = 'http://localhost:3002/api/collaboration';

async function testCollaboration() {
  try {
    // Create a new session (provide sessionId manually)
    const createRes = await fetch(`${BASE_URL}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'session123',
        users: ['alice', 'bob'],
        questionId: 'Q42'
      })
    });
    const createData = await createRes.json();
    const sessionId = createData.sessionId;
    console.log('Created session:', createData);

    // Join the session with a new user
    const joinRes = await fetch(`${BASE_URL}/session/${sessionId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'charlie' })
    });
    const joinData = await joinRes.json();
    console.log('After join:', joinData);

    // Retrieve session details
    const getRes = await fetch(`${BASE_URL}/session/${sessionId}`);
    const getData = await getRes.json();
    console.log('Session details:', getData);

    // Terminate the session
    const terminateRes = await fetch(`${BASE_URL}/session/${sessionId}/terminate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const terminateData = await terminateRes.json();
    console.log('Terminated session:', terminateData);

  } catch (err) {
    console.error('Error:', err);
  }
}

// Run the test
testCollaboration();
