"""Initial schema."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260319_000001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Apply initial schema."""

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_table(
        "broker_connections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("broker", sa.String(length=50), nullable=False),
        sa.Column("credentials", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("is_paper", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("connected", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "broker", name="uq_broker_connections_user_broker"),
    )
    op.create_table(
        "rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rule_type", sa.String(length=50), nullable=False),
        sa.Column("severity", sa.String(length=10), nullable=False, server_default="warn"),
        sa.Column("params", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.CheckConstraint("severity IN ('warn', 'block', 'log')", name="severity_allowed"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_table(
        "trading_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("trade_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rules_followed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rules_broken", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_pnl", sa.Numeric(18, 8), nullable=False, server_default="0"),
        sa.Column("discipline_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_table(
        "trades",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("broker", sa.String(length=50), nullable=False),
        sa.Column("broker_trade_id", sa.String(length=255), nullable=False),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("side", sa.String(length=4), nullable=False),
        sa.Column("quantity", sa.Numeric(18, 8), nullable=False),
        sa.Column("price", sa.Numeric(18, 8), nullable=False),
        sa.Column("pnl", sa.Numeric(18, 8), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["session_id"], ["trading_sessions.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "broker", "broker_trade_id", name="uq_trades_user_broker_trade"),
    )
    op.create_index("idx_trades_user_time", "trades", ["user_id", "timestamp"], unique=False)
    op.create_table(
        "rule_violations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rule_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("trade_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(length=10), nullable=False),
        sa.Column("acknowledged", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["rule_id"], ["rules.id"]),
        sa.ForeignKeyConstraint(["trade_id"], ["trades.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_violations_user", "rule_violations", ["user_id", "timestamp"], unique=False)


def downgrade() -> None:
    """Revert initial schema."""

    op.drop_index("idx_violations_user", table_name="rule_violations")
    op.drop_table("rule_violations")
    op.drop_index("idx_trades_user_time", table_name="trades")
    op.drop_table("trades")
    op.drop_table("trading_sessions")
    op.drop_table("rules")
    op.drop_table("broker_connections")
    op.drop_table("users")
