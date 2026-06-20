import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WorkOrderDashboardPage from "./page";
import { getTimeline, getVendor, listBids, listCandidates, listWorkOrders } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  listWorkOrders: vi.fn(),
  listCandidates: vi.fn(),
  listBids: vi.fn(),
  getTimeline: vi.fn(),
  getVendor: vi.fn(),
}));

describe("WorkOrderDashboardPage", () => {
  it("renders work orders with computed best bid and recommended winner", async () => {
    vi.mocked(listWorkOrders).mockResolvedValue([
      {
        id: "wo_1",
        title: "Fix the leaky sink",
        trade: "plumbing",
        status: "bidding",
        bidding_mode: "transparent_auction",
        bid_deadline_at: "2026-07-01T00:00:00Z",
      } as never,
    ]);
    vi.mocked(listCandidates).mockResolvedValue([
      { id: "cand_1", vendor_id: "v_1" } as never,
    ]);
    vi.mocked(listBids).mockResolvedValue([
      { id: "bid_1", amount_cents: 15000, work_order_candidate_id: "cand_1" } as never,
    ]);
    vi.mocked(getTimeline).mockResolvedValue({
      timeline: [],
      recommendation: {
        recommended_candidate_id: "cand_1",
        best_price_candidate_id: "cand_1",
        best_quality_candidate_id: "cand_1",
        fastest_candidate_id: "cand_1",
        reason: "Best overall fit.",
        risk_warnings: [],
      } as never,
    });
    vi.mocked(getVendor).mockResolvedValue({ id: "v_1", name: "Ace Plumbing" } as never);

    render(<WorkOrderDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Fix the leaky sink")).toBeInTheDocument();
    });
    expect(screen.getByText("Ace Plumbing")).toBeInTheDocument();
    expect(screen.getByText("$150.00")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fix the leaky sink" })).toHaveAttribute(
      "href",
      "/work-orders/wo_1"
    );
  });

  it("shows an empty state when there are no work orders", async () => {
    vi.mocked(listWorkOrders).mockResolvedValue([]);
    render(<WorkOrderDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("No work orders yet. Create one to get started.")).toBeInTheDocument();
    });
  });
});
