# docs/ — 문서 색인

> 상태: 영구
> 한 줄 요약 — 어떤 세션(Desktop·Code·Cowork)이든 여기서 시작한다. 관리 기준: `DOCS_STANDARD.md`.

## 진입 경로 (읽는 순서 고정 · DOCS_STANDARD §5)

이 4개만 읽으면 착수 가능. 그 외는 필요할 때 아래 색인에서 찾아 들어간다.

| 순서 | 문서 | 무엇을 답하는가 |
|---|---|---|
| 1 | [`DOMAIN_FACTS.md`](DOMAIN_FACTS.md) | 이 앱이 무엇인가 (오인 방지·원자 필드·판정 함수) |
| 2 | [`PRODUCT_LIFECYCLE_FLOW.md`](PRODUCT_LIFECYCLE_FLOW.md) | 상품이 지나는 길 (꿀통창고→씨앗심기→검수→발행→꽃밭) |
| 3 | [`plan/PARALLEL_WORK_TRACKER.md`](plan/PARALLEL_WORK_TRACKER.md) (최신 rev) | 지금 무슨 일이 진행 중인가 |
| 4 | [`plan/PRINCIPLES_LEARNED.md`](plan/PRINCIPLES_LEARNED.md) (최신 번호) | 무엇을 하면 안 되는가 |

## 폴더별 역할 (단일 책임 · DOCS_STANDARD §2)

| 폴더 | 담는 것 | 수명 | 현재 규모 |
|---|---|---|---|
| `docs/` (루트) | 영구 정본 (DOMAIN_FACTS · PRODUCT_LIFECYCLE_FLOW · DOCS_STANDARD) | 영구 | 3 |
| `docs/plan/` | 진행 상태·원칙·트래커 | 누적(추가만) | 34 |
| `docs/design/` | 설계·스펙 **시점 문서** | 시점(불변) | 92 |
| `docs/decisions/` | ADR (무엇을·왜·대안) | 시점 | 5 |
| `docs/handoff/` | 세션 인계 (만료성) | 만료 | 107 |
| `docs/runbook/` | 운영 절차 (장애·복구·정기) | 영구 | 1 |
| `docs/playbook/` | 승인된 프롬프트·표준 산출물 | 영구 | 6 |
| `docs/research/` | 외부 리서치 원본 | 시점 | 52 |
| `docs/data/` | 데이터 스냅샷·매핑표 | 시점 | 0 |

## 루트 영구 정본 (3)

- [`DOMAIN_FACTS.md`](DOMAIN_FACTS.md) — 도메인 사실·미사용 개념·실재 원자 필드
- [`PRODUCT_LIFECYCLE_FLOW.md`](PRODUCT_LIFECYCLE_FLOW.md) — 상품 생애 흐름 정본
- [`DOCS_STANDARD.md`](DOCS_STANDARD.md) — 문서 관리 기준 (수명 분류·파일명 규약)

## plan/ 핵심 (진행·원칙)

- `plan/PROGRESS.md` — 슬림 상태 스냅샷 (진입점)
- `plan/PARALLEL_WORK_TRACKER.md` — 최신 rev = 현재 작업 상태
- `plan/PRINCIPLES_LEARNED.md` / `plan/PRINCIPLES_CODE.md` — 학습·코드 원칙
- `plan/COLLABORATION_PLAYBOOK.md` — 문제 해결 방식 (기존 고쳐쓰기 우선)
- `plan/ROADMAP.md` · `SPRINT_PLAN.md` · `REFERENCES.md` · `TASK_BRIDGE.md`

## design/ 최신 생애주기·발행 (이번 사이클)

- `design/LIFECYCLE_BRIDGE_V2_2026-07-23.md` — 생애주기 판정 브리지 (권위)
- `design/LIFECYCLE_STATE_MACHINE.md` · `COPY_SYSTEM.md` · `SURFACE_RULES.md` — 상태/카피/표면 (v2)
- `design/PUBLISH_REVIEW_GATE_2026-07-23.md` — 발행 검수 경로 게이트 (v2)

> design/ 전체 92개 중 날짜 없는 22개는 정리 대상 — `design/DOCS_CLEANUP_PLAN_2026-07-24.md` 참조(계획만, 미이동. 구본 CLEANUP_PLAN_2026-07-23는 SUPERSEDED).
