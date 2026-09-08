# Spring Boot 검증 기록

Status: 실제 구현·검증 결과 · 2026-09-08

실행 가이드는 [README](../../java/spring-boot/README.md), 선택·transaction 의미는
[구현 설계](spring-boot.md)가 소유합니다. FastAPI 시험 통과를 Java의 검증 증거로 사용하지 않습니다.

## 환경과 명령

| 항목 | 확인값 |
| --- | --- |
| Initializr·Boot | 4.1.1 |
| Gradle Wrapper | 9.7.1 |
| Java major | .java-version의 25 |
| native JDK | Temurin 25.0.4.1+1 LTS, macOS arm64, 프로젝트 시험용 /tmp 설치 |
| Docker JDK/JRE | Temurin 25, 실제 resolve 25.0.4+7 noble arm64 |
| Spring Framework | 7.0.9 |
| H2 | 2.4.240 |
| Flyway engine / 파일 생성 CLI | 12.4.0 / 13.4.0 |
| Springdoc | 3.1.1 |

Initializr metadata의 최신 stable·지원 Java/의존성 목록과 공식 호환 표를 먼저 확인했습니다.
최초 생성·시험은 설치된 Java 21을 썼고 중앙 요청에 따라 Java 25 LTS로 전환했습니다.
전역 설치·공유 DB·계정·기존 서비스 포트는 변경하지 않았습니다.

```sh
cd java/spring-boot
./gradlew clean test bootJar --no-daemon --console=plain
```

Java compiler `-Xlint:all,-processing,-serial`·`-Werror`와 strict dependency locking을 포함합니다.
구현 commit `a65cb26` 기준 clean 빌드는 **27개 시험·10 suites·실패 0·오류 0**으로 통과했습니다.
마지막 코드 수정 `53db988`은 아래 명령으로 영향받는 **HTTP·transaction 14개 시험·실패 0**과 bootJar를 확인했습니다.

```sh
./gradlew test --tests '*TransactionFailureTest' --tests '*HttpDatabaseTest' bootJar --no-daemon --console=plain
```

실제 pool 포화는 503이고 setAutoCommit 단계의 비일시 연결 실패는 500·INTERNAL_ERROR이며 Retry-After가 없음을 검사했습니다.
마지막 수정 후 전체 프로세스 시험을 다시 실행한 것으로 표시하지 않습니다.
테스트 결과는 `build/reports/tests/test/index.html`, JUnit XML은 `build/test-results/test/`입니다.
lockfile 생성은 공식 `./gradlew test bootJar --write-locks`로 수행했습니다.
migration 파일은 공식 `flyway help add` 확인 후 `flyway add -add.version=1|2 -add.timestamp=never ...`로 만들었습니다.

## 실행한 시험

| 시험 | 확인 내용 |
| --- | --- |
| GreetingServiceTest | context 없는 생성자 DI·고정 Clock |
| TemplateApplicationTests | no-db context |
| HttpDatabaseTest | 실제 소켓·file DB, 인사/data·Problem·request ID·404/405 Allow·엄격 입력422·health/metrics/docs |
| HttpDatabaseTest | 최초201·원래body/status 재생·다른입력409·품절·미존재·다중HTTP 동일/다른키·잠금/pool timeout·독립상품진행 |
| HttpDatabaseTest | 클라이언트가 응답을 버린 뒤 재시도·재고/예약/결과 독립 연결 확인 |
| TransactionFailureTest | public proxy checked/unchecked rollback·중간 constraint 실패·JDBC commit 실패·claim 전체 rollback |
| TransactionFailureTest | commit gate 중 응답 미완료·committed 지표 미증가·500 번역·같은키 재시도 |
| ProcessRecoveryTest | 독립 JVM 같은키·다른키 경합, commit 전/후 kill, commit 후 응답 미전달 상태 재생 |
| ProcessRecoveryTest | embedded file DB의 실제 JVM 종료·재시작 원래 결과 재생 |
| MigrationTest | V1→V2 데이터 보존·claim backfill·guard 제거·반복 실행·실패 migration |
| LifecycleTest | 빈 URL 자동 비활성·healthy readiness·예약 제외·잘못된 설정·부분 시작 실패 pool 종료 |
| ShutdownTest | 실제 SIGTERM 중 진행 HTTP 요청 완료·프로세스 종료·file DB 잠금 반환 |
| ObservationTest | 서버ID·MDC 정리·원래 chain 예외 보존·로그 failure/type·metrics 실패 격리 |
| SpecialHttpTest | 204·파일·실제 committed stream·429 Retry-After·error dispatch·요약 중복 없음·민감 원문 제외 |

