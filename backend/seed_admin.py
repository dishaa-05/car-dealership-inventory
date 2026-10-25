"""
seed_admin.py — Bootstrap a default admin account for local development.

Default credentials (change these via env vars before deploying):
  Email:    admin@drivehub.com
  Password: Admin@1234
  Role:     admin

Usage (run from the backend/ directory):
  python seed_admin.py

The script is idempotent: if an admin with this email already exists it
prints a notice and exits without making any changes.

Environment variables (optional overrides):
  SEED_ADMIN_EMAIL    — defaults to admin@drivehub.com
  SEED_ADMIN_PASSWORD — defaults to Admin@1234
"""

import os
import sys

# Ensure the backend package is importable when run as a script
sys.path.insert(0, os.path.dirname(__file__))

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.models import User  # noqa: E402
from pwdlib import PasswordHash  # noqa: E402

ADMIN_EMAIL = os.getenv("SEED_ADMIN_EMAIL", "admin@drivehub.com")
ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", "Admin@1234")

password_hash = PasswordHash.recommended()


def seed_admin() -> None:
    """Create the default admin user if it does not already exist."""
    # Ensure tables exist (safe to call repeatedly)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == ADMIN_EMAIL.lower()).first()
        if existing:
            print(f"[seed_admin] Admin account already exists: {ADMIN_EMAIL}")
            return

        admin = User(
            email=ADMIN_EMAIL.lower(),
            hashed_password=password_hash.hash(ADMIN_PASSWORD),
            role="admin",
        )
        db.add(admin)
        db.commit()
        print(f"[seed_admin] Created admin account: {ADMIN_EMAIL}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()
