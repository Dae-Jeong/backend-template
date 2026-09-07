# FastAPI 시작점

Status: 최소 HTTP 앱·환경 설정·패키지 빌드 검증 · 2026-09-07

이 디렉터리는 독립적인 uv 프로젝트입니다. Python 버전은 `.python-version`,
의존성은 `pyproject.toml`과 `uv.lock`에서 관리합니다. Python 3.14.7,
FastAPI 0.141.1, Uvicorn 0.52.4로 최소 실행을 확인했습니다.
`src/template_api/`가 애플리케이션 코드의 시작점입니다.

## 폴더 구조

[폴더 구조와 활용 기준](../../design/implementations/fastapi-structure.md)에서 실제 구조 Mermaid,
파일별 역할, 스키마·업무 타입·ORM 모델의 구분, 소비 프로젝트에서 변경할 수 있는 부분을 확인합니다.

## 빌드와 실행 흐름

```mermaid
flowchart TD
    SOURCE["pyproject.toml · src/"] --> BUILD["uv build"]
    BUILD --> DIST["dist/ · wheel와 소스 배포본"]
    ENV["환경변수 · .env · 기본값"] --> SETTINGS["Settings 검증"]
    RUN["python -m template_api.run"] --> SETTINGS
    SETTINGS --> APP["create_app(settings)"]
    APP --> SERVER["Uvicorn · 단일 worker"]
```

공통 설계는 [design](../../design/README.md), 구현 계약은
[FastAPI 설계](../../design/implementations/fastapi.md), 진행 상태는
[단계별 task](../../design/implementations/fastapi-tasks.md)가 소유합니다.
## 설치와 실행

이 디렉터리에서 실행합니다. 기존 전역 uv를 변경하지 않고 uv 0.12.10을 실행합니다.

```sh
uv tool run --from uv==0.12.10 uv sync --locked
cp -n .env.example .env
uv tool run --from uv==0.12.10 uv run --locked python -m template_api.run
```

실행 전 18080 포트 점유를 확인합니다. 종료는 실행 터미널에서 Ctrl+C입니다.

- `GET /`: `{"message":"Hello, FastAPI!"}`
- `GET /v1/greetings?name=Marin`: 정규화된 이름의 인사와 UTC `generated_at`; 앞뒤 공백 제거 후 1~80자
- `/docs`: Swagger UI
- `/openapi.json`: OpenAPI 명세
- `/health/live`: 생존 응답 200
- `/health/ready`: 준비 완료 200, 미완료 503

위 세 경로의 HTTP 200과 루트 응답을 실제 로컬 서버에서 확인했습니다.
인사 API의 입력 검증·clock DI·lifespan·health까지 구현했습니다. 구조화 로그·metrics와
기존 전체 검증 명세는 아직 구현·검증하지 않았습니다.

## 명시적 DI

```mermaid
flowchart TD
    FACTORY["create_app · clock 인자로 받음"] --> STATE["앱별 clock 참조"]
    STATE --> PROVIDER["dependencies.get_clock"]
    PROVIDER -->|"ClockDep · Depends"| ROUTE["greetings.api · 입력 검증"]
    ROUTE -->|"name · clock 일반 인자"| WORK["greetings.usecase.make_greeting"]
    WORK --> RESULT["Greeting · 불변 dataclass"]
    OVERRIDE["app.dependency_overrides"] -. "앱별 대역 교체" .-> PROVIDER
```

선택 근거와 후속 자원 수명 계약은 [DI 설계](../../design/implementations/fastapi-di-options.md)가 소유합니다.
업무 단위 시험은 `make_greeting(name=..., clock=...)`을 직접 호출합니다.
HTTP 시험은 `app.dependency_overrides[get_clock]`에 clock 함수를 반환하는 provider를 등록합니다.
clock은 timezone-aware UTC datetime을 반환하는 계약입니다.
공통 `Clock`은 `core/contracts.py`, 인사 결과 `Greeting`은 `greetings/contracts.py`,
앱 수명 타입은 루트 `contracts.py`가 소유합니다. 업무가 HTTP 조립 타입을 import하지 않습니다.

## 환경 설정

`.env.example`은 공유하는 예시이며 `.env`는 Git에서 제외되는 로컬 설정입니다.
프로젝트 디렉터리에서 실행하면 해당 디렉터리의 `.env`를 읽습니다.
프로세스 환경변수 > `.env` > 코드 기본값 순서로 적용됩니다.

| 설정 | 역할 |
| --- | --- |
| `APP_NAME` | OpenAPI의 앱 이름 |
| `SERVICE_VERSION` | OpenAPI의 서비스 버전; 패키지 빌드 버전과 별개 |
| `SERVER_HOST` | 서버 바인딩 주소; 기본 loopback |
| `SERVER_PORT` | 서버 포트; 1~65535 |
| `SHUTDOWN_TIMEOUT_SECONDS` | 종료 시 진행 중 요청 대기 시간; 기본 15초, cleanup 전체 제한은 아님 |
| `LOG_LEVEL` | Uvicorn 로그 수준; 소문자 사용 |

