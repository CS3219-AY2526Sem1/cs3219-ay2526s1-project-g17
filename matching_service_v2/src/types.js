/** @typedef {import("ws").WebSocket} WebSocket*/

/**
 * @typedef {"easy" | "medium" | "hard"} Difficulty
 */

/**
 * @typedef {Object} Criteria
 * @property {"criteria"} type
 * @property {Difficulty} difficulty
 * @property {string} language
 * @property {string} topic
 */

/**
 * @typedef {MatchRequest | MatchCancelRequest} UserMessage
 */

/**
 * @typedef {Object} MatchRequest
 * @property {"match-request"} type
 * @property {Array<Criteria>} criterias
 * @property {number} time
 */

/**
 * @typedef {Object} MatchCancelRequest
 * @property {"match-cancel"} type
 */

/**
 * @typedef {Object} MatchRequestEntity
 * @property {string} userId
 * @property {"waiting" | "matched"} status
 * @property {Array<Criteria>} criterias
 * @property {number} time
 */

/**
 * @typedef {Object} UserInstance
 * @property {WebSocket} ws
 * @property {string} id
 */

/**
 * @typedef {Object} CollaborationSession
 * @property {Criteria} criteria
 * @property {string} session
 * @property {[string, string]} userIds
 */

/**
 * @typedef {Object} MatchedDetails
 * @property {string} partner
 * @property {Criteria} criteria
 */

/**
 * @typedef {Object} MatchFound
 * @property {"match-found"} type
 * @property {CollaborationSession} session
 */

/**
 * @typedef {MatchFound} ToUser
 */

export {};
