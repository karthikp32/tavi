from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..services.bids import accept_bid
from ..services.work_orders import update_bidding_mode_if_needed

router = APIRouter()


@router.get("/api/work-orders/{id}/bids", response_model=List[schemas.BidOut])
def list_work_order_bids(id: str, db: Session = Depends(get_db)):
    work_order = db.query(models.WorkOrder).filter(models.WorkOrder.id == id).first()
    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")
    return db.query(models.Bid).filter(models.Bid.work_order_id == id).all()


@router.post("/api/work-orders/{id}/bids", response_model=schemas.BidOut, status_code=status.HTTP_201_CREATED)
def create_bid(id: str, bid: schemas.BidCreate, db: Session = Depends(get_db)):
    work_order = db.query(models.WorkOrder).filter(models.WorkOrder.id == id).first()
    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")

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
        created_at=datetime.utcnow(),
    )
    db.add(db_bid)

    candidate.status = "bid_submitted"
    candidate.quoted_price_cents = bid.amount_cents
    candidate.available_start_at = bid.arrival_window_start
    candidate.available_end_at = bid.arrival_window_end

    db.flush()
    db.refresh(db_bid)
    db.refresh(candidate)

    update_bidding_mode_if_needed(db, work_order)
    db.commit()
    db.refresh(db_bid)

    return db_bid


@router.patch("/api/bids/{id}", response_model=schemas.BidOut)
def patch_bid(id: str, bid_up: schemas.BidUpdate, db: Session = Depends(get_db)):
    db_bid = db.query(models.Bid).filter(models.Bid.id == id).first()
    if not db_bid:
        raise HTTPException(status_code=404, detail="Bid not found")

    up_data = bid_up.model_dump(exclude_unset=True)
    for key, val in up_data.items():
        setattr(db_bid, key, val)

    if up_data:
        db.flush()
        db.refresh(db_bid)

    if up_data.get("status") == "accepted":
        accept_bid(db, db_bid, actor_type="system", actor_name="Bid Acceptor")
        db.commit()
        db.refresh(db_bid)
    elif up_data:
        db.commit()
        db.refresh(db_bid)

    return db_bid
