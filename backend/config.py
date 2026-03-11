from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./gu_board_review.db"
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480  # 8 hours

    professor_username: str = "admin"
    professor_password: str = "changeme"

    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    radiopaedia_client_id: str = ""
    radiopaedia_client_secret: str = ""

    seed_data_path: str = "data/seed_questions.json"
    taxonomy_path: str = "data/gu_taxonomy.json"
    anthropic_api_key: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
