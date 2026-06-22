from sqlalchemy import inspect, text
from sqlalchemy.exc import OperationalError

from .database import Base
from .seed import ensure_seed_db, migrate_half_work_orders_to_transparent_auction


def migrate_schema(engine):
    """Idempotently add columns introduced after the initial create_all, preserving existing rows."""
    new_columns = {
        "required_arrival_window_start": "DATETIME",
        "required_arrival_window_end": "DATETIME",
    }
    with engine.connect() as conn:
        existing = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(work_orders)").fetchall()}
        for name, col_type in new_columns.items():
            if name not in existing:
                try:
                    conn.exec_driver_sql(f"ALTER TABLE work_orders ADD COLUMN {name} {col_type}")
                except OperationalError:
                    pass
        conn.commit()


def ensure_communication_event_sender_columns(engine):
    inspector = inspect(engine)
    if not inspector.has_table("communication_events"):
        return

    existing_columns = {
        column["name"] for column in inspector.get_columns("communication_events")
    }
    columns_to_add = [
        column for column in ("sender_id", "sender_type")
        if column not in existing_columns
    ]
    if not columns_to_add:
        return

    with engine.begin() as connection:
        for column in columns_to_add:
            connection.execute(text(f"ALTER TABLE communication_events ADD COLUMN {column} VARCHAR"))


def ensure_login_token_columns(engine):
    inspector = inspect(engine)
    for table in ("users", "vendors"):
        if not inspector.has_table(table):
            continue
        existing_columns = {column["name"] for column in inspector.get_columns(table)}
        if "login_token" not in existing_columns:
            try:
                with engine.begin() as connection:
                    connection.execute(text(f"ALTER TABLE {table} ADD COLUMN login_token VARCHAR"))
            except OperationalError:
                pass
        with engine.begin() as connection:
            connection.execute(
                text(f"CREATE UNIQUE INDEX IF NOT EXISTS ix_{table}_login_token ON {table} (login_token)")
            )


def initialize_database(engine, session_local):
    Base.metadata.create_all(bind=engine)
    migrate_schema(engine)
    ensure_communication_event_sender_columns(engine)
    ensure_login_token_columns(engine)
    with session_local() as startup_db:
        ensure_seed_db(startup_db)
        migrate_half_work_orders_to_transparent_auction(startup_db)
