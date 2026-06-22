from datetime import datetime
from typing import Any, Dict

import anyio
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..dependencies.auth import get_current_llm_actor
from ..services.authorization import get_accessible_work_order

router = APIRouter(prefix="/api/llm")


@router.post("/messages", response_model=schemas.LlmMessageResponse)
def post_llm_message(
    req: schemas.LlmMessageRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_actor: Dict[str, Any] = Depends(get_current_llm_actor),
):
    from .. import llm

    class ClientDisconnectCancel:
        def is_set(self) -> bool:
            return anyio.from_thread.run(request.is_disconnected)

    actor_type = req.actor_type or current_actor["type"]
    if actor_type not in {"facility_manager", "vendor"}:
        raise HTTPException(status_code=400, detail="Invalid actor_type")
    if actor_type != current_actor["type"]:
        raise HTTPException(status_code=403, detail="Actor type does not match login token")

    actor_id = req.actor_id or current_actor["id"]
    if actor_id != current_actor["id"]:
        raise HTTPException(status_code=403, detail="Actor does not match login token")

    if req.work_order_id and not get_accessible_work_order(db, req.work_order_id, current_actor):
        raise HTTPException(status_code=404, detail="Work order not found")

    if req.chat_session_id:
        chat_session = db.query(models.ChatSession).filter(
            models.ChatSession.id == req.chat_session_id,
        ).first()
        if not chat_session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        if chat_session.user_id != actor_id:
            raise HTTPException(status_code=403, detail="Chat session does not belong to this actor")
        if req.work_order_id and not chat_session.work_order_id:
            chat_session.work_order_id = req.work_order_id
            db.commit()
    else:
        chat_session = models.ChatSession(
            user_id=actor_id,
            work_order_id=req.work_order_id,
            status="active",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(chat_session)
        db.commit()
        db.refresh(chat_session)

    try:
        res = llm.run_llm_conversation(
            db,
            chat_session,
            req.message,
            ClientDisconnectCancel(),
            actor_type=actor_type,
            actor_id=actor_id,
        )
    except llm.LlmRequestCancelled:
        raise HTTPException(status_code=499, detail="Message cancelled")

    return schemas.LlmMessageResponse(
        response=res["response"],
        chat_session_id=res["chat_session_id"],
        work_order_id=res["work_order_id"],
        tool_calls=res["tool_calls"],
    )
