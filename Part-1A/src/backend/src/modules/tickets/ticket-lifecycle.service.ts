import { Types } from "mongoose";
import { StaffMemberModel } from "../../models/staff-member.model.js";
import { TicketModel } from "../../models/ticket.model.js";
import { conflict, notFound } from "../request-validation.js";
import type { TransitionInput } from "./ticket.schemas.js";
import { serializeTicket, type TicketResponse } from "./ticket.service.js";

type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";
type ConfirmationAction = "close" | "archive";

const eligibleRoles = ["support", "operations"];
const ticketPopulate = [
  { path: "departmentId", select: "name" },
  { path: "assigneeId", select: "displayName role active" },
];

export async function transitionTicket(
  reference: string,
  action: TransitionInput,
): Promise<TicketResponse> {
  const id = new Types.ObjectId(reference.slice(4));
  const current = await TicketModel.findById(id).select("_id status assigneeId").exec();
  if (!current) {
    throw notFound("Ticket");
  }

  let expectedStatus: TicketStatus;
  let nextStatus: TicketStatus;
  const update: Record<string, unknown> = {};

  switch (action.action) {
    case "start": {
      expectedStatus = "Open";
      nextStatus = "In Progress";
      if (!current.assigneeId) {
        throw conflict("An eligible assignee is required to start work.");
      }
      const assignee = await StaffMemberModel.findById(current.assigneeId).exec();
      if (
        !assignee ||
        !assignee.active ||
        !eligibleRoles.includes(assignee.role)
      ) {
        throw conflict("An active eligible assignee is required to start work.");
      }
      update.assigneeId = current.assigneeId;
      break;
    }
    case "returnToOpen":
      expectedStatus = "In Progress";
      nextStatus = "Open";
      break;
    case "resolve":
      expectedStatus = "In Progress";
      nextStatus = "Resolved";
      update.resolutionNote = action.resolutionNote;
      break;
    case "reopen":
      expectedStatus = "Resolved";
      nextStatus = "Open";
      break;
  }

  if (current.status !== expectedStatus) {
    throw conflict(`The ${action.action} action is not valid for this ticket.`);
  }
  update.status = nextStatus;

  const filter: Record<string, unknown> = { _id: id, status: expectedStatus };
  if (action.action === "start") {
    filter.assigneeId = current.assigneeId;
  }
  const updated = await TicketModel.findOneAndUpdate(
    filter,
    { $set: update },
    { returnDocument: "after", runValidators: true },
  )
    .populate(ticketPopulate)
    .exec();

  if (!updated) {
    throw conflict("The ticket changed before the action could be saved.");
  }
  return serializeTicket(updated);
}

export async function updateResolutionNote(
  reference: string,
  resolutionNote: string,
): Promise<TicketResponse> {
  const id = new Types.ObjectId(reference.slice(4));
  const updated = await TicketModel.findOneAndUpdate(
    { _id: id, status: "Resolved" },
    { $set: { resolutionNote } },
    { returnDocument: "after", runValidators: true },
  )
    .populate(ticketPopulate)
    .exec();

  if (updated) {
    return serializeTicket(updated);
  }

  const ticket = await TicketModel.findById(id).select("_id").exec();
  if (!ticket) {
    throw notFound("Ticket");
  }
  throw conflict("Resolution notes can only be changed while Resolved.");
}

export async function confirmTicketAction(
  reference: string,
  action: ConfirmationAction,
): Promise<TicketResponse> {
  const id = new Types.ObjectId(reference.slice(4));
  const expectedStatus = action === "close" ? "Resolved" : "Closed";
  const nextStatus = action === "close" ? "Closed" : "Archived";
  const updated = await TicketModel.findOneAndUpdate(
    { _id: id, status: expectedStatus },
    { $set: { status: nextStatus } },
    { returnDocument: "after", runValidators: true },
  )
    .populate(ticketPopulate)
    .exec();

  if (updated) {
    return serializeTicket(updated);
  }

  const ticket = await TicketModel.findById(id).select("_id").exec();
  if (!ticket) {
    throw notFound("Ticket");
  }
  throw conflict(`Only ${expectedStatus} tickets can be ${action}d.`);
}
