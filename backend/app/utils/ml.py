import httpx
import logging
import json
from ..config import settings

logger = logging.getLogger(__name__)

async def detect_faces(image_path: str, model_name: str = "buffalo_l", min_score: float = 0.7):
    async with httpx.AsyncClient(timeout=60.0) as client:
        with open(image_path, "rb") as f:
            # Immich ML v2.x expects task -> type -> model config
            # Task: 'facial-recognition', Types: 'detection', 'recognition'
            entries = {
                "facial-recognition": {
                    "detection": {
                        "modelName": model_name,
                        "minScore": min_score
                    },
                    "recognition": {
                        "modelName": model_name
                    }
                }
            }
            
            files = {
                "image": ( "image.jpg", f, "image/jpeg" )
            }
            data = {
                "entries": json.dumps(entries)
            }
            
            response = await client.post(
                f"{settings.ml_url}/predict",
                files=files,
                data=data
            )
            
            if response.status_code != 200:
                logger.error(f"ML Service Error {response.status_code}: {response.text}")
                response.raise_for_status()
            
            result_dict = response.json()
            logger.info(f"ML Result Keys: {list(result_dict.keys())}")
            # Immich ML v2.x returns results keyed by type if multiple models are run
            # When requesting 'recognition' which depends on 'detection', it often returns a list of faces
            # each containing bounding box and embedding.
            
            # Let's try to find the faces list. It might be in result_dict['facial-recognition'] 
            # or flattened if only one task was run.
            faces = result_dict.get("facial-recognition", [])
            logger.info(f"Detected {len(faces)} faces")
            return faces
