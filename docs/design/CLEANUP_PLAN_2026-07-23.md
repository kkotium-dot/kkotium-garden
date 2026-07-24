# DESIGN 문서 정리 계획표 (2026-07-23)

> SUPERSEDED BY: docs/design/DOCS_CLEANUP_PLAN_2026-07-24.md
> 상태: 시점(2026-07-23) · 구본 — v2가 handoff 격리·CLAUDE.md 분산·군C 확증·위험도 표기를 추가함
> 한 줄 요약 — docs/design 92개 정리 계획. **이동·삭제·수정 미실행. 승인 후 집행.**
> 기준: `docs/DOCS_STANDARD.md`. 원칙: 구본 삭제 금지, SUPERSEDED 표기만(§3).

## 0. 현황 (실측)

| 폴더 | md 개수 |
|---|---|
| design | 92 (날짜有 70 · 날짜無 22) |
| handoff | 107 (만료성 — 별도 사이클) |
| research | 52 · plan 34 · playbook 6 · decisions 5 · runbook 1 · data 0 |

- SUPERSEDED 표기된 design 문서: **0건** (규약 미적용 상태).
- README 색인: 없었음 → 이번에 신설(`docs/README.md`).

## 1. design 날짜 없는 22개 — 분류 판정

DOCS_STANDARD §2: design = **시점 문서**만. §3: 날짜 없으면 영구로 오인됨. 22개를 3군으로 분류.

### 군A — 영구 정본 성격 (루트 이동 또는 영구 표기 대상)
전상품 공통 "표준/시스템" = 항상 현재 사실로 참조됨. design보다 루트/playbook이 맞음.

| 파일 | 판정 | 제안 조치 |
|---|---|---|
| ADAPTIVE_COMPOSITE_ENGINE.md | 영구(합성 표준 v8) | 첫3줄 `영구` 헤더 + playbook/ 검토 |
| IMAGE_SEO_STRATEGY_ENGINE.md | 영구(전상품 권위) | 영구 헤더 |
| MOOD_CAMERA_SPEC_SYSTEM.md | 영구(전상품) | 영구 헤더 |
| SCENT_MOOD_BACKGROUND_SYSTEM.md | 영구(전상품) | 영구 헤더 |
| FIREFLY_PHOTOREALISM_STANDARD.md | 영구(전상품 표준) | 영구 헤더 |
| PRODUCT_REGISTRATION_WORKFLOW.md | 영구(등록 표준) | 영구 헤더 |
| DETAIL_PAGE_PLAYBOOK.md | 영구(SOP) | playbook/ 이동 검토 |
| KKOTIUM_DESIGN_SYSTEM.md | 영구(BI) | 영구 헤더 |
| KKOTTI_PERSONA_VOICE_GUIDE.md | 영구(보이스 SoT) | 영구 헤더 |
| REPRESENTATIVE_IMAGE_FINISHING_SYSTEM.md | 영구(표준) | 영구 헤더 |
| THUMBNAIL_CROP_EDIT_STANDARD.md | 영구(표준) | 영구 헤더 |

### 군B — 이번 사이클 최신 (유지 · 영구 헤더만)
| 파일 | 판정 |
|---|---|
| LIFECYCLE_STATE_MACHINE.md · COPY_SYSTEM.md · SURFACE_RULES.md | v2 최신. LIFECYCLE_BRIDGE_V2가 override하는 파생 정본. 유지 |

### 군C — 구본 의심 (SUPERSEDED 후보 · 확인 필요)
날짜 없이 오래됐고 후속 문서에 대체됐을 가능성. **삭제 아님 — SUPERSEDED 한 줄 + 확인.**

| 파일 | 본문 날짜 | 의심 근거 | 대체 후보(확인 필요) |
|---|---|---|---|
| MASTER_UX_BLUEPRINT.md | 2026-05-06 | v1·최고령. IA 대격변 이전 | MASTER_UX + 이후 IA 재설계 문서들 |
| ADAPTIVE_IMAGE_SEO_ENGINE.md | 2026-06-08 | IMAGE_SEO_STRATEGY_ENGINE(06-16)과 주제 중복 | IMAGE_SEO_STRATEGY_ENGINE.md |
| CONCEPT_PRESET_SYSTEM.md | 2026-06-03 | 프리셋 — ADAPTIVE_PRESET_ENGINE(plan)과 중복 의심 | 확인 필요 |
| IMAGE_DETAIL_TWO_BRANCH_SYSTEM.md | 2026-06-08 | 이미지 2갈래 — 후속 통합 의심 | ADAPTIVE_COMPOSITE_ENGINE.md |
| OPERATOR_SYSTEM_BLUEPRINT.md | 2026-06-08 | 초기 블루프린트 | OPERATOR 후속 문서 |
| STUDIO_ATELIER_UX_REDESIGN.md | 2026-06-08 | STUDIO_UI_UX_GUIDELINES(06-24)가 후속 | STUDIO_UI_UX_GUIDELINES.md |

> 군C는 **대체 관계를 grep으로 확증한 뒤** SUPERSEDED 표기. 확증 전 이동·삭제 금지(#34).

## 2. 집행 순서 (승인 후 · 파괴적 작업)

| 단계 | 작업 | 파괴성 | 선행 승인 |
|---|---|---|---|
| 1 | 22개 전체에 DOCS_STANDARD 첫3줄 헤더 부여 | 낮음(추가) | 문서 수정 승인 |
| 2 | 군C 대체관계 grep 확증 | 없음(읽기) | — |
| 3 | 군C에 `> SUPERSEDED BY: <경로>` 표기 | 낮음(추가) | 확증 후 |
| 4 | 군A 중 루트/playbook 이동 대상 실제 이동 | **높음(경로변경)** | 개별 승인 |
| 5 | 90일+SUPERSEDED → archive/ 이동 | **높음** | 개별 승인 |

## 3. 이번 세션 실제 완료 (비파괴만)
- `docs/README.md` 색인 신설(없었음).
- 본 계획표 산출.
- **이동·삭제·SUPERSEDED 표기·헤더 부여 = 전부 미실행**(승인 대기).

## 4. 미확정 (운영자 결정)
- 군A "표준/시스템"을 design에 둘지(시점 취급) vs 루트/playbook로 올릴지(영구 취급). DOCS_STANDARD상 후자지만 이동 비용·링크 갱신 발생.
- handoff 107개 archive 기준(최신 1~2개만 루트 유지) 별도 사이클로 진행할지.
