import { performance } from "node:perf_hooks";
import mongoose, { Types } from "mongoose";
import request from "supertest";
import { createApp } from "../../src/backend/src/app.js";
import {
  connectDatabase,
  disconnectDatabase,
} from "../../src/backend/src/config/database.js";
import { loadConfig } from "../../src/backend/src/config/env.js";
import { DepartmentModel } from "../../src/backend/src/models/department.model.js";
import { StaffMemberModel } from "../../src/backend/src/models/staff-member.model.js";
import { TicketModel } from "../../src/backend/src/models/ticket.model.js";

const ticketCount = 2_000;
const actionsPerScenario = 25;
const targetMs = 2_000;
type TicketStatus =
  | "Open"
  | "In Progress"
  | "Resolved"
  | "Closed"
  | "Archived";
type TicketPriority = "Low" | "Normal" | "High" | "Urgent";
const app = createApp();
const mongoUri = process.env.MONGODB_TEST_URI;

if (!mongoUri) {
  throw new Error(
    "MONGODB_TEST_URI is required to run the ticket-list performance check.",
  );
}

const config = loadConfig({
  NODE_ENV: "test",
  MONGODB_TEST_URI: mongoUri,
});

try {
  await connectDatabase(config);
  const seeded = await seedTickets();
  const scenarios = [
    { name: "open", query: "view=open" },
    { name: "assigned", query: "view=assigned" },
    { name: "archived", query: "view=archived" },
    {
      name: "combined-filters",
      query: new URLSearchParams({
        view: "all",
        status: "In Progress",
        priority: "High",
        assigneeId: seeded.assigneeIds[2]!,
      }).toString(),
    },
  ];
  const samples: number[] = [];

  for (const scenario of scenarios) {
    const expectedTotal = seeded.tickets.filter((ticket) =>
      matchesScenario(ticket, scenario.name, seeded.assigneeIds[2]!),
    ).length;
    if (scenario.name === "combined-filters" && expectedTotal === 0) {
      throw new Error("The combined-filter benchmark must match test records.");
    }

    for (let action = 0; action < actionsPerScenario; action += 1) {
      const started = performance.now();
      const response = await request(app).get(
        `/api/v1/tickets?${scenario.query}`,
      );
      const elapsedMs = performance.now() - started;

      if (response.status !== 200) {
        throw new Error(
          `${scenario.name} returned HTTP ${response.status}: ${JSON.stringify(response.body)}`,
        );
      }
      if (response.body.total !== expectedTotal) {
        throw new Error(
          `${scenario.name} returned ${response.body.total} tickets; expected ${expectedTotal}.`,
        );
      }
      if (response.body.items.length !== Math.min(expectedTotal, 50)) {
        throw new Error(`${scenario.name} returned an unexpected page size.`);
      }

      samples.push(elapsedMs);
    }
  }

  const withinTarget = samples.filter((duration) => duration < targetMs).length;
  const passRate = (withinTarget / samples.length) * 100;
  const sortedSamples = [...samples].sort((left, right) => left - right);
  const p95Ms = sortedSamples[Math.ceil(sortedSamples.length * 0.95) - 1]!;
  const maxMs = sortedSamples.at(-1)!;

  if (passRate < 95) {
    throw new Error(
      `Only ${passRate.toFixed(1)}% of list/filter actions completed under ${targetMs}ms.`,
    );
  }

  console.log(
    JSON.stringify(
      {
        benchmark: "MongoDB-backed ticket list/filter API",
        datasetTickets: ticketCount,
        actions: samples.length,
        actionsUnderTarget: withinTarget,
        targetMs,
        passRatePercent: Number(passRate.toFixed(1)),
        p95Ms: Number(p95Ms.toFixed(2)),
        maxMs: Number(maxMs.toFixed(2)),
        scenarios: scenarios.map(({ name }) => name),
        environment: "local disposable MongoDB test database",
      },
      null,
      2,
    ),
  );
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
  }
  await disconnectDatabase();
}

async function seedTickets() {
  const department = await DepartmentModel.create({
    name: "Performance Test Department",
    active: true,
  });
  const staff = await StaffMemberModel.insertMany(
    Array.from({ length: 4 }, (_, index) => ({
      displayName: `Performance Staff ${index + 1}`,
      role: index % 2 === 0 ? "support" : "operations",
      active: true,
    })),
  );
  const assigneeIds = staff.map((member) => member._id.toString());
  const statuses = [
    "Open",
    "In Progress",
    "Resolved",
    "Closed",
    "Archived",
  ] as const satisfies readonly TicketStatus[];
  const priorities = [
    "Low",
    "Normal",
    "High",
    "Urgent",
  ] as const satisfies readonly TicketPriority[];

  const tickets = Array.from({ length: ticketCount }, (_, index) => {
    const status = statuses[index % statuses.length]!;
    const assigneeId =
      status === "In Progress" || index % 4 !== 0
        ? new Types.ObjectId(assigneeIds[index % assigneeIds.length]!)
        : null;
    return {
      title: `Performance ticket ${index + 1}`,
      description: `Deterministic benchmark record ${index + 1}.`,
      departmentId: department._id,
      priority: priorities[index % priorities.length]!,
      status,
      assigneeId,
      resolutionNote:
        status === "Resolved" || status === "Closed" || status === "Archived"
          ? "Benchmark resolution."
          : null,
      createdAt: new Date(Date.UTC(2026, 0, 1) + index * 1_000),
      updatedAt: new Date(Date.UTC(2026, 0, 1) + index * 1_000),
    };
  });
  await TicketModel.insertMany(tickets);

  return { tickets, assigneeIds };
}

function matchesScenario(
  ticket: {
    status: TicketStatus;
    priority: TicketPriority;
    assigneeId: Types.ObjectId | null;
  },
  scenario: string,
  assigneeId: string,
) {
  if (scenario === "open") return ticket.status === "Open";
  if (scenario === "assigned") {
    return ticket.status !== "Archived" && ticket.assigneeId !== null;
  }
  if (scenario === "archived") return ticket.status === "Archived";
  return (
    ticket.status === "In Progress" &&
    ticket.priority === "High" &&
    ticket.assigneeId?.toString() === assigneeId
  );
}
