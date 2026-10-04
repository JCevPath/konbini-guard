import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../notification")))

from app.main import app

client = TestClient(app)


def test_notification_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_get_alerts():
    response = client.get("/api/notifications/alerts")
    assert response.status_code == 200
    assert isinstance(response.json(), list)