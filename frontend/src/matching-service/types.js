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
 */

/**
 * @typedef {Object} MatchFoundResponse
 * @property {"matchFoundResponse"} type
 * @property {"accept" | "reject"} response
 */

/** @typedef {MatchRequest | MatchFoundResponse} MessageToServer*/

/**
 * @typedef {Object} MatchFoundNotification
 * @property {"matchFound"} type
 * @property {string} matchId
 * @property {Array<Criteria>} criterias
 * @property {Object} partner
 * @property {string} partner.username
 * @property {number} timeoutDuration
 */

/**
 * @typedef {Object} MatchAcceptedNotification
 * @property {"matchAccepted"} type
 * @property {string} matchId
 * @property {string} sessionId
 */

/**
 * @typedef {Object} MatchRejectedNotification
 * @property {"matchRejected"} type
 * @property {string} matchId
 * @property {string} reason
 */

/**
 * @typedef {Object} MatchTimeoutNotification
 * @property {"matchTimeout"} type
 * @property {string} matchId
 */

/**
 * @typedef {Object} MatchCancelledNotification
 * @property {"matchCancelled"} type
 * @property {string} requestId
 */

/**
 * @typedef {Object} CollaborationSessionNotification
 * @property {"collaborationSession"} type
 * @property {string} session
 */

/**
 * @typedef {MatchFoundNotification | MatchAcceptedNotification | MatchRejectedNotification | MatchTimeoutNotification | MatchCancelledNotification | CollaborationSessionNotification} Notification
 */


export {};
