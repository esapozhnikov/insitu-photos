from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ...database import get_db
from ... import crud, schemas, models, auth
from ...tasks import index_folder_task
import os

router = APIRouter()

@router.post("/", response_model=schemas.FolderResponse, dependencies=[Depends(auth.requires_admin)])
def add_folder(folder: schemas.FolderCreate, db: Session = Depends(get_db)):
    db_folder = crud.get_folder_by_path(db, folder.path)
    if db_folder:
        raise HTTPException(status_code=400, detail="Folder already indexed")
    return crud.create_folder(db, folder.path)

@router.get("/", response_model=List[schemas.FolderResponse], dependencies=[Depends(auth.requires_user)])
def get_folders(db: Session = Depends(get_db)):
    return db.query(models.Folder).all()

@router.get("/tree", dependencies=[Depends(auth.requires_user)])
def get_folder_tree(db: Session = Depends(get_db)):
    # Fetch all unique directory paths from indexed photos
    
    paths = db.query(models.Photo.physical_path).distinct().all()
    
    tree = {}
    for (path,) in paths:
        if not path:
            continue
            
        # Get the directory path (excluding filename)
        dir_path = os.path.dirname(path)
        if not dir_path or dir_path == ".":
            continue

        # Normalize to forward slashes for tree building
        normalized_dir = dir_path.replace('\\', '/')
        parts = normalized_dir.split('/')

        current = tree
        full_path = ""
        for i, part in enumerate(parts):
            if i == 0 and not part:
                # Leading slash case
                full_path = "/"
                continue

            if not part:
                continue

            if full_path == "/":
                full_path += part
            elif full_path:
                full_path += "/" + part
            else:
                full_path = part

            if part not in current:
                current[part] = {"_path": full_path, "_children": {}}
            current = current[part]["_children"]

    # Convert nested dict to a list-based tree for the frontend
    def format_node(name, node):
        # Sort children by name (case-insensitive)
        sorted_children = sorted(node["_children"].items(), key=lambda x: x[0].lower())
        return {
            "name": name,
            "path": node["_path"],
            "children": [format_node(k, v) for k, v in sorted_children]
        }
        
    # Sort top-level nodes (case-insensitive)
    root_nodes = sorted(tree.items(), key=lambda x: x[0].lower())
    return [format_node(k, v) for k, v in root_nodes]

@router.post("/{folder_id}/scan", dependencies=[Depends(auth.requires_user)])
def scan_folder(folder_id: int, db: Session = Depends(get_db)):
    db_folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if not db_folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    index_folder_task.delay(db_folder.path)
    return {"message": "Scanning started"}

@router.delete("/{folder_id}", dependencies=[Depends(auth.requires_admin)])
def remove_folder(folder_id: int, db: Session = Depends(get_db)):
    success = crud.delete_folder(db, folder_id)
    if not success:
        raise HTTPException(status_code=404, detail="Folder not found")
    return {"message": "Folder removed"}
