import Question from "../../models/Question.js";

export async function getAllQuestions(_, res) {
    try {
        const questions = await Question.find();
        res.status(200).json(questions);
    } catch (error) {
        console.error("Error in getAllQuestions controller", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function getQuestionById(req, res) {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) return res.status(404).json({ message: "Question not found" })

        res.status(200).json(question);
    } catch (error) {
        console.error("Error in getQuestionById controller", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function getAllTopics(_, res) {
    try {
        const data = await Question.find();
        const allTopics = [...new Set(data.flatMap(q => q.topics))];

        res.status(200).json(allTopics);
    } catch (error) {
        console.error("Error in getAllTopics controller", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function createQuestion(req, res) {
    try {
        const { title, question, difficulty, topics, link, testCases, constraints, hints, solution } = req.body;
        const newQuestion = new Question({ title, question, difficulty, topics, link, testCases, constraints, hints, solution });
        const savedQuestion = await newQuestion.save();
        res.status(201).json({ savedQuestion });
    } catch (error) {
        console.error("Error in createQuestion controller", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function editQuestion(req, res) {
    try {
        const { title, question, difficulty, topics, link, testCases, constraints, hints, solution } = req.body;
        const editedQuestion = await Question.findByIdAndUpdate(
            req.params.id,
            { title, question, difficulty, topics, link, testCases, constraints, hints, solution },
            { new: true }
        );
        if (!editedQuestion) return res.status(404).json({ message: "Question not found" });
        res.status(200).json(editedQuestion);
    } catch (error) {
        console.error("Error in editQuestion controller", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function deleteQuestion(req, res) {
    try {
        const deletedQuestion = await Question.findByIdAndDelete(req.params.id);
        if (!deletedQuestion) return res.status(404).json({ message: "Question not found" });
        res.status(200).json({ message: "Question deleted successfully" })
    } catch (error) {
        console.error("Error in deleteQuestion controller", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function getRandomQuestionByDifficultyAndTopic(req, res) {
    try {
        const { difficulty, topics } = req.body;

        const data = await Question.aggregate()
            .match({
                difficulty: difficulty,
                topics: { $in: topics } // will return a list of matches as long as one of the topics in the request is present in the database
            })
            .sample(1); // picks at random from matched list

        if (data.length == 0) return res.status(404).json({ message: "No question matches the defined criteria" });

        // if multiple topics are specified (for eg. array, oop):
        // like q1 has [array, recursion]
        // and  q2 has [recursion, oop]
        // match will return both q1 and q2 then size will pick one at random

        // does not work if no topic selected
        // does not work if no difficulty selected

        res.status(200).json(data);
    } catch (error) {
        console.error("Error in getRandomQuestionByDifficultyAndTopic controller", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function getListOfQuestionsByDifficultyAndTopic(req, res) {
    try {
        const { difficulty, topics } = req.body;

        const data = await Question.aggregate()
            .match({
                difficulty: difficulty,
                topics: { $in: topics } // will return a list of matches as long as one of the topics in the request is present in the database
            });

        if (data.length == 0) return res.status(404).json({ message: "No question matches the defined criteria" });

        // if multiple topics are specified (for eg. array, oop):
        // like q1 has [array, recursion]
        // and  q2 has [recursion, oop]

        // does not work if no topic selected
        // does not work if no difficulty selected

        res.status(200).json(data);
    } catch (error) {
        console.error("Error in getListOfQuestionsByDifficultyAndTopic controller", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function getListOfTopicsByDifficulty(_, res) {
    try {
        const data = await Question.find();

        // initialise arrays for beginner, intermediate and advanced difficulty
        const result = {};
        data.forEach(q => {
            if (!result[q.difficulty]) {
                result[q.difficulty] = [];
            }
            result[q.difficulty].push(...q.topics);
        });

        // remove duplicates and sort topics for each difficulty
        Object.keys(result).forEach(difficulty => {
            result[difficulty] = [...new Set(result[difficulty])].sort();
        });

        res.status(200).json(result);
    } catch (error) {
        console.error("Error in getListOfTopicsByDifficulty controller", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function insertMany(req, res) {
    try {
        const questionsArray = req.body;
        if (!Array.isArray(questionsArray) || questionsArray.length === 0) {
            return res.status(400).json({ message: "Request body must be a non-empty array of questions" });
        }
        const result = await Question.insertMany(questionsArray);
        res.status(201).json({ insertedCount: result.length, insertedQuestions: result });
    } catch (error) {
        console.error("Error in insertMany controller", error);
        res.status(500).json({ message: "Internal server error" });
    }
}