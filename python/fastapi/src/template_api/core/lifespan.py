from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import AbstractAsyncContextManager, AsyncExitStack, asynccontextmanager

from fastapi import FastAPI

type PrepareResources = Callable[[FastAPI, AsyncExitStack], Awaitable[None]]
type Lifespan = Callable[[FastAPI], AbstractAsyncContextManager[None]]


async def prepare_resources(app: FastAPI, stack: AsyncExitStack) -> None:
    """현재 외부 자원은 없습니다. 도입 시 획득 직후 stack에 정리를 등록합니다."""


def create_lifespan(prepare: PrepareResources) -> Lifespan:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.ready = False
        stack = AsyncExitStack()
        try:
            await prepare(app, stack)
            app.state.ready = True
            yield
        except BaseException as error:
            # 취소와 초기화 실패도 자원을 정리한 뒤 원래 실패로 전파합니다.
            app.state.ready = False
            try:
                await stack.aclose()
            except BaseException as cleanup_error:
                raise error from cleanup_error
            raise
        else:
            app.state.ready = False
            await stack.aclose()

    return lifespan
