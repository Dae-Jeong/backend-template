from fastapi import APIRouter

from template_api.dependencies.clock import ClockDep
from template_api.dependencies.database import DatabaseMetricsDep, PrimarySessionDep
from template_api.http.errors import PROBLEM_RESPONSES
from template_api.schemas.reservations import ReservationData, ReserveRequest
from template_api.schemas.responses import Problem, Success
from template_api.services.reservations import reserve

router = APIRouter(prefix="/v1/reservations", tags=["reservations"])


@router.post(
    "",
    status_code=201,
    response_model=Success[ReservationData],
    responses={**PROBLEM_RESPONSES, 409: {"model": Problem}, 503: {"model": Problem}},
)
async def create_reservation(
    body: ReserveRequest,
    session: PrimarySessionDep,
    metrics: DatabaseMetricsDep,
    clock: ClockDep,
) -> Success[ReservationData]:
    result = await reserve(
        session=session, metrics=metrics, product_id=body.product_id, clock=clock
    )
    return Success(
        data=ReservationData(
            reservation_id=result.reservation_id,
            product_id=result.product_id,
            created_at=result.created_at,
        )
    )
