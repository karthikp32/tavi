import type {
  Bid,
  ChatMessage,
  ChatMessageRole,
  ChatSession,
  CommunicationEvent,
  TimelineEntry,
  Vendor,
  WinnerRecommendation,
  WorkOrder,
  WorkOrderCandidate,
  WorkOrderState,
} from "@/types/models";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "Request failed", res.status);
  }

  return res.json() as Promise<T>;
}

function qs(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : "";
}

// ---------- Work Orders ----------

export interface CreateWorkOrderPayload {
  title: string;
  description: string;
  trade: string;
  task_type?: string;
  facility_id?: string;
  requested_start_at?: string;
  target_budget_cents?: number;
  urgency?: WorkOrder["urgency"];
  access_instructions?: string;
  license_required?: boolean;
  insurance_required?: boolean;
  qualification_criteria?: string;
  bidding_mode?: WorkOrder["bidding_mode"];
  max_price_cents?: number;
  bid_deadline_at?: string;
  arrival_window_start?: string;
  arrival_window_end?: string;
}

export function listWorkOrders(): Promise<WorkOrder[]> {
  return request("/api/work-orders");
}

export function getWorkOrder(id: string): Promise<WorkOrder> {
  return request(`/api/work-orders/${id}`);
}

export function createWorkOrder(payload: CreateWorkOrderPayload): Promise<WorkOrder> {
  return request("/api/work-orders", { method: "POST", body: JSON.stringify(payload) });
}

export function updateWorkOrder(id: string, patch: Partial<WorkOrder>): Promise<WorkOrder> {
  return request(`/api/work-orders/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

// ---------- Vendors ----------

export interface VendorSearchParams {
  city?: string;
  trade?: string;
  min_rating?: number;
  min_review_count?: number;
  license_status?: string;
  insurance_status?: string;
  min_quality_score?: number;
  min_availability_score?: number;
  max_risk_score?: number;
  max_distance_miles?: number;
  task_type?: string;
  target_budget_cents?: number;
  min_price_fit?: number;
}

export type VendorWithPriceFit = Vendor & { price_fit: number | null };

export function searchVendors(params: VendorSearchParams = {}): Promise<VendorWithPriceFit[]> {
  return request(`/api/vendors${qs(params)}`);
}

export function getVendor(
  id: string,
  params: { trade?: string; task_type?: string; target_budget_cents?: number } = {}
): Promise<VendorWithPriceFit> {
  return request(`/api/vendors/${id}${qs(params)}`);
}

export interface ContactPayload {
  channel: CommunicationEvent["channel"];
  body: string;
  actor_name?: string;
}

export function contactVendor(
  vendorId: string,
  workOrderId: string,
  payload: ContactPayload
): Promise<{ candidate: WorkOrderCandidate; event: CommunicationEvent }> {
  return request(`/api/vendors/${vendorId}/contact`, {
    method: "POST",
    body: JSON.stringify({ ...payload, work_order_id: workOrderId }),
  });
}

// ---------- Candidates ----------

export function listCandidates(workOrderId: string): Promise<WorkOrderCandidate[]> {
  return request(`/api/work-orders/${workOrderId}/candidates`);
}

export function getCandidate(id: string): Promise<WorkOrderCandidate> {
  return request(`/api/work-order-candidates/${id}`);
}

export function updateCandidate(
  id: string,
  patch: Partial<WorkOrderCandidate>
): Promise<WorkOrderCandidate> {
  return request(`/api/work-order-candidates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function contactCandidate(
  id: string,
  payload: ContactPayload
): Promise<CommunicationEvent> {
  return request(`/api/work-order-candidates/${id}/contact`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function sendCandidateMessage(
  id: string,
  payload: ContactPayload
): Promise<CommunicationEvent> {
  return request(`/api/work-order-candidates/${id}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---------- Bids ----------

export interface CreateBidPayload {
  work_order_candidate_id: string;
  amount_cents: number;
  arrival_window_start?: string;
  arrival_window_end?: string;
  scope_notes?: string;
}

export function listBids(workOrderId: string): Promise<Bid[]> {
  return request(`/api/work-orders/${workOrderId}/bids`);
}

export function createBid(workOrderId: string, payload: CreateBidPayload): Promise<Bid> {
  return request(`/api/work-orders/${workOrderId}/bids`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateBid(id: string, patch: Partial<Bid>): Promise<Bid> {
  return request(`/api/bids/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function getBid(id: string): Promise<Bid> {
  return request(`/api/bids/${id}`);
}

// ---------- Timeline / states ----------

export function getTimeline(
  workOrderId: string
): Promise<{ timeline: TimelineEntry[]; recommendation: WinnerRecommendation }> {
  return request(`/api/work-orders/${workOrderId}/timeline`);
}

export function getStates(workOrderId: string): Promise<WorkOrderState[]> {
  return request(`/api/work-orders/${workOrderId}/states`);
}

// ---------- Chat sessions / LLM messages ----------

export function createChatSession(workOrderId?: string): Promise<ChatSession> {
  return request("/api/chat-sessions", {
    method: "POST",
    body: JSON.stringify({ work_order_id: workOrderId }),
  });
}

export function getChatSession(
  id: string
): Promise<{ session: ChatSession; messages: ChatMessage[] }> {
  return request(`/api/chat-sessions/${id}`);
}

export function sendChatSessionMessage(
  id: string,
  role: ChatMessageRole,
  body: string
): Promise<ChatMessage> {
  return request(`/api/chat-sessions/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ role, body }),
  });
}

export interface LlmMessageResponse {
  session: ChatSession;
  messages: ChatMessage[];
  reply: ChatMessage;
  work_order: WorkOrder | null;
}

export function sendLlmMessage(message: string, sessionId?: string): Promise<LlmMessageResponse> {
  return request("/api/llm/messages", {
    method: "POST",
    body: JSON.stringify({ message, session_id: sessionId }),
  });
}
