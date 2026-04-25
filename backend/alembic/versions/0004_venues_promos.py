"""venues + promo_codes

Revision ID: 0004_venues_promos
Revises: 0003_match_message
Create Date: 2026-04-25

"""
from alembic import op
import sqlalchemy as sa


revision = "0004_venues_promos"
down_revision = "0003_match_message"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "venues",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("address", sa.String(length=255), nullable=False),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lng", sa.Float(), nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_table(
        "promo_codes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "venue_id",
            sa.Integer(),
            sa.ForeignKey("venues.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("discount_text", sa.String(length=64), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_promo_codes_venue_id", "promo_codes", ["venue_id"])


def downgrade() -> None:
    op.drop_index("ix_promo_codes_venue_id", table_name="promo_codes")
    op.drop_table("promo_codes")
    op.drop_table("venues")
