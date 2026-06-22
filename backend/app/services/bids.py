from sqlalchemy.orm import Session

from .. import models
from .work_orders import create_wo_snapshot


def accept_bid(db: Session, bid: models.Bid, *, actor_type: str, actor_name: str) -> None:
    work_order = bid.work_order
    previous_accepted_bids = db.query(models.Bid).filter(
        models.Bid.work_order_id == work_order.id,
        models.Bid.id != bid.id,
        models.Bid.status == "accepted",
    ).all()
    for previous_bid in previous_accepted_bids:
        previous_bid.status = "rejected"

    work_order.status = "awarded"
    work_order.accepted_bid_id = bid.id
    work_order.accepted_price_cents = bid.amount_cents
    work_order.selected_vendor_id = bid.candidate.vendor_id

    bid.candidate.status = "selected"

    other_candidates = db.query(models.WorkOrderCandidate).filter(
        models.WorkOrderCandidate.work_order_id == work_order.id,
        models.WorkOrderCandidate.id != bid.work_order_candidate_id,
    ).all()
    for candidate in other_candidates:
        candidate.status = "not_selected"

    create_wo_snapshot(db, work_order, actor_type=actor_type, actor_name=actor_name)
