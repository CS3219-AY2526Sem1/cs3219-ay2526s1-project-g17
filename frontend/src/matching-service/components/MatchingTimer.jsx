import React, { useState, useEffect, useRef } from "react";
import { cancelMatchRequest } from "../services/matchingService";
import "./MatchingTimer.css";

/**
 * Timer component that displays during matching process
 * @param {Object} props
 * @param {boolean} props.isVisible - Whether the timer is visible
 * @param {string} props.requestId - The match request ID
 * @param {Function} props.onCancel - Callback when match is cancelled
 */
const MatchingTimer = ({ isVisible, requestId, onCancel }) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isCancelling, setIsCancelling] = useState(false);
  const startTimeRef = useRef(null);

  useEffect(() => {
    let interval = null;

    if (isVisible) {
      startTimeRef.current = Date.now();
      setTimeElapsed(0);

      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTimeRef.current) / 1000);
        setTimeElapsed(elapsed);
      }, 1000);
    } else {
      setTimeElapsed(0);
      startTimeRef.current = null;
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isVisible]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      if (requestId) {
        await cancelMatchRequest(requestId);
      }
      onCancel && onCancel();
    } catch (error) {
      console.error("Error cancelling match request:", error);
      // Still call onCancel to update UI state
      onCancel && onCancel();
    } finally {
      setIsCancelling(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="matching-timer-overlay">
      <div className="matching-timer-container">
        <div className="matching-timer-content">
          <div className="matching-timer-icon">
            <div className="matching-spinner"></div>
          </div>
          <h3 className="matching-timer-title">Finding Your Match</h3>
          <div className="matching-timer-display">
            {formatTime(timeElapsed)}
          </div>
          <p className="matching-timer-subtitle">
            Please wait while we find you a coding partner...
          </p>
          <button
            className="matching-timer-cancel-btn"
            onClick={handleCancel}
            disabled={isCancelling}
          >
            {isCancelling ? "Cancelling..." : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchingTimer;
