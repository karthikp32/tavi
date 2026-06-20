import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import NewWorkOrderPage from "../page";

describe("NewWorkOrderPage", () => {
  it("renders the manual work order creation form shell", () => {
    render(<NewWorkOrderPage />);
    expect(screen.getByRole("heading", { name: "New Work Order" })).toBeInTheDocument();
    expect(screen.getByLabelText("Trade")).toBeInTheDocument();
    expect(screen.getByLabelText("Scope of work")).toBeInTheDocument();
  });
});
