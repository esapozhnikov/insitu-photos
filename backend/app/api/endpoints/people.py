from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import logging
from ...database import get_db
from ... import crud, schemas, models, auth

router = APIRouter(dependencies=[Depends(auth.requires_user)])

@router.get("/", response_model=List[schemas.PersonResponse])
def get_people(db: Session = Depends(get_db)):
    # Optimized query to get people
    people = db.query(models.Person).all()
    
    person_ids = [p.id for p in people]
    if person_ids:
        for person in people:
            # Get one face thumbnail for each person
            face = db.query(models.Face).filter(
                models.Face.person_id == person.id, 
                models.Face.thumbnail_path != None
            ).first()
            if face:
                person.thumbnail_path = face.thumbnail_path
            
            # Get total count of faces for this person
            person.face_count = db.query(models.Face).filter(
                models.Face.person_id == person.id
            ).count()
                
    return people

@router.post("/", response_model=schemas.PersonResponse)
def create_person(person: schemas.PersonCreate, db: Session = Depends(get_db)):
    return crud.create_person(db, person)

@router.get("/unnamed-faces", response_model=List[schemas.FaceResponse])
def get_unnamed_faces(db: Session = Depends(get_db)):
    return db.query(models.Face).filter(models.Face.person_id == None).limit(50).all()

@router.post("/faces", response_model=List[schemas.FaceResponse])
def get_faces(face_ids: List[int], db: Session = Depends(get_db)):
    return db.query(models.Face).filter(models.Face.id.in_(face_ids)).all()

@router.get("/unnamed-clusters", response_model=List[schemas.FaceClusterResponse])
def get_unnamed_clusters(db: Session = Depends(get_db), limit: int = 1000):
    # Fetch settings from DB
    threshold_setting = crud.get_setting(db, "ml_recognition_threshold")
    min_faces_setting = crud.get_setting(db, "ml_min_faces")
    
    threshold = float(threshold_setting.value) if threshold_setting else 0.15
    min_faces = int(min_faces_setting.value) if min_faces_setting else 1

    # 1. Fetch unnamed faces with embeddings, limited to avoid O(N^2) explosion
    # In a real app, we'd use a vector index or a proper clustering algorithm like DBSCAN
    unnamed_faces = db.query(models.Face).filter(
        models.Face.person_id == None,
        models.Face.embedding != None
    ).limit(limit).all()
    
    # 2. Also fetch faces WITHOUT embeddings (failed processing)
    failed_faces = db.query(models.Face).filter(
        models.Face.person_id == None,
        models.Face.embedding == None
    ).limit(100).all()

    logging.info(f"Clustering up to {len(unnamed_faces)} unnamed faces (plus {len(failed_faces)} failed)")

    clusters = []
    visited_ids = set()

    # Add failed faces as individual clusters
    for face in failed_faces:
        clusters.append({
            "representative_face": face,
            "face_ids": [face.id],
            "count": 1
        })

    # 3. Optimized in-memory clustering
    # Pre-calculate norms for cosine distance if needed, but InsightFace usually returns normalized vectors.
    # To be safe and avoid numpy dependency, we'll use a simple dot product.
    
    face_list = list(unnamed_faces)
    for i, face in enumerate(face_list):
        if face.id in visited_ids:
            continue
        
        cluster_face_ids = [face.id]
        visited_ids.add(face.id)
        
        # Current face embedding
        emb_a = face.embedding
        
        # Compare with remaining faces
        for j in range(i + 1, len(face_list)):
            other = face_list[j]
            if other.id in visited_ids:
                continue
                
            emb_b = other.embedding
            
            # Calculate cosine distance: 1 - (dot_product / (norm_a * norm_b))
            # Assuming normalized vectors (common for InsightFace), it's just 1 - dot_product
            dot_product = sum(a * b for a, b in zip(emb_a, emb_b))
            distance = 1.0 - dot_product
            
            if distance < threshold:
                cluster_face_ids.append(other.id)
                visited_ids.add(other.id)

        clusters.append({
            "representative_face": face,
            "face_ids": cluster_face_ids,
            "count": len(cluster_face_ids)
        })

    # Filter by minimum faces
    if min_faces > 1:
        clusters = [c for c in clusters if c["count"] >= min_faces]

    # Sort clusters by count (largest groups first)
    clusters.sort(key=lambda x: x["count"], reverse=True)
    print(f"Formed {len(clusters)} clusters in-memory")
    
    return clusters

@router.patch("/faces/{face_id}", response_model=schemas.FaceResponse)
def update_face(face_id: int, updates: dict, db: Session = Depends(get_db)):
    person_id = updates.get("person_id")
    if person_id is None:
        raise HTTPException(status_code=400, detail="person_id is required")
    face = crud.assign_face_to_person(db, face_id, person_id)
    if not face:
        raise HTTPException(status_code=404, detail="Face not found")
    return face

@router.get("/{person_id}/faces", response_model=List[schemas.FaceResponse])
def get_person_faces(person_id: int, db: Session = Depends(get_db)):
    return db.query(models.Face).filter(models.Face.person_id == person_id).all()

@router.patch("/{person_id}", response_model=schemas.PersonResponse)
def update_person(person_id: int, updates: schemas.PersonUpdate, db: Session = Depends(get_db)):
    db_person = db.query(models.Person).filter(models.Person.id == person_id).first()
    if not db_person:
        raise HTTPException(status_code=404, detail="Person not found")
    db_person.name = updates.name
    db.commit()
    db.refresh(db_person)
    return db_person

@router.delete("/{person_id}")
def delete_person(person_id: int, db: Session = Depends(get_db)):
    crud.delete_person(db, person_id)
    return {"message": "Person deleted"}

@router.post("/merge", response_model=schemas.PersonResponse)
def merge_people(params: schemas.PersonMerge, db: Session = Depends(get_db)):
    person = crud.merge_people(db, params.source_person_id, params.target_person_id)
    if not person:
        raise HTTPException(status_code=404, detail="One or both people not found")
    return person

@router.post("/bulk-assign")
def bulk_assign_faces(params: schemas.FaceBulkAssign, db: Session = Depends(get_db)):
    person_id = params.person_id
    
    if not person_id and params.name:
        # Check if person already exists by name (case-insensitive)
        db_person = db.query(models.Person).filter(models.Person.name.ilike(params.name)).first()
        if not db_person:
            # Create new person
            db_person = models.Person(name=params.name)
            db.add(db_person)
            db.commit()
            db.refresh(db_person)
        person_id = db_person.id
    
    if not person_id:
        raise HTTPException(status_code=400, detail="person_id or name required")

    db.query(models.Face).filter(models.Face.id.in_(params.face_ids)).update(
        {models.Face.person_id: person_id},
        synchronize_session='fetch'
    )
    db.commit()
    return {"message": f"Assigned {len(params.face_ids)} faces to person {person_id}", "person_id": person_id}
