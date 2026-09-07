"""create reservation tables

Revision ID: 1340e51366e8
Revises:
Create Date: 2026-09-08 00:49:35.160962

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "1340e51366e8"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "products",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("available", sa.Integer(), nullable=False),
        sa.CheckConstraint("available >= 0", name="ck_products_available_nonnegative"),
    )
    op.create_table(
        "reservations",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column(
            "product_id", sa.String(64), sa.ForeignKey("products.id"), nullable=False
        ),
        sa.Column("created_at", sa.String(32), nullable=False),
    )
    op.create_table(
        "idempotency_keys",
        sa.Column("key", sa.String(128), primary_key=True),
        sa.Column(
            "product_id", sa.String(64), sa.ForeignKey("products.id"), nullable=False
        ),
        sa.Column(
            "reservation_id",
            sa.String(32),
            sa.ForeignKey("reservations.id"),
            unique=True,
            nullable=False,
        ),
        sa.Column("response", sa.JSON(), nullable=False),
        sa.CheckConstraint(
            "length(key) BETWEEN 1 AND 128", name="ck_idempotency_key_length"
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("idempotency_keys")
    op.drop_table("reservations")
    op.drop_table("products")
