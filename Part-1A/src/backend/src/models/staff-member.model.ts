import { model, Schema, type InferSchemaType } from "mongoose";

export const staffRoles = ["support", "operations", "other"] as const;

export const staffMemberSchema = new Schema(
  {
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },
    role: {
      type: String,
      enum: staffRoles,
      required: true,
    },
    active: {
      type: Boolean,
      required: true,
    },
  },
  {
    strict: "throw",
  },
);

export type StaffMember = InferSchemaType<typeof staffMemberSchema>;

export const StaffMemberModel = model("StaffMember", staffMemberSchema);
