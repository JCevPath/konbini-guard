from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_catalog_items():
    response = client.get("/food/items")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_add_catalog_item():
    payload = {
        "name": "Bento Box",
        "category": "Meals",
        "shelf_life_minutes": 300
    }
    response = client.post("/food/items", json=payload)
    assert response.status_code == 201
    assert "item_id" in response.json()