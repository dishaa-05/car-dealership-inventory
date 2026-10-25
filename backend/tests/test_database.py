
from app.database import DATABASE_URL, engine


def test_database_uses_sqlite():
    assert DATABASE_URL == "sqlite:///./dealership.db"
    assert engine.dialect.name == "sqlite"
