import os
import json
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.seed import seed_db
from app import models, llm

# Use a separate SQLite file for tests
TEST_DATABASE_URL = "sqlite:///./test_llm.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(autouse=True)
def override_db(setup_test_db):
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.pop(get_db, None)

@pytest.fixture
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_db(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    if os.path.exists("./test_llm.db"):
        os.remove("./test_llm.db")

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_session_creation_and_persistence(client, db_session):
    # Call without chat_session_id
    payload = {
        "message": "Hello, I need assistance managing my projects."
    }
    with patch("app.llm.OPENROUTER_API_KEY", ""):
        response = client.post("/api/llm/messages", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["chat_session_id"] is not None
    assert "response" in data
    
    # Verify chat session exists in DB
    session_id = data["chat_session_id"]
    db_session.expire_all()
    session = db_session.query(models.ChatSession).filter(models.ChatSession.id == session_id).first()
    assert session is not None
    
    # Verify messages are persisted
    msgs = db_session.query(models.ChatMessage).filter(models.ChatMessage.chat_session_id == session_id).all()
    assert len(msgs) == 2  # User message + Assistant mock message
    assert msgs[0].role == "facility_manager"
    assert msgs[0].body == "Hello, I need assistance managing my projects."
    assert msgs[1].role == "assistant"

def test_local_demo_mock_mode_trigger(client, db_session):
    # Test that "plumber" triggers a mock search_vendors tool execution when API key is missing
    with patch("app.llm.OPENROUTER_API_KEY", ""):
        payload = {
            "message": "I need a plumber in New York to fix a pipe leak"
        }
        response = client.post("/api/llm/messages", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert len(data["tool_calls"]) > 0
        assert data["tool_calls"][0]["name"] == "search_vendors"
        assert "New York" in data["response"]

def test_contact_tools_side_effects(db_session):
    # Manually trigger execute_tool for send_vendor_email
    # Setup work order and candidate first
    user = db_session.query(models.User).first()
    facility = db_session.query(models.Facility).filter(models.Facility.user_id == user.id).first()
    vendor = db_session.query(models.Vendor).first()
    
    wo = models.WorkOrder(
        user_id=user.id,
        facility_id=facility.id,
        title="Tool test",
        description="Testing contact tools",
        trade="Cleaning",
        status="draft"
    )
    db_session.add(wo)
    db_session.commit()
    
    candidate = models.WorkOrderCandidate(
        work_order_id=wo.id,
        vendor_id=vendor.id,
        status="discovered"
    )
    db_session.add(candidate)
    db_session.commit()
    
    # Execute send_vendor_email
    args = {
        "candidate_id": candidate.id,
        "body": "Hi vendor, can you look at this email?"
    }
    
    res = llm.execute_tool(db_session, "send_vendor_email", args)
    assert res["id"] is not None
    assert res["channel"] == "email"
    
    # Verify candidate status updated
    db_session.refresh(candidate)
    assert candidate.status == "contacted"
    assert candidate.last_contacted_at is not None
    
    # Verify communication event is written
    event = db_session.query(models.CommunicationEvent).filter(
        models.CommunicationEvent.work_order_candidate_id == candidate.id
    ).first()
    assert event is not None
    assert event.channel == "email"
    assert event.body == "Hi vendor, can you look at this email?"
    assert event.sender_type == "agent"

def test_create_bid_tool_rejects_candidate_from_other_work_order(db_session):
    user = db_session.query(models.User).first()
    facility = db_session.query(models.Facility).filter(models.Facility.user_id == user.id).first()
    vendor = db_session.query(models.Vendor).first()

    first_wo = models.WorkOrder(
        user_id=user.id,
        facility_id=facility.id,
        title="First tool work order",
        description="Original job",
        trade="Cleaning",
        status="collecting_bids",
    )
    second_wo = models.WorkOrder(
        user_id=user.id,
        facility_id=facility.id,
        title="Second tool work order",
        description="Different job",
        trade="Cleaning",
        status="collecting_bids",
    )
    db_session.add_all([first_wo, second_wo])
    db_session.commit()

    candidate = models.WorkOrderCandidate(
        work_order_id=first_wo.id,
        vendor_id=vendor.id,
        status="discovered",
    )
    db_session.add(candidate)
    db_session.commit()

    res = llm.execute_tool(
        db_session,
        "create_bid",
        {
            "work_order_id": second_wo.id,
            "work_order_candidate_id": candidate.id,
            "amount_cents": 15000,
            "status": "submitted",
        },
    )

    assert res == {"error": "Candidate does not belong to this work order"}
    db_session.refresh(candidate)
    assert candidate.status == "discovered"
    assert db_session.query(models.Bid).filter(models.Bid.work_order_id == second_wo.id).count() == 0

def test_search_vendors_tool_rejects_non_positive_target_budget(db_session):
    res = llm.execute_tool(
        db_session,
        "search_vendors",
        {
            "city": "New York",
            "trade": "Plumbing",
            "target_budget": 0,
        },
    )

    assert res == {"error": "target_budget must be greater than 0"}

def test_multi_turn_tool_execution_loop(client, db_session):
    # Mock OpenRouter API call returning a tool call first, then a text response
    user = db_session.query(models.User).first()
    
    # Create an active chat session
    chat_session = models.ChatSession(
        user_id=user.id,
        status="active"
    )
    db_session.add(chat_session)
    db_session.commit()
    
    mock_headers = {
        "Authorization": "Bearer mock_key",
        "Content-Type": "application/json"
    }
    
    # Configure mock responses for OpenRouter
    # First response: call create_work_order
    # Second response: final text response
    res1_mock = MagicMock()
    res1_mock.status_code = 200
    res1_mock.json.return_value = {
        "choices": [{
            "message": {
                "role": "assistant",
                "content": None,
                "tool_calls": [{
                    "id": "call_123",
                    "type": "function",
                    "function": {
                        "name": "create_work_order",
                        "arguments": json.dumps({
                            "user_id": user.id,
                            "title": "LLM created work order",
                            "description": "Created via DeepSeek tool call",
                            "trade": "Plumbing",
                            "status": "ready_for_vendor_discovery",
                            "urgency": "normal"
                        })
                    }
                }]
            }
        }]
    }
    
    res2_mock = MagicMock()
    res2_mock.status_code = 200
    res2_mock.json.return_value = {
        "choices": [{
            "message": {
                "role": "assistant",
                "content": "I have created the Plumbing work order for you.",
                "tool_calls": None
            }
        }]
    }
    
    with patch("app.llm.OPENROUTER_API_KEY", "mock_key"):
        # Patch the Client class specifically inside app.llm to not affect TestClient
        with patch("app.llm.httpx.Client") as mock_client_class:
            mock_client = MagicMock()
            mock_client_class.return_value.__enter__.return_value = mock_client
            mock_client.post.side_effect = [res1_mock, res2_mock]
            
            payload = {
                "chat_session_id": chat_session.id,
                "message": "Please create a plumbing work order"
            }
            response = client.post("/api/llm/messages", json=payload)
            assert response.status_code == 200
            data = response.json()
            assert "created the Plumbing work order" in data["response"]
            assert len(data["tool_calls"]) == 1
            assert data["tool_calls"][0]["name"] == "create_work_order"
            
            # Verify work order was actually created in the DB!
            db_session.expire_all()
            wo = db_session.query(models.WorkOrder).filter(
                models.WorkOrder.title == "LLM created work order"
            ).first()
            assert wo is not None
            assert wo.status == "ready_for_vendor_discovery"

def test_fallback_response_is_persisted(client, db_session):
    user = db_session.query(models.User).first()
    chat_session = models.ChatSession(
        user_id=user.id,
        status="active"
    )
    db_session.add(chat_session)
    db_session.commit()

    tool_response = MagicMock()
    tool_response.status_code = 200
    tool_response.json.return_value = {
        "choices": [{
            "message": {
                "role": "assistant",
                "content": None,
                "tool_calls": [{
                    "id": "call_loop",
                    "type": "function",
                    "function": {
                        "name": "get_work_order",
                        "arguments": json.dumps({"id": "missing-work-order"})
                    }
                }]
            }
        }]
    }

    with patch("app.llm.OPENROUTER_API_KEY", "mock_key"):
        with patch("app.llm.httpx.Client") as mock_client_class:
            mock_client = MagicMock()
            mock_client_class.return_value.__enter__.return_value = mock_client
            mock_client.post.return_value = tool_response

            response = client.post(
                "/api/llm/messages",
                json={
                    "chat_session_id": chat_session.id,
                    "message": "Keep calling tools",
                },
            )

    assert response.status_code == 200
    data = response.json()
    assert data["response"] == "I performed some actions but exceeded the execution limit. Please try again."

    db_session.expire_all()
    assistant_message = db_session.query(models.ChatMessage).filter(
        models.ChatMessage.chat_session_id == chat_session.id,
        models.ChatMessage.role == "assistant",
        models.ChatMessage.body == data["response"],
    ).first()
    assert assistant_message is not None
