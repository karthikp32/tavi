from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, EmailStr, Field, model_validator, field_validator, AliasChoices
from decimal import Decimal

# Helper config for Pydantic V2 to support SQLAlchemy models
class AppBaseModel(BaseModel):
    model_config = {
        "from_attributes": True
    }

# ----------------- Enums & Constants -----------------

WORK_ORDER_STATUSES = {
    "draft",
    "ready_for_vendor_discovery",
    "discovering_vendors",
    "vendors_shortlisted",
    "contacting_vendors",
    "collecting_bids",
    "negotiating",
    "ready_for_award",
    "awarded",
    "scheduled",
    "in_progress",
    "completed",
    "cancelled",
}

CANDIDATE_STATUSES = {
    "discovered",
    "shortlisted",
    "contact_pending",
    "contacted",
    "responded",
    "interested",
    "unavailable",
    "needs_clarification",
    "bid_submitted",
    "negotiating",
    "recommended",
    "selected",
    "not_selected",
    "declined",
}

URGENCIES = {"low", "normal", "high", "emergency"}
BIDDING_MODES = {"transparent_auction", "private_negotiation"}
CONFIRMATION_STATUSES = {"pending", "confirmed", "failed", "cancelled"}
LICENSE_STATUSES = {"unknown", "verified", "unverified", "expired", "not_required"}
INSURANCE_STATUSES = {"unknown", "verified", "unverified", "expired", "not_required"}
CHANNELS = {"system", "phone", "email", "sms", "chat", "note"}
DIRECTIONS = {"inbound", "outbound", "internal"}
ACTOR_TYPES = {"system", "agent", "human", "vendor", "facility_manager"}
BID_STATUSES = {"submitted", "accepted", "rejected", "withdrawn", "expired"}
AGENT_ACTION_STATUSES = {"pending", "running", "succeeded", "failed", "cancelled"}
CHAT_SESSION_STATUSES = {"active", "completed", "abandoned"}
CHAT_MESSAGE_ROLES = {"facility_manager", "assistant", "system", "tool"}
COMPANY_TYPES = {"facility_manager", "vendor", "platform"}
USER_TYPES = {"facility_manager", "vendor", "admin"}

# ----------------- Company Schemas -----------------

class CompanyBase(AppBaseModel):
    name: str
    company_type: str
    trade: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None

class CompanyCreate(CompanyBase):
    @field_validator("company_type")
    @classmethod
    def validate_company_type(cls, v: str) -> str:
        if v not in COMPANY_TYPES:
            raise ValueError(f"Invalid company_type. Must be one of {COMPANY_TYPES}")
        return v

class CompanyUpdate(AppBaseModel):
    name: Optional[str] = None
    company_type: Optional[str] = None
    trade: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None

    @field_validator("company_type")
    @classmethod
    def validate_company_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in COMPANY_TYPES:
            raise ValueError(f"Invalid company_type. Must be one of {COMPANY_TYPES}")
        return v

class CompanyOut(CompanyBase):
    id: str
    created_at: datetime
    updated_at: datetime

# ----------------- User Schemas -----------------

class UserBase(AppBaseModel):
    name: str
    email: str
    user_type: str
    trade: Optional[str] = None
    company_name: Optional[str] = None
    company_id: Optional[str] = None

class UserCreate(UserBase):
    @field_validator("user_type")
    @classmethod
    def validate_user_type(cls, v: str) -> str:
        if v not in USER_TYPES:
            raise ValueError(f"Invalid user_type. Must be one of {USER_TYPES}")
        return v

class UserOut(UserBase):
    id: str
    created_at: datetime

# ----------------- Facility Schemas -----------------

class FacilityBase(AppBaseModel):
    user_id: str
    name: str
    address: str
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None

class FacilityCreate(FacilityBase):
    pass

class FacilityOut(FacilityBase):
    id: str
    created_at: datetime
    updated_at: datetime

# ----------------- Vendor Schemas -----------------

class VendorBase(AppBaseModel):
    company_id: Optional[str] = None
    name: str
    trade: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    rating: Optional[Decimal] = None
    review_count: Optional[int] = None
    license_status: Optional[str] = None
    insurance_status: Optional[str] = None
    quality_score: Optional[Decimal] = None
    availability_score: Optional[Decimal] = None
    risk_score: Optional[Decimal] = None
    score_evidence: Optional[Dict[str, Any]] = None

