import { useState } from "react";

import ErrorBanner from "./components/ErrorBanner/ErrorBanner";
import ResultCard from "./components/ResultCard/ResultCard";
import TicketForm from "./components/TicketForm/TicketForm";
import { classifyTicket, type ClassificationResult } from "./services/api";

export default function App() {
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(description: string): Promise<void> {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      setResult(await classifyTicket(description));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The classification service could not process this ticket.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="page-heading">
        <p className="eyebrow">Support operations</p>
        <h1>Support Ticket Classifier</h1>
        <p>Get a structured category, priority, and grounded summary for a support request.</p>
      </header>
      <TicketForm isLoading={isLoading} onSubmit={handleSubmit} />
      {error !== null && <ErrorBanner message={error} />}
      {result !== null && <ResultCard result={result} />}
    </main>
  );
}
