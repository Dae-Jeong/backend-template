from sqlalchemy import insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from template_api.contracts.reservations import Product, Reservation
from template_api.exceptions.reservations import ProductNotFound, SoldOut
from template_api.models.reservations import products, reservations


async def get_product(session: AsyncSession, product_id: str) -> Product:
    row = (
        await session.execute(select(products).where(products.c.id == product_id))
    ).one_or_none()
    if row is None:
        raise ProductNotFound()
    return Product(product_id=row.id, available=row.available)


async def decrease_stock(session: AsyncSession, product_id: str) -> None:
    changed = await session.scalar(
        update(products)
        .where(products.c.id == product_id, products.c.available > 0)
        .values(available=products.c.available - 1)
        .returning(products.c.id)
    )
    if changed is None:
        await get_product(session, product_id)
        raise SoldOut()


async def save_reservation(session: AsyncSession, reservation: Reservation) -> None:
    await session.execute(
        insert(reservations).values(
            id=reservation.reservation_id,
            product_id=reservation.product_id,
            created_at=reservation.created_at.isoformat(),
        )
    )
