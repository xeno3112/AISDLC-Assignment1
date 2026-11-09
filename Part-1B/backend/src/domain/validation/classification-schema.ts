import { z } from "zod";

import {
  CLASSIFICATION_CATEGORIES,
  CLASSIFICATION_PRIORITIES,
  CLASSIFICATION_STATUSES,
} from "../classification/types.js";

const categoryEnum = z.enum(CLASSIFICATION_CATEGORIES);
const priorityEnum = z.enum(CLASSIFICATION_PRIORITIES);
const statusEnum = z.enum(CLASSIFICATION_STATUSES);

const countWords = (value: string): number => value.trim().split(/\s+/).filter(Boolean).length;

export const ticketSubmissionSchema = z
  .object({
    description: z.string().trim().min(1, "Description is required."),
    source: z.string().trim().max(200).nullish(),
  })
  .strict();

export const classificationResultSchema = z
  .object({
    category: z.union([categoryEnum, z.null()]),
    priority: z.union([priorityEnum, z.null()]),
    summary: z
      .string()
      .max(250, "Summary must not exceed 250 characters.")
      .refine((value) => countWords(value) <= 50, "Summary must be 50 words or fewer."),
    status: statusEnum,
    clarification_question: z.string().nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const hasSummary = value.summary.trim().length > 0;

    if (value.status === "success") {
      if (value.category === null || value.priority === null) {
        ctx.addIssue({ code: "custom", message: "Success responses require category and priority." });
      }
      if (!hasSummary) {
        ctx.addIssue({ code: "custom", message: "Success responses require a non-empty summary." });
      }
      if (value.clarification_question !== null) {
        ctx.addIssue({ code: "custom", message: "Success responses must not include a clarification question." });
      }
      return;
    }

    if (value.status === "clarification_required") {
      if (value.category !== null || value.priority !== null) {
        ctx.addIssue({ code: "custom", message: "Clarification responses must set category and priority to null." });
      }
      if (!value.clarification_question || value.clarification_question.trim().length === 0) {
        ctx.addIssue({ code: "custom", message: "Clarification responses require a question." });
      }
      return;
    }

    if (value.status === "rejected") {
      if (value.category !== null || value.priority !== null) {
        ctx.addIssue({ code: "custom", message: "Rejected responses must clear category and priority." });
      }
      if (value.summary.trim().length > 0) {
        ctx.addIssue({ code: "custom", message: "Rejected responses must use an empty summary." });
      }
      if (value.clarification_question !== null) {
        ctx.addIssue({ code: "custom", message: "Rejected responses must clear the clarification question." });
      }
    }
  });

export type ClassificationResultInput = z.infer<typeof classificationResultSchema>;

export const validateClassificationResponse = (payload: unknown) =>
  classificationResultSchema.parse(payload);
