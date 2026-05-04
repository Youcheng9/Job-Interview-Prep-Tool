"""add feedback chat tables

Revision ID: 2b7a4c91f113
Revises: d9f4c8a1e2b7
Create Date: 2026-05-04 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "2b7a4c91f113"
down_revision: Union[str, Sequence[str], None] = "d9f4c8a1e2b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "feedback_threads",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("answer_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["answer_id"], ["answers.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_feedback_threads_user_id"), "feedback_threads", ["user_id"], unique=False)
    op.create_index(op.f("ix_feedback_threads_answer_id"), "feedback_threads", ["answer_id"], unique=True)

    op.create_table(
        "feedback_messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("thread_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["thread_id"], ["feedback_threads.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_feedback_messages_thread_id"), "feedback_messages", ["thread_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_feedback_messages_thread_id"), table_name="feedback_messages")
    op.drop_table("feedback_messages")
    op.drop_index(op.f("ix_feedback_threads_answer_id"), table_name="feedback_threads")
    op.drop_index(op.f("ix_feedback_threads_user_id"), table_name="feedback_threads")
    op.drop_table("feedback_threads")
