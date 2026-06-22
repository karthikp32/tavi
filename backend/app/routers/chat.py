from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..database import get_db
from ..dependencies.auth import get_current_llm_actor

router = APIRouter(prefix="/api/chat-sessions")


@router.post("", response_model=schemas.ChatSessionOut, status_code=status.HTTP_201_CREATED)
def create_chat_session(
    session: schemas.ChatSessionCreate,
    db: Session = Depends(get_db),
    current_actor: Dict[str, Any] = Depends(get_current_llm_actor),
):
    db_session = models.ChatSession(
        user_id=current_actor["id"],
        work_order_id=session.work_order_id,
        status=session.status,
        summary=session.summary,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


@router.get("", response_model=List[schemas.ChatSessionOut])
def list_chat_sessions(
    db: Session = Depends(get_db),
    current_actor: Dict[str, Any] = Depends(get_current_llm_actor),
):
    return (
        db.query(models.ChatSession)
        .options(selectinload(models.ChatSession.messages))
        .filter(models.ChatSession.user_id == current_actor["id"])
        .order_by(models.ChatSession.updated_at.desc())
        .all()
    )


@router.get("/{id}", response_model=schemas.ChatSessionOut)
def get_chat_session(
    id: str,
    db: Session = Depends(get_db),
    current_actor: Dict[str, Any] = Depends(get_current_llm_actor),
):
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == id,
        models.ChatSession.user_id == current_actor["id"],
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session


@router.patch("/{id}", response_model=schemas.ChatSessionOut)
def patch_chat_session(
    id: str,
    update: schemas.ChatSessionUpdate,
    db: Session = Depends(get_db),
    current_actor: Dict[str, Any] = Depends(get_current_llm_actor),
):
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == id,
        models.ChatSession.user_id == current_actor["id"],
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    if update.summary is not None:
        session.summary = update.summary
        session.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat_session(
    id: str,
    db: Session = Depends(get_db),
    current_actor: Dict[str, Any] = Depends(get_current_llm_actor),
):
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == id,
        models.ChatSession.user_id == current_actor["id"],
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    db.delete(session)
    db.commit()
    return None


@router.post("/{id}/messages", response_model=schemas.ChatMessageOut, status_code=status.HTTP_201_CREATED)
def create_chat_message(
    id: str,
    msg: schemas.ChatMessageCreate,
    db: Session = Depends(get_db),
    current_actor: Dict[str, Any] = Depends(get_current_llm_actor),
):
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == id,
        models.ChatSession.user_id == current_actor["id"],
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    db_msg = models.ChatMessage(
        chat_session_id=id,
        work_order_id=msg.work_order_id or session.work_order_id,
        role=msg.role,
        body=msg.body,
        extracted_fields=msg.extracted_fields,
        created_at=datetime.utcnow(),
    )
    db.add(db_msg)

    session.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_msg)
    return db_msg
