import { Types } from "mongoose";
import { DepartmentModel } from "../../models/department.model.js";
import { TicketModel } from "../../models/ticket.model.js";
import { notFound } from "../request-validation.js";
import type { CreateTicketInput } from "./ticket.schemas.js";

export interface DepartmentResponse {
  id: string;
  name: string;
}

export interface StaffResponse {
  id: string;
  displayName: string;
  role: string;
  active: boolean;
}

export interface TicketResponse {
  id: string;
  reference: string;
  title: string;
  description: string;
  department: DepartmentResponse;
  priority: string;
  status: string;
  assignee: StaffResponse | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

const ticketPopulate = [
  { path: "departmentId", select: "name" },
  { path: "assigneeId", select: "displayName role active" },
];

export async function createTicket(
  input: CreateTicketInput,
): Promise<TicketResponse> {
  const department = await DepartmentModel.findOne({
    _id: input.departmentId,
    active: true,
  }).exec();
  if (!department) {
    throw notFound("Active department");
  }

  const ticket = await TicketModel.create({
    title: input.title,
    description: input.description,
    departmentId: input.departmentId,
    priority: input.priority,
  });
  await ticket.populate(ticketPopulate);
  return serializeTicket(ticket);
}

export async function getTicketByReference(
  reference: string,
): Promise<TicketResponse> {
  const id = reference.slice(4);
  const ticket = await TicketModel.findById(new Types.ObjectId(id))
    .populate(ticketPopulate)
    .exec();
  if (!ticket) {
    throw notFound("Ticket");
  }

  return serializeTicket(ticket);
}

export function serializeTicket(ticket: unknown): TicketResponse {
  const raw = toRecord(ticket);
  const department = toRecord(raw.departmentId);
  const assignee =
    raw.assigneeId === null ? null : toRecord(raw.assigneeId);
  const id = identifier(raw._id);

  return {
    id,
    reference: `TKT-${id.toUpperCase()}`,
    title: requiredString(raw.title, "title"),
    description: requiredString(raw.description, "description"),
    department: {
      id: identifier(department._id),
      name: requiredString(department.name, "department name"),
    },
    priority: requiredString(raw.priority, "priority"),
    status: requiredString(raw.status, "status"),
    assignee:
      assignee === null
        ? null
        : {
            id: identifier(assignee._id),
            displayName: requiredString(assignee.displayName, "assignee name"),
            role: requiredString(assignee.role, "assignee role"),
            active: requiredBoolean(assignee.active, "assignee active"),
          },
    resolutionNote:
      raw.resolutionNote === null
        ? null
        : requiredString(raw.resolutionNote, "resolution note"),
    createdAt: requiredDate(raw.createdAt, "createdAt"),
    updatedAt: requiredDate(raw.updatedAt, "updatedAt"),
  };
}

export function toRecord(value: unknown): Record<string, unknown> {
  const plainValue =
    isRecord(value) && typeof value.toObject === "function"
      ? value.toObject()
      : value;

  if (!isRecord(plainValue)) {
    throw new Error("A persisted ticket reference is missing.");
  }
  return plainValue;
}

function identifier(value: unknown): string {
  if (value instanceof Types.ObjectId) {
    return value.toHexString();
  }
  if (typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value)) {
    return value.toLowerCase();
  }
  throw new Error("A persisted API reference is invalid.");
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`Persisted ${field} is missing.`);
  }
  return value;
}

function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Persisted ${field} is missing.`);
  }
  return value;
}

function requiredDate(value: unknown, field: string): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`Persisted ${field} is invalid.`);
  }
  return value.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
