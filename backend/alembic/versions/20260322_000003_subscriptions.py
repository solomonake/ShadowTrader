"""Add subscriptions table."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260322_000003"
down_revision = "20260321_000002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create the subscriptions table."""

    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("stripe_customer_id", sa.String(length=255), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(length=255), nullable=True),
        sa.Column("tier", sa.String(length=20), nullable=False, server_default="trial"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_subscriptions_user_id"),
    )


def downgrade() -> None:
    """Drop the subscriptions table."""

    op.drop_table("subscriptions")
