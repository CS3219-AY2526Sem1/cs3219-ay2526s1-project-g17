export const QUEUE_TIMEOUT = import.meta.env.VITE_QUEUE_TIMEOUT;

export const MATCH_FOUND = "match-found";
export const MATCH_TIMEOUT = "match-timeout";
export const MATCH_CANCELLED = "match-cancel";
export const ACK = "ack";
export const ENV = import.meta.env.VITE_ENV;
export const MATCHING_SERVICE_URL =
  import.meta.env.VITE_MATCHING_SERVICE_BASE || "http://localhost:3001";
export const QUESTION_SERVICE_URL =
  import.meta.env.VITE_QUESTION_SERVICE_BASE || "http://localhost:5001";
