# ShadowTrader AI

ShadowTrader AI is a behavioral coaching platform for active traders. It connects to broker APIs, evaluates discipline rules against incoming trades, and delivers real-time alerts without executing trades on the user's behalf.

## Start Services

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

```bash
cd backend
source .venv/bin/activate
celery -A app.celery_app worker --loglevel=info
```

```bash
cd backend
source .venv/bin/activate
celery -A app.celery_app beat --loglevel=info
```

```bash
cd dashboard
npm run dev
```

```bash
cd overlay
npm run dev
```

## Dashboard Auth Environment

Copy `dashboard/.env.example` to `dashboard/.env` and fill in Supabase values when moving off dev mode.

## Production

- Use `backend/.env.production.example` as the base for production secrets.
- Build the backend image with `backend/Dockerfile`.
- Start production services with `docker compose -f docker-compose.prod.yml up --build`.
- `render.yaml` defines separate web/worker/beat services for Render-style deployments.

## Seed Test Data

```bash
cd backend
source .venv/bin/activate
python scripts/seed_test_data.py
```
