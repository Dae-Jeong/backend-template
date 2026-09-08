# Spring Boot 검증 계획

Status: 검증 케이스 설계안 · 실행 결과 없음 · 2026-09-08

이 문서는 Spring Boot 구현의 통과 조건과 실행 증거를 소유합니다.
FastAPI의 통과 결과를 Java 구현의 증거로 사용하지 않습니다.
파일 배치는 [폴더 구조](spring-boot-structure.md), 구현 순서는 [task](spring-boot-tasks.md)를 따릅니다.

## 시험 계층

| 계층 | 확인 범위 | 방식 |
| --- | --- | --- |
| 순수 단위 | 업무 판단·내부 결과·시간 제어 | Spring context 없이 직접 생성하고 `Clock.fixed`·명시적 대역을 전달합니다. |
| HTTP 경계 | 입력·성공 DTO·Problem Details·헤더 | MVC 시험에서 요청·응답의 status·Content-Type·schema를 확인합니다. |
| 앱 통합 | Bean 조립·설정·수명·실제 서버 오류 경로 | `@SpringBootTest`와 동적 포트의 실제 HTTP 요청으로 확인합니다. |
| DB 통합 | migration·제약·transaction·pool | 선택한 실제 DB의 격리 파일 또는 승인된 테스트 DB를 사용합니다. |
| 프로세스 | 종료·응답 유실·여러 인스턴스 경합 | 실제 프로세스와 독립 Connection에서 영속 상태를 확인합니다. |

서버 시험은 고정 개발 포트를 차지하지 않으며 [중앙 포트 기준](README.md#로컬-포트-배정)을 따릅니다.
MockMvc 통과만으로 소켓 전송·실제 서버 dispatch·종료가 검증됐다고 표시하지 않습니다.
[Spring Boot testing](https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html)

## 기반 통과 조건

| 대상 | 기대 결과 |
| --- | --- |
| 공식 생성·Wrapper | 고정 JDK·Boot·Gradle 조합에서 빌드와 기본 시험이 통과하고 전역 Gradle 설치에 의존하지 않습니다. |
| 설정 | 잘못된 타입·범위·필수값 누락은 시작 실패이며 비밀값이 로그에 노출되지 않습니다. |
| DI | Clock 대역 교체가 가능하고 field injection·Service Locator·순환 Bean 의존이 없습니다. |
| 시작 실패 | 중간 자원 준비 실패 시 먼저 획득한 자원이 종료되고 readiness가 성공하지 않습니다. |
| 종료 | SIGTERM에서 진행 요청의 종료·timeout과 소유 자원 반환 순서가 확인됩니다. |
| 정상 응답 | 공통 `data` 구조·JSON 이름·시간 표현이 유지되고 health·metrics·문서·파일·stream에는 envelope가 없습니다. |
| 거절·오류 | 누락·타입 오류·검증·잘못된 JSON은 422로 매핑되고 404·405·500도 동일 Problem schema입니다. `Allow`·`Retry-After` 등 프로토콜 헤더가 보존됩니다. |
| 요청 문맥 | 헤더·오류 본문·로그의 요청 ID가 일치하고 다음 요청에 MDC 값이 남지 않습니다. |
| 관측 | HTTP·JVM·pool의 실제 지표와 대시보드 의미가 대응하며 원시 경로·요청 ID·멱등 키가 metric label에 없습니다. |

Boot 버전별 예외·error dispatch 차이는 실제 응답을 기준으로 기록합니다.
필터 바깥 실패나 이미 전송된 응답은 새 Problem 본문을 덧붙여 정상화하지 않습니다.

## DB·동시성·멱등성 통과 조건

DB와 migration 선택 이후에 실행합니다. H2·mock 시험을 SQLite 또는 PostgreSQL의 잠금 검증으로 대체하지 않습니다.

| 대상 | 기대 결과 |
| --- | --- |
| migration | 새 DB 적용·재실행·실패 시 시작 차단이 확인되고 기존 데이터가 보존됩니다. |
| transaction 연결 | proxy를 거친 한 업무의 모든 저장이 같은 Primary transaction에 참여합니다. |
| rollback 정책 | RuntimeException·checked exception·중간 저장 실패에서 전체 변경이 취소됩니다. |
| proxy 경계 | 실제 Bean 경유 호출이 transaction을 만들고 self-invocation에 의존하는 업무 경로가 없습니다. |
| commit 실패 | commit 단계의 실패가 HTTP 성공으로 나가지 않고 새 Connection에서 부분 저장이 없습니다. |
| pool·잠금 대기 | 유한 timeout 후 자원 해제와 일시 장애 응답이 확인됩니다. 품절로 잘못 분류하지 않습니다. |
| 다른 키 경합 | 재고 1개에 동시 요청을 보내면 성공 1개이며 재고가 음수가 되지 않습니다. |
| 같은 키·같은 입력 | 신규 효과는 1회이고 나머지는 원래 status·body를 재생합니다. |
| 같은 키·다른 입력 | 키 충돌 응답이며 추가 예약·차감이 없습니다. |
| 저장 후 응답 유실 | 같은 키로 재시도하면 저장된 결과를 재생하고 다시 차감하지 않습니다. |
| 프로세스 강제 종료 | commit 전에는 취소, commit 후에는 재생 가능하며 독립 프로세스에서도 중복 효과가 없습니다. |
| transaction 계측 | 실제 완료 outcome과 영속 상태가 일치하고 조회·재생 transaction을 신규 예약 수로 세지 않습니다. |

commit 검증 시험은 테스트 메서드의 자동 rollback transaction에 업무를 감싸지 않습니다.
HTTP 호출 또는 명시적 commit이 끝난 후 독립 Connection으로 결과를 읽습니다.
동시 시험은 시작 장벽과 유한 timeout을 사용하고 테스트가 띄운 프로세스·자원만 정리합니다.

## 실행 결과를 기록할 형식

task 완료 때 **실행일·commit·JDK/Boot/Gradle/DB 버전·실제 명령·통과/실패·미검증 범위**를 기록합니다.
현재는 Java 프로젝트와 명령이 생성되지 않았으므로 테스트 수·빌드 성공·성능 수치를 기입하지 않습니다.
설계 문서 build와 Mermaid 검사는 앱 런타임 검증과 구분합니다.

공식 문서 확인일: **2026-09-08**.
