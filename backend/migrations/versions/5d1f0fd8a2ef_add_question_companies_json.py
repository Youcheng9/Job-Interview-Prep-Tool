"""add question companies json

Revision ID: 5d1f0fd8a2ef
Revises: 8b3f23b3f3c1
Create Date: 2026-05-04 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "5d1f0fd8a2ef"
down_revision: Union[str, Sequence[str], None] = "8b3f23b3f3c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("questions")}

    if "companies" not in columns:
        op.add_column("questions", sa.Column("companies", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("questions", "companies")
