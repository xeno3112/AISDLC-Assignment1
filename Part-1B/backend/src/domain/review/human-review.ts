import { z } from "zod";

export const humanReviewSchema = z
  .object({
    evaluationRunId: z.string().trim().min(1),
    reviewer: z.string().trim().min(1),
    decision: z.enum(["ACCEPT", "REJECT"]),
    justification: z.string().trim().min(1),
    knownLimitations: z.string(),
    residualRisks: z.string(),
    timestamp: z.string().datetime(),
  })
  .strict();

export type HumanReviewEvidence = z.infer<typeof humanReviewSchema>;
