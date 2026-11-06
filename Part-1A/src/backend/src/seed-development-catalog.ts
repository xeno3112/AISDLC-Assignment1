import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { loadConfig } from "./config/env.js";
import { DepartmentModel } from "./models/department.model.js";
import { StaffMemberModel } from "./models/staff-member.model.js";
import { TicketModel } from "./models/ticket.model.js";

const departments = ["Customer Care", "IT", "Facilities"];
const staff = [
  { displayName: "Alex Morgan", role: "support", active: true },
  { displayName: "Sam Lee", role: "operations", active: true },
  { displayName: "Pat Other", role: "other", active: true },
  { displayName: "Inactive Support", role: "support", active: false },
] as const;
const sampleTickets = [
  {
    title: "[Demo] Cannot access the billing portal",
    description:
      "The billing portal shows an error after sign-in. This blocks the monthly invoice review.",
    department: "Customer Care",
    priority: "High",
    status: "Open",
    assignee: null,
    resolutionNote: null,
  },
  {
    title: "[Demo] New employee laptop setup",
    description:
      "Prepare a laptop and standard development tools for a new starter joining Monday.",
    department: "IT",
    priority: "Normal",
    status: "Open",
    assignee: "Alex Morgan",
    resolutionNote: null,
  },
  {
    title: "[Demo] Meeting room display is offline",
    description:
      "The display in meeting room 2B is not detected by either HDMI input.",
    department: "Facilities",
    priority: "Urgent",
    status: "In Progress",
    assignee: "Sam Lee",
    resolutionNote: null,
  },
  {
    title: "[Demo] Shared drive access request",
    description:
      "A team member needs access to the quarterly planning folder.",
    department: "IT",
    priority: "Low",
    status: "Resolved",
    assignee: "Alex Morgan",
    resolutionNote: "Access was granted and verified with the requester.",
  },
  {
    title: "[Demo] Printer supplies replenished",
    description:
      "The second-floor printer was low on paper and toner.",
    department: "Facilities",
    priority: "Normal",
    status: "Closed",
    assignee: "Sam Lee",
    resolutionNote: "Paper and toner were replenished; a test page printed successfully.",
  },
  {
    title: "[Demo] Archived VPN connection issue",
    description:
      "A previous VPN connectivity incident is retained here as an archive example.",
    department: "IT",
    priority: "High",
    status: "Archived",
    assignee: "Alex Morgan",
    resolutionNote: "The VPN profile was updated and the connection restored.",
  },
] as const;
const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

async function seedDevelopmentCatalog(): Promise<void> {
  const config = loadConfig();
  const host = new URL(config.mongoUri).hostname;
  if (config.environment !== "development" || !localHosts.has(host)) {
    throw new Error(
      "The development catalog can only be seeded into a local MongoDB database in development mode.",
    );
  }

  await connectDatabase(config);
  try {
    await Promise.all([
      ...departments.map((name) =>
        DepartmentModel.updateOne(
          { name },
          { $set: { name, active: true } },
          { upsert: true },
        ).exec(),
      ),
      ...staff.map(({ displayName, role, active }) =>
        StaffMemberModel.updateOne(
          { displayName },
          { $set: { displayName, role, active } },
          { upsert: true },
        ).exec(),
      ),
    ]);

    const [departmentRecords, staffRecords] = await Promise.all([
      DepartmentModel.find({ name: { $in: departments } }).exec(),
      StaffMemberModel.find({
        displayName: { $in: staff.map((member) => member.displayName) },
      }).exec(),
    ]);
    const departmentIds = new Map(
      departmentRecords.map((department) => [
        department.name,
        department._id,
      ]),
    );
    const staffIds = new Map(
      staffRecords.map((member) => [member.displayName, member._id]),
    );

    await Promise.all(
      sampleTickets.map((ticket) => {
        const departmentId = departmentIds.get(ticket.department);
        const assigneeId = ticket.assignee
          ? staffIds.get(ticket.assignee)
          : null;
        if (!departmentId || (ticket.assignee && !assigneeId)) {
          throw new Error(`Missing development lookup for "${ticket.title}".`);
        }

        return TicketModel.updateOne(
          { title: ticket.title },
          {
            $set: {
              title: ticket.title,
              description: ticket.description,
              departmentId,
              priority: ticket.priority,
              status: ticket.status,
              assigneeId,
              resolutionNote: ticket.resolutionNote,
            },
          },
          { upsert: true, runValidators: true },
        ).exec();
      }),
    );
    console.info(
      `Development catalog and ${sampleTickets.length} sample tickets are ready.`,
    );
  } finally {
    await disconnectDatabase();
  }
}

void seedDevelopmentCatalog().catch((error: unknown) => {
  console.error("Development catalog seeding failed.", error);
  process.exitCode = 1;
});
