/** @typedef {import("ws").WebSocket} WebSocket*/

/**
 * @typedef {Object} Criteria
 * @property {"easy" | "medium" | "hard"} difficulty
 * @property {string} language
 * @property {string} topic
 */

/**
 * @typedef {Object} MatchRequest
 * @property {"matchRequest"} type
 * @property {Array<Criteria>} criterias
 * @property {number} time
 */

/**
 * @typedef {Object} MatchFoundNotification
 * @property {"matchFound"} type
 * @property {Criteria} criteria
 */

/**
 * @typedef {Object} MatchRequestEntity
 * @property {string} userId
 * @property {"waiting" | "pending" | "matched" | "initial"} status
 * @property {Array<Criteria>} criterias
 * @property {number} time
 */

/**
 * @typedef {MatchRequest | MatchAck} Message
 */

/**
 * @typedef {Object} UserInstance
 * @property {WebSocket} ws
 * @property {string} id
 */

/**
 * @typedef {Object} MatchAck
 * @property {"matchAck"} type
 * @property {"accept" | "reject"} response
 */

/**
 * @typedef {import("crypto").UUID} UUID;
 */

/**
 * @typedef {Object} AcceptanceTimeoutNotification
 * @property {String} reason
 */

/**
 * @typedef {Object} MatchedDetails
 * @property {boolean} accepts
 * @property {string} partner
 * @property {Criteria} criteria
 */

/**
 * @typedef {Object} CollaborationSession
 * @property {string} session
 */
export {};
