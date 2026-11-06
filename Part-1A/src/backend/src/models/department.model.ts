import { model, Schema, type InferSchemaType } from "mongoose";

export const departmentSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
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

departmentSchema.index(
  { name: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 },
  },
);

export type Department = InferSchemaType<typeof departmentSchema>;

export const DepartmentModel = model("Department", departmentSchema);
