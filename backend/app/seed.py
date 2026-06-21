import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from urllib.parse import quote_plus

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from .database import Base, SessionLocal, engine
from .models import (
    AgentAction,
    Bid,
    ChatMessage,
    ChatSession,
    CommunicationEvent,
    Company,
    Facility,
    User,
    Vendor,
    VendorAvailabilityBlock,
    VendorTaskStat,
    WorkOrder,
    WorkOrderCandidate,
    WorkOrderState,
)


def seed_db(db: Session, announce: bool = True):
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

    city_details = {
        "New York": ("NY", "10002", Decimal("40.75"), Decimal("-73.98")),
        "Los Angeles": ("CA", "90001", Decimal("34.05"), Decimal("-118.24")),
        "Chicago": ("IL", "60601", Decimal("41.88"), Decimal("-87.63")),
    }
    yelp_search_terms = {
        "Plumbing": "Plumbers",
        "Electrical": "Electricians",
        "HVAC": "Heating & Air Conditioning",
        "Cleaning": "Home Cleaning",
        "Lawncare": "Landscaping",
        "General maintenance": "Handyman",
    }

    def yelp_search_url(trade: str, city: str) -> str:
        state = city_details[city][0]
        return (
            "https://www.yelp.com/search?"
            f"find_desc={quote_plus(yelp_search_terms[trade])}"
            f"&find_loc={quote_plus(f'{city}, {state}')}"
        )

    verified_contact_details = {
        "Green Tech Plumbing": {
            "phone": "847-518-5338",
            "email": "info@greentechplumbing.com",
            "address": "1017 S. Graceland Ave",
            "source_url": "https://greentechplumbing.com/",
        },
        "Four Seasons Heating, Air Conditioning, Plumbing": {
            "phone": "1-866-444-2404",
            "source_url": "https://www.fourseasonsheatingcooling.com/",
        },
    }

    # Yelp-backed local businesses, five per trade per city.
    vendor_specs = [
        ("Sam's Plumbing Services", "Plumbing", "New York", "4.7", 167),
        ("AXR Mechanical", "Plumbing", "New York", "5.0", 36),
        ("Zabivay", "Plumbing", "New York", "4.9", 116),
        ("Michael Donahue Plumbing & Heating", "Plumbing", "New York", "4.7", 85),
        ("Pro Plumbing & Heating", "Plumbing", "New York", "4.7", 91),
        ("Rishon Plumbing & Water Heaters", "Plumbing", "Los Angeles", "5.0", 903),
        ("Victor's Rooter & Plumbing", "Plumbing", "Los Angeles", "4.8", 638),
        ("Right Price Rooter and Plumbing", "Plumbing", "Los Angeles", "4.9", 338),
        ("Cali Rooter & Plumbing", "Plumbing", "Los Angeles", "5.0", 423),
        ("Gary's Rooter and Hydro-Jetting Service", "Plumbing", "Los Angeles", "5.0", 919),
        ("Green Tech Plumbing", "Plumbing", "Chicago", "4.8", 371),
        ("Drain-EEZ Plumbing", "Plumbing", "Chicago", "4.8", 530),
        ("J Sewer & Drain Plumbing", "Plumbing", "Chicago", "4.7", 349),
        ("Mike The Plumber", "Plumbing", "Chicago", "5.0", 110),
        ("Scotty's Plumbing", "Plumbing", "Chicago", "5.0", 44),
        ("Asset Electrician Corp", "Electrical", "New York", "4.9", 181),
        ("Mikhail Electrician", "Electrical", "New York", "4.8", 96),
        ("Electric A/C", "Electrical", "New York", "4.8", 105),
        ("Hitchingham Electric", "Electrical", "New York", "4.8", 43),
        ("DB Electric", "Electrical", "New York", "5.0", 16),
        ("Josh the Honest Electrician", "Electrical", "Los Angeles", "4.8", 77),
        ("Alex & Alex Electrical Services", "Electrical", "Los Angeles", "5.0", 341),
        ("MH Electric", "Electrical", "Los Angeles", "5.0", 409),
        ("East West Electric", "Electrical", "Los Angeles", "4.9", 714),
        ("IN-N-OUT Electrical Service", "Electrical", "Los Angeles", "4.8", 632),
        ("T & D Electrical", "Electrical", "Chicago", "4.8", 110),
        ("Logan Square Electric", "Electrical", "Chicago", "5.0", 5),
        ("Arnold Electrical Services", "Electrical", "Chicago", "4.6", 237),
        ("Alambre Electric", "Electrical", "Chicago", "4.8", 13),
        ("E Contractor Company", "Electrical", "Chicago", "4.9", 52),
        ("Airnizer HVAC", "HVAC", "New York", "4.8", 152),
        ("Fusion HVAC & Appliance Repair", "HVAC", "New York", "4.8", 103),
        ("StayCoolNYC", "HVAC", "New York", "5.0", 39),
        ("Prime Air Group", "HVAC", "New York", "4.9", 97),
        ("HVAC Hunters", "HVAC", "New York", "4.9", 39),
        ("Mike's Air", "HVAC", "Los Angeles", "5.0", 235),
        ("So Cal Air", "HVAC", "Los Angeles", "5.0", 395),
        ("California A/C Heating Refrigeration", "HVAC", "Los Angeles", "5.0", 160),
        ("Villaneda Heating & Air", "HVAC", "Los Angeles", "5.0", 25),
        ("Pac-West Air Conditioning & Heating", "HVAC", "Los Angeles", "4.8", 216),
        ("Chicago Appliance Repair Doctor", "HVAC", "Chicago", "4.8", 752),
        ("Browns Heating & Cooling", "HVAC", "Chicago", "4.7", 308),
        ("Hero Air", "HVAC", "Chicago", "4.9", 117),
        ("Preferred Comfort Heating & Cooling", "HVAC", "Chicago", "4.8", 131),
        ("Chicago HVAC Repair Doctor", "HVAC", "Chicago", "4.7", 211),
        ("Obsessive Cleaning", "Cleaning", "New York", "4.9", 94),
        ("Gelmu's Cleaning", "Cleaning", "New York", "4.8", 53),
        ("Mr Maid NY", "Cleaning", "New York", "4.6", 157),
        ("Cleany", "Cleaning", "New York", "4.7", 296),
        ("Elite Supreme Cleaning", "Cleaning", "New York", "4.8", 109),
        ("Maid For LA Home and Office Cleaning Service", "Cleaning", "Los Angeles", "4.7", 337),
        ("ALA Cleaning Services", "Cleaning", "Los Angeles", "4.8", 171),
        ("Mya Cleaning Services", "Cleaning", "Los Angeles", "4.5", 394),
        ("MaidServe", "Cleaning", "Los Angeles", "4.5", 860),
        ("Maids Unlimited", "Cleaning", "Los Angeles", "4.9", 204),
        ("Clean Freaks Cleaning Service", "Cleaning", "Chicago", "4.4", 239),
        ("Joanna Cleaning Lady", "Cleaning", "Chicago", "4.7", 108),
        ("King of Maids", "Cleaning", "Chicago", "4.3", 708),
        ("GetClean", "Cleaning", "Chicago", "4.3", 146),
        ("Mariia Buchko Services", "Cleaning", "Chicago", "4.9", 34),
        ("Bed-Stuy Garden Guy", "Lawncare", "New York", "5.0", 37),
        ("G&C Landscaping", "Lawncare", "New York", "4.6", 29),
        ("Garden Culture NYC", "Lawncare", "New York", "4.8", 24),
        ("Ivy League", "Lawncare", "New York", "5.0", 3),
        ("Angel's Landscaping", "Lawncare", "New York", "5.0", 4),
        ("Amado Landscaping", "Lawncare", "Los Angeles", "4.7", 212),
        ("Campos Landscaping", "Lawncare", "Los Angeles", "4.5", 135),
        ("R & G Gardening Services & Landscaping", "Lawncare", "Los Angeles", "4.8", 94),
        ("The Gardener", "Lawncare", "Los Angeles", "4.9", 110),
        ("GR Landscaping", "Lawncare", "Los Angeles", "4.9", 82),
        ("F Gomez Landscaping", "Lawncare", "Chicago", "4.6", 74),
        ("Dante's Native Landscape Services", "Lawncare", "Chicago", "4.6", 73),
        ("Cityscape Landscape", "Lawncare", "Chicago", "4.2", 164),
        ("Salvador's Landscaping", "Lawncare", "Chicago", "4.2", 66),
        ("Rafael Landscaping", "Lawncare", "Chicago", "4.3", 66),
        ("Valera Handyman", "General maintenance", "New York", "5.0", 187),
        ("S & S Handyman", "General maintenance", "New York", "4.9", 185),
        ("NYC Handyman", "General maintenance", "New York", "4.9", 296),
        ("Wow NYC Handy Men", "General maintenance", "New York", "4.9", 63),
        ("Not Just Handymen", "General maintenance", "New York", "5.0", 14),
        ("Handyman LA", "General maintenance", "Los Angeles", "4.9", 151),
        ("Handyman of Los Angeles", "General maintenance", "Los Angeles", "4.9", 56),
        ("The Affordable & Licensed Handyman", "General maintenance", "Los Angeles", "4.8", 514),
        ("Handy Eddy", "General maintenance", "Los Angeles", "4.8", 61),
        ("Egor Handyman", "General maintenance", "Los Angeles", "5.0", 48),
        ("Loyal Handyman", "General maintenance", "Chicago", "4.9", 250),
        ("Handy Hero", "General maintenance", "Chicago", "5.0", 12),
        ("2 Guys Construction", "General maintenance", "Chicago", "4.8", 135),
        ("Fix It People", "General maintenance", "Chicago", "4.6", 451),
        ("The Good Guys Handyman", "General maintenance", "Chicago", "4.6", 128),
    ]

    vendor_companies = []
    for vendor_idx, (name, trade, city, yelp_rating, yelp_review_count) in enumerate(vendor_specs, start=1):
        state, postal_code, _, _ = city_details[city]
        contact_details = verified_contact_details.get(name, {})
        vc = Company(
            id=str(uuid.uuid4()),
            name=name,
            company_type="vendor",
            trade=trade,
            phone=contact_details.get("phone"),
            email=contact_details.get("email"),
            address=contact_details.get("address"),
            city=city,
            state=state,
            postal_code=postal_code,
        )
        db.add(vc)
        vendor_companies.append((vc, city, trade, vendor_idx, yelp_rating, yelp_review_count, contact_details))
    db.commit()

    # 2. Users
    fm_user = User(
        id="f3089d70-d4cf-4ca6-bdfd-7c22718e2036",  # Stable UUID for FM
        company_id=fm_company.id,
        name="Karthik",
        email="karthik@tavi.com",
        user_type="facility_manager",
        company_name="Apex Property Management",
        login_token="facility-manager-1",
    )
    db.add(fm_user)
    db.commit()

    # 3. Facilities
    facilities_data = [
        (
            "NYC HQ",
            "500 5th Ave",
            "New York",
            "NY",
            "10110",
            Decimal("40.7530"),
            Decimal("-73.9822"),
        ),
        (
            "LA Office",
            "10250 Santa Monica Blvd",
            "Los Angeles",
            "CA",
            "90067",
            Decimal("34.0601"),
            Decimal("-118.4204"),
        ),
        (
            "Chicago Branch",
            "233 S Wacker Dr",
            "Chicago",
            "IL",
            "60606",
            Decimal("41.8789"),
            Decimal("-87.6358"),
        ),
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
    insurance_statuses = [
        "verified",
        "verified",
        "not_required",
        "unverified",
        "expired",
    ]
    trade_login_slugs = {
        "Plumbing": "plumber",
        "Electrical": "electrician",
        "HVAC": "hvac-tech",
        "Cleaning": "cleaner",
        "Lawncare": "landscaper",
        "General maintenance": "maintenance-tech",
    }
    trade_login_counts = {trade: 0 for trade in trade_login_slugs}
    for vc, city, trade, idx, yelp_rating, yelp_review_count, contact_details in vendor_companies:
        _, _, latitude, longitude = city_details[city]
        quality = Decimal("0.90") - Decimal(idx % 5) * Decimal("0.03")
        availability = Decimal("0.85") - Decimal(idx % 4) * Decimal("0.04")
        risk = Decimal("0.05") + Decimal(idx % 3) * Decimal("0.04")
        trade_login_counts[trade] += 1
        trade_position = trade_login_counts[trade]

        vendor = Vendor(
            id=str(uuid.uuid4()),
            company_id=vc.id,
            name=vc.name,
            trade=trade,
            phone=vc.phone,
            email=vc.email,
            address=vc.address,
            city=city,
            latitude=latitude,
            longitude=longitude,
            rating=Decimal(yelp_rating),
            review_count=yelp_review_count,
            license_status=license_statuses[idx % len(license_statuses)],
            insurance_status=insurance_statuses[idx % len(insurance_statuses)],
            quality_score=quality,
            availability_score=availability,
            risk_score=risk,
            score_evidence={
                "source": "Yelp search",
                "yelp_search_url": yelp_search_url(trade, city),
                "yelp_rating": yelp_rating,
                "yelp_review_count": yelp_review_count,
                "contact_source_url": contact_details.get("source_url"),
                "license_verified_at": "2026-01-01",
                "insurance_verified_at": "2026-01-01",
            },
            login_token=f"{trade_login_slugs[trade]}-{trade_position}",
        )
        db.add(vendor)
        vendors.append((vendor, city, trade))
    db.commit()

    # 5. Vendor Task Stats & Availability Blocks
    now = datetime.utcnow()
    for vendor, city, trade in vendors:
        # Task types: e.g. "leak_repair", "install", "maintenance"
        task_types = (
            ["leak_repair", "install", "maintenance"]
            if trade == "Plumbing"
            else ["install", "maintenance", "repair"]
        )

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
        (
            "Leaking pipe under kitchen sink",
            "Tenant reports a slow leak under the 4th floor breakroom sink.",
            "Plumbing",
            "leak_repair",
            "collecting_bids",
            25000,
            40000,
            "high",
            facilities[0],
        ),
        (
            "Replace lobby light fixtures",
            "Several lobby fixtures are flickering and need replacement.",
            "Electrical",
            "repair",
            "ready_for_vendor_discovery",
            30000,
            55000,
            "normal",
            facilities[0],
        ),
        (
            "AC not cooling west conference room",
            "Conference room AC is running warm during afternoon meetings.",
            "HVAC",
            "repair",
            "contacting_vendors",
            45000,
            75000,
            "high",
            facilities[1],
        ),
        (
            "Nightly janitorial deep clean",
            "Schedule a one-time deep clean before the client walkthrough.",
            "Cleaning",
            "maintenance",
            "draft",
            20000,
            35000,
            "normal",
            facilities[0],
        ),
        (
            "Landscape irrigation tune-up",
            "Sprinkler coverage is uneven around the LA office entrance.",
            "Lawncare",
            "maintenance",
            "discovering_vendors",
            18000,
            32000,
            "low",
            facilities[1],
        ),
        (
            "Patch drywall in loading area",
            "Repair scuffed and dented drywall near the loading dock.",
            "General maintenance",
            "repair",
            "vendors_shortlisted",
            22000,
            38000,
            "normal",
            facilities[2],
        ),
        (
            "Backflow preventer inspection",
            "Annual inspection and documentation for plumbing backflow prevention.",
            "Plumbing",
            "maintenance",
            "ready_for_vendor_discovery",
            28000,
            45000,
            "normal",
            facilities[2],
        ),
        (
            "Panel label audit",
            "Audit and relabel electrical panels after recent tenant move-in.",
            "Electrical",
            "maintenance",
            "draft",
            16000,
            30000,
            "low",
            facilities[2],
        ),
        (
            "Replace rooftop filter bank",
            "Replace HVAC filters and inspect rooftop unit airflow.",
            "HVAC",
            "maintenance",
            "collecting_bids",
            36000,
            60000,
            "normal",
            facilities[1],
        ),
        (
            "Post-event floor cleaning",
            "Clean and buff event space floors after weekend event.",
            "Cleaning",
            "maintenance",
            "contacting_vendors",
            24000,
            42000,
            "high",
            facilities[0],
        ),
    ]
    for idx, (
        title,
        description,
        trade,
        task_type,
        status,
        target_budget,
        max_price,
        urgency,
        facility,
    ) in enumerate(work_order_specs):
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
            bidding_mode="transparent_auction" if idx % 2 == 0 else "private_negotiation",
            required_arrival_window_start=now + timedelta(days=idx + 3, hours=9),
            required_arrival_window_end=now + timedelta(days=idx + 3, hours=17),
        )
        db.add(work_order)
        db.flush()
        db.add(
            WorkOrderState(
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
            )
        )

    db.commit()
    if announce:
        print("Database successfully seeded.")


