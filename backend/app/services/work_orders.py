from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from .. import models


def create_wo_snapshot(
    db: Session,
    work_order: models.WorkOrder,
    actor_type: str,
    actor_name: Optional[str] = None,
):
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
        created_at=datetime.utcnow(),
    )
    db.add(snapshot)
    db.commit()


def update_bidding_mode_if_needed(db: Session, work_order: models.WorkOrder):
    candidates = db.query(models.WorkOrderCandidate).filter(
        models.WorkOrderCandidate.work_order_id == work_order.id
    ).all()

    viable_count = 0
    for candidate in candidates:
        status_ok = candidate.status in {"interested", "bid_submitted", "negotiating"}
        vendor = candidate.vendor
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
