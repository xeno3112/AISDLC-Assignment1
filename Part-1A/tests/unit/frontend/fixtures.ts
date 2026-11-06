import type {
  Department,
  StaffMember,
  Ticket,
  TicketPage,
} from "../../../src/frontend/src/api/tickets.js";

export const department: Department = {
  id: "aaaaaaaaaaaaaaaaaaaaaaaa",
  name: "Customer Care",
};

export const staff: StaffMember[] = [
  {
    id: "bbbbbbbbbbbbbbbbbbbbbbbb",
    displayName: "Alex Morgan",
    role: "support",
    active: true,
  },
  {
    id: "cccccccccccccccccccccccc",
    displayName: "Sam Lee",
    role: "operations",
    active: true,
  },
  {
    id: "dddddddddddddddddddddddd",
    displayName: "Pat Other",
    role: "other",
    active: true,
  },
  {
    id: "eeeeeeeeeeeeeeeeeeeeeeee",
    displayName: "Inactive Support",
    role: "support",
    active: false,
  },
];

export function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "ffffffffffffffffffffffff",
    reference: "TKT-FFFFFFFFFFFFFFFFFFFFFFFF",
    title: "Unable to access the billing portal",
    description: "The billing portal returns an error after sign in.",
    department,
    priority: "High",
    status: "Open",
    assignee: null,
    resolutionNote: null,
    createdAt: "2026-11-06T00:00:00.000Z",
    updatedAt: "2026-11-06T00:00:00.000Z",
    ...overrides,
  };
}

export function makeTicketPage(items: Ticket[] = [makeTicket()]): TicketPage {
  return {
    items,
    page: 1,
    pageSize: 50,
    total: items.length,
    totalPages: items.length > 0 ? 1 : 0,
  };
}

export function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
