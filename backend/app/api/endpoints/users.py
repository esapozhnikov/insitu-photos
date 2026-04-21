from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ...database import get_db
from ... import crud, schemas, models, auth

router = APIRouter(dependencies=[Depends(auth.requires_admin)])

@router.get("/", response_model=List[schemas.UserResponse])
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@router.post("/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return crud.create_user(db, user)

@router.patch("/{user_id}", response_model=schemas.UserResponse)
def update_user(user_id: int, updates: schemas.UserUpdate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if updates.password:
        db_user.hashed_password = auth.get_password_hash(updates.password)
    if updates.role:
        db_user.role = updates.role
    if updates.is_active is not None:
        db_user.is_active = updates.is_active
        
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting the last admin if we wanted to be safe, 
    # but for now just delete.
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted"}
