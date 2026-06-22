from sqlalchemy import inspect, text
from sqlalchemy.exc import OperationalError

from .database import Base
from .seed import ensure_seed_db, migrate_half_work_orders_to_transparent_auction


def column_exists(engine, table_name: str, column_name: str) -> bool:
    inspector = inspect(engine)
    if not inspector.has_table(table_name):
        return False
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def table_columns(engine, table_name: str) -> set[str]:
    inspector = inspect(engine)
    if not inspector.has_table(table_name):
        return set()
    return {column["name"] for column in inspector.get_columns(table_name)}


def add_column_if_missing(engine, table_name: str, column_name: str, column_type: str) -> None:
    if column_exists(engine, table_name, column_name):
        return
    try:
        with engine.begin() as connection:
            connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"))
    except OperationalError:
        if column_exists(engine, table_name, column_name):
            return
        raise


def migrate_schema(engine):
    """Idempotently add columns introduced after the initial create_all, preserving existing rows."""
    new_columns = {
        "required_arrival_window_start": "DATETIME",
        "required_arrival_window_end": "DATETIME",
    }
    for name, col_type in new_columns.items():
        add_column_if_missing(engine, "work_orders", name, col_type)


def ensure_communication_event_sender_columns(engine):
    existing_columns = table_columns(engine, "communication_events")
    if not existing_columns:
        return

    columns_to_add = [
        column for column in ("sender_id", "sender_type")
        if column not in existing_columns
    ]
    if not columns_to_add:
        return

    for column in columns_to_add:
        add_column_if_missing(engine, "communication_events", column, "VARCHAR")


def ensure_login_token_columns(engine):
    inspector = inspect(engine)
    for table in ("users", "vendors"):
        if not inspector.has_table(table):
            continue
        add_column_if_missing(engine, table, "login_token", "VARCHAR")
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
