from app.auth import create_access_token
from app import models, crud, schemas

def test_query_token_auth(client, db):
    # Setup: Create admin user
    user_in = schemas.UserCreate(username="admin", password="password", role=models.UserRole.ADMIN)
    crud.create_user(db, user_in)
    
    # Use an endpoint that requires viewer role
    token = create_access_token(data={"sub": "admin"})
    
    # We need a real photo for /api/photos/1 to not 404, but we're testing 401
    response = client.get(f"/api/photos/1?token={token}")
    
    # Should not be 401 Unauthorized
    assert response.status_code != 401
