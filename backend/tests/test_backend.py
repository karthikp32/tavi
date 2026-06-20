import os
import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.seed import ensure_seed_db, seed_db
from app import models

# Use a separate SQLite file for tests
TEST_DATABASE_URL = "sqlite:///./test_backend.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override database dependency
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
    # Create tables
    Base.metadata.create_all(bind=engine)
    # Seed the database
    db = TestingSessionLocal()
    seed_db(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    if os.path.exists("./test_backend.db"):
        os.remove("./test_backend.db")

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

def test_schema_creation_and_seeding(client):
    # Verify we have seeded users and companies
    response = client.get("/api/work-orders")
    assert response.status_code == 200
    
    # We can also check vendors are seeded
    response = client.get("/api/vendors")
    assert response.status_code == 200
    vendors = response.json()
    assert len(vendors) > 0

def test_ensure_seed_db_seeds_empty_sqlite_once(tmp_path):
    db_path = tmp_path / "auto_seed.db"
    auto_seed_engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    AutoSeedSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=auto_seed_engine)

    Base.metadata.create_all(bind=auto_seed_engine)
    db = AutoSeedSessionLocal()
    try:
        assert db.query(models.User).count() == 0
        assert db.query(models.Vendor).count() == 0

        assert ensure_seed_db(db) is True
        user_count = db.query(models.User).count()
        vendor_count = db.query(models.Vendor).count()
        assert user_count > 0
        assert vendor_count > 0

        assert ensure_seed_db(db) is False
        assert db.query(models.User).count() == user_count
        assert db.query(models.Vendor).count() == vendor_count
    finally:
        db.close()
        Base.metadata.drop_all(bind=auto_seed_engine)
        auto_seed_engine.dispose()

def test_startup_seed_preserves_existing_sqlite_data(tmp_path, monkeypatch):
    db_path = tmp_path / "persistent_startup.db"
    startup_engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    StartupSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=startup_engine)

    monkeypatch.setattr("app.main.engine", startup_engine)
    monkeypatch.setattr("app.main.SessionLocal", StartupSessionLocal)

    with TestClient(app) as startup_client:
        assert startup_client.get("/health").status_code == 200

    db = StartupSessionLocal()
    try:
        vendor = db.query(models.Vendor).first()
        assert vendor is not None
        vendor.name = "Persisted Vendor Name"
        db.commit()
    finally:
        db.close()

    with TestClient(app) as startup_client:
        assert startup_client.get("/health").status_code == 200

    db = StartupSessionLocal()
    try:
        assert db.query(models.Vendor).filter(
            models.Vendor.name == "Persisted Vendor Name"
        ).count() == 1
    finally:
        db.close()
        Base.metadata.drop_all(bind=startup_engine)
        startup_engine.dispose()

def test_startup_adds_sender_columns_to_existing_sqlite_table(tmp_path, monkeypatch):
    db_path = tmp_path / "old_schema.db"
    startup_engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    StartupSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=startup_engine)

    with startup_engine.begin() as connection:
        connection.execute(text("""
            CREATE TABLE communication_events (
                id VARCHAR PRIMARY KEY,
                work_order_id VARCHAR NOT NULL,
                work_order_candidate_id VARCHAR,
                channel VARCHAR NOT NULL,
                direction VARCHAR NOT NULL,
                actor_type VARCHAR NOT NULL,
                actor_name VARCHAR,
                body VARCHAR NOT NULL,
                metadata JSON,
                created_at DATETIME NOT NULL
            )
        """))

    monkeypatch.setattr("app.main.engine", startup_engine)
    monkeypatch.setattr("app.main.SessionLocal", StartupSessionLocal)

    with TestClient(app) as startup_client:
        assert startup_client.get("/health").status_code == 200

    columns = {
        column["name"] for column in inspect(startup_engine).get_columns("communication_events")
    }
    assert "sender_id" in columns
    assert "sender_type" in columns

    Base.metadata.drop_all(bind=startup_engine)
    startup_engine.dispose()

