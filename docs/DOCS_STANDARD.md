# DOCS_STANDARD — 문서 관리 기준

> 2026-07-23 신설. 현재 `docs/` 299개 MD 누적 → 찾는 비용이 쓰는 비용을 넘어섰다.
> 업계 표준(Diátaxis 4분류 + ADR + 날짜접미사 규약)을 이 프로젝트에 맞춰 채택한다.

## 1. 핵심 원칙 — 문서는 "수명"으로 나눈다

| 수명 | 성격 | 갱신 방식 | 위치 |
|---|---|---|---|
| **영구(Living)** | 항상 현재 사실 | 덮어쓰기 | `docs/` 루트 |
| **누적(Log)** | 시간순 기록 | 추가만 | `docs/plan/` |
| **시점(Snapshot)** | 그날의 결정·설계 | 불변 | `docs/design/`, `docs/decisions/` |
| **만료(Ephemeral)** | 끝나면 가치 소멸 | 주기적 archive | `docs/handoff/` |

> **가장 흔한 사고**: 시점 문서를 영구 문서처럼 읽어 낡은 전제로 설계하는 것. 그래서 **시점 문서에는 반드시 날짜 접미사**를 붙인다.

## 2. 폴더별 역할 (단일 책임)

| 폴더 | 담는 것 | 담지 않는 것 |
|---|---|---|
| `docs/` (루트) | **영구 정본만.** DOMAIN_FACTS · PRODUCT_LIFECYCLE_FLOW · DOCS_STANDARD | 날짜 붙은 것 |
| `docs/plan/` | 진행 상태·원칙·트래커(PROGRESS·PARALLEL_WORK_TRACKER·PRINCIPLES_LEARNED·COLLABORATION_PLAYBOOK) | 설계안 |
| `docs/design/` | 설계·스펙 **시점 문서** | 진행 상태 |
| `docs/decisions/` | ADR(결정 기록) — 무엇을·왜·대안 | 구현 방법 |
| `docs/handoff/` | 세션 인계 (만료성) | 영구 사실 |
| `docs/runbook/` | 운영 절차(장애·복구·정기작업) | 설계 |
| `docs/playbook/` | 승인된 프롬프트·표준 산출물 | 실험 기록 |
| `docs/research/` | 외부 리서치 원본 | 우리 결정 |
| `docs/data/` | 데이터 스냅샷·매핑표 | 문서 |

## 3. 파일명 규약

```
영구 문서   : UPPER_SNAKE.md                      예: DOMAIN_FACTS.md
시점 문서   : UPPER_SNAKE_YYYY-MM-DD.md           예: PUBLISH_REVIEW_GATE_2026-07-23.md
결정 기록   : ADR-NNN-소문자-요약.md              예: ADR-001-review-gate-on-api.md
인계        : {LANE}_HANDOFF_YYYY-MM-DD.md        예: DESKTOP_HANDOFF_2026-07-23.md
```

- **날짜가 없으면 영구 문서**로 간주한다. 시점 문서에 날짜를 빠뜨리면 낡은 전제가 정본 행세를 한다.
- 같은 주제의 v2가 나오면 **구본을 지우지 말고** 상단에 `> SUPERSEDED BY: <경로>` 한 줄을 붙인다.

## 4. 모든 문서 첫 3줄 (필수 헤더)

```markdown
# 제목
> 상태: 영구 | 시점(YYYY-MM-DD) | SUPERSEDED BY: <경로>
> 한 줄 요약 — 이 문서를 언제 읽어야 하는가
```

읽는 사람이 **3초 안에 "지금 이걸 읽어야 하나"**를 판단할 수 있어야 한다.

## 5. 진입 경로 (읽는 순서 고정)

```
docs/README.md (색인)
  → docs/DOMAIN_FACTS.md          이 앱이 무엇인가
  → docs/PRODUCT_LIFECYCLE_FLOW.md 상품이 지나는 길
  → docs/plan/PARALLEL_WORK_TRACKER.md (최신 rev)  지금 무슨 일이 진행 중인가
  → docs/plan/PRINCIPLES_LEARNED.md (최신 번호)    무엇을 하면 안 되는가
```

이 4개만 읽으면 어떤 레인(Desktop·Code·Cowork)이든 착수 가능해야 한다. 그 외 문서는 **필요할 때 색인에서 찾아 들어간다.**

## 6. 정리 규칙 (누적 방지)

1. **archive 기준**: 90일 경과 + SUPERSEDED 표기된 시점 문서 → `docs/<폴더>/archive/`로 이동. 삭제하지 않는다.
2. **인계 문서**: 다음 세션이 이어받으면 즉시 archive 대상. 최신 1~2개만 `handoff/` 루트에 둔다.
3. **중복 발견 시**: 새 문서를 만들지 말고 기존 문서를 갱신한다(COLLABORATION_PLAYBOOK #1).
4. **분기 1회 점검**: 루트에 날짜 붙은 파일이 있는가 / SUPERSEDED 미표기 구본이 있는가 / README 색인이 최신인가.
