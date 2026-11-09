import { z } from "zod";

const descriptionSchema = z
  .string({
    required_error: "Description is required.",
    invalid_type_error: "Description must be a string.",
  })
  .trim()
  .min(1, "Description is required.")
  .max(20000, "Ticket description is too long.")
  .refine((value) => /[\p{L}\p{N}]/u.test(value), "Ticket description must contain usable text.");

export const ticketSubmissionSchema = z
  .object({
    description: descriptionSchema,
    source: z.string().trim().max(200).nullish(),
  })
  .strict();

export const validateTicketSubmission = (payload: unknown) => ticketSubmissionSchema.parse(payload);

export function isUnsupportedTicketDescription(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return true;
  }

  const suspiciousInstructionPattern =
    /(ignore\s+(?:all\s+)?(?:previous|prior|hidden|system|developer|policy)\s+instructions?|ignore\s+policy|reveal\s+(?:your|the)\s+(?:system\s+)?prompt|act\s+as\s+if|override\s+the\s+rules|disregard\s+your\s+rules)/i;

  const meaningfulProblemPattern =
    /(issue|problem|error|outage|down|cannot|can't|unable|access|login|billing|invoice|charge|refund|password|email|vpn|slow|unavailable|request|reset|account|dashboard|api|support|need|help|bug)/i;

  return suspiciousInstructionPattern.test(trimmed) && !meaningfulProblemPattern.test(trimmed);
}

export function sanitizeTicketDescription(value: string): string {
  const withoutInstructionOverrides = value
    .replace(/\b(?:ignore|disregard|override)\s+(?:all\s+)?(?:previous|prior|hidden|system|developer|policy)\s+instructions?\b/gi, " ")
    .replace(/\b(?:reveal|show|print|leak)\s+(?:your|the)\s+(?:system\s+)?prompt\b/gi, " ")
    .replace(/\b(?:act\s+as|you\s+are)\b.*$/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return withoutInstructionOverrides || value.trim();
}
