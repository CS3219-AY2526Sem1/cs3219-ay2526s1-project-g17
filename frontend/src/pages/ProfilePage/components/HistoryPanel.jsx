import { useEffect, useState } from "react";
import axios from "axios";
import LoadingSpinner from "../../../components/Loading/LoadingSpinner.jsx";

// AI Assistance Disclosure:
// Tool: ChatGPT (model: GPT‑5 Thinking), date: 30-10-2025
// Scope: Wrote for me a useEffect with an asynchronous function to load the questions
// Author review: Simplified the function / trimmed some lines, changed API calls to work with deployment, and changed dependency array
// and then erified correctness on local and cloud deployment


const QUESTION_SERVICE_BASE =
  import.meta.env.VITE_QUESTION_SERVICE_BASE ||
  "http://localhost:5001/api/questions";

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString() : "—";

const truncate = (value, length = 220) =>
  value && value.length > length ? `${value.slice(0, length)}…` : value || "";

export default function HistoryPanel({
  attempts = [],
  page,
  isFetching,
  hasNextPage,
  error = null,
  onPrev,
  onNext,
  authToken,
}) {
  const [questionDetails, setQuestionDetails] = useState({});
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  useEffect(() => {
    if (!attempts.length) {
      setQuestionDetails({});
      return;
    }

    let cancelled = false;

    async function loadQuestions() {
      const questionIds = [...new Set(attempts.map((a) => a.questionId).filter(Boolean))];
      if (!questionIds.length) {
        setQuestionDetails({});
        return;
      }

      setIsLoadingQuestions(true);

      try {
        const results = await Promise.all(
          questionIds.map(async (id) => {
            try {
              const res = await axios.get(`${QUESTION_SERVICE_BASE}/${id}`, {
                headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
              });
              return [id, { data: res.data }];
            } catch (requestError) {
              return [id, { error: requestError }];
            }
          })
        );

        if (!cancelled) {
          setQuestionDetails(Object.fromEntries(results));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingQuestions(false);
        }
      }
    }

    loadQuestions();

    return () => {
      cancelled = true;
    };
  }, [attempts, authToken]);

  const showLoadingState = isFetching || (isLoadingQuestions && attempts.length > 0);

  return (
    <section className="history-panel">
      <header className="history-panel__header">
        <h2>Your recent attempts</h2>
        <p>
          Page {page + 1} · Showing {attempts.length} attempt
          {attempts.length === 1 ? "" : "s"}
        </p>
      </header>

      {error && (
        <div className="history-panel__error">
          <strong>We hit a snag:</strong>{" "}
          {error?.response?.data?.message || error.message}
        </div>
      )}

      {showLoadingState ? (
        <div className="history-panel__spinner">
          <LoadingSpinner text="Loading attempts..." />
        </div>
      ) : attempts.length === 0 ? (
        <div className="history-panel__empty">
          <h3>No attempts yet</h3>
          <p>Start practicing to build your timeline of solved questions.</p>
        </div>
      ) : (
        <ul className="attempt-list">
          {attempts.map((attempt) => {
            const details = questionDetails[attempt.questionId] || {};
            const question = details.data;
            const isQuestionLoading =
              isLoadingQuestions && !details.data && !details.error;
            const questionTitle =
              (isQuestionLoading && "Fetching question details...") ||
              (details.error && "Question not available") ||
              question?.title ||
              attempt.questionId;

            return (
              <li key={attempt._id} className="attempt-card">
                <header className="attempt-card__header">
                  <span className="attempt-card__label">Question</span>
                  <h3>{questionTitle}</h3>
                </header>

                <div className="attempt-card__question-meta">
                  {question?.difficulty && (
                    <span
                      className={`badge badge--difficulty badge--${question.difficulty.toLowerCase()}`}
                    >
                      {question.difficulty}
                    </span>
                  )}

                  {Array.isArray(question?.topics) && question.topics.length > 0 && (
                    <div className="attempt-card__topics">
                      {question.topics.map((topic) => (
                        <span className="badge badge--topic" key={topic}>
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {question?.question && !details.error && (
                  <p className="attempt-card__question-blurb">
                    {truncate(question.question)}
                  </p>
                )}

                {details.error && (
                  <p className="attempt-card__question-error">
                    Unable to load question details. Please try again later.
                  </p>
                )}

                <dl className="attempt-card__meta">
                  <div>
                    <dt>Attempted on</dt>
                    <dd>{formatDateTime(attempt.timestamp)}</dd>
                  </div>
                  <div>
                    <dt>Submission ID</dt>
                    <dd className="attempt-card__code">{attempt._id}</dd>
                  </div>
                </dl>

                {attempt.submissionCode && (
                  <pre className="attempt-card__codeblock">
                    <code>{attempt.submissionCode}</code>
                  </pre>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <footer className="history-panel__footer">
        <button
          className="btn"
          onClick={onPrev}
          disabled={page === 0 || isFetching}
        >
          Previous
        </button>
        <button
          className="btn btn--primary"
          onClick={onNext}
          disabled={!hasNextPage || isFetching}
        >
          Next
        </button>
      </footer>
    </section>
  );
}
