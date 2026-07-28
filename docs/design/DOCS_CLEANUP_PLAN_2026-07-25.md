# DOCS 정리 계획표 v3 (2026-07-25)

> 상태: 시점(2026-07-25) · v3 (구본: DOCS_CLEANUP_PLAN_2026-07-24.md)
> 한 줄 요약 — DOCS_STANDARD v3 §14 정보 3그룹으로 docs 310개 재분류 + CLAUDE.md audit. **전 항목 위험도(#314). 이동·삭제 미실행 — 계획만.**
> 기준: `DOCS_STANDARD.md` v3(§13~§17) · `research/CLAUDE_MD_KOREAN_PRACTICES_2026-07-25.md` · 원칙 #303·#314.

## 0. 위험도 범례 (#314)

| 위험도 | 유형 | 승인 |
|---|---|---|
| 🟢 추가 | 새 문서·헤더 부여·SUPERSEDED 표기·rules 신설 | 불필요 |
| 🟡 이동/격리 | 폴더 이동(git·디스크 잔존, 링크 갱신 동반) | 불필요 |
| 🔴 삭제/재작성 | 줄 제거·통합·축약 | **필수 · audit→승인→update(§15) · 전문 보존 선행** |

## 1. 현황 실측 (2026-07-25) — v2 대비 변화

| 폴더 | v2(07-24) | **v3(07-25)** | 비고 |
|---|---|---|---|
| docs 루트 | 3 | 4 | 영구 정본 |
| design | 92 | **95** | 시점 문서 누적 |
| handoff | 107 | **1 (+archive 107)** | ★ §8 **집행 완료** — CURRENT.md 단일화 끝 |
| plan | 34 | 17 | archive 정리됨 |
| research | 52 | 54 · decisions 7 · playbook 6 · runbook 1 · archive 1 · data 0 | |
| **전체** | ~299 | **310** | |

**이미 집행된 것(다른 세션)**: handoff CURRENT.md 단일화 + archive 107 격리(삭제 0). → v3에서 **완료 처리**, 재계획 안 함.

## 2. ★ 정보 3그룹 재분류 (DOCS_STANDARD v3 §14)

핵심 질문: *"이 정보는 **매 세션 항상** 필요한가, **작업할 때만** 필요한가, **아예 제외**인가?"*

| 그룹 | 판정 기준 | 저장 위치 | 대상 |
|---|---|---|---|
| **A. 항상 필요** | 모든 세션에 적용·지우면 실수 유발 | `CLAUDE.md`(≤200줄) + 진입 4문서 | 명령어·절대금지·생애흐름1줄·3레인경계·행동가이드 |
| **B. 작업별 필요** | 특정 작업 때만 읽음 | `docs/*.md`(색인서 진입) + `.claude/rules/`(경로범위) | 설계안·ADR·아키텍처·배포절차·원칙전문 |
| **C. 제외** | 코드 보면 알거나 낡음 | 격리 또는 미작성 | 코드조각·파일별설명·과거회의록·스타일규칙 |

### 그룹 A — CLAUDE.md에 남길 것 (346줄 → ≤200 목표)
| 유지 항목 | 근거 |
|---|---|
| 세션시작 절차·명령어(git·tsc·vercel verify) | §14 항상필요 |
| 절대금지 3종(네이버 PUT/POST·디스코드·테스트데이터) | 삭제금지(#46·리서치 §5) |
| 상품 생애흐름 1줄 + 검수필수(#307) | 삭제금지 |
| 3레인 경계·인계 규칙 | 삭제금지 |
| 행동 가이드라인 12줄(Karpathy) | v3 §17 삽입 확정 |

### 그룹 B — docs로 밀어낼 것 (CLAUDE.md에서 참조로)
| 이동 대상 | → 목적지 | 위험도 |
|---|---|---|
| 코드 작성 절대규칙(3-1~3-7 한글/Prisma/카테고리/이미지) | `.claude/rules/`(paths 범위) | 🟢 신설(복제) |
| 작업원칙 빠른 인덱스(#1~#314) | 이미 PRINCIPLES_*에 있음 → CLAUDE.md엔 링크만 | 🔴 축약(승인) |
| MCP·슬래시커맨드·환경 특이사항 | docs/runbook/ 또는 참조 | 🔴 축약(승인) |

### 그룹 C — 제외/격리
| 대상 | 조치 | 위험도 |
|---|---|---|
| CLAUDE.md 내 코드 조각 | `file:line` 참조로 대체 | 🔴 재작성(승인) |
| research 54개 중 스프린트 지난 스냅샷 | archive/YYYY-Q3 격리 | 🟡 이동 |
| design 95개 중 SUPERSEDED 대상 | §4 참조 | — |

## 3. CLAUDE.md audit (§15 audit 모드 — 수정 안 함, 보고만)

| 지표 | 현재 | 목표 | 판정 |
|---|---|---|---|
| 줄 수 | **346** | ≤200 | ❌ 146줄 초과 |
| 모든 세션 적용 비율 | 추정 60% | 100% | 코드규칙 3장·MCP·슬래시가 작업별(B그룹) |
| 코드 조각 | 있음(bash 블록·grep 패턴) | 0 | `file:line`/rules로 이동 |
| 안티패턴 | 파일별 설명·원칙 전문 재게시 | — | B/C로 |

**감축안(순 -146줄 목표)**: §6 코드규칙 → `.claude/rules/` · §6 환경특이사항 → runbook · §7 원칙 인덱스 → PRINCIPLES 링크 1줄. **전부 🔴 → audit 통과 후 승인 필요**. 절대삭제금지(리서치 §5) 항목은 유지.

## 4. 군C SUPERSEDED — 보류 유지 (#303)

**v2 확증 결과 그대로 유지**: 군C 6개는 명시적 대체관계를 grep으로 확증 못 함. IMAGE_SEO_STRATEGY_ENGINE이 ADAPTIVE_IMAGE_SEO를 "관련 권위"로 현재 참조, OPERATOR 외부참조 21건 등. **SUPERSEDED 표기 0건 유지.** 추측 표기 금지.

| 파일 | 조치 |
|---|---|
| ADAPTIVE_IMAGE_SEO_ENGINE · MOOD 관련 · OPERATOR_SYSTEM_BLUEPRINT | **표기 안 함**(살아있는 참조) |
| CONCEPT_PRESET · IMAGE_DETAIL_TWO_BRANCH · STUDIO_ATELIER_UX_REDESIGN | **보류**(운영자 대체 여부 확인 대기) |

## 5. `.claude/rules/` 신설 계획 (§11 · 맥락 절약 실수단)

현재 `.claude/rules/` 없음(worktrees만 존재). 신설 시 CLAUDE.md 본문을 얇게 유지.

| rules 파일 | paths 범위 | 담을 내용(CLAUDE.md에서 이동) | 위험도 |
|---|---|---|---|
| `.claude/rules/prisma.md` | `prisma/**`, `**/*.prisma` | 싱글턴·JsonValue 가드·generate | 🟢 신설 |
| `.claude/rules/naver-api.md` | `src/app/api/naver/**` | v2 full-replace PUT(#196·3-7)·비가역 게이트 | 🟢 신설 |
| `.claude/rules/korean-md.md` | `docs/**/*.md` | 한글 전체덮어쓰기·sentinel grep | 🟢 신설 |
| `.claude/rules/images.md` | `src/lib/**image**`, `scripts/upload-*` | 라이선스·누끼·네이버 대표규정(3-6) | 🟢 신설 |

> rules 신설(🟢)은 **복제**라 안전. CLAUDE.md에서 원본 제거(🔴)는 복제·검증 후 별도 승인.

## 6. 집행 순서 (위험도 오름차순)

| 순 | 작업 | 위험도 | 이번 세션 |
|---|---|---|---|
| 1 | v3 계획표 · 구본 SUPERSEDED · CLAUDE.md audit 보고 | 🟢 | ✅ 완료 |
| 2 | `.claude/rules/` 4종 신설(복제) · research 스냅샷 archive | 🟢🟡 | 승인 후 |
| 3 | CLAUDE.md 감축(코드규칙·환경 제거, §6→rules, 원칙→링크) | 🔴 | **audit→전문보존→승인** |
| 4 | feature-status.json 도입(§9) | 🟢 | 선택 |

## 6-A. ★ 집행안 상세 — 파일 단위 이동표 (계획만 · 실측 2026-07-25)

> 기준: DOCS_STANDARD §10 "현재 스프린트(07-23)보다 오래된 handoff·research 스냅샷 → archive/YYYY-QN". **삭제 0 — 전부 🟡 이동(격리)**. git·디스크 잔존.

### 6-A-1. research 54개 archive 확정안
| 대상군 | 판정 | 파일 수 | 조치 | 위험도 |
|---|---|---|---|---|
| 날짜 없는 원본(리서치 소스) | 영구 성격 — 유지 | 23 | 이동 안 함 | — |
| 6월 스냅샷(05-29~06-23) | 스프린트 2개+ 경과 | 20 | → `research/archive/2026-Q2/` | 🟡 이동 |
| 7월 상순(07-06~07-11) | 현 스프린트 이전 | 9 | → `research/archive/2026-Q3/` | 🟡 이동 |
| 07-24·07-25(현 사이클) | 활성 | 2 | 유지 | — |

> 근거 분포(실측): 06월 20건 · 07-06~11 9건 · 07-24~25 2건 · 날짜무 23건 = 54. **archive 대상 = 29건(6월20+7월상순9)**.

### 6-A-2. design 95개 archive 확정안
| 대상군 | 판정 | 파일 수(근사) | 조치 | 위험도 |
|---|---|---|---|---|
| 날짜 없는 22개 | §5(구본 v1) 분류: 군A영구11·군B최신3·군C보류6·기타2 | 22 | 헤더 부여만(🟢), 이동 안 함 | 🟢 |
| 06-04~06-24 시점문서 | 스프린트 경과 | 3 | → `design/archive/2026-Q2/` | 🟡 이동 |
| 07-03~07-17 시점문서 | 현 스프린트 이전이나 IA/이미지 활성참조 다수 | ~55 | **개별 확인 후** archive — 일괄 금지 | 🟡 조건부 |
| 07-23 (현 사이클) | 활성(생애주기·게이트) | 5 | 유지 | — |

> **주의(#303)**: design 07-03~07-17분 55개는 IA 재설계·이미지 엔진 등 **현재도 참조되는 것이 섞여** 있다. research와 달리 **일괄 archive 금지** — 외부참조 grep 0건인 것만 개별 이동. 이번 계획에선 "06월분 3개 + 참조0 확인분"만 확정, 나머지는 조건부.

### 6-A-3. 정보 3그룹 → 물리 배치 요약
| 그룹 | 파일 예 | 현 위치 | 목표 | 위험도 |
|---|---|---|---|---|
| A 항상필요 | CORE_PRINCIPLES·DOMAIN_FACTS·생애흐름 | docs 루트·CLAUDE.md | 유지 | — |
| B 작업별 | 설계안·ADR·엔진 스펙 | design/ | 유지(참조로 진입) | — |
| C 제외/격리 | 6월 research·구본 handoff | research/·handoff/ | archive/YYYY-QN | 🟡 이동 |

### 6-A-4. 집행 시 검증(이동 후 필수)
- 이동 후 **링크 깨짐 grep**: `grep -rn "research/<이동파일>" docs src` 0건 확인 후 확정.
- archive는 **삭제 아님** — `git mv`로 이력 보존. README 색인에 "archive는 검색용" 명기.

## 7. 이번 세션 실제 완료 (비파괴만)
- 구본 v2에 `SUPERSEDED BY` 표기(🟢).
- v3 신설 + **6-A 집행안 상세화**(파일단위 이동표·research 29건/design 조건부 archive 확정안).
- 정보 3그룹 재분류 · CLAUDE.md audit 보고(수정 0 · §15 audit 모드).
- 군C 보류 유지 확인(#303).
- **파일 이동·삭제·CLAUDE.md 수정·rules 신설 = 전부 미실행**(승인 대기).

## 8. 미확정 (운영자 결정)
- CLAUDE.md 감축(🔴 순 -146줄) 실행 승인 — 전문 보존(`docs/archive/CLAUDE_FULL_2026-07-25.md`) 후 진행.
- 군C 3건(CONCEPT_PRESET·TWO_BRANCH·STUDIO_ATELIER) 대체 여부.
- `.claude/rules/` 4종 신설 착수 여부.
