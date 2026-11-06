// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TicketListPage } from "../../../src/frontend/src/features/tickets/TicketListPage.js";
import { jsonResponse, makeTicket, makeTicketPage, staff } from "./fixtures.js";

const fetchMock = vi.fn<typeof fetch>();
let listedTicket = makeTicket();

beforeEach(() => {
  listedTicket = makeTicket();
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/staff?eligibility=all")) {
      return jsonResponse({ items: staff });
    }
    if (url.includes("/tickets?")) return jsonResponse(makeTicketPage([listedTicket]));
    if (url.endsWith("/assignee") && init?.method === "PATCH") {
      listedTicket = makeTicket({ assignee: staff[0] ?? null });
      return jsonResponse(listedTicket);
    }
    if (url.endsWith("/transitions") && init?.method === "POST") {
      return jsonResponse(
        {
          error: {
            code: "CONFLICT",
            message: "Assign an eligible staff member before starting work.",
            requestId: "request-123",
          },
        },
        409,
      );
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

describe("ticket triage", () => {
  it("combines status, priority, and assignee filters and clears them together", async () => {
    const user = userEvent.setup();
    render(
      <TicketListPage
        view="open"
        refreshSignal={0}
        notice=""
        onNoticeDismiss={vi.fn()}
      />,
    );

    await screen.findByRole("link", { name: makeTicket().reference });
    await user.selectOptions(screen.getByLabelText("Status"), "Open");
    await user.selectOptions(screen.getByLabelText("Priority"), "Urgent");
    await user.selectOptions(screen.getByLabelText("Assignee"), staff[0]!.id);

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([input]) => {
        const url = String(input);
        return (
          url.includes("status=Open") &&
          url.includes("priority=Urgent") &&
          url.includes(`assigneeId=${staff[0]!.id}`)
        );
      })).toBe(true);
    });

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByLabelText("Status")).toHaveValue("");
    expect(screen.getByLabelText("Priority")).toHaveValue("");
    expect(screen.getByLabelText("Assignee")).toHaveValue("");
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([input]) => {
        const url = String(input);
        return url.includes("/tickets?view=open") && !url.includes("status=");
      })).toBe(true);
    });
  });

  it("saves an eligible assignment and reports a rejected transition without optimistic success", async () => {
    const user = userEvent.setup();
    render(
      <TicketListPage
        view="open"
        refreshSignal={0}
        notice=""
        onNoticeDismiss={vi.fn()}
      />,
    );

    await screen.findByRole("link", { name: makeTicket().reference });
    await user.selectOptions(screen.getByLabelText(/Assignee for/), staff[0]!.id);
    await user.click(screen.getByRole("button", { name: "Assign" }));
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(
        ([input, init]) =>
          String(input).endsWith("/assignee") &&
          init?.method === "PATCH" &&
          String(init.body).includes(staff[0]!.id),
      )).toBe(true);
    });
    await waitFor(() => expect(listedTicket.assignee?.id).toBe(staff[0]!.id));

    await user.click(screen.getByRole("button", { name: "Start work" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Assign an eligible staff member before starting work.",
    );
    expect(screen.getByText("Open", { selector: "span" })).toBeInTheDocument();
  });

  it("does not offer inactive or ineligible people as new assignees", async () => {
    render(
      <TicketListPage
        view="open"
        refreshSignal={0}
        notice=""
        onNoticeDismiss={vi.fn()}
      />,
    );
    await screen.findByRole("link", { name: makeTicket().reference });
    const assignmentSelect = screen.getByLabelText(/Assignee for/);

    expect(
      within(assignmentSelect).queryByRole("option", { name: "Pat Other" }),
    ).not.toBeInTheDocument();
    expect(
      within(assignmentSelect).queryByRole("option", {
        name: "Inactive Support (inactive)",
      }),
    ).not.toBeInTheDocument();
  });
});
