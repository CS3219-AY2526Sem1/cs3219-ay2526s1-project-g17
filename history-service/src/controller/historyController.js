import { QuestionAttempt } from "../models/Attempt.js";

/**
 * GET /history/:userId
 * Fetches all question attempts for the specified user.
 */
export async function getUsersHistory(req, res) {
  try {
    const { userId } = req.params;

    // Optional: pagination
    const limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;

    // Query attempts by user, most recent first
    const attempts = await QuestionAttempt.find({ userId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // plain JS object, faster than full Mongoose doc

    if (!attempts.length) {
      return res.status(404).json({ message: "No history found for this user." });
    }

    res.status(200).json({
      userId,
      count: attempts.length,
      attempts,
    });
  } catch (error) {
    console.error("Error fetching user history:", error);
    res.status(500).json({ message: "Server error retrieving user history." });
  }
}

/**
 * POST /history/create-attempt
 * Creates an attempt with the specified body
 */
export async function createAttempt(req, res) {
  try {
    const { userId, questionId, submissionCode } = req.body;
    const newAttempt = new QuestionAttempt( {userId, questionId, submissionCode} )
    const savedAttempt = await newAttempt.save();
    res.status(201).json({savedAttempt})
  } catch (error) {
    console.error("Error in createAttempt controller: ", error);
    res.status(500).json({message: "Internal server error"});
  }
}

/**
 * PUT /history/update-attempt
 * Updates an attempt with that ID with the specified body
 */
export async function updateAttempt(req, res) {
  try {
    const { attemptId, userId, questionId, submissionCode } = req.body;
    const editedAttempt = await QuestionAttempt.findByIdAndUpdate(
      req.params.id,
      { attemptId, userId, questionId, submissionCode },
      { new: true }
    )

    if (!editedAttempt) {
      return res.status(404).json({message: "Attempt not found"})
    }
    res.status(200).json(editedAttempt)
  } catch (error) {
    console.error("Error in updateAttempt controller: ", error);
    res.status(500).json({message: "Internal server error"});
  }
}