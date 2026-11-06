import { Types } from "mongoose";
import {
  TicketModel,
  ticketPriorities,
  ticketStatuses,
} from "../../models/ticket.model.js";
import type { TicketListQuery } from "./ticket.schemas.js";
import {
  serializeTicket,
  type TicketResponse,
} from "./ticket.service.js";

export interface TicketPage {
  items: TicketResponse[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

type TicketFilterCondition =
  | { status: (typeof ticketStatuses)[number] }
  | { status: { $ne: "Archived" } }
  | { assigneeId: { $ne: null } }
  | { assigneeId: Types.ObjectId }
  | { priority: (typeof ticketPriorities)[number] };

export function buildTicketFilter(
  query: TicketListQuery,
): { $and: TicketFilterCondition[] } {
  const conditions: TicketFilterCondition[] = [];

  switch (query.view) {
    case "open":
      conditions.push({ status: "Open" });
      break;
    case "assigned":
      conditions.push({ status: { $ne: "Archived" } }, { assigneeId: { $ne: null } });
      break;
    case "archived":
      conditions.push({ status: "Archived" });
      break;
    case "all":
      conditions.push({ status: { $ne: "Archived" } });
      break;
  }

  if (query.status) {
    conditions.push({ status: query.status });
  }
  if (query.priority) {
    conditions.push({ priority: query.priority });
  }
  if (query.assigneeId) {
    conditions.push({ assigneeId: new Types.ObjectId(query.assigneeId) });
  }

  return { $and: conditions };
}

export async function listTickets(
  query: TicketListQuery,
): Promise<TicketPage> {
  const filter = buildTicketFilter(query);
  const [tickets, total] = await Promise.all([
    TicketModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .populate([
        { path: "departmentId", select: "name" },
        { path: "assigneeId", select: "displayName role active" },
      ])
      .exec(),
    TicketModel.countDocuments(filter).exec(),
  ]);

  return {
    items: tickets.map(serializeTicket),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.ceil(total / query.pageSize),
  };
}
