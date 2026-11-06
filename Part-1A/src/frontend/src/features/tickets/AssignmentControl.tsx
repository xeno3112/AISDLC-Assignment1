import { useEffect, useState, type FormEvent } from "react";
import type { StaffMember, Ticket } from "../../api/tickets.js";

interface AssignmentControlProps {
  ticket: Ticket;
  staff: StaffMember[];
  onSave: (assigneeId: string | null) => Promise<void>;
}

export function AssignmentControl({
  ticket,
  staff,
  onSave,
}: AssignmentControlProps) {
  const eligibleStaff = staff.filter(
    (member) =>
      member.active && (member.role === "support" || member.role === "operations"),
  );
  const currentAssigneeId = ticket.assignee?.id ?? "";
  const currentAssigneeIsEligible = eligibleStaff.some(
    (member) => member.id === currentAssigneeId,
  );
  const [selectedId, setSelectedId] = useState(currentAssigneeId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSelectedId(currentAssigneeId);
    setError("");
  }, [currentAssigneeId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(selectedId || null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The assignment could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="assignment-control" onSubmit={handleSubmit}>
      <label htmlFor={`assignee-${ticket.id}`}>
        Assignee <span className="sr-only">for {ticket.reference}</span>
      </label>
      <div className="assignment-row">
        <select
          id={`assignee-${ticket.id}`}
          onChange={(event) => setSelectedId(event.target.value)}
          value={selectedId}
        >
          {ticket.status === "Open" && <option value="">Unassigned</option>}
          {ticket.assignee && !currentAssigneeIsEligible && (
            <option value={currentAssigneeId}>
              {ticket.assignee.displayName} — current, not eligible
            </option>
          )}
          {eligibleStaff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.displayName}
            </option>
          ))}
        </select>
        <button
          className="button button-secondary button-small"
          disabled={
            saving ||
            selectedId === currentAssigneeId ||
            (ticket.status === "In Progress" && !selectedId)
          }
          type="submit"
        >
          {saving ? "Saving…" : ticket.assignee ? "Save assignee" : "Assign"}
        </button>
      </div>
      {error && (
        <p className="field-error assignment-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
