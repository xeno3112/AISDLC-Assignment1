import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../../src/backend/src/app.js";
import {
  connectDatabase,
  disconnectDatabase,
} from "../../../src/backend/src/config/database.js";
import { loadConfig } from "../../../src/backend/src/config/env.js";
import { DepartmentModel } from "../../../src/backend/src/models/department.model.js";
import { StaffMemberModel } from "../../../src/backend/src/models/staff-member.model.js";
import { TicketModel } from "../../../src/backend/src/models/ticket.model.js";

const mongoUri = process.env.MONGODB_TEST_URI;
if (!mongoUri) {
  throw new Error("MONGODB_TEST_URI is required to run API integration tests.");
}

const config = loadConfig({
  NODE_ENV: "test",
  MONGODB_TEST_URI: mongoUri,
});
const app = createApp();
let activeDepartmentId: string;
let inactiveDepartmentId: string;
let supportStaffId: string;
let operationsStaffId: string;
let inactiveStaffId: string;
let otherStaffId: string;

beforeAll(async () => {
  await connectDatabase(config);
});

beforeEach(async () => {
  await Promise.all([
    TicketModel.deleteMany({}),
    DepartmentModel.deleteMany({}),
    StaffMemberModel.deleteMany({}),
  ]);
  const [department, inactiveDepartment, supportStaff, operationsStaff] =
    await Promise.all([
      DepartmentModel.create({ name: "IT", active: true }),
      DepartmentModel.create({ name: "Facilities", active: false }),
      StaffMemberModel.create({
        displayName: "Alex Support",
        role: "support",
        active: true,
      }),
      StaffMemberModel.create({
        displayName: "Morgan Operations",
        role: "operations",
        active: true,
      }),
    ]);
  const inactiveStaff = await StaffMemberModel.create({
    displayName: "Inactive Support",
    role: "support",
    active: false,
  });
  const otherStaff = await StaffMemberModel.create({
    displayName: "Other Role",
    role: "other",
    active: true,
  });

  activeDepartmentId = department._id.toString();
  inactiveDepartmentId = inactiveDepartment._id.toString();
  supportStaffId = supportStaff._id.toString();
  operationsStaffId = operationsStaff._id.toString();
  inactiveStaffId = inactiveStaff._id.toString();
  otherStaffId = otherStaff._id.toString();
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
  }
  await disconnectDatabase();
});

