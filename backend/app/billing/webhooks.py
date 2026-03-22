"""Billing routes including Stripe webhooks."""

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user_id
from app.billing.middleware import require_feature
from app.billing.stripe_service import StripeService
from app.database import get_db_session
from app.schemas.billing import CheckoutRequest, CheckoutResponse, PortalResponse, SubscriptionRead

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/status", response_model=SubscriptionRead)
async def billing_status(
    user_id=Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_session),
) -> SubscriptionRead:
    """Return the current subscription state."""

    return await StripeService(session).get_subscription_status(user_id)


@router.post("/checkout", response_model=CheckoutResponse, responses={503: {}})
async def create_checkout(
    payload: CheckoutRequest,
    user_id=Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_session),
):
    """Create a Stripe checkout session."""

    try:
        url = await StripeService(session).create_checkout_session(user_id, payload.tier, payload.interval)
        return CheckoutResponse(checkout_url=url)
    except RuntimeError as exc:
        return JSONResponse(status_code=503, content={"error": str(exc)})
    except Exception as exc:
        return JSONResponse(status_code=503, content={"error": f"Stripe error: {exc}"})


@router.post("/portal", response_model=PortalResponse, responses={503: {}})
async def create_portal(
    user_id=Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_session),
):
    """Create a Stripe customer portal session."""

    try:
        url = await StripeService(session).create_portal_session(user_id)
        return PortalResponse(portal_url=url)
    except RuntimeError as exc:
        return JSONResponse(status_code=503, content={"error": str(exc)})
    except Exception as exc:
        return JSONResponse(status_code=503, content={"error": f"Stripe error: {exc}"})


@router.post("/webhook")
async def billing_webhook(request: Request, session: AsyncSession = Depends(get_db_session)):
    """Handle Stripe webhooks."""

    payload = await request.body()
    signature = request.headers.get("stripe-signature")
    try:
        result = await StripeService(session).handle_webhook(payload, signature)
        return JSONResponse(content=result)
    except RuntimeError as exc:
        return JSONResponse(status_code=503, content={"error": str(exc)})
