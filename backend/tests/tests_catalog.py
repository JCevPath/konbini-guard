import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

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
    
    data = response.json()
    assert "id" in data
    assert data["name"] == "Bento Box"
    assert data["category"] == "Meals"