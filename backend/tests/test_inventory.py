import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from app.main import app

client = TestClient(app)

def test_quality_gate_failure():
    assert False, "Intentional failure to trigger quality gate"

def test_inventory_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_get_inventory_batches():
    response = client.get("/food/batches")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_and_discard_batch():
    create_res = client.post("/food/batches", json={"item_id": 1, "quantity": 10})
    assert create_res.status_code == 201
    data = create_res.json()
    assert data["item_id"] == 1
    assert data["quantity"] == 10
    assert data["status"] == "FRESH"
    
    batch_id = data["batch_id"]

    discard_res = client.patch(f"/food/batches/{batch_id}/discard")
    assert discard_res.status_code == 200
    assert discard_res.json()["status"] == "DISCARDED"