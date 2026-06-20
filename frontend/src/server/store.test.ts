import { describe, it, expect, beforeEach } from "vitest";
import {
  createWorkOrder,
  updateWorkOrder,
  listWorkOrderStates,
  createCandidate,
  searchVendors,
  listCandidates,
  contactCandidate,
  createBid,
  getTimeline,
  recommendWinner,
  __testing__,
} from "./store";

beforeEach(() => {
  // Reset the singleton so each test starts from a fresh seed.
  globalThis.__taviStore = undefined;
});

describe("work orders", () => {
  it("creates a work order with an initial state snapshot", () => {
    const wo = createWorkOrder({
      title: "Fix leaky faucet",
      description: "Kitchen faucet is dripping",
      trade: "plumbing",
    });
    expect(wo.status).toBe("ready_for_vendor_discovery");
    const states = listWorkOrderStates(wo.id);
    expect(states).toHaveLength(1);
    expect(states[0].status).toBe("ready_for_vendor_discovery");
  });

  it("inserts a new state snapshot when status changes", () => {
    const wo = createWorkOrder({
      title: "Fix leaky faucet",
      description: "Kitchen faucet is dripping",
      trade: "plumbing",
    });
    updateWorkOrder(wo.id, { status: "discovering_vendors" });
    const states = listWorkOrderStates(wo.id);
    expect(states).toHaveLength(2);
    expect(states[1].status).toBe("discovering_vendors");
  });

  it("does not insert a snapshot for non-meaningful field changes", () => {
    const wo = createWorkOrder({
      title: "Fix leaky faucet",
      description: "Kitchen faucet is dripping",
      trade: "plumbing",
    });
    updateWorkOrder(wo.id, { description: "Updated description only" });
    const states = listWorkOrderStates(wo.id);
    expect(states).toHaveLength(1);
  });

  it("inserts a snapshot when award fields change even if status stays the same", () => {
    const wo = createWorkOrder({
      title: "Fix leaky faucet",
      description: "Kitchen faucet is dripping",
      trade: "plumbing",
    });
    updateWorkOrder(wo.id, { selected_vendor_id: "vendor-123" });
    const states = listWorkOrderStates(wo.id);
    expect(states).toHaveLength(2);
    expect(states[1].selected_vendor_id).toBe("vendor-123");
  });
});

describe("candidates", () => {
  it("is idempotent for the same work order/vendor pair", () => {
    const wo = createWorkOrder({
      title: "Fix leaky faucet",
      description: "Kitchen faucet is dripping",
      trade: "plumbing",
    });
    const vendors = searchVendors({ trade: "plumbing" });
    const vendorId = vendors[0].id;

    const c1 = createCandidate(wo.id, vendorId);
    const c2 = createCandidate(wo.id, vendorId);

    expect(c1.id).toBe(c2.id);
    expect(listCandidates(wo.id)).toHaveLength(1);
  });
});

describe("vendor search", () => {
  it("filters by city and trade", () => {
    const results = searchVendors({ city: "Chicago", trade: "hvac" });
    expect(results.length).toBeGreaterThan(0);
    for (const v of results) {
      expect(v.city).toBe("Chicago");
      expect(v.trade).toBe("hvac");
    }
  });
});

describe("contact + bids + timeline", () => {
  it("contacting a candidate writes a communication event", () => {
    const wo = createWorkOrder({
      title: "Fix leaky faucet",
      description: "Kitchen faucet is dripping",
      trade: "plumbing",
    });
    const vendorId = searchVendors({ trade: "plumbing" })[0].id;
    const candidate = createCandidate(wo.id, vendorId);

    const event = contactCandidate(candidate.id, {
      channel: "email",
      body: "Are you available for this job?",
    });

    expect(event).toBeDefined();
    expect(event?.work_order_candidate_id).toBe(candidate.id);
  });

  it("returns combined chronological timeline of comms, bids, and states", () => {
    const wo = createWorkOrder({
      title: "Fix leaky faucet",
      description: "Kitchen faucet is dripping",
      trade: "plumbing",
      target_budget_cents: 20000,
    });
    const vendorId = searchVendors({ trade: "plumbing" })[0].id;
    const candidate = createCandidate(wo.id, vendorId);
    contactCandidate(candidate.id, { channel: "email", body: "Quote please" });
    createBid(wo.id, { work_order_candidate_id: candidate.id, amount_cents: 18000 });
    updateWorkOrder(wo.id, { status: "ready_for_award" });

    const timeline = getTimeline(wo.id);
    const kinds = timeline.map((e) => e.kind);
    expect(kinds).toContain("communication_event");
    expect(kinds).toContain("bid");
    expect(kinds).toContain("work_order_state");

    for (let i = 1; i < timeline.length; i++) {
      expect(timeline[i].created_at >= timeline[i - 1].created_at).toBe(true);
    }
  });

  it("recommends a winner once bids exist", () => {
    const wo = createWorkOrder({
      title: "Fix leaky faucet",
      description: "Kitchen faucet is dripping",
      trade: "plumbing",
      target_budget_cents: 20000,
    });
    const vendors = searchVendors({ trade: "plumbing" }).slice(0, 2);
    const candidates = vendors.map((v) => createCandidate(wo.id, v.id));
    createBid(wo.id, { work_order_candidate_id: candidates[0].id, amount_cents: 19000 });
    createBid(wo.id, { work_order_candidate_id: candidates[1].id, amount_cents: 25000 });

    const recommendation = recommendWinner(wo.id);
    expect(recommendation.recommended_candidate_id).not.toBeNull();
    expect(recommendation.best_price_candidate_id).toBe(candidates[0].id);
  });
});

void __testing__;
