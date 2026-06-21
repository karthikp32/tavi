import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from .database import SessionLocal, Base, engine
from .models import (
    AgentAction,
    Bid,
    ChatMessage,
    ChatSession,
    Company,
    CommunicationEvent,
    User,
    Facility,
    Vendor,
    VendorTaskStat,
    VendorAvailabilityBlock,
    WorkOrder,
    WorkOrderCandidate,
    WorkOrderState,
)

def seed_db(db: Session):
    # Clear existing data to allow clean re-seeding
    db.query(WorkOrder).update({WorkOrder.accepted_bid_id: None})
    db.query(ChatMessage).delete()
    db.query(ChatSession).delete()
    db.query(AgentAction).delete()
    db.query(Bid).delete()
    db.query(CommunicationEvent).delete()
    db.query(WorkOrderState).delete()
    db.query(WorkOrderCandidate).delete()
    db.query(WorkOrder).delete()
    db.query(VendorAvailabilityBlock).delete()
    db.query(VendorTaskStat).delete()
    db.query(Vendor).delete()
    db.query(Facility).delete()
    db.query(User).delete()
    db.query(Company).delete()
    db.commit()

    # 1. Companies
    fm_company = Company(
        id=str(uuid.uuid4()),
        name="Apex Property Management",
        company_type="facility_manager",
        phone="555-0100",
        email="info@apexprop.com",
        address="100 Main St",
        city="New York",
        state="NY",
        postal_code="10001",
    )
    db.add(fm_company)

    vendor_companies = []
    trades = ["Plumbing", "Electrical", "HVAC", "Cleaning", "Lawncare", "General maintenance"]
    city_cycle = ["New York", "Los Angeles", "Chicago", "New York", "Los Angeles"]
    city_details = {
        "New York": ("NY", "10002", Decimal("40.75"), Decimal("-73.98")),
        "Los Angeles": ("CA", "90001", Decimal("34.05"), Decimal("-118.24")),
        "Chicago": ("IL", "60601", Decimal("41.88"), Decimal("-87.63")),
    }

    vendor_idx = 0
    for trade in trades:
        for city in city_cycle:
            state, postal_code, _, _ = city_details[city]
            vendor_idx += 1
            name = f"{city} {trade} Team {city_cycle.index(city) + 1}-{vendor_idx}"
            slug = "".join(ch for ch in name.lower() if ch.isalnum())
            vc = Company(
                id=str(uuid.uuid4()),
                name=f"{name} Inc.",
                company_type="vendor",
                trade=trade,
                phone=f"555-02{vendor_idx:02d}",
                email=f"contact@{slug}.com",
                address=f"{200 + vendor_idx} Broadway",
                city=city,
                state=state,
                postal_code=postal_code,
            )
            db.add(vc)
            vendor_companies.append((vc, city, trade, vendor_idx))
    db.commit()

    # 2. Users
    fm_user = User(
        id="f3089d70-d4cf-4ca6-bdfd-7c22718e2036", # Stable UUID for FM
        company_id=fm_company.id,
        name="Karthik Manager",
        email="karthik@tavi.com",
        user_type="facility_manager",
        company_name="Apex Property Management",
        login_token="facility-manager-1",
    )
    db.add(fm_user)
    db.commit()

    # 3. Facilities
    facilities_data = [
        ("NYC HQ", "500 5th Ave", "New York", "NY", "10110", Decimal("40.7530"), Decimal("-73.9822")),
        ("LA Office", "10250 Santa Monica Blvd", "Los Angeles", "CA", "90067", Decimal("34.0601"), Decimal("-118.4204")),
        ("Chicago Branch", "233 S Wacker Dr", "Chicago", "IL", "60606", Decimal("41.8789"), Decimal("-87.6358")),
    ]
    facilities = []
    for name, addr, city, state, zip_c, lat, lon in facilities_data:
        fac = Facility(
            id=str(uuid.uuid4()),
            user_id=fm_user.id,
            name=name,
            address=addr,
            city=city,
            state=state,
            postal_code=zip_c,
            latitude=lat,
            longitude=lon,
        )
        db.add(fac)
        facilities.append(fac)
    db.commit()

    # 4. Vendors
    vendors = []
    license_statuses = ["verified", "not_required", "verified", "unverified", "expired"]
    insurance_statuses = ["verified", "verified", "not_required", "unverified", "expired"]
    trade_login_slugs = {
        "Plumbing": "plumber",
        "Electrical": "electrician",
        "HVAC": "hvac-tech",
        "Cleaning": "cleaner",
        "Lawncare": "landscaper",
        "General maintenance": "maintenance-tech",
    }
    for vc, city, trade, idx in vendor_companies:
        _, _, latitude, longitude = city_details[city]
        quality = Decimal("0.90") - Decimal(idx % 5) * Decimal("0.03")
        availability = Decimal("0.85") - Decimal(idx % 4) * Decimal("0.04")
        risk = Decimal("0.05") + Decimal(idx % 3) * Decimal("0.04")
        trade_position = ((idx - 1) % len(city_cycle)) + 1

        vendor = Vendor(
            id=str(uuid.uuid4()),
            company_id=vc.id,
            name=vc.name.replace(" Inc.", ""),
            trade=trade,
            phone=vc.phone,
            email=vc.email,
            address=vc.address,
            city=city,
            latitude=latitude,
            longitude=longitude,
            rating=Decimal("4.8") - Decimal(idx % 4) * Decimal("0.1"),
            review_count=15 + idx,
            license_status=license_statuses[idx % len(license_statuses)],
            insurance_status=insurance_statuses[idx % len(insurance_statuses)],
            quality_score=quality,
            availability_score=availability,
            risk_score=risk,
            score_evidence={"license_verified_at": "2026-01-01", "insurance_verified_at": "2026-01-01"},
            login_token=f"{trade_login_slugs[trade]}-{trade_position}",
        )
        db.add(vendor)
        vendors.append((vendor, city, trade))
    db.commit()

    # 5. Vendor Task Stats & Availability Blocks
    now = datetime.utcnow()
    for vendor, city, trade in vendors:
        # Task types: e.g. "leak_repair", "install", "maintenance"
        task_types = ["leak_repair", "install", "maintenance"] if trade == "Plumbing" else ["install", "maintenance", "repair"]
        
        for task_type in task_types:
            # Let's seed varying median price to help test filters
            median_price = 25000  # $250.00
            if "New York" in city:
                median_price = 30000
            elif "Los Angeles" in city:
                median_price = 28000

            vts = VendorTaskStat(
                id=str(uuid.uuid4()),
                vendor_id=vendor.id,
                trade=trade,
                task_type=task_type,
                city=city,
                completed_work_order_count=5,
                median_price_cents=median_price,
                median_quality_score=vendor.quality_score,
            )
            db.add(vts)

        # Availability blocks: today, tomorrow, and next week
        for i in range(3):
            starts = now + timedelta(days=i, hours=9)
            ends = now + timedelta(days=i, hours=17)
            block = VendorAvailabilityBlock(
                id=str(uuid.uuid4()),
                vendor_id=vendor.id,
                starts_at=starts,
                ends_at=ends,
                city=city,
                notes=f"Available for {trade} work in {city}",
            )
            db.add(block)

    db.commit()

    # 6. Seed starter work orders for the dashboard
    work_order_specs = [
        ("Leaking pipe under kitchen sink", "Tenant reports a slow leak under the 4th floor breakroom sink.", "Plumbing", "leak_repair", "collecting_bids", 25000, 40000, "high", facilities[0]),
        ("Replace lobby light fixtures", "Several lobby fixtures are flickering and need replacement.", "Electrical", "repair", "ready_for_vendor_discovery", 30000, 55000, "normal", facilities[0]),
        ("AC not cooling west conference room", "Conference room AC is running warm during afternoon meetings.", "HVAC", "repair", "contacting_vendors", 45000, 75000, "high", facilities[1]),
        ("Nightly janitorial deep clean", "Schedule a one-time deep clean before the client walkthrough.", "Cleaning", "maintenance", "draft", 20000, 35000, "normal", facilities[0]),
        ("Landscape irrigation tune-up", "Sprinkler coverage is uneven around the LA office entrance.", "Lawncare", "maintenance", "discovering_vendors", 18000, 32000, "low", facilities[1]),
        ("Patch drywall in loading area", "Repair scuffed and dented drywall near the loading dock.", "General maintenance", "repair", "vendors_shortlisted", 22000, 38000, "normal", facilities[2]),
        ("Backflow preventer inspection", "Annual inspection and documentation for plumbing backflow prevention.", "Plumbing", "maintenance", "ready_for_vendor_discovery", 28000, 45000, "normal", facilities[2]),
        ("Panel label audit", "Audit and relabel electrical panels after recent tenant move-in.", "Electrical", "maintenance", "draft", 16000, 30000, "low", facilities[2]),
        ("Replace rooftop filter bank", "Replace HVAC filters and inspect rooftop unit airflow.", "HVAC", "maintenance", "collecting_bids", 36000, 60000, "normal", facilities[1]),
        ("Post-event floor cleaning", "Clean and buff event space floors after weekend event.", "Cleaning", "maintenance", "contacting_vendors", 24000, 42000, "high", facilities[0]),
    ]
    for idx, (title, description, trade, task_type, status, target_budget, max_price, urgency, facility) in enumerate(work_order_specs):
        work_order = WorkOrder(
            id=str(uuid.uuid4()),
            user_id=fm_user.id,
            company_id=fm_company.id,
            facility_id=facility.id,
            title=title,
            description=description,
            trade=trade,
            task_type=task_type,
            status=status,
            requested_start_at=now + timedelta(days=idx + 1),
            target_budget_cents=target_budget,
            max_price_cents=max_price,
            bid_deadline_at=now + timedelta(days=idx + 2),
            urgency=urgency,
            bidding_mode="private_negotiation",
            required_arrival_window_start=now + timedelta(days=idx + 3, hours=9),
            required_arrival_window_end=now + timedelta(days=idx + 3, hours=17),
        )
        db.add(work_order)
        db.flush()
        db.add(WorkOrderState(
            work_order_id=work_order.id,
            status=work_order.status,
            title=work_order.title,
            description=work_order.description,
            trade=work_order.trade,
            task_type=work_order.task_type,
            target_budget_cents=work_order.target_budget_cents,
            max_price_cents=work_order.max_price_cents,
            actor_type="system",
            actor_name="Seed Data",
            created_at=now,
        ))

    db.commit()
    print("Database successfully seeded.")

def ensure_seed_db(db: Session) -> bool:
    if db.query(User).first() or db.query(Vendor).first():
        return False
    seed_db(db)
    return True

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    db_session = SessionLocal()
    try:
        seed_db(db_session)
    finally:
        db_session.close()
