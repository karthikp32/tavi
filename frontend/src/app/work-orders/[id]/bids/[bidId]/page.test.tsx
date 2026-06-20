import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BidDetailPage from "./page";
import {
  getBid,
  getCandidate,
  getTimeline,
  getVendor,
  getWorkOrder,
} from "@/lib/api-client";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "wo_1", bidId: "bid_1" }),
}));

vi.mock("@/lib/api-client", () => ({
  getWorkOrder: vi.fn(),
  getBid: vi.fn(),
  getCandidate: vi.fn(),
  getVendor: vi.fn(),
  getTimeline: vi.fn(),
}));

describe("BidDetailPage", () => {
  it("renders bid, vendor, and AI notes, and links back to the vendor profile", async () => {
    vi.mocked(getWorkOrder).mockResolvedValue({
      id: "wo_1",
      title: "Fix the leaky sink",
      description: "Pipe under the sink is leaking.",
      target_budget_cents: 10000,
    } as never);
    vi.mocked(getBid).mockResolvedValue({
      id: "bid_1",
      work_order_candidate_id: "cand_1",
      amount_cents: 15000,
      status: "submitted",
      arrival_window_start: "2026-07-01T09:00:00Z",
      arrival_window_end: "2026-07-01T11:00:00Z",
      scope_notes: "Will bring extra fittings.",
    } as never);
    vi.mocked(getCandidate).mockResolvedValue({ id: "cand_1", vendor_id: "v_1" } as never);
    vi.mocked(getVendor).mockResolvedValue({
      id: "v_1",
      name: "Ace Plumbing",
      quality_score: 0.9,
      risk_score: 0.5,
    } as never);
    vi.mocked(getTimeline).mockResolvedValue({
      timeline: [
        {
          id: "t1",
          kind: "communication_event",
          created_at: "2026-06-20T00:00:00Z",
          data: {
            id: "evt_1",
            work_order_candidate_id: "cand_1",
            actor_type: "vendor",
            actor_name: "Ace Plumbing",
            channel: "email",
            body: "We can do this job tomorrow.",
            created_at: "2026-06-20T00:00:00Z",
          },
        } as never,
      ],
      recommendation: {} as never,
    });

    render(<BidDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Fix the leaky sink")).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "Ace Plumbing" })).toHaveAttribute(
      "href",
      "/vendors/v_1?workOrderId=wo_1"
    );
    expect(screen.getByText(/over the target budget/)).toBeInTheDocument();
    expect(screen.getByText(/Risk score is elevated/)).toBeInTheDocument();
    expect(screen.getByText(/We can do this job tomorrow\./)).toBeInTheDocument();
  });
});
