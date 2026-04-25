"""matches + messages

Revision ID: 0003_match_message
Revises: 0002_profile_photo
Create Date: 2026-04-25

"""
from alembic import op
import sqlalchemy as sa


revision = "0003_match_message"
down_revision = "0002_profile_photo"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "matches",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "initiator_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "recipient_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=16),
            nullable=False,
            server_default="open",
        ),
        sa.Column("quota_limit", sa.Integer(), nullable=True),
        sa.Column("quota_used", sa.Integer(), nullable=False, server_default="0"),
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
        sa.Column("matched_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("initiator_id", "recipient_id", name="uq_match_pair"),
    )
    op.create_index("ix_matches_initiator_id", "matches", ["initiator_id"])
    op.create_index("ix_matches_recipient_id", "matches", ["recipient_id"])

    op.create_table(
        "messages",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "match_id",
            sa.Integer(),
            sa.ForeignKey("matches.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "sender_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_messages_match_id", "messages", ["match_id"])
    op.create_index("ix_messages_created_at", "messages", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_messages_created_at", table_name="messages")
    op.drop_index("ix_messages_match_id", table_name="messages")
    op.drop_table("messages")
    op.drop_index("ix_matches_recipient_id", table_name="matches")
    op.drop_index("ix_matches_initiator_id", table_name="matches")
    op.drop_table("matches")
