import type {
  ActorType,
  AgentAction,
  Bid,
  ChatMessage,
  ChatSession,
  CommunicationEvent,
  Company,
  Facility,
  TimelineEntry,
  User,
  Vendor,
  VendorAvailabilityBlock,
  VendorTaskStats,
  WinnerRecommendation,
  WorkOrder,
  WorkOrderCandidate,
  WorkOrderState,
} from "@/types/models";

interface Store {
  companies: Company[];
  users: User[];
  facilities: Facility[];
  workOrders: WorkOrder[];
  workOrderStates: WorkOrderState[];
  vendors: Vendor[];
  vendorTaskStats: VendorTaskStats[];
  vendorAvailabilityBlocks: VendorAvailabilityBlock[];
  workOrderCandidates: WorkOrderCandidate[];
  communicationEvents: CommunicationEvent[];
  bids: Bid[];
  agentActions: AgentAction[];
  chatSessions: ChatSession[];
  chatMessages: ChatMessage[];
}

declare global {
  var __taviStore: Store | undefined;
}

function id(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

const CITY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  "New York": { lat: 40.7128, lng: -74.006 },
  "Los Angeles": { lat: 34.0522, lng: -118.2437 },
  Chicago: { lat: 41.8781, lng: -87.6298 },
};

function milesBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function buildSeed(): Store {
  const store: Store = {
    companies: [],
    users: [],
    facilities: [],
    workOrders: [],
    workOrderStates: [],
    vendors: [],
    vendorTaskStats: [],
    vendorAvailabilityBlocks: [],
    workOrderCandidates: [],
    communicationEvents: [],
    bids: [],
    agentActions: [],
    chatSessions: [],
    chatMessages: [],
  };

  const t = now();

  const fmCompany: Company = {
    id: id(),
    name: "Acme Facilities Group",
    company_type: "facility_manager",
    phone: "212-555-0100",
    email: "ops@acmefacilities.com",
    address: "350 5th Ave",
    city: "New York",
    state: "NY",
    postal_code: "10118",
    created_at: t,
    updated_at: t,
  };
  store.companies.push(fmCompany);

  const fmUser: User = {
    id: id(),
    company_id: fmCompany.id,
    name: "Jordan Lee",
    email: "jordan.lee@acmefacilities.com",
    user_type: "facility_manager",
    company_name: fmCompany.name,
    created_at: t,
  };
  store.users.push(fmUser);

  const facility: Facility = {
    id: id(),
    user_id: fmUser.id,
    name: "Acme HQ - Midtown",
    address: "350 5th Ave, New York, NY",
    city: "New York",
    state: "NY",
    postal_code: "10118",
    latitude: 40.7484,
    longitude: -73.9857,
    created_at: t,
    updated_at: t,
  };
  store.facilities.push(facility);

  const TRADES = [
    "plumbing",
    "electrical",
    "hvac",
    "lawncare",
    "cleaning",
    "general_maintenance",
  ] as const;

  const CITIES = ["New York", "Los Angeles", "Chicago"] as const;

  const VENDOR_NAMES = [
    "Rapid Response Plumbing",
    "Bright Spark Electric",
    "Cool Air HVAC Co",
    "Evergreen Lawn Care",
    "Sparkle Clean Services",
    "Metro Maintenance Crew",
    "Reliable Pipe Pros",
    "City Wide Electric",
    "Climate Control Experts",
    "Green Thumb Landscaping",
    "Crystal Clear Cleaning",
    "All Trades Maintenance",
  ];

  let nameIdx = 0;
  for (const city of CITIES) {
    for (const trade of TRADES) {
      const name = VENDOR_NAMES[nameIdx % VENDOR_NAMES.length] + ` - ${city}`;
      nameIdx += 1;
      const centroid = CITY_CENTROIDS[city];
      const vendor: Vendor = {
        id: id(),
        name,
        trade,
        phone: "555-010" + String(nameIdx % 10),
        email: `contact@${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.com`,
        address: `${100 + nameIdx} Main St`,
        city,
        latitude: centroid.lat + (Math.random() - 0.5) * 0.2,
        longitude: centroid.lng + (Math.random() - 0.5) * 0.2,
        rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
        review_count: Math.floor(20 + Math.random() * 200),
        license_status: Math.random() > 0.15 ? "verified" : "unverified",
        insurance_status: Math.random() > 0.15 ? "verified" : "unverified",
        quality_score: Math.round((0.55 + Math.random() * 0.4) * 100) / 100,
        availability_score: Math.round((0.4 + Math.random() * 0.55) * 100) / 100,
        risk_score: Math.round(Math.random() * 0.4 * 100) / 100,
        score_evidence: {
          rating_source: "mock_seed",
          notes: "Demo vendor seeded for hackathon walkthrough.",
        },
        created_at: t,
        updated_at: t,
      };
      store.vendors.push(vendor);

      // Task stats for the vendor's own trade, a generic task type, in its own city.
      const basePrice = 15000 + Math.floor(Math.random() * 40000);
      store.vendorTaskStats.push({
        id: id(),
        vendor_id: vendor.id,
        trade,
        task_type: "standard_service_call",
        city,
        completed_work_order_count: Math.floor(3 + Math.random() * 30),
        median_price_cents: basePrice,
        median_quality_score: vendor.quality_score ?? 0.7,
        created_at: t,
        updated_at: t,
      });

      const blockStart = new Date(Date.now() + 1000 * 60 * 60 * 24 * (1 + Math.floor(Math.random() * 5)));
      const blockEnd = new Date(blockStart.getTime() + 1000 * 60 * 60 * 4);
      store.vendorAvailabilityBlocks.push({
        id: id(),
        vendor_id: vendor.id,
        starts_at: blockStart.toISOString(),
        ends_at: blockEnd.toISOString(),
        city,
        created_at: t,
      });
    }
  }

  // Seed a fully fleshed work order with candidates, bids, and communication history.
  const plumbers = store.vendors.filter(
    (v) => v.trade === "plumbing" && v.city === "New York"
  );

  const wo: WorkOrder = {
    id: id(),
    user_id: fmUser.id,
    company_id: fmCompany.id,
    facility_id: facility.id,
    title: "Leaking pipe under kitchen sink",
    description:
      "Tenant reports a slow leak under the breakroom kitchen sink on the 4th floor. Needs inspection and repair.",
    trade: "plumbing",
    task_type: "standard_service_call",
    status: "collecting_bids",
    requested_start_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    target_budget_cents: 25000,
    max_price_cents: 40000,
    bid_deadline_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    urgency: "high",
    bidding_mode: "transparent_auction",
    access_instructions: "Check in at front desk, ask for facilities access badge.",
    license_required: true,
    insurance_required: true,
    created_at: t,
    updated_at: t,
  };
  store.workOrders.push(wo);
  store.workOrderStates.push(stateSnapshotFor(wo, "facility_manager", "Jordan Lee"));

  const candidateStatuses: WorkOrderCandidate["status"][] = [
    "bid_submitted",
    "bid_submitted",
    "interested",
  ];

  plumbers.slice(0, 3).forEach((vendor, idx) => {
    const candidate: WorkOrderCandidate = {
      id: id(),
      work_order_id: wo.id,
      vendor_id: vendor.id,
      status: candidateStatuses[idx],
      distance_miles: Math.round(Math.random() * 8 * 10) / 10,
      last_contacted_at: t,
      next_action:
        candidateStatuses[idx] === "bid_submitted"
          ? "Awaiting facility manager review"
          : "Follow up for bid",
      created_at: t,
      updated_at: t,
    };
    store.workOrderCandidates.push(candidate);

    store.communicationEvents.push({
      id: id(),
      work_order_id: wo.id,
      work_order_candidate_id: candidate.id,
      channel: "email",
      direction: "outbound",
      actor_type: "agent",
      actor_name: "Tavi Agent",
      body: `Hi ${vendor.name}, we have a plumbing job near your service area. Can you provide a quote?`,
      created_at: t,
    });

    store.communicationEvents.push({
      id: id(),
      work_order_id: wo.id,
      work_order_candidate_id: candidate.id,
      channel: "email",
      direction: "inbound",
      actor_type: "vendor",
      actor_name: vendor.name,
      body: "Sure, we can take a look. Sending a quote shortly.",
      created_at: t,
    });

    if (candidateStatuses[idx] === "bid_submitted") {
      const amount = 22000 + idx * 4000;
      candidate.quoted_price_cents = amount;
      store.bids.push({
        id: id(),
        work_order_id: wo.id,
        work_order_candidate_id: candidate.id,
        amount_cents: amount,
        arrival_window_start: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
        arrival_window_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 60 * 2).toISOString(),
        scope_notes: "Includes parts and labor, excludes drywall repair if needed.",
        status: "submitted",
        submitted_at: t,
        created_at: t,
      });
    }
  });

  return store;
}

