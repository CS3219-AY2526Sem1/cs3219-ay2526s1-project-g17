import React from "react";
import "./MatchFoundDialog.css";

/**
 * Dialog component that appears when a match is found
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the dialog is open
 * @param {Object} props.matchData - The match data from the server
 * @param {Function} props.onAccept - Callback when user accepts the match
 * @param {Function} props.onReject - Callback when user rejects the match
 * @param {boolean} props.isAccepting - Whether accept is in progress
 */
const MatchFoundDialog = ({
  isOpen,
  matchData,
  onAccept,
  onReject,
  isAccepting = false,
}) => {
  if (!isOpen || !matchData) return null;

  const { criteria } = matchData;

  const formatCriteria = (criteria) => {
    if (!criteria) return "No criteria specified";

    return (
      <div className="criteria-item">
        <span className="criteria-topic">{criteria.topic}</span>
        <span
          className={`criteria-difficulty difficulty-${criteria.difficulty}`}
        >
          {criteria.difficulty}
        </span>
        <span className="criteria-language">{criteria.language}</span>
      </div>
    );
  };

  const getTimeRemaining = () => {
    return 10;
  };

  return (
    <div className="match-found-overlay">
      <div className="match-found-dialog">
        <div className="match-found-header">
          <div className="match-found-icon">
            <span className="match-icon">🎯</span>
          </div>
          <h2 className="match-found-title">Match Found!</h2>
        </div>

        <div className="match-found-content">
          <div className="partner-info">
            <h3>Your Coding Partner</h3>
            <div className="partner-details"></div>
          </div>

          <div className="match-criteria">
            <h3>Match Criteria</h3>
            <div className="criteria-list">{formatCriteria(criteria)}</div>
          </div>

          <div className="timeout-warning">
            <p>
              ⏰ You have <strong>{getTimeRemaining()} seconds</strong> to
              accept this match
            </p>
          </div>
        </div>

        <div className="match-found-actions">
          {isAccepting ? (
            <div className="accepting-loading">
              <div className="large-loading-spinner"></div>
              <p>Waiting for partner to accept...</p>
            </div>
          ) : (
            <>
              <button
                className="reject-button"
                onClick={onReject}
                type="button"
              >
                Reject
              </button>
              <button
                className="accept-button"
                onClick={onAccept}
                type="button"
              >
                Accept Match
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchFoundDialog;
