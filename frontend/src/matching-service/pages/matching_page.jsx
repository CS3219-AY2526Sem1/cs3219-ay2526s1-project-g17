import { useState } from "react";
import MatchingCriteriaDialog from "../components/MatchingCriteriaDialog";

export default function MatchingPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handleMatchSubmit = (matchRequest, response) => {
    console.log("Match request submitted:", matchRequest);
    console.log("Server response:", response);
    // TODO: Handle the match request submission (e.g., navigate to matching page, show status)
    alert(
      `Match request submitted successfully! Request ID: ${response.requestId}`
    );
  };

  return (
    <div className="app-container">
      <div className="main-content">
        <h1>PeerPrep Matching Service</h1>
        <p>Find your coding practice partner</p>

        <button className="find-match-button" onClick={handleOpenDialog}>
          Find a Match
        </button>
      </div>

      <MatchingCriteriaDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleMatchSubmit}
      />
    </div>
  );
}