def test_work_order_lifecycle_and_snapshots(client, db_session):
    # 1. Create a work order
    # First get the seeded user
    user = db_session.query(models.User).first()
    assert user is not None
    
    facility = db_session.query(models.Facility).filter(models.Facility.user_id == user.id).first()
    assert facility is not None
    
    wo_payload = {
        "user_id": user.id,
        "facility_id": facility.id,
        "title": "Fix pipe leak in kitchen",
        "description": "The drain pipe under the sink is leaking water.",
        "trade": "Plumbing",
        "task_type": "leak_repair",
        "status": "draft",
        "urgency": "high"
    }
    
    response = client.post("/api/work-orders", json=wo_payload)
    assert response.status_code == 201
    wo = response.json()
    assert wo["id"] is not None
    assert wo["title"] == "Fix pipe leak in kitchen"
    assert wo["status"] == "draft"
    
    # Verify initial state snapshot was created
    states = db_session.query(models.WorkOrderState).filter(models.WorkOrderState.work_order_id == wo["id"]).all()
    assert len(states) == 1
    assert states[0].status == "draft"
    assert states[0].actor_type == "human"
    
    # 2. Detail & List
    response = client.get(f"/api/work-orders/{wo['id']}")
    assert response.status_code == 200
    assert response.json()["title"] == "Fix pipe leak in kitchen"
    
    # 3. Update the work order (patching status should trigger snapshot)
    patch_payload = {
        "status": "ready_for_vendor_discovery",
        "actor_type": "agent",
        "actor_name": "Tavi Agent"
    }
    response = client.patch(f"/api/work-orders/{wo['id']}", json=patch_payload)
    assert response.status_code == 200
    updated_wo = response.json()
    assert updated_wo["status"] == "ready_for_vendor_discovery"
    
    # Verify state snapshot is created
    states = db_session.query(models.WorkOrderState).filter(models.WorkOrderState.work_order_id == wo["id"]).order_by(models.WorkOrderState.created_at.asc()).all()
    assert len(states) == 2
    assert states[1].status == "ready_for_vendor_discovery"
    assert states[1].actor_type == "agent"
    assert states[1].actor_name == "Tavi Agent"

def test_vendor_search_filters_and_price_fit(client, db_session):
    # Query with NYC and Plumbing
    response = client.get("/api/vendors?city=New York&trade=Plumbing&task_type=leak_repair")
    assert response.status_code == 200
    vendors = response.json()
    assert len(vendors) > 0
    
    # Check that price fit is calculated dynamically and attached
    for v in vendors:
        assert v["city"] == "New York"
        assert v["trade"] == "Plumbing"
        assert "price_fit" in v
        assert v["price_fit"] is not None

    # Let's test with a budget filter
    # Seeded NYC Plumbing leak_repair price is 30000. If we query with target_budget=40000, price_fit should be 1.0.
    # If we query with target_budget=20000, price_fit should be less than 1.0.
    # Let's test filtering with min_price_fit
    response_fit = client.get("/api/vendors?city=New York&trade=Plumbing&task_type=leak_repair&target_budget=40000&min_price_fit=0.9")
    assert response_fit.status_code == 200
    vendors_fit = response_fit.json()
    assert len(vendors_fit) > 0
    assert all(v["price_fit"] >= 0.9 for v in vendors_fit)

    response_bad_budget = client.get("/api/vendors?city=New York&trade=Plumbing&target_budget=0")
    assert response_bad_budget.status_code == 400
    assert response_bad_budget.json()["detail"] == "target_budget must be greater than 0"

def test_candidate_creation_idempotency(client, db_session):
    # Get seeded user, facility, vendor
    user = db_session.query(models.User).first()
    facility = db_session.query(models.Facility).filter(models.Facility.user_id == user.id).first()
    vendor = db_session.query(models.Vendor).first()
    
    # Create work order
    wo_payload = {
        "user_id": user.id,
        "facility_id": facility.id,
        "title": "Electrical repair",
        "description": "Short circuit in lobby",
        "trade": "Electrical",
        "status": "draft"
    }
    response_wo = client.post("/api/work-orders", json=wo_payload)
    wo_id = response_wo.json()["id"]
    
    # 1. Create candidate
    response_c1 = client.post(f"/api/work-orders/{wo_id}/candidates?vendor_id={vendor.id}")
    assert response_c1.status_code == 201
    c1 = response_c1.json()
    assert c1["status"] == "discovered"
    
    # 2. Re-create (idempotency check)
    response_c2 = client.post(f"/api/work-orders/{wo_id}/candidates?vendor_id={vendor.id}")
    assert response_c2.status_code == 201
    c2 = response_c2.json()
    assert c1["id"] == c2["id"]

