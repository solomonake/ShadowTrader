"""Rule routes."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user_id
from app.models.rule import Rule
from app.routers.deps import get_session
from app.schemas.rule import RuleCreate, RuleRead, RuleUpdate
from app.services.rule_templates import TEMPLATES

router = APIRouter(prefix="/rules", tags=["rules"])


@router.post("", response_model=RuleRead, status_code=status.HTTP_201_CREATED)
async def create_rule(
    payload: RuleCreate,
    user_id: UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> RuleRead:
    """Create a discipline rule."""

    rule = Rule(
        user_id=user_id,
        rule_type=payload.rule_type.value,
        severity=payload.severity.value,
        params=payload.params,
        enabled=payload.enabled,
    )
    session.add(rule)
    await session.commit()
    await session.refresh(rule)
    return RuleRead.model_validate(rule)


@router.get("", response_model=list[RuleRead])
async def list_rules(
    user_id: UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> list[RuleRead]:
    """List rules for a user."""

    result = await session.execute(select(Rule).where(Rule.user_id == user_id).order_by(Rule.created_at.desc()))
    return [RuleRead.model_validate(rule) for rule in result.scalars().all()]


@router.patch("/{rule_id}", response_model=RuleRead)
async def update_rule(
    rule_id: UUID,
    payload: RuleUpdate,
    user_id: UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> RuleRead:
    """Update a rule."""

    rule = await session.get(Rule, rule_id)
    if rule is None or rule.user_id != user_id:
        raise HTTPException(status_code=404, detail="Rule not found.")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(rule, field, value.value if hasattr(value, "value") else value)
    await session.commit()
    await session.refresh(rule)
    return RuleRead.model_validate(rule)


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(
    rule_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete a rule."""

    rule = await session.get(Rule, rule_id)
    if rule is None or rule.user_id != user_id:
        raise HTTPException(status_code=404, detail="Rule not found.")
    await session.delete(rule)
    await session.commit()


@router.post("/templates/{template_name}", response_model=list[RuleRead], status_code=status.HTTP_201_CREATED)
async def apply_rule_template(
    template_name: str,
    user_id: UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> list[RuleRead]:
    """Apply a predefined rule template."""

    template = TEMPLATES.get(template_name)
    if template is None:
        raise HTTPException(status_code=404, detail="Template not found.")

    created_rules: list[Rule] = []
    for definition in template:
        rule = Rule(
            user_id=user_id,
            rule_type=definition["rule_type"],
            severity=definition["severity"],
            params=definition["params"],
            enabled=True,
        )
        session.add(rule)
        created_rules.append(rule)
    await session.commit()
    for rule in created_rules:
        await session.refresh(rule)
    return [RuleRead.model_validate(rule) for rule in created_rules]
