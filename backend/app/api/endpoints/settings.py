from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ...database import get_db
from ... import crud, schemas, auth

router = APIRouter(dependencies=[Depends(auth.requires_admin)])

@router.get("/", response_model=List[schemas.SettingResponse])
def get_settings(db: Session = Depends(get_db)):
    return crud.get_settings(db)

@router.get("/{key}", response_model=schemas.SettingResponse)
def get_setting(key: str, db: Session = Depends(get_db)):
    setting = crud.get_setting(db, key)
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting

@router.put("/{key}", response_model=schemas.SettingResponse)
def update_setting(key: str, update: schemas.SettingUpdate, db: Session = Depends(get_db)):
    return crud.update_setting(db, key, update.value)
