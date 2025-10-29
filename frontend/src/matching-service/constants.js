export const QUEUE_TIMEOUT = import.meta.env.VITE_QUEUE_TIMEOUT;

export const MATCH_FOUND = "match-found";
export const MATCH_TIMEOUT = "match-timeout";
export const MATCH_CANCELLED = "match-cancel";
export const ACK = "ack";
export const ENV = import.meta.env.VITE_ENV;
// export const MATCHING_SERVICE_URL =
//   ENV === "PROD"
//     ? "https://matching-service-226307456137.asia-southeast1.run.app"
//     : "http://localhost:3001";
// export const QUESTION_SERVICE_URL =
//   ENV === "PROD"
//     ? "https://question-service-226307456137.asia-southeast1.run.app"
//     : "http://localhost:5001";
export const MATCHING_SERVICE_URL =
  "https://matching-service-226307456137.asia-southeast1.run.app";

export const QUESTION_SERVICE_URL =
  "https://question-service-226307456137.asia-southeast1.run.app";
