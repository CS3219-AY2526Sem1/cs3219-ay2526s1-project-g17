import { useState, useEffect } from "react";
import MatchingCriteriaDialog from "../components/MatchingCriteriaDialog";
import MatchingTimer from "../components/MatchingTimer";
import MatchFoundDialog from "../components/MatchFoundDialog";
import {
  getWebSocketService,
  acceptMatch,
  rejectMatch,
  submitMatchRequestViaWebSocket,
} from "../services/matchingService";

export default function MatchingPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [matchRequestId, setMatchRequestId] = useState(null);
  const [matchedPartner, setMatchedPartner] = useState(null);
  const [isMatchFoundDialogOpen, setIsMatchFoundDialogOpen] = useState(false);
  const [matchFoundData, setMatchFoundData] = useState(null);
  const [isAcceptingMatch, setIsAcceptingMatch] = useState(false);
  const [lastMatchCriteria, setLastMatchCriteria] = useState(null);

  useEffect(() => {
    const wsService = getWebSocketService();

    // Handle match found messages
    wsService.onMessage("matchFound", (message) => {
      console.log("Match found:", message);
      setIsMatching(false);
      setMatchFoundData(message);
      setIsMatchFoundDialogOpen(true);
    });

    // Handle match timeout messages
    wsService.onMessage("matchTimeout", (message) => {
      console.log("Match timeout:", message);
      setIsMatching(false);
      setMatchRequestId(null);
      alert("Match request timed out. Please try again.");
    });

    // Handle match cancelled messages
    wsService.onMessage("matchCancelled", (message) => {
      console.log("Match cancelled:", message);
      setIsMatchFoundDialogOpen(false);
      setMatchFoundData(null);
      setIsAcceptingMatch(false);

      // Resume matching with the same criteria if they exist
      setLastMatchCriteria((prevCriteria) => {
        if (prevCriteria) {
          console.log(
            "Resuming match queue with previous criteria:",
            prevCriteria
          );
          setIsMatching(true);
          // Auto-submit the previous match request
          submitMatchRequestViaWebSocket(prevCriteria)
            .then((response) => {
              setMatchRequestId(response.requestId);
              console.log(
                "Automatically resumed matching with request ID:",
                response.requestId
              );
            })
            .catch((error) => {
              console.error("Failed to resume matching:", error);
              setIsMatching(false);
              alert("Failed to resume matching. Please try again.");
            });
        } else {
          setIsMatching(false);
          setMatchRequestId(null);
        }
        return prevCriteria; // Return the same criteria
      });
    });

    // Handle match accepted by both parties
    wsService.onMessage("matchAccepted", (message) => {
      console.log("Match accepted by both parties:", message);
      setIsMatchFoundDialogOpen(false);
      setMatchFoundData(null);
      setIsAcceptingMatch(false);
      // Navigate to collaboration session or show success
      alert("Match confirmed! Starting collaboration session...");
    });

    // Handle match rejected
    wsService.onMessage("matchRejected", (message) => {
      console.log("Match was rejected:", message);
      setIsMatchFoundDialogOpen(false);
      setMatchFoundData(null);
      setMatchedPartner(null);
      setIsAcceptingMatch(false);
      alert("Match was rejected. You can search for another match.");
    });

    // Cleanup on unmount
    return () => {
      wsService.removeMessageHandler("matchFound");
      wsService.removeMessageHandler("matchTimeout");
      wsService.removeMessageHandler("matchCancelled");
      wsService.removeMessageHandler("matchAccepted");
      wsService.removeMessageHandler("matchRejected");
    };
  }, []);

  const handleOpenDialog = async () => {
    // Ensure WebSocket is connected before opening dialog
    const wsService = getWebSocketService();
    if (!wsService.isConnected) {
      try {
        await wsService.connect();
        console.log("WebSocket reconnected for new match request");
      } catch (error) {
        console.error("Failed to reconnect WebSocket:", error);
        alert("Failed to connect to matching service. Please try again.");
        return;
      }
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handleMatchSubmit = (matchRequest, response) => {
    console.log("Match request submitted:", matchRequest);
    console.log("Server response:", response);

    // Store the match criteria for potential resume
    setLastMatchCriteria(matchRequest);

    // Start the matching process
    setIsMatching(true);
    setMatchRequestId(response.requestId);
    setMatchedPartner(null);

    // Close the dialog (this is already handled in the dialog component)
    setIsDialogOpen(false);
  };

  const handleCancelMatch = () => {
    setIsMatching(false);
    setMatchRequestId(null);
    console.log("Match request cancelled by user");
  };

  const handleAcceptMatch = async () => {
    setIsAcceptingMatch(true);
    try {
      if (matchFoundData?.matchId) {
        await acceptMatch(matchFoundData.matchId);
        setMatchedPartner(matchFoundData);
        setIsMatchFoundDialogOpen(false);
        setMatchFoundData(null);
        console.log("Match accepted");
      }
    } catch (error) {
      console.error("Error accepting match:", error);
      alert("Failed to accept match. Please try again.");
    } finally {
      setIsAcceptingMatch(false);
    }
  };

  const handleRejectMatch = async () => {
    try {
      if (matchFoundData?.matchId) {
        await rejectMatch(matchFoundData.matchId);
      }

      // Close the dialog
      setIsMatchFoundDialogOpen(false);
      setMatchFoundData(null);

      // Clean up all matching state
      setIsMatching(false);
      setMatchRequestId(null);
      setMatchedPartner(null);
      setIsAcceptingMatch(false);

      // Disconnect WebSocket to end matching session
      const wsService = getWebSocketService();
      wsService.disconnect();

      console.log("Match rejected and WebSocket disconnected");
    } catch (error) {
      console.error("Error rejecting match:", error);

      // Still clean up even if rejection fails
      setIsMatchFoundDialogOpen(false);
      setMatchFoundData(null);
      setIsMatching(false);
      setMatchRequestId(null);
      setMatchedPartner(null);
      setIsAcceptingMatch(false);

      // Disconnect WebSocket
      const wsService = getWebSocketService();
      wsService.disconnect();
    }
  };

  return (
    <div className="app-container">
      {/* Timer overlay - appears at top center when matching */}
      <MatchingTimer
        isVisible={isMatching}
        requestId={matchRequestId}
        onCancel={handleCancelMatch}
      />

      <div className="main-content">
        <h1>PeerPrep Matching Service</h1>
        <p>Find your coding practice partner</p>

        {!isMatching && !matchedPartner && (
          <button className="find-match-button" onClick={handleOpenDialog}>
            Find a Match
          </button>
        )}

        {matchedPartner && (
          <div className="match-result">
            <h2>Match Found!</h2>
            <p>
              You have been matched with:{" "}
              {matchedPartner.partner?.username || "Unknown user"}
            </p>
            <button
              className="new-match-button"
              onClick={() => {
                setMatchedPartner(null);
                handleOpenDialog();
              }}
            >
              Find Another Match
            </button>
          </div>
        )}
      </div>

      <MatchingCriteriaDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleMatchSubmit}
      />

      <MatchFoundDialog
        isOpen={isMatchFoundDialogOpen}
        matchData={matchFoundData}
        onAccept={handleAcceptMatch}
        onReject={handleRejectMatch}
        isAccepting={isAcceptingMatch}
      />
    </div>
  );
}
