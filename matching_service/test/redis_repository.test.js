// import { randomUUID } from "crypto";
// import {
//   afterAll,
//   afterEach,
//   beforeAll,
//   describe,
//   expect,
//   jest,
//   test,
// } from "@jest/globals";
// import redisRepository from "../src/model/redis_repository.js";
// import { configDotenv } from "dotenv";
// /** @typedef {Promise<import("../src/types.js").CollaborationSession>} CollaborationSession */
// /** @typedef {import("../src/types.js").MatchRequestEntity} MatchRequestEntity */
// /** @typedef {import("../src/types.js").MatchedDetails} MatchedDetails*/

// configDotenv();
// const TEST_REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// describe("RedisRepository CRUD operations", () => {
//   beforeAll(async () => {
//     await redisRepository.connect(TEST_REDIS_URL);
//     await redisRepository.flushAll();
//   });

//   afterAll(async () => {
//     await redisRepository.flushAll();
//     await redisRepository.disconnect();
//   });

//   test("store, get, update, and remove user request", async () => {
//     const userId = randomUUID();
//     /** @type {MatchRequestEntity} */
//     const request = {
//       userId,
//       status: "waiting",
//       criterias: [{ difficulty: "easy", language: "js", topic: "array" }],
//       time: Date.now(),
//     };
//     await redisRepository.storeUserRequest(userId, request, 60);
//     let stored = await redisRepository.getUserRequest(userId);
//     expect(stored).toMatchObject(request);

//     await redisRepository.updateUserRequest(userId, "pending");
//     stored = await redisRepository.getUserRequest(userId);
//     expect(stored.status).toBe("pending");

//     await redisRepository.removeUserRequest(userId);
//     stored = await redisRepository.getUserRequest(userId);
//     expect(stored).toBeNull();
//   });

//   test("getAllUserRequests returns all requests", async () => {
//     const userId1 = randomUUID();
//     const userId2 = randomUUID();
//     /** @type {MatchRequestEntity} */
//     const request1 = {
//       userId: userId1,
//       status: "waiting",
//       criterias: [{ difficulty: "easy", language: "js", topic: "array" }],
//       time: Date.now(),
//     };
//     /** @type {MatchRequestEntity} */
//     const request2 = {
//       userId: userId2,
//       status: "pending",
//       criterias: [{ difficulty: "medium", language: "py", topic: "string" }],
//       time: Date.now(),
//     };
//     await redisRepository.storeUserRequest(userId1, request1, 60);
//     await redisRepository.storeUserRequest(userId2, request2, 60);
//     const requests = await redisRepository.getAllUserRequests();
//     console.log(requests);
//     expect(requests.get(userId1)).toMatchObject(request1);
//     expect(requests.get(userId2)).toMatchObject(request2);
//     await redisRepository.removeUserRequest(userId1);
//     await redisRepository.removeUserRequest(userId2);
//   });

//   test("store, get, update, and remove matched details", async () => {
//     const userId = randomUUID();
//     /** @type {MatchedDetails} */
//     const details = {
//       partner: randomUUID(),
//       criteria: { difficulty: "hard", language: "js", topic: "tree" },
//       accepts: false,
//     };
//     await redisRepository.storeMatchedDetails(userId, details);
//     let stored = await redisRepository.getMatchedDetails(userId);
//     expect(stored).toMatchObject(details);

//     /** @type {MatchedDetails} */
//     const updatedDetails = {
//       ...details,
//       criteria: { difficulty: "easy", language: "js", topic: "array" },
//     };
//     await redisRepository.updateMatchedDetails(userId, updatedDetails);
//     stored = await redisRepository.getMatchedDetails(userId);
//     expect(stored).toMatchObject(updatedDetails);

//     await redisRepository.removeMatchedDetails(userId);
//     stored = await redisRepository.getMatchedDetails(userId);
//     expect(stored).toBeNull();
//   });

//   test("getPairMatchDetails returns both details", async () => {
//     const userId1 = randomUUID();
//     const userId2 = randomUUID();

//     /** @type {MatchedDetails} */
//     const details1 = {
//       partner: userId2,
//       criteria: { difficulty: "easy", language: "js", topic: "array" },
//       accepts: false,
//     };
//     /** @type {MatchedDetails} */
//     const details2 = {
//       partner: userId1,
//       criteria: { difficulty: "medium", language: "py", topic: "string" },
//       accepts: false,
//     };
//     await redisRepository.storeMatchedDetails(userId1, details1);
//     await redisRepository.storeMatchedDetails(userId2, details2);
//     const [ret1, ret2] = await redisRepository.getPairMatchDetails(
//       userId1,
//       userId2
//     );
//     expect(ret1).toMatchObject(details1);
//     expect(ret2).toMatchObject(details2);
//     await redisRepository.removeMatchedDetails(userId1);
//     await redisRepository.removeMatchedDetails(userId2);
//   });

//   test("store, get, and remove collaboration session", async () => {
//     const userId1 = randomUUID();
//     const userId2 = randomUUID();
//     const sessionId = randomUUID();
//     await redisRepository.storeCollaborationSession(
//       sessionId,
//       userId1,
//       userId2
//     );
//     const session = await redisRepository.getCollaborationSession(
//       userId1,
//       userId2
//     );
//     expect(session.session).toBe(sessionId);
//     await redisRepository.removeCollaborationSession(userId1, userId2);
//     const removed = await redisRepository.getCollaborationSession(
//       userId1,
//       userId2
//     );
//     expect(removed).toBeNull();
//   });
// });
