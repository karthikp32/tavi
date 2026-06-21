import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWorkOrder } from "../work-orders";
import { contactVendor, getVendors } from "../vendors";
import { contactWorkOrderCandidate } from "../candidates";
import { createWorkOrderBid } from "../bids";
import { getWorkOrderTimeline } from "../timeline";
import { createChatMessage } from "../chat";

function mockFetchOnce(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    text: async () => JSON.stringify(body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("api client request building", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts to /api/work-orders when creating a work order", async () => {
    const fetchMock = mockFetchOnce({ id: "wo_1" });

    await createWorkOrder({
      user_id: "user_1",
      company_id: null,
      facility_id: null,
      title: "Fix leak",
      description: "Kitchen sink leak",
      trade: "plumbing",
      task_type: null,
      requested_start_at: null,
      target_budget_cents: null,
      max_price_cents: null,
      bid_deadline_at: null,
      required_arrival_window_start: null,
      required_arrival_window_end: null,
      urgency: null,
      bidding_mode: null,
      selected_vendor_id: null,
      accepted_bid_id: null,
      accepted_price_cents: null,
      scheduled_start_at: null,
      confirmation_status: null,
      completed_vendor_quality_score: null,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/work-orders",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("builds a query string for vendor search filters", async () => {
    const fetchMock = mockFetchOnce([]);

    await getVendors({ city: "NYC", trade: "plumbing" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/vendors?city=NYC&trade=plumbing",
      expect.anything(),
    );
  });

  it("posts to the candidate contact endpoint with query params", async () => {
    const fetchMock = mockFetchOnce({});

    await contactWorkOrderCandidate("cand_1", { channel: "email", body: "hi" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/work-order-candidates/cand_1/contact?channel=email&body=hi",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("posts to the vendor contact endpoint with query params", async () => {
    const fetchMock = mockFetchOnce({});

    await contactVendor("vendor_1", {
      channel: "email",
      work_order_id: "wo_1",
      body: "hi",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/vendors/vendor_1/contact?channel=email&work_order_id=wo_1&body=hi",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("posts to the work order bids endpoint", async () => {
    const fetchMock = mockFetchOnce({ id: "bid_1" });

    await createWorkOrderBid("wo_1", {
      work_order_candidate_id: "cand_1",
      amount_cents: 25000,
      arrival_window_start: null,
      arrival_window_end: null,
      scope_notes: null,
      status: "submitted",
      submitted_at: "2026-06-20T00:00:00Z",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/work-orders/wo_1/bids",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("gets the work order timeline", async () => {
    const fetchMock = mockFetchOnce([]);

    await getWorkOrderTimeline("wo_1");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/work-orders/wo_1/timeline",
      expect.anything(),
    );
  });

  it("posts a chat message to a chat session", async () => {
    const fetchMock = mockFetchOnce({ id: "msg_1" });

    await createChatMessage("session_1", { role: "facility_manager", body: "hello" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/chat-sessions/session_1/messages",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws an ApiError when the response is not ok", async () => {
    mockFetchOnce({ detail: "not found" }, false);

    await expect(getVendors()).rejects.toMatchObject({ status: 500 });
  });
});
