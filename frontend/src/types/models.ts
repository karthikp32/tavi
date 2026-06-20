// Entity types and closed enums mirrored from docs/design.md.

export type CompanyType = "facility_manager" | "vendor" | "platform";
export type UserType = "facility_manager" | "vendor" | "admin";

export type WorkOrderStatus =
  | "draft"
  | "ready_for_vendor_discovery"
  | "discovering_vendors"
  | "vendors_shortlisted"
  | "contacting_vendors"
  | "collecting_bids"
  | "negotiating"
  | "ready_for_award"
  | "awarded"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type CandidateStatus =
  | "discovered"
  | "shortlisted"
  | "contact_pending"
  | "contacted"
  | "responded"
  | "interested"
  | "unavailable"
  | "needs_clarification"
  | "bid_submitted"
  | "negotiating"
  | "recommended"
  | "selected"
  | "not_selected"
  | "declined";

export type Urgency = "low" | "normal" | "high" | "emergency";
export type BiddingMode = "transparent_auction" | "private_negotiation";
export type ConfirmationStatus = "pending" | "confirmed" | "failed" | "cancelled";
export type LicenseStatus = "unknown" | "verified" | "unverified" | "expired" | "not_required";
export type InsuranceStatus = "unknown" | "verified" | "unverified" | "expired" | "not_required";
export type Channel = "system" | "phone" | "email" | "sms" | "chat" | "note";
export type Direction = "inbound" | "outbound" | "internal";
export type ActorType = "system" | "agent" | "human" | "vendor" | "facility_manager";
export type BidStatus = "submitted" | "accepted" | "rejected" | "withdrawn" | "expired";
export type AgentActionStatus = "pending" | "running" | "succeeded" | "failed" | "cancelled";
export type ChatSessionStatus = "active" | "completed" | "abandoned";
export type ChatMessageRole = "facility_manager" | "assistant" | "system" | "tool";

export interface Company {
  id: string;
  name: string;
  company_type: CompanyType;
  trade?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  company_id?: string | null;
  name: string;
  email: string;
  user_type: UserType;
  trade?: string | null;
  company_name?: string | null;
  created_at: string;
}

export interface Facility {
  id: string;
  user_id: string;
  name: string;
  address: string;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
  updated_at: string;
}

export interface WorkOrder {
  id: string;
  user_id: string;
  company_id?: string | null;
  facility_id?: string | null;

  title: string;
  description: string;
  trade: string;
  task_type?: string | null;
  status: WorkOrderStatus;

  requested_start_at?: string | null;
  target_budget_cents?: number | null;
  max_price_cents?: number | null;
  bid_deadline_at?: string | null;
  urgency?: Urgency | null;
  bidding_mode?: BiddingMode | null;

  access_instructions?: string | null;
  license_required?: boolean | null;
  insurance_required?: boolean | null;
  qualification_criteria?: string | null;
  arrival_window_start?: string | null;
  arrival_window_end?: string | null;

  selected_vendor_id?: string | null;
  accepted_bid_id?: string | null;
  accepted_price_cents?: number | null;
  scheduled_start_at?: string | null;
  confirmation_status?: ConfirmationStatus | null;
  completed_vendor_quality_score?: number | null;

  created_at: string;
  updated_at: string;
}

export interface WorkOrderState {
  id: string;
  work_order_id: string;

  status: WorkOrderStatus;
  title?: string | null;
  description?: string | null;
  trade?: string | null;
  task_type?: string | null;
  target_budget_cents?: number | null;
  max_price_cents?: number | null;
  selected_vendor_id?: string | null;
  accepted_bid_id?: string | null;
  accepted_price_cents?: number | null;
  scheduled_start_at?: string | null;
  completed_vendor_quality_score?: number | null;
  details?: Record<string, unknown> | null;
  actor_type: ActorType;
  actor_name?: string | null;

  created_at: string;
}

export interface Vendor {
  id: string;
  company_id?: string | null;

  name: string;
  trade: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city: string;
  latitude?: number | null;
  longitude?: number | null;

  rating?: number | null;
  review_count?: number | null;
  license_status?: LicenseStatus | null;
  insurance_status?: InsuranceStatus | null;

  quality_score?: number | null;
  availability_score?: number | null;
  risk_score?: number | null;
  score_evidence?: Record<string, unknown> | null;

  created_at: string;
  updated_at: string;
}

export interface VendorTaskStats {
  id: string;
  vendor_id: string;
  trade: string;
  task_type: string;
  city: string;
  completed_work_order_count: number;
  median_price_cents: number;
  median_quality_score: number;
  created_at: string;
  updated_at: string;
}

export interface VendorAvailabilityBlock {
  id: string;
  vendor_id: string;
  starts_at: string;
  ends_at: string;
  city?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface WorkOrderCandidate {
  id: string;
  work_order_id: string;
  vendor_id: string;

  status: CandidateStatus;
  distance_miles?: number | null;

  quoted_price_cents?: number | null;
  available_start_at?: string | null;
  available_end_at?: string | null;

  last_contacted_at?: string | null;
  next_action?: string | null;

  created_at: string;
  updated_at: string;
}

export interface CommunicationEvent {
  id: string;
  work_order_id: string;
  work_order_candidate_id?: string | null;

  channel: Channel;
  direction: Direction;
  actor_type: ActorType;
  actor_name?: string | null;

  body: string;
  metadata?: Record<string, unknown> | null;

  created_at: string;
}

export interface Bid {
  id: string;
  work_order_id: string;
  work_order_candidate_id: string;

  amount_cents: number;
  arrival_window_start?: string | null;
  arrival_window_end?: string | null;
  scope_notes?: string | null;
  status: BidStatus;

  submitted_at: string;
  created_at: string;
}

export interface AgentAction {
  id: string;
  work_order_id: string;
  work_order_candidate_id?: string | null;

  action_type: string;
  status: AgentActionStatus;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;

  created_at: string;
  completed_at?: string | null;
}

export interface ChatSession {
  id: string;
  user_id: string;
  work_order_id?: string | null;

  status: ChatSessionStatus;
  summary?: string | null;

  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  chat_session_id: string;
  work_order_id?: string | null;

  role: ChatMessageRole;
  body: string;
  extracted_fields?: Record<string, unknown> | null;
  created_at: string;
}

// Composite / derived shapes used by pages, not persisted as-is.

export interface TimelineEntry {
  id: string;
  kind: "communication_event" | "bid" | "work_order_state";
  created_at: string;
  data: CommunicationEvent | Bid | WorkOrderState;
}

export interface WinnerRecommendation {
  recommended_candidate_id: string | null;
  reason: string;
  best_price_candidate_id: string | null;
  best_quality_candidate_id: string | null;
  fastest_candidate_id: string | null;
  risk_warnings: string[];
}

export interface WorkOrderDashboardRow {
  work_order: WorkOrder;
  candidate_count: number;
  bid_count: number;
  best_bid_amount_cents: number | null;
  recommended_vendor_name: string | null;
}
