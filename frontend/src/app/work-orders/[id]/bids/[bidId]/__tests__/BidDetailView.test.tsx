import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BidDetailView } from "../BidDetailView";

describe("BidDetailView", () => {
  it("renders the bid id and related work order id", () => {
    render(<BidDetailView workOrderId="wo_1" bidId="bid_1" />);
    expect(screen.getByRole("heading", { name: "Bid bid_1" })).toBeInTheDocument();
    expect(screen.getByText("For work order wo_1")).toBeInTheDocument();
  });
});
