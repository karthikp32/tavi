from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from .. import models


def get_accessible_work_order(
    db: Session,
    work_order_id: str,
    actor: Dict[str, Any],
) -> Optional[models.WorkOrder]:
    query = db.query(models.WorkOrder).filter(models.WorkOrder.id == work_order_id)
    if actor["type"] == "facility_manager":
        return query.filter(models.WorkOrder.user_id == actor["id"]).first()
    if actor["type"] == "vendor":
        return (
            query.join(
                models.WorkOrderCandidate,
                models.WorkOrderCandidate.work_order_id == models.WorkOrder.id,
            )
            .filter(models.WorkOrderCandidate.vendor_id == actor["id"])
            .first()
        )
    return None
