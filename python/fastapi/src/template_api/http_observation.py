import asyncio
from collections.abc import Callable
from time import perf_counter

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from template_api.core.metrics import HttpMetrics

METHODS = frozenset(
    {"GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "TRACE", "CONNECT"}
)
EXCLUDED_PATHS = frozenset({"/metrics", "/health/live", "/health/ready"})


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
        status = "none"
        send_failed = False
        disconnected = False
        execution = "returned"

        async def observed_send(message: Message) -> None:
            nonlocal finished, status, send_failed
            try:
                await send(message)
            except OSError:
                send_failed = True
                raise
            if message["type"] == "http.response.start":
                code = message["status"]
                status = str(code) if 100 <= code <= 599 else "none"
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
            execution = "cancelled"
            raise
        except Exception:
            execution = "error"
            raise
        finally:
            if finished is not None:
                completion = "complete"
            elif send_failed:
                completion = "send_failed"
            elif execution == "cancelled":
                completion = "cancelled"
            elif disconnected:
                completion = "disconnected"
            else:
                completion = "incomplete"
            try:
                method = scope["method"] if scope["method"] in METHODS else "OTHER"
                route = getattr(scope.get("route"), "path", "unmatched")
                labels = (method, route, status, completion, execution)
                elapsed = (finished if finished is not None else self.timer()) - started
                self.metrics.requests.labels(*labels).inc()
                self.metrics.duration.labels(*labels).observe(max(0.0, elapsed))
            except Exception:
                # 누락된 계측을 정상으로 공개하지 않고 원래 응답·예외를 유지합니다.
                self.metrics.failed = True
