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

---

# ★ v2 개정 (2026-07-24) — 리서치 반영

> 근거: `docs/research/AI_DOCS_MANAGEMENT_STANDARD_2026-07-24.md`
> 아래 규칙이 위 §1~§6을 **보강**한다(폐기 아님).

## 7. 맥락 예산 규칙 (Context Budget) — 최우선

문서는 많을수록 좋은 게 아니다. **Claude가 매 세션 읽는 양이 곧 성능 비용**이다.

| 대상 | 상한 | 근거 |
|---|---|---|
| `CLAUDE.md` | **≤200줄**(목표 150) | Anthropic 공식 권고. 초과 시 지시 준수율 하락 |
| 세션 시작 필독 | **4문서**(README·DOMAIN_FACTS·PRODUCT_LIFECYCLE_FLOW·TRACKER 최신 rev) | 진입 비용 고정 |
| 활성 인계 | **1개** | 다수 존재 시 최신 판별 불가 |

**판별 기준**: *"이 줄을 지우면 Claude가 실수하게 되는가?"* 아니면 지운다.
**금지**: 코드 보면 아는 것 · 자주 바뀌는 정보 · 파일별 설명 · 일반론.

## 8. 인계 문서 규칙 (기존 §2 보강 · 107개 누적 대응)

1. **활성 인계는 `docs/handoff/CURRENT.md` 단 하나.** 세션이 이어받는 즉시 이전 것은 archive.
2. 머리에 필수 4항목: `status` · `branch` · `goal` · `next-action`.
3. **받는 쪽은 인계문을 믿지 말고 저장소 현재 상태와 대조 검증한다.** 인계문은 단서지 진실이 아니다.
4. 산문 덩어리를 넘기지 않는다. **구조화된 상태**(표·체크리스트)로 넘긴다.
5. 나머지 106개는 `docs/handoff/archive/YYYY-QN/`으로 **물리적 격리**(삭제 아님).

## 9. 기계가 갱신하는 상태는 JSON으로

Anthropic 실험 결과, **모델은 Markdown보다 JSON을 함부로 덮어쓸 가능성이 낮다.**
- 진행 상태 요약처럼 **레인이 반복 갱신하는 값**은 `docs/plan/feature-status.json`에 둔다.
- 갱신은 **불리언·짧은 값만** 바꾸도록 제한. 서술은 Markdown에.

## 10. 보관(archive) 규칙 — "색인병" 차단

- 낡은 문서는 **지우지 않고 격리**한다. 어텐션은 문서의 '유효 여부'를 구분하지 못하므로, 살아있는 폴더에 두면 계속 성능을 깎는다.
- **월 1회**: 현재 스프린트보다 오래된 `handoff/`·`research/` 스냅샷 → `archive/YYYY-QN/`.
- 대체된 문서에는 상단에 `> SUPERSEDED BY: <경로>` **필수 표기**(현재 0건 — 규약 미적용 상태).

## 11. `.claude/rules/` 도입 (맥락 절약의 유일한 실제 수단)

`@경로` import는 파일을 그대로 펼쳐 넣어 **맥락을 절약하지 못한다.** 실제 절약은 `paths:` 범위 지정 규칙뿐이다.

```
.claude/rules/prisma.md    (paths: prisma/**, **/*.prisma)
.claude/rules/naver-api.md (paths: src/app/api/naver/**)
.claude/rules/korean-md.md (paths: docs/**/*.md)
```

→ 해당 파일을 건드릴 때만 로드되므로, CLAUDE.md 본문을 얇게 유지할 수 있다.

## 12. ADR(결정 기록) — Nygard 형식 채택

`docs/decisions/ADR-NNNN-소문자-요약.md`

```markdown
# ADR-0001: 제목
> 상태: 승인 | 폐기 | Superseded by ADR-NNNN
## 맥락   서로 충돌하는 힘들을 서술
## 결정   "우리는 ~한다" (능동태)
## 결과   긍정·부정·중립 영향을 함께
```

- **1 ADR = 1 결정.** 승인 후 **본문 불변** — 바꾸려면 새 ADR을 쓰고 구본에 `Superseded by` 표기.
- MADR(선택지별 장단점)은 **진짜 논쟁적 사안에만**. 기본은 Nygard.
