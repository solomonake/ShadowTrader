"""Celery application configuration."""

from celery import Celery
from celery.schedules import crontab

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "shadowtrader",
    broker=settings.redis_url,
    backend="redis://localhost:6379/1",
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/New_York",
    enable_utc=True,
)

celery_app.conf.beat_schedule = {
    "compute-baselines-nightly": {
        "task": "app.tasks.baseline_compute.compute_all_baselines",
        "schedule": crontab(hour=1, minute=0),
    },
    "generate-daily-summaries": {
        "task": "app.tasks.daily_summary.generate_all_summaries",
        "schedule": crontab(hour=16, minute=15),
    },
}

celery_app.autodiscover_tasks(["app.tasks"])
