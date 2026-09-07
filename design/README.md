# 설계 안내

Status: canonical-design · 구현 전 설계 정본 · 2026-09-07

사용자 결정으로 이 저장소의 `design/`를 Backend Template 설계의 단독 정본으로 지정합니다.
기존 아이디어·다른 저장소의 과거 task는 참조 경로일 뿐이며 병행 수정하지 않습니다.
정본은 관리 위치를 뜻합니다. 후보 선택이 모두 승인되었거나 코드가 구현·검증됐다는 뜻은 아닙니다.

| 설계 수준 | 소유하는 내용 | 넣지 않는 내용 |
| --- | --- | --- |
| [Backend](backend.md) | 언어 독립적 목표·책임·불변조건 | Depends·ContextVar·JDK 등 특정 구현 방식 |
| [개발 원칙](engineering.md) | Domain·Application·DB·외부 연계·검증의 개발 판단 | 모든 기능의 선행 구현 |
| [Runtime Review](runtime-review.md) | 실행 모델·성능·용량·비용 검토 | 실측하지 않은 성능 보장 |
| [관측](observability.md) | 로그 의미·정보 계약·도구와의 경계 | 모니터링 서버 운영 설정 |
| [FastAPI](implementations/fastapi.md) | 공통 계약을 Python에서 실현하는 방법 | 공통 원칙의 전체 복제 |
| [FastAPI 검증](implementations/fastapi-verification.md) | 구체적인 정상·실패·취소 시험 | 실행하지 않은 통과 주장 |

공통과 구현의 분리, 공용 관측 기반과 기능별 이벤트의 분리, 외부 모니터링의 후속 도입은 합의한 방향입니다. 문서의 라이브러리·수치·코드 배치·구현 선택은 후보이며 구현 전 검토합니다.

개발·리뷰의 진입점은 개발 원칙이고, 개념을 파악할 때는 Backend부터 읽습니다. 변경하는 공통 계약 → 해당 구현 설계 순으로 좁혀 읽으며 모든 문서를 매번 읽을 필요는 없습니다.
공통 계약이 변경되면 해당 구현의 대응과 시험도 확인합니다. 구현 제약으로 공통 계약을 만족하지 못하면 숨기지 않고 차이와 범위를 기록합니다.

이 저장소의 설계 문서가 이후 템플릿 설계의 관리 지점입니다. 설계가 존재한다는 사실과 코드 구현·운영 검증은 별개입니다. 구현 계획·작업 체크리스트는 구현 시작 시 작성하고, 검증된 실행 방법만 README에 올립니다.

## 설계 이관 대응

| 기존 논의 영역 | 정본 소유 위치 |
| --- | --- |
| 함수 중심 구성·DI·과도한 OOP 배제 | Backend, 개발 원칙, FastAPI |
| 자원 수명·transaction·외부 adapter | Backend, 개발 원칙, FastAPI |
| 로깅·metrics·행위자·감사 이력 | 관측 |
| 초기화·실패·취소 | FastAPI, FastAPI 검증 |
| GIL·GC·OS·I/O·부하·비용 | Runtime Review |
| foundation·선택 DB 통합·복사형 배포 | README, FastAPI |

템플릿과 무관한 제품 기능·기존 서비스의 개인 경로·계정·로컬 인프라·설치형 skill/MCP 설정은 이관하지 않습니다.
