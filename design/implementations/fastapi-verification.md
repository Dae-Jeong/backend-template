# FastAPI 검증 케이스

Status: 명세 기준 · 설정·인사 API·clock DI 일부 검증, 전체 계약 미완료 · 2026-09-07

[구현 설계](fastapi.md)의 상태와 경계를 검증합니다. 이 목록은 실행 결과가 아닙니다.
현재 실행 결과는 [단계별 task](fastapi-tasks.md)와 [사용 안내](../../python/fastapi/README.md)에 기록합니다.

## 초기화

| ID | 상황 | 통과 조건 |
| --- | --- | --- |
| INIT-01 | 정상 시작 | 설정 → logging → 앱 → lifespan 순서, 준비 전 ready=false입니다. |
| INIT-02 | 비밀 문자열을 포함한 불량 설정 | 자원 생성 0회·시작 실패·출력에 비밀값이 없습니다. |
| INIT-03 | logging 설정 두 번 | 소유 handler 1개·출력 1회이며 다른 도구 handler를 삭제하지 않습니다. |
| INIT-04 | 앱 두 개 | 설정·registry·override·readiness·서비스 문맥이 독립적입니다. |
| INIT-05 | 자원 A 획득 후 B 실패 | A 정리 1회·시작 실패·ready=false입니다. |
| INIT-06 | 종료 중 cleanup 오류 | 나머지 자원 정리를 시도하고 원래 실패를 보존합니다. |

## 요청 종료

| ID | 상황 | 통과 조건 |
| --- | --- | --- |
| END-01 | 200·422·404 | 실제 status와 완료 상태, 요약·counter·histogram 각 1회입니다. |
| END-02 | 응답 시작 전 업무 예외 | 500·오류 상세 1회·요약 1회이며 민감정보가 없습니다. |
| END-03 | 200 시작 후 body 오류 | status=200과 미완료를 보존하고 두 번째 response.start가 없습니다. |
| END-04 | 최종 body send의 OSError | send_failed이며 완료로 기록하지 않고 문맥을 복원합니다. |
| END-05 | await 중 task.cancel | 취소 전파·소유 자원 정리·문맥 복원·요약 1회입니다. |
| END-06 | receive에 disconnect | 이벤트를 그대로 전달하고 자동 취소·rollback을 가정하지 않습니다. |
| END-07 | 동시 요청 중 하나 취소 | 다른 요청은 완료되고 문맥·설정·결과가 섞이지 않습니다. |
| END-08 | logger 또는 metrics 오류 | 원래 응답·예외·취소와 문맥 정리를 보존합니다. 관측 누락은 별도 실패입니다. |
| END-09 | body 완료 이후 background 오류 | complete와 후속 error·body 완료 시 지연을 보존하며 재응답하지 않습니다. |
| END-10 | body 완료 없이 앱 반환 | incomplete이며 관측하지 않은 disconnect를 원인으로 추측하지 않습니다. |

## 기능·관측·복사

| 대상 | 통과 조건 |
| --- | --- |
| 인사 API | 입력 정규화·422·UTC 결과와 고정 clock DI 교체가 맞습니다. |
| 로그 | 유효한 한 줄 JSON·필드 타입·정수 ns·크기 제한·한글·줄바꿈·예약 키 충돌을 검사합니다. |
| 개인정보 | 합성 token·본문·예외 메시지·지역변수가 출력에 남지 않습니다. |
| metrics | 알려진 건수·결과·라벨 제한과 health/metrics 제외·앱별 분리를 검사합니다. |
| 복사형 시작점 | 개인 경로·다른 제품 의존 없이 설정·설치·실행·검증이 가능합니다. |
| Compose | 설정 검사·이미지 빌드·비 root·loopback·secret 제외·readiness를 검증합니다. |

fake ASGI receive/send와 제어 clock·Event barrier로 실패 시점을 고정합니다.
TestClient는 lifespan·HTTP 계약용이며 실제 TCP 종료를 증명하지 않습니다.
프로세스 logging·SIGTERM drain은 격리된 서버 프로세스로 별도 시험하고 외부 서비스·실제 DB를 사용하지 않습니다.
SIGKILL·OOM에서 cleanup·무손실을 보장하지 않습니다. 임의 sleep만으로 시험 성공을 판단하지 않습니다.

구현 순서는 초기화/격리 → 정상 요청 경로 → 실패/취소 → Compose/서버 종료 smoke 후보입니다.
구체적인 파일별 작업 계획과 명령은 구현 시작 시 작성합니다.
