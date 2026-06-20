import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkOrderReviewView } from "../WorkOrderReviewView";

describe("WorkOrderReviewView", () => {
  it("renders the work order id and command-center layout sections", () => {
    render(<WorkOrderReviewView workOrderId="wo_123" />);
    expect(screen.getByRole("heading", { name: "Work Order wo_123" })).toBeInTheDocument();
    expect(screen.getByText(/work order summary/i)).toBeInTheDocument();
    expect(screen.getByText(/candidate pipeline/i)).toBeInTheDocument();
  });
});
