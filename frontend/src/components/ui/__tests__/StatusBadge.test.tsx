import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "../StatusBadge";

describe("StatusBadge", () => {
  it("renders a formatted label for a known status", () => {
    render(<StatusBadge status="ready_for_award" />);
    expect(screen.getByText("Ready For Award")).toBeInTheDocument();
  });

  it("renders a formatted label for an unrecognized status without crashing", () => {
    render(<StatusBadge status="some_new_status" />);
    expect(screen.getByText("Some New Status")).toBeInTheDocument();
  });
});
