import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.auth import create_access_token

client = TestClient(app)

def test_query_token_auth():
    # Use an endpoint that requires viewer role
    token = create_access_token(data={"sub": "admin"})
    response = client.get(f"/api/photos/1?token={token}")
    # Should not be 401
    assert response.status_code != 401
