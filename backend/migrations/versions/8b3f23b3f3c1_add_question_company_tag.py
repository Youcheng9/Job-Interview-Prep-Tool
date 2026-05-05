"""add question company tag

Revision ID: 8b3f23b3f3c1
Revises: f4c2c1a50b62
Create Date: 2026-05-04 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "8b3f23b3f3c1"
down_revision: Union[str, Sequence[str], None] = "f4c2c1a50b62"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("questions")}
    indexes = {index["name"] for index in inspector.get_indexes("questions")}

    if "company" not in columns:
        op.add_column("questions", sa.Column("company", sa.String(length=128), nullable=True))
    if op.f("ix_questions_company") not in indexes:
        op.create_index(op.f("ix_questions_company"), "questions", ["company"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_questions_company"), table_name="questions")
    op.drop_column("questions", "company")
