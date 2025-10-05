import MatchingModel from "./matching_model.js";
import "dotenv/config";
import { connect } from "mongoose";
import { monitorListingUsingEventTransmitter } from "../service/change_stream.js";
import { configDotenv } from "dotenv";

configDotenv();

export async function connectToDB() {
  let mongoDBUri =
    process.env.ENV === "PROD"
      ? process.env.DB_CLOUD_URI
      : process.env.DB_LOCAL_URI;
  try {
    const c = await connect(mongoDBUri);
    MatchingModel.wa;
    console.log("Mongodb connected successfully");
  } catch (error) {
    console.error("Error: " + error);
  }
}

/** @typedef {import("../server.js").Criteria} Criteria */

/**
 * @param {string} clientId
 * @param {"searching" | "found" | "pending" | "matched"} status
 * searching is searching for a match,
 * found means a match is found and is waiting for the server to send request,
 * pending is waiting for user to ack acceptance or rejection,
 * matched is for system to clean up
 * @param {Criteria} criterias
 */
export async function storeMatchRequest(clientId, status, criterias) {
  const newMatch = new MatchingModel({
    userId: clientId,
    status: status,
    criterias: criterias,
  });

  const doc = await newMatch.save();
  // monitorListingUsingEventTransmitter(
  //   MatchingModel,
  //   process.env.QUEUE_TIMEOUT,
  //   [
  //     {
  //       $match: { "documentKey._id": doc._id },
  //     },
  //   ]
  // );
}

/**
 * @param {MatchingModel} match
 * @returns {Promise<Array>}
 */
export async function findCompatibleMatch(match) {
  try {
    const searchCriteria = match.criterias;

    const orConditions = searchCriteria.map((criteria) => ({
      criterias: {
        $elemMatch: {
          difficulty: criteria.difficulty,
          language: criteria.language,
          topic: criteria.topic,
        },
      },
    }));

    const compatibleMatches = await MatchingModel.find({
      $and: [
        {
          $or: orConditions,
        },
        {
          userId: { $ne: match.userId },
        },
        {
          status: "waiting",
        },
      ],
    }).sort({ createdAt: asc });
    compatibleMatches[0];
    return compatibleMatches;
  } catch (error) {
    console.error("Error finding compatible matches:", error);
    throw error;
  }
}

/**
 * @param {string} clientId
 */
export async function cancelMatch(clientId) {
  try {
    await MatchingModel.deleteMany({
      userId: clientId,
    });
    console.log("Client match request deleted");
  } catch (error) {
    console.error("Error while deleting client request", error);
  }
}
