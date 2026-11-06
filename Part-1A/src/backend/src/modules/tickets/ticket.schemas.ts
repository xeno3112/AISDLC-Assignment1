import { z } from "zod";
import { ticketPriorities, ticketStatuses } from "../../models/ticket.model.js";

const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, {
  message: "Must be a valid 24-character object ID.",
});

export const ticketReferenceSchema = z
  .string()
  .regex(/^TKT-[A-F0-9]{24}$/, {
    message: "Must be a valid ticket reference.",
  });

export const createTicketSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(5000),
    departmentId: objectIdSchema,
    priority: z.enum(ticketPriorities),
  })
  .strict();

export const ticketListQuerySchema = z
  .object({
    view: z.enum(["open", "assigned", "archived", "all"]).default("open"),
    status: z.enum(ticketStatuses).optional(),
    priority: z.enum(ticketPriorities).optional(),
    assigneeId: objectIdSchema.optional(),
    page: z.preprocess(
      parsePositiveInteger,
      z.number().int().min(1).default(1),
    ),
    pageSize: z.preprocess(
      parsePositiveInteger,
      z.number().int().min(1).max(100).default(50),
    ),
  })
  .strict();

export const staffListQuerySchema = z
  .object({
    eligibility: z.enum(["assignable", "all"]).default("assignable"),
  })
  .strict();

export const updateAssigneeSchema = z
  .object({
    assigneeId: objectIdSchema.nullable(),
  })
  .strict();

export const transitionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }).strict(),
  z.object({ action: z.literal("returnToOpen") }).strict(),
  z
    .object({
      action: z.literal("resolve"),
      resolutionNote: z.string().trim().min(1),
    })
    .strict(),
  z.object({ action: z.literal("reopen") }).strict(),
]);

export const resolutionNoteSchema = z
  .object({
    resolutionNote: z.string().trim().min(1),
  })
  .strict();

export const confirmationSchema = z
  .object({
    confirmed: z.literal(true),
  })
  .strict();

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;
export type StaffListQuery = z.infer<typeof staffListQuerySchema>;
export type TransitionInput = z.infer<typeof transitionSchema>;

function parsePositiveInteger(value: unknown): unknown {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return value;
  }
  return Number(value);
}
