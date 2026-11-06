import { useEffect, useState, type FormEvent } from "react";
import type { Ticket } from "../../api/tickets.js";

interface ResolutionNoteEditorProps {
  ticket: Ticket;
  onResolve: (note: string) => Promise<void>;
  onSave: (note: string) => Promise<void>;
}

export function ResolutionNoteEditor({
  ticket,
  onResolve,
  onSave,
}: ResolutionNoteEditorProps) {
  const [note, setNote] = useState(ticket.resolutionNote ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isResolving = ticket.status === "In Progress";
  const isEditable = isResolving || ticket.status === "Resolved";

  useEffect(() => {
    setNote(ticket.resolutionNote ?? "");
    setError("");
  }, [ticket.resolutionNote, ticket.status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = note.trim();
    if (!trimmed) {
      setError("Enter a resolution note before saving.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await (isResolving ? onResolve(trimmed) : onSave(trimmed));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The resolution note could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!isEditable) return null;

  return (
    <form className="panel detail-section resolution-editor" onSubmit={handleSubmit}>
      <div className="section-heading">
        <div>
          <h2 id="resolution-heading">
            {isResolving ? "Resolve ticket" : "Resolution note"}
          </h2>
          <p className="muted">
            {isResolving
              ? "A note is required to mark this ticket Resolved."
              : "You can revise this note while the ticket is Resolved."}
          </p>
        </div>
      </div>
      <div className="field">
        <label htmlFor="resolution-note">Resolution note</label>
        <textarea
          aria-describedby={error ? "resolution-error" : undefined}
          aria-invalid={Boolean(error)}
          id="resolution-note"
          onChange={(event) => {
            setNote(event.target.value);
            setError("");
          }}
          required
          rows={4}
          value={note}
        />
        {error && (
          <span className="field-error" id="resolution-error" role="alert">
            {error}
          </span>
        )}
      </div>
      <button className="button button-primary" disabled={saving} type="submit">
        {saving
          ? "Saving…"
          : isResolving
            ? "Save note and resolve"
            : "Save resolution note"}
      </button>
    </form>
  );
}
