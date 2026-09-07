import os
import queue
import signal
import socket
import subprocess
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen

import pytest

SERVER = """
import asyncio
import sys
import uvicorn
from template_api.app import create_app
from template_api.core.settings import Settings

async def prepare(app, stack):
    async def close():
        print(f"RESOURCE_CLOSED ready={app.state.ready}", flush=True)
    stack.push_async_callback(close)

settings = Settings()
app = create_app(settings, prepare=prepare)

@app.get('/test/drain')
async def drain():
    print('REQUEST_STARTED', flush=True)
    await asyncio.to_thread(sys.stdin.readline)
    return {'finished': True}

uvicorn.run(app, fd=int(sys.argv[1]), access_log=False,
            timeout_graceful_shutdown=settings.shutdown_timeout_seconds)
"""


@pytest.mark.skipif(os.name != "posix", reason="POSIX SIGTERM·상속 socket 시험입니다.")
def test_sigterm_drains_request_before_resource_cleanup() -> None:
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
        process = subprocess.Popen(
            [sys.executable, "-c", SERVER, str(listener.fileno())],
            pass_fds=(listener.fileno(),),
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
        assert process.stdout is not None
        assert process.stdin is not None
        lines: queue.Queue[str] = queue.Queue()

        def read_output() -> None:
            assert process.stdout is not None
            for line in process.stdout:
                lines.put(line)

        reader = threading.Thread(target=read_output, daemon=True)
        reader.start()

        def wait_for(message: str) -> None:
            while True:
                line = lines.get(timeout=10)
                if message in line:
                    return

        def request(path: str) -> bytes:
            with urlopen(f"http://127.0.0.1:{port}{path}", timeout=10) as response:
                assert response.status == 200
                return response.read()

        try:
            wait_for("Uvicorn running")
            assert request("/health/ready") == b'{"status":"ready"}'
            with ThreadPoolExecutor(max_workers=1) as executor:
                pending = executor.submit(request, "/test/drain")
                try:
                    wait_for("REQUEST_STARTED")
                    process.send_signal(signal.SIGTERM)
                    wait_for("Shutting down")
                finally:
                    process.stdin.write("finish\n")
                    process.stdin.flush()
                assert pending.result(timeout=10) == b'{"finished":true}'
            wait_for("RESOURCE_CLOSED ready=False")
            process.wait(timeout=10)
            assert process.returncode in (0, -signal.SIGTERM)
        finally:
            if process.poll() is None:
                process.kill()
                process.wait(timeout=5)
            process.stdin.close()
            reader.join(timeout=5)
            process.stdout.close()
