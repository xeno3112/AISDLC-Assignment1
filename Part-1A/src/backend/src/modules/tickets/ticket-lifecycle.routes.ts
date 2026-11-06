import { Router } from "express";
import { parseRequest } from "../request-validation.js";
import {
  confirmationSchema,
  ticketReferenceSchema,
  transitionSchema,
} from "./ticket.schemas.js";
import {
  confirmTicketAction,
  transitionTicket,
} from "./ticket-lifecycle.service.js";

export const ticketLifecycleRoutes = Router();

ticketLifecycleRoutes.post(
  "/tickets/:ticketRef/transitions",
  async (request, response) => {
    const reference = parseRequest(
      ticketReferenceSchema,
      request.params.ticketRef,
    );
    const input = parseRequest(transitionSchema, request.body);
    response.json(await transitionTicket(reference, input));
  },
);

ticketLifecycleRoutes.post(
  "/tickets/:ticketRef/close",
  async (request, response) => {
    const reference = parseRequest(
      ticketReferenceSchema,
      request.params.ticketRef,
    );
    parseRequest(confirmationSchema, request.body);
    response.json(await confirmTicketAction(reference, "close"));
  },
);

ticketLifecycleRoutes.post(
  "/tickets/:ticketRef/archive",
  async (request, response) => {
    const reference = parseRequest(
      ticketReferenceSchema,
      request.params.ticketRef,
    );
    parseRequest(confirmationSchema, request.body);
    response.json(await confirmTicketAction(reference, "archive"));
  },
);
