// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmationDialog } from "../../../src/frontend/src/components/ConfirmationDialog.js";
import { TicketDetailPage } from "../../../src/frontend/src/features/tickets/TicketDetailPage.js";
import { ResolutionNoteEditor } from "../../../src/frontend/src/features/tickets/ResolutionNoteEditor.js";
import { jsonResponse, makeTicket, staff } from "./fixtures.js";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/staff?eligibility=all")) {
      return jsonResponse({ items: staff });
    }
    if (url.includes("/tickets/")) return jsonResponse(makeTicket());
    return jsonResponse({ error: { code: "NOT_FOUND", message: "Not found" } }, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("ticket lifecycle controls", () => {
  it("requires a non-empty resolution note before resolving", async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn().mockResolvedValue(undefined);
    render(
      <ResolutionNoteEditor
        ticket={makeTicket({ status: "In Progress" })}
        onResolve={onResolve}
        onSave={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Resolution note"), "   ");
    await user.click(screen.getByRole("button", { name: "Save note and resolve" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter a resolution note",
    );
    expect(onResolve).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Resolution note"));
    await user.type(screen.getByLabelText("Resolution note"), "  Restarted service.  ");
    await user.click(screen.getByRole("button", { name: "Save note and resolve" }));
    await waitFor(() => expect(onResolve).toHaveBeenCalledWith("Restarted service."));
  });

  it("lets a resolved ticket revise its note without changing status", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <ResolutionNoteEditor
        ticket={makeTicket({
          status: "Resolved",
          resolutionNote: "Initial note",
        })}
        onResolve={vi.fn()}
        onSave={onSave}
      />,
    );

    await user.clear(screen.getByLabelText("Resolution note"));
    await user.type(screen.getByLabelText("Resolution note"), "Updated note");
    await user.click(screen.getByRole("button", { name: "Save resolution note" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith("Updated note"));
  });

  it("supports Escape cancellation and never runs the confirmation action", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();
    render(
      <ConfirmationDialog
        open
        title="Close this ticket?"
        description="This is a separate confirmation."
        confirmLabel="Confirm close"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Close this ticket?" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("opens a close confirmation for Resolved tickets and cancellation sends no request", async () => {
    const user = userEvent.setup();
    const resolved = makeTicket({
      status: "Resolved",
      resolutionNote: "Service restarted.",
    });
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/staff?eligibility=all")) {
        return jsonResponse({ items: staff });
      }
      if (url.includes("/tickets/")) return jsonResponse(resolved);
      return jsonResponse({ items: [] });
    });
    const onClose = vi.fn();
    render(
      <TicketDetailPage
        reference={resolved.reference}
        onClose={onClose}
        onArchive={vi.fn()}
      />,
    );

    await screen.findByRole("heading", { name: resolved.title });
    await user.click(screen.getByRole("button", { name: "Close ticket…" }));
    expect(
      screen.getByRole("dialog", { name: "Close this ticket?" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("reopens a Resolved ticket to Open before work resumes", async () => {
    const user = userEvent.setup();
    const resolved = makeTicket({
      status: "Resolved",
      resolutionNote: "Service restarted.",
    });
    const reopened = makeTicket({
      status: "Open",
      resolutionNote: "Service restarted.",
    });
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/staff?eligibility=all")) {
        return jsonResponse({ items: staff });
      }
      if (url.endsWith("/transitions") && init?.method === "POST") {
        return jsonResponse(reopened);
      }
      if (url.includes("/tickets/")) return jsonResponse(resolved);
      return jsonResponse({ items: [] });
    });
    render(
      <TicketDetailPage
        reference={resolved.reference}
        onClose={vi.fn()}
        onArchive={vi.fn()}
      />,
    );

    await user.click(
      await screen.findByRole("button", { name: "Reopen to Open" }),
    );
    expect(await screen.findByRole("button", { name: "Start work" })).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(
      ([input, init]) =>
        String(input).endsWith("/transitions") &&
        init?.method === "POST" &&
        String(init.body).includes('"action":"reopen"'),
    )).toBe(true);
  });

  it("shows Archived ticket details as read-only", async () => {
    const archived = makeTicket({
      status: "Archived",
      resolutionNote: "Service restarted.",
      assignee: staff[0] ?? null,
    });
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/staff?eligibility=all")) {
        return jsonResponse({ items: staff });
      }
      if (url.includes("/tickets/")) return jsonResponse(archived);
      return jsonResponse({ items: [] });
    });
    render(
      <TicketDetailPage
        reference={archived.reference}
        onClose={vi.fn()}
        onArchive={vi.fn()}
      />,
    );

    expect(await screen.findByText("Service restarted.")).toBeInTheDocument();
    expect(screen.getByText("Archived tickets are read-only.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /assign|start work|archive ticket/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Resolution note" })).not.toBeInTheDocument();
  });
});
