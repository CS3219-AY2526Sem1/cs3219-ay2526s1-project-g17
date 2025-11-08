const HISTORY_SERVICE_URL = 'https://history-service-226307456137.asia-southeast1.run.app';
const COLLABORATION_SERVICE_URL = 'https://collaboration-service-226307456137.asia-southeast1.run.app';

export async function submitAttempt({ userId, questionId, submissionCode }) {
    try {
        const response = await fetch(`${HISTORY_SERVICE_URL}/history/create-attempt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                questionId,
                submissionCode
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to submit attempt: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error submitting attempt:', error);
        throw error;
    }
}

export async function terminateSession(sessionId) {
    try {
        const response = await fetch(`${COLLABORATION_SERVICE_URL}/api/collaboration/sessions/${sessionId}/terminate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to terminate session: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error terminating session:', error);
        throw error;
    }
}