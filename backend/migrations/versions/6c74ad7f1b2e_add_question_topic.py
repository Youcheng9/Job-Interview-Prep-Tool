"""add question topic

Revision ID: 6c74ad7f1b2e
Revises: 5d1f0fd8a2ef
Create Date: 2026-05-05 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "6c74ad7f1b2e"
down_revision: Union[str, Sequence[str], None] = "5d1f0fd8a2ef"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("questions")}
    indexes = {index["name"] for index in inspector.get_indexes("questions")}

    if "topic" not in columns:
        op.add_column("questions", sa.Column("topic", sa.String(length=64), nullable=True))
    if op.f("ix_questions_topic") not in indexes:
        op.create_index(op.f("ix_questions_topic"), "questions", ["topic"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_questions_topic"), table_name="questions")
    op.drop_column("questions", "topic")