테스트는 업무 transaction을 자동 rollback하는 테스트 transaction으로 감싸지 않습니다.
독립 JDBC 연결에서 commit 이후 저장 상태를 확인합니다.
TCP 시험은 중앙 승인 아래 127.0.0.1·OS 임시포트·임시파일을 쓰며 자기 프로세스만 종료합니다.
embedded 파일의 다중 JVM 접근 제한을 TCP 시험과 구분합니다.

commit 실패는 실제 JdbcTransactionManager의 Connection.commit 호출 지점에 SQLException을 주입합니다.
H2가 deferred FK를 지원한다고 가정하지 않으며 물리 디스크 고장을 일으키지 않습니다.
관측 counter는 실패 1·committed 0과 영속 상태를 대조한 뒤 재시도 성공을 확인합니다.

Spring 7.0.9에서는 OutputStream.flush가 기본적으로 network flush가 아니므로 stream 시험은
HttpServletResponse.flushBuffer로 실제 committed 상태를 만든 뒤 IOException을 발생시킵니다.
이미 전송된 body에 Problem 응답을 덧붙이지 않는 것과 정상 전송 성공은 구분합니다.

## native·이미지·재사용

native 게시 127.0.0.1:18085를 실행 직전 점유 확인 후 사용했습니다.
임시 작업 디렉터리의 file DB에 seed→예약201→SIGTERM→새 JVM→동일body201 replay를 확인했습니다.
native stdout 로그의 JSON·서버ID·민감 클라이언트ID 제외를 검사했습니다.
실행 로그는 `/var/folders/lt/6xldspxd1kd2wnx9hmc8qjv80000gn/T/spring-native-final-0euqy6vl/`,
비밀 없는 scrape는 `/tmp/spring-final-metrics.prom`에 남겼습니다. 두 경로는 로컬 임시 증거이며 배포 입력이 아닙니다.

```sh
docker build --build-arg JAVA_VERSION="$(cat java/spring-boot/.java-version)" \
  -t backend-template-spring:local java/spring-boot
```

Docker locked 빌드는 통과했습니다. JAVA_VERSION 기본값을 두지 않으므로 Docker 정적 lint의
InvalidDefaultArgInFrom 경고 2개가 있으며 실제 명령은 필수 arg를 전달합니다.
이미지는 curl healthcheck·UID10001·/app/data·내부8080을 사용합니다.
Compose의 127.0.0.1:18086 실행·수집기 확인 결과는 아래 통합 검증에 기록합니다.

`a65cb26` 구현 이미지 manifest는 `sha256:898234f975f4901933b91c4d2c9c47cba6176d91eacb3b21def9557cfeee779b`입니다.
이후 `53db988`의 오류 번역 수정까지 포함한 Compose 이미지를 다시 빌드·실행했습니다.
`git archive a65cb26 java/spring-boot`를 `/tmp/spring-template-copy-a65cb26/`에 풀어
새 위치에서 `./gradlew bootJar --no-daemon --console=plain`을 실행해 통과했습니다.
복사한 start.sh를 독립 임시 포트 57097에서 실행해 DB 비활성 readiness 200·인사 응답·예약 404를 확인했습니다.

분리 작업 중 발생한 README 발행 링크 경고는 main의 문서 hook·메뉴 통합으로 해결했고 MkDocs strict build가 통과했습니다.

