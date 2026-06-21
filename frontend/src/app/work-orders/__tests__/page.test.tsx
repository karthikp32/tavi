import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import WorkOrdersPage from "../page";
import { getWorkOrders } from "@/lib/api/work-orders";
import { getWorkOrderCandidates } from "@/lib/api/candidates";
import { getWorkOrderBids } from "@/lib/api/bids";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/work-orders",
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/api/work-orders", () => ({
  getWorkOrders: vi.fn(),
}));

vi.mock("@/lib/api/candidates", () => ({
  getWorkOrderCandidates: vi.fn(),
}));

vi.mock("@/lib/api/bids", () => ({
  getWorkOrderBids: vi.fn(),
}));

vi.mock("@/lib/api/facilities", () => ({
  getFacilities: vi.fn().mockResolvedValue([]),
  createFacility: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});

describe("WorkOrdersPage", () => {
  it("renders the work order dashboard shell with an empty state", async () => {
    vi.mocked(getWorkOrders).mockResolvedValue([]);

    render(<WorkOrdersPage />);
    expect(screen.getByRole("heading", { name: "Work Orders" })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("No work orders yet")).toBeInTheDocument();
    });
  });

  it("opens the new work order form in a modal immediately when clicked", async () => {
    vi.mocked(getWorkOrders).mockResolvedValue([]);

    render(<WorkOrdersPage />);
    await waitFor(() => {
      expect(screen.getByText("No work orders yet")).toBeInTheDocument();
    });

    expect(screen.queryByRole("dialog", { name: "New Work Order" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "New Work Order" }));

    expect(screen.getByRole("dialog", { name: "New Work Order" })).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("renders a fetched work order with derived bid and candidate counts, linking to its review page", async () => {
    vi.mocked(getWorkOrders).mockResolvedValue([
      {
        id: "wo_1",
        user_id: "user_1",
        company_id: null,
        facility_id: null,
        title: "Fix leaking sink",
        description: "Leak",
        trade: "Plumbing",
        task_type: null,
        status: "collecting_bids",
        requested_start_at: null,
        target_budget_cents: null,
        max_price_cents: null,
        bid_deadline_at: null,
        urgency: null,
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
    vi.mocked(getWorkOrderBids).mockResolvedValue([
      {
        id: "bid_1",
        work_order_id: "wo_1",
        work_order_candidate_id: "cand_1",
        amount_cents: 25000,
        arrival_window_start: null,
        arrival_window_end: null,
        scope_notes: null,
        status: "submitted",
        submitted_at: "2026-01-01T00:00:00Z",
        created_at: "2026-01-01T00:00:00Z",
      },
    ]);

    render(<WorkOrdersPage />);

    expect(await screen.findByRole("link", { name: "Fix leaking sink" })).toHaveAttribute(
      "href",
      "/work-orders/wo_1",
    );
    expect(screen.getByText("$250.00")).toBeInTheDocument();
  });
});
