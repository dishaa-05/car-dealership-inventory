
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def get_auth_headers():
    import uuid

    email = f"{uuid.uuid4().hex}@example.com"
    password = "TestPassword123!"

    register_response = client.post(
        "/api/auth/register",
        json={"email": email, "password": password},
    )
    assert register_response.status_code == 201

    login_response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert login_response.status_code == 200

    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_test_vehicle(headers, quantity=3):
    response = client.post(
        "/api/vehicles",
        headers=headers,
        json={
            "make": "Toyota",
            "model": "Corolla",
            "category": "Sedan",
            "price": 25000,
            "quantity": quantity,
        },
    )
    assert response.status_code == 201
    return response.json()


def test_get_vehicles_returns_list():
    headers = get_auth_headers()
    response = client.get("/api/vehicles", headers=headers)

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_vehicle():
    headers = get_auth_headers()
    vehicle = create_test_vehicle(headers, quantity=5)

    assert vehicle["make"] == "Toyota"
    assert vehicle["model"] == "Corolla"
    assert vehicle["quantity"] == 5
    assert "id" in vehicle


def test_search_vehicles_by_make():
    headers = get_auth_headers()
    create_test_vehicle(headers)

    response = client.get(
        "/api/vehicles/search?make=Toyota",
        headers=headers,
    )

    assert response.status_code == 200
    assert all(
        vehicle["make"].lower() == "toyota"
        for vehicle in response.json()
    )


def test_update_vehicle():
    headers = get_auth_headers()
    vehicle = create_test_vehicle(headers)

    response = client.put(
        f"/api/vehicles/{vehicle['id']}",
        headers=headers,
        json={
            "make": "Honda",
            "model": "Civic",
            "category": "Sedan",
            "price": 23000,
            "quantity": 4,
        },
    )

    assert response.status_code == 200
    assert float(response.json()["price"]) == 23000
    assert response.json()["quantity"] == 4


def test_delete_vehicle_requires_admin():
    headers = get_auth_headers()
    vehicle = create_test_vehicle(headers)

    response = client.delete(
        f"/api/vehicles/{vehicle['id']}",
        headers=headers,
    )

    assert response.status_code == 403


def test_purchase_vehicle_reduces_quantity():
    headers = get_auth_headers()
    vehicle = create_test_vehicle(headers, quantity=3)

    response = client.post(
        f"/api/vehicles/{vehicle['id']}/purchase",
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["quantity"] == 2


def test_purchase_vehicle_fails_when_out_of_stock():
    headers = get_auth_headers()
    vehicle = create_test_vehicle(headers, quantity=0)

    response = client.post(
        f"/api/vehicles/{vehicle['id']}/purchase",
        headers=headers,
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Vehicle out of stock"


def test_vehicle_list_requires_login():
    response = client.get("/api/vehicles")

    assert response.status_code == 401


def test_registration_rejects_duplicate_email():
    email = f"{__import__('uuid').uuid4().hex}@example.com"
    payload = {"email": email, "password": "TestPassword123!"}

    first = client.post("/api/auth/register", json=payload)
    second = client.post("/api/auth/register", json=payload)

    assert first.status_code == 201
    assert second.status_code == 409


def test_search_vehicles_by_min_price():
    headers = get_auth_headers()
    # create a cheap and expensive vehicle
    client.post("/api/vehicles", headers=headers, json={"make": "Tata", "model": "Nano", "category": "Hatchback", "price": 5000, "quantity": 2})
    client.post("/api/vehicles", headers=headers, json={"make": "BMW", "model": "7Series", "category": "Sedan", "price": 100000, "quantity": 1})

    response = client.get("/api/vehicles/search?min_price=50000", headers=headers)
    assert response.status_code == 200
    assert all(float(v["price"]) >= 50000 for v in response.json())


def test_search_vehicles_by_price_range():
    headers = get_auth_headers()
    client.post("/api/vehicles", headers=headers, json={"make": "Maruti", "model": "Swift", "category": "Hatchback", "price": 20000, "quantity": 3})
    client.post("/api/vehicles", headers=headers, json={"make": "Audi", "model": "A8", "category": "Sedan", "price": 200000, "quantity": 1})

    response = client.get("/api/vehicles/search?min_price=10000&max_price=50000", headers=headers)
    assert response.status_code == 200
    for v in response.json():
        assert 10000 <= float(v["price"]) <= 50000
