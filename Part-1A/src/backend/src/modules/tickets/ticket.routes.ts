import { Router } from "express";
import { parseRequest } from "../request-validation.js";
import {
  createTicketSchema,
  ticketListQuerySchema,
  ticketReferenceSchema,
  updateAssigneeSchema,
} from "./ticket.schemas.js";
import { updateTicketAssignee } from "./ticket-assignment.service.js";
import { listTickets } from "./ticket-list.service.js";
import { ticketLifecycleRoutes } from "./ticket-lifecycle.routes.js";
import { ticketResolutionRoutes } from "./ticket-resolution.routes.js";
import {
  createTicket,
  getTicketByReference,
} from "./ticket.service.js";

export const ticketRoutes = Router();

ticketRoutes.post("/tickets", async (request, response) => {
  const input = parseRequest(createTicketSchema, request.body);
  response.status(201).json(await createTicket(input));
});

ticketRoutes.get("/tickets", async (request, response) => {
  const query = parseRequest(ticketListQuerySchema, request.query);
  response.json(await listTickets(query));
});

ticketRoutes.get("/tickets/:ticketRef", async (request, response) => {
  const reference = parseRequest(
    ticketReferenceSchema,
    request.params.ticketRef,
  );
  response.json(await getTicketByReference(reference));
});

ticketRoutes.patch(
  "/tickets/:ticketRef/assignee",
  async (request, response) => {
    const reference = parseRequest(
      ticketReferenceSchema,
      request.params.ticketRef,
    );
    const input = parseRequest(updateAssigneeSchema, request.body);
    response.json(
      await updateTicketAssignee(reference, input.assigneeId),
    );
  },
);

ticketRoutes.use(ticketResolutionRoutes);
ticketRoutes.use(ticketLifecycleRoutes);
