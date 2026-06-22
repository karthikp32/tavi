from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..services.candidates import get_or_create_candidate, record_communication_event
from ..services.work_orders import update_bidding_mode_if_needed

router = APIRouter()


@router.get("/api/work-orders/{id}/candidates", response_model=List[schemas.WorkOrderCandidateOut])
def list_work_order_candidates(id: str, db: Session = Depends(get_db)):
    work_order = db.query(models.WorkOrder).filter(models.WorkOrder.id == id).first()
    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")
    return db.query(models.WorkOrderCandidate).filter(models.WorkOrderCandidate.work_order_id == id).all()


@router.get("/api/work-order-candidates/{id}", response_model=schemas.WorkOrderCandidateOut)
def get_work_order_candidate(id: str, db: Session = Depends(get_db)):
    candidate = db.query(models.WorkOrderCandidate).filter(models.WorkOrderCandidate.id == id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@router.patch("/api/work-order-candidates/{id}", response_model=schemas.WorkOrderCandidateOut)
def patch_work_order_candidate(id: str, update: schemas.WorkOrderCandidateUpdate, db: Session = Depends(get_db)):
    candidate = db.query(models.WorkOrderCandidate).filter(models.WorkOrderCandidate.id == id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    update_data = update.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(candidate, key, val)

    if update_data:
        candidate.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(candidate)

        if "status" in update_data:
            update_bidding_mode_if_needed(db, candidate.work_order)

    return candidate


@router.post(
    "/api/work-orders/{id}/candidates",
    response_model=schemas.WorkOrderCandidateOut,
    status_code=status.HTTP_201_CREATED,
)
def create_candidate_endpoint(id: str, vendor_id: str = Query(...), db: Session = Depends(get_db)):
    work_order = db.query(models.WorkOrder).filter(models.WorkOrder.id == id).first()
    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    return get_or_create_candidate(db, id, vendor_id, create_status="discovered")


@router.post("/api/work-order-candidates/{id}/contact", response_model=schemas.CommunicationEventOut)
def contact_candidate_direct(
    id: str,
    channel: str = Query(...),
    body: str = Query(...),
    direction: str = Query("outbound"),
    actor_type: str = Query("facility_manager"),
    actor_name: Optional[str] = Query(None),
    sender_id: Optional[str] = Query(None),
    sender_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    candidate = db.query(models.WorkOrderCandidate).filter(models.WorkOrderCandidate.id == id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    candidate.status = "contacted"
    candidate.last_contacted_at = datetime.utcnow()
    candidate.next_action = "awaiting response"
    db.commit()
    db.refresh(candidate)

    return record_communication_event(
        db,
        work_order_id=candidate.work_order_id,
        candidate_id=candidate.id,
        channel=channel,
        direction=direction,
        actor_type=actor_type,
        actor_name=actor_name,
        sender_id=sender_id,
        sender_type=sender_type,
        body=body,
    )


@router.post("/api/work-order-candidates/{id}/messages", response_model=schemas.CommunicationEventOut)
def message_candidate_inbound(
    id: str,
    body: str = Query(...),
    channel: str = Query("sms"),
    db: Session = Depends(get_db),
):
    candidate = db.query(models.WorkOrderCandidate).filter(models.WorkOrderCandidate.id == id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    candidate.status = "responded"
    candidate.next_action = "review response"
    db.commit()
    db.refresh(candidate)

    return record_communication_event(
        db,
        work_order_id=candidate.work_order_id,
        candidate_id=candidate.id,
        channel=channel,
        direction="inbound",
        actor_type="vendor",
        actor_name=candidate.vendor.name,
        sender_id=candidate.vendor_id,
        sender_type="vendor",
        body=body,
    )
