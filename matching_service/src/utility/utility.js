/** @typedef {import("../types").UserInstance} UserInstance */
/** @typedef {import("../types").MatchRequest} MatchRequest */
/** @typedef {import("../types").MatchRequestEntity} MatchRequestEntity */
/** @typedef {import("../types").Criteria} Criteria */

import axios from "axios";
import { QUESTION_SERVICE_URL } from "../constants.js";

/**
 * @param {Criteria} criteria
 */
export async function getRandomQuestion(criteria) {
  console.log("Random question crietria:", criteria);
  try {
    const params = {
      difficulty: criteria["difficulty"],
      topics: criteria["topic"],
    };
    console.log(params);
    const res = await axios.get(
      `${QUESTION_SERVICE_URL}/api/questions/randomQuestion`,
      {
        params,
        timeout: 5000,
      }
    );
    if (res.status === 200) {
      console.log("Question found!", res.data);
      return res.data;
    } else if (res.status === 404) {
      console.log("No question matching the criteria", criteria);
      return null;
    } else if (res.status === 500) {
      console.log(res.data.message);
      return null;
    } else {
      console.log("Unaccounted state: ", res.status);
      return null;
    }
  } catch (error) {
    console.error("Failed to fetch question", error);
    return null;
  }
}
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