def test_contact_actions(client, db_session):
    user = db_session.query(models.User).first()
    facility = db_session.query(models.Facility).filter(models.Facility.user_id == user.id).first()
    vendor = db_session.query(models.Vendor).first()
    
    wo_payload = {
        "user_id": user.id,
        "facility_id": facility.id,
        "title": "HVAC Check",
        "description": "AC not cooling",
        "trade": "HVAC",
        "status": "draft"
    }
    response_wo = client.post("/api/work-orders", json=wo_payload)
    wo_id = response_wo.json()["id"]
    
    # Contact vendor (this should create a candidate and communication event)
    response_contact = client.post(
        f"/api/vendors/{vendor.id}/contact?work_order_id={wo_id}&channel=email&body=Need HVAC repair detail&sender_id={user.id}&sender_type=facility_manager"
    )
    assert response_contact.status_code == 200
    event = response_contact.json()
    assert event["channel"] == "email"
    assert event["body"] == "Need HVAC repair detail"
    assert event["sender_id"] == user.id
    assert event["sender_type"] == "facility_manager"
    
    # Verify candidate exists and status is contact_pending / contacted
    candidate = db_session.query(models.WorkOrderCandidate).filter(
        models.WorkOrderCandidate.work_order_id == wo_id,
        models.WorkOrderCandidate.vendor_id == vendor.id
    ).first()
    assert candidate is not None
    assert candidate.last_contacted_at is not None

def test_candidate_communications_store_sender_identity(client, db_session):
    user = db_session.query(models.User).first()
    facility = db_session.query(models.Facility).filter(models.Facility.user_id == user.id).first()
    vendor = db_session.query(models.Vendor).first()

    wo_payload = {
        "user_id": user.id,
        "facility_id": facility.id,
        "title": "Sender identity",
        "description": "Verify communication senders",
        "trade": "HVAC",
        "status": "draft"
    }
    response_wo = client.post("/api/work-orders", json=wo_payload)
    wo_id = response_wo.json()["id"]
    response_c = client.post(f"/api/work-orders/{wo_id}/candidates?vendor_id={vendor.id}")
    candidate_id = response_c.json()["id"]

    outbound = client.post(
        f"/api/work-order-candidates/{candidate_id}/contact"
        f"?channel=email&body=Can you quote this?&sender_id={user.id}&sender_type=facility_manager"
    )
    assert outbound.status_code == 200
    outbound_event = outbound.json()
    assert outbound_event["sender_id"] == user.id
    assert outbound_event["sender_type"] == "facility_manager"

    inbound = client.post(
        f"/api/work-order-candidates/{candidate_id}/messages?channel=sms&body=Yes, I can quote it"
    )
    assert inbound.status_code == 200
    inbound_event = inbound.json()
    assert inbound_event["sender_id"] == vendor.id
    assert inbound_event["sender_type"] == "vendor"

