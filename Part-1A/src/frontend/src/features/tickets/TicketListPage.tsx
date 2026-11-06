import { useEffect, useState } from "react";
import {
  ApiError,
  listStaff,
  listTickets,
  transitionTicket,
  updateAssignee,
  type Priority,
  type StaffMember,
  type Ticket,
  type TicketPage,
  type TicketStatus,
  type TicketView,
} from "../../api/tickets.js";
import { AssignmentControl } from "./AssignmentControl.js";
import { TicketFilters, type TicketFilterValues } from "./TicketFilters.js";

interface TicketListPageProps {
  view: TicketView;
  refreshSignal: number;
  notice: string;
  onNoticeDismiss: () => void;
}

const initialFilters: TicketFilterValues = {
  status: "",
  priority: "",
  assigneeId: "",
};

export function TicketListPage({
  view,
  refreshSignal,
  notice,
  onNoticeDismiss,
}: TicketListPageProps) {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState<TicketPage | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [reload, setReload] = useState(0);
  const [actionError, setActionError] = useState<{
    ticketId: string;
    message: string;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    const query = {
      view,
      page: pageNumber,
      pageSize: 50,
      ...(filters.status ? { status: filters.status as TicketStatus } : {}),
      ...(filters.priority ? { priority: filters.priority as Priority } : {}),
      ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
    };

    Promise.all([listTickets(query), listStaff("all")])
      .then(([ticketPage, members]) => {
        if (!active) return;
        setPage(ticketPage);
        setStaff(members);
      })
      .catch((caught: unknown) => {
        if (active) setError(messageFor(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters, pageNumber, refreshSignal, reload, view]);

  function changeFilters(value: TicketFilterValues): void {
    setFilters(value);
    setPageNumber(1);
  }

  async function saveAssignment(
    ticket: Ticket,
    assigneeId: string | null,
  ): Promise<void> {
    await updateAssignee(ticket.reference, assigneeId);
    setReload((current) => current + 1);
  }

  async function applyTransition(
    ticket: Ticket,
    action: "start" | "returnToOpen",
  ): Promise<void> {
    setPendingAction(ticket.id);
    setActionError(null);
    try {
      await transitionTicket(ticket.reference, action);
      setReload((current) => current + 1);
    } catch (caught) {
      setActionError({ ticketId: ticket.id, message: messageFor(caught) });
    } finally {
      setPendingAction("");
    }
  }

  const title = viewTitle(view);

  return (
    <section aria-labelledby="queue-heading">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Ticket desk</p>
          <h1 id="queue-heading">{title}</h1>
          <p className="muted">
            Review ownership and progress, then open a ticket for details.
          </p>
        </div>
        <a className="button button-primary" href="#/new">
          Create ticket
        </a>
      </div>

      <TicketFilters value={filters} staff={staff} onChange={changeFilters} />

      {notice && (
        <div className="alert alert-success" role="status">
          <span>{notice}</span>
          <button
            aria-label="Dismiss creation message"
            className="icon-button"
            onClick={onNoticeDismiss}
            type="button"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert">
          <span>{error}</span>
          <button
            className="button button-secondary button-small"
            onClick={() => setReload((current) => current + 1)}
            type="button"
          >
            Retry
          </button>
        </div>
      )}

      <div aria-busy={loading} className="queue-summary">
        <p aria-live="polite" className="muted" role="status">
          {loading
            ? "Loading tickets…"
            : `${page?.total ?? 0} ${page?.total === 1 ? "ticket" : "tickets"}`}
        </p>
        {page && page.totalPages > 1 && (
          <div aria-label="Ticket pages" className="pagination">
            <button
              className="button button-secondary button-small"
              disabled={pageNumber <= 1 || loading}
              onClick={() => setPageNumber((current) => current - 1)}
              type="button"
            >
              Previous
            </button>
            <span>
              Page {page.page} of {page.totalPages}
            </span>
            <button
              className="button button-secondary button-small"
              disabled={pageNumber >= page.totalPages || loading}
              onClick={() => setPageNumber((current) => current + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {loading && !page ? (
        <div className="panel empty-state">
          <p>Loading tickets…</p>
        </div>
      ) : !loading && !error && page?.items.length === 0 ? (
        <div className="panel empty-state">
          <span aria-hidden="true" className="empty-icon">
            ✓
          </span>
          <h2>No matching tickets</h2>
          <p>
            {filters.status || filters.priority || filters.assigneeId
              ? "Try changing or clearing the filters."
              : view === "archived"
                ? "Closed tickets will appear here after they are archived."
                : "There is no work in this queue yet."}
          </p>
          {(filters.status || filters.priority || filters.assigneeId) && (
            <button
              className="button button-secondary"
              onClick={() => changeFilters(initialFilters)}
              type="button"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <ul aria-label={title} className="ticket-list">
          {page?.items.map((ticket) => (
            <li key={ticket.id}>
              <article aria-labelledby={`ticket-title-${ticket.id}`} className="ticket-card">
                <div className="ticket-card-main">
                  <div className="ticket-card-topline">
                    <a
                      className="ticket-reference"
                      href={`#/tickets/${ticket.reference}`}
                    >
                      {ticket.reference}
                    </a>
                    <span className={`status-badge ${statusClass(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </div>
                  <h2 id={`ticket-title-${ticket.id}`}>
                    <a href={`#/tickets/${ticket.reference}`}>{ticket.title}</a>
                  </h2>
                  <dl className="ticket-facts">
                    <div>
                      <dt>Department</dt>
                      <dd>{ticket.department.name}</dd>
                    </div>
                    <div>
                      <dt>Priority</dt>
                      <dd>
                        <span className={`priority-label ${priorityClass(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt>Assignee</dt>
                      <dd>{ticket.assignee?.displayName ?? "Unassigned"}</dd>
                    </div>
                    <div>
                      <dt>Created</dt>
                      <dd>{formatDate(ticket.createdAt)}</dd>
                    </div>
                  </dl>
                </div>

                {ticket.status !== "Archived" &&
                  (ticket.status === "Open" || ticket.status === "In Progress") && (
                    <div className="ticket-card-controls">
                      <AssignmentControl
                        key={`${ticket.id}-${ticket.assignee?.id ?? "none"}`}
                        ticket={ticket}
                        staff={staff}
                        onSave={(assigneeId) => saveAssignment(ticket, assigneeId)}
                      />
                      {ticket.status === "Open" ? (
                        <button
                          className="button button-primary button-small"
                          disabled={
                            pendingAction === ticket.id ||
                            !isEligibleAssignee(ticket)
                          }
                          onClick={() => void applyTransition(ticket, "start")}
                          type="button"
                        >
                          {pendingAction === ticket.id ? "Updating…" : "Start work"}
                        </button>
                      ) : (
                        <button
                          className="button button-secondary button-small"
                          disabled={pendingAction === ticket.id}
                          onClick={() =>
                            void applyTransition(ticket, "returnToOpen")
                          }
                          type="button"
                        >
                          {pendingAction === ticket.id
                            ? "Updating…"
                            : "Return to Open"}
                        </button>
                      )}
                    </div>
                  )}
                {actionError?.ticketId === ticket.id && (
                  <p className="field-error card-action-error" role="alert">
                    {actionError.message}
                  </p>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function isEligibleAssignee(ticket: Ticket): boolean {
  return Boolean(
    ticket.assignee?.active &&
      (ticket.assignee.role === "support" ||
        ticket.assignee.role === "operations"),
  );
}

function viewTitle(view: TicketView): string {
  switch (view) {
    case "open":
      return "Open tickets";
    case "assigned":
      return "Assigned tickets";
    case "archived":
      return "Archived tickets";
    case "all":
      return "All tickets";
  }
}

function statusClass(status: string): string {
  return `status-${status.toLowerCase().replaceAll(" ", "-")}`;
}

function priorityClass(priority: string): string {
  return `priority-${priority.toLowerCase()}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
      }).format(date);
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    return error.requestId
      ? `${error.message} Reference: ${error.requestId}`
      : error.message;
  }
  return error instanceof Error
    ? error.message
    : "The request could not be completed. Try again.";
}
