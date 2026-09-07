from sqlalchemy import (
    JSON,
    CheckConstraint,
    Column,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
)

metadata = MetaData()

products = Table(
    "products",
    metadata,
    Column("id", String(64), primary_key=True),
    Column("available", Integer, nullable=False),
    CheckConstraint("available >= 0", name="ck_products_available_nonnegative"),
)

reservations = Table(
    "reservations",
    metadata,
    Column("id", String(32), primary_key=True),
    Column("product_id", String(64), ForeignKey("products.id"), nullable=False),
    Column("created_at", String(32), nullable=False),
)

idempotency_keys = Table(
    "idempotency_keys",
    metadata,
    Column("key", String(128), primary_key=True),
    Column("product_id", String(64), ForeignKey("products.id"), nullable=False),
    Column(
        "reservation_id",
        String(32),
        ForeignKey("reservations.id"),
        unique=True,
        nullable=False,
    ),
    Column("response", JSON, nullable=False),
    CheckConstraint("length(key) BETWEEN 1 AND 128", name="ck_idempotency_key_length"),
)
