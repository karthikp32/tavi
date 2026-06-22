from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models


def get_or_create_candidate(
    db: Session,
    work_order_id: str,
    vendor_id: str,
    *,
    create_status: str,
    existing_status: Optional[str] = None,
    next_action: Optional[str] = None,
) -> models.WorkOrderCandidate:
    candidate = db.query(models.WorkOrderCandidate).filter(
        models.WorkOrderCandidate.work_order_id == work_order_id,
        models.WorkOrderCandidate.vendor_id == vendor_id,
    ).first()

    if candidate:
        if existing_status:
            candidate.status = existing_status
        if next_action:
            candidate.next_action = next_action
        if existing_status or next_action:
            candidate.last_contacted_at = datetime.utcnow()
            db.commit()
            db.refresh(candidate)
        return candidate

    candidate = models.WorkOrderCandidate(
        work_order_id=work_order_id,
        vendor_id=vendor_id,
        status=create_status,
        next_action=next_action,
    )
    if next_action:
        candidate.last_contacted_at = datetime.utcnow()
    db.add(candidate)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        candidate = db.query(models.WorkOrderCandidate).filter(
            models.WorkOrderCandidate.work_order_id == work_order_id,
            models.WorkOrderCandidate.vendor_id == vendor_id,
        ).first()
        if not candidate:
            raise HTTPException(status_code=409, detail="Candidate already exists") from exc
    db.refresh(candidate)
    return candidate


def record_communication_event(
    db: Session,
    *,
    work_order_id: str,
    candidate_id: str,
    channel: str,
    direction: str,
    actor_type: str,
    actor_name: Optional[str],
    sender_id: Optional[str],
    sender_type: Optional[str],
    body: str,
) -> models.CommunicationEvent:
    event = models.CommunicationEvent(
        work_order_id=work_order_id,
        work_order_candidate_id=candidate_id,
        channel=channel,
        direction=direction,
        actor_type=actor_type,
        actor_name=actor_name,
        sender_id=sender_id,
        sender_type=sender_type or actor_type,
        body=body,
        created_at=datetime.utcnow(),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event
