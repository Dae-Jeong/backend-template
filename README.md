# Backend Template

백엔드 서비스를 만들고 동시성·멱등성까지 실험하는 시작점입니다.
FastAPI·SQLite, NestJS·SQLite, Spring Boot·H2 구현을 제공합니다.
공통 응답·DI·트랜잭션·관측 계약을 각 프레임워크의 방식으로 구현합니다.

## 가이드 읽기

| 영역 | 읽는 목적 | 시작 문서 |
| --- | --- | --- |
| 사용 가이드 | 실행하고 기능을 붙입니다. | [FastAPI](design/implementations/quickstart.md) · [NestJS](ts/nestjs/README.md) · [Spring Boot](java/spring-boot/README.md) · [모니터링](design/implementations/local-monitoring.md) |
| 상세 설명 | 구조·설정·설계 이유를 찾아봅니다. | [프로젝트 개요](design/overview.md) · [구현별 설계](design/implementations/README.md) |
| 작업·검증 기록 | 완료 범위와 시험 결과를 확인합니다. | [FastAPI](design/implementations/fastapi-verification.md) · [NestJS](design/implementations/nestjs-verification.md) · [Spring Boot](design/implementations/spring-boot-verification.md) |

## 로컬 가이드 실행

저장소 루트에서 실행한 뒤 [가이드](http://127.0.0.1:18090)를 엽니다.

```sh
uv tool run --from uv==0.12.10 uv run --project docs --locked mkdocs serve
```

종료는 Ctrl+C입니다. 설계 정본과 문서 관리 기준은 [설계 안내](design/README.md)에 있습니다.
