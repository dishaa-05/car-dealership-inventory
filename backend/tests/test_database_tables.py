
from sqlalchemy import inspect
from app.database import Base, engine
from app.models import Vehicle


def test_vehicle_table_is_created():
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    assert inspector.has_table("vehicles")