def test_bid_creation_and_work_order_award(client, db_session):
    user = db_session.query(models.User).first()
    facility = db_session.query(models.Facility).filter(models.Facility.user_id == user.id).first()
    vendor = db_session.query(models.Vendor).first()
    
    wo_payload = {
        "user_id": user.id,
        "facility_id": facility.id,
        "title": "Cleaning lobby",
        "description": "Deep clean lobby floor",
        "trade": "Cleaning",
        "status": "collecting_bids"
    }
    response_wo = client.post("/api/work-orders", json=wo_payload)
    wo_id = response_wo.json()["id"]
    
    # Create candidate
    response_c = client.post(f"/api/work-orders/{wo_id}/candidates?vendor_id={vendor.id}")
    candidate_id = response_c.json()["id"]
    
    # 1. Create Bid
    bid_payload = {
        "work_order_id": wo_id,
        "work_order_candidate_id": candidate_id,
        "amount_cents": 15000,
        "arrival_window_start": (datetime.utcnow() + timedelta(days=1)).isoformat(),
        "arrival_window_end": (datetime.utcnow() + timedelta(days=1, hours=4)).isoformat(),
        "scope_notes": "All supplies included",
        "status": "submitted"
    }
    response_bid = client.post(f"/api/work-orders/{wo_id}/bids", json=bid_payload)
    assert response_bid.status_code == 201
    bid = response_bid.json()
    assert bid["amount_cents"] == 15000
    
    # Candidate status should update to bid_submitted
    candidate = db_session.query(models.WorkOrderCandidate).filter(models.WorkOrderCandidate.id == candidate_id).first()
    assert candidate.status == "bid_submitted"
    
    # 2. Patch Bid to accepted (should award the work order)
    response_accept = client.patch(f"/api/bids/{bid['id']}", json={"status": "accepted"})
    assert response_accept.status_code == 200
    
    # Work order status should now be awarded
    wo = db_session.query(models.WorkOrder).filter(models.WorkOrder.id == wo_id).first()
    assert wo.status == "awarded"
    assert wo.accepted_bid_id == bid["id"]
    assert wo.accepted_price_cents == 15000
    assert wo.selected_vendor_id == vendor.id
    
    # Candidate status should now be selected
    db_session.refresh(candidate)
    assert candidate.status == "selected"

