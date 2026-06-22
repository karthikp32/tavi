from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..dependencies.auth import get_current_user, get_optional_current_user
from ..services.work_orders import create_wo_snapshot

router = APIRouter(prefix="/api/work-orders")


@router.post("", response_model=schemas.WorkOrderOut, status_code=status.HTTP_201_CREATED)
def create_work_order(
    wo_in: schemas.WorkOrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_wo = models.WorkOrder(
        user_id=current_user.id,
        company_id=wo_in.company_id or current_user.company_id,
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
        required_arrival_window_start=wo_in.required_arrival_window_start,
        required_arrival_window_end=wo_in.required_arrival_window_end,
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

    create_wo_snapshot(db, db_wo, actor_type=wo_in.actor_type, actor_name=wo_in.actor_name)

    return db_wo


@router.get("", response_model=List[schemas.WorkOrderOut])
def list_work_orders(
    vendor_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_current_user),
):
    query = db.query(models.WorkOrder)
    if current_user:
        query = query.filter(models.WorkOrder.user_id == current_user.id)
    if vendor_id:
        query = query.join(
            models.WorkOrderCandidate,
            models.WorkOrderCandidate.work_order_id == models.WorkOrder.id,
        ).filter(models.WorkOrderCandidate.vendor_id == vendor_id)
    return query.all()


@router.get("/{id}", response_model=schemas.WorkOrderOut)
def get_work_order(
    id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    wo = db.query(models.WorkOrder).filter(
        models.WorkOrder.id == id,
        models.WorkOrder.user_id == current_user.id,
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    return wo


@router.patch("/{id}", response_model=schemas.WorkOrderOut)
def patch_work_order(
    id: str,
    wo_update: schemas.WorkOrderUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    wo = db.query(models.WorkOrder).filter(
        models.WorkOrder.id == id,
        models.WorkOrder.user_id == current_user.id,
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")

    update_data = wo_update.model_dump(exclude_unset=True)
    actor_type = update_data.pop("actor_type", "human")
    actor_name = update_data.pop("actor_name", None)

    important_fields = {
        "status", "title", "description", "trade", "task_type",
        "target_budget_cents", "max_price_cents", "selected_vendor_id",
        "accepted_bid_id", "accepted_price_cents", "scheduled_start_at",
        "completed_vendor_quality_score",
    }

    changed = False
    for key, val in update_data.items():
        if key in important_fields and getattr(wo, key) != val:
            changed = True
        setattr(wo, key, val)

    if update_data:
        wo.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(wo)

    if changed:
        create_wo_snapshot(db, wo, actor_type=actor_type, actor_name=actor_name)

    return wo
