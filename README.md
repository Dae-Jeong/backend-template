# Backend Template

백엔드 서비스를 만들고 동시성·멱등성까지 실험하는 시작점입니다.
현재 FastAPI·SQLite 구현을 제공합니다.

## 가이드 읽기

| 영역 | 읽는 목적 | 시작 문서 |
| --- | --- | --- |
| 사용 가이드 | 실행하고 기능을 붙입니다. | [로컬 실행](design/implementations/quickstart.md) · [서비스 적용](design/implementations/service-guide.md) |
| 상세 설명 | 구조·설정·설계 이유를 찾아봅니다. | [프로젝트 개요](design/overview.md) · [폴더와 역할](design/implementations/fastapi-structure.md) |
| 작업·검증 기록 | 완료 범위와 시험 결과를 확인합니다. | [검증 결과](design/implementations/fastapi-verification.md) · [작업 현황](design/implementations/fastapi-tasks.md) |

## 로컬 가이드 실행

저장소 루트에서 실행한 뒤 [가이드](http://127.0.0.1:18090)를 엽니다.

```sh
uv tool run --from uv==0.12.10 uv run --project docs --locked mkdocs serve
```

종료는 Ctrl+C입니다. 설계 정본과 문서 관리 기준은 [설계 안내](design/README.md)에 있습니다.
