from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/work-orders")


@router.get("/{id}/states", response_model=List[schemas.WorkOrderStateOut])
def list_work_order_states(id: str, db: Session = Depends(get_db)):
    work_order = db.query(models.WorkOrder).filter(models.WorkOrder.id == id).first()
    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")
    return (
        db.query(models.WorkOrderState)
        .filter(models.WorkOrderState.work_order_id == id)
        .order_by(models.WorkOrderState.created_at.asc())
        .all()
    )


@router.get("/{id}/timeline")
def get_work_order_timeline(id: str, db: Session = Depends(get_db)):
    work_order = db.query(models.WorkOrder).filter(models.WorkOrder.id == id).first()
    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")

    timeline = []

    comms = db.query(models.CommunicationEvent).filter(models.CommunicationEvent.work_order_id == id).all()
    for comm in comms:
        timeline.append({
            "type": "communication_event",
            "timestamp": comm.created_at,
            "data": schemas.CommunicationEventOut.model_validate(comm),
        })

    bids = db.query(models.Bid).filter(models.Bid.work_order_id == id).all()
    for bid in bids:
        timeline.append({
            "type": "bid",
            "timestamp": bid.submitted_at,
            "data": schemas.BidOut.model_validate(bid),
        })

    states = db.query(models.WorkOrderState).filter(models.WorkOrderState.work_order_id == id).all()
    for state in states:
        timeline.append({
            "type": "state_snapshot",
            "timestamp": state.created_at,
            "data": schemas.WorkOrderStateOut.model_validate(state),
        })

    timeline.sort(key=lambda item: item["timestamp"])

    return timeline
