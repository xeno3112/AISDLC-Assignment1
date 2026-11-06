import { model, Schema, type InferSchemaType } from "mongoose";

export const ticketPriorities = ["Low", "Normal", "High", "Urgent"] as const;
export const ticketStatuses = [
  "Open",
  "In Progress",
  "Resolved",
  "Closed",
  "Archived",
] as const;

export const ticketSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 5000,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    priority: {
      type: String,
      enum: ticketPriorities,
      required: true,
    },
    status: {
      type: String,
      enum: ticketStatuses,
      required: true,
      default: "Open",
    },
    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: "StaffMember",
      default: null,
    },
    resolutionNote: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    strict: "throw",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

ticketSchema.virtual("reference").get(function () {
  return `TKT-${this._id.toString().toUpperCase()}`;
});

ticketSchema.pre("validate", function () {
  if (this.status === "In Progress" && !this.assigneeId) {
    this.invalidate("assigneeId", "An In Progress ticket requires an assignee.");
  }

  if (
    ["Resolved", "Closed", "Archived"].includes(this.status) &&
    !this.resolutionNote?.trim()
  ) {
    this.invalidate(
      "resolutionNote",
      "A resolution note is required for completed tickets.",
    );
  }
});

export type Ticket = InferSchemaType<typeof ticketSchema>;

export const TicketModel = model("Ticket", ticketSchema);
