import { describe, expect, it, afterEach, jest } from "@jest/globals";
import { getUsersHistory, createAttempt, updateAttempt } from "../src/controller/historyController.js";
import { QuestionAttempt } from "../src/models/Attempt.js";

const buildMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("historyController", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getUsersHistory", () => {
    const userId = "user-123";

    it("returns paginated history when attempts exist", async () => {
      const mockAttempts = [
        {
          _id: "attempt-1",
          userId,
          questionId: "q1",
          submissionCode: "code",
          timestamp: new Date().toISOString(),
        },
      ];

      const mockQueryChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockAttempts),
      };

      const findSpy = jest.spyOn(QuestionAttempt, "find").mockReturnValue(mockQueryChain);

      const req = {
        params: { userId },
        query: { limit: "5", skip: "0" },
        auth: { payload: { sub: userId } },
      };
      const res = buildMockRes();

      await getUsersHistory(req, res);

      expect(findSpy).toHaveBeenCalledWith({ userId });
      expect(mockQueryChain.sort).toHaveBeenCalledWith({ timestamp: -1 });
      expect(mockQueryChain.skip).toHaveBeenCalledWith(0);
      expect(mockQueryChain.limit).toHaveBeenCalledWith(5);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        userId,
        count: mockAttempts.length,
        attempts: mockAttempts,
      });
    });

    it("returns 403 when token subject does not match requested userId", async () => {
      const req = {
        params: { userId },
        query: {},
        auth: { payload: { sub: "different-user" } },
      };

      const res = buildMockRes();

      await getUsersHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
    });

    it("returns 404 when no attempts are found", async () => {
      const mockQueryChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      jest.spyOn(QuestionAttempt, "find").mockReturnValue(mockQueryChain);
      const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const req = {
        params: { userId },
        query: {},
        auth: { payload: { sub: userId } },
      };
      const res = buildMockRes();

      await getUsersHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "No history found for this user." });
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("returns 500 when querying history throws an error", async () => {
      const mockQueryChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error("database exploded")),
      };

      jest.spyOn(QuestionAttempt, "find").mockReturnValue(mockQueryChain);
      const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const req = {
        params: { userId },
        query: {},
        auth: { payload: { sub: userId } },
      };
      const res = buildMockRes();

      await getUsersHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Server error retrieving user history." });
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe("createAttempt", () => {
    const baseBody = {
      userId: "user-123",
      questionId: "question-xyz",
      submissionCode: "console.log('hi');",
    };

    it("persists a new attempt and returns 201", async () => {
      const savedAttempt = { ...baseBody, _id: "attempt-123" };
      const saveSpy = jest.spyOn(QuestionAttempt.prototype, "save").mockResolvedValue(savedAttempt);

      const req = { body: baseBody };
      const res = buildMockRes();

      await createAttempt(req, res);

      expect(saveSpy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ savedAttempt });
    });

    it("returns 500 when persistence fails", async () => {
      jest.spyOn(QuestionAttempt.prototype, "save").mockRejectedValue(new Error("write failed"));
      const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const req = { body: baseBody };
      const res = buildMockRes();

      await createAttempt(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe("updateAttempt", () => {
    const reqBase = {
      params: { id: "mongo-id-1" },
      body: {
        attemptId: "external-id",
        userId: "user-123",
        questionId: "q-100",
        submissionCode: "updated submission",
      },
    };

    it("updates an attempt and returns the edited document", async () => {
      const updated = { ...reqBase.body, _id: reqBase.params.id };
      const updateSpy = jest
        .spyOn(QuestionAttempt, "findByIdAndUpdate")
        .mockResolvedValue(updated);

      const res = buildMockRes();

      await updateAttempt(reqBase, res);

      expect(updateSpy).toHaveBeenCalledWith(
        reqBase.params.id,
        reqBase.body,
        { new: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it("returns 404 when the attempt does not exist", async () => {
      jest.spyOn(QuestionAttempt, "findByIdAndUpdate").mockResolvedValue(null);

      const res = buildMockRes();

      await updateAttempt(reqBase, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Attempt not found" });
    });

    it("returns 500 when updating fails unexpectedly", async () => {
      jest.spyOn(QuestionAttempt, "findByIdAndUpdate").mockRejectedValue(new Error("boom"));
      const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const res = buildMockRes();

      await updateAttempt(reqBase, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
