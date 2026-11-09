import { Schema, model } from "mongoose";

const evaluationRunSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["pending", "evaluated", "pending_human_review", "accepted", "rejected"],
      default: "pending",
    },
    caseCount: { type: Number, default: 0 },
    summary: { type: String, default: "" },
    scores: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true },
);

export const EvaluationRunModel = model("EvaluationRun", evaluationRunSchema);
