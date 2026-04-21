from pydantic_settings import BaseSettings, SettingsConfigDict
import secrets

class Settings(BaseSettings):
    database_url: str
    redis_url: str
    photo_root: str = "/photos"
    cache_root: str = "/cache"
    ml_url: str = "http://ml-service:3003"
    
    # Auth settings
    secret_key: str = secrets.token_urlsafe(32)
    admin_user: str = "admin"
    admin_password: str = "admin"

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