def test_bid_creation_rejects_candidate_from_other_work_order(client, db_session):
    user = db_session.query(models.User).first()
    facility = db_session.query(models.Facility).filter(models.Facility.user_id == user.id).first()
    vendor = db_session.query(models.Vendor).first()

    first_payload = {
        "user_id": user.id,
        "facility_id": facility.id,
        "title": "First work order",
        "description": "Original job",
        "trade": "Cleaning",
        "status": "collecting_bids",
    }
    second_payload = {
        "user_id": user.id,
        "facility_id": facility.id,
        "title": "Second work order",
        "description": "Different job",
        "trade": "Cleaning",
        "status": "collecting_bids",
    }
    first_response = client.post("/api/work-orders", json=first_payload)
    second_response = client.post("/api/work-orders", json=second_payload)
    first_id = first_response.json()["id"]
    second_id = second_response.json()["id"]

    candidate_response = client.post(f"/api/work-orders/{first_id}/candidates?vendor_id={vendor.id}")
    candidate_id = candidate_response.json()["id"]

    response = client.post(
        f"/api/work-orders/{second_id}/bids",
        json={
            "work_order_id": second_id,
            "work_order_candidate_id": candidate_id,
            "amount_cents": 15000,
            "status": "submitted",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Candidate does not belong to this work order"

    candidate = db_session.query(models.WorkOrderCandidate).filter(
        models.WorkOrderCandidate.id == candidate_id
    ).first()
    assert candidate.status == "discovered"
    assert db_session.query(models.Bid).filter(models.Bid.work_order_id == second_id).count() == 0

def test_accepting_new_bid_rejects_previous_accepted_bid(client, db_session):
    user = db_session.query(models.User).first()
    facility = db_session.query(models.Facility).filter(models.Facility.user_id == user.id).first()
    vendors = db_session.query(models.Vendor).limit(2).all()

    wo_payload = {
        "user_id": user.id,
        "facility_id": facility.id,
        "title": "Award replacement",
        "description": "Award one bid, then replace it",
        "trade": "Cleaning",
        "status": "collecting_bids",
    }
    response_wo = client.post("/api/work-orders", json=wo_payload)
    wo_id = response_wo.json()["id"]

    candidate_ids = []
    for vendor in vendors:
        response_c = client.post(f"/api/work-orders/{wo_id}/candidates?vendor_id={vendor.id}")
        candidate_ids.append(response_c.json()["id"])

    bid_ids = []
    for idx, candidate_id in enumerate(candidate_ids):
        response_bid = client.post(
            f"/api/work-orders/{wo_id}/bids",
            json={
                "work_order_id": wo_id,
                "work_order_candidate_id": candidate_id,
                "amount_cents": 15000 + idx,
                "status": "submitted",
            },
        )
        assert response_bid.status_code == 201
        bid_ids.append(response_bid.json()["id"])

    assert client.patch(f"/api/bids/{bid_ids[0]}", json={"status": "accepted"}).status_code == 200
    assert client.patch(f"/api/bids/{bid_ids[1]}", json={"status": "accepted"}).status_code == 200

    first_bid = db_session.query(models.Bid).filter(models.Bid.id == bid_ids[0]).first()
    second_bid = db_session.query(models.Bid).filter(models.Bid.id == bid_ids[1]).first()
    work_order = db_session.query(models.WorkOrder).filter(models.WorkOrder.id == wo_id).first()

    assert first_bid.status == "rejected"
    assert second_bid.status == "accepted"
    assert work_order.accepted_bid_id == second_bid.id

def test_timeline_endpoint(client, db_session):
    user = db_session.query(models.User).first()
    facility = db_session.query(models.Facility).filter(models.Facility.user_id == user.id).first()
    vendor = db_session.query(models.Vendor).first()
    
    wo_payload = {
        "user_id": user.id,
        "facility_id": facility.id,
        "title": "Timeline Test Work Order",
        "description": "General maintenance",
        "trade": "General maintenance",
        "status": "draft"
    }
    response_wo = client.post("/api/work-orders", json=wo_payload)
    wo_id = response_wo.json()["id"]
    
    # Create candidate
    response_c = client.post(f"/api/work-orders/{wo_id}/candidates?vendor_id={vendor.id}")
    candidate_id = response_c.json()["id"]
    
    # Perform contact (generates a communication event)
    client.post(f"/api/vendors/{vendor.id}/contact?work_order_id={wo_id}&channel=phone&body=Called vendor")
    
    # Submit bid
    bid_payload = {
        "work_order_id": wo_id,
        "work_order_candidate_id": candidate_id,
        "amount_cents": 20000,
        "status": "submitted"
    }
    client.post(f"/api/work-orders/{wo_id}/bids", json=bid_payload)
    
    # Get timeline
    response_timeline = client.get(f"/api/work-orders/{wo_id}/timeline")
    assert response_timeline.status_code == 200
    timeline = response_timeline.json()
    
    # Should contain at least 1 state_snapshot (created), 1 communication_event, 1 bid
    types = [item["type"] for item in timeline]
    assert "state_snapshot" in types
    assert "communication_event" in types
    assert "bid" in types
    
    # Verify it is sorted chronologically
    timestamps = [datetime.fromisoformat(item["timestamp"].replace("Z", "")) for item in timeline]
    assert timestamps == sorted(timestamps)

def test_facilities_list_and_create(client, db_session):
    response = client.get("/api/facilities")
    assert response.status_code == 200
    facilities = response.json()
    assert len(facilities) > 0

    user = db_session.query(models.User).first()
    payload = {
        "user_id": user.id,
        "name": "Brooklyn Annex",
        "address": "1 Pierrepont St",
        "city": "Brooklyn",
        "state": "NY",
        "postal_code": "11201",
    }
    create_response = client.post("/api/facilities", json=payload)
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["id"] is not None
    assert created["name"] == "Brooklyn Annex"

    list_response = client.get("/api/facilities")
    assert list_response.status_code == 200
    assert any(f["id"] == created["id"] for f in list_response.json())

def test_facility_create_with_unknown_user_returns_400(client):
    payload = {
        "user_id": "not-a-real-user",
        "name": "Ghost Facility",
        "address": "404 Nowhere Ave",
    }
    response = client.post("/api/facilities", json=payload)
    assert response.status_code == 400

def test_work_order_required_arrival_window_round_trip(client, db_session):
    user = db_session.query(models.User).first()
    wo_payload = {
        "user_id": user.id,
        "title": "Replace HVAC filter",
        "description": "Filter needs replacement before summer.",
        "trade": "HVAC",
        "status": "draft",
        "required_arrival_window_start": "2026-07-01T09:00:00",
        "required_arrival_window_end": "2026-07-01T12:00:00",
    }
    response = client.post("/api/work-orders", json=wo_payload)
    assert response.status_code == 201
    wo = response.json()
    assert wo["required_arrival_window_start"] is not None
    assert wo["required_arrival_window_end"] is not None

    fetched = client.get(f"/api/work-orders/{wo['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["required_arrival_window_start"].startswith("2026-07-01T09:00:00")
