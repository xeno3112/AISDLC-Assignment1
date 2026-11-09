export const CLASSIFICATION_CATEGORIES = [
  "Technical Issue",
  "Access Request",
  "Billing Issue",
  "General Inquiry",
] as const;

export const CLASSIFICATION_PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;

export const CLASSIFICATION_STATUSES = [
  "success",
  "clarification_required",
  "rejected",
] as const;

export type ClassificationCategory = (typeof CLASSIFICATION_CATEGORIES)[number];
export type ClassificationPriority = (typeof CLASSIFICATION_PRIORITIES)[number];
export type ClassificationStatus = (typeof CLASSIFICATION_STATUSES)[number];

export type TicketSubmissionRequest = {
  description: string;
  source?: string | null;
};

export type ClassificationResult = {
  category: ClassificationCategory | null;
  priority: ClassificationPriority | null;
  summary: string;
  status: ClassificationStatus;
  clarification_question: string | null;
};

export type SafeErrorResponse = {
  error: string;
};
