"""venue pick: messages.kind/meta + matches.picked_venue_id

Revision ID: 0007_venue_pick
Revises: 0006_site_content
Create Date: 2026-04-25

"""
from alembic import op
import sqlalchemy as sa


revision = "0007_venue_pick"
down_revision = "0006_site_content"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "messages",
        sa.Column(
            "kind",
            sa.String(length=16),
            nullable=False,
            server_default="text",
        ),
    )
    op.add_column("messages", sa.Column("meta", sa.JSON(), nullable=True))
    op.add_column(
        "matches",
        sa.Column(
            "picked_venue_id",
            sa.Integer(),
            sa.ForeignKey("venues.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "matches",
        sa.Column("meeting_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("matches", "meeting_at")
    op.drop_column("matches", "picked_venue_id")
    op.drop_column("messages", "meta")
    op.drop_column("messages", "kind")
