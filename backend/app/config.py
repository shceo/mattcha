from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="", extra="ignore")

    app_env: str = "local"
    app_secret_key: str = "dev-secret-change-me"
    app_access_token_ttl_min: int = 30
    app_refresh_token_ttl_days: int = 14

    db_url: str = "mysql+asyncmy://mattcha:mattcha@localhost:3306/mattcha"
    db_url_sync: str = "mysql+pymysql://mattcha:mattcha@localhost:3306/mattcha"

    uploads_dir: str = "./uploads"
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
