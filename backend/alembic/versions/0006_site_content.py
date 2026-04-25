"""site_content (per-locale CMS overrides)

Revision ID: 0006_site_content
Revises: 0005_presence_unread
Create Date: 2026-04-25

"""
from alembic import op
import sqlalchemy as sa


revision = "0006_site_content"
down_revision = "0005_presence_unread"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "site_content",
        sa.Column("locale", sa.String(length=8), primary_key=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("site_content")
