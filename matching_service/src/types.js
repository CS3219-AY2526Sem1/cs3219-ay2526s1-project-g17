/**
 * @typedef {Object} Criteria
 * @property {"easy" | "medium" | "hard"} difficulty
 * @property {string} language
 * @property {string} topic
 */

/**
 * @typedef {MatchRequest | MatchAck} Message
 */

/**
 * @typedef {Object} UserInstance
 * @property {WebSocket} ws
 * @property {UUID} id
 */

/**
 * @typedef {Object} MatchRequest
 * @property {"matchRequest"} typename
 * @property {Array<Criteria>} criterias
 * @property {number} time
 */

/**
 * @typedef {Object} MatchAck
 * @property {"matchAck"} typename
 * @property {"accept" | "reject"} response
 */

/**
 * @typedef {import("crypto").UUID} UUID;
 */

/**
 * @typedef {Object} MatchPair
 * @property {UUID} partner
 * @property {boolean} accepted
 */

/**
 * @typedef {Object} AcceptanceTimeoutNotification
 * @property {String} reason
 */

export {};
