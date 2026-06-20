import os
import json
import logging
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional
from fastapi import HTTPException
import httpx
from sqlalchemy.orm import Session

from . import models
from .database import SessionLocal

logger = logging.getLogger(__name__)

# ----------------- Configuration -----------------

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "deepseek/deepseek-v4-flash")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

# ----------------- System Prompt -----------------

SYSTEM_PROMPT = """You are Tavi's AI facility-manager assistant, a command center for facility managers to manage trade work orders.
Your goal is to assist the user (a facility manager) in the complete lifecycle of a work order: intake, discovery, contact, bidding, selection, and awarding.

Important guidelines you MUST follow:
1. Act as Tavi's facility-manager assistant. Use professional, operational, and polite language.
2. Terminology: Always use the word "vendor" (singular/plural) to describe service providers. Never use the word "worker".
3. Intake clarification: Before creating a work order, you MUST ask clarifying questions to gather any missing information from:
   - trade
   - city / facility location
   - scope of work
   - requested date/time
   - target budget
   - urgency level (low, normal, high, emergency)
   If any of these are missing, ask the user to clarify before calling create_work_order.
4. Database Reads/Writes: Always use the appropriate tool function to read from or write to the database. Do not assume any data or guess IDs.
5. Vendor Sourcing & Filtering: When searching for vendors using `search_vendors`, prioritize vendors with:
   - Strong median quality score
   - Reasonable median price (comparing to the target budget)
   - Low risk score
   - Verified license and insurance status
   - Availability in the requested window
6. Summaries and Winner Recommendations:
   - Summarizing bids and recommending a winner are reasoning tasks. You must NOT look for dedicated tools for these.
   - First, fetch the work order details, candidates, and bids using `get_work_order()`, `get_work_order_candidates()`, and `get_work_order_bids()`.
   - Then, synthesize this context to generate a detailed, explainable winner recommendation.
   - Base your recommendation on bid amount, arrival window, quality/availability/risk scores, and license/insurance status.
7. Mock Demo Environment:
   - This is a mock demo context. Never claim that a real email, text message, or phone call was sent to a live vendor beyond this simulated environment. Make it clear that outreach actions (like send_vendor_email) are simulated.
"""

