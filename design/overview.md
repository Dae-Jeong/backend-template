# 프로젝트 개요

백엔드 서비스를 시작할 때 반복해서 필요한 설정·의존성 주입·자원 수명·오류 처리·로깅·계측의 기준을 정리하고, 언어와 프레임워크에 맞는 시작점을 만드는 프로젝트입니다.

**FastAPI·NestJS·Spring Boot에서 설정·DI·관측 기반과 예약의 동시성·멱등성을 구현했습니다.**
[구현별 안내](implementations/README.md)에서 실행 방법과 실제 검증 범위를 선택합니다.
PostgreSQL 전환과 인증·운영 연동은 후속 범위입니다.

## 가이드 읽기

처음 사용한다면 **[구현 선택](implementations/README.md) → 해당 구현의 실행·기능 추가 안내** 순서로 읽습니다.
구조나 문제가 궁금하면 같은 구현의 폴더 안내·검증 기록으로 이동합니다.

검색·목차·Mermaid를 갖춘 MkDocs 가이드는 저장소 루트에서 실행합니다.

```sh
uv tool run --from uv==0.12.10 uv run --project docs --locked mkdocs serve
```

[로컬 가이드 열기](http://127.0.0.1:18090) · 종료는 실행 터미널에서 Ctrl+C입니다.
문서 도구는 `docs/pyproject.toml`·`docs/uv.lock`으로 앱과 분리해 관리합니다.
링크·목차·anchor 검사는 같은 명령에서 `serve` 대신 `build --strict`로 실행합니다.

가이드는 README·`design/`·구현 README 원문을 직접 읽습니다. 문서를 수정하면 로컬 화면에 반영되며 별도 본문 복사본을 만들지 않습니다.
`mkdocs.yml`은 메뉴·화면 설정, `docs/hooks.py`는 문서만 사이트에 포함하는 경계입니다. `site/`는 Git에서 제외한 빌드 결과입니다.

## 한눈에 보는 구조

```mermaid
flowchart TB
    INPUT["입력 경계 · 요청 해석과 응답"] --> APP["Application · 업무 순서와 의존성"]
    APP --> DOMAIN["Domain · 정책과 불변조건"]
    APP -. "필요한 기능에만 추가" .-> ADAPTER["출력 Adapter · 저장과 외부 통신"]
    ADAPTER --> SYSTEM["DB · 외부 서비스"]
    FOUNDATION["공통 기반 · 설정 / DI / 자원 수명 / 로그 / 계측"]
```

화살표는 호출 방향이며 응답은 반대로 돌아옵니다. 점선 영역은 선택 확장입니다. 공통 기반은 전체 실행을 지원하며 별도의 업무 계층이 아닙니다. 이 그림은 배포 서버나 필수 클래스 목록이 아닌 **논리적 책임 구조**입니다.

[전체 아키텍처와 실행 흐름](backend.md#전체-아키텍처)에서 의존성 조립, 초기화·종료, 작업 처리 순서를 함께 확인할 수 있습니다.

공통 설계는 무엇을 보장할지 정의합니다. 구현 설계는 해당 언어의 실행 모델과 프레임워크로 그 계약을 어떻게 충족할지 정의합니다. 클래스·폴더·DI 도구를 언어 간 동일하게 강제하지 않습니다.

| 문서 | 역할 |
| --- | --- |
| [설계 안내](README.md) | 상태·읽는 순서·문서 소유권입니다. |
| [개발 원칙](engineering.md) | 업무·DB·외부 연계·타입·검증의 기준입니다. |
| [Runtime Review](runtime-review.md) | 성능·런타임·용량·비용 판단 기준입니다. |
| [Backend 공통 설계](backend.md) | 책임 경계·설정·초기화·종료·검증 계약입니다. |
| [로깅과 관측](observability.md) | 공통 필드·수집 경계·기능별 확장·설계 선택입니다. |
| [구현별 설계 안내](implementations/README.md) | 선택한 기술의 설계·검증·진행 상태로 연결합니다. |

## 제공 범위

공통 설계는 책임 경계, 설정과 의존성, 자원 수명, 작업의 성공·실패·취소, 관측과 검증을 다룹니다.
어떤 기능과 도구를 실제로 제공할지는 구현별 설계에서 정합니다. 공통 책임이 있다는 이유로 모든 계층이나 외부 시스템을 미리 만들지는 않습니다.

`design/`는 설계 정본입니다. 다른 저장소의 아이디어를 추가로 찾아야 이해할 수 있는 구조로 만들지 않습니다.
`compose.yaml` 하나가 로컬 실행을 정의하고, `scripts/compose.sh`가 사용할 구현을 선택합니다.
`infra/monitoring/`은 Compose가 참조하는 수집기·대시보드 설정을 소유합니다.
현재 연결·검증 범위는 [로깅과 관측](observability.md)에서 안내합니다.

언어·프레임워크·패키지·실행 명령은 구현별 문서가 소유합니다. 루트 설명은 특정 구현을 전체 Backend의 기준으로 삼지 않습니다.

## 사용할 방식

로컬 컨테이너는 저장소 루트에서 `fastapi`, `nestjs`, `spring-boot`를 선택합니다.

```sh
./scripts/compose.sh fastapi up --build --wait
# 다른 구현도 별도 포트와 데이터 볼륨으로 실행
./scripts/compose.sh nestjs up --build --wait api
./scripts/compose.sh spring-boot up --build --wait api
# 공유 모니터링은 한 번만 실행
./scripts/compose.sh fastapi --profile monitoring up --wait prometheus grafana
# 공유 모니터링 중지
./scripts/compose.sh fastapi stop grafana prometheus
```

스크립트는 구현을 선택한 뒤 나머지 인자를 Docker Compose에 전달합니다.
모니터링은 기본 비활성이며, 이미 실행 중인 모니터링은 profile을 생략해도 자동 종료되지 않습니다.
앱별 Dockerfile·환경 예시와 사용 안내는 각 구현이 소유합니다. 이 Compose는 로컬 전용입니다.
기본 DB는 비활성이며 예약 실험은 각 실행 안내의 URL·migration·seed 순서를 따릅니다.
수집 경로와 대시보드의 의미는 [로컬 모니터링](implementations/local-monitoring.md)에서 확인합니다.

소비 저장소에서 이 저장소를 Git submodule로 연결해 특정 커밋을 고정하고, 구현된 템플릿을 서비스 경로로 복사하는 방식을 계획합니다. submodule 연결과 런타임 패키지 import는 다릅니다. 템플릿 원본 업데이트가 복사한 서비스에 자동 적용되지는 않습니다.

확인한 설치·실행 명령과 미구현 범위는 [구현별 안내](implementations/README.md)에서 연결하는 사용 안내에 제공합니다.
공개 여부와 별개로 재사용 라이선스는 아직 선택하지 않았습니다.
