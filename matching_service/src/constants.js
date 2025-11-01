import { isDEV } from "./server_config.js";

export const MATCH_REQUEST_PREFIX = "MATCH_REQUEST";
export const matchedPairKeyPrefix = "matched_pair:";
export const matchedDetailsPrefix = "matched_details:";
export const COLLABORATION_SESSION_PREFIX = "COLLABORATION_SESSION";
export const MATCH_REQUEST_IDX = "MATCH_REQUEST_IDX";
export const MATCHED_DETAILS_PREFIX = "MATCHED_DETAILS";
export const COLLABORATION_URL = isDEV
  ? "http://localhost:3002/api/collaboration"
  : "https://collaboration-service-226307456137.asia-southeast1.run.app";
