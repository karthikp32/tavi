import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WorkOrderReviewPage from "./page";
import { getTimeline, getVendor, getWorkOrder, listBids, listCandidates } from "@/lib/api-client";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "wo_1" }),
}));

vi.mock("@/lib/api-client", () => ({
  getWorkOrder: vi.fn(),
  listCandidates: vi.fn(),
  listBids: vi.fn(),
  getTimeline: vi.fn(),
  getVendor: vi.fn(),
}));

describe("WorkOrderReviewPage", () => {
  it("renders summary, candidates, timeline, bids, and the AI recommendation", async () => {
    vi.mocked(getWorkOrder).mockResolvedValue({
      id: "wo_1",
      title: "Fix the leaky sink",
      description: "Pipe under the sink is leaking.",
      status: "bidding",
      trade: "plumbing",
      target_budget_cents: 20000,
      bid_deadline_at: "2026-07-01T00:00:00Z",
      bidding_mode: "transparent_auction",
    } as never);
    vi.mocked(listCandidates).mockResolvedValue([
      { id: "cand_1", vendor_id: "v_1", status: "discovered" } as never,
    ]);
    vi.mocked(listBids).mockResolvedValue([
      { id: "bid_1", amount_cents: 15000, status: "submitted", work_order_candidate_id: "cand_1" } as never,
    ]);
    vi.mocked(getTimeline).mockResolvedValue({
      timeline: [
        {
          id: "t1",
          kind: "bid",
          created_at: "2026-06-20T00:00:00Z",
          data: { amount_cents: 15000 },
        } as never,
      ],
      recommendation: {
        recommended_candidate_id: "cand_1",
        best_price_candidate_id: "cand_1",
        best_quality_candidate_id: "cand_1",
        fastest_candidate_id: "cand_1",
        reason: "Best overall fit.",
        risk_warnings: ["Vendor has limited history."],
      } as never,
    });
    vi.mocked(getVendor).mockResolvedValue({ id: "v_1", name: "Ace Plumbing" } as never);

    render(<WorkOrderReviewPage />);

    await waitFor(() => {
      expect(screen.getByText("Fix the leaky sink")).toBeInTheDocument();
    });
    expect(screen.getAllByText("Ace Plumbing").length).toBeGreaterThan(0);
    expect(screen.getByText("Best overall fit.")).toBeInTheDocument();
    expect(screen.getByText("Vendor has limited history.")).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: "Ace Plumbing" });
    expect(links.some((link) => link.getAttribute("href") === "/vendors/v_1?workOrderId=wo_1")).toBe(
      true
    );
    expect(
      links.some((link) => link.getAttribute("href") === "/work-orders/wo_1/bids/bid_1")
    ).toBe(true);
  });
});
