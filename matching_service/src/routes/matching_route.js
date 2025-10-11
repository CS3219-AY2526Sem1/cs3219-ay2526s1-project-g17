import express from "express";
import redisRepository from "../model/redis_repository";

const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({ message: "Hello from matching service" });
});

router.delete("/endSession", async (req, res) => {
  const { userId1, userId2 } = req.body;
  try {
    await redisRepository.removeCollaborationSession(userId1, userId2);
    console.log("Session close successful");
    res.status(200).send({ message: "Session closed" });
  } catch (error) {
    console.error("Session close error", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/initiateMatch", async (req, res) => {
  const { userId } = req.body;
  try {
    const matchedDetails = await redisRepository.getMatchedDetails(userId);
    if (matchedDetails) {
      const collaborationSession =
        await redisRepository.getCollaborationSession(
          userId,
          matchedDetails.partner
        );
      if (collaborationSession) {
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
