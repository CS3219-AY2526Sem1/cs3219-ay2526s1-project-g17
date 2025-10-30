import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import LoadingSpinner from "../../../components/Loading/LoadingSpinner.jsx";

const QUESTION_SERVICE_BASE = "http://localhost:5001/api/questions";

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString() : "—";

const truncate = (value, length = 220) => {
  if (!value) return "";
  if (value.length <= length) return value;
  return `${value.slice(0, length)}…`;
};

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
  const [questionCache, setQuestionCache] = useState({});
  const inflight = useRef(new Set());

  useEffect(() => {
    const uniqueIds = Array.from(
      new Set(attempts.map((attempt) => attempt.questionId).filter(Boolean))
    );

    uniqueIds.forEach((id) => {
      const current = questionCache[id];
      if (current?.status === "success" || current?.status === "loading") {
        return;
      }
      if (inflight.current.has(id)) {
        return;
      }

      inflight.current.add(id);
      setQuestionCache((prev) => ({
        ...prev,
        [id]: { status: "loading" },
      }));

      axios
        .get(`${QUESTION_SERVICE_BASE}/${id}`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        })
        .then((res) => {
          setQuestionCache((prev) => ({
            ...prev,
            [id]: { status: "success", data: res.data },
          }));
        })
        .catch((fetchError) => {
          setQuestionCache((prev) => ({
            ...prev,
            [id]: { status: "error", error: fetchError },
          }));
        })
        .finally(() => {
          inflight.current.delete(id);
        });
    });
  }, [attempts, authToken, questionCache]);

  const attemptsWithQuestions = useMemo(
    () =>
      attempts.map((attempt) => ({
        attempt,
        question: questionCache[attempt.questionId],
      })),
    [attempts, questionCache]
  );

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

      {isFetching ? (
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
          {attemptsWithQuestions.map(({ attempt, question }) => {
            const questionData = question?.data;
            const isQuestionLoading = question?.status === "loading";
            const questionError = question?.status === "error";
            const difficulty = questionData?.difficulty;
            const topics = questionData?.topics ?? [];

            return (
              <li key={attempt._id} className="attempt-card">
                <header className="attempt-card__header">
                  <span className="attempt-card__label">Question</span>
                  <h3>
                    {isQuestionLoading
                      ? "Fetching question details..."
                      : questionError
                      ? "Question not available"
                      : questionData?.title || attempt.questionId}
                  </h3>
                </header>

                <div className="attempt-card__question-meta">
                  {difficulty && (
                    <span
                      className={`badge badge--difficulty badge--${difficulty.toLowerCase()}`}
                    >
                      {difficulty}
                    </span>
                  )}
                  {topics.length > 0 && (
                    <div className="attempt-card__topics">
                      {topics.map((topic) => (
                        <span className="badge badge--topic" key={topic}>
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {questionData?.question && !questionError && (
                  <p className="attempt-card__question-blurb">
                    {truncate(questionData.question)}
                  </p>
                )}

                {questionError && (
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
