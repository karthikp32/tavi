import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { VendorProfileView } from "../VendorProfileView";
import { getVendor, contactVendor } from "@/lib/api/vendors";
import { getWorkOrders } from "@/lib/api/work-orders";
import { getWorkOrderCandidates } from "@/lib/api/candidates";

vi.mock("@/lib/api/vendors", () => ({
  getVendor: vi.fn(),
  contactVendor: vi.fn(),
}));

vi.mock("@/lib/api/work-orders", () => ({
  getWorkOrders: vi.fn(),
}));

vi.mock("@/lib/api/candidates", () => ({
  getWorkOrderCandidates: vi.fn(),
  contactWorkOrderCandidate: vi.fn(),
}));

const vendor = {
  id: "vendor_1",
  company_id: null,
  name: "Acme Plumbing",
  trade: "Plumbing",
  phone: "555-0100",
  email: "hello@acme.test",
  address: null,
  city: "New York",
  latitude: null,
  longitude: null,
  rating: 4.5,
  review_count: 10,
  license_status: "verified" as const,
  insurance_status: "verified" as const,
  quality_score: 0.8,
  availability_score: 0.6,
  risk_score: 0.2,
  score_evidence: { completed_jobs: 12 },
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});

describe("VendorProfileView", () => {
  it("renders the vendor name and scores once loaded", async () => {
    vi.mocked(getVendor).mockResolvedValue(vendor);
    vi.mocked(getWorkOrders).mockResolvedValue([]);

    render(<VendorProfileView vendorId="vendor_1" />);

    expect(await screen.findByRole("heading", { name: "Acme Plumbing" })).toBeInTheDocument();
    expect(screen.getByText(/4.5/)).toBeInTheDocument();
  });

  it("sends a contact request and renders the resulting communication event", async () => {
    vi.mocked(getVendor).mockResolvedValue(vendor);
    vi.mocked(getWorkOrders).mockResolvedValue([]);
    vi.mocked(contactVendor).mockResolvedValue({
      id: "event_1",
      work_order_id: "wo_1",
      work_order_candidate_id: null,
      channel: "email",
      direction: "outbound",
      actor_type: "human",
      actor_name: "Facility Manager",
      body: "Outreach via email regarding work order.",
      metadata: null,
      created_at: "2026-01-01T00:00:00Z",
    });

    render(<VendorProfileView vendorId="vendor_1" />);
    await screen.findByRole("heading", { name: "Acme Plumbing" });

    fireEvent.click(screen.getByRole("button", { name: /send email/i }));

    await waitFor(() => {
      expect(contactVendor).toHaveBeenCalledWith("vendor_1", {
        channel: "email",
        work_order_id: "",
        body: "Outreach via email regarding work order.",
      });
    });

    expect(await screen.findByText(/Logged email \(outbound\)/)).toBeInTheDocument();
  });

  it("uses the candidate contact endpoint when a matching candidate exists for the selected work order", async () => {
    vi.mocked(getVendor).mockResolvedValue(vendor);
    vi.mocked(getWorkOrders).mockResolvedValue([
      {
        id: "wo_1",
        user_id: "user_1",
        company_id: null,
        facility_id: null,
        title: "Fix leak",
        description: "Leak",
        trade: "Plumbing",
        task_type: null,
        status: "collecting_bids",
        requested_start_at: null,
        target_budget_cents: null,
        max_price_cents: null,
        bid_deadline_at: null,
        urgency: null,
        bidding_mode: null,
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
      },
    ]);
    vi.mocked(getWorkOrderCandidates).mockResolvedValue([
      {
        id: "cand_1",
        work_order_id: "wo_1",
        vendor_id: "vendor_1",
        status: "contacted",
        distance_miles: null,
        quoted_price_cents: null,
        available_start_at: null,
        available_end_at: null,
        last_contacted_at: null,
        next_action: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ]);

    const { contactWorkOrderCandidate } = await import("@/lib/api/candidates");
    vi.mocked(contactWorkOrderCandidate).mockResolvedValue({
      id: "event_1",
      work_order_id: "wo_1",
      work_order_candidate_id: "cand_1",
      channel: "sms",
      direction: "outbound",
      actor_type: "human",
      actor_name: null,
      body: "Outreach via sms regarding work order.",
      metadata: null,
      created_at: "2026-01-01T00:00:00Z",
    });

    render(<VendorProfileView vendorId="vendor_1" initialWorkOrderId="wo_1" />);
    await screen.findByRole("heading", { name: "Acme Plumbing" });

    await waitFor(() => {
      expect(screen.getByText(/Candidate status:/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /send text/i }));

    await waitFor(() => {
      expect(contactWorkOrderCandidate).toHaveBeenCalledWith("cand_1", {
        channel: "sms",
        body: "Outreach via sms regarding work order.",
      });
    });
  });
});
