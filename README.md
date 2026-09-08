# Backend Template

백엔드 서비스를 시작할 때 반복해서 필요한 설정·의존성 주입·자원 수명·오류 처리·로깅·계측의 기준을 정리하고, 언어와 프레임워크에 맞는 시작점을 만드는 프로젝트입니다.

**첫 구현은 설정·DI·관측 기반과 SQLite 예약의 동시성·멱등성까지 구현·검증했습니다.** 실행은 [첫 구현 사용 안내](python/fastapi/README.md#예약-예제-빠른-시작)에서 시작합니다. PostgreSQL 전환과 인증·운영 연동은 후속 범위입니다.

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

[전체 아키텍처와 실행 흐름](design/backend.md#전체-아키텍처)에서 의존성 조립, 초기화·종료, 작업 처리 순서를 함께 확인할 수 있습니다.

공통 설계는 무엇을 보장할지 정의합니다. 구현 설계는 해당 언어의 실행 모델과 프레임워크로 그 계약을 어떻게 충족할지 정의합니다. 클래스·폴더·DI 도구를 언어 간 동일하게 강제하지 않습니다.

| 문서 | 역할 |
| --- | --- |
| [설계 안내](design/README.md) | 상태·읽는 순서·문서 소유권입니다. |
| [개발 원칙](design/engineering.md) | 업무·DB·외부 연계·타입·검증의 기준입니다. |
| [Runtime Review](design/runtime-review.md) | 성능·런타임·용량·비용 판단 기준입니다. |
| [Backend 공통 설계](design/backend.md) | 책임 경계·설정·초기화·종료·검증 계약입니다. |
| [로깅과 관측](design/observability.md) | 공통 필드·수집 경계·기능별 확장·설계 선택입니다. |
| [구현별 설계 안내](design/implementations/README.md) | 선택한 기술의 설계·검증·진행 상태로 연결합니다. |

## 제공 범위

공통 설계는 책임 경계, 설정과 의존성, 자원 수명, 작업의 성공·실패·취소, 관측과 검증을 다룹니다.
어떤 기능과 도구를 실제로 제공할지는 구현별 설계에서 정합니다. 공통 책임이 있다는 이유로 모든 계층이나 외부 시스템을 미리 만들지는 않습니다.

`design/`는 설계 정본입니다. 다른 저장소의 아이디어를 추가로 찾아야 이해할 수 있는 구조로 만들지 않습니다.
`compose.yaml` 하나가 로컬 실행을 정의하고, `scripts/compose.sh`가 사용할 구현을 선택합니다.
`infra/monitoring/`은 Compose가 참조하는 수집기·대시보드 설정을 소유합니다.
현재 연결·검증 범위는 [로깅과 관측](design/observability.md)에서 안내합니다.

언어·프레임워크·패키지·실행 명령은 구현별 문서가 소유합니다. 루트 설명은 특정 구현을 전체 Backend의 기준으로 삼지 않습니다.

## 사용할 방식

로컬 컨테이너는 저장소 루트에서 실행합니다. 현재 선택 가능한 구현은 `fastapi`입니다.

```sh
./scripts/compose.sh fastapi up --build --wait
# 모니터링도 함께 실행
./scripts/compose.sh fastapi --profile monitoring up --build --wait
# 모니터링만 중지
./scripts/compose.sh fastapi stop grafana prometheus
# 전체 중지, 보관 데이터 유지
./scripts/compose.sh fastapi --profile monitoring stop
```

스크립트는 구현을 선택한 뒤 나머지 인자를 Docker Compose에 전달합니다.
모니터링은 기본 비활성이며, 이미 실행 중인 모니터링은 profile을 생략해도 자동 종료되지 않습니다.
앱별 Dockerfile·환경 예시와 사용 안내는 각 구현이 소유합니다. 이 Compose는 로컬 전용입니다.

소비 저장소에서 이 저장소를 Git submodule로 연결해 특정 커밋을 고정하고, 구현된 템플릿을 서비스 경로로 복사하는 방식을 계획합니다. submodule 연결과 런타임 패키지 import는 다릅니다. 템플릿 원본 업데이트가 복사한 서비스에 자동 적용되지는 않습니다.

확인한 설치·실행 명령과 미구현 범위는 [구현별 안내](design/implementations/README.md)에서 연결하는 사용 안내에 제공합니다.
공개 여부와 별개로 재사용 라이선스는 아직 선택하지 않았습니다.
