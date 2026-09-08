# 구현별 설계 안내

이 디렉터리는 공통 Backend 계약을 선택한 언어·프레임워크에서 실현하는 방법을 소유합니다.
구체적인 코드 배치·DI 도구·런타임·패키지·환경 설정·실행 방법·시험은 이 수준에서 정의합니다.

| 구현 | 설계 | 검증 | 상태 |
| --- | --- | --- | --- |
| Python / FastAPI | [구현 설계](fastapi.md) | [검증 케이스](fastapi-verification.md) | [사용 안내](../../python/fastapi/README.md): SQLite 예약·동시성·멱등성 1차 구현·자동 검증 완료. PostgreSQL·인증·운영 연동은 후속입니다. |
| Java / Spring Boot | [구현 설계](spring-boot.md) · [폴더 구조](spring-boot-structure.md) | [검증 계획](spring-boot-verification.md) | 설계안 작성·검토 완료. [Task 1](spring-boot-tasks.md)부터 코드·실행·검증은 미착수입니다. |
| TypeScript / NestJS | [구현 설계](nestjs.md) · [폴더 구조](nestjs-structure.md) | [검증 계획](nestjs-verification.md) | 설계안 작성·검토 완료. [Task 1](nestjs-tasks.md)부터 코드·실행·검증은 미착수입니다. |
| Rust | 프레임워크부터 후속 결정 | 후속 결정 | 계획 후보이며 빈 프로젝트는 만들지 않습니다. |

첫 구현인 FastAPI는 예제 API·Settings·DI·lifespan·로깅·metrics·테스트·Docker Compose를 제공합니다.
FastAPI의 파일 역할과 소비 프로젝트의 변경 기준은 [폴더 구조 안내](fastapi-structure.md)에서 확인합니다.
실제 서비스에 가져갈 파일과 기능 연결 순서는 [서비스 적용 가이드](service-guide.md)에서 확인합니다.
초기 기반 이후 SQLite와 로컬 Prometheus·Grafana를 추가했습니다. 인증·채팅·외부 API·운영 모니터링은 후속입니다.

1차 완료 목표는 초기 기반을 거쳐 한정 수량 예약의 동시성·멱등성까지 구현·검증하는 것입니다.
[단계별 task](fastapi-tasks.md)에서 작은 단위로 사용자와 논의하고 진행합니다.
DB 통합은 후속 단계에서 대상과 변경 범위를 확인하며, 이 목표가 인프라 구축의 일괄 승인을 뜻하지 않습니다.

공통 계약 자체를 다시 정의하지 않고 [Backend](../backend.md), [개발 원칙](../engineering.md),
[관측](../observability.md), [Runtime Review](../runtime-review.md)를 참조합니다.
구현 차이·제약·미검증 범위는 각 구현 설계에 명시합니다. 특정 구현의 편의를 이유로 공통 의미를 조용히 바꾸지 않습니다.

## 병행 구현 준비

NestJS와 Spring Boot는 담당을 나눠 구현 설계·구조·검증·task를 작성했습니다.
공통 계약·문서 탐색·포트 배정은 여기서 통합합니다. 현재 범위는 설계 문서이며 실행 프로젝트를 생성한 상태가 아닙니다.

| 기준 | NestJS | Spring Boot |
| --- | --- | --- |
| 프로젝트 경로 | `ts/nestjs/` 예정 | `java/spring-boot/` 예정 |
| 생성·의존성 도구 | Nest CLI·pnpm | Spring Initializr·Gradle Wrapper |
| DI | 생성자·Provider·필요한 주입 토큰 | 생성자·Bean·필요한 qualifier |
| 폴더 배치 | 역할별 폴더 안에 기능별 파일 | 역할별 package 안에 기능별 클래스 |
| 첫 단계 | [Task 1](nestjs-tasks.md) | [Task 1](spring-boot-tasks.md) |

두 구현에서 맞출 것은 응답 의미·업무 트랜잭션·자원 수명·관측 계약입니다.
프레임워크의 파일 배치·검증 도구·DB API까지 동일하게 강제하지 않습니다.
실제 실행 명령은 각 Task 1을 검증한 뒤 사용 가이드에 등록합니다.

2026-09-08 문서 검증: MkDocs strict build, 새 문서 8개의 로컬 HTTP 응답과 링크,
PC 화면의 언어별 메뉴·폴더 Mermaid·task 목록을 확인했습니다. 앱 실행 검증은 각 구현의 후속 task입니다.

## 로컬 포트 배정

2026-09-08에 로컬 점유 상태와 기존 시험 코드를 확인했습니다. 예정 포트는 OS에서 예약한 것이 아니므로 실행 직전에 다시 확인합니다.
새 구현의 포트 계획은 이 표가 단독 관리하며 실행 코드가 생기면 환경 예시·Compose에 반영합니다.

| 대상 | 네이티브 게시 | 컨테이너 게시 | 컨테이너 내부 | 상태 |
| --- | --- | --- | --- | --- |
| FastAPI | 18080 | 18081 | 8000 | 현재 실행 구성 |
| NestJS | 18083 | 18084 | 3000 | 미점유 확인·구현 예정 |
| Spring Boot | 18085 | 18086 | 8080 | 미점유 확인·구현 예정 |
| MkDocs | 18090 | — | — | 현재 로컬 실행 |
| Prometheus | — | 19090 | 9090 | 기존 로컬 수집기 |
| Grafana | — | 13000 | 3000 | 기존 로컬 대시보드 |

게시 주소는 `127.0.0.1`로 제한합니다. 컨테이너 내부 포트가 같아도 컨테이너별 네트워크 공간이므로 게시 포트만 분리합니다.
`18082`는 기존 FastAPI의 임시 DB 모니터링 시험용이며 새 앱에 배정하지 않습니다.
Prometheus·Grafana는 기존 구성을 재사용하고 새 구현의 수집 대상은 관측 task에서 추가합니다.
시험 서버는 가능한 경우 OS의 임시 포트를 사용하며 서비스 DB와 분리한 데이터를 사용합니다.
