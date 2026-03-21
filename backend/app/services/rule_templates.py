"""Rule template definitions."""

TEMPLATES: dict[str, list[dict]] = {
    "day_trader": [
        {"rule_type": "max_trades_per_day", "params": {"max": 6}, "severity": "warn"},
        {"rule_type": "max_loss_per_day", "params": {"max_loss": 300}, "severity": "block"},
        {"rule_type": "cooldown_after_loss", "params": {"minutes": 10}, "severity": "warn"},
        {"rule_type": "no_trading_after", "params": {"hour": 15, "minute": 30, "timezone": "America/New_York"}, "severity": "warn"},
        {"rule_type": "max_consecutive_losses", "params": {"max": 3}, "severity": "block"},
    ],
    "swing_trader": [
        {"rule_type": "max_trades_per_day", "params": {"max": 3}, "severity": "warn"},
        {"rule_type": "max_loss_per_day", "params": {"max_loss": 500}, "severity": "block"},
        {"rule_type": "min_time_between_trades", "params": {"minutes": 60}, "severity": "warn"},
        {"rule_type": "max_position_size", "params": {"max_value": 10000}, "severity": "warn"},
    ],
    "scalper": [
        {"rule_type": "max_trades_per_day", "params": {"max": 20}, "severity": "warn"},
        {"rule_type": "max_loss_per_day", "params": {"max_loss": 200}, "severity": "block"},
        {"rule_type": "cooldown_after_loss", "params": {"minutes": 5}, "severity": "warn"},
        {"rule_type": "max_consecutive_losses", "params": {"max": 4}, "severity": "block"},
        {"rule_type": "max_position_size", "params": {"max_value": 3000}, "severity": "warn"},
    ],
    "crypto_trader": [
        {"rule_type": "max_trades_per_day", "params": {"max": 10}, "severity": "warn"},
        {"rule_type": "max_loss_per_day", "params": {"max_loss": 250}, "severity": "block"},
        {"rule_type": "no_trading_after", "params": {"hour": 0, "minute": 0, "timezone": "UTC"}, "severity": "warn"},
        {"rule_type": "cooldown_after_loss", "params": {"minutes": 15}, "severity": "warn"},
        {"rule_type": "min_time_between_trades", "params": {"minutes": 5}, "severity": "warn"},
    ],
    "custom": [],
}
