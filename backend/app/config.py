"""Application configuration."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables."""

    app_name: str = "ShadowTrader AI"
    api_prefix: str = "/api"
    database_url: str = "postgresql+asyncpg://shadowtrader:shadowtrader@localhost:5432/shadowtrader"
    redis_url: str = "redis://localhost:6379/0"
    environment: str = "development"
    secret_key: str = Field(
        default="0123456789ABCDEF0123456789ABCDEF",
        min_length=32,
    )
    fernet_key: str = "m4LzMNNrI4O6mPcJ9g2w8m3S71j7hXj8MOnK3S7nM9w="
    alpaca_api_key: str | None = None
    alpaca_secret_key: str | None = None
    alpaca_base_url: str = "https://paper-api.alpaca.markets"
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-4-20250514"
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


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached settings instance."""

    return Settings()
