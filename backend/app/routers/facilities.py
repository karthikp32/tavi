from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..dependencies.auth import get_current_user

router = APIRouter(prefix="/api/facilities")


@router.get("", response_model=List[schemas.FacilityOut])
def list_facilities(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Facility).filter(models.Facility.user_id == current_user.id).all()


@router.post("", response_model=schemas.FacilityOut, status_code=status.HTTP_201_CREATED)
def create_facility(
    facility_in: schemas.FacilityCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    facility_data = facility_in.model_dump()
    facility_data["user_id"] = current_user.id
    db_facility = models.Facility(**facility_data)
    db.add(db_facility)
    db.commit()
    db.refresh(db_facility)
    return db_facility
