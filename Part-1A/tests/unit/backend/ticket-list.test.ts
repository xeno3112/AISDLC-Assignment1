import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import { buildTicketFilter } from "../../../src/backend/src/modules/tickets/ticket-list.service.js";
import { ticketListQuerySchema } from "../../../src/backend/src/modules/tickets/ticket.schemas.js";

const assigneeId = "64a1b2c3d4e5f67890123456";

describe("ticket list filter construction", () => {
  it.each([
    ["open", { status: "Open" }],
    ["archived", { status: "Archived" }],
    ["all", { status: { $ne: "Archived" } }],
  ] as const)("applies the %s queue predicate", (view, predicate) => {
    expect(buildTicketFilter(ticketListQuerySchema.parse({ view }))).toEqual({
      $and: [predicate],
    });
  });

  it("combines Assigned membership and optional filters with AND semantics", () => {
    const filter = buildTicketFilter(
      ticketListQuerySchema.parse({
        view: "assigned",
        status: "Resolved",
        priority: "High",
        assigneeId,
      }),
    );

    expect(filter.$and).toEqual([
      { status: { $ne: "Archived" } },
      { assigneeId: { $ne: null } },
      { status: "Resolved" },
      { priority: "High" },
      { assigneeId: new Types.ObjectId(assigneeId) },
    ]);
  });

  it("retains a conflicting status as an AND predicate so the result is empty", () => {
    expect(
      buildTicketFilter(
        ticketListQuerySchema.parse({ view: "open", status: "Archived" }),
      ).$and,
    ).toEqual([{ status: "Open" }, { status: "Archived" }]);
  });
});
