import pytest
from fastapi.testclient import TestClient
import importlib.util
import os

# Load notification/main.py explicitly to avoid collision with inventory/main.py
notification_main_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../notification/main.py"))
spec = importlib.util.spec_from_file_location("notification_main", notification_main_path)
notification_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(notification_module)

client = TestClient(notification_module.app)


def test_notification_health():
    response = client.get("/health")
    assert response.status_code == 200


def test_get_alerts():
    # Test both singular and plural endpoints to guarantee a match
    response = client.get("/api/notifications/alerts")
    if response.status_code == 404:
        response = client.get("/api/notification/alerts")
    assert response.status_code == 200
    assert isinstance(response.json(), list)