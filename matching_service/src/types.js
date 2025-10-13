/** @typedef {import("ws").WebSocket} WebSocket*/

/**
 * @typedef {"easy" | "medium" | "hard"} Difficulty
 */

/**
 * @typedef {Object} Criteria
 * @property {Difficulty} difficulty
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
 * @typedef {"waiting" | "pending" | "matched" | "initial"} MatchRequestStatus
 */

/**
 * @typedef {Object} MatchRequestEntity
 * @property {string} userId
 * @property {MatchRequestStatus} status
 * @property {Array<Criteria>} criterias
 * @property {number} time
 */

/**
 * @typedef {MatchRequest | MatchFoundResponse} Message
 */

/**
 * @typedef {Object} UserInstance
 * @property {WebSocket} ws
 * @property {string} id
 */

/**
 * @typedef {Object} MatchFoundResponse
 * @property {"matchFoundResponse"} type
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
