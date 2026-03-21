"""Discipline score helpers."""

from decimal import Decimal, ROUND_HALF_UP


def calculate_discipline_score(rules_followed: int, total_rule_checks: int) -> Decimal:
    """Compute the discipline score percentage."""

    if total_rule_checks <= 0:
        return Decimal("100.00")
    score = (Decimal(rules_followed) / Decimal(total_rule_checks)) * Decimal("100")
    return score.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
