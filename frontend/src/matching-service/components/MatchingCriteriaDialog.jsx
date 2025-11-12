/* AI Generated File */
import React, { useState, useEffect } from "react";
import {
  fetchTopics,
  getWebSocketService,
  submitMatchRequestViaWebSocket,
} from "../services/matchingService";
import "./MatchingCriteriaDialog.css";
import axios from "axios";
import { useAuth0 } from "@auth0/auth0-react";
import { MATCHING_SERVICE_URL, QUEUE_TIMEOUT } from "../constants";
import { useNavigate } from "react-router";
import { formSectionUrl } from "../util";

/**
 * @typedef {import("../types").MatchRequest} MatchRequest
 */

/**
 * Dialog component for selecting matching criteria
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the dialog is open
 * @param {Function} props.onClose - Callback to close the dialog
 * @param {Function} props.onSubmit - Callback when match request is submitted
 */
const MatchingCriteriaDialog = ({ isOpen, onClose, onSubmit }) => {
  const [language, setLanguage] = useState("");
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [difficulty, setDifficulty] = useState("");
  const [availableTopics, setAvailableTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { user, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();

  const languages = [
    "JavaScript",
    "Python",
    "Java",
    "C++",
    "TypeScript",
    "Go",
    "Rust",
  ];
  const difficulties = ["Beginner", "Intermediate", "Advanced"];

  const normalizeLanguageId = (displayName) => {
    const languageMap = {
      'JavaScript': 'javascript',
      'TypeScript': 'typescript',
      'Python': 'python',
      'Java': 'java',
      'C++': 'cpp',
      'Go': 'go',
      'Rust': 'rust'
    };
    return languageMap[displayName] || displayName.toLowerCase();
  };

  // Load topics when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadTopics();
    }
  }, [isOpen]);

  const loadTopics = async () => {
    setIsLoading(true);
    setError("");
    try {
      const topics = await fetchTopics();
      setAvailableTopics(topics);
    } catch (err) {
      setError("Failed to load topics. Please try again.");
      console.error("Error loading topics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTopicChange = (topic) => {
    setSelectedTopics((prev) => {
      if (prev.includes(topic)) {
        return prev.filter((t) => t !== topic);
      } else if (prev.length < 3) {
        return [...prev, topic];
      }
      return prev; // Don't add if already 3 topics selected
    });
  };

  const resetForm = () => {
    setLanguage("");
    setSelectedTopics([]);
    setDifficulty("");
    setError("");
  };

  const handleDisconnectAndClose = () => {
    const wsService = getWebSocketService();
    wsService.disconnect();
    handleClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    if (!user || !user.sub) {
      console.log("User not logged in");
      navigate("/");
      return;
    }
    e.preventDefault();

    // Validation
    if (!language) {
      setError("Please select a programming language.");
      return;
    }
    if (selectedTopics.length === 0) {
      setError("Please select at least one topic.");
      return;
    }
    if (selectedTopics.length > 3) {
      setError("Please select maximum 3 topics.");
      return;
    }
    if (!difficulty) {
      setError("Please select a difficulty level.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      console.log("Check for existing match");
      const token = await getAccessTokenSilently();
      const res = await axios.get(
        `${MATCHING_SERVICE_URL}/api/matching/initiateMatch`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            userId: user.sub,
          },
        }
      );
      /** @type {import("../types").InitiateMatchResponse} */
      const data = res.data;
      console.log("Received data", data);
      switch (data.code) {
        case "has-existing":
          {
            /** @type {import("../types").MatchExists} */
            data;
            const sessionId = data.session.sessionId;
            const questionId = data.session.questionId;
            const language = data.session.criteria.language;
            alert(`Please submit the previous session before finding a new match`);
            navigate(formSectionUrl(sessionId, questionId, language), {
              state: {
                session: data.session,
                question: questionId,
                timestamp: Date.now(),
              },
            });
          }
          break;
        case "no-existing":
          {
            /** @type {MatchRequest} */
            const matchRequest = {
              type: "match-request",
              criterias: selectedTopics.map((topic) => ({
                difficulty,
                language: normalizeLanguageId(language),
                topic,
              })),
            };

            const response = await submitMatchRequestViaWebSocket(
              user.sub,
              matchRequest
            );
            console.log(`Response: `, response);
            if (response.success) {
              onSubmit && onSubmit(matchRequest, response);
              handleClose();
            } else {
              setError("Failed to submit match request. Please try again.");
            }
          }
          break;
        default:
          console.log(`Unaccounted case: ${data.code}`);
          break;
      }
    } catch (err) {
      setError("Failed to submit match request. Please try again.");
      console.error("Error submitting match request:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={handleDisconnectAndClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Select Matching Criteria</h2>
          <button
            className="close-button"
            onClick={handleDisconnectAndClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-form">
          {error && <div className="error-message">{error}</div>}

          {/* Programming Language Selection */}
          <div className="form-section">
            <h3>Programming Language *</h3>
            <div className="radio-group">
              {languages.map((lang) => (
                <label key={lang} className="radio-item">
                  <input
                    type="radio"
                    name="language"
                    value={lang}
                    checked={language === lang}
                    onChange={(e) => setLanguage(e.target.value)}
                  />
                  <span className="radio-label">{lang}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Topics Selection */}
          <div className="form-section">
            <h3>Topics * (Select up to 3)</h3>
            <div className="selected-count">
              {selectedTopics.length}/3 selected
            </div>
            {isLoading ? (
              <div className="loading">Loading topics...</div>
            ) : (
              <div className="checkbox-group">
                {availableTopics.map((topic) => (
                  <label key={topic} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedTopics.includes(topic)}
                      onChange={() => handleTopicChange(topic)}
                      disabled={
                        !selectedTopics.includes(topic) &&
                        selectedTopics.length >= 3
                      }
                    />
                    <span
                      className={`checkbox-label ${
                        !selectedTopics.includes(topic) &&
                        selectedTopics.length >= 3
                          ? "disabled"
                          : ""
                      }`}
                    >
                      {topic}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Difficulty Selection */}
          <div className="form-section">
            <h3>Difficulty Level *</h3>
            <div className="radio-group">
              {difficulties.map((diff) => (
                <label key={diff} className="radio-item">
                  <input
                    type="radio"
                    name="difficulty"
                    value={diff}
                    checked={difficulty === diff}
                    onChange={(e) => setDifficulty(e.target.value)}
                  />
                  <span className="radio-label">
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="dialog-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={handleDisconnectAndClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? "Submitting..." : "Find Match"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MatchingCriteriaDialog;
