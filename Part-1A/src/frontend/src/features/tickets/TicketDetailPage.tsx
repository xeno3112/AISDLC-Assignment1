import { useEffect, useState } from "react";
import {
  ApiError,
  getTicket,
  listStaff,
  resolveTicket,
  transitionTicket,
  updateAssignee,
  updateResolutionNote,
  type Ticket,
  type StaffMember,
} from "../../api/tickets.js";
import { ConfirmationDialog } from "../../components/ConfirmationDialog.js";
import { AssignmentControl } from "./AssignmentControl.js";
import { ResolutionNoteEditor } from "./ResolutionNoteEditor.js";

interface TicketDetailPageProps {
  reference: string;
  onClose: (reference: string) => Promise<Ticket>;
  onArchive: (reference: string) => Promise<Ticket>;
}

export function TicketDetailPage({
  reference,
  onClose,
  onArchive,
}: TicketDetailPageProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmation, setConfirmation] = useState<"close" | "archive" | null>(
    null,
  );
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let active = true;
    setTicket(null);
    setLoading(true);
    setLoadError("");
    Promise.all([getTicket(reference), listStaff("all")])
      .then(([result, members]) => {
        if (active) {
          setTicket(result);
          setStaff(members);
        }
      })
      .catch((caught: unknown) => {
        if (active) setLoadError(messageFor(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reference]);

  async function saveAssignment(assigneeId: string | null): Promise<void> {
    if (!ticket) return;
    const updated = await updateAssignee(ticket.reference, assigneeId);
    setTicket(updated);
    setActionError("");
  }

  async function applyTransition(
    action: "start" | "returnToOpen" | "reopen",
  ): Promise<void> {
    if (!ticket) return;
    setWorking(true);
    setActionError("");
    try {
      setTicket(await transitionTicket(ticket.reference, action));
    } catch (caught) {
      setActionError(messageFor(caught));
    } finally {
      setWorking(false);
    }
  }

  async function saveResolution(note: string, resolve: boolean): Promise<void> {
    if (!ticket) return;
    const updated = resolve
      ? await resolveTicket(ticket.reference, note)
      : await updateResolutionNote(ticket.reference, note);
    setTicket(updated);
    setActionError("");
  }

  async function confirmAction(): Promise<void> {
    if (!ticket || !confirmation) return;
    const updated =
      confirmation === "close"
        ? await onClose(ticket.reference)
        : await onArchive(ticket.reference);
    setTicket(updated);
    setConfirmation(null);
  }

  if (loading) {
    return (
      <p aria-live="polite" className="panel loading-panel" role="status">
        Loading ticket…
      </p>
    );
  }

  if (loadError || !ticket) {
    return (
      <section aria-labelledby="ticket-load-error" className="panel">
        <h1 id="ticket-load-error">Ticket unavailable</h1>
        <p className="alert alert-error" role="alert">
          {loadError || "The requested ticket could not be loaded."}
        </p>
        <a className="button button-secondary" href="#/open">
          Return to Open tickets
        </a>
      </section>
    );
  }

  const eligibleAssignee = Boolean(
    ticket.assignee?.active &&
      (ticket.assignee.role === "support" ||
        ticket.assignee.role === "operations"),
  );

  return (
    <section aria-labelledby="ticket-detail-heading" className="content-column">
      <a className="back-link" href="#/open">
        <span aria-hidden="true">←</span> Open queue
      </a>
      <div className="page-heading detail-heading">
        <div>
          <p className="eyebrow">{ticket.reference}</p>
          <h1 id="ticket-detail-heading">{ticket.title}</h1>
          <div className="badge-row">
            <span className={`status-badge status-${ticket.status.toLowerCase().replaceAll(" ", "-")}`}>
              {ticket.status}
            </span>
            <span className={`priority-label priority-${ticket.priority.toLowerCase()}`}>
              {ticket.priority} priority
            </span>
          </div>
        </div>
      </div>

      {actionError && (
        <p className="alert alert-error" role="alert">
          {actionError}
        </p>
      )}

      <div className="detail-layout">
        <div className="detail-main">
          <section aria-labelledby="description-heading" className="panel detail-section">
            <h2 id="description-heading">Description</h2>
            <p className="ticket-description">{ticket.description}</p>
          </section>

          {ticket.status === "Open" || ticket.status === "In Progress" ? (
            <section aria-labelledby="assignment-heading" className="panel detail-section">
              <div className="section-heading">
                <div>
                  <h2 id="assignment-heading">Assignment</h2>
                  <p className="muted">
                    Only active support and operations staff can be assigned.
                  </p>
                </div>
              </div>
              <AssignmentControl
                key={`${ticket.id}-${ticket.assignee?.id ?? "none"}`}
                ticket={ticket}
                staff={staff}
                onSave={saveAssignment}
              />
            </section>
          ) : null}

          {ticket.resolutionNote &&
            ticket.status !== "In Progress" &&
            ticket.status !== "Resolved" && (
            <section aria-labelledby="saved-resolution-heading" className="panel detail-section">
              <h2 id="saved-resolution-heading">Resolution note</h2>
              <p className="ticket-description">{ticket.resolutionNote}</p>
            </section>
          )}

          <ResolutionNoteEditor
            ticket={ticket}
            onResolve={(note) => saveResolution(note, true)}
            onSave={(note) => saveResolution(note, false)}
          />
        </div>

        <aside aria-label="Ticket actions and details" className="detail-aside">
          <section className="panel detail-section">
            <h2>Ticket details</h2>
            <dl className="detail-facts">
              <div>
                <dt>Department</dt>
                <dd>{ticket.department.name}</dd>
              </div>
              <div>
                <dt>Assignee</dt>
                <dd>{ticket.assignee?.displayName ?? "Unassigned"}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(ticket.createdAt)}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{formatDate(ticket.updatedAt)}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="actions-heading" className="panel detail-section">
            <h2 id="actions-heading">Actions</h2>
            <div className="action-stack">
              {ticket.status === "Open" && (
                <button
                  className="button button-primary"
                  disabled={working || !eligibleAssignee}
                  onClick={() => void applyTransition("start")}
                  type="button"
                >
                  Start work
                </button>
              )}
              {ticket.status === "In Progress" && (
                <>
                  <button
                    className="button button-primary"
                    disabled={working}
                    onClick={() => {
                      const editor = document.getElementById("resolution-note");
                      editor?.focus();
                    }}
                    type="button"
                  >
                    Add resolution note
                  </button>
                  <button
                    className="button button-secondary"
                    disabled={working}
                    onClick={() => void applyTransition("returnToOpen")}
                    type="button"
                  >
                    Return to Open
                  </button>
                </>
              )}
              {ticket.status === "Resolved" && (
                <>
                  <button
                    className="button button-secondary"
                    disabled={working}
                    onClick={() => void applyTransition("reopen")}
                    type="button"
                  >
                    Reopen to Open
                  </button>
                  <button
                    className="button button-danger"
                    disabled={working}
                    onClick={() => setConfirmation("close")}
                    type="button"
                  >
                    Close ticket…
                  </button>
                </>
              )}
              {ticket.status === "Closed" && (
                <button
                  className="button button-danger"
                  onClick={() => setConfirmation("archive")}
                  type="button"
                >
                  Archive ticket…
                </button>
              )}
              {(ticket.status === "Archived" || ticket.status === "Closed") && (
                <p className="muted read-only-note">
                  {ticket.status === "Archived"
                    ? "Archived tickets are read-only."
                    : "Closed tickets are read-only until archived."}
                </p>
              )}
              {ticket.status === "Open" && !eligibleAssignee && (
                <p className="muted">Assign an eligible staff member to start work.</p>
              )}
              {ticket.status === "Archived" && (
                <p className="read-only-label">Read only</p>
              )}
            </div>
          </section>
        </aside>
      </div>

      <ConfirmationDialog
        open={confirmation === "close"}
        title="Close this ticket?"
        description="The ticket will move from Resolved to Closed and its resolution note will become read-only."
        confirmLabel="Confirm close"
        onCancel={() => setConfirmation(null)}
        onConfirm={confirmAction}
      />
      <ConfirmationDialog
        open={confirmation === "archive"}
        title="Archive this ticket?"
        description="The ticket will move from Closed to Archived and remain available as a read-only record."
        confirmLabel="Confirm archive"
        onCancel={() => setConfirmation(null)}
        onConfirm={confirmAction}
      />
    </section>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
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
