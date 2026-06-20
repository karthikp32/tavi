import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import WorkOrdersPage from "../page";

describe("WorkOrdersPage", () => {
  it("renders the work order dashboard shell", () => {
    render(<WorkOrdersPage />);
    expect(screen.getByRole("heading", { name: "Work Orders" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New Work Order" })).toHaveAttribute(
      "href",
      "/work-orders/new",
    );
  });
});
