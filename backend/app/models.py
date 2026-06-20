import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Numeric,
    DateTime,
    ForeignKey,
    JSON,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from .database import Base

# Helpers to generate UUIDs as strings
def generate_uuid():
    return str(uuid.uuid4())

class Company(Base):
    __tablename__ = "companies"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    company_type = Column(String, nullable=False)  # facility_manager, vendor, platform
    trade = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    users = relationship("User", back_populates="company")
    vendors = relationship("Vendor", back_populates="company")
    work_orders = relationship("WorkOrder", back_populates="company")

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id"), nullable=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    user_type = Column(String, nullable=False)  # facility_manager, vendor, admin
    trade = Column(String, nullable=True)
    company_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    company = relationship("Company", back_populates="users")
    facilities = relationship("Facility", back_populates="user")
    work_orders = relationship("WorkOrder", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user")

class Facility(Base):
    __tablename__ = "facilities"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    latitude = Column(Numeric, nullable=True)
    longitude = Column(Numeric, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="facilities")
    work_orders = relationship("WorkOrder", back_populates="facility")

class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    company_id = Column(String, ForeignKey("companies.id"), nullable=True)
    facility_id = Column(String, ForeignKey("facilities.id"), nullable=True)

    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    trade = Column(String, nullable=False)
    task_type = Column(String, nullable=True)
    status = Column(String, nullable=False)  # closed enum: Work Order States

    requested_start_at = Column(DateTime, nullable=True)
    target_budget_cents = Column(Integer, nullable=True)
    max_price_cents = Column(Integer, nullable=True)
    bid_deadline_at = Column(DateTime, nullable=True)
    urgency = Column(String, nullable=True)
    bidding_mode = Column(String, nullable=True)
    required_arrival_window_start = Column(DateTime, nullable=True)
    required_arrival_window_end = Column(DateTime, nullable=True)

    selected_vendor_id = Column(String, ForeignKey("vendors.id"), nullable=True)
    accepted_bid_id = Column(
        String,
        ForeignKey("bids.id", use_alter=True, name="fk_work_orders_accepted_bid_id"),
        nullable=True,
    )
    accepted_price_cents = Column(Integer, nullable=True)
    scheduled_start_at = Column(DateTime, nullable=True)
    confirmation_status = Column(String, nullable=True)
    completed_vendor_quality_score = Column(Numeric, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="work_orders")
    company = relationship("Company", back_populates="work_orders")
    facility = relationship("Facility", back_populates="work_orders")
    selected_vendor = relationship("Vendor", back_populates="selected_work_orders")
    states = relationship("WorkOrderState", back_populates="work_order", cascade="all, delete-orphan")
    candidates = relationship("WorkOrderCandidate", back_populates="work_order", cascade="all, delete-orphan")
    communication_events = relationship("CommunicationEvent", back_populates="work_order", cascade="all, delete-orphan")
    bids = relationship(
        "Bid",
        back_populates="work_order",
        cascade="all, delete-orphan",
        foreign_keys="Bid.work_order_id",
    )
    agent_actions = relationship("AgentAction", back_populates="work_order", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="work_order")
    chat_messages = relationship("ChatMessage", back_populates="work_order")

class WorkOrderState(Base):
    __tablename__ = "work_order_states"

    id = Column(String, primary_key=True, default=generate_uuid)
    work_order_id = Column(String, ForeignKey("work_orders.id"), nullable=False)

    status = Column(String, nullable=False)
    title = Column(String, nullable=True)
    description = Column(String, nullable=True)
    trade = Column(String, nullable=True)
    task_type = Column(String, nullable=True)
    target_budget_cents = Column(Integer, nullable=True)
    max_price_cents = Column(Integer, nullable=True)
    selected_vendor_id = Column(String, ForeignKey("vendors.id"), nullable=True)
    accepted_bid_id = Column(String, nullable=True)
    accepted_price_cents = Column(Integer, nullable=True)
    scheduled_start_at = Column(DateTime, nullable=True)
    completed_vendor_quality_score = Column(Numeric, nullable=True)
    details = Column(JSON, nullable=True)
    actor_type = Column(String, nullable=False)  # system, agent, human, vendor, facility_manager
    actor_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    work_order = relationship("WorkOrder", back_populates="states")

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id"), nullable=True)

    name = Column(String, nullable=False)
    trade = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    latitude = Column(Numeric, nullable=True)
    longitude = Column(Numeric, nullable=True)

    rating = Column(Numeric, nullable=True)
    review_count = Column(Integer, nullable=True)
    license_status = Column(String, nullable=True)
    insurance_status = Column(String, nullable=True)

    quality_score = Column(Numeric, nullable=True)
    availability_score = Column(Numeric, nullable=True)
    risk_score = Column(Numeric, nullable=True)
    score_evidence = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    company = relationship("Company", back_populates="vendors")
    selected_work_orders = relationship("WorkOrder", back_populates="selected_vendor")
    task_stats = relationship("VendorTaskStat", back_populates="vendor", cascade="all, delete-orphan")
    availability_blocks = relationship("VendorAvailabilityBlock", back_populates="vendor", cascade="all, delete-orphan")
    candidates = relationship("WorkOrderCandidate", back_populates="vendor", cascade="all, delete-orphan")

class VendorTaskStat(Base):
    __tablename__ = "vendor_task_stats"

    id = Column(String, primary_key=True, default=generate_uuid)
    vendor_id = Column(String, ForeignKey("vendors.id"), nullable=False)

    trade = Column(String, nullable=False)
    task_type = Column(String, nullable=False)
    city = Column(String, nullable=False)

    completed_work_order_count = Column(Integer, nullable=False)
    median_price_cents = Column(Integer, nullable=False)
    median_quality_score = Column(Numeric, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    vendor = relationship("Vendor", back_populates="task_stats")

    __table_args__ = (
        UniqueConstraint("vendor_id", "trade", "task_type", "city", name="uq_vendor_trade_task_city"),
    )

class VendorAvailabilityBlock(Base):
    __tablename__ = "vendor_availability_blocks"

    id = Column(String, primary_key=True, default=generate_uuid)
    vendor_id = Column(String, ForeignKey("vendors.id"), nullable=False)

    starts_at = Column(DateTime, nullable=False)
    ends_at = Column(DateTime, nullable=False)
    city = Column(String, nullable=True)
    notes = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    vendor = relationship("Vendor", back_populates="availability_blocks")

class WorkOrderCandidate(Base):
    __tablename__ = "work_order_candidates"

    id = Column(String, primary_key=True, default=generate_uuid)
    work_order_id = Column(String, ForeignKey("work_orders.id"), nullable=False)
    vendor_id = Column(String, ForeignKey("vendors.id"), nullable=False)

    status = Column(String, nullable=False)  # closed enum: Candidate Statuses
    distance_miles = Column(Numeric, nullable=True)

    quoted_price_cents = Column(Integer, nullable=True)
    available_start_at = Column(DateTime, nullable=True)
    available_end_at = Column(DateTime, nullable=True)

    last_contacted_at = Column(DateTime, nullable=True)
    next_action = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    work_order = relationship("WorkOrder", back_populates="candidates")
    vendor = relationship("Vendor", back_populates="candidates")
    communication_events = relationship("CommunicationEvent", back_populates="candidate", cascade="all, delete-orphan")
    bids = relationship("Bid", back_populates="candidate", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("work_order_id", "vendor_id", name="uq_work_order_vendor"),
    )

class CommunicationEvent(Base):
    __tablename__ = "communication_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    work_order_id = Column(String, ForeignKey("work_orders.id"), nullable=False)
    work_order_candidate_id = Column(String, ForeignKey("work_order_candidates.id"), nullable=True)

    channel = Column(String, nullable=False)  # system, phone, email, sms, chat, note
    direction = Column(String, nullable=False)  # inbound, outbound, internal
    actor_type = Column(String, nullable=False)  # system, agent, human, vendor, facility_manager
    actor_name = Column(String, nullable=True)

    body = Column(String, nullable=False)
    event_metadata = Column("metadata", JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    work_order = relationship("WorkOrder", back_populates="communication_events")
    candidate = relationship("WorkOrderCandidate", back_populates="communication_events")

class Bid(Base):
    __tablename__ = "bids"

    id = Column(String, primary_key=True, default=generate_uuid)
    work_order_id = Column(String, ForeignKey("work_orders.id"), nullable=False)
    work_order_candidate_id = Column(String, ForeignKey("work_order_candidates.id"), nullable=False)

    amount_cents = Column(Integer, nullable=False)
    arrival_window_start = Column(DateTime, nullable=True)
    arrival_window_end = Column(DateTime, nullable=True)
    scope_notes = Column(String, nullable=True)
    status = Column(String, nullable=False)  # submitted, accepted, rejected, withdrawn, expired

    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    work_order = relationship("WorkOrder", back_populates="bids", foreign_keys=[work_order_id])
    candidate = relationship("WorkOrderCandidate", back_populates="bids")

class AgentAction(Base):
    __tablename__ = "agent_actions"

    id = Column(String, primary_key=True, default=generate_uuid)
    work_order_id = Column(String, ForeignKey("work_orders.id"), nullable=False)
    work_order_candidate_id = Column(String, ForeignKey("work_order_candidates.id"), nullable=True)

    action_type = Column(String, nullable=False)
    status = Column(String, nullable=False)  # pending, running, succeeded, failed, cancelled
    input = Column(JSON, nullable=True)
    output = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    work_order = relationship("WorkOrder", back_populates="agent_actions")

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    work_order_id = Column(String, ForeignKey("work_orders.id"), nullable=True)

    status = Column(String, nullable=False)  # active, completed, abandoned
    summary = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="chat_sessions")
    work_order = relationship("WorkOrder", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="chat_session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    chat_session_id = Column(String, ForeignKey("chat_sessions.id"), nullable=False)
    work_order_id = Column(String, ForeignKey("work_orders.id"), nullable=True)

    role = Column(String, nullable=False)  # facility_manager, assistant, system, tool
    body = Column(String, nullable=False)
    extracted_fields = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    chat_session = relationship("ChatSession", back_populates="messages")
    work_order = relationship("WorkOrder", back_populates="chat_messages")
