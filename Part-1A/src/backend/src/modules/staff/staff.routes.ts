import { Router } from "express";
import { StaffMemberModel } from "../../models/staff-member.model.js";
import { parseRequest } from "../request-validation.js";
import { staffListQuerySchema } from "../tickets/ticket.schemas.js";

export const staffRoutes = Router();

staffRoutes.get("/staff", async (request, response) => {
  const query = parseRequest(staffListQuerySchema, request.query);
  const staffQuery =
    query.eligibility === "assignable"
      ? StaffMemberModel.find({
          active: true,
          role: { $in: ["support", "operations"] },
        })
      : StaffMemberModel.find({});
  const staff = await staffQuery.sort({ displayName: 1, _id: 1 }).exec();

  response.json({
    items: staff.map((member) => ({
      id: member._id.toString(),
      displayName: member.displayName,
      role: member.role,
      active: member.active,
    })),
  });
});
