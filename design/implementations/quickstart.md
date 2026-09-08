# 로컬 실행

Docker와 uv가 준비된 환경에서 **저장소 루트**를 기준으로 진행합니다.

## 1. 앱과 모니터링 실행

```sh
export DB_PRIMARY_URL=sqlite+aiosqlite:////app/data/reservations.db
./scripts/compose.sh fastapi --profile monitoring up --build --wait
```

[준비 상태](http://127.0.0.1:18081/health/ready)가 `{"status":"ready"}`이면 실행 완료입니다.
컨테이너가 migration을 먼저 적용합니다. 기존 DB를 쓰면 적용할 migration의 호환성을 확인합니다.

## 2. 실험용 상품 생성

```sh
./scripts/compose.sh fastapi run --rm --no-deps api python -m template_api.seed --product-id demo --stock 10
```

상품이 없을 때만 생성합니다. 다시 실행해도 기존 재고·예약은 초기화하지 않습니다.
새 실험은 다른 상품 ID로 시작합니다.

## 3. 예약과 재시도 확인

```sh
curl -i http://127.0.0.1:18081/v1/reservations \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-reservation-001' \
  -d '{"product_id":"demo"}'
```

처음에는 201·`Idempotency-Replayed: false`, 같은 요청을 반복하면 동일 본문과 `true`가 반환됩니다.
새 예약은 새 키를 사용합니다. 키는 이 DB의 예약 API 전체 범위에서 고유합니다.

| 확인 화면 | 용도 |
| --- | --- |
| [Swagger](http://127.0.0.1:18081/docs) | 상품과 키를 입력해 API 호출 |
| [HTTP 대시보드](http://127.0.0.1:13000/d/backend-http-local) | 요청량·응답·지연 확인 |
| [DB 대시보드](http://127.0.0.1:13000/d/backend-db-local?var-job=fastapi) | 트랜잭션·연결 확인 |

## 4. 종료

```sh
./scripts/compose.sh fastapi --profile monitoring stop
```

보관 데이터는 유지됩니다.

다음은 [내 서비스에 적용](service-guide.md)입니다. 다른 실행 방식과 환경 설정은
[상세 설명](../../python/fastapi/README.md), 예약의 동작 원리는 [예약 계약](fastapi.md#예약-업무-계약)에서 확인합니다.
