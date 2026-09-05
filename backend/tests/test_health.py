from fastapi.testclient import TestClient

from app.main import app


def test_live_health() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/health/live")

    assert response.status_code == 200
    assert response.json() == {"success": True, "data": {"status": "ok"}}

