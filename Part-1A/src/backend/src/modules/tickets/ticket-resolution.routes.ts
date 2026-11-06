import { Router } from "express";
import { parseRequest } from "../request-validation.js";
import { resolutionNoteSchema, ticketReferenceSchema } from "./ticket.schemas.js";
import { updateResolutionNote } from "./ticket-lifecycle.service.js";

export const ticketResolutionRoutes = Router();

ticketResolutionRoutes.patch(
  "/tickets/:ticketRef/resolution",
  async (request, response) => {
    const reference = parseRequest(
      ticketReferenceSchema,
      request.params.ticketRef,
    );
    const input = parseRequest(resolutionNoteSchema, request.body);
    response.json(
      await updateResolutionNote(reference, input.resolutionNote),
    );
  },
);