function stateSnapshotFor(
  wo: WorkOrder,
  actor_type: ActorType,
  actor_name?: string
): WorkOrderState {
  return {
    id: id(),
    work_order_id: wo.id,
    status: wo.status,
    title: wo.title,
    description: wo.description,
    trade: wo.trade,
    task_type: wo.task_type,
    target_budget_cents: wo.target_budget_cents,
    max_price_cents: wo.max_price_cents,
    selected_vendor_id: wo.selected_vendor_id,
    accepted_bid_id: wo.accepted_bid_id,
    accepted_price_cents: wo.accepted_price_cents,
    scheduled_start_at: wo.scheduled_start_at,
    completed_vendor_quality_score: wo.completed_vendor_quality_score,
    actor_type,
    actor_name,
    created_at: now(),
  };
}

function getStore(): Store {
  if (!globalThis.__taviStore) {
    globalThis.__taviStore = buildSeed();
  }
  return globalThis.__taviStore;
}

// ---------- Work Orders ----------

export interface CreateWorkOrderInput {
  title: string;
  description: string;
  trade: string;
  task_type?: string | null;
  facility_id?: string | null;
  requested_start_at?: string | null;
  target_budget_cents?: number | null;
  urgency?: WorkOrder["urgency"];
  access_instructions?: string | null;
  license_required?: boolean | null;
  insurance_required?: boolean | null;
  qualification_criteria?: string | null;
  bidding_mode?: WorkOrder["bidding_mode"];
  max_price_cents?: number | null;
  bid_deadline_at?: string | null;
  arrival_window_start?: string | null;
  arrival_window_end?: string | null;
}

