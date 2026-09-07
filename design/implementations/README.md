# 구현별 설계 안내

이 디렉터리는 공통 Backend 계약을 선택한 언어·프레임워크에서 실현하는 방법을 소유합니다.
구체적인 코드 배치·DI 도구·런타임·패키지·환경 설정·실행 방법·시험은 이 수준에서 정의합니다.

| 구현 | 설계 | 검증 | 상태 |
| --- | --- | --- | --- |
| Python / FastAPI | [구현 설계](fastapi.md) | [검증 케이스](fastapi-verification.md) | 설계만 있으며 코드·manifest는 없습니다. |
| Java / Spring Boot | 후속 결정 | 후속 결정 | 계획 후보이며 빈 프로젝트는 만들지 않습니다. |
| Rust | 프레임워크부터 후속 결정 | 후속 결정 | 계획 후보이며 빈 프로젝트는 만들지 않습니다. |

첫 구현 후보는 FastAPI 예제 API·Settings·DI·lifespan·로깅·metrics·테스트·Docker Compose입니다.
DB·인증·채팅·외부 API·모니터링 서버는 초기 구현에서 제외합니다.

공통 계약 자체를 다시 정의하지 않고 [Backend](../backend.md), [개발 원칙](../engineering.md),
[관측](../observability.md), [Runtime Review](../runtime-review.md)를 참조합니다.
구현 차이·제약·미검증 범위는 각 구현 설계에 명시합니다. 특정 구현의 편의를 이유로 공통 의미를 조용히 바꾸지 않습니다.
