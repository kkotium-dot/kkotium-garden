# DOCS 정리 계획표 v2 (2026-07-24)

> 상태: 시점(2026-07-24) · v2 (구본: CLEANUP_PLAN_2026-07-23.md)
> 한 줄 요약 — docs 전체 정리 계획. **모든 항목 위험도 표기(#314). 이동·삭제 미실행 — 계획만.**
> 기준: `docs/DOCS_STANDARD.md` v2 · 원칙 #314. 구본 대비 추가: handoff 격리 · CLAUDE.md 분산 · 군C 확증 결과 · 전항목 위험도.

## 0. 위험도 범례 (#314)

| 위험도 | 유형 | 승인 |
|---|---|---|
| 🟢 추가 | 새 문서·헤더 부여·SUPERSEDED 표기 append | 불필요 |
| 🟡 이동/격리 | 폴더 이동(git·디스크 잔존) | 불필요(단 링크 갱신 동반) |
| 🔴 삭제/재작성 | 줄 제거·통합 | **필수 · 전문 보존 선행(#314)** |

## 1. 현황 (실측 2026-07-24)

| 폴더 | md | 비고 |
|---|---|---|
| design | 92 | 날짜無 22 (군A11·군B3·군C6·기타2) |
| handoff | 107 | **만료성 — 최대 누적처. 격리 1순위** |
| research | 52 · plan 34 · playbook 6 · decisions 7 · runbook 1 · data 0 | decisions는 ADR 2건 추가로 5→7 |

## 2. handoff 107개 격리 + CURRENT.md 단일화

**문제**: handoff는 만료성인데 107개가 루트에 쌓임. 다음 세션이 어느 게 최신인지 모른다.

| 단계 | 작업 | 위험도 |
|---|---|---|
| H1 | `docs/handoff/CURRENT.md` 신설 — 최신 인계 1건만 가리키는 포인터(내용 복제 아님, 링크) | 🟢 추가 |
| H2 | 최신 1~2개 제외 나머지 105개 → `docs/handoff/archive/` 이동 | 🟡 이동 |
| H3 | archive 이동 후 README 색인에 "handoff는 CURRENT.md만 보라" 명기 | 🟢 추가 |

> 삭제 0건. 전부 git·디스크 잔존(🟡). CURRENT.md는 **포인터**라 인계 교체 시 한 줄만 갱신.

## 3. CLAUDE.md → .claude/rules/ 분산 계획

**문제**: CLAUDE.md가 비대(세션절차·코드규칙·작업흐름·경로·환경 혼재). 한 파일이 모든 규칙을 지면 하나 고칠 때 전체를 건드린다.

| 단계 | 작업 | 위험도 |
|---|---|---|
| C1 | `.claude/rules/` 분류안 설계(session-start · code-rules · git-flow · korean-handling · paths) | 🟢 추가(설계만) |
| C2 | CLAUDE.md 각 섹션을 rules 파일로 **복제**(원본 유지) | 🟢 추가 |
| C3 | 복제 검증(규칙 유실 0 grep 확인) 후 CLAUDE.md는 **색인+링크로 축약** | 🔴 **삭제/재작성 — 승인 필수** |
| C4 | C3 전 `docs/archive/CLAUDE_FULL_2026-07-24.md`로 전문 보존(#314-1) | 🟢 추가(선행 의무) |

> C3만 🔴. #314 절차: 전문 보존(C4) → 삭제 후보 제시 → 승인 → 실행 → grep 검증 보고. **이번 세션은 C1까지만(설계), C2~C4는 승인 후.**

## 4. 군C SUPERSEDED 표기 — 확증 결과 (★정정)

**구본 v1은 군C 6개를 "SUPERSEDED 후보"로 봤으나, 확증 결과 대부분 오판이었다.** grep 실측:

| 파일 | v1 의심 | 확증 결과 | 조치 |
|---|---|---|---|
| ADAPTIVE_IMAGE_SEO_ENGINE.md | IMAGE_SEO_STRATEGY가 대체 | **반증** — IMAGE_SEO_STRATEGY_ENGINE:7이 이 문서를 "관련 권위"로 **현재 참조**. 외부참조 8건 | **표기 안 함** |
| MOOD 관련 | 대체 의심 | MOOD_CAMERA_SPEC:165 "흡수(대체 아님)" 명시 | **표기 안 함** |
| CONCEPT_PRESET_SYSTEM.md | 중복 의심 | 외부참조 11건 — 살아있음 | 확증 불충분, 표기 보류 |
| IMAGE_DETAIL_TWO_BRANCH_SYSTEM.md | ADAPTIVE_COMPOSITE가 대체 | 대체 명시 없음. 외부참조 8건 | 표기 보류 |
| OPERATOR_SYSTEM_BLUEPRINT.md | 초기 블루프린트 | 외부참조 **21건** — 최다 참조. 폐기 아님 | **표기 안 함** |
| STUDIO_ATELIER_UX_REDESIGN.md | STUDIO_UI_UX_GUIDELINES가 후속 | GUIDELINES에 대체 명시 없음. 외부참조 4건 | 표기 보류 |

**결론(#303 정직)**: 군C 6개 중 **SUPERSEDED 표기 확정 = 0건.** 명시적 대체관계를 grep으로 확증하지 못했다. 외부참조가 살아있는 문서를 폐기 표기하면 링크가 깨진다. **추측으로 표기하지 않고, 대체관계를 문서 본문으로 확증한 건에만 표기한다.**

| 단계 | 작업 | 위험도 |
|---|---|---|
| S1 | 군C 각 문서의 후속 문서에서 "이 문서를 대체한다"는 **명시 문장**을 찾을 때만 SUPERSEDED 표기 | 🟢 추가 |
| S2 | 확증 안 되면 **표기하지 않고** 운영자에게 "대체 여부 확인" 질의 | — |

## 5. design 날짜없는 22개 헤더 부여 (구본 §1 유지)

| 군 | 파일 수 | 조치 | 위험도 |
|---|---|---|---|
| A 영구 정본 성격 | 11 | DOCS_STANDARD 첫3줄 `영구` 헤더 부여 | 🟢 추가 |
| B 이번 사이클 최신 | 3 | 유지(LIFECYCLE_STATE_MACHINE·COPY_SYSTEM·SURFACE_RULES) | — |
| C SUPERSEDED 후보 | 6 | §4 결과 = 표기 0건, 헤더만 부여 | 🟢 추가 |
| 기타(README·본계획표) | 2 | 해당 없음 | — |

> 군A 루트/playbook **이동**은 🟡이나 링크 갱신 동반 → 개별 승인. 이번엔 헤더 부여(🟢)까지만 계획.

## 6. 집행 순서 (위험도 오름차순)

| 순 | 작업 | 위험도 | 이번 세션 |
|---|---|---|---|
| 1 | README 색인(완료) · 본 v2 계획표 · 구본 SUPERSEDED 표기 | 🟢 | ✅ 완료 |
| 2 | handoff CURRENT.md · design 헤더 부여 · C1 rules 분류안 | 🟢 | 승인 후 |
| 3 | handoff archive 이동 · 군A 이동 | 🟡 | 승인 후(링크 갱신) |
| 4 | CLAUDE.md 축약(C3) | 🔴 | **전문 보존+승인 필수** |

## 7. 이번 세션 실제 완료 (비파괴만)
- 구본 CLEANUP_PLAN_2026-07-23에 `SUPERSEDED BY` 표기(🟢).
- 본 v2 신설(🟢).
- 군C 6개 대체관계 grep 확증 → **SUPERSEDED 표기 0건 확정**(추측 배제).
- **이동·삭제·헤더부여·archive = 전부 미실행**(승인 대기).

## 8. 미확정 (운영자 결정)
- CLAUDE.md 분산(C3 🔴) 실행 여부 — 전문 보존 후 진행할지.
- 군C 대체 여부 — grep으로 확증 안 됨. OPERATOR/CONCEPT_PRESET 등이 여전히 정본인지 운영자 확인 필요.
- 군A 표준문서를 design 잔류(시점 취급) vs 루트/playbook 승격(영구) 중 택.
