from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..services.candidates import get_or_create_candidate, record_communication_event

router = APIRouter(prefix="/api/vendors")


@router.get("", response_model=List[schemas.VendorOut])
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
    db: Session = Depends(get_db),
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

    if trade and city:
        stats = db.query(models.VendorTaskStat).filter(
            models.VendorTaskStat.trade.ilike(trade),
            models.VendorTaskStat.city.ilike(city),
        ).all()

        if task_type:
            stats = [s for s in stats if s.task_type.lower() == task_type.lower()]

        stats_by_vendor = {s.vendor_id: s.median_price_cents for s in stats}

        avg_median = 0
        if stats_by_vendor and target_budget is None:
            avg_median = sum(stats_by_vendor.values()) / len(stats_by_vendor)

        filtered_vendors = []
        for vendor in vendors:
            median_price = stats_by_vendor.get(vendor.id)
            if median_price is None:
                price_fit = None
            elif target_budget is not None:
                if median_price <= target_budget:
                    price_fit = 1.0
                else:
                    price_fit = float(
                        max(
                            Decimal("0.0"),
                            Decimal("1.0")
                            - Decimal(median_price - target_budget) / Decimal(target_budget),
                        )
                    )
            elif avg_median == 0 or median_price <= avg_median:
                price_fit = 1.0
            else:
                price_fit = float(
                    max(
                        Decimal("0.0"),
                        Decimal("1.0") - Decimal(median_price - avg_median) / Decimal(avg_median),
                    )
                )

            vendor.price_fit = price_fit

            if min_price_fit is not None and (price_fit is None or price_fit < min_price_fit):
                continue
            filtered_vendors.append(vendor)

        return filtered_vendors

    if min_price_fit is not None:
        return []

    return vendors


@router.get("/{id}", response_model=schemas.VendorOut)
def get_vendor(id: str, db: Session = Depends(get_db)):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@router.post("/{id}/contact", response_model=schemas.CommunicationEventOut)
def contact_vendor(
    id: str,
    message: schemas.ContactVendorMessage,
    work_order_id: str = Query(...),
    channel: str = Query(...),
    direction: str = Query("outbound"),
    actor_type: str = Query("facility_manager"),
    db: Session = Depends(get_db),
):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    work_order = db.query(models.WorkOrder).filter(models.WorkOrder.id == work_order_id).first()
    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")

    candidate = get_or_create_candidate(
        db,
        work_order_id,
        id,
        create_status="contact_pending",
        existing_status="contacted",
        next_action="awaiting response",
    )
    event = record_communication_event(
        db,
        work_order_id=work_order_id,
        candidate_id=candidate.id,
        channel=channel,
        direction=direction,
        actor_type=actor_type,
        actor_name=message.actor_name,
        sender_id=message.sender_id,
        sender_type=message.sender_type,
        body=message.body,
    )
    db.commit()
    db.refresh(event)
    return event
