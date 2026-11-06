// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../../../src/frontend/src/app/App.js";
import { TicketForm } from "../../../src/frontend/src/features/tickets/TicketForm.js";
import { TicketListPage } from "../../../src/frontend/src/features/tickets/TicketListPage.js";
import {
  department,
  jsonResponse,
  makeTicket,
  makeTicketPage,
  staff,
} from "./fixtures.js";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/departments")) {
      return jsonResponse({ items: [department] });
    }
    if (url.endsWith("/staff?eligibility=all")) {
      return jsonResponse({ items: staff });
    }
    if (url.includes("/tickets?")) {
      return jsonResponse(makeTicketPage());
    }
    if (url.endsWith("/tickets") && init?.method === "POST") {
      return jsonResponse(makeTicket(), 201);
    }
    return jsonResponse({ error: { code: "NOT_FOUND", message: "Not found" } }, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("ticket intake", () => {
  it("announces field-specific errors for blank and whitespace-only input", async () => {
    const user = userEvent.setup();
    render(<TicketForm onCreated={vi.fn()} />);
    await screen.findByRole("option", { name: "Customer Care" });

    await user.type(screen.getByLabelText("Title"), "   ");
    await user.type(screen.getByLabelText("Description"), "  ");
    await user.click(screen.getByRole("button", { name: "Create ticket" }));

    expect(await screen.findByText("Enter a ticket title.")).toBeInTheDocument();
    expect(screen.getByText("Enter a description.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/\/tickets$/),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("creates a trimmed ticket and announces its reference", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(<TicketForm onCreated={onCreated} />);
    await screen.findByRole("option", { name: "Customer Care" });

    await user.type(screen.getByLabelText("Title"), "  Portal access  ");
    await user.type(screen.getByLabelText("Description"), "  Sign-in is blocked.  ");
    await user.selectOptions(screen.getByLabelText("Department"), department.id);
    await user.selectOptions(screen.getByLabelText("Priority"), "Urgent");
    await user.click(screen.getByRole("button", { name: "Create ticket" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(makeTicket().reference));
    const createCall = fetchMock.mock.calls.find(
      ([input, init]) => String(input).endsWith("/tickets") && init?.method === "POST",
    );
    expect(createCall).toBeDefined();
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      title: "Portal access",
      description: "Sign-in is blocked.",
      departmentId: department.id,
      priority: "Urgent",
    });
  });

  it("shows field-level feedback returned by the API", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (input, init) => {
      if (String(input).endsWith("/departments")) {
        return jsonResponse({ items: [department] });
      }
      if (String(input).endsWith("/tickets") && init?.method === "POST") {
        return jsonResponse(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Review the highlighted fields.",
              fields: { title: "Title is not accepted." },
              requestId: "request-intake",
            },
          },
          400,
        );
      }
      return jsonResponse({ items: [] });
    });
    render(<TicketForm onCreated={vi.fn()} />);
    await screen.findByRole("option", { name: "Customer Care" });
    await user.type(screen.getByLabelText("Title"), "Portal access");
    await user.type(screen.getByLabelText("Description"), "Sign-in is blocked.");
    await user.selectOptions(screen.getByLabelText("Department"), department.id);
    await user.selectOptions(screen.getByLabelText("Priority"), "High");
    await user.click(screen.getByRole("button", { name: "Create ticket" }));

    expect(await screen.findByText("Title is not accepted.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Review the highlighted fields.",
    );
    expect(screen.getByLabelText("Title")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows loading and API error feedback for the Open queue", async () => {
    let releaseTickets: (response: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => {
      releaseTickets = resolve;
    });
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/staff?eligibility=all")) {
        return jsonResponse({ items: staff });
      }
      if (url.includes("/tickets?")) return pending;
      return jsonResponse({ items: [department] });
    });

    const { rerender } = render(
      <TicketListPage
        view="open"
        refreshSignal={0}
        notice=""
        onNoticeDismiss={vi.fn()}
      />,
    );
    expect(screen.getAllByText("Loading tickets…").length).toBeGreaterThan(0);
    releaseTickets(jsonResponse(makeTicketPage()));
    expect(
      await screen.findByRole("link", { name: makeTicket().reference }),
    ).toBeInTheDocument();

    fetchMock.mockRejectedValueOnce(new Error("Network unavailable"));
    rerender(
      <TicketListPage
        view="open"
        refreshSignal={1}
        notice=""
        onNoticeDismiss={vi.fn()}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Network unavailable",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("renders an Open ticket with its reference, department, priority, and status", async () => {
    render(
      <TicketListPage
        view="open"
        refreshSignal={0}
        notice=""
        onNoticeDismiss={vi.fn()}
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Unable to access the billing portal",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Customer Care")).toBeInTheDocument();
    expect(screen.getByText("High", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Open", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Unassigned", { selector: "dd" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: makeTicket().reference }),
    ).toHaveAttribute("href", `#/tickets/${makeTicket().reference}`);
  });

  it("returns to the Open queue with a newly created ticket visible", async () => {
    const user = userEvent.setup();
    const created = makeTicket({
      title: "Newly reported portal issue",
      reference: "TKT-111111111111111111111111",
    });
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/departments")) {
        return jsonResponse({ items: [department] });
      }
      if (url.endsWith("/staff?eligibility=all")) {
        return jsonResponse({ items: staff });
      }
      if (url.endsWith("/tickets") && init?.method === "POST") {
        return jsonResponse(created, 201);
      }
      if (url.includes("/tickets?")) {
        return jsonResponse(makeTicketPage([created]));
      }
      return jsonResponse({ items: [] });
    });
    window.history.replaceState(null, "", "/#/new");
    render(<App />);

    await user.type(screen.getByLabelText("Title"), "Newly reported portal issue");
    await user.type(screen.getByLabelText("Description"), "Portal is unavailable.");
    await user.selectOptions(screen.getByLabelText("Department"), department.id);
    await user.selectOptions(screen.getByLabelText("Priority"), "High");
    await user.click(screen.getByRole("button", { name: "Create ticket" }));

    expect(await screen.findByRole("heading", { name: "Open tickets" })).toBeInTheDocument();
    expect(screen.getByText("Newly reported portal issue")).toBeInTheDocument();
    expect(
      screen.getByText(`Ticket ${created.reference} was created.`),
    ).toBeInTheDocument();
  });

  it("moves focus to the main content without changing the app route", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/#/new");
    render(<App />);

    await user.click(screen.getByRole("link", { name: "Skip to content" }));

    expect(screen.getByRole("main")).toHaveFocus();
    expect(screen.getByRole("region", { name: "Create a ticket" })).toBeInTheDocument();
    expect(window.location.hash).toBe("#/new");
  });
});
