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
    cities = ["New York", "Los Angeles", "Chicago"]
    trades = ["Plumbing", "Electrical", "HVAC", "Cleaning", "Lawncare", "General maintenance"]

    for idx, (city, trade) in enumerate([
        ("New York", "Plumbing"),
        ("New York", "Electrical"),
        ("New York", "HVAC"),
        ("New York", "Cleaning"),
        ("Los Angeles", "Plumbing"),
        ("Los Angeles", "Electrical"),
        ("Los Angeles", "Lawncare"),
        ("Chicago", "Plumbing"),
        ("Chicago", "HVAC"),
        ("Chicago", "General maintenance"),
    ]):
        vc = Company(
            id=str(uuid.uuid4()),
            name=f"{city} {trade} Pros Inc.",
            company_type="vendor",
            trade=trade,
            phone=f"555-020{idx}",
            email=f"contact@{city.lower().replace(' ', '')}{trade.lower()}pros.com",
            address=f"{200 + idx} Broadway",
            city=city,
            state="NY" if city == "New York" else ("CA" if city == "Los Angeles" else "IL"),
            postal_code="10002" if city == "New York" else ("90001" if city == "Los Angeles" else "60601"),
        )
        db.add(vc)
        vendor_companies.append((vc, city, trade))
    db.commit()

    # 2. Users
    fm_user = User(
        id="f3089d70-d4cf-4ca6-bdfd-7c22718e2036", # Stable UUID for FM
        company_id=fm_company.id,
        name="Karthik Manager",
        email="karthik@tavi.com",
        user_type="facility_manager",
        company_name="Apex Property Management",
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
    for vc, city, trade in vendor_companies:
        # Quality score, availability score, risk score
        # High quality, low risk for first, then normal
        rating = Decimal("4.8") if "Pros" in vc.name else Decimal("4.2")
        quality = Decimal("0.90")
        availability = Decimal("0.85")
        risk = Decimal("0.05")

        vendor = Vendor(
            id=str(uuid.uuid4()),
            company_id=vc.id,
            name=vc.name.replace(" Inc.", ""),
            trade=trade,
            phone=vc.phone,
            email=vc.email,
            address=vc.address,
            city=city,
            latitude=Decimal("40.75") if city == "New York" else (Decimal("34.05") if city == "Los Angeles" else Decimal("41.88")),
            longitude=Decimal("-73.98") if city == "New York" else (Decimal("-118.24") if city == "Los Angeles" else Decimal("-87.63")),
            rating=rating,
            review_count=15,
            license_status="verified",
            insurance_status="verified",
            quality_score=quality,
            availability_score=availability,
            risk_score=risk,
            score_evidence={"license_verified_at": "2026-01-01", "insurance_verified_at": "2026-01-01"},
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
    print("Database successfully seeded.")

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    db_session = SessionLocal()
    try:
        seed_db(db_session)
    finally:
        db_session.close()
