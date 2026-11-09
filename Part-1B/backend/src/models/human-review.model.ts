import { Schema, model } from "mongoose";

const humanReviewSchema = new Schema(
  {
    reviewer: { type: String, required: true, trim: true },
    decision: { type: String, enum: ["ACCEPT", "REJECT"], required: true },
    justification: { type: String, required: true, trim: true },
    knownLimitations: { type: String, default: "" },
    residualRisks: { type: String, default: "" },
  },
  { timestamps: true },
);

export const HumanReviewModel = model("HumanReview", humanReviewSchema);
