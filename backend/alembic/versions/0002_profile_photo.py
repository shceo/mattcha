"""profile + photo

Revision ID: 0002_profile_photo
Revises: 0001_init_users
Create Date: 2026-04-25

"""
from alembic import op
import sqlalchemy as sa


revision = "0002_profile_photo"
down_revision = "0001_init_users"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "profiles",
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("full_name", sa.String(length=100), nullable=False),
        sa.Column("gender", sa.String(length=8), nullable=False),
        sa.Column("birth_date", sa.Date(), nullable=False),
        sa.Column("occupation", sa.String(length=200), nullable=True),
        sa.Column("life_goals", sa.Text(), nullable=True),
        sa.Column("address", sa.String(length=255), nullable=True),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lng", sa.Float(), nullable=True),
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
        "photos",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("path", sa.String(length=500), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_photos_user_id", "photos", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_photos_user_id", table_name="photos")
    op.drop_table("photos")
    op.drop_table("profiles")