describe("API persistence and lifecycle integration", () => {
  it("persists ticket intake and runs the complete supported lifecycle", async () => {
    const created = await request(app)
      .post("/api/v1/tickets")
      .send({
        title: "  Login issue ",
        description: " Cannot sign in ",
        departmentId: activeDepartmentId,
        priority: "High",
      });

    expect(created.status).toBe(201);
    const reference = created.body.reference as string;
    expect(reference).toMatch(/^TKT-[A-F0-9]{24}$/);
    expect(created.body).toMatchObject({
      title: "Login issue",
      description: "Cannot sign in",
      department: { id: activeDepartmentId, name: "IT" },
      priority: "High",
      status: "Open",
      assignee: null,
    });

    const reloaded = await request(app).get(`/api/v1/tickets/${reference}`);
    expect(reloaded.status).toBe(200);
    expect(reloaded.body.id).toBe(created.body.id);

    const noAssignee = await request(app)
      .post(`/api/v1/tickets/${reference}/transitions`)
      .send({ action: "start" });
    expect(noAssignee.status).toBe(409);

    const assigned = await request(app)
      .patch(`/api/v1/tickets/${reference}/assignee`)
      .send({ assigneeId: supportStaffId });
    expect(assigned.status).toBe(200);
    expect(assigned.body.assignee.id).toBe(supportStaffId);

    const started = await request(app)
      .post(`/api/v1/tickets/${reference}/transitions`)
      .send({ action: "start" });
    expect(started.status).toBe(200);
    expect(started.body.status).toBe("In Progress");

    const returnedToOpen = await request(app)
      .post(`/api/v1/tickets/${reference}/transitions`)
      .send({ action: "returnToOpen" });
    expect(returnedToOpen.status).toBe(200);
    expect(returnedToOpen.body.status).toBe("Open");
    const restartedAfterReturn = await request(app)
      .post(`/api/v1/tickets/${reference}/transitions`)
      .send({ action: "start" });
    expect(restartedAfterReturn.status).toBe(200);

    const unresolved = await request(app)
      .post(`/api/v1/tickets/${reference}/transitions`)
      .send({ action: "resolve", resolutionNote: " " });
    expect(unresolved.status).toBe(400);

    const resolved = await request(app)
      .post(`/api/v1/tickets/${reference}/transitions`)
      .send({ action: "resolve", resolutionNote: "  Access restored " });
    expect(resolved.status).toBe(200);
    expect(resolved.body).toMatchObject({
      status: "Resolved",
      resolutionNote: "Access restored",
    });

    const revised = await request(app)
      .patch(`/api/v1/tickets/${reference}/resolution`)
      .send({ resolutionNote: "Access restored and verified" });
    expect(revised.status).toBe(200);
    expect(revised.body.resolutionNote).toBe("Access restored and verified");

    const reopened = await request(app)
      .post(`/api/v1/tickets/${reference}/transitions`)
      .send({ action: "reopen" });
    expect(reopened.status).toBe(200);
    expect(reopened.body).toMatchObject({
      status: "Open",
      assignee: { id: supportStaffId },
    });

    const unassigned = await request(app)
      .patch(`/api/v1/tickets/${reference}/assignee`)
      .send({ assigneeId: null });
    expect(unassigned.status).toBe(200);
    const cannotStartUnassigned = await request(app)
      .post(`/api/v1/tickets/${reference}/transitions`)
      .send({ action: "start" });
    expect(cannotStartUnassigned.status).toBe(409);
    const reassigned = await request(app)
      .patch(`/api/v1/tickets/${reference}/assignee`)
      .send({ assigneeId: operationsStaffId });
    expect(reassigned.status).toBe(200);

    const restarted = await request(app)
      .post(`/api/v1/tickets/${reference}/transitions`)
      .send({ action: "start" });
    expect(restarted.status).toBe(200);
    const resolvedAgain = await request(app)
      .post(`/api/v1/tickets/${reference}/transitions`)
      .send({ action: "resolve", resolutionNote: "Verified" });
    expect(resolvedAgain.status).toBe(200);

    const closed = await request(app)
      .post(`/api/v1/tickets/${reference}/close`)
      .send({ confirmed: false });
    expect(closed.status).toBe(400);
    expect(
      (await request(app).get(`/api/v1/tickets/${reference}`)).body.status,
    ).toBe("Resolved");

    const confirmedClose = await request(app)
      .post(`/api/v1/tickets/${reference}/close`)
      .send({ confirmed: true });
    expect(confirmedClose.status).toBe(200);
    expect(confirmedClose.body.status).toBe("Closed");

    const cancelledArchive = await request(app)
      .post(`/api/v1/tickets/${reference}/archive`)
      .send({ confirmed: false });
    expect(cancelledArchive.status).toBe(400);
    expect(
      (await request(app).get(`/api/v1/tickets/${reference}`)).body.status,
    ).toBe("Closed");
    const archived = await request(app)
      .post(`/api/v1/tickets/${reference}/archive`)
      .send({ confirmed: true });
    expect(archived.status).toBe(200);
    expect(archived.body).toMatchObject({
      status: "Archived",
      resolutionNote: "Verified",
    });

    const readOnly = await request(app)
      .patch(`/api/v1/tickets/${reference}/resolution`)
      .send({ resolutionNote: "Not allowed" });
    expect(readOnly.status).toBe(409);
    const archivedView = await request(app).get(
      "/api/v1/tickets?view=archived",
    );
    expect(archivedView.body).toMatchObject({
      total: 1,
      items: [{ reference, status: "Archived", resolutionNote: "Verified" }],
    });
  });

  it("applies queue membership and filters together and excludes ineligible lookup results", async () => {
    const openHigh = await request(app)
      .post("/api/v1/tickets")
      .send({
        title: "High priority",
        description: "First ticket",
        departmentId: activeDepartmentId,
        priority: "High",
      });
    const openNormal = await request(app)
      .post("/api/v1/tickets")
      .send({
        title: "Normal priority",
        description: "Second ticket",
        departmentId: activeDepartmentId,
        priority: "Normal",
      });
    const firstReference = openHigh.body.reference as string;
    const secondReference = openNormal.body.reference as string;

    await request(app)
      .patch(`/api/v1/tickets/${firstReference}/assignee`)
      .send({ assigneeId: supportStaffId });
    await request(app)
      .patch(`/api/v1/tickets/${secondReference}/assignee`)
      .send({ assigneeId: operationsStaffId });

    const assigned = await request(app).get(
      `/api/v1/tickets?view=assigned&status=Open&priority=High&assigneeId=${supportStaffId}`,
    );
    expect(assigned.status).toBe(200);
    expect(assigned.body).toMatchObject({
      total: 1,
      items: [{ reference: firstReference, status: "Open", priority: "High" }],
    });

    const allNonArchived = await request(app).get(
      "/api/v1/tickets?view=all",
    );
    expect(allNonArchived.body.total).toBe(2);
    const conflicting = await request(app).get(
      "/api/v1/tickets?view=open&status=Archived",
    );
    expect(conflicting.body.total).toBe(0);

    const assignableStaff = await request(app).get("/api/v1/staff");
    expect(assignableStaff.body.items.map((member: { displayName: string }) => member.displayName))
      .toEqual(["Alex Support", "Morgan Operations"]);
    const completeStaff = await request(app).get(
      "/api/v1/staff?eligibility=all",
    );
    expect(completeStaff.body.items).toHaveLength(4);
    const departments = await request(app).get("/api/v1/departments");
    expect(departments.body.items).toEqual([
      { id: activeDepartmentId, name: "IT" },
    ]);

    const invalidReplacement = await request(app)
      .patch(`/api/v1/tickets/${firstReference}/assignee`)
      .send({ assigneeId: "64d1b2c3d4e5f67890123456" });
    expect(invalidReplacement.status).toBe(404);
    const inactiveReplacement = await request(app)
      .patch(`/api/v1/tickets/${firstReference}/assignee`)
      .send({ assigneeId: inactiveStaffId });
    expect(inactiveReplacement.status).toBe(409);
    const ineligibleReplacement = await request(app)
      .patch(`/api/v1/tickets/${firstReference}/assignee`)
      .send({ assigneeId: otherStaffId });
    expect(ineligibleReplacement.status).toBe(409);
    const missingActiveDepartment = await request(app)
      .post("/api/v1/tickets")
      .send({
        title: "Invalid department",
        description: "Must not persist",
        departmentId: "64e1b2c3d4e5f67890123456",
        priority: "Low",
      });
    expect(missingActiveDepartment.status).toBe(404);
    const inactiveDepartment = await request(app)
      .post("/api/v1/tickets")
      .send({
        title: "Inactive department",
        description: "Must not persist",
        departmentId: inactiveDepartmentId,
        priority: "Low",
      });
    expect(inactiveDepartment.status).toBe(404);
    expect(await TicketModel.countDocuments({ title: "Invalid department" }))
      .toBe(0);
    expect(await TicketModel.countDocuments({ title: "Inactive department" }))
      .toBe(0);
  });
});
