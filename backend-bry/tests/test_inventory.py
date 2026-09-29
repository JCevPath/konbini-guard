import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add inventory path to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../inventory")))

from main import app

client = TestClient(app)


def test_inventory_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_get_inventory():
    response = client.get("/api/inventory")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_and_discard_batch():
    # 1. Create a batch
    create_res = client.post("/api/inventory", json={"item_id": 1, "amount": 10})
    assert create_res.status_code == 201
    data = create_res.json()
    assert data["item_id"] == 1
    assert data["amount"] == 10
    assert data["status"] == "FRESH"
    
    batch_id = data["batch_id"]

    # 2. Discard the batch
    discard_res = client.patch(f"/api/inventory/{batch_id}/discard")
    assert discard_res.status_code == 200
    assert discard_res.json()["status"] == "DISCARDED"