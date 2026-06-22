import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import VendorMarketplacePage from "../page";
import { getWorkOrders } from "@/lib/api/work-orders";
import { getWorkOrderBids } from "@/lib/api/bids";

vi.mock("next/navigation", () => ({
  usePathname: () => "/vendor/marketplace",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/api/work-orders", () => ({
  getWorkOrders: vi.fn(),
}));

vi.mock("@/lib/api/bids", () => ({
  getWorkOrderBids: vi.fn(),
}));

afterEach(() => {
  document.cookie = "tavi_session=; path=/; max-age=0";
  vi.clearAllMocks();
  cleanup();
});

describe("VendorMarketplacePage", () => {
  it("renders marketplace work orders without embedding the Tavi chat", async () => {
    document.cookie = `tavi_session=${encodeURIComponent(
      JSON.stringify({
        id: "vendor_1",
        type: "vendor",
        name: "Acme HVAC",
        trade: "HVAC",
        company_id: "company_1",
      }),
    )}; path=/`;
    vi.mocked(getWorkOrders).mockResolvedValue([]);
    vi.mocked(getWorkOrderBids).mockResolvedValue([]);

    render(<VendorMarketplacePage />);

    expect(screen.getByRole("heading", { name: "Marketplace" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tavi Agent" })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("No work orders right now")).toBeInTheDocument();
    });
  });

  it("shows the current vendor's agent-submitted bid status", async () => {
    document.cookie = `tavi_session=${encodeURIComponent(
      JSON.stringify({
        id: "vendor_db_electric",
        type: "vendor",
        name: "DB Electric",
        trade: "Electrical",
        company_id: "company_1",
      }),
    )}; path=/`;
    vi.mocked(getWorkOrders).mockResolvedValue([
      {
        id: "wo_panel_label_audit",
        user_id: "fm_1",
        company_id: "company_fm",
        facility_id: null,
        title: "Panel label audit",
        description: "Audit electrical panel labels",
        trade: "Electrical",
        task_type: null,
        status: "draft",
        requested_start_at: null,
        target_budget_cents: 16000,
        max_price_cents: null,
        bid_deadline_at: null,
        urgency: "low",
        bidding_mode: "private_negotiation",
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
        facility: null,
      },
    ]);
    vi.mocked(getWorkOrderBids).mockResolvedValue([
      {
        id: "bid_1",
        work_order_id: "wo_panel_label_audit",
        work_order_candidate_id: "candidate_1",
        amount_cents: 15000,
        arrival_window_start: null,
        arrival_window_end: null,
        scope_notes: null,
        status: "submitted",
        submitted_at: "2026-01-01T00:00:00Z",
        created_at: "2026-01-01T00:00:00Z",
        candidate: {
          vendor_id: "vendor_db_electric",
          status: "bid_submitted",
        },
      },
    ]);

    render(<VendorMarketplacePage />);

    expect(await screen.findByText("Panel label audit")).toBeInTheDocument();
    expect(screen.getByText("Submitted · $150.00")).toBeInTheDocument();
    expect(screen.getByText("You have the lowest bid")).toBeInTheDocument();
  });
});
