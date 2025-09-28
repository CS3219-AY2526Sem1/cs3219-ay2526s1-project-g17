import mongoose from "mongoose";

const Schema = mongoose.Schema;

const criteriaSchema = new Schema({
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  language: {
    type: String,
    required: true
  },
  topic: {
    type: String,
    required: true,
  },
},
  { _id: false }
)

const matchingSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ['waiting', 'matched', 'cancelled'],
    default: 'waiting',
    required: true,
  },
  criterias: {
    type: [criteriaSchema],
    required: true,
    validate: v => v.length > 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("MatchingModel", matchingSchema,);
