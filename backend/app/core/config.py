import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "RAG Doc Assistant"
    DATABASE_URL: str
    GEMINI_API_KEY: str
    EMBED_MODEL: str = "all-MiniLM-L6-v2"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

settings = Settings()
