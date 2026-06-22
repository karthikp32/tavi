from datetime import datetime
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..dependencies.auth import get_current_user
from ..seed import seed_db

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
@router.get("/")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow()}


@router.post("/api/seed", status_code=status.HTTP_200_OK)
def seed_database(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.user_type != "facility_manager":
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        seed_db(db)
        return {"message": "Database seeded successfully"}
    except Exception as e:
        logger.exception("Database seed failed")
        raise HTTPException(status_code=500, detail="Database seed failed") from e
