import { describe, expect, it } from "vitest";
import {
  confirmationSchema,
  createTicketSchema,
  staffListQuerySchema,
  ticketListQuerySchema,
  ticketReferenceSchema,
  transitionSchema,
  updateAssigneeSchema,
} from "../../../src/backend/src/modules/tickets/ticket.schemas.js";

const objectId = "64a1b2c3d4e5f67890123456";

describe("ticket API request schemas", () => {
  it("trims intake text and rejects missing, bounded, or unknown fields", () => {
    expect(
      createTicketSchema.parse({
        title: "  Login issue  ",
        description: "  Cannot sign in  ",
        departmentId: objectId,
        priority: "High",
      }),
    ).toEqual({
      title: "Login issue",
      description: "Cannot sign in",
      departmentId: objectId,
      priority: "High",
    });

    expect(
      createTicketSchema.safeParse({
        title: "   ",
        description: "Valid description",
        departmentId: objectId,
        priority: "Normal",
      }).success,
    ).toBe(false);
    expect(
      createTicketSchema.safeParse({
        title: "x".repeat(121),
        description: "Valid description",
        departmentId: objectId,
        priority: "Normal",
      }).success,
    ).toBe(false);
    expect(
      createTicketSchema.safeParse({
        title: "Title",
        description: "Description",
        departmentId: objectId,
        priority: "Normal",
        status: "Resolved",
      }).success,
    ).toBe(false);
  });

  it("applies list defaults and validates combined filter parameters", () => {
    expect(ticketListQuerySchema.parse({})).toEqual({
      view: "open",
      page: 1,
      pageSize: 50,
    });
    expect(
      ticketListQuerySchema.parse({
        view: "assigned",
        status: "In Progress",
        priority: "Urgent",
        assigneeId: objectId,
        page: "2",
        pageSize: "25",
      }),
    ).toEqual({
      view: "assigned",
      status: "In Progress",
      priority: "Urgent",
      assigneeId: objectId,
      page: 2,
      pageSize: 25,
    });
    expect(ticketListQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(ticketListQuerySchema.safeParse({ pageSize: "101" }).success).toBe(
      false,
    );
    expect(ticketListQuerySchema.safeParse({ unknown: "x" }).success).toBe(
      false,
    );
  });

  it("limits assignable lookup, assignment, and transition request shapes", () => {
    expect(staffListQuerySchema.parse({}).eligibility).toBe("assignable");
    expect(staffListQuerySchema.safeParse({ eligibility: "inactive" }).success)
      .toBe(false);
    expect(updateAssigneeSchema.safeParse({ assigneeId: null }).success).toBe(
      true,
    );
    expect(
      updateAssigneeSchema.safeParse({
        assigneeId: objectId,
        status: "In Progress",
      }).success,
    ).toBe(false);
    expect(
      transitionSchema.safeParse({
        action: "resolve",
        resolutionNote: "  Fixed  ",
      }).data,
    ).toEqual({ action: "resolve", resolutionNote: "Fixed" });
    expect(
      transitionSchema.safeParse({
        action: "resolve",
        resolutionNote: "   ",
      }).success,
    ).toBe(false);
    expect(confirmationSchema.safeParse({ confirmed: false }).success).toBe(
      false,
    );
  });

  it("accepts only canonical public ticket references", () => {
    expect(ticketReferenceSchema.safeParse(`TKT-${objectId.toUpperCase()}`).success)
      .toBe(true);
    expect(ticketReferenceSchema.safeParse(`TKT-${objectId}`).success).toBe(
      false,
    );
    expect(ticketReferenceSchema.safeParse("64a1b2c3d4e5f67890123456").success)
      .toBe(false);
  });
});
