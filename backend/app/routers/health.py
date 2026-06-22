from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..seed import seed_db

router = APIRouter()


@router.get("/health")
@router.get("/")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow()}


@router.post("/api/seed", status_code=status.HTTP_200_OK)
def seed_database(db: Session = Depends(get_db)):
    try:
        seed_db(db)
        return {"message": "Database seeded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
