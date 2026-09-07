# FastAPI 시작점

Python 3.14.7과 uv로 실행하는 최소 FastAPI 앱입니다.
이 디렉터리에서 환경을 준비하고 실행합니다.

```sh
uv tool run --from uv==0.12.10 uv sync --locked
cp -n .env.example .env
uv tool run --from uv==0.12.10 uv run --locked python -m template_api.run
```

기본 주소는 http://127.0.0.1:18080 이며 `/docs`에서 API 문서를 확인합니다.
`.env.example`은 공유 설정 예시이며 `.env`는 Git에서 제외합니다.

```sh
uv tool run --from uv==0.12.10 uv build
```

빌드 결과는 `dist/`에 생성합니다. 환경 설정은 실행 시 주입합니다.
