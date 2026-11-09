import { useState, type FormEvent } from "react";

type TicketFormProps = {
  isLoading: boolean;
  onSubmit: (description: string) => Promise<void>;
};

export default function TicketForm({ isLoading, onSubmit }: TicketFormProps) {
  const [description, setDescription] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit(description.trim());
  }

  return (
    <form
      className="ticket-form"
      onSubmit={handleSubmit}
      aria-busy={isLoading}
      aria-label="Ticket submission"
    >
      <label htmlFor="ticket-description">Ticket description</label>
      <textarea
        id="ticket-description"
        name="description"
        value={description}
        onChange={(event) => setDescription(event.currentTarget.value)}
        rows={7}
        required
        aria-describedby="ticket-description-help"
        placeholder="Describe the issue, impact, and any relevant details."
      />
      <p id="ticket-description-help">Include only information relevant to this support request.</p>
      <button type="submit" disabled={isLoading || description.trim().length === 0}>
        {isLoading ? "Classifying…" : "Classify ticket"}
      </button>
    </form>
  );
}
