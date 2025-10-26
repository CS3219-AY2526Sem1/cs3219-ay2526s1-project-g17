import axios from "axios";
import {  QUESTION_SERVICE_URL } from "./constants";

export async function getRandomQuestion(criteria) {
  console.log(criteria);
  try {
    const res = await axios.get(
      `${QUESTION_SERVICE_URL}/api/questions/randomQuestion`,
      {
        params: {
          difficulty: criteria.difficulty,
          topics: criteria.topic,
        },
      }
    );
    if (res.status === 404) {
      console.log("No question matching the criteria", criteria);
      return null;
    } else if (res.status === 200) {
      console.log("Question found!", res.data);
      return res.data;
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

export function formSectionUrl(sessionId, questionId) {
    return `/collaboration/${sessionId}?questionId=${questionId}`
}
