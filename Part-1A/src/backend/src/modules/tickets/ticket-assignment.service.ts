import { Types } from "mongoose";
import { StaffMemberModel } from "../../models/staff-member.model.js";
import { TicketModel } from "../../models/ticket.model.js";
import { conflict, notFound } from "../request-validation.js";
import { serializeTicket, type TicketResponse } from "./ticket.service.js";

const eligibleRoles = ["support", "operations"];
const ticketPopulate = [
  { path: "departmentId", select: "name" },
  { path: "assigneeId", select: "displayName role active" },
];

export async function updateTicketAssignee(
  reference: string,
  assigneeId: string | null,
): Promise<TicketResponse> {
  const id = new Types.ObjectId(reference.slice(4));
  const current = await TicketModel.findById(id)
    .select("_id status")
    .exec();
  if (!current) {
    throw notFound("Ticket");
  }
  if (current.status !== "Open" && current.status !== "In Progress") {
    throw conflict("Only Open or In Progress tickets can be assigned.");
  }
  if (assigneeId === null && current.status !== "Open") {
    throw conflict("An In Progress ticket must retain an eligible assignee.");
  }

  let assignedStaffId: Types.ObjectId | null = null;
  if (assigneeId !== null) {
    const staff = await StaffMemberModel.findById(assigneeId).exec();
    if (!staff) {
      throw notFound("Staff member");
    }
    if (!staff.active || !eligibleRoles.includes(staff.role)) {
      throw conflict("The selected staff member is not eligible for assignment.");
    }
    assignedStaffId = new Types.ObjectId(assigneeId);
  }

  const updated = await TicketModel.findOneAndUpdate(
    { _id: id, status: current.status },
    { $set: { assigneeId: assignedStaffId } },
    { returnDocument: "after", runValidators: true },
  )
    .populate(ticketPopulate)
    .exec();

  if (!updated) {
    throw conflict("The ticket changed before the assignment could be saved.");
  }
  return serializeTicket(updated);
}