def vendor_name_login_token(name: str) -> str:
    return "".join(
        character.lower() if character.isalnum() else "-"
        for character in name
    ).strip("-")


def migrate_yelp_vendor_seed_data(db: Session) -> int:
    temp_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TempSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=temp_engine)
    Base.metadata.create_all(bind=temp_engine)

    temp_db = TempSessionLocal()
    try:
        seed_db(temp_db, announce=False)
        existing_vendor_keys = {
            (
                vendor.name.lower(),
                vendor.trade.lower(),
                (vendor.city or "").lower(),
            )
            for vendor in db.query(Vendor).all()
        }
        inserted_count = 0

        for source_vendor in temp_db.query(Vendor).all():
            vendor_key = (
                source_vendor.name.lower(),
                source_vendor.trade.lower(),
                (source_vendor.city or "").lower(),
            )
            if vendor_key in existing_vendor_keys:
                continue

            source_company = source_vendor.company
            company = Company(
                id=str(uuid.uuid4()),
                name=source_company.name,
                company_type=source_company.company_type,
                trade=source_company.trade,
                phone=source_company.phone,
                email=source_company.email,
                address=source_company.address,
                city=source_company.city,
                state=source_company.state,
                postal_code=source_company.postal_code,
            )
            db.add(company)
            db.flush()

            vendor = Vendor(
                id=str(uuid.uuid4()),
                company_id=company.id,
                name=source_vendor.name,
                trade=source_vendor.trade,
                phone=source_vendor.phone,
                email=source_vendor.email,
                address=source_vendor.address,
                city=source_vendor.city,
                latitude=source_vendor.latitude,
                longitude=source_vendor.longitude,
                rating=source_vendor.rating,
                review_count=source_vendor.review_count,
                license_status=source_vendor.license_status,
                insurance_status=source_vendor.insurance_status,
                quality_score=source_vendor.quality_score,
                availability_score=source_vendor.availability_score,
                risk_score=source_vendor.risk_score,
                score_evidence=source_vendor.score_evidence,
                login_token=vendor_name_login_token(source_vendor.name),
            )
            db.add(vendor)
            db.flush()

            for source_stat in source_vendor.task_stats:
                db.add(
                    VendorTaskStat(
                        vendor_id=vendor.id,
                        trade=source_stat.trade,
                        task_type=source_stat.task_type,
                        city=source_stat.city,
                        completed_work_order_count=source_stat.completed_work_order_count,
                        median_price_cents=source_stat.median_price_cents,
                        median_quality_score=source_stat.median_quality_score,
                    )
                )
            for source_block in source_vendor.availability_blocks:
                db.add(
                    VendorAvailabilityBlock(
                        vendor_id=vendor.id,
                        starts_at=source_block.starts_at,
                        ends_at=source_block.ends_at,
                    )
                )

            existing_vendor_keys.add(vendor_key)
            inserted_count += 1

        if inserted_count:
            db.commit()
        return inserted_count
    finally:
        temp_db.close()
        temp_engine.dispose()


def migrate_half_work_orders_to_transparent_auction(db: Session) -> int:
    """One-time data migration: flip every other existing work order to
    transparent_auction mode so the vendor marketplace (which only shows
    transparent_auction work orders) has data to exercise in testing."""
    work_orders = db.query(WorkOrder).order_by(WorkOrder.id).all()
    if not work_orders or any(wo.bidding_mode == "transparent_auction" for wo in work_orders):
        return 0

    updated_count = 0
    for idx, work_order in enumerate(work_orders):
        if idx % 2 == 0:
            work_order.bidding_mode = "transparent_auction"
            updated_count += 1

    if updated_count:
        db.commit()
    return updated_count


def ensure_seed_db(db: Session) -> bool:
    if db.query(User).first() or db.query(Vendor).first():
        return migrate_yelp_vendor_seed_data(db) > 0
    seed_db(db)
    return True


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    db_session = SessionLocal()
    try:
        seed_db(db_session)
    finally:
        db_session.close()
