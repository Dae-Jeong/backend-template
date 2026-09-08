# Spring Boot 단계별 구현 task

Status: Task 1–8 구현·자동 검증 수행, 중앙 컨테이너 통합 확인 중 · 2026-09-08

현재 작업은 실제 구현 승인에 따라 진행합니다. 설계의 과거 미착수 상태는 구현 중단 조건이 아닙니다.
실행 명령은 [사용 가이드](../../java/spring-boot/README.md), 시험 결과·미검증은
[검증 기록](spring-boot-verification.md)이 소유합니다.

| Task | 구현 결과 | 검증 |
| --- | --- | --- |
| 0 구조 설계 | 역할별 package·constructor DI·MVC·단일 Primary | design 정본 대조 |
| 1 생성·빌드 | Initializr API, Boot 4.1.1, Wrapper 9.7.1, .java-version 25, strict lock | clean test bootJar·Docker build |
| 2 DI·인사 | Clock Bean·순수 Greeting·HTTP DTO 분리 | GreetingServiceTest·실제 HTTP |
| 3 설정·수명·오류 | 빈 URL 자동 DB 비활성, 설정 검증, Problem·404/405·입력422 | LifecycleTest·HttpDatabaseTest·ShutdownTest |
| 4 로그·metrics·실행 | ECS JSON, MDC·async 완료, Micrometer, OpenAPI, native·Docker | ObservationTest·SpecialHttpTest·native18085 |
| 5 DB 선택 | 사용자 선택 H2, JdbcClient·Hikari·Flyway | file DB·공식 CLI migration 생성·MigrationTest |
| 6 Primary·예약 | public Service transaction·key claim·재고 UPDATE·결과 저장 | rollback·commit실패·재시도·독립 연결 |
| 7 경합·멱등·복구 | 키별 충돌 복구·독립 상품 진행·TCP 프로세스 경합·embedded 재시작 | HttpDatabaseTest·ProcessRecoveryTest·TransactionFailureTest |
| 8 사용 가이드 | 복사 후 빌드·DB 비활성/활성·seed·API 추가 안내 | README 명령·복사 검증 및 중앙 통합 기록 참조 |

## 단계별 commit

- `27305d3`: 공식 Initializr 생성 결과 보존, 최초 Java 21 빌드.
- `2d745e0`: Java 25·HTTP 계약·최초 H2 예약·실제 HTTP/file DB 시험.
- 이후 변경: 중앙 리뷰의 전역 guard 제거·자동 no-db·Java 단일 정본·실패/프로세스/관측 검증.
  최종 commit 목록은 검증 기록과 coordinator 보고에 기록합니다.

V1의 초기 guard는 V2 migration에서 제거합니다. 과거 migration을 지우거나 덮어쓰지 않고
기존 예약·재생 결과를 보존한 업그레이드를 시험했습니다.
중앙 root README·구현 목록·Compose·수집기·문서 메뉴는 이 worker의 수정 범위 밖입니다.
