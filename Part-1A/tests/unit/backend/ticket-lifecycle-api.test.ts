import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const models = vi.hoisted(() => ({
  staff: { findById: vi.fn() },
  tickets: {
    findById: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock("../../../src/backend/src/models/staff-member.model.js", () => ({
  StaffMemberModel: models.staff,
}));
vi.mock("../../../src/backend/src/models/ticket.model.js", () => ({
  TicketModel: models.tickets,
  ticketPriorities: ["Low", "Normal", "High", "Urgent"],
  ticketStatuses: ["Open", "In Progress", "Resolved", "Closed", "Archived"],
}));

import {
  updateTicketAssignee,
} from "../../../src/backend/src/modules/tickets/ticket-assignment.service.js";
import {
  confirmTicketAction,
  transitionTicket,
  updateResolutionNote,
} from "../../../src/backend/src/modules/tickets/ticket-lifecycle.service.js";

const ticketId = "64a1b2c3d4e5f67890123456";
const departmentId = "64b1b2c3d4e5f67890123456";
const staffId = "64c1b2c3d4e5f67890123456";
const reference = `TKT-${ticketId.toUpperCase()}`;

function query(result: unknown) {
  const chain = {
    exec: vi.fn().mockResolvedValue(result),
    populate: vi.fn(),
    select: vi.fn(),
  };
  chain.populate.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  return chain;
}

function responseDocument(status: string) {
  return {
    toObject: () => ({
      _id: new Types.ObjectId(ticketId),
      title: "Login issue",
      description: "Cannot sign in",
      departmentId: {
        _id: new Types.ObjectId(departmentId),
        name: "IT",
      },
      priority: "High",
      status,
      assigneeId: {
        _id: new Types.ObjectId(staffId),
        displayName: "Alex",
        role: "support",
        active: true,
      },
      resolutionNote: status === "Resolved" ? "Fixed" : null,
      createdAt: new Date("2026-11-06T00:00:00.000Z"),
      updatedAt: new Date("2026-11-06T00:00:00.000Z"),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ticket assignment and lifecycle services", () => {
  it("reports missing or terminal tickets and missing staff during assignment", async () => {
    models.tickets.findById.mockReturnValue(query(null));
    await expect(updateTicketAssignee(reference, staffId)).rejects.toMatchObject({
      statusCode: 404,
    });

    models.tickets.findById.mockReturnValue(query({ status: "Resolved" }));
    await expect(updateTicketAssignee(reference, null)).rejects.toMatchObject({
      statusCode: 409,
    });

    models.tickets.findById.mockReturnValue(query({ status: "Open" }));
    models.staff.findById.mockReturnValue(query(null));
    await expect(updateTicketAssignee(reference, staffId)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("assigns an eligible colleague and reports a stale assignment write", async () => {
    models.tickets.findById.mockReturnValue(query({ status: "Open" }));
    models.staff.findById.mockReturnValue(
      query({ active: true, role: "operations" }),
    );
    models.tickets.findOneAndUpdate.mockReturnValue(
      query(responseDocument("Open")),
    );

    await updateTicketAssignee(reference, staffId);

    expect(models.tickets.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: new Types.ObjectId(ticketId), status: "Open" },
      { $set: { assigneeId: new Types.ObjectId(staffId) } },
      { returnDocument: "after", runValidators: true },
    );

    models.tickets.findOneAndUpdate.mockReturnValue(query(null));
    await expect(updateTicketAssignee(reference, staffId)).rejects.toMatchObject({
      statusCode: 409,
    });

    models.tickets.findOneAndUpdate.mockReturnValue(
      query(responseDocument("Open")),
    );
    await updateTicketAssignee(reference, null);
    expect(models.tickets.findOneAndUpdate).toHaveBeenLastCalledWith(
      { _id: new Types.ObjectId(ticketId), status: "Open" },
      { $set: { assigneeId: null } },
      { returnDocument: "after", runValidators: true },
    );
  });

  it("conditionally starts work only with an active eligible assignee", async () => {
    models.tickets.findById.mockReturnValue(
      query({
        status: "Open",
        assigneeId: new Types.ObjectId(staffId),
      }),
    );
    models.staff.findById.mockReturnValue(
      query({ active: true, role: "support" }),
    );
    models.tickets.findOneAndUpdate.mockReturnValue(
      query(responseDocument("In Progress")),
    );

    await transitionTicket(reference, { action: "start" });

    expect(models.tickets.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: new Types.ObjectId(ticketId),
        status: "Open",
        assigneeId: new Types.ObjectId(staffId),
      },
      { $set: { status: "In Progress", assigneeId: new Types.ObjectId(staffId) } },
      { returnDocument: "after", runValidators: true },
    );
  });

  it("rejects starting without an eligible assignee and never writes", async () => {
    models.tickets.findById.mockReturnValue(
      query({ status: "Open", assigneeId: null }),
    );

    await expect(
      transitionTicket(reference, { action: "start" }),
    ).rejects.toMatchObject({ statusCode: 409, code: "CONFLICT" });
    expect(models.tickets.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects missing, inactive, or ineligible assignees before starting", async () => {
    models.tickets.findById.mockReturnValue(
      query({ status: "Open", assigneeId: new Types.ObjectId(staffId) }),
    );
    models.staff.findById.mockReturnValue(query(null));
    await expect(
      transitionTicket(reference, { action: "start" }),
    ).rejects.toMatchObject({ statusCode: 409 });

    models.staff.findById.mockReturnValue(
      query({ active: false, role: "support" }),
    );
    await expect(
      transitionTicket(reference, { action: "start" }),
    ).rejects.toMatchObject({ statusCode: 409 });

    models.staff.findById.mockReturnValue(
      query({ active: true, role: "other" }),
    );
    await expect(
      transitionTicket(reference, { action: "start" }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("rejects transitions for missing tickets and invalid source states", async () => {
    models.tickets.findById.mockReturnValue(query(null));
    await expect(
      transitionTicket(reference, { action: "returnToOpen" }),
    ).rejects.toMatchObject({ statusCode: 404 });

    models.tickets.findById.mockReturnValue(
      query({ status: "Closed", assigneeId: null }),
    );
    await expect(
      transitionTicket(reference, { action: "returnToOpen" }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("resolves an in-progress ticket with the supplied note", async () => {
    models.tickets.findById.mockReturnValue(
      query({ status: "In Progress", assigneeId: new Types.ObjectId(staffId) }),
    );
    models.tickets.findOneAndUpdate.mockReturnValue(
      query(responseDocument("Resolved")),
    );

    await transitionTicket(reference, {
      action: "resolve",
      resolutionNote: "Fixed",
    });

    expect(models.tickets.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: new Types.ObjectId(ticketId), status: "In Progress" },
      { $set: { status: "Resolved", resolutionNote: "Fixed" } },
      { returnDocument: "after", runValidators: true },
    );
  });

  it("rejects stale transitions after the conditional update loses a race", async () => {
    models.tickets.findById.mockReturnValue(
      query({ status: "In Progress", assigneeId: new Types.ObjectId(staffId) }),
    );
    models.tickets.findOneAndUpdate.mockReturnValue(query(null));

    await expect(
      transitionTicket(reference, { action: "returnToOpen" }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(models.tickets.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: new Types.ObjectId(ticketId), status: "In Progress" },
      { $set: { status: "Open" } },
      { returnDocument: "after", runValidators: true },
    );
  });

  it("reopens Resolved tickets to Open without clearing assignment or note", async () => {
    models.tickets.findById.mockReturnValue(
      query({ status: "Resolved", assigneeId: new Types.ObjectId(staffId) }),
    );
    models.tickets.findOneAndUpdate.mockReturnValue(
      query(responseDocument("Open")),
    );

    await transitionTicket(reference, { action: "reopen" });

    expect(models.tickets.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: new Types.ObjectId(ticketId), status: "Resolved" },
      { $set: { status: "Open" } },
      { returnDocument: "after", runValidators: true },
    );
  });

  it("writes resolution notes only while Resolved", async () => {
    models.tickets.findOneAndUpdate.mockReturnValue(
      query(responseDocument("Resolved")),
    );

    await updateResolutionNote(reference, "Updated resolution");

    expect(models.tickets.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: new Types.ObjectId(ticketId), status: "Resolved" },
      { $set: { resolutionNote: "Updated resolution" } },
      { returnDocument: "after", runValidators: true },
    );
  });

  it("distinguishes missing tickets from tickets that are no longer Resolved", async () => {
    models.tickets.findOneAndUpdate.mockReturnValue(query(null));
    models.tickets.findById.mockReturnValue(query(null));
    await expect(
      updateResolutionNote(reference, "Updated resolution"),
    ).rejects.toMatchObject({ statusCode: 404 });

    models.tickets.findById.mockReturnValue(query({ _id: ticketId }));
    await expect(
      updateResolutionNote(reference, "Updated resolution"),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("uses separate status-conditional close and archive writes", async () => {
    models.tickets.findOneAndUpdate
      .mockReturnValueOnce(query(responseDocument("Closed")))
      .mockReturnValueOnce(query(responseDocument("Archived")));

    await confirmTicketAction(reference, "close");
    await confirmTicketAction(reference, "archive");

    expect(models.tickets.findOneAndUpdate).toHaveBeenNthCalledWith(
      1,
      { _id: new Types.ObjectId(ticketId), status: "Resolved" },
      { $set: { status: "Closed" } },
      { returnDocument: "after", runValidators: true },
    );
    expect(models.tickets.findOneAndUpdate).toHaveBeenNthCalledWith(
      2,
      { _id: new Types.ObjectId(ticketId), status: "Closed" },
      { $set: { status: "Archived" } },
      { returnDocument: "after", runValidators: true },
    );
  });

  it("reports missing and invalid-state close/archive requests", async () => {
    models.tickets.findOneAndUpdate.mockReturnValue(query(null));
    models.tickets.findById.mockReturnValueOnce(query(null));
    await expect(confirmTicketAction(reference, "close")).rejects.toMatchObject({
      statusCode: 404,
    });

    models.tickets.findById.mockReturnValue(query({ _id: ticketId }));
    await expect(
      confirmTicketAction(reference, "archive"),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("rejects unassignment from In Progress and ineligible replacements", async () => {
    models.tickets.findById.mockReturnValue(query({ status: "In Progress" }));
    await expect(updateTicketAssignee(reference, null)).rejects.toMatchObject({
      statusCode: 409,
    });

    models.tickets.findById.mockReturnValue(query({ status: "Open" }));
    models.staff.findById.mockReturnValue(
      query({ active: false, role: "support" }),
    );
    await expect(
      updateTicketAssignee(reference, staffId),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(models.tickets.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
