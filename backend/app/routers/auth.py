from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/auth")


@router.post("/login", response_model=schemas.LoginResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    credential = payload.token.strip()
    user = db.query(models.User).filter(models.User.login_token == credential).first()
    vendor = db.query(models.Vendor).filter(models.Vendor.login_token == credential).first()

    if user and vendor:
        raise HTTPException(status_code=401, detail="Invalid token")

    if user:
        return schemas.LoginResponse(
            id=user.id,
            type=user.user_type,
            name=user.name,
            trade=user.trade,
            company_id=user.company_id,
            login_token=user.login_token,
        )

    if vendor:
        return schemas.LoginResponse(
            id=vendor.id,
            type="vendor",
            name=vendor.name,
            trade=vendor.trade,
            company_id=vendor.company_id,
            login_token=vendor.login_token,
        )

    raise HTTPException(status_code=401, detail="Invalid token")
