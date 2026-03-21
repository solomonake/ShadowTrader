"""Supabase client helpers."""

from functools import lru_cache

from app.config import get_settings


@lru_cache(maxsize=1)
def get_supabase_client():
    """Return a cached Supabase client when configured."""

    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_anon_key:
        return None

    from supabase import Client, create_client

    return create_client(settings.supabase_url, settings.supabase_anon_key)
