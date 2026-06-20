from fastapi import FastAPI, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal

from .database import engine, Base, get_db
from . import models, schemas
from .seed import seed_db

app = FastAPI(title="Tavi Hackathon Backend", version="1.0.0")

# Ensure tables are created at startup
Base.metadata.create_all(bind=engine)

@app.get("/health")
@app.get("/")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow()}

@app.post("/api/seed", status_code=status.HTTP_200_OK)
def seed_database(db: Session = Depends(get_db)):
    try:
        seed_db(db)
        return {"message": "Database seeded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

# ----------------- Helper Functions -----------------

def create_wo_snapshot(db: Session, work_order: models.WorkOrder, actor_type: str, actor_name: Optional[str] = None):
    # Serialize details of the work order
    details = {
        "title": work_order.title,
        "description": work_order.description,
        "trade": work_order.trade,
        "task_type": work_order.task_type,
        "urgency": work_order.urgency,
        "bidding_mode": work_order.bidding_mode,
        "target_budget_cents": work_order.target_budget_cents,
        "max_price_cents": work_order.max_price_cents,
        "confirmation_status": work_order.confirmation_status,
        "scheduled_start_at": work_order.scheduled_start_at.isoformat() if work_order.scheduled_start_at else None,
        "requested_start_at": work_order.requested_start_at.isoformat() if work_order.requested_start_at else None,
        "bid_deadline_at": work_order.bid_deadline_at.isoformat() if work_order.bid_deadline_at else None,
    }
    
    snapshot = models.WorkOrderState(
        work_order_id=work_order.id,
        status=work_order.status,
        title=work_order.title,
        description=work_order.description,
        trade=work_order.trade,
        task_type=work_order.task_type,
        target_budget_cents=work_order.target_budget_cents,
        max_price_cents=work_order.max_price_cents,
        selected_vendor_id=work_order.selected_vendor_id,
        accepted_bid_id=work_order.accepted_bid_id,
        accepted_price_cents=work_order.accepted_price_cents,
        scheduled_start_at=work_order.scheduled_start_at,
        completed_vendor_quality_score=work_order.completed_vendor_quality_score,
        details=details,
        actor_type=actor_type,
        actor_name=actor_name,
        created_at=datetime.utcnow()
    )
    db.add(snapshot)
    db.commit()

def update_bidding_mode_if_needed(db: Session, work_order: models.WorkOrder):
    # Retrieve all candidates
    candidates = db.query(models.WorkOrderCandidate).filter(
        models.WorkOrderCandidate.work_order_id == work_order.id
    ).all()
    
    viable_count = 0
    for c in candidates:
        # A candidate is viable when:
        # - status is interested, bid_submitted, or negotiating
        # - Vendor has acceptable risk_score (<= 0.25)
        # - Vendor has acceptable license and insurance status
        status_ok = c.status in {"interested", "bid_submitted", "negotiating"}
        vendor = c.vendor
        risk_ok = vendor.risk_score is None or vendor.risk_score <= Decimal("0.25")
        license_ok = vendor.license_status in {"verified", "not_required", None}
        insurance_ok = vendor.insurance_status in {"verified", "not_required", None}
        
        if status_ok and risk_ok and license_ok and insurance_ok:
            viable_count += 1
            
    old_mode = work_order.bidding_mode
    new_mode = "transparent_auction" if viable_count >= 3 else "private_negotiation"
    
    if old_mode != new_mode:
        work_order.bidding_mode = new_mode
        db.commit()
        create_wo_snapshot(db, work_order, actor_type="system", actor_name="Bidding Mode Evaluator")

# ----------------- Work Orders Endpoints -----------------

@app.post("/api/work-orders", response_model=schemas.WorkOrderOut, status_code=status.HTTP_201_CREATED)
def create_work_order(wo_in: schemas.WorkOrderCreate, db: Session = Depends(get_db)):
    # Verify user exists
    user = db.query(models.User).filter(models.User.id == wo_in.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
        
    db_wo = models.WorkOrder(
        user_id=wo_in.user_id,
        company_id=wo_in.company_id,
        facility_id=wo_in.facility_id,
        title=wo_in.title,
        description=wo_in.description,
        trade=wo_in.trade,
        task_type=wo_in.task_type,
        status=wo_in.status,
        requested_start_at=wo_in.requested_start_at,
        target_budget_cents=wo_in.target_budget_cents,
        max_price_cents=wo_in.max_price_cents,
        bid_deadline_at=wo_in.bid_deadline_at,
        urgency=wo_in.urgency,
        bidding_mode=wo_in.bidding_mode,
        selected_vendor_id=wo_in.selected_vendor_id,
        accepted_bid_id=wo_in.accepted_bid_id,
        accepted_price_cents=wo_in.accepted_price_cents,
        scheduled_start_at=wo_in.scheduled_start_at,
        confirmation_status=wo_in.confirmation_status,
        completed_vendor_quality_score=wo_in.completed_vendor_quality_score,
    )
    db.add(db_wo)
    db.commit()
    db.refresh(db_wo)
    
    # Record initial state snapshot
    create_wo_snapshot(db, db_wo, actor_type=wo_in.actor_type, actor_name=wo_in.actor_name)
    
    return db_wo

@app.get("/api/work-orders", response_model=List[schemas.WorkOrderOut])
def list_work_orders(db: Session = Depends(get_db)):
    return db.query(models.WorkOrder).all()

@app.get("/api/work-orders/{id}", response_model=schemas.WorkOrderOut)
def get_work_order(id: str, db: Session = Depends(get_db)):
    wo = db.query(models.WorkOrder).filter(models.WorkOrder.id == id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    return wo

@app.patch("/api/work-orders/{id}", response_model=schemas.WorkOrderOut)
def patch_work_order(id: str, wo_update: schemas.WorkOrderUpdate, db: Session = Depends(get_db)):
    wo = db.query(models.WorkOrder).filter(models.WorkOrder.id == id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
        
    update_data = wo_update.model_dump(exclude_unset=True)
    actor_type = update_data.pop("actor_type", "human")
    actor_name = update_data.pop("actor_name", None)
    
    # Identify if important fields are changing
    important_fields = {
        "status", "title", "description", "trade", "task_type",
        "target_budget_cents", "max_price_cents", "selected_vendor_id",
        "accepted_bid_id", "accepted_price_cents", "scheduled_start_at",
        "completed_vendor_quality_score"
    }
    
    changed = False
    for key, val in update_data.items():
        if key in important_fields:
            current_val = getattr(wo, key)
            # Compare datetime or decimal values cleanly
            if current_val != val:
                changed = True
        setattr(wo, key, val)
        
    if update_data:
        wo.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(wo)
        
    if changed:
        create_wo_snapshot(db, wo, actor_type=actor_type, actor_name=actor_name)
        
    return wo

# ----------------- Vendor Search Endpoints -----------------

@app.get("/api/vendors", response_model=List[schemas.VendorOut])
def list_vendors(
    city: Optional[str] = Query(None),
    trade: Optional[str] = Query(None),
    task_type: Optional[str] = Query(None),
    target_budget: Optional[int] = Query(None),
    rating: Optional[float] = Query(None),
    license_status: Optional[str] = Query(None),
    insurance_status: Optional[str] = Query(None),
    quality_score: Optional[float] = Query(None),
    availability_score: Optional[float] = Query(None),
    risk_score: Optional[float] = Query(None),
    min_price_fit: Optional[float] = Query(None),
    db: Session = Depends(get_db)
):
    if target_budget is not None and target_budget <= 0:
        raise HTTPException(status_code=400, detail="target_budget must be greater than 0")

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
    
    # Calculate price fit dynamically if trade and city are specified
    if trade and city:
        # Fetch stats for all vendors in this trade and city
        stats = db.query(models.VendorTaskStat).filter(
            models.VendorTaskStat.trade.ilike(trade),
            models.VendorTaskStat.city.ilike(city)
        ).all()
        
        # Optionally filter stats by task_type if provided
        if task_type:
            stats = [s for s in stats if s.task_type.lower() == task_type.lower()]
            
        stats_by_vendor = {s.vendor_id: s.median_price_cents for s in stats}
        
        # Calculate reference price for relative fit if no budget provided
        avg_median = 0
        if stats_by_vendor and target_budget is None:
            avg_median = sum(stats_by_vendor.values()) / len(stats_by_vendor)
            
        filtered_vendors = []
        for v in vendors:
            median_price = stats_by_vendor.get(v.id)
            if median_price is None:
                # No price stat, price fit cannot be computed
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
            
            # Attach price_fit to vendor model dynamically for filtering
            v.price_fit = price_fit
            
            # Apply min_price_fit filter
            if min_price_fit is not None:
                if price_fit is None or price_fit < min_price_fit:
                    continue
            filtered_vendors.append(v)
            
        return filtered_vendors
        
    # If no trade/city, filter min_price_fit out since it's not computable
    if min_price_fit is not None:
        return []
        
    return vendors

@app.get("/api/vendors/{id}", response_model=schemas.VendorOut)
def get_vendor(id: str, db: Session = Depends(get_db)):
    v = db.query(models.Vendor).filter(models.Vendor.id == id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return v

@app.post("/api/vendors/{id}/contact", response_model=schemas.CommunicationEventOut)
def contact_vendor(
    id: str,
    work_order_id: str = Query(...),
    channel: str = Query(...),
    body: str = Query(...),
    direction: str = Query("outbound"),
    actor_type: str = Query("facility_manager"),
    actor_name: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    # Verify vendor exists
    v = db.query(models.Vendor).filter(models.Vendor.id == id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")
        
    # Verify work order exists
    wo = db.query(models.WorkOrder).filter(models.WorkOrder.id == work_order_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
        
    # Get or create candidate (idempotent candidate creation)
    candidate = db.query(models.WorkOrderCandidate).filter(
        models.WorkOrderCandidate.work_order_id == work_order_id,
        models.WorkOrderCandidate.vendor_id == id
    ).first()
    
    if not candidate:
        candidate = models.WorkOrderCandidate(
            work_order_id=work_order_id,
            vendor_id=id,
            status="contact_pending",
            last_contacted_at=datetime.utcnow(),
            next_action="awaiting response"
        )
        db.add(candidate)
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            candidate = db.query(models.WorkOrderCandidate).filter(
                models.WorkOrderCandidate.work_order_id == work_order_id,
                models.WorkOrderCandidate.vendor_id == id
            ).first()
            if not candidate:
                raise HTTPException(status_code=409, detail="Candidate already exists") from exc
        db.refresh(candidate)
    else:
        candidate.status = "contacted"
        candidate.last_contacted_at = datetime.utcnow()
        candidate.next_action = "awaiting response"
        db.commit()
        db.refresh(candidate)
        
    # Write communication event
    event = models.CommunicationEvent(
        work_order_id=work_order_id,
        work_order_candidate_id=candidate.id,
        channel=channel,
        direction=direction,
        actor_type=actor_type,
        actor_name=actor_name,
        body=body,
        created_at=datetime.utcnow()
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    
    return event

# ----------------- Candidates Endpoints -----------------

@app.get("/api/work-orders/{id}/candidates", response_model=List[schemas.WorkOrderCandidateOut])
def list_work_order_candidates(id: str, db: Session = Depends(get_db)):
    # Verify work order
    wo = db.query(models.WorkOrder).filter(models.WorkOrder.id == id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    return db.query(models.WorkOrderCandidate).filter(models.WorkOrderCandidate.work_order_id == id).all()

@app.get("/api/work-order-candidates/{id}", response_model=schemas.WorkOrderCandidateOut)
def get_work_order_candidate(id: str, db: Session = Depends(get_db)):
    c = db.query(models.WorkOrderCandidate).filter(models.WorkOrderCandidate.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return c

@app.patch("/api/work-order-candidates/{id}", response_model=schemas.WorkOrderCandidateOut)
def patch_work_order_candidate(id: str, update: schemas.WorkOrderCandidateUpdate, db: Session = Depends(get_db)):
    c = db.query(models.WorkOrderCandidate).filter(models.WorkOrderCandidate.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    update_data = update.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(c, key, val)
        
    if update_data:
        c.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(c)
        
        # Trigger bidding mode evaluation if status changed
        if "status" in update_data:
            update_bidding_mode_if_needed(db, c.work_order)
            
    return c

@app.post("/api/work-orders/{id}/candidates", response_model=schemas.WorkOrderCandidateOut, status_code=status.HTTP_201_CREATED)
def create_candidate_endpoint(id: str, vendor_id: str = Query(...), db: Session = Depends(get_db)):
    # Verify work order & vendor
    wo = db.query(models.WorkOrder).filter(models.WorkOrder.id == id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
        
    # Enforce uniqueness and check idempotency
    existing = db.query(models.WorkOrderCandidate).filter(
        models.WorkOrderCandidate.work_order_id == id,
        models.WorkOrderCandidate.vendor_id == vendor_id
    ).first()
    
    if existing:
        return existing
        
    c = models.WorkOrderCandidate(
        work_order_id=id,
        vendor_id=vendor_id,
        status="discovered"
    )
    db.add(c)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        existing = db.query(models.WorkOrderCandidate).filter(
            models.WorkOrderCandidate.work_order_id == id,
            models.WorkOrderCandidate.vendor_id == vendor_id
        ).first()
        if existing:
            return existing
        raise HTTPException(status_code=409, detail="Candidate already exists") from exc
    db.refresh(c)
    return c

@app.post("/api/work-order-candidates/{id}/contact", response_model=schemas.CommunicationEventOut)
def contact_candidate_direct(
    id: str,
    channel: str = Query(...),
    body: str = Query(...),
    direction: str = Query("outbound"),
    actor_type: str = Query("facility_manager"),
    actor_name: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    c = db.query(models.WorkOrderCandidate).filter(models.WorkOrderCandidate.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    c.status = "contacted"
    c.last_contacted_at = datetime.utcnow()
    c.next_action = "awaiting response"
    db.commit()
    db.refresh(c)
    
    event = models.CommunicationEvent(
        work_order_id=c.work_order_id,
        work_order_candidate_id=c.id,
        channel=channel,
        direction=direction,
        actor_type=actor_type,
        actor_name=actor_name,
        body=body,
        created_at=datetime.utcnow()
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    
    return event

@app.post("/api/work-order-candidates/{id}/messages", response_model=schemas.CommunicationEventOut)
def message_candidate_inbound(
    id: str,
    body: str = Query(...),
    channel: str = Query("sms"),
    db: Session = Depends(get_db)
):
    c = db.query(models.WorkOrderCandidate).filter(models.WorkOrderCandidate.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    c.status = "responded"
    c.next_action = "review response"
    db.commit()
    db.refresh(c)
    
    event = models.CommunicationEvent(
        work_order_id=c.work_order_id,
        work_order_candidate_id=c.id,
        channel=channel,
        direction="inbound",
        actor_type="vendor",
        actor_name=c.vendor.name,
        body=body,
        created_at=datetime.utcnow()
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    
    return event

# ----------------- Bids Endpoints -----------------

@app.get("/api/work-orders/{id}/bids", response_model=List[schemas.BidOut])
def list_work_order_bids(id: str, db: Session = Depends(get_db)):
    wo = db.query(models.WorkOrder).filter(models.WorkOrder.id == id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    return db.query(models.Bid).filter(models.Bid.work_order_id == id).all()

@app.post("/api/work-orders/{id}/bids", response_model=schemas.BidOut, status_code=status.HTTP_201_CREATED)
def create_bid(id: str, bid: schemas.BidCreate, db: Session = Depends(get_db)):
    # Verify work order
    wo = db.query(models.WorkOrder).filter(models.WorkOrder.id == id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
        
    # Verify candidate
    candidate = db.query(models.WorkOrderCandidate).filter(
        models.WorkOrderCandidate.id == bid.work_order_candidate_id
    ).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if candidate.work_order_id != id:
        raise HTTPException(status_code=400, detail="Candidate does not belong to this work order")
        
    db_bid = models.Bid(
        work_order_id=id,
        work_order_candidate_id=bid.work_order_candidate_id,
        amount_cents=bid.amount_cents,
        arrival_window_start=bid.arrival_window_start,
        arrival_window_end=bid.arrival_window_end,
        scope_notes=bid.scope_notes,
        status=bid.status,
        submitted_at=datetime.utcnow(),
        created_at=datetime.utcnow()
    )
    db.add(db_bid)
    
    # Update candidate status to bid_submitted
    candidate.status = "bid_submitted"
    candidate.quoted_price_cents = bid.amount_cents
    candidate.available_start_at = bid.arrival_window_start
    candidate.available_end_at = bid.arrival_window_end
    
    db.commit()
    db.refresh(db_bid)
    db.refresh(candidate)
    
    # Trigger bidding mode evaluation
    update_bidding_mode_if_needed(db, wo)
    
    return db_bid

@app.patch("/api/bids/{id}", response_model=schemas.BidOut)
def patch_bid(id: str, bid_up: schemas.BidUpdate, db: Session = Depends(get_db)):
    db_bid = db.query(models.Bid).filter(models.Bid.id == id).first()
    if not db_bid:
        raise HTTPException(status_code=404, detail="Bid not found")
        
    up_data = bid_up.model_dump(exclude_unset=True)
    for key, val in up_data.items():
        setattr(db_bid, key, val)
        
    if up_data:
        db.commit()
        db.refresh(db_bid)
        
    # If the status is updated to accepted, award the work order
    if up_data.get("status") == "accepted":
        wo = db_bid.work_order
        previous_accepted_bids = db.query(models.Bid).filter(
            models.Bid.work_order_id == wo.id,
            models.Bid.id != db_bid.id,
            models.Bid.status == "accepted"
        ).all()
        for previous_bid in previous_accepted_bids:
            previous_bid.status = "rejected"

        wo.status = "awarded"
        wo.accepted_bid_id = db_bid.id
        wo.accepted_price_cents = db_bid.amount_cents
        wo.selected_vendor_id = db_bid.candidate.vendor_id
        
        # Also update candidate status to selected
        db_bid.candidate.status = "selected"
        
        # Other candidates can be marked as not_selected
        other_candidates = db.query(models.WorkOrderCandidate).filter(
            models.WorkOrderCandidate.work_order_id == wo.id,
            models.WorkOrderCandidate.id != db_bid.work_order_candidate_id
        ).all()
        for oc in other_candidates:
            oc.status = "not_selected"
            
        db.commit()
        db.refresh(wo)
        db.refresh(db_bid.candidate)
        
        create_wo_snapshot(db, wo, actor_type="system", actor_name="Bid Acceptor")
        
    return db_bid

# ----------------- Timeline & Audit Trails Endpoints -----------------

@app.get("/api/work-orders/{id}/states", response_model=List[schemas.WorkOrderStateOut])
def list_work_order_states(id: str, db: Session = Depends(get_db)):
    wo = db.query(models.WorkOrder).filter(models.WorkOrder.id == id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    return db.query(models.WorkOrderState).filter(models.WorkOrderState.work_order_id == id).order_by(models.WorkOrderState.created_at.asc()).all()

@app.get("/api/work-orders/{id}/timeline")
def get_work_order_timeline(id: str, db: Session = Depends(get_db)):
    # Verify work order
    wo = db.query(models.WorkOrder).filter(models.WorkOrder.id == id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
        
    timeline = []
    
    # 1. Fetch communication events
    comms = db.query(models.CommunicationEvent).filter(models.CommunicationEvent.work_order_id == id).all()
    for c in comms:
        timeline.append({
            "type": "communication_event",
            "timestamp": c.created_at,
            "data": schemas.CommunicationEventOut.model_validate(c)
        })
        
    # 2. Fetch bids
    bids = db.query(models.Bid).filter(models.Bid.work_order_id == id).all()
    for b in bids:
        timeline.append({
            "type": "bid",
            "timestamp": b.submitted_at,
            "data": schemas.BidOut.model_validate(b)
        })
        
    # 3. Fetch state transitions
    states = db.query(models.WorkOrderState).filter(models.WorkOrderState.work_order_id == id).all()
    for s in states:
        timeline.append({
            "type": "state_snapshot",
            "timestamp": s.created_at,
            "data": schemas.WorkOrderStateOut.model_validate(s)
        })
        
    # Sort chronologically by timestamp
    timeline.sort(key=lambda item: item["timestamp"])
    
    return timeline

# ----------------- Chat Endpoints -----------------

@app.post("/api/chat-sessions", response_model=schemas.ChatSessionOut, status_code=status.HTTP_201_CREATED)
def create_chat_session(session: schemas.ChatSessionCreate, db: Session = Depends(get_db)):
    # Verify user
    user = db.query(models.User).filter(models.User.id == session.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
        
    db_session = models.ChatSession(
        user_id=session.user_id,
        work_order_id=session.work_order_id,
        status=session.status,
        summary=session.summary,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@app.get("/api/chat-sessions/{id}", response_model=schemas.ChatSessionOut)
def get_chat_session(id: str, db: Session = Depends(get_db)):
    s = db.query(models.ChatSession).filter(models.ChatSession.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return s

@app.post("/api/chat-sessions/{id}/messages", response_model=schemas.ChatMessageOut, status_code=status.HTTP_201_CREATED)
def create_chat_message(id: str, msg: schemas.ChatMessageCreate, db: Session = Depends(get_db)):
    s = db.query(models.ChatSession).filter(models.ChatSession.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    db_msg = models.ChatMessage(
        chat_session_id=id,
        work_order_id=msg.work_order_id or s.work_order_id,
        role=msg.role,
        body=msg.body,
        extracted_fields=msg.extracted_fields,
        created_at=datetime.utcnow()
    )
    db.add(db_msg)
    
    # Update chat session updated_at
    s.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_msg)
    return db_msg

@app.post("/api/llm/messages", response_model=schemas.LlmMessageResponse)
def post_llm_message(req: schemas.LlmMessageRequest, db: Session = Depends(get_db)):
    from . import llm
    
    # 1. Fetch or create chat session
    if req.chat_session_id:
        chat_session = db.query(models.ChatSession).filter(models.ChatSession.id == req.chat_session_id).first()
        if not chat_session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        if req.work_order_id and not chat_session.work_order_id:
            chat_session.work_order_id = req.work_order_id
            db.commit()
    else:
        # Get default seeded facility manager
        user = db.query(models.User).filter(models.User.user_type == "facility_manager").first()
        if not user:
            user = models.User(
                name="Apex Seeded Manager",
                email="karthik@tavi.com",
                user_type="facility_manager"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
        chat_session = models.ChatSession(
            user_id=user.id,
            work_order_id=req.work_order_id,
            status="active",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(chat_session)
        db.commit()
        db.refresh(chat_session)
        
    # 2. Run the LLM conversation loop
    res = llm.run_llm_conversation(db, chat_session, req.message)
    
    return schemas.LlmMessageResponse(
        response=res["response"],
        chat_session_id=res["chat_session_id"],
        work_order_id=res["work_order_id"],
        tool_calls=res["tool_calls"]
    )
