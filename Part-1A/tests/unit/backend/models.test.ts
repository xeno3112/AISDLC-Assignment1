import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import { DepartmentModel } from "../../../src/backend/src/models/department.model.js";
import { StaffMemberModel } from "../../../src/backend/src/models/staff-member.model.js";
import { TicketModel } from "../../../src/backend/src/models/ticket.model.js";

describe("ticket model", () => {
  const validTicket = () => ({
    title: "  Printer unavailable  ",
    description: "  The second-floor printer is offline.  ",
    departmentId: new Types.ObjectId(),
    priority: "High",
  });

  it("trims text and defaults new tickets to Open and unassigned", () => {
    const ticket = new TicketModel(validTicket());

    expect(ticket.title).toBe("Printer unavailable");
    expect(ticket.description).toBe("The second-floor printer is offline.");
    expect(ticket.status).toBe("Open");
    expect(ticket.assigneeId).toBeNull();
    expect(ticket._id).toBeInstanceOf(Types.ObjectId);
    expect(ticket.reference).toMatch(/^TKT-[A-F0-9]{24}$/);
  });

  it("rejects blank and over-limit text and invalid enums", async () => {
    const ticket = new TicketModel({
      ...validTicket(),
      title: "  ",
      description: "x".repeat(5001),
      priority: "Immediate",
      status: "Pending",
    });
    await expect(ticket.validate()).rejects.toMatchObject({
      errors: {
        title: expect.anything(),
        description: expect.anything(),
        priority: expect.anything(),
        status: expect.anything(),
      },
    });
  });

  it("rejects missing required fields and unmodeled update fields", async () => {
    await expect(new TicketModel().validate()).rejects.toMatchObject({
      errors: {
        title: expect.anything(),
        departmentId: expect.anything(),
      },
    });
    expect(
      () => new TicketModel({ ...validTicket(), arbitraryUpdate: true }),
    ).toThrow();
  });

  it("requires an assignee in progress and a resolution note after resolution", async () => {
    const activeWithoutAssignee = new TicketModel({
      ...validTicket(),
      status: "In Progress",
    });
    await expect(activeWithoutAssignee.validate()).rejects.toMatchObject({
      errors: { assigneeId: expect.anything() },
    });

    const resolvedWithoutNote = new TicketModel({
      ...validTicket(),
      status: "Resolved",
    });
    await expect(resolvedWithoutNote.validate()).rejects.toMatchObject({
      errors: { resolutionNote: expect.anything() },
    });
  });
});

describe("department model", () => {
  it("requires a non-blank name and active flag and trims the display name", async () => {
    const department = new DepartmentModel({ name: "  Facilities ", active: true });
    expect(department.name).toBe("Facilities");
    await expect(department.validate()).resolves.toBeUndefined();

    const invalidDepartment = new DepartmentModel({ name: "  " });
    await expect(invalidDepartment.validate()).rejects.toMatchObject({
      errors: {
        name: expect.anything(),
        active: expect.anything(),
      },
    });
    expect(department.schema.indexes()[0]?.[1]).toMatchObject({ unique: true });
  });
});

describe("staff member model", () => {
  it("trims display names and accepts only known staff roles", async () => {
    const staffMember = new StaffMemberModel({
      displayName: "  Alex Support ",
      role: "support",
      active: true,
    });
    expect(staffMember.displayName).toBe("Alex Support");
    await expect(staffMember.validate()).resolves.toBeUndefined();

    const invalidStaffMember = new StaffMemberModel({
      displayName: " ",
      role: "administrator",
      active: true,
    });
    await expect(invalidStaffMember.validate()).rejects.toMatchObject({
      errors: {
        displayName: expect.anything(),
        role: expect.anything(),
      },
    });
  });
});
