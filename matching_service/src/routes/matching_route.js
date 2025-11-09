import express from "express";
import { collaborationService, matchedDetailsService } from "../server.js";
import { verifyAccessToken } from "../middleware/basic_access_control.js";
import { fetchExistingSession } from "../utility/utility.js";

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

router.get("/initiateMatch", verifyAccessToken, async (req, res) => {
  const { userId } = req.query;
  try {
    const matchedDetails = await matchedDetailsService.getMatchedDetails(
      userId.toString()
    );
    console.log("Matched details", matchedDetails);
    if (matchedDetails) {
      const collaborationSession =
        await collaborationService.getCollaborationSession(
          userId.toString(),
          matchedDetails.partner
        );

      if (collaborationSession) {
        const session = await fetchExistingSession(
          collaborationSession.sessionId
        );
        console.log("Session from collaboration service", session)
        if (session && session.isActive) {
          console.log(`${collaborationSession.sessionId} is still active`);
          res
            .status(200)
            .json({ code: "has-existing", session: collaborationSession });
        } else {
          await collaborationService.deleteCollaborationSession(
            userId.toString(),
            matchedDetails.partner
          );
          res.status(200).json({ code: "no-existing" });
        }
      } else {
        res.status(200).json({ code: "no-existing" });
      }
    } else {
      res.status(200).json({ code: "no-existing" });
    }
  } catch (error) {
    console.error("Initiate match error", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
