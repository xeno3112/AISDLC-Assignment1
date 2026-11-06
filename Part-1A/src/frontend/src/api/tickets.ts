import type { components, paths } from "./openapi.js";

export type Ticket = components["schemas"]["Ticket"];
export type TicketStatus = components["schemas"]["TicketStatus"];
export type Priority = components["schemas"]["Priority"];
export type Department = components["schemas"]["Department"];
export type StaffMember = components["schemas"]["StaffMember"];
export type CreateTicketInput =
  paths["/tickets"]["post"]["requestBody"]["content"]["application/json"];
export type TicketPage =
  paths["/tickets"]["get"]["responses"]["200"]["content"]["application/json"];
export type TicketView = "open" | "assigned" | "archived" | "all";
export type StaffEligibility = "assignable" | "all";

export interface TicketQuery {
  view: TicketView;
  status?: TicketStatus;
  priority?: Priority;
  assigneeId?: string;
  page?: number;
  pageSize?: number;
}

interface ApiErrorBody {
  code: string;
  message: string;
  fields?: Record<string, string>;
  requestId?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly fields: Record<string, string> | undefined,
    readonly requestId: string | undefined,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function listDepartments(): Promise<Department[]> {
  const response = await request<{ items: Department[] }>("/departments");
  return response.items;
}

export async function listStaff(
  eligibility: StaffEligibility = "assignable",
): Promise<StaffMember[]> {
  const query = new URLSearchParams({ eligibility });
  const response = await request<{ items: StaffMember[] }>(`/staff?${query}`);
  return response.items;
}

export function listTickets(query: TicketQuery): Promise<TicketPage> {
  const params = new URLSearchParams({
    view: query.view,
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 50),
  });
  if (query.status) params.set("status", query.status);
  if (query.priority) params.set("priority", query.priority);
  if (query.assigneeId) params.set("assigneeId", query.assigneeId);
  return request<TicketPage>(`/tickets?${params}`);
}

export function getTicket(reference: string): Promise<Ticket> {
  return request<Ticket>(`/tickets/${encodeURIComponent(reference)}`);
}

export function createTicket(input: CreateTicketInput): Promise<Ticket> {
  return request<Ticket>("/tickets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAssignee(
  reference: string,
  assigneeId: string | null,
): Promise<Ticket> {
  return request<Ticket>(`/tickets/${encodeURIComponent(reference)}/assignee`, {
    method: "PATCH",
    body: JSON.stringify({ assigneeId }),
  });
}

export function transitionTicket(
  reference: string,
  action: "start" | "returnToOpen" | "reopen",
): Promise<Ticket> {
  return request<Ticket>(
    `/tickets/${encodeURIComponent(reference)}/transitions`,
    {
      method: "POST",
      body: JSON.stringify({ action }),
    },
  );
}

export function resolveTicket(
  reference: string,
  resolutionNote: string,
): Promise<Ticket> {
  return request<Ticket>(
    `/tickets/${encodeURIComponent(reference)}/transitions`,
    {
      method: "POST",
      body: JSON.stringify({ action: "resolve", resolutionNote }),
    },
  );
}

export function updateResolutionNote(
  reference: string,
  resolutionNote: string,
): Promise<Ticket> {
  return request<Ticket>(
    `/tickets/${encodeURIComponent(reference)}/resolution`,
    {
      method: "PATCH",
      body: JSON.stringify({ resolutionNote }),
    },
  );
}

export function closeTicket(reference: string): Promise<Ticket> {
  return confirmAction(reference, "close");
}

export function archiveTicket(reference: string): Promise<Ticket> {
  return confirmAction(reference, "archive");
}

async function confirmAction(
  reference: string,
  action: "close" | "archive",
): Promise<Ticket> {
  return request<Ticket>(
    `/tickets/${encodeURIComponent(reference)}/${action}`,
    {
      method: "POST",
      body: JSON.stringify({ confirmed: true }),
    },
  );
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const body = await readResponse(response);

  if (!response.ok) {
    const error = parseApiError(body);
    throw new ApiError(
      error?.message ?? "The request could not be completed.",
      response.status,
      error?.code ?? "REQUEST_FAILED",
      error?.fields,
      error?.requestId,
    );
  }

  if (!isRecord(body)) {
    throw new ApiError(
      "The server returned an invalid response.",
      response.status,
      "INVALID_RESPONSE",
      undefined,
      undefined,
    );
  }
  return body as T;
}

async function readResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    if (!response.ok) return undefined;
    throw new ApiError(
      "The server returned an empty response.",
      response.status,
      "INVALID_RESPONSE",
      undefined,
      undefined,
    );
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(
      "The server returned an invalid response.",
      response.status,
      "INVALID_RESPONSE",
      undefined,
      undefined,
    );
  }
}

function parseApiError(body: unknown): ApiErrorBody | undefined {
  if (!isRecord(body) || !isRecord(body.error)) return undefined;
  const error = body.error;
  if (typeof error.code !== "string" || typeof error.message !== "string") {
    return undefined;
  }
  return {
    code: error.code,
    message: error.message,
    ...(isStringRecord(error.fields) ? { fields: error.fields } : {}),
    ...(typeof error.requestId === "string"
      ? { requestId: error.requestId }
      : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.values(value).every((item) => typeof item === "string")
  );
}
