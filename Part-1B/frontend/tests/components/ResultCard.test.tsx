import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ResultCard from "../../src/components/ResultCard/ResultCard";

describe("ResultCard", () => {
  it("renders clarification-required states with null values and a question", () => {
    render(
      <ResultCard
        result={{
          category: null,
          priority: null,
          summary: "",
          status: "clarification_required",
          clarification_question: "Which environment is affected?",
        }}
      />,
    );

    expect(screen.getByText("Clarification required")).toBeInTheDocument();
    expect(screen.getAllByText("Not assigned").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Which environment is affected?")).toBeInTheDocument();
  });

  it("renders rejected states without inventing category, priority, or summary", () => {
    render(
      <ResultCard
        result={{
          category: null,
          priority: null,
          summary: "",
          status: "rejected",
          clarification_question: null,
        }}
      />,
    );

    expect(screen.getByText("Rejected")).toBeInTheDocument();
    expect(screen.getAllByText("Not assigned").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("No summary provided.")).toBeInTheDocument();
  });
});
