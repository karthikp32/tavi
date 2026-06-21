import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BidDetailView } from "../BidDetailView";
import { getWorkOrder } from "@/lib/api/work-orders";
import { getWorkOrderBids } from "@/lib/api/bids";
import { getWorkOrderCandidate } from "@/lib/api/candidates";
import { getWorkOrderTimeline } from "@/lib/api/timeline";
import { getVendor } from "@/lib/api/vendors";

vi.mock("@/lib/api/work-orders", () => ({
  getWorkOrder: vi.fn(),
}));

vi.mock("@/lib/api/bids", () => ({
  getWorkOrderBids: vi.fn(),
}));

vi.mock("@/lib/api/candidates", () => ({
  getWorkOrderCandidate: vi.fn(),
}));

vi.mock("@/lib/api/timeline", () => ({
  getWorkOrderTimeline: vi.fn(),
}));

vi.mock("@/lib/api/vendors", () => ({
  getVendor: vi.fn(),
}));

const workOrder = {
  id: "wo_1",
  user_id: "user_1",
  company_id: null,
  facility_id: null,
  title: "Fix leaking sink",
  description: "Kitchen sink is leaking",
  trade: "Plumbing",
  task_type: null,
  status: "collecting_bids" as const,
  requested_start_at: null,
  target_budget_cents: 30000,
  max_price_cents: null,
  bid_deadline_at: null,
  urgency: null,
  bidding_mode: "private_negotiation" as const,
  required_arrival_window_start: null,
  required_arrival_window_end: null,
  selected_vendor_id: null,
  accepted_bid_id: null,
  accepted_price_cents: null,
  scheduled_start_at: null,
  confirmation_status: null,
  completed_vendor_quality_score: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const bid = {
  id: "bid_1",
  work_order_id: "wo_1",
  work_order_candidate_id: "cand_1",
  amount_cents: 25000,
  arrival_window_start: null,
  arrival_window_end: null,
  scope_notes: "Bring own parts",
  status: "submitted" as const,
  submitted_at: "2026-01-01T00:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
};

const candidate = {
  id: "cand_1",
  work_order_id: "wo_1",
  vendor_id: "vendor_1",
  status: "bid_submitted" as const,
  distance_miles: null,
  quoted_price_cents: null,
  available_start_at: null,
  available_end_at: null,
  last_contacted_at: null,
  next_action: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const vendor = {
  id: "vendor_1",
  company_id: null,
  name: "Acme Plumbing",
  trade: "Plumbing",
  phone: null,
  email: null,
  address: null,
  city: "New York",
  latitude: null,
  longitude: null,
  rating: 4.5,
  review_count: 10,
  license_status: "verified" as const,
  insurance_status: "verified" as const,
  quality_score: 0.9,
  availability_score: 0.7,
  risk_score: 0.1,
  score_evidence: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});

describe("BidDetailView", () => {
  it("renders bid details and a link to the vendor profile", async () => {
    vi.mocked(getWorkOrder).mockResolvedValue(workOrder);
    vi.mocked(getWorkOrderBids).mockResolvedValue([bid]);
    vi.mocked(getWorkOrderCandidate).mockResolvedValue(candidate);
    vi.mocked(getVendor).mockResolvedValue(vendor);
    vi.mocked(getWorkOrderTimeline).mockResolvedValue([
      {
        type: "communication_event",
        timestamp: "2026-01-01T00:00:00Z",
        data: {
          id: "event_1",
          work_order_id: "wo_1",
          work_order_candidate_id: "cand_1",
          channel: "email",
          direction: "outbound",
          actor_type: "human",
          actor_name: null,
          body: "Reaching out about the leak",
          metadata: null,
          created_at: "2026-01-01T00:00:00Z",
        },
      },
    ]);

    render(<BidDetailView workOrderId="wo_1" bidId="bid_1" />);

    expect(
      await screen.findByRole("heading", { name: "Bid for Fix leaking sink" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Acme Plumbing" })).toHaveAttribute(
      "href",
      "/vendors/vendor_1",
    );
    expect(screen.getByText("$250.00")).toBeInTheDocument();
    expect(screen.getByText(/Reaching out about the leak/)).toBeInTheDocument();
  });
});
