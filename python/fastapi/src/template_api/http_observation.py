import asyncio
from collections.abc import Callable
from time import perf_counter

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from template_api.core.contracts import HttpCompletion, HttpExecution, HttpRequestResult
from template_api.core.metrics import HttpMetrics

EXCLUDED_PATHS = frozenset(
    {
        "/metrics",
        "/health/live",
        "/health/ready",
        "/docs",
        "/docs/oauth2-redirect",
        "/openapi.json",
        "/redoc",
    }
)


def resolve_completion(
    *,
    finished: float | None,
    send_failed: bool,
    disconnected: bool,
    execution: HttpExecution,
) -> HttpCompletion:
    """전송 완료 사실을 후속 오류·취소보다 우선합니다."""
    if finished is not None:
        return HttpCompletion.COMPLETE
    if send_failed:
        return HttpCompletion.SEND_FAILED
    if execution is HttpExecution.CANCELLED:
        return HttpCompletion.CANCELLED
    if disconnected:
        return HttpCompletion.DISCONNECTED
    return HttpCompletion.INCOMPLETE


class HttpObservation:
    """완성된 ASGI 앱 바깥에서 전송·실행 결과만 관측합니다."""

    def __init__(
        self,
        app: ASGIApp,
        metrics: HttpMetrics,
        *,
        timer: Callable[[], float] = perf_counter,
    ) -> None:
        self.app = app
        self.metrics = metrics
        self.timer = timer

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["path"] in EXCLUDED_PATHS:
            await self.app(scope, receive, send)
            return

        started = self.timer()
        finished: float | None = None
        status: int | None = None
        send_failed = False
        disconnected = False
        execution = HttpExecution.RETURNED

        async def observed_send(message: Message) -> None:
            nonlocal finished, status, send_failed
            try:
                await send(message)
            except OSError:
                send_failed = True
                raise
            if message["type"] == "http.response.start":
                code = message["status"]
                status = code if 100 <= code <= 599 else None
            elif message["type"] == "http.response.body" and not message.get(
                "more_body", False
            ):
                finished = self.timer()

        async def observed_receive() -> Message:
            nonlocal disconnected
            message = await receive()
            if message["type"] == "http.disconnect":
                disconnected = True
            return message

        try:
            await self.app(scope, observed_receive, observed_send)
        except asyncio.CancelledError:
            execution = HttpExecution.CANCELLED
            raise
        except Exception:
            execution = HttpExecution.ERROR
            raise
        finally:
            elapsed = (finished if finished is not None else self.timer()) - started
            self.metrics.record(
                HttpRequestResult(
                    method=scope["method"],
                    route=getattr(scope.get("route"), "path", "unmatched"),
                    status=status,
                    completion=resolve_completion(
                        finished=finished,
                        send_failed=send_failed,
                        disconnected=disconnected,
                        execution=execution,
                    ),
                    execution=execution,
                    duration_seconds=max(0.0, elapsed),
                )
            )
