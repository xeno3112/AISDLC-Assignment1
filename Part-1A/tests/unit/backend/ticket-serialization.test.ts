import { describe, expect, it } from "vitest";
import {
  serializeTicket,
  toRecord,
} from "../../../src/backend/src/modules/tickets/ticket.service.js";

const ticketId = "64a1b2c3d4e5f67890123456";
const departmentId = "64b1b2c3d4e5f67890123456";
const staffId = "64c1b2c3d4e5f67890123456";

function plainTicket(overrides: Record<string, unknown> = {}) {
  return {
    _id: ticketId,
    title: "Login issue",
    description: "Cannot sign in",
    departmentId: { _id: departmentId, name: "IT" },
    priority: "High",
    status: "Open",
    assigneeId: null,
    resolutionNote: null,
    createdAt: new Date("2026-11-06T00:00:00.000Z"),
    updatedAt: new Date("2026-11-06T00:00:00.000Z"),
    ...overrides,
  };
}

describe("ticket response serialization", () => {
  it("serializes plain records with string identifiers and nullable fields", () => {
    expect(serializeTicket(plainTicket())).toMatchObject({
      id: ticketId,
      reference: `TKT-${ticketId.toUpperCase()}`,
      department: { id: departmentId, name: "IT" },
      assignee: null,
      resolutionNote: null,
    });
  });

  it("serializes assigned staff and a saved resolution note", () => {
    expect(
      serializeTicket(
        plainTicket({
          status: "Resolved",
          assigneeId: {
            _id: staffId,
            displayName: "Alex Support",
            role: "support",
            active: true,
          },
          resolutionNote: "Access restored",
        }),
      ),
    ).toMatchObject({
      assignee: {
        id: staffId,
        displayName: "Alex Support",
        role: "support",
        active: true,
      },
      resolutionNote: "Access restored",
    });
  });

  it("accepts document-like records and rejects non-record values", () => {
    expect(toRecord({ toObject: () => ({ status: "Open" }) })).toEqual({
      status: "Open",
    });
    expect(() => toRecord(null)).toThrow(
      "A persisted ticket reference is missing.",
    );
  });

  it.each([
    ["identifier", { _id: "invalid" }],
    ["title", { title: undefined }],
    ["department", { departmentId: null }],
    ["assignee active flag", {
      assigneeId: {
        _id: staffId,
        displayName: "Alex",
        role: "support",
        active: "yes",
      },
    }],
    ["timestamp", { createdAt: "not-a-date" }],
  ])("rejects an invalid persisted %s", (_field, override) => {
    expect(() => serializeTicket(plainTicket(override))).toThrow();
  });
});
