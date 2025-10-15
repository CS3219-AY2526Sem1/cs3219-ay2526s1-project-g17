// Node 18+ has fetch built-in
const BASE_URL = 'http://localhost:3002/api/collaboration';

async function testCollaboration() {
  try {
    const sessionId = 'session123';

    // Check if session exists
    const checkRes = await fetch(`${BASE_URL}/sessions/${sessionId}`);
    if (checkRes.ok) {
      const existingSession = await checkRes.json();
      if (existingSession) {
        // Delete the session if it exists
        const deleteRes = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        const deleteData = await deleteRes.json();
        console.log('Deleted existing session:', deleteData);
      }
    }

    // Create a new session (provide sessionId manually)
    const createRes = await fetch(`${BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'session123',
        users: ['alice', 'bob'],
        questionId: 'Q42'
      })
    });
    const createData = await createRes.json();
    console.log('Created session:', createData);

    // Join the session with a new user
    const joinRes = await fetch(`${BASE_URL}/sessions/${sessionId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'charlie' })
    });
    const joinData = await joinRes.json();
    console.log('After join:', joinData);

    // Retrieve session details
    const getRes = await fetch(`${BASE_URL}/sessions/${sessionId}`);
    const getData = await getRes.json();
    console.log('Session details:', getData);

    // Terminate the session
    const terminateRes = await fetch(`${BASE_URL}/sessions/${sessionId}/terminate`, {
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
