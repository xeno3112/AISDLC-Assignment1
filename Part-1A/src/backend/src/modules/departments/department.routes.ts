import { Router } from "express";
import { DepartmentModel } from "../../models/department.model.js";

export const departmentRoutes = Router();

departmentRoutes.get("/departments", async (_request, response) => {
  const departments = await DepartmentModel.find({ active: true })
    .select("_id name")
    .sort({ name: 1, _id: 1 })
    .exec();

  response.json({
    items: departments.map((department) => ({
      id: department._id.toString(),
      name: department.name,
    })),
  });
});
