"""
Seed script to populate the database with sample vehicles.
Run with: python seed_vehicles.py from the backend/ directory.
"""

from app.database import SessionLocal, Base, engine
from app.models import Vehicle

Base.metadata.create_all(bind=engine)

VEHICLES = [
    {"make": "Toyota",  "model": "Corolla",  "category": "Sedan",    "price": 850000,  "quantity": 5},
    {"make": "Honda",   "model": "Civic",    "category": "Sedan",    "price": 950000,  "quantity": 3},
    {"make": "Hyundai", "model": "Creta",    "category": "SUV",      "price": 1200000, "quantity": 4},
    {"make": "Maruti",  "model": "Swift",    "category": "Hatchback","price": 600000,  "quantity": 8},
    {"make": "BMW",     "model": "X5",       "category": "SUV",      "price": 7500000, "quantity": 2},
    {"make": "Tata",    "model": "Nexon",    "category": "SUV",      "price": 900000,  "quantity": 6},
    {"make": "Kia",     "model": "Seltos",   "category": "SUV",      "price": 1100000, "quantity": 3},
    {"make": "Ford",    "model": "Mustang",  "category": "Sports",   "price": 7500000, "quantity": 1},
]

def seed():
    db = SessionLocal()
    try:
        for v in VEHICLES:
            exists = db.query(Vehicle).filter(
                Vehicle.make == v["make"],
                Vehicle.model == v["model"]
            ).first()
            if not exists:
                db.add(Vehicle(**v))
                print(f"Added: {v['make']} {v['model']}")
            else:
                print(f"Skipped (already exists): {v['make']} {v['model']}")
        db.commit()
        print("\nDone! All vehicles seeded.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
