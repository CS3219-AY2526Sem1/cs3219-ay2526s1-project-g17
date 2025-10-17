import express from "express";
import { collaborationService, matchedDetailsService } from "../server.js";
import axios from "axios";
import { COLLABORATION_URL } from "../constants.js";

const router = express.Router();

router.delete("/endSession", async (req, res) => {
  const { userId1, userId2 } = req.body;
  try {
    if (!userId1 || !userId2) {
      throw new Error("bad request body");
    }
    await collaborationService.deleteCollaborationSession(userId1, userId2);
    console.log("Session close successful");
    res.status(200).send({ message: "Session closed" });
  } catch (error) {
    console.error("Session close error", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/**
 * @param {string} sessionId
 */
async function fetchSession(sessionId) {
  try {
    const res = await axios.get(`${COLLABORATION_URL}/sessions/${sessionId}`);
    const data = res.data;
    console.log("Session retrieved", data);
    return data;
  } catch (error) {
    console.error("Failed to fetch session", error);
    return null;
  }
}

router.get("/initiateMatch", async (req, res) => {
  const { userId } = req.body;
  try {
    const matchedDetails = await matchedDetailsService.getMatchedDetails(
      userId
    );
    if (matchedDetails) {
      const collaborationSession =
        await collaborationService.getCollaborationSession(
          userId,
          matchedDetails.partner
        );
      //TODO: Call collaboration service to check if there such session
      const session = await fetchSession(collaborationSession.session);

      if (collaborationSession && session) {
        res
          .status(200)
          .json({ code: "has-existing", session: collaborationSession });
      } else {
        res.status(200).json({ code: "no-existing" });
      }
    } else {
      res.status(200).json({ code: "no-existing" });
    }
  } catch (error) {
    console.error("Session close error", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
