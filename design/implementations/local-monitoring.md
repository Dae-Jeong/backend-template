# 로컬 모니터링

앱은 구현별로 실행하고 Prometheus·Grafana는 한 번만 실행합니다.
현재 수집 경로는 Docker Desktop을 기준으로 합니다.

## 실행

저장소 루트에서 실행합니다. 기존 모니터링의 Compose 프로젝트와 보관 볼륨을 재사용합니다.

```sh
./scripts/compose.sh fastapi --profile monitoring up --wait prometheus grafana
```

이 명령은 앱을 시작하지 않습니다. 사용할 앱은 각 실행 안내에 따라 DB 설정과 함께 시작합니다.
다른 구현에서 `--profile monitoring up`을 다시 실행하면 같은 게시 포트를 점유하므로,
앱 실행에는 `up --build --wait api`를 사용합니다.

| 수집 대상 | Prometheus에서 접근하는 주소 | 앱 실행 안내 |
| --- | --- | --- |
| FastAPI | `api:8000/metrics` | [FastAPI](quickstart.md) |
| NestJS | `host.docker.internal:18084/metrics` | [NestJS](../../ts/nestjs/README.md) |
| Spring Boot | `host.docker.internal:18086/metrics` | [Spring Boot](../../java/spring-boot/README.md) |

FastAPI는 기존 Compose 네트워크, NestJS·Spring Boot는 호스트의 게시 포트로 수집합니다.
Linux Docker Engine에서 실행할 때는 호스트 접근 주소와 게시 정책을 별도로 맞춰야 합니다.

## 확인

[Prometheus Targets](http://127.0.0.1:19090/targets)에서 실행한 앱이 `UP`인지 확인합니다.
실행하지 않은 앱은 `DOWN`입니다. 모든 구현을 켤 필요는 없습니다.

| 대시보드 | 지표 의미 |
| --- | --- |
| [HTTP](http://127.0.0.1:13000/d/backend-http-local) | FastAPI·NestJS 요청 결과와 응답 전송 완료 경계 |
| [DB](http://127.0.0.1:13000/d/backend-db-local) | FastAPI Session·NestJS 연결 lease·pool·업무 트랜잭션 |
| [Spring Boot](http://127.0.0.1:13000/d/backend-spring-local) | Micrometer HTTP 처리·JVM·Hikari pool·트랜잭션 |

Spring의 HTTP 처리 시간은 클라이언트가 응답 본문을 모두 받았다는 보장이 아닙니다.
DB 미설정·수집 중단·표본 없음은 정상 수치 0과 구분합니다.
지표의 정의와 시험 범위는 각 구현의 관측·검증 문서가 소유합니다.

Grafana는 컨테이너 한도 512 MiB 안에서 `GOMEMLIMIT=384MiB`를 사용합니다.
대시보드 자동 갱신 중 실제 OOM 종료를 확인해 Go GC에 별도 예산을 지정했습니다.
이는 [Go runtime의 soft limit](https://go.dev/doc/gc-guide#Memory_limit)이며 전체 RSS의 강제 상한이 아닙니다.
2026-09-08 통합 검증에서 세 수집 대상의 UP, 실제 대시보드 query, PC 화면을 확인했습니다.

## 종료

```sh
./scripts/compose.sh fastapi stop prometheus grafana
```

앱과 보관 데이터는 유지됩니다. 이 구성은 로컬 확인용이며 운영 경보·Sentry 연동은 포함하지 않습니다.
