import React, { useState, useEffect, useRef } from "react";
import "./MatchingTimer.css";
import { QUEUE_TIMEOUT } from "../constants";
import { getWebSocketService } from "../services/matchingService";

/**
 * Timer component that displays during matching process
 * @param {Object} props
 * @param {boolean} props.isVisible - Whether the timer is visible
 * @param {string} props.requestId - The match request ID
 * @param {Function} props.onCancel - Callback when match is cancelled
 */
const MatchingTimer = ({ isVisible, onCancel }) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showTimeoutDialog, setShowTimeoutDialog] = useState(false);
  const startTimeRef = useRef(null);

  useEffect(() => {
    let interval = null;
    let timeout = null;

    if (isVisible) {
      startTimeRef.current = Date.now();
      setTimeElapsed(0);

      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTimeRef.current) / 1000);
        setTimeElapsed(elapsed);
      }, 1000);
      timeout = setTimeout(async () => {
        console.log("match cancelled");
        await onTimeout();
      }, QUEUE_TIMEOUT);
    } else {
      setTimeElapsed(0);
      startTimeRef.current = null;
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      if (interval) {
        clearInterval(interval);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleTimeoutClose = () => {
    setShowTimeoutDialog(false);
    onCancel && onCancel();
  };

  const onTimeout = async () => {
    setIsCancelling(true);
    try {
      disconnect();
      setShowTimeoutDialog(true);
    } catch (error) {
      console.error("Error cancelling match request:", error);
      setShowTimeoutDialog(true);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      disconnect();
      onCancel && onCancel();
    } catch (error) {
      console.error("Error cancelling match request:", error);
      onCancel && onCancel();
    } finally {
      setIsCancelling(false);
    }
  };

  const disconnect = () => {
    const wsService = getWebSocketService();
    wsService.disconnect();
    console.log("Match request cancelled by user");
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* Matching Timer */}
      {isVisible && !showTimeoutDialog && (
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
      )}

      {/* Timeout Dialog */}
      {showTimeoutDialog && (
        <div className="matching-timer-overlay">
          <div className="matching-timer-container">
            <div className="matching-timer-content">
              <div className="timeout-icon">⏰</div>
              <h3 className="matching-timer-title">Match Timeout</h3>
              <p className="matching-timer-subtitle">
                We couldn't find a match within the time limit. Please try again
                later.
              </p>
              <button
                className="matching-timer-cancel-btn"
                onClick={handleTimeoutClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MatchingTimer;
