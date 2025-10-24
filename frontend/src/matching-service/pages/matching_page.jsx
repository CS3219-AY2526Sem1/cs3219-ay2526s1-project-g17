import { useState, useEffect } from "react";
import MatchingCriteriaDialog from "../components/MatchingCriteriaDialog";
import MatchingTimer from "../components/MatchingTimer";

import { getWebSocketService } from "../services/matchingService";
import "./MatchingPage.css";
import { NavigationBar } from "../../components/NavigationBar";
import { useAuth0 } from "@auth0/auth0-react";
import LoadingSpinner from "../../components/LoadingSpinner";
import { MATCH_CANCELLED, MATCH_FOUND, MATCH_TIMEOUT } from "../constants";
import { useNavigate } from "react-router";

export default function MatchingPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [matchRequestId, setMatchRequestId] = useState(null);
  const naviagte = useNavigate();
  const { user } = useAuth0();

  const { isLoading } = useAuth0();

  useEffect(() => {
    const wsService = getWebSocketService();

    // Handle match found messages
    wsService.onMessage(MATCH_FOUND, (message) => {
      console.log("Match found:", message);
      setIsMatching(false);
      const session = message.session;
      const sessionId = session.session;
      naviagte(`collaboration/${sessionId}`);
    });

    // Handle match timeout messages
    wsService.onMessage(MATCH_TIMEOUT, (message) => {
      console.log("Match timeout:", message);
      setIsMatching(false);
      setMatchRequestId(null);
      alert("Match request timed out. Please try again.");
    });

    // Handle match cancelled messages
    wsService.onMessage(MATCH_CANCELLED, (message) => {
      console.log("Match cancelled:", message);
    });

    // Cleanup on unmount
    return () => {
      wsService.removeMessageHandler(MATCH_FOUND);
      wsService.removeMessageHandler(MATCH_CANCELLED);
      wsService.removeMessageHandler(MATCH_TIMEOUT);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenDialog = async () => {
    if (!user) {
      console.log("User not logged in");
      naviagte("/");
      return;
    }
    // Ensure WebSocket is connected before opening dialog
    const wsService = getWebSocketService();
    const userId = user.sub;
    if (!wsService.isConnected) {
      try {
        await wsService.connect(userId);
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

    // Start the matching process
    setIsMatching(true);
    setMatchRequestId(response.requestId);

    // Close the dialog (this is already handled in the dialog component)
    setIsDialogOpen(false);
  };

  const handleCancelMatch = () => {
    setIsMatching(false);
    setMatchRequestId(null);
    const wsService = getWebSocketService();
    wsService.disconnect();
    console.log("Match request cancelled by user");
  };

  if (isLoading) {
    return <LoadingSpinner text="Preparing your session" />;
  } else {
    return (
      <div className="matching-page">
        <NavigationBar />
        <div className="matching with-nav-offset">
          {/* Timer overlay */}
          <MatchingTimer
            isVisible={isMatching}
            requestId={matchRequestId}
            onCancel={handleCancelMatch}
          />

          <main className="matching__container">
            <section className="matching__hero">
              <div className="matching__content">
                <h1 className="matching__title">Find your coding partner</h1>
                <p className="matching__subtitle">
                  Choose your difficulty, topics, and preferences — we’ll pair
                  you in seconds.
                </p>

                {!isMatching && (
                  <div className="matching__actions">
                    <button
                      className="btn btn--primary"
                      onClick={handleOpenDialog}
                    >
                      Find a Match
                    </button>
                  </div>
                )}
              </div>

              <aside className="matching__art">
                {/* Optional illustration/screenshot */}
                <div className="matching__artBox" aria-hidden />
              </aside>
            </section>
          </main>

          <MatchingCriteriaDialog
            isOpen={isDialogOpen}
            onClose={handleCloseDialog}
            onSubmit={handleMatchSubmit}
          />
        </div>
      </div>
    );
  }
}
