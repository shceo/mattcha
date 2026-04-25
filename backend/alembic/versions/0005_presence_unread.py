"""last_seen + show_online + per-match unread cursors

Revision ID: 0005_presence_unread
Revises: 0004_venues_promos
Create Date: 2026-04-25

"""
from alembic import op
import sqlalchemy as sa


revision = "0005_presence_unread"
down_revision = "0004_venues_promos"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "profiles",
        sa.Column(
            "show_online",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("1"),
        ),
    )
    op.add_column(
        "matches",
        sa.Column(
            "initiator_last_read_id",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "matches",
        sa.Column(
            "recipient_last_read_id",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("matches", "recipient_last_read_id")
    op.drop_column("matches", "initiator_last_read_id")
    op.drop_column("profiles", "show_online")
    op.drop_column("users", "last_seen_at")