설정은 시작 시 한 번 검증해 앱에 명시적으로 전달합니다. 잘못된 설정은 입력 원문을 출력하지 않고 종료합니다.
로그 수준은 현재 Uvicorn에 적용되며 공통 구조화 로깅의 완성을 의미하지 않습니다.
패키지 버전·의존성·Python 버전은 빌드 입력에 남기고 환경변수로 바꾸지 않습니다.

## 빌드와 검증

```sh
uv tool run --from uv==0.12.10 uv build
uv tool run --from uv==0.12.10 uv run --locked ruff check .
uv tool run --from uv==0.12.10 uv run --locked ruff format --check .
uv tool run --from uv==0.12.10 uv run --locked ty check
uv tool run --from uv==0.12.10 uv run --locked pytest -q
```

`dist/`에 wheel과 소스 배포본을 생성합니다. 빌드는 Python 패키징이며 Docker 이미지 빌드는 후속입니다.
의존성 고정은 `uv.lock`과 `uv sync --locked`가 담당하며 wheel만으로 의존성 전체가 고정되지는 않습니다.
빌드 산출물에 `.env`·가상환경이 없음을 확인했습니다.
설정 우선순위·앱별 설정 분리·잘못된 설정의 안전한 시작 실패 테스트 3개가 통과했습니다.
lifespan·health·SIGTERM 시험을 포함한 현재 전체 테스트는 21개가 통과했습니다.
시작 실패·취소·정리 오류에서의 cleanup과 앱별 readiness 분리를 확인했습니다.
실제 서버의 SIGTERM 후 진행 요청 완료·자원 정리 순서는 POSIX 환경의 격리 프로세스로 검증합니다.
외부 자원은 대역이며, 강제 종료·실제 DB·LB drain은 검증 범위 밖입니다.

수명 흐름과 준비 함수 주입 계약은 [FastAPI 설계](../../design/implementations/fastapi.md#앱-조립-차용안)를 참고합니다.
readiness는 lifespan 준비 성공 상태이며 DB 건강이나 무중단 배포 보장이 아닙니다.

### 개발 검증 기준

검사 기준은 이 프로젝트의 `pyproject.toml`이 소유하며 상위 Ruff 설정을 상속하지 않습니다.
도구 버전은 `uv.lock`으로 고정합니다. 별도 검사 wrapper나 전역 설정은 추가하지 않습니다.

| 도구 | 검사 기준 |
| --- | --- |
| Ruff | Python 3.14, 88자 포맷; 문법·미사용 이름·import 정렬·흔한 버그·현대 Python 문법 |
| ty | `src/`와 `tests/`의 타입 검사, Python 3.14 기준 |
| pytest | `tests/` 수집, importlib 모드, 알 수 없는 설정·marker 오류 처리 |

포맷 수정은 `uv tool run --from uv==0.12.10 uv run --locked ruff format .`으로 수행합니다.
타입 검사는 [ty](https://docs.astral.sh/ty/type-checking/) 하나를 사용합니다.
이는 런타임 입력 검증이나 업무 불변조건 시험을 대신하지 않습니다.

`tests/conftest.py`가 각 테스트의 작업 디렉터리를 임시 디렉터리로 바꾸고,
Settings가 읽는 환경변수를 대소문자와 관계없이 제거한 뒤 테스트 종료 시 복원합니다.
개인 `.env`를 읽지 않으며 dotenv 시험은 임시 파일을 직접 준비합니다.
잘못된 `LOG_LEVEL`·`SERVER_PORT`와 혼합 대소문자 환경변수를 주입한 실행에서도 테스트 3개가 통과했습니다.

경고는 기본적으로 오류로 처리합니다. HTTP 클라이언트는
[Starlette 공식 안내](https://starlette.dev/testclient/)에 따라 `httpx2`를 사용합니다.
현재 Starlette 1.6.0의 `anyio.abc.BlockingPortal` 참조 경고 한 건만 정확한 메시지·모듈에 한정해
표시를 유지하며 실패 대상에서 제외합니다. 수정 릴리스 도입 시 이 예외를 제거하고 재검증합니다.

초기화는 `uv init --app --package --build-backend uv --python 3.14.7` 계열 명령,
의존성 추가는 `uv add fastapi uvicorn`, lock 갱신은 `uv lock`으로 수행했습니다.
생성 후 프로젝트 설명·README 참조·Python 지원 범위를 조정하고 사용하지 않는 기본 CLI entry point를 제거했습니다.
