"""AI coaching service."""

from __future__ import annotations

import asyncio
import re
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.chat_message import ChatMessage
from app.services.trader_analytics import (
    compute_discipline_score_today,
    format_trend,
    get_enabled_rules_count,
    get_recent_pattern_alerts,
    get_recent_sessions,
    get_today_pattern_alerts,
    get_today_violations,
    get_trades_today,
    get_user_baseline,
    summarize_patterns,
    summarize_violations,
    total_pnl,
)

SYSTEM_PROMPT = """You are a trading psychology coach inside ShadowTrader AI. Your role is to help traders build self-awareness about their behavioral patterns.

RULES:
1. Ask questions instead of giving answers. Use the Socratic method.
2. Reference the trader's SPECIFIC data — never give generic advice.
3. NEVER give trade recommendations ("buy X", "sell Y", "enter here").
4. NEVER predict market direction or provide signals.
5. Focus on behavior, discipline, and emotional patterns.
6. Be warm but direct. Traders respect honesty, not coddling.
7. End every response with one reflection question.
8. Keep responses under 200 words. Traders are busy.

COACHING FRAMEWORKS YOU DRAW FROM:
- Mark Douglas ("Trading in the Zone"): probabilistic thinking, accepting uncertainty
- Brett Steenbarger: behavioral patterns, performance psychology
- Motivational Interviewing: open questions, reflective listening, supporting autonomy

You have access to the trader's data. Use it to ground every response in their reality."""


class AICoachService:
    """Service for AI coaching conversations."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize the coach service."""

        self.session = session
        self.settings = get_settings()

    async def get_recent_history(self, user_id: uuid.UUID, limit: int = 10) -> list[ChatMessage]:
        """Return recent chat history in chronological order."""

        statement = (
            select(ChatMessage)
            .where(ChatMessage.user_id == user_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
        )
        history = list((await self.session.scalars(statement)).all())
        return list(reversed(history))

    async def store_message(
        self,
        user_id: uuid.UUID,
        role: str,
        content: str,
        metadata: dict | None = None,
    ) -> ChatMessage:
        """Persist a chat message."""

        message = ChatMessage(
            user_id=user_id,
            role=role,
            content=content,
            metadata_json=metadata or {},
        )
        self.session.add(message)
        await self.session.flush()
        return message

    async def build_context(self, user_id: uuid.UUID) -> tuple[str, dict]:
        """Build context from the trader's recent data."""

        trades_today = await get_trades_today(self.session, user_id)
        violations_today = await get_today_violations(self.session, user_id)
        baseline = await get_user_baseline(self.session, user_id)
        recent_sessions = await get_recent_sessions(self.session, user_id, days=7)
        patterns = await get_recent_pattern_alerts(self.session, user_id, days=7)
        patterns_today = await get_today_pattern_alerts(self.session, user_id)
        enabled_rules_count = await get_enabled_rules_count(self.session, user_id)
        discipline_score_today = compute_discipline_score_today(
            trades_count=len(trades_today),
            violations_count=len(violations_today),
            enabled_rules_count=enabled_rules_count,
        )

        context = f"""
TRADER DATA CONTEXT:
- Today: {len(trades_today)} trades, {len(violations_today)} rule violations, {len(patterns_today)} pattern alerts
- Today's P&L: ${float(total_pnl(trades_today)):,.2f}
- Today's discipline score: {discipline_score_today:.1f}%
- Win rate (overall): {baseline.metrics.get('overall_win_rate', 'N/A') if baseline else 'N/A'}
- Average trades/day: {baseline.metrics.get('avg_trades_per_day', 'N/A') if baseline else 'N/A'}
- Most common violations this week: {summarize_violations(violations_today)}
- Detected patterns this week: {summarize_patterns(patterns)}
- 7-day discipline trend: {format_trend(recent_sessions)}
"""
        context_used = {
            "trades_referenced": len(trades_today),
            "patterns_detected": sorted({pattern.pattern_type for pattern in patterns}),
            "discipline_score_today": discipline_score_today,
        }
        return context, context_used

    async def get_coaching_response(self, user_id: uuid.UUID, user_message: str) -> dict:
        """Return an AI coaching response grounded in the user's data."""

        if not self.settings.anthropic_api_key:
            raise RuntimeError("AI coaching not configured. Add ANTHROPIC_API_KEY to .env")

        import anthropic

        context, context_used = await self.build_context(user_id)
        history = await self.get_recent_history(user_id, limit=10)

        messages = [{"role": message.role, "content": message.content} for message in history]
        messages.append({"role": "user", "content": user_message})

        client = anthropic.Anthropic(api_key=self.settings.anthropic_api_key)
        response = await asyncio.to_thread(
            client.messages.create,
            model=self.settings.anthropic_model,
            max_tokens=500,
            system=f"{SYSTEM_PROMPT}\n\n{context}",
            messages=messages,
        )

        assistant_text = ""
        for item in response.content:
            text = getattr(item, "text", "")
            if text:
                assistant_text += text

        reflection_question = self._extract_reflection_question(assistant_text)

        await self.store_message(user_id, "user", user_message)
        await self.store_message(
            user_id,
            "assistant",
            assistant_text,
            metadata={
                "context_used": context_used,
                "reflection_question": reflection_question,
                "generated_at": datetime.now(UTC).isoformat(),
            },
        )
        await self.session.commit()

        return {
            "response": assistant_text,
            "reflection_question": reflection_question,
            "context_used": context_used,
        }

    @staticmethod
    def _extract_reflection_question(text: str) -> str:
        """Extract the final reflection question from a response."""

        questions = re.findall(r"([^?.!]*\?)", text, flags=re.MULTILINE)
        if questions:
            return questions[-1].strip()
        return "What pattern do you notice most clearly in your behavior today?"
