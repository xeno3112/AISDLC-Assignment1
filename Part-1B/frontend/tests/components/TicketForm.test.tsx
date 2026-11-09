import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import TicketForm from "../../src/components/TicketForm/TicketForm";

describe("TicketForm", () => {
  it("submits the trimmed ticket description", () => {
    const onSubmit = vi.fn(async () => undefined);
    render(<TicketForm isLoading={false} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Ticket description" }), {
      target: { value: "  Login fails for every employee.  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Classify ticket" }));

    expect(onSubmit).toHaveBeenCalledWith("Login fails for every employee.");
  });

  it("disables submission while a request is loading", () => {
    render(<TicketForm isLoading onSubmit={async () => undefined} />);

    expect(screen.getByRole("button", { name: "Classifying…" })).toBeDisabled();
    expect(screen.getByRole("form", { name: "Ticket submission" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });
});
