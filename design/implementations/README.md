# 구현별 설계 안내

이 디렉터리는 공통 Backend 계약을 선택한 언어·프레임워크에서 실현하는 방법을 소유합니다.
구체적인 코드 배치·DI 도구·런타임·패키지·환경 설정·실행 방법·시험은 이 수준에서 정의합니다.

| 구현 | 설계 | 검증 | 상태 |
| --- | --- | --- | --- |
| Python / FastAPI | [구현 설계](fastapi.md) | [검증 케이스](fastapi-verification.md) | [사용 안내](../../python/fastapi/README.md): SQLite 예약·동시성·멱등성 1차 구현·자동 검증 완료. PostgreSQL·인증·운영 연동은 후속입니다. |
| Java / Spring Boot | 후속 결정 | 후속 결정 | 계획 후보이며 빈 프로젝트는 만들지 않습니다. |
| TypeScript / Nest | 후속 결정 | 후속 결정 | 사용자 지정 후속 후보이며 빈 프로젝트는 만들지 않습니다. |
| Rust | 프레임워크부터 후속 결정 | 후속 결정 | 계획 후보이며 빈 프로젝트는 만들지 않습니다. |

첫 구현 후보는 FastAPI 예제 API·Settings·DI·lifespan·로깅·metrics·테스트·Docker Compose입니다.
FastAPI의 파일 역할과 소비 프로젝트의 변경 기준은 [폴더 구조 안내](fastapi-structure.md)에서 확인합니다.
초기 기반 이후 SQLite와 로컬 Prometheus·Grafana를 추가했습니다. 인증·채팅·외부 API·운영 모니터링은 후속입니다.

1차 완료 목표는 초기 기반을 거쳐 한정 수량 예약의 동시성·멱등성까지 구현·검증하는 것입니다.
[단계별 task](fastapi-tasks.md)에서 작은 단위로 사용자와 논의하고 진행합니다.
DB 통합은 후속 단계에서 대상과 변경 범위를 확인하며, 이 목표가 인프라 구축의 일괄 승인을 뜻하지 않습니다.

공통 계약 자체를 다시 정의하지 않고 [Backend](../backend.md), [개발 원칙](../engineering.md),
[관측](../observability.md), [Runtime Review](../runtime-review.md)를 참조합니다.
구현 차이·제약·미검증 범위는 각 구현 설계에 명시합니다. 특정 구현의 편의를 이유로 공통 의미를 조용히 바꾸지 않습니다.
