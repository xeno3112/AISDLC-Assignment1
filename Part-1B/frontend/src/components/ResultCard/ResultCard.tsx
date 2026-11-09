import type { ClassificationResult } from "../../services/api";

type ResultCardProps = {
  result: ClassificationResult;
};

const formatStatus = (status: ClassificationResult["status"]): string => {
  switch (status) {
    case "success":
      return "Success";
    case "clarification_required":
      return "Clarification required";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
};

export default function ResultCard({ result }: ResultCardProps) {
  return (
    <section className="result-card" aria-labelledby="classification-result-heading" aria-live="polite">
      <h2 id="classification-result-heading">Classification result</h2>
      <dl>
        <div>
          <dt>Status</dt>
          <dd>{formatStatus(result.status)}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{result.category ?? "Not assigned"}</dd>
        </div>
        <div>
          <dt>Priority</dt>
          <dd>{result.priority ?? "Not assigned"}</dd>
        </div>
        <div>
          <dt>Summary</dt>
          <dd>{result.summary || "No summary provided."}</dd>
        </div>
        {result.clarification_question !== null && (
          <div>
            <dt>Clarification needed</dt>
            <dd>{result.clarification_question}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