class VendorCreate(VendorBase):
    @field_validator("license_status")
    @classmethod
    def validate_license(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in LICENSE_STATUSES:
            raise ValueError(f"Invalid license_status. Must be one of {LICENSE_STATUSES}")
        return v

    @field_validator("insurance_status")
    @classmethod
    def validate_insurance(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in INSURANCE_STATUSES:
            raise ValueError(f"Invalid insurance_status. Must be one of {INSURANCE_STATUSES}")
        return v

class VendorOut(VendorBase):
    id: str
    created_at: datetime
    updated_at: datetime
    price_fit: Optional[float] = None

# ----------------- Vendor Task Stat Schemas -----------------

class VendorTaskStatBase(AppBaseModel):
    vendor_id: str
    trade: str
    task_type: str
    city: str
    completed_work_order_count: int
    median_price_cents: int
    median_quality_score: Decimal

class VendorTaskStatCreate(VendorTaskStatBase):
    pass

class VendorTaskStatOut(VendorTaskStatBase):
    id: str
    created_at: datetime
    updated_at: datetime

# ----------------- Vendor Availability Block Schemas -----------------

class VendorAvailabilityBlockBase(AppBaseModel):
    vendor_id: str
    starts_at: datetime
    ends_at: datetime
    city: Optional[str] = None
    notes: Optional[str] = None

class VendorAvailabilityBlockCreate(VendorAvailabilityBlockBase):
    pass

class VendorAvailabilityBlockOut(VendorAvailabilityBlockBase):
    id: str
    created_at: datetime

# ----------------- Work Order Candidate Schemas -----------------

class WorkOrderCandidateBase(AppBaseModel):
    work_order_id: str
    vendor_id: str
    status: str
    distance_miles: Optional[Decimal] = None
    quoted_price_cents: Optional[int] = None
    available_start_at: Optional[datetime] = None
    available_end_at: Optional[datetime] = None
    last_contacted_at: Optional[datetime] = None
    next_action: Optional[str] = None

class WorkOrderCandidateCreate(WorkOrderCandidateBase):
    @field_validator("status")
    @classmethod
    def validate_candidate_status(cls, v: str) -> str:
        if v not in CANDIDATE_STATUSES:
            raise ValueError(f"Invalid candidate status. Must be one of {CANDIDATE_STATUSES}")
        return v

class WorkOrderCandidateUpdate(AppBaseModel):
    status: Optional[str] = None
    distance_miles: Optional[Decimal] = None
    quoted_price_cents: Optional[int] = None
    available_start_at: Optional[datetime] = None
    available_end_at: Optional[datetime] = None
    last_contacted_at: Optional[datetime] = None
    next_action: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_candidate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in CANDIDATE_STATUSES:
            raise ValueError(f"Invalid candidate status. Must be one of {CANDIDATE_STATUSES}")
        return v

class WorkOrderCandidateOut(WorkOrderCandidateBase):
    id: str
    created_at: datetime
    updated_at: datetime
    vendor: Optional[VendorOut] = None

# ----------------- Bid Schemas -----------------

class BidBase(AppBaseModel):
    work_order_id: str
    work_order_candidate_id: str
    amount_cents: int
    arrival_window_start: Optional[datetime] = None
    arrival_window_end: Optional[datetime] = None
    scope_notes: Optional[str] = None
    status: str

class BidCreate(BidBase):
    @field_validator("status")
    @classmethod
    def validate_bid_status(cls, v: str) -> str:
        if v not in BID_STATUSES:
            raise ValueError(f"Invalid bid status. Must be one of {BID_STATUSES}")
        return v

class BidUpdate(AppBaseModel):
    amount_cents: Optional[int] = None
    arrival_window_start: Optional[datetime] = None
    arrival_window_end: Optional[datetime] = None
    scope_notes: Optional[str] = None
    status: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_bid_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in BID_STATUSES:
            raise ValueError(f"Invalid bid status. Must be one of {BID_STATUSES}")
        return v

class BidOut(BidBase):
    id: str
    submitted_at: datetime
    created_at: datetime
    candidate: Optional[WorkOrderCandidateOut] = None

# ----------------- Work Order State Schemas -----------------

class WorkOrderStateBase(AppBaseModel):
    work_order_id: str
    status: str
    title: Optional[str] = None
    description: Optional[str] = None
    trade: Optional[str] = None
    task_type: Optional[str] = None
    target_budget_cents: Optional[int] = None
    max_price_cents: Optional[int] = None
    selected_vendor_id: Optional[str] = None
    accepted_bid_id: Optional[str] = None
    accepted_price_cents: Optional[int] = None
    scheduled_start_at: Optional[datetime] = None
    completed_vendor_quality_score: Optional[Decimal] = None
    details: Optional[Dict[str, Any]] = None
    actor_type: str
    actor_name: Optional[str] = None

class WorkOrderStateCreate(WorkOrderStateBase):
    @field_validator("status")
    @classmethod
    def validate_wo_status(cls, v: str) -> str:
        if v not in WORK_ORDER_STATUSES:
            raise ValueError(f"Invalid status. Must be one of {WORK_ORDER_STATUSES}")
        return v

    @field_validator("actor_type")
    @classmethod
    def validate_actor_type(cls, v: str) -> str:
        if v not in ACTOR_TYPES:
            raise ValueError(f"Invalid actor_type. Must be one of {ACTOR_TYPES}")
        return v

class WorkOrderStateOut(WorkOrderStateBase):
    id: str
    created_at: datetime

# ----------------- Work Order Schemas -----------------

class WorkOrderBase(AppBaseModel):
    user_id: str
    company_id: Optional[str] = None
    facility_id: Optional[str] = None
    title: str
    description: str
    trade: str
    task_type: Optional[str] = None
    status: str
    requested_start_at: Optional[datetime] = None
    target_budget_cents: Optional[int] = None
    max_price_cents: Optional[int] = None
    bid_deadline_at: Optional[datetime] = None
    urgency: Optional[str] = None
    bidding_mode: Optional[str] = None
    required_arrival_window_start: Optional[datetime] = None
    required_arrival_window_end: Optional[datetime] = None
    selected_vendor_id: Optional[str] = None
    accepted_bid_id: Optional[str] = None
    accepted_price_cents: Optional[int] = None
    scheduled_start_at: Optional[datetime] = None
    confirmation_status: Optional[str] = None
    completed_vendor_quality_score: Optional[Decimal] = None

class WorkOrderCreate(WorkOrderBase):
    actor_type: str = "human"
    actor_name: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in WORK_ORDER_STATUSES:
            raise ValueError(f"Invalid status. Must be one of {WORK_ORDER_STATUSES}")
        if v == "intake_review":
            raise ValueError("Status cannot be 'intake_review'")
        return v

    @field_validator("urgency")
    @classmethod
    def validate_urgency(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in URGENCIES:
            raise ValueError(f"Invalid urgency. Must be one of {URGENCIES}")
        return v

    @field_validator("bidding_mode")
    @classmethod
    def validate_bidding_mode(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in BIDDING_MODES:
            raise ValueError(f"Invalid bidding_mode. Must be one of {BIDDING_MODES}")
        return v

    @field_validator("confirmation_status")
    @classmethod
    def validate_confirmation(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in CONFIRMATION_STATUSES:
            raise ValueError(f"Invalid confirmation_status. Must be one of {CONFIRMATION_STATUSES}")
        return v

    @model_validator(mode="after")
    def validate_arrival_window(self) -> "WorkOrderCreate":
        if (
            self.required_arrival_window_start is not None
            and self.required_arrival_window_end is not None
            and self.required_arrival_window_start > self.required_arrival_window_end
        ):
            raise ValueError("required_arrival_window_start must be before or equal to required_arrival_window_end")
        return self

class WorkOrderUpdate(AppBaseModel):
    user_id: Optional[str] = None
    company_id: Optional[str] = None
    facility_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    trade: Optional[str] = None
    task_type: Optional[str] = None
    status: Optional[str] = None
    requested_start_at: Optional[datetime] = None
    target_budget_cents: Optional[int] = None
    max_price_cents: Optional[int] = None
    bid_deadline_at: Optional[datetime] = None
    urgency: Optional[str] = None
    bidding_mode: Optional[str] = None
    required_arrival_window_start: Optional[datetime] = None
    required_arrival_window_end: Optional[datetime] = None
    selected_vendor_id: Optional[str] = None
    accepted_bid_id: Optional[str] = None
    accepted_price_cents: Optional[int] = None
    scheduled_start_at: Optional[datetime] = None
    confirmation_status: Optional[str] = None
    completed_vendor_quality_score: Optional[Decimal] = None

    # Audit fields for updating the state
    actor_type: str = "human"
    actor_name: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if v not in WORK_ORDER_STATUSES:
                raise ValueError(f"Invalid status. Must be one of {WORK_ORDER_STATUSES}")
            if v == "intake_review":
                raise ValueError("Status cannot be 'intake_review'")
        return v

    @field_validator("urgency")
    @classmethod
    def validate_urgency(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in URGENCIES:
            raise ValueError(f"Invalid urgency. Must be one of {URGENCIES}")
        return v

    @field_validator("bidding_mode")
    @classmethod
    def validate_bidding_mode(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in BIDDING_MODES:
            raise ValueError(f"Invalid bidding_mode. Must be one of {BIDDING_MODES}")
        return v

    @field_validator("confirmation_status")
    @classmethod
    def validate_confirmation(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in CONFIRMATION_STATUSES:
            raise ValueError(f"Invalid confirmation_status. Must be one of {CONFIRMATION_STATUSES}")
        return v

    @model_validator(mode="after")
    def validate_arrival_window(self) -> "WorkOrderUpdate":
        if (
            self.required_arrival_window_start is not None
            and self.required_arrival_window_end is not None
            and self.required_arrival_window_start > self.required_arrival_window_end
        ):
            raise ValueError("required_arrival_window_start must be before or equal to required_arrival_window_end")
        return self

class WorkOrderOut(WorkOrderBase):
    id: str
    created_at: datetime
    updated_at: datetime
    facility: Optional[FacilityOut] = None

# ----------------- Communication Event Schemas -----------------

class CommunicationEventBase(AppBaseModel):
    work_order_id: str
    work_order_candidate_id: Optional[str] = None
    channel: str
    direction: str
    actor_type: str
    actor_name: Optional[str] = None
    sender_id: Optional[str] = None
    sender_type: Optional[str] = None
    body: str
    metadata: Optional[Dict[str, Any]] = None

    @model_validator(mode="before")
    @classmethod
    def resolve_metadata(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            res = {}
            for attr in ["id", "created_at", "updated_at"]:
                if hasattr(data, attr):
                    res[attr] = getattr(data, attr)
            for field_name in cls.model_fields.keys():
                if field_name == "metadata":
                    res["metadata"] = getattr(data, "event_metadata", None)
                else:
                    res[field_name] = getattr(data, field_name, None)
            return res
        return data

class CommunicationEventCreate(CommunicationEventBase):
    @field_validator("channel")
    @classmethod
    def validate_channel(cls, v: str) -> str:
        if v not in CHANNELS:
            raise ValueError(f"Invalid channel. Must be one of {CHANNELS}")
        return v

    @field_validator("direction")
    @classmethod
    def validate_direction(cls, v: str) -> str:
        if v not in DIRECTIONS:
            raise ValueError(f"Invalid direction. Must be one of {DIRECTIONS}")
        return v

    @field_validator("actor_type")
    @classmethod
    def validate_actor_type(cls, v: str) -> str:
        if v not in ACTOR_TYPES:
            raise ValueError(f"Invalid actor_type. Must be one of {ACTOR_TYPES}")
        return v

    @field_validator("sender_type")
    @classmethod
    def validate_sender_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ACTOR_TYPES:
            raise ValueError(f"Invalid sender_type. Must be one of {ACTOR_TYPES}")
        return v

class CommunicationEventOut(CommunicationEventBase):
    id: str
    created_at: datetime

# ----------------- Agent Action Schemas -----------------

class AgentActionBase(AppBaseModel):
    work_order_id: str
    work_order_candidate_id: Optional[str] = None
    action_type: str
    status: str
    input: Optional[Dict[str, Any]] = None
    output: Optional[Dict[str, Any]] = None

class AgentActionCreate(AgentActionBase):
    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in AGENT_ACTION_STATUSES:
            raise ValueError(f"Invalid status. Must be one of {AGENT_ACTION_STATUSES}")
        return v

class AgentActionOut(AgentActionBase):
    id: str
    created_at: datetime
    completed_at: Optional[datetime] = None

# ----------------- Chat Session & Messages Schemas -----------------

class ChatMessageBase(AppBaseModel):
    chat_session_id: str
    work_order_id: Optional[str] = None
    role: str
    body: str
    extracted_fields: Optional[Dict[str, Any]] = None

class ChatMessageCreate(ChatMessageBase):
    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in CHAT_MESSAGE_ROLES:
            raise ValueError(f"Invalid role. Must be one of {CHAT_MESSAGE_ROLES}")
        return v

class ChatMessageOut(ChatMessageBase):
    id: str
    created_at: datetime

class ChatSessionBase(AppBaseModel):
    user_id: str
    work_order_id: Optional[str] = None
    status: str
    summary: Optional[str] = None

class ChatSessionCreate(ChatSessionBase):
    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in CHAT_SESSION_STATUSES:
            raise ValueError(f"Invalid status. Must be one of {CHAT_SESSION_STATUSES}")
        return v

class ChatSessionOut(ChatSessionBase):
    id: str
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageOut] = []

# ----------------- LLM Schemas -----------------

class LlmMessageRequest(AppBaseModel):
    chat_session_id: Optional[str] = None
    message: str
    work_order_id: Optional[str] = None

class LlmMessageResponse(AppBaseModel):
    response: str
    chat_session_id: str
    work_order_id: Optional[str] = None
    tool_calls: List[Dict[str, Any]] = []
