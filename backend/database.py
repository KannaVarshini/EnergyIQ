
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "energyiq.db"


def get_db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db():
    connection = get_db()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('owner', 'tenant')),
            owner_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(owner_id) REFERENCES users(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS meter_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            owner_id INTEGER NOT NULL,
            tenant_id INTEGER NOT NULL,
            region TEXT NOT NULL,
            meter_id TEXT NOT NULL,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(owner_id) REFERENCES users(id),
            FOREIGN KEY(tenant_id) REFERENCES users(id),
            UNIQUE(tenant_id, region, meter_id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS energy_targets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            target_kwh REAL NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)

    # New table: properties owned by each owner.
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS properties (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            owner_id INTEGER NOT NULL,
            property_name TEXT NOT NULL,
            region TEXT NOT NULL,
            meter_id TEXT NOT NULL,
            address TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(owner_id) REFERENCES users(id),
            UNIQUE(owner_id, property_name)
        )
    """)

    # Safely migrate existing databases without deleting data.
    columns = {
        row["name"]
        for row in cursor.execute(
            "PRAGMA table_info(meter_assignments)"
        ).fetchall()
    }

    if "property_id" not in columns:
        cursor.execute("""
            ALTER TABLE meter_assignments
            ADD COLUMN property_id INTEGER
            REFERENCES properties(id)
        """)

    connection.commit()
    connection.close()