# ----------------- Tool Definitions -----------------

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "create_work_order",
            "description": "Create a new work order. Call this only after trade, city, scope, timing, budget, and urgency are clarified.",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "string", "description": "The ID of the user creating the work order. Use the default seeded user id (f3089d70-d4cf-4ca6-bdfd-7c22718e2036)."},
                    "facility_id": {"type": "string", "description": "The ID of the facility. Optional if unknown."},
                    "company_id": {"type": "string", "description": "The ID of the company. Optional."},
                    "title": {"type": "string", "description": "Brief title for the work order."},
                    "description": {"type": "string", "description": "Detailed description of the work order scope."},
                    "trade": {"type": "string", "description": "The trade (e.g. Lawncare, Plumbing, Electrical, HVAC, Cleaning, General maintenance)."},
                    "task_type": {"type": "string", "description": "The specific task type (e.g. leak_repair, install, maintenance, repair)."},
                    "status": {"type": "string", "enum": ["draft", "ready_for_vendor_discovery"], "default": "draft"},
                    "urgency": {"type": "string", "enum": ["low", "normal", "high", "emergency"]},
                    "target_budget_cents": {"type": "integer", "description": "Target budget in cents."}
                },
                "required": ["user_id", "title", "description", "trade"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_work_order",
            "description": "Update an existing work order details or status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "description": "The work order UUID."},
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "trade": {"type": "string"},
                    "task_type": {"type": "string"},
                    "status": {"type": "string", "description": "New status for the work order."},
                    "target_budget_cents": {"type": "integer"},
                    "max_price_cents": {"type": "integer"},
                    "urgency": {"type": "string"},
                    "selected_vendor_id": {"type": "string"},
                    "accepted_bid_id": {"type": "string"},
                    "accepted_price_cents": {"type": "integer"},
                    "scheduled_start_at": {"type": "string", "description": "ISO format string"},
                    "confirmation_status": {"type": "string", "enum": ["pending", "confirmed", "failed", "cancelled"]}
                },
                "required": ["id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_work_order",
            "description": "Fetch details of a specific work order by ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "description": "The work order UUID."}
                },
                "required": ["id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_work_order_bids",
            "description": "Get all bids submitted for a specific work order.",
            "parameters": {
                "type": "object",
                "properties": {
                    "work_order_id": {"type": "string", "description": "The work order UUID."}
                },
                "required": ["work_order_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_work_order_candidates",
            "description": "Get all shortlisted or contacted candidate vendors for a work order.",
            "parameters": {
                "type": "object",
                "properties": {
                    "work_order_id": {"type": "string", "description": "The work order UUID."}
                },
                "required": ["work_order_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_vendors",
            "description": "Search and filter mock vendors. Calculate price fit dynamically if trade and city are specified.",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string"},
                    "trade": {"type": "string"},
                    "task_type": {"type": "string"},
                    "target_budget": {"type": "integer", "description": "Optional budget in cents to calculate price fit against."},
                    "rating": {"type": "number"},
                    "license_status": {"type": "string", "enum": ["unknown", "verified", "unverified", "expired", "not_required"]},
                    "insurance_status": {"type": "string", "enum": ["unknown", "verified", "unverified", "expired", "not_required"]},
                    "quality_score": {"type": "number"},
                    "availability_score": {"type": "number"},
                    "risk_score": {"type": "number"},
                    "min_price_fit": {"type": "number", "description": "Minimum score from 0.0 to 1.0"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_work_order_candidate",
            "description": "Idempotently link a vendor as a candidate for a work order.",
            "parameters": {
                "type": "object",
                "properties": {
                    "work_order_id": {"type": "string"},
                    "vendor_id": {"type": "string"}
                },
                "required": ["work_order_id", "vendor_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "contact_vendor",
            "description": "Log an outbound communication event to a vendor for a work order, creating a candidate link if not exists.",
            "parameters": {
                "type": "object",
                "properties": {
                    "vendor_id": {"type": "string"},
                    "work_order_id": {"type": "string"},
                    "channel": {"type": "string", "enum": ["email", "sms", "phone"]},
                    "body": {"type": "string", "description": "The message text sent to the vendor."}
                },
                "required": ["vendor_id", "work_order_id", "channel", "body"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "send_vendor_email",
            "description": "Simulate sending an email to a candidate vendor.",
            "parameters": {
                "type": "object",
                "properties": {
                    "candidate_id": {"type": "string", "description": "The candidate UUID."},
                    "body": {"type": "string", "description": "The email body."}
                },
                "required": ["candidate_id", "body"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "send_vendor_text",
            "description": "Simulate sending a text message (SMS) to a candidate vendor.",
            "parameters": {
                "type": "object",
                "properties": {
                    "candidate_id": {"type": "string", "description": "The candidate UUID."},
                    "body": {"type": "string", "description": "The text message body."}
                },
                "required": ["candidate_id", "body"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "log_vendor_call",
            "description": "Simulate logging a phone call event with a candidate vendor.",
            "parameters": {
                "type": "object",
                "properties": {
                    "candidate_id": {"type": "string", "description": "The candidate UUID."},
                    "body": {"type": "string", "description": "Notes/summary of the phone call."}
                },
                "required": ["candidate_id", "body"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_bid",
            "description": "Submit a bid for a candidate vendor on a work order.",
            "parameters": {
                "type": "object",
                "properties": {
                    "work_order_id": {"type": "string"},
                    "work_order_candidate_id": {"type": "string"},
                    "amount_cents": {"type": "integer", "description": "Bid amount in cents."},
                    "arrival_window_start": {"type": "string", "description": "ISO format string"},
                    "arrival_window_end": {"type": "string", "description": "ISO format string"},
                    "scope_notes": {"type": "string"},
                    "status": {"type": "string", "enum": ["submitted", "accepted", "rejected", "withdrawn", "expired"], "default": "submitted"}
                },
                "required": ["work_order_id", "work_order_candidate_id", "amount_cents"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_bid",
            "description": "Update status or details of a bid. Set status to 'accepted' to select a winner.",
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "description": "The bid UUID."},
                    "amount_cents": {"type": "integer"},
                    "arrival_window_start": {"type": "string"},
                    "arrival_window_end": {"type": "string"},
                    "scope_notes": {"type": "string"},
                    "status": {"type": "string", "enum": ["submitted", "accepted", "rejected", "withdrawn", "expired"]}
                },
                "required": ["id"]
            }
        }
    }
]

# ----------------- Serialization helper -----------------

def serialize_model(obj) -> Dict[str, Any]:
    if obj is None:
        return {}
    res = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name)
        if isinstance(val, datetime):
            res[col.name] = val.isoformat()
        elif isinstance(val, Decimal):
            res[col.name] = float(val)
        else:
            res[col.name] = val
    return res

# ----------------- Tool Dispatcher Implementation -----------------

# ----------------- Separate Tool Functions -----------------

def tool_create_work_order(
    db: Session,
    user_id: str,
    title: str,
    description: str,
    trade: str,
    facility_id: Optional[str] = None,
    company_id: Optional[str] = None,
    task_type: Optional[str] = None,
    status: str = "draft",
    urgency: Optional[str] = None,
    target_budget_cents: Optional[int] = None,
    **kwargs
) -> Dict[str, Any]:
    from .main import create_wo_snapshot
    db_wo = models.WorkOrder(
        user_id=user_id,
        facility_id=facility_id,
        company_id=company_id,
        title=title,
        description=description,
        trade=trade,
        task_type=task_type,
        status=status,
        urgency=urgency,
        target_budget_cents=target_budget_cents
    )
    db.add(db_wo)
    db.commit()
    db.refresh(db_wo)
    create_wo_snapshot(db, db_wo, actor_type="agent", actor_name="Tavi Tool Agent")
    return serialize_model(db_wo)

def tool_update_work_order(
    db: Session,
    id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    trade: Optional[str] = None,
    task_type: Optional[str] = None,
    status: Optional[str] = None,
    target_budget_cents: Optional[int] = None,
    max_price_cents: Optional[int] = None,
    urgency: Optional[str] = None,
    selected_vendor_id: Optional[str] = None,
    accepted_bid_id: Optional[str] = None,
    accepted_price_cents: Optional[int] = None,
    scheduled_start_at: Optional[str] = None,
    confirmation_status: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    # Extract passed non-None parameters from local scope and merge with kwargs
    updates = {k: v for k, v in locals().items() if k not in ("db", "id", "kwargs") and v is not None}
    updates.update(kwargs)

    from .main import create_wo_snapshot
    wo = db.query(models.WorkOrder).filter(models.WorkOrder.id == id).first()
    if not wo:
        return {"error": f"Work order {id} not found"}
        
    important_fields = {
        "status", "title", "description", "trade", "task_type",
        "target_budget_cents", "max_price_cents", "selected_vendor_id",
        "accepted_bid_id", "accepted_price_cents", "scheduled_start_at",
        "completed_vendor_quality_score"
    }
    
    changed = False
    for key, val in updates.items():
        if key == "scheduled_start_at" and val:
            if isinstance(val, str):
                val = datetime.fromisoformat(val.replace("Z", ""))
        if key in important_fields:
            curr = getattr(wo, key)
            if curr != val:
                changed = True
        setattr(wo, key, val)
            
    wo.updated_at = datetime.utcnow()
    if changed:
        create_wo_snapshot(db, wo, actor_type="agent", actor_name="Tavi Tool Agent")
    else:
        db.commit()
    db.refresh(wo)
        
    return serialize_model(wo)

def tool_get_work_order(db: Session, id: str, **kwargs) -> Dict[str, Any]:
    wo = db.query(models.WorkOrder).filter(models.WorkOrder.id == id).first()
    if not wo:
        return {"error": f"Work order {id} not found"}
    res = serialize_model(wo)
    
    # Counts
    res["candidate_count"] = db.query(models.WorkOrderCandidate).filter(models.WorkOrderCandidate.work_order_id == id).count()
    res["bid_count"] = db.query(models.Bid).filter(models.Bid.work_order_id == id).count()
    res["communication_event_count"] = db.query(models.CommunicationEvent).filter(models.CommunicationEvent.work_order_id == id).count()
    
    # Related object metadata
    res["facility_name"] = wo.facility.name if wo.facility else None
    res["facility_address"] = wo.facility.address if wo.facility else None
    res["facility_city"] = wo.facility.city if wo.facility else None
    res["selected_vendor_name"] = wo.selected_vendor.name if wo.selected_vendor else None
    res["user_name"] = wo.user.name if wo.user else None
    
    return res

def tool_get_work_order_bids(db: Session, work_order_id: str, **kwargs) -> List[Dict[str, Any]]:
    bids = db.query(models.Bid).filter(models.Bid.work_order_id == work_order_id).all()
    return [serialize_model(b) for b in bids]

def tool_get_work_order_candidates(db: Session, work_order_id: str, **kwargs) -> List[Dict[str, Any]]:
    candidates = db.query(models.WorkOrderCandidate).filter(models.WorkOrderCandidate.work_order_id == work_order_id).all()
    res = []
    for c in candidates:
        c_dict = serialize_model(c)
        c_dict["vendor"] = serialize_model(c.vendor)
        res.append(c_dict)
    return res

def tool_search_vendors(
    db: Session,
    city: Optional[str] = None,
    trade: Optional[str] = None,
    task_type: Optional[str] = None,
    target_budget: Optional[int] = None,
    rating: Optional[float] = None,
    license_status: Optional[str] = None,
    insurance_status: Optional[str] = None,
    quality_score: Optional[float] = None,
    availability_score: Optional[float] = None,
    risk_score: Optional[float] = None,
    min_price_fit: Optional[float] = None,
    **kwargs
) -> Any:
    if target_budget is not None and target_budget <= 0:
        return {"error": "target_budget must be greater than 0"}
        
    query = db.query(models.Vendor)
    if city:
        query = query.filter(models.Vendor.city.ilike(city))
    if trade:
        query = query.filter(models.Vendor.trade.ilike(trade))
    if rating is not None:
        query = query.filter(models.Vendor.rating >= rating)
    if license_status:
        query = query.filter(models.Vendor.license_status == license_status)
    if insurance_status:
        query = query.filter(models.Vendor.insurance_status == insurance_status)
    if quality_score is not None:
        query = query.filter(models.Vendor.quality_score >= quality_score)
    if availability_score is not None:
        query = query.filter(models.Vendor.availability_score >= availability_score)
    if risk_score is not None:
        query = query.filter(models.Vendor.risk_score <= risk_score)
        
    vendors = query.all()
    
    if trade and city:
        stats = db.query(models.VendorTaskStat).filter(
            models.VendorTaskStat.trade.ilike(trade),
            models.VendorTaskStat.city.ilike(city)
        ).all()
        if task_type:
            stats = [s for s in stats if s.task_type.lower() == task_type.lower()]
            
        stats_by_vendor = {s.vendor_id: s.median_price_cents for s in stats}
        
        avg_median = 0
        if stats_by_vendor and target_budget is None:
            avg_median = sum(stats_by_vendor.values()) / len(stats_by_vendor)
            
        filtered = []
        for v in vendors:
            median_price = stats_by_vendor.get(v.id)
            if median_price is None:
                price_fit = None
            else:
                if target_budget is not None:
                    if median_price <= target_budget:
                        price_fit = 1.0
                    else:
                        price_fit = float(max(Decimal("0.0"), Decimal("1.0") - Decimal(median_price - target_budget) / Decimal(target_budget)))
                else:
                    if avg_median == 0:
                        price_fit = 1.0
                    elif median_price <= avg_median:
                        price_fit = 1.0
                    else:
                        price_fit = float(max(Decimal("0.0"), Decimal("1.0") - Decimal(median_price - avg_median) / Decimal(avg_median)))
            
            v_dict = serialize_model(v)
            v_dict["price_fit"] = price_fit
            
            if min_price_fit is not None:
                if price_fit is None or price_fit < min_price_fit:
                    continue
            filtered.append(v_dict)
        return filtered
        
    if min_price_fit is not None:
        return []
        
    return [serialize_model(v) for v in vendors]

def tool_create_work_order_candidate(db: Session, work_order_id: str, vendor_id: str, **kwargs) -> Dict[str, Any]:
    existing = db.query(models.WorkOrderCandidate).filter(
        models.WorkOrderCandidate.work_order_id == work_order_id,
        models.WorkOrderCandidate.vendor_id == vendor_id
    ).first()
    if existing:
        return serialize_model(existing)
        
    c = models.WorkOrderCandidate(
        work_order_id=work_order_id,
        vendor_id=vendor_id,
        status="discovered"
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return serialize_model(c)

def tool_contact_vendor(db: Session, vendor_id: str, work_order_id: str, channel: str, body: str, **kwargs) -> Dict[str, Any]:
    candidate = db.query(models.WorkOrderCandidate).filter(
        models.WorkOrderCandidate.work_order_id == work_order_id,
        models.WorkOrderCandidate.vendor_id == vendor_id
    ).first()
    if not candidate:
        candidate = models.WorkOrderCandidate(
            work_order_id=work_order_id,
            vendor_id=vendor_id,
            status="contact_pending",
            last_contacted_at=datetime.utcnow(),
            next_action="awaiting response"
        )
        db.add(candidate)
        db.commit()
        db.refresh(candidate)
    else:
        candidate.status = "contacted"
        candidate.last_contacted_at = datetime.utcnow()
        candidate.next_action = "awaiting response"
        db.commit()
        
    event = models.CommunicationEvent(
        work_order_id=work_order_id,
        work_order_candidate_id=candidate.id,
        channel=channel,
        direction="outbound",
        actor_type="agent",
        actor_name="Tavi Agent",
        body=body,
        created_at=datetime.utcnow()
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return serialize_model(event)

def _send_outbound_communication(db: Session, candidate_id: str, channel: str, body: str) -> Dict[str, Any]:
    candidate = db.query(models.WorkOrderCandidate).filter(models.WorkOrderCandidate.id == candidate_id).first()
    if not candidate:
        return {"error": f"Candidate {candidate_id} not found"}
        
    candidate.status = "contacted"
    candidate.last_contacted_at = datetime.utcnow()
    candidate.next_action = "awaiting response"
    db.commit()
    
    event = models.CommunicationEvent(
        work_order_id=candidate.work_order_id,
        work_order_candidate_id=candidate.id,
        channel=channel,
        direction="outbound",
        actor_type="agent",
        actor_name="Tavi Agent",
        body=body,
        created_at=datetime.utcnow()
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return serialize_model(event)

def tool_send_vendor_email(db: Session, candidate_id: str, body: str, **kwargs) -> Dict[str, Any]:
    return _send_outbound_communication(db, candidate_id, "email", body)

def tool_send_vendor_text(db: Session, candidate_id: str, body: str, **kwargs) -> Dict[str, Any]:
    return _send_outbound_communication(db, candidate_id, "sms", body)

def tool_log_vendor_call(db: Session, candidate_id: str, body: str, **kwargs) -> Dict[str, Any]:
    return _send_outbound_communication(db, candidate_id, "phone", body)

def tool_create_bid(
    db: Session,
    work_order_id: str,
    work_order_candidate_id: str,
    amount_cents: int,
    arrival_window_start: Optional[str] = None,
    arrival_window_end: Optional[str] = None,
    scope_notes: Optional[str] = None,
    status: str = "submitted",
    **kwargs
) -> Dict[str, Any]:
    from .main import update_bidding_mode_if_needed
    candidate = db.query(models.WorkOrderCandidate).filter(models.WorkOrderCandidate.id == work_order_candidate_id).first()
    if not candidate:
        return {"error": f"Candidate {work_order_candidate_id} not found"}
    if candidate.work_order_id != work_order_id:
        return {"error": "Candidate does not belong to this work order"}
        
    db_bid = models.Bid(
        work_order_id=work_order_id,
        work_order_candidate_id=work_order_candidate_id,
        amount_cents=amount_cents,
        arrival_window_start=datetime.fromisoformat(arrival_window_start.replace("Z", "")) if arrival_window_start else None,
        arrival_window_end=datetime.fromisoformat(arrival_window_end.replace("Z", "")) if arrival_window_end else None,
        scope_notes=scope_notes,
        status=status,
        submitted_at=datetime.utcnow(),
        created_at=datetime.utcnow()
    )
    db.add(db_bid)
    
    candidate.status = "bid_submitted"
    candidate.quoted_price_cents = amount_cents
    if arrival_window_start:
        candidate.available_start_at = datetime.fromisoformat(arrival_window_start.replace("Z", ""))
    if arrival_window_end:
        candidate.available_end_at = datetime.fromisoformat(arrival_window_end.replace("Z", ""))
        
    db.commit()
    db.refresh(db_bid)
    
    update_bidding_mode_if_needed(db, candidate.work_order)
    return serialize_model(db_bid)

def tool_update_bid(
    db: Session,
    id: str,
    amount_cents: Optional[int] = None,
    arrival_window_start: Optional[str] = None,
    arrival_window_end: Optional[str] = None,
    scope_notes: Optional[str] = None,
    status: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    # Extract passed non-None parameters from local scope and merge with kwargs
    updates = {k: v for k, v in locals().items() if k not in ("db", "id", "kwargs") and v is not None}
    updates.update(kwargs)

    from .main import create_wo_snapshot
    db_bid = db.query(models.Bid).filter(models.Bid.id == id).first()
    if not db_bid:
        return {"error": f"Bid {id} not found"}
        
    for key, val in updates.items():
        if key in ("arrival_window_start", "arrival_window_end") and val:
            if isinstance(val, str):
                val = datetime.fromisoformat(val.replace("Z", ""))
        setattr(db_bid, key, val)
            
    if updates.get("status") == "accepted":
        wo = db_bid.work_order
        wo.status = "awarded"
        wo.accepted_bid_id = db_bid.id
        wo.accepted_price_cents = db_bid.amount_cents
        wo.selected_vendor_id = db_bid.candidate.vendor_id
        
        db_bid.candidate.status = "selected"
        
        other = db.query(models.WorkOrderCandidate).filter(
            models.WorkOrderCandidate.work_order_id == wo.id,
            models.WorkOrderCandidate.id != db_bid.work_order_candidate_id
        ).all()
        for oc in other:
            oc.status = "not_selected"
            
        create_wo_snapshot(db, wo, actor_type="agent", actor_name="Tavi Tool Agent")
    else:
        db.commit()
        
    db.refresh(db_bid)
        
    return serialize_model(db_bid)

# ----------------- Tool Dispatcher Implementation -----------------

TOOL_FUNCTIONS = {
    "create_work_order": tool_create_work_order,
    "update_work_order": tool_update_work_order,
    "get_work_order": tool_get_work_order,
    "get_work_order_bids": tool_get_work_order_bids,
    "get_work_order_candidates": tool_get_work_order_candidates,
    "search_vendors": tool_search_vendors,
    "create_work_order_candidate": tool_create_work_order_candidate,
    "contact_vendor": tool_contact_vendor,
    "send_vendor_email": tool_send_vendor_email,
    "send_vendor_text": tool_send_vendor_text,
    "log_vendor_call": tool_log_vendor_call,
    "create_bid": tool_create_bid,
    "update_bid": tool_update_bid,
}

def execute_tool(db: Session, name: str, args: Dict[str, Any]) -> Any:
    logger.info(f"Executing tool {name} with args {args}")
    func = TOOL_FUNCTIONS.get(name)
    if not func:
        raise ValueError(f"Unknown tool function name: {name}")
    return func(db, **args)

# ----------------- OpenRouter Client & Execution Loop -----------------

def run_llm_conversation(db: Session, chat_session: models.ChatSession, user_message: str) -> Dict[str, Any]:
    # 1. Save user message to database
    db_msg_user = models.ChatMessage(
        chat_session_id=chat_session.id,
        work_order_id=chat_session.work_order_id,
        role="facility_manager",
        body=user_message,
        created_at=datetime.utcnow()
    )
    db.add(db_msg_user)
    chat_session.updated_at = datetime.utcnow()
    db.commit()

    # 2. Reconstruct chat history for the LLM
    history = db.query(models.ChatMessage).filter(
        models.ChatMessage.chat_session_id == chat_session.id
    ).order_by(models.ChatMessage.created_at.asc()).all()

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in history:
        role_map = {
            "facility_manager": "user",
            "assistant": "assistant",
            "system": "system"
        }
        role = role_map.get(h.role, "user")
        
        # If there are extracted fields, we can attach them, but keeping message body is standard
        msg_content = h.body
        messages.append({"role": role, "content": msg_content})

    # Prepare OpenRouter request parameters
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://tavi.ai",
        "X-Title": "Tavi Hackathon Demo"
    }

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": messages,
        "tools": TOOLS,
        "tool_choice": "auto"
    }

    # Debug details tracking for tool execution
    executed_tools_log = []

    # Check if OPENROUTER_API_KEY is present
    if not OPENROUTER_API_KEY:
        # Dry-run / mock demo mode if API key is missing
        # If the prompt includes "plumber", let's mock asking a clarifying question or returning vendor list
        logger.warning("No OPENROUTER_API_KEY found, running in mock local-demo mode.")
        
        mock_response = "Tavi LLM Demo Response (Simulated)"
        if "plumber" in user_message.lower() or "pipe leak" in user_message.lower():
            # Simulated tool execution to show it runs tools!
            # Search vendors mock
            mock_tools = [{
                "id": "call_mock_1",
                "type": "function",
                "function": {
                    "name": "search_vendors",
                    "arguments": json.dumps({"city": "New York", "trade": "Plumbing", "task_type": "leak_repair"})
                }
            }]
            
            tool_outputs = []
            for t in mock_tools:
                args = json.loads(t["function"]["arguments"])
                res = execute_tool(db, t["function"]["name"], args)
                executed_tools_log.append({
                    "name": t["function"]["name"],
                    "arguments": args,
                    "output": res
                })
                tool_outputs.append(res)
                
            mock_response = (
                "I found matching Plumbing vendors in New York: " +
                ", ".join([v["name"] for v in tool_outputs[0] if "name" in v][:3]) +
                ". Would you like me to contact them to collect bids?"
            )
            
        db_msg_assistant = models.ChatMessage(
            chat_session_id=chat_session.id,
            work_order_id=chat_session.work_order_id,
            role="assistant",
            body=mock_response,
            created_at=datetime.utcnow()
        )
        db.add(db_msg_assistant)
        chat_session.updated_at = datetime.utcnow()
        db.commit()
        
        return {
            "response": mock_response,
            "chat_session_id": chat_session.id,
            "work_order_id": chat_session.work_order_id,
            "tool_calls": executed_tools_log
        }

    # Multi-turn tool execution loop (runs up to 5 times to avoid infinite loop)
    for turn in range(5):
        try:
            with httpx.Client(base_url=OPENROUTER_BASE_URL, timeout=30.0) as client:
                res = client.post("/chat/completions", headers=headers, json=payload)
                if res.status_code != 200:
                    raise Exception(f"OpenRouter API error (HTTP {res.status_code}): {res.text}")
                    
                res_data = res.json()
                choice = res_data["choices"][0]["message"]
                
                # Check if model wants to call tools
                tool_calls = choice.get("tool_calls")
                if not tool_calls:
                    # Model returned a text response, save it and end loop
                    assistant_text = choice.get("content") or ""
                    db_msg_assistant = models.ChatMessage(
                        chat_session_id=chat_session.id,
                        work_order_id=chat_session.work_order_id,
                        role="assistant",
                        body=assistant_text,
                        created_at=datetime.utcnow()
                    )
                    db.add(db_msg_assistant)
                    chat_session.updated_at = datetime.utcnow()
                    db.commit()
                    
                    return {
                        "response": assistant_text,
                        "chat_session_id": chat_session.id,
                        "work_order_id": chat_session.work_order_id,
                        "tool_calls": executed_tools_log
                    }
                    
                # Otherwise, execute tools and append responses to messaging context
                payload["messages"].append(choice)
                
                for t in tool_calls:
                    tool_name = t["function"]["name"]
                    tool_args = json.loads(t["function"]["arguments"])
                    
                    # Run the tool
                    try:
                        tool_res = execute_tool(db, tool_name, tool_args)
                    except Exception as err:
                        tool_res = {"error": str(err)}
                        
                    executed_tools_log.append({
                        "name": tool_name,
                        "arguments": tool_args,
                        "output": tool_res
                    })
                    
                    # Append tool result to LLM messages payload
                    payload["messages"].append({
                        "role": "tool",
                        "tool_call_id": t["id"],
                        "name": tool_name,
                        "content": json.dumps(tool_res)
                    })
                    
        except Exception as e:
            logger.error(f"Error during LLM conversation: {e}")
            raise HTTPException(status_code=500, detail=str(e)) from e
            
    # Fallback response
    fallback_text = "I performed some actions but exceeded the execution limit. Please try again."
    db_msg_assistant = models.ChatMessage(
        chat_session_id=chat_session.id,
        work_order_id=chat_session.work_order_id,
        role="assistant",
        body=fallback_text,
        created_at=datetime.utcnow()
    )
    db.add(db_msg_assistant)
    chat_session.updated_at = datetime.utcnow()
    db.commit()

    return {
        "response": fallback_text,
        "chat_session_id": chat_session.id,
        "work_order_id": chat_session.work_order_id,
        "tool_calls": executed_tools_log
    }
