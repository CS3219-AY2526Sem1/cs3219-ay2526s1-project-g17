import { useState, useEffect } from "react";

const QUESTION_SERVICE_BASE_URL = 'https://question-service-226307456137.asia-southeast1.run.app/api/questions';

export default function QuestionPanel({ questionId }) { 
    const [question, setQuestion] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        
        if (!questionId) {
            setError('No questionId provided');
            setIsLoading(false);
            return;
        }
        
        const fetchQuestion = async () => {
            try {
                // Perform a single GET request to the Question Service
                const response = await fetch(`${QUESTION_SERVICE_BASE_URL}/${questionId}`);
                
                if (!response.ok) {
                    throw new Error(`Error fetching question: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                // Assuming the API returns the single question object directly
                setQuestion(data); 
            } catch (err) {
                setError(`Failed to fetch question: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuestion();

    }, [questionId]);
    
    // Render Logic
    let content;
    if (isLoading) {
        content = <p>Loading problem statement...</p>;
    } else if (error) {
        content = <p className="error-message">Error: {error}</p>;
    } else if (question) {
        content = (
            <>
                {/* Display Title and Difficulty */}
                <h3 className="question-title">
                    {question.title || 'Problem Title'} 
                </h3>

                <h4 className="question-subtitle">
                    <span className="question-difficulty">
                        Difficulty: {question.difficulty}
                    </span>
                </h4>
                
                {/* Display Topics */}
                <p className="question-topic-text">
                    <strong>Topics:</strong> {Array.isArray(question.topics) ? question.topics.join(', ') : 'N/A'}
                </p>

                {/* Display the Main Question Text */}
                <div className="question-description">
                    <p>{question.question || 'Problem statement content not available.'}</p>
                    <p>{question.testCases || 'No test cases available.'}</p>
                </div>
            </>
        );
    } else {
        content = <p>No question assigned to this session.</p>;
    }


    return (
        <div className="question-panel-area">
            {content}
        </div>
    );
}