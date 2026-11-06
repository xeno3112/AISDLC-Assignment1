import { Types } from "mongoose";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const models = vi.hoisted(() => ({
  departments: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
  staff: {
    find: vi.fn(),
    findById: vi.fn(),
  },
  tickets: {
    countDocuments: vi.fn(),
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock("../../../src/backend/src/models/department.model.js", () => ({
  DepartmentModel: models.departments,
}));
vi.mock("../../../src/backend/src/models/staff-member.model.js", () => ({
  StaffMemberModel: models.staff,
}));
vi.mock("../../../src/backend/src/models/ticket.model.js", () => ({
  TicketModel: models.tickets,
  ticketPriorities: ["Low", "Normal", "High", "Urgent"],
  ticketStatuses: ["Open", "In Progress", "Resolved", "Closed", "Archived"],
}));

import { createApp } from "../../../src/backend/src/app.js";

const app = createApp();
const ticketId = "64a1b2c3d4e5f67890123456";
const departmentId = "64b1b2c3d4e5f67890123456";

function query(result: unknown) {
  const chain = {
    count: vi.fn(),
    exec: vi.fn().mockResolvedValue(result),
    limit: vi.fn(),
    populate: vi.fn(),
    select: vi.fn(),
    skip: vi.fn(),
    sort: vi.fn(),
  };
  chain.limit.mockReturnValue(chain);
  chain.populate.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.skip.mockReturnValue(chain);
  chain.sort.mockReturnValue(chain);
  return chain;
}

function ticketDocument(overrides: Record<string, unknown> = {}) {
  const raw = {
    _id: new Types.ObjectId(ticketId),
    title: "Login issue",
    description: "Cannot sign in",
    departmentId: {
      _id: new Types.ObjectId(departmentId),
      name: "IT",
    },
    priority: "High",
    status: "Open",
    assigneeId: null,
    resolutionNote: null,
    createdAt: new Date("2026-11-06T00:00:00.000Z"),
    updatedAt: new Date("2026-11-06T00:00:00.000Z"),
    ...overrides,
  };
  return {
    populate: vi.fn().mockResolvedValue(undefined),
    toObject: () => raw,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ticket API contract", () => {
  it("creates an Open ticket with the public reference and response shape", async () => {
    models.departments.findOne.mockReturnValue(query({ _id: departmentId }));
    models.tickets.create.mockResolvedValue(ticketDocument());

    const response = await request(app)
      .post("/api/v1/tickets")
      .send({
        title: "  Login issue ",
        description: " Cannot sign in ",
        departmentId,
        priority: "High",
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: ticketId,
      reference: `TKT-${ticketId.toUpperCase()}`,
      title: "Login issue",
      description: "Cannot sign in",
      department: { id: departmentId, name: "IT" },
      priority: "High",
      status: "Open",
      assignee: null,
      resolutionNote: null,
    });
    expect(response.body.createdAt).toBe("2026-11-06T00:00:00.000Z");
  });

  it("returns field-level 400 errors and does not persist invalid intake", async () => {
    const response = await request(app)
      .post("/api/v1/tickets")
      .send({
        title: " ",
        description: "Valid description",
        departmentId,
        priority: "Normal",
        status: "Resolved",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      requestId: response.headers["x-request-id"],
    });
    expect(response.body.error.fields).toHaveProperty("title");
    expect(response.body.error.fields).toHaveProperty("status");
    expect(models.tickets.create).not.toHaveBeenCalled();
  });

  it("returns 404 for an inactive or unknown department", async () => {
    models.departments.findOne.mockReturnValue(query(null));
    const response = await request(app)
      .post("/api/v1/tickets")
      .send({
        title: "Login issue",
        description: "Cannot sign in",
        departmentId,
        priority: "Normal",
      });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
    expect(models.tickets.create).not.toHaveBeenCalled();
  });

  it("validates queue query parameters and returns paginated results", async () => {
    const listQuery = query([]);
    models.tickets.find.mockReturnValue(listQuery);
    models.tickets.countDocuments.mockReturnValue(query(0));
    const invalid = await request(app).get("/api/v1/tickets?pageSize=101");
    expect(invalid.status).toBe(400);

    const response = await request(app).get(
      "/api/v1/tickets?view=open&page=2&pageSize=10",
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [],
      page: 2,
      pageSize: 10,
      total: 0,
      totalPages: 0,
    });
    expect(models.tickets.find).toHaveBeenLastCalledWith({
      $and: [{ status: "Open" }],
    });
    expect(listQuery.skip).toHaveBeenCalledWith(10);
    expect(listQuery.limit).toHaveBeenCalledWith(10);
  });

  it("validates references and returns 404 when a ticket is missing", async () => {
    const malformed = await request(app).get("/api/v1/tickets/not-a-ticket");
    expect(malformed.status).toBe(400);

    models.tickets.findById.mockReturnValue(query(ticketDocument()));
    const found = await request(app).get(
      `/api/v1/tickets/TKT-${ticketId.toUpperCase()}`,
    );
    expect(found.status).toBe(200);
    expect(found.body.reference).toBe(`TKT-${ticketId.toUpperCase()}`);

    models.tickets.findById.mockReturnValue(query(null));
    const missing = await request(app).get(
      `/api/v1/tickets/TKT-${ticketId.toUpperCase()}`,
    );
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");
  });

  it("updates a resolution note only with non-empty input", async () => {
    const invalid = await request(app)
      .patch(`/api/v1/tickets/TKT-${ticketId.toUpperCase()}/resolution`)
      .send({ resolutionNote: " " });
    expect(invalid.status).toBe(400);
    expect(models.tickets.findOneAndUpdate).not.toHaveBeenCalled();

    models.tickets.findOneAndUpdate.mockReturnValue(
      query(
        ticketDocument({
          status: "Resolved",
          resolutionNote: "Access restored",
        }),
      ),
    );
    const response = await request(app)
      .patch(`/api/v1/tickets/TKT-${ticketId.toUpperCase()}/resolution`)
      .send({ resolutionNote: " Access restored " });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "Resolved",
      resolutionNote: "Access restored",
    });
  });

  it("assigns an active eligible staff member and returns a conflict for unassignment in progress", async () => {
    models.tickets.findById.mockReturnValue(query({ status: "Open" }));
    models.staff.findById.mockReturnValue(
      query({ active: true, role: "operations" }),
    );
    models.tickets.findOneAndUpdate.mockReturnValue(
      query(
        ticketDocument({
          assigneeId: {
            _id: new Types.ObjectId(ticketId),
            displayName: "Alex",
            role: "operations",
            active: true,
          },
        }),
      ),
    );

    const assigned = await request(app)
      .patch(`/api/v1/tickets/TKT-${ticketId.toUpperCase()}/assignee`)
      .send({ assigneeId: ticketId });
    expect(assigned.status).toBe(200);
    expect(assigned.body.assignee).toMatchObject({
      id: ticketId,
      displayName: "Alex",
      role: "operations",
      active: true,
    });

    models.tickets.findById.mockReturnValue(query({ status: "In Progress" }));
    const unassigned = await request(app)
      .patch(`/api/v1/tickets/TKT-${ticketId.toUpperCase()}/assignee`)
      .send({ assigneeId: null });
    expect(unassigned.status).toBe(409);
    expect(models.tickets.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it("returns only active departments and eligible staff from catalog lookups", async () => {
    models.departments.find.mockReturnValue(
      query([{ _id: new Types.ObjectId(departmentId), name: "IT" }]),
    );
    models.staff.find.mockReturnValue(
      query([
        {
          _id: new Types.ObjectId(ticketId),
          displayName: "Alex",
          role: "support",
          active: true,
        },
      ]),
    );

    const departments = await request(app).get("/api/v1/departments");
    const staff = await request(app).get("/api/v1/staff");

    expect(departments.body.items).toEqual([{ id: departmentId, name: "IT" }]);
    expect(staff.body.items).toEqual([
      {
        id: ticketId,
        displayName: "Alex",
        role: "support",
        active: true,
      },
    ]);
    expect(models.staff.find).toHaveBeenCalledWith({
      active: true,
      role: { $in: ["support", "operations"] },
    });
  });

  it("rejects confirmation requests unless confirmed is true", async () => {
    const response = await request(app)
      .post(`/api/v1/tickets/TKT-${ticketId.toUpperCase()}/close`)
      .send({ confirmed: false });

    expect(response.status).toBe(400);
    expect(models.tickets.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("returns a sanitized persistence failure with the request ID", async () => {
    models.departments.findOne.mockReturnValue(query({ _id: departmentId }));
    models.tickets.create.mockRejectedValue(
      new Error("mongodb credentials must not be returned"),
    );
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await request(app)
        .post("/api/v1/tickets")
        .send({
          title: "Login issue",
          description: "Cannot sign in",
          departmentId,
          priority: "High",
        });

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe("INTERNAL_ERROR");
      expect(response.body.error.requestId).toBe(
        response.headers["x-request-id"],
      );
      expect(JSON.stringify(response.body)).not.toContain("credentials");
      expect(logError).toHaveBeenCalledWith(
        "Unhandled request error.",
        expect.objectContaining({ errorType: "Error" }),
      );
    } finally {
      logError.mockRestore();
    }
  });
});