## 로컬 통합 검증

2026-09-08 main에서 `.java-version`을 읽는 공통 Compose build와 UID 10001 실행을 확인했습니다.
DB 비활성 시 health 200·예약 404·OpenAPI 제외, H2 활성 시 migration·seed·예약 201이 통과했습니다.
입력 오류 3종은 422·Problem·request ID, GET 예약은 405·Allow를 반환했습니다.
동일 body 재생·다른 입력의 동일 키 409·없는 상품 404가 통과했습니다.
재고 3에서 최초 예약 후 6개 병렬 요청은 성공 2개·품절 4개였고, 최종 이미지로 교체한 뒤에도 원래 body를 재생했습니다.
Prometheus job=spring-boot UP과 Micrometer HTTP/JVM/Hikari·업무 transaction 지표를 확인했습니다.
Grafana의 Spring Boot 대시보드를 PC 화면에서 확인했습니다.
소규모 요청 후 컨테이너 메모리 단일 측정은 203.5 MiB / 한도 512 MiB이며 운영 용량 보장이 아닙니다.

## 구현 commit

| commit | 내용 |
| --- | --- |
| 27305d3 | Initializr 생성·Java 21 최초 기반 |
| 2d745e0 | Java 25·HTTP·H2 최초 예약과 실제 HTTP 시험 |
| a65cb26 | 키별 claim·자동 no-db·중앙 리뷰·실패/복구/수명/관측 시험·실행 안내 |
| 73af314 | clean 27개·복사 빌드/실행·중앙 MkDocs hook 미통합 기록 |
| 53db988 | 실제 pool timeout과 비일시 transaction 시작 실패의 HTTP 번역 분리 |

후속 문서 commit은 위 구현 결과와 중앙 통합 확인을 기록하며 코드 revision과 구분합니다.

## 실제 metrics 대응

| 이름·label | 의미 |
| --- | --- |
| http_server_requests_seconds_count/sum/bucket | Micrometer HTTP, method/status/uri template/outcome/exception/error |
| jvm_memory_used_bytes | area·id별 JVM 메모리 |
| hikaricp_connections_active/idle/pending/max | pool별 실제 연결 |
| hikaricp_connections_timeout_total | pool 획득 timeout |
| jdbc_connections_active/idle/max/min | DataSource 관측 |
| db_transactions_total | role=primary, outcome=committed/rolled_back/failed |
| db_transaction_duration_seconds_count/sum/max | 실제 transaction 완료 시점까지 |

native 재시작 후 scrape에서 `db_transactions_total{outcome="committed",role="primary"} 1.0`과
`http_server_requests_seconds_count{error="none",exception="none",method="POST",outcome="SUCCESS",status="201",uri="/v1/reservations"} 1`을 확인했습니다.
재시작은 process counter를 초기화합니다. 재생 transaction도 committed 한 건이며 신규 예약 수가 아닙니다.
request ID·멱등 key·raw query를 labels에 넣지 않습니다.
http.completed는 Servlet 처리 완료이고 실제 상대 수신·무손실 전달을 뜻하지 않습니다.

## 미검증·제한

- PostgreSQL·SQLite·H2 PostgreSQL compatibility mode는 검증하지 않았습니다.
- 실제 디스크 오류·전원 차단·운영 부하·성능/용량 수치·클러스터·Replica·sharding은 범위 밖입니다.
- JDBC commit 결과가 불명인 외부 저장 장애를 임의로 재시도하지 않습니다. 같은 키 조회·재생으로 확인합니다.
- H2 DDL의 transactional rollback을 PostgreSQL과 동일하게 주장하지 않습니다. 실패 migration은 시작을 차단합니다.
- 키 만료·정리·인증 scope·분산 작업·운영 로그 수집/보존·알림은 구현하지 않았습니다.
- Docker 플랫폼은 arm64에서 검증하며 다른 CPU/OS 결과로 확대하지 않습니다.
