/** @typedef {import("../types").UserInstance} UserInstance */
/** @typedef {import("../types").MatchRequest} MatchRequest */
/** @typedef {import("../types").MatchRequestEntity} MatchRequestEntity */
/** @typedef {import("../types").Criteria} Criteria */

/**
 * @param {MatchRequest} request
 * @param {UserInstance} userInstance
 */
export function matchRequestToEntity(userInstance, request) {
  /** @type {MatchRequestEntity} */
  const matchRequestEntity = {
    userId: userInstance.id,
    status: "waiting",
    criterias: request.criterias,
    time: request.time,
  };
  return matchRequestEntity;
}

/**
 * @param {Array<Criteria>} criterias
 * @param {Array<Criteria>} otherCriterias
 * @returns {boolean}
 */
export function hasMatchingCriteria(criterias, otherCriterias) {
  const totalLength = criterias.length + otherCriterias.length;
  console.log("otherCriterias", otherCriterias);
  const serializedCriterias = criterias.map((c) => JSON.stringify(c));
  const serializedOtherCriterias = otherCriterias.map((c) => JSON.stringify(c));

  const appendCriteria = [...serializedCriterias, ...serializedOtherCriterias];
  const set = new Set(appendCriteria);
  return set.size !== totalLength;
}

/**
 * @param {Array<Criteria>} criterias
 * @param {Array<Criteria>} otherCriterias
 * @returns {Criteria | undefined}
 */
export function findMatchingCriteria(criterias, otherCriterias) {
  const otherCriteriaStrings = new Set(
    otherCriterias.map((c) => JSON.stringify(c))
  );
  for (const criteria of criterias) {
    const criteriaString = JSON.stringify(criteria);
    if (otherCriteriaStrings.has(criteriaString)) {
      return criteria;
    }
  }
  return undefined;
}

/**
 * @param {number} milliseconds
 */
export async function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

