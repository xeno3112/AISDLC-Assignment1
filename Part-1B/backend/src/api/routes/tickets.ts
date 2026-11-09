import { Router } from "express";

import type { ClassificationResult } from "../../domain/classification/types.js";
import {
  validateTicketSubmission,
  isUnsupportedTicketDescription,
} from "../../domain/validation/ticket-submission.js";
import { evaluateRuntimeClassificationSensors } from "../../domain/validation/runtime-classification-sensors.js";
import {
  classificationService,
  InvalidClassificationOutputError,
} from "../../services/classification/classification-service.js";
import { LlmProviderError } from "../../services/llm/provider.js";
import { logger } from "../../utils/logger.js";

export type TicketClassifier = (description: string) => Promise<ClassificationResult>;

export function createTicketsRouter(
  classifyTicket: TicketClassifier = classificationService.classifyTicket,
) {
  const router = Router();

  router.post("/tickets/classify", async (req, res) => {
    let submission: { description: string; source?: string | null };

    try {
      submission = validateTicketSubmission(req.body);
    } catch {
      res.status(400).json({ error: "A valid ticket description is required." });
      return;
    }

    if (isUnsupportedTicketDescription(submission.description)) {
      res.status(400).json({ error: "The request does not contain a valid support ticket." });
      return;
    }

    logger.info("Ticket classification started", {
      ticketLength: submission.description.length,
      sourceProvided: Boolean(submission.source),
    });

    try {
      const result = await classifyTicket(submission.description);
      const sensors = evaluateRuntimeClassificationSensors(result);
      logger.info("Runtime classification sensors evaluated", sensors);
      if (!sensors.allApplicablePassed) {
        logger.error("Runtime classification sensors rejected response", sensors);
        res.status(500).json({ error: "The classification response did not meet runtime safety checks." });
        return;
      }
      const statusCode = result.status === "success" ? 200 : 422;
      logger.info("Ticket classification response sent", {
        statusCode,
        resultStatus: result.status,
        categoryPresent: result.category !== null,
        priorityPresent: result.priority !== null,
        summaryLength: result.summary.length,
        clarificationQuestionPresent: result.clarification_question !== null,
      });
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error(
        "Runtime classification sensors could not evaluate a classification response",
        evaluateRuntimeClassificationSensors(null),
      );
      const hasDiagnosticCode =
        error instanceof LlmProviderError || error instanceof InvalidClassificationOutputError;
      const errorName = hasDiagnosticCode
        ? error.name
        : error instanceof Error
          ? error.name
          : "UnknownError";
      logger.error("Ticket classification failed", {
        errorName,
        ...(hasDiagnosticCode ? { diagnosticCode: error.diagnosticCode } : {}),
        ...(error instanceof LlmProviderError && error.statusCode !== undefined
          ? { statusCode: error.statusCode }
          : {}),
      });
      res.status(500).json({ error: "The classification service could not process this ticket." });
    }
  });

  return router;
}
