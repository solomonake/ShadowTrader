"""Application configuration."""

from functools import lru_cache
import secrets

from cryptography.fernet import Fernet
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables."""

    app_name: str = "ShadowTrader AI"
    api_prefix: str = "/api"
    database_url: str = "postgresql+asyncpg://shadowtrader:shadowtrader@localhost:5432/shadowtrader"
    redis_url: str = "redis://localhost:6379/0"
    environment: str = "development"
    secret_key: str | None = None
    fernet_key: str | None = None
    alpaca_api_key: str | None = None
    alpaca_secret_key: str | None = None
    alpaca_base_url: str = "https://paper-api.alpaca.markets"
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-4-6"
    auth_mode: str = "dev"
    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_jwt_secret: str | None = None
    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None
    stripe_price_starter_monthly: str | None = None
    stripe_price_starter_yearly: str | None = None
    stripe_price_pro_monthly: str | None = None
    stripe_price_pro_yearly: str | None = None
    frontend_url: str = "http://localhost:5173"
    cors_allowed_origins: str | None = None
    app_version: str = "1.0.0"
    default_user_timezone: str = "UTC"
    session_poll_interval_seconds: float = 5.0
    baseline_window_days: int = 90
    minimum_baseline_trades: int = 30

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @model_validator(mode="after")
    def validate_runtime_secrets(self) -> "Settings":
        """Require env-backed secrets outside dev and validate key formats."""

        dev_mode = self.environment == "development" or self.auth_mode == "dev"

        if not self.secret_key:
            if dev_mode:
                self.secret_key = secrets.token_urlsafe(48)
            else:
                raise ValueError("SECRET_KEY must be set.")
        if len(self.secret_key) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters.")

        if not self.fernet_key:
            if dev_mode:
                # Development-only fallback. Production must inject FERNET_KEY explicitly.
                self.fernet_key = Fernet.generate_key().decode()
            else:
                raise ValueError("FERNET_KEY must be set.")

        try:
            Fernet(self.fernet_key.encode())
        except Exception as exc:
            raise ValueError("FERNET_KEY must be a valid Fernet key.") from exc

        return self

    def get_cors_origins(self) -> list[str]:
        """Return the allowed CORS origins for the API."""

        origins = {
            "http://localhost:5173",
            "http://localhost:5174",
            self.frontend_url.rstrip("/"),
        }
        if self.cors_allowed_origins:
            origins.update(
                origin.strip().rstrip("/")
                for origin in self.cors_allowed_origins.split(",")
                if origin.strip()
            )
        return sorted(origins)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached settings instance."""

    return Settings()