export function listWorkOrders(): WorkOrder[] {
  const store = getStore();
  return [...store.workOrders].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getWorkOrder(workOrderId: string): WorkOrder | undefined {
  return getStore().workOrders.find((w) => w.id === workOrderId);
}

export function createWorkOrder(input: CreateWorkOrderInput): WorkOrder {
  const store = getStore();
  const fmUser = store.users.find((u) => u.user_type === "facility_manager");
  const t = now();
  const wo: WorkOrder = {
    id: id(),
    user_id: fmUser?.id ?? id(),
    company_id: fmUser?.company_id ?? null,
    facility_id: input.facility_id ?? null,
    title: input.title,
    description: input.description,
    trade: input.trade,
    task_type: input.task_type ?? null,
    status: "ready_for_vendor_discovery",
    requested_start_at: input.requested_start_at ?? null,
    target_budget_cents: input.target_budget_cents ?? null,
    max_price_cents: input.max_price_cents ?? null,
    bid_deadline_at: input.bid_deadline_at ?? null,
    urgency: input.urgency ?? "normal",
    bidding_mode: input.bidding_mode ?? null,
    access_instructions: input.access_instructions ?? null,
    license_required: input.license_required ?? null,
    insurance_required: input.insurance_required ?? null,
    qualification_criteria: input.qualification_criteria ?? null,
    arrival_window_start: input.arrival_window_start ?? null,
    arrival_window_end: input.arrival_window_end ?? null,
    created_at: t,
    updated_at: t,
  };
  store.workOrders.push(wo);
  store.workOrderStates.push(stateSnapshotFor(wo, "facility_manager", fmUser?.name));
  return wo;
}

const SNAPSHOT_FIELDS: (keyof WorkOrder)[] = [
  "status",
  "selected_vendor_id",
  "accepted_bid_id",
  "accepted_price_cents",
  "scheduled_start_at",
  "confirmation_status",
  "completed_vendor_quality_score",
];

export function updateWorkOrder(
  workOrderId: string,
  patch: Partial<WorkOrder>,
  actor: { actor_type: ActorType; actor_name?: string } = {
    actor_type: "facility_manager",
  }
): WorkOrder | undefined {
  const store = getStore();
  const wo = store.workOrders.find((w) => w.id === workOrderId);
  if (!wo) return undefined;

  const meaningfulChange = SNAPSHOT_FIELDS.some(
    (field) => field in patch && patch[field] !== wo[field]
  );

  Object.assign(wo, patch, { updated_at: now() });

  if (meaningfulChange) {
    store.workOrderStates.push(
      stateSnapshotFor(wo, actor.actor_type, actor.actor_name)
    );
  }

  return wo;
}

export function listWorkOrderStates(workOrderId: string): WorkOrderState[] {
  return getStore()
    .workOrderStates.filter((s) => s.work_order_id === workOrderId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

// ---------- Vendors ----------

export interface VendorSearchFilters {
  city?: string;
  trade?: string;
  minRating?: number;
  minReviewCount?: number;
  licenseStatus?: string;
  insuranceStatus?: string;
  minQualityScore?: number;
  minAvailabilityScore?: number;
  maxRiskScore?: number;
  maxDistanceMiles?: number;
  taskType?: string;
}

export function getVendor(vendorId: string): Vendor | undefined {
  return getStore().vendors.find((v) => v.id === vendorId);
}

export function priceFitForVendor(
  vendorId: string,
  trade: string,
  taskType: string | undefined,
  city: string,
  targetBudgetCents?: number | null
): number | null {
  const stats = getStore().vendorTaskStats.find(
    (s) =>
      s.vendor_id === vendorId &&
      s.trade === trade &&
      s.city === city &&
      (taskType ? s.task_type === taskType : true)
  );
  if (!stats) return null;
  if (!targetBudgetCents) {
    // Without a target, fall back to a quality-led score.
    return Math.round(stats.median_quality_score * 100);
  }
  const priceRatio = stats.median_price_cents / targetBudgetCents;
  // Reward prices near or under budget, penalize far-over-budget vendors.
  const priceComponent = Math.max(0, 1 - Math.max(0, priceRatio - 1) * 1.5) * 0.6;
  const qualityComponent = stats.median_quality_score * 0.4;
  return Math.round((priceComponent + qualityComponent) * 100);
}

export function searchVendors(filters: VendorSearchFilters): Vendor[] {
  const store = getStore();
  let results = [...store.vendors];

  if (filters.city) results = results.filter((v) => v.city === filters.city);
  if (filters.trade) results = results.filter((v) => v.trade === filters.trade);
  if (filters.minRating != null)
    results = results.filter((v) => (v.rating ?? 0) >= filters.minRating!);
  if (filters.minReviewCount != null)
    results = results.filter((v) => (v.review_count ?? 0) >= filters.minReviewCount!);
  if (filters.licenseStatus)
    results = results.filter((v) => v.license_status === filters.licenseStatus);
  if (filters.insuranceStatus)
    results = results.filter((v) => v.insurance_status === filters.insuranceStatus);
  if (filters.minQualityScore != null)
    results = results.filter((v) => (v.quality_score ?? 0) >= filters.minQualityScore!);
  if (filters.minAvailabilityScore != null)
    results = results.filter(
      (v) => (v.availability_score ?? 0) >= filters.minAvailabilityScore!
    );
  if (filters.maxRiskScore != null)
    results = results.filter((v) => (v.risk_score ?? 1) <= filters.maxRiskScore!);

  if (filters.maxDistanceMiles != null && filters.city) {
    const centroid = CITY_CENTROIDS[filters.city];
    if (centroid) {
      results = results.filter((v) => {
        if (v.latitude == null || v.longitude == null) return true;
        const d = milesBetween(centroid, { lat: v.latitude, lng: v.longitude });
        return d <= filters.maxDistanceMiles!;
      });
    }
  }

  return results;
}

// ---------- Candidates ----------

export function listCandidates(workOrderId: string): WorkOrderCandidate[] {
  return getStore().workOrderCandidates.filter((c) => c.work_order_id === workOrderId);
}

export function getCandidate(candidateId: string): WorkOrderCandidate | undefined {
  return getStore().workOrderCandidates.find((c) => c.id === candidateId);
}

export function createCandidate(
  workOrderId: string,
  vendorId: string
): WorkOrderCandidate {
  const store = getStore();
  const existing = store.workOrderCandidates.find(
    (c) => c.work_order_id === workOrderId && c.vendor_id === vendorId
  );
  if (existing) return existing;

  const t = now();
  const candidate: WorkOrderCandidate = {
    id: id(),
    work_order_id: workOrderId,
    vendor_id: vendorId,
    status: "discovered",
    created_at: t,
    updated_at: t,
  };
  store.workOrderCandidates.push(candidate);
  return candidate;
}

export function updateCandidate(
  candidateId: string,
  patch: Partial<WorkOrderCandidate>
): WorkOrderCandidate | undefined {
  const store = getStore();
  const candidate = store.workOrderCandidates.find((c) => c.id === candidateId);
  if (!candidate) return undefined;
  Object.assign(candidate, patch, { updated_at: now() });
  return candidate;
}

// ---------- Communication ----------

export interface ContactInput {
  channel: import("@/types/models").Channel;
  body: string;
  actor_type?: ActorType;
  actor_name?: string;
  direction?: import("@/types/models").Direction;
}

export function contactVendorForWorkOrder(
  vendorId: string,
  workOrderId: string,
  input: ContactInput
): { candidate: WorkOrderCandidate; event: CommunicationEvent } {
  const candidate = createCandidate(workOrderId, vendorId);
  const event = recordCommunicationEvent(workOrderId, candidate.id, input);
  updateCandidate(candidate.id, {
    last_contacted_at: event.created_at,
    next_action: "Awaiting vendor response",
    status: candidate.status === "discovered" ? "contacted" : candidate.status,
  });
  return { candidate, event };
}

export function contactCandidate(
  candidateId: string,
  input: ContactInput
): CommunicationEvent | undefined {
  const candidate = getCandidate(candidateId);
  if (!candidate) return undefined;
  const event = recordCommunicationEvent(candidate.work_order_id, candidate.id, input);
  updateCandidate(candidateId, {
    last_contacted_at: event.created_at,
    next_action: "Awaiting vendor response",
    status: candidate.status === "discovered" ? "contacted" : candidate.status,
  });
  return event;
}

export function addCandidateMessage(
  candidateId: string,
  input: ContactInput
): CommunicationEvent | undefined {
  const candidate = getCandidate(candidateId);
  if (!candidate) return undefined;
  return recordCommunicationEvent(candidate.work_order_id, candidate.id, input);
}

function recordCommunicationEvent(
  workOrderId: string,
  candidateId: string | null,
  input: ContactInput
): CommunicationEvent {
  const store = getStore();
  const event: CommunicationEvent = {
    id: id(),
    work_order_id: workOrderId,
    work_order_candidate_id: candidateId,
    channel: input.channel,
    direction: input.direction ?? "outbound",
    actor_type: input.actor_type ?? "facility_manager",
    actor_name: input.actor_name,
    body: input.body,
    created_at: now(),
  };
  store.communicationEvents.push(event);
  return event;
}

export function listCommunicationEvents(workOrderId: string): CommunicationEvent[] {
  return getStore().communicationEvents.filter((e) => e.work_order_id === workOrderId);
}

// ---------- Bids ----------

export interface CreateBidInput {
  work_order_candidate_id: string;
  amount_cents: number;
  arrival_window_start?: string | null;
  arrival_window_end?: string | null;
  scope_notes?: string | null;
}

export function listBids(workOrderId: string): Bid[] {
  return getStore().bids.filter((b) => b.work_order_id === workOrderId);
}

export function getBid(bidId: string): Bid | undefined {
  return getStore().bids.find((b) => b.id === bidId);
}

export function createBid(workOrderId: string, input: CreateBidInput): Bid {
  const store = getStore();
  const t = now();
  const bid: Bid = {
    id: id(),
    work_order_id: workOrderId,
    work_order_candidate_id: input.work_order_candidate_id,
    amount_cents: input.amount_cents,
    arrival_window_start: input.arrival_window_start ?? null,
    arrival_window_end: input.arrival_window_end ?? null,
    scope_notes: input.scope_notes ?? null,
    status: "submitted",
    submitted_at: t,
    created_at: t,
  };
  store.bids.push(bid);
  updateCandidate(input.work_order_candidate_id, {
    status: "bid_submitted",
    quoted_price_cents: bid.amount_cents,
  });
  return bid;
}

export function updateBid(bidId: string, patch: Partial<Bid>): Bid | undefined {
  const store = getStore();
  const bid = store.bids.find((b) => b.id === bidId);
  if (!bid) return undefined;
  Object.assign(bid, patch);
  return bid;
}

// ---------- Timeline ----------

export function getTimeline(workOrderId: string): TimelineEntry[] {
  const store = getStore();
  const entries: TimelineEntry[] = [];

  for (const e of store.communicationEvents.filter((e) => e.work_order_id === workOrderId)) {
    entries.push({ id: e.id, kind: "communication_event", created_at: e.created_at, data: e });
  }
  for (const b of store.bids.filter((b) => b.work_order_id === workOrderId)) {
    entries.push({ id: b.id, kind: "bid", created_at: b.created_at, data: b });
  }
  for (const s of store.workOrderStates.filter((s) => s.work_order_id === workOrderId)) {
    entries.push({ id: s.id, kind: "work_order_state", created_at: s.created_at, data: s });
  }

  return entries.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

// ---------- Winner recommendation (heuristic stand-in for the LLM summary) ----------

export function recommendWinner(workOrderId: string): WinnerRecommendation {
  const wo = getWorkOrder(workOrderId);
  const candidates = listCandidates(workOrderId);
  const bids = listBids(workOrderId);

  const scored = bids
    .map((bid) => {
      const candidate = candidates.find((c) => c.id === bid.work_order_candidate_id);
      const vendor = candidate ? getVendor(candidate.vendor_id) : undefined;
      if (!candidate || !vendor) return null;

      const budget = wo?.target_budget_cents ?? bid.amount_cents;
      const priceScore = Math.max(0, 1 - Math.max(0, bid.amount_cents - budget) / budget);
      const qualityScore = vendor.quality_score ?? 0.5;
      const riskPenalty = vendor.risk_score ?? 0;
      const availabilityScore = vendor.availability_score ?? 0.5;

      const overall =
        priceScore * 0.35 + qualityScore * 0.35 + availabilityScore * 0.15 - riskPenalty * 0.15;

      return { bid, candidate, vendor, priceScore, qualityScore, availabilityScore, overall };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (scored.length === 0) {
    return {
      recommended_candidate_id: null,
      reason: "No bids have been submitted yet.",
      best_price_candidate_id: null,
      best_quality_candidate_id: null,
      fastest_candidate_id: null,
      risk_warnings: [],
    };
  }

  const recommended = [...scored].sort((a, b) => b.overall - a.overall)[0];
  const bestPrice = [...scored].sort((a, b) => a.bid.amount_cents - b.bid.amount_cents)[0];
  const bestQuality = [...scored].sort(
    (a, b) => (b.vendor.quality_score ?? 0) - (a.vendor.quality_score ?? 0)
  )[0];
  const fastest = [...scored].sort((a, b) => {
    const aStart = a.bid.arrival_window_start ?? "9999";
    const bStart = b.bid.arrival_window_start ?? "9999";
    return aStart.localeCompare(bStart);
  })[0];

  const riskWarnings = scored
    .filter((s) => (s.vendor.risk_score ?? 0) > 0.3)
    .map((s) => `${s.vendor.name} has an elevated risk score (${s.vendor.risk_score}).`);

  return {
    recommended_candidate_id: recommended.candidate.id,
    reason: `${recommended.vendor.name} offers the strongest balance of price ($${(
      recommended.bid.amount_cents / 100
    ).toFixed(2)}), quality (${recommended.vendor.quality_score}), and availability among current bidders.`,
    best_price_candidate_id: bestPrice.candidate.id,
    best_quality_candidate_id: bestQuality.candidate.id,
    fastest_candidate_id: fastest.candidate.id,
    risk_warnings: riskWarnings,
  };
}

// ---------- Chat sessions / messages ----------

export function createChatSession(userId?: string, workOrderId?: string | null): ChatSession {
  const store = getStore();
  const fmUser = store.users.find((u) => u.user_type === "facility_manager");
  const t = now();
  const session: ChatSession = {
    id: id(),
    user_id: userId ?? fmUser?.id ?? id(),
    work_order_id: workOrderId ?? null,
    status: "active",
    created_at: t,
    updated_at: t,
  };
  store.chatSessions.push(session);
  return session;
}

export function getChatSession(sessionId: string): ChatSession | undefined {
  return getStore().chatSessions.find((s) => s.id === sessionId);
}

export function listChatMessages(sessionId: string): ChatMessage[] {
  return getStore()
    .chatMessages.filter((m) => m.chat_session_id === sessionId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function addChatMessage(
  sessionId: string,
  role: ChatMessage["role"],
  body: string,
  extractedFields?: Record<string, unknown> | null
): ChatMessage {
  const store = getStore();
  const message: ChatMessage = {
    id: id(),
    chat_session_id: sessionId,
    role,
    body,
    extracted_fields: extractedFields ?? null,
    created_at: now(),
  };
  store.chatMessages.push(message);
  const session = store.chatSessions.find((s) => s.id === sessionId);
  if (session) session.updated_at = now();
  return message;
}

export function linkChatSessionToWorkOrder(sessionId: string, workOrderId: string) {
  const session = getStore().chatSessions.find((s) => s.id === sessionId);
  if (session) session.work_order_id = workOrderId;
}

export const __testing__ = { getStore, buildSeed };
