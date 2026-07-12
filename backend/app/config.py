import os
from pydantic_settings import BaseSettings
from pydantic import ValidationError

class Settings(BaseSettings):
    GEMINI_API_KEY: str
    DATABASE_URL: str = "sqlite:///./chat_history.db"
    VECTOR_STORE_DIR: str = "./vector_store"

    class Config:
        env_file = ".env"

try:
    settings = Settings()
    if not settings.GEMINI_API_KEY.strip():
        raise ValueError("GEMINI_API_KEY cannot be an empty string.")
except (ValidationError, ValueError) as e:
    import sys
    print(f"CRITICAL CONFIGURATION ERROR: {e}")
    print("Please check that your backend/.env file contains a valid GEMINI_API_KEY.")
    sys.exit(1) 