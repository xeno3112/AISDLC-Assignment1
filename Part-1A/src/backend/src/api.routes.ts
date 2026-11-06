import { Router } from "express";
import { departmentRoutes } from "./modules/departments/department.routes.js";
import { staffRoutes } from "./modules/staff/staff.routes.js";
import { ticketRoutes } from "./modules/tickets/ticket.routes.js";

export function createApiRouter(): Router {
  const router = Router();
  router.use(departmentRoutes);
  router.use(staffRoutes);
  router.use(ticketRoutes);
  return router;
}
