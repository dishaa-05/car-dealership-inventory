
from app.models import Vehicle


def test_vehicle_model_has_required_fields():
    columns = Vehicle.__table__.columns

    assert "id" in columns
    assert "make" in columns
    assert "model" in columns
    assert "category" in columns
    assert "price" in columns
    assert "quantity" in columns
