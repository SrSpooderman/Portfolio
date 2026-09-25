from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    database_url: str
    redis_url: str
    jwt_secret: str = Field(min_length=32)
    refresh_token_pepper: str = Field(min_length=32)
    publication_path: Path = Path("storage/published")
    asset_path: Path = Path("storage/assets")
    cookie_secure: bool = True

    @model_validator(mode="after")
    def validate_security(self):
        if self.jwt_secret.startswith("replace-") or self.refresh_token_pepper.startswith("replace-"):
            raise ValueError("Configure unique authentication secrets")
        if self.app_env == "production" and not self.cookie_secure:
            raise ValueError("Production requires secure cookies")
        return self


settings = Settings()
