const HISTORY_SERVICE_URL = 'https://history-service-226307456137.asia-southeast1.run.app';

export async function saveSessionToHistory(session) {
    if (!session) {
        console.log('No session found to save');
        return;
    }

    console.log('Attempting to save session to history:', session.sessionId);

    try {
        for (const userId of session.users) {
            console.log(`Saving attempt for user: ${userId}`);

            const url = `${HISTORY_SERVICE_URL}/history/create-attempt`;
            console.log(`Calling: ${url}`);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    questionId: session.questionId,
                    submissionCode: ''
                })
            });

            if (!response.ok) {
                console.error(`History service error: ${response.status}`);
                const errorText = await response.text();
                console.error('Error details:', errorText);
                continue;
            }

            const data = await response.json();
            console.log('History service response:', data);
        }
    } catch (error) {
        console.error('Error saving to history:', error);
    }
}
