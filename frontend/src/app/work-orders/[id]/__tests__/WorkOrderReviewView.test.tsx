import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { WorkOrderReviewView } from "../WorkOrderReviewView";
import { getWorkOrder } from "@/lib/api/work-orders";
import { getWorkOrderCandidates, contactWorkOrderCandidate } from "@/lib/api/candidates";
import { getWorkOrderBids } from "@/lib/api/bids";
import { getWorkOrderTimeline } from "@/lib/api/timeline";
import { getVendor } from "@/lib/api/vendors";

vi.mock("@/lib/api/work-orders", () => ({
  getWorkOrder: vi.fn(),
}));

vi.mock("@/lib/api/candidates", () => ({
  getWorkOrderCandidates: vi.fn(),
  contactWorkOrderCandidate: vi.fn(),
}));

vi.mock("@/lib/api/bids", () => ({
  getWorkOrderBids: vi.fn(),
}));

vi.mock("@/lib/api/timeline", () => ({
  getWorkOrderTimeline: vi.fn(),
}));

vi.mock("@/lib/api/vendors", () => ({
  getVendor: vi.fn(),
}));

const workOrder = {
  id: "wo_123",
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

const candidate = {
  id: "cand_1",
  work_order_id: "wo_123",
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

const bid = {
  id: "bid_1",
  work_order_id: "wo_123",
  work_order_candidate_id: "cand_1",
  amount_cents: 25000,
  arrival_window_start: null,
  arrival_window_end: null,
  scope_notes: null,
  status: "submitted" as const,
  submitted_at: "2026-01-01T00:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
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

describe("WorkOrderReviewView", () => {
  it("renders the work order title and command-center layout sections with bids and a recommendation", async () => {
    vi.mocked(getWorkOrder).mockResolvedValue(workOrder);
    vi.mocked(getWorkOrderCandidates).mockResolvedValue([candidate]);
    vi.mocked(getWorkOrderBids).mockResolvedValue([bid]);
    vi.mocked(getWorkOrderTimeline).mockResolvedValue([
      { type: "bid", timestamp: "2026-01-01T00:00:00Z", data: bid },
    ]);
    vi.mocked(getVendor).mockResolvedValue(vendor);

    render(<WorkOrderReviewView workOrderId="wo_123" />);

    expect(await screen.findByRole("heading", { name: "Fix leaking sink" })).toBeInTheDocument();
    expect(screen.getByText(/recommended winner is/i)).toBeInTheDocument();
    expect(screen.getAllByText("Acme Plumbing").length).toBeGreaterThan(0);
  });

  it("renders the facility name when the work order has a facility", async () => {
    vi.mocked(getWorkOrder).mockResolvedValue({
      ...workOrder,
      facility_id: "facility_1",
      facility: {
        id: "facility_1",
        user_id: "user_1",
        name: "Brooklyn Annex",
        address: "1 Pierrepont St",
        city: "New York",
        state: "NY",
        postal_code: "11201",
        latitude: null,
        longitude: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    });
    vi.mocked(getWorkOrderCandidates).mockResolvedValue([]);
    vi.mocked(getWorkOrderBids).mockResolvedValue([]);
    vi.mocked(getWorkOrderTimeline).mockResolvedValue([]);

    render(<WorkOrderReviewView workOrderId="wo_123" />);

    expect(await screen.findByRole("heading", { name: "Fix leaking sink" })).toBeInTheDocument();
    expect(screen.getByText("Brooklyn Annex")).toBeInTheDocument();
  });

  it("sends a text message to a candidate and renders the resulting communication event", async () => {
    vi.mocked(getWorkOrder).mockResolvedValue(workOrder);
    vi.mocked(getWorkOrderCandidates).mockResolvedValue([candidate]);
    vi.mocked(getWorkOrderBids).mockResolvedValue([]);
    vi.mocked(getWorkOrderTimeline).mockResolvedValue([]);
    vi.mocked(getVendor).mockResolvedValue(vendor);
    vi.mocked(contactWorkOrderCandidate).mockResolvedValue({
      id: "event_1",
      work_order_id: "wo_123",
      work_order_candidate_id: "cand_1",
      channel: "sms",
      direction: "outbound",
      actor_type: "human",
      actor_name: null,
      body: "Outreach via sms regarding work order.",
      metadata: null,
      created_at: "2026-01-01T00:00:00Z",
    });

    render(<WorkOrderReviewView workOrderId="wo_123" />);

    await screen.findByRole("heading", { name: "Fix leaking sink" });

    fireEvent.click(screen.getByRole("button", { name: /send text/i }));

    await waitFor(() => {
      expect(contactWorkOrderCandidate).toHaveBeenCalledWith("cand_1", {
        channel: "sms",
        body: "Outreach via sms regarding work order.",
      });
    });

    expect(await screen.findByText(/Logged sms \(outbound\)/)).toBeInTheDocument();
  });
});
