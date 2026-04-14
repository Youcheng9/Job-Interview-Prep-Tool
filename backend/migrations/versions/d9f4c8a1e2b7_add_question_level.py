"""add question level

Revision ID: d9f4c8a1e2b7
Revises: a52b92e2d9b4
Create Date: 2026-04-13 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = "d9f4c8a1e2b7"
down_revision: Union[str, Sequence[str], None] = "a52b92e2d9b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    columns = {column["name"] for column in inspector.get_columns("questions")}
    indexes = {index["name"] for index in inspector.get_indexes("questions")}
    uniques = {constraint["name"] for constraint in inspector.get_unique_constraints("questions")}

    if "level" not in columns:
        op.add_column(
            "questions",
            sa.Column("level", sa.String(length=32), nullable=False, server_default="new_grad"),
        )
        op.alter_column("questions", "level", server_default=None)

    if op.f("ix_questions_level") not in indexes:
        op.create_index(op.f("ix_questions_level"), "questions", ["level"], unique=False)

    if "uq_questions_role_level_prompt" not in uniques:
        if "uq_questions_role_prompt" in uniques:
            op.drop_constraint("uq_questions_role_prompt", "questions", type_="unique")
        op.create_unique_constraint(
            "uq_questions_role_level_prompt",
            "questions",
            ["role", "level", "prompt"],
        )


def downgrade() -> None:
    op.drop_constraint("uq_questions_role_level_prompt", "questions", type_="unique")
    op.create_unique_constraint("uq_questions_role_prompt", "questions", ["role", "prompt"])
    op.drop_index(op.f("ix_questions_level"), table_name="questions")
    op.drop_column("questions", "level")
