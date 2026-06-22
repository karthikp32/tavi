from typing import Any, Dict, Optional

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db


def get_current_user(
    x_tavi_login_token: str = Header(...),
    db: Session = Depends(get_db),
) -> models.User:
    user = db.query(models.User).filter(models.User.login_token == x_tavi_login_token).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid login token")
    return user


def get_optional_current_user(
    x_tavi_login_token: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[models.User]:
    if not x_tavi_login_token:
        return None
    return db.query(models.User).filter(models.User.login_token == x_tavi_login_token).first()


def get_current_llm_actor(
    x_tavi_login_token: str = Header(...),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    user = db.query(models.User).filter(models.User.login_token == x_tavi_login_token).first()
    if user:
        return {"id": user.id, "type": user.user_type, "user": user, "vendor": None}

    vendor = db.query(models.Vendor).filter(models.Vendor.login_token == x_tavi_login_token).first()
    if vendor:
        return {"id": vendor.id, "type": "vendor", "user": None, "vendor": vendor}

    raise HTTPException(status_code=401, detail="Invalid login token")
