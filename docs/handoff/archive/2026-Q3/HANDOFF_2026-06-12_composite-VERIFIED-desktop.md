# HANDOFF — /assets composite=0 P0 종결 (Desktop 3-tier LIVE 검증완)

- Target Session: 대표 / Desktop (다음 본작업 결정)
- Branch: main (production HEAD = 619dbff READY)
- 작성: Code-CLI, 2026-06-12 (세션6-c)
- 비가역도: 0 (probe 삭제 + docs only · 네이버 무접촉 · DB 무변경)
- 선행 권위: HANDOFF_2026-06-12_composite-rootcause-probe.md (세션6-b 진단·배포)

---

## 0. 한 줄 요약

`/api/products/{id}/assets` 의 production **composite=0** P0 이슈가 **Desktop 3-tier 실측으로 종결**됐다.
근본원인 = **§5 판정트리 2행 = no-slash list 버그**(런타임 특이) 확정. env 키 drift 는 배제(1행 무혐의·cutout=3 상시 정상). §3 trailing-slash 자가치유(#67)로 **영구 복구**. 임시 probe 라우트는 역할 종료로 삭제.

---

## 1. Desktop 종결 검증 (3-tier, 재실측 불필요)

| tier | 방법 | 결과 |
|---|---|---|
| 1 (API) | `GET /api/products/{id}/assets` · x-vercel-cache **MISS**(fresh) | **composite = 9** (이전 0 → 9) |
| 2 (DB) | SQL `storage.objects` composite prefix 카운트 | composite **9건** · API 9건 **1:1** |
| 3 (UI) | `/studio` 에셋탭 composite 썸네일 LIVE 렌더(Control Chrome) | 고유 composite **9썸네일** 렌더 · `naturalWidth > 0` |

회귀 0: cutout=3 유지(상시 정상·무회귀).

---

## 2. 근본원인 확정 (§5 판정트리 직독)

- **2행 적중** — `composite_noSlash.rows == 0` AND `composite_slash.rows == 9` = **no-slash list 류 버그**(클라이언트/키/런타임 조합 특이).
- **1행 배제** — `env.keyPrefix == sb_secret` · keyLen 정상 → **production env 키 drift 아님**. (cutout=3 이 production 에서 상시 정상이었다는 사실과 정합 — 단일 키가 같은 버킷에서 cutout 은 보면서 composite 만 0 → 키 문제 불가능.)
- **영구복구** — §3 `listProductAssets.collect()` trailing-slash 자가치유(#67): no-slash 0행 → `prefix/` 1회 재시도. 0행일 때만 동작 = 정상결과 불변. 전상품 표준 방어.

---

## 3. 이번 turn 변경 (세션6-c)

- **probe 라우트 삭제**: `src/app/api/debug/storage-probe/` (git rm). 진단 역할 종료. 자가치유(#67)는 `automation-storage.ts` 에 영구 잔존.
- **MD 정합**: PROGRESS · SESSION_LOG · TASK_BRIDGE(84) · ROADMAP(P0 DONE) · PARALLEL_WORK_TRACKER(rev15) · PRINCIPLES_LEARNED(#67 라이브검증 비고).
- **검증**: tsc 0 · build 0 · 이모지 0 · 한글리터럴 0 · 비가역 0.

---

## 4. 다음 1액션 (대표 결정)

- **[대표]** 명화 publish GO (#46 비가역 게이트) — composite P0 가 종결됐으므로 발행 비행전 선결 해소. publish-preview canPublish=true · statusType=SALE · HB 안전번호 2종. 라이브 inspect 대조 2건(원산지·옵션 4/3)은 발행 전 대표 최종 확인 필수(전체교체 PUT).
- **[Desktop]** 또는 P1 실사용 E2E(스튜디오 적용 1회 → 단계폴더 실생성 검증).
- **[Code]** asset-hygiene · origin-integrity 별도세션(병행 가능).

---

## 5. 검증 재현 절차 (필요 시)

1. `GET https://kkotium-garden.vercel.app/api/products/{id}/assets` → composite count == 9 (x-vercel-cache MISS).
2. SQL: `storage.objects` 에서 `name like '{id}/composite/%'` 카운트 == 9 → API 1:1.
3. `/studio` 에셋탭 → composite 9썸네일 naturalWidth>0 LIVE.
4. cutout=3 무회귀 확인.

---

## 6. 비고

- probe · 자가치유 · 이번 정합 모두 네이버 무접촉 · DB 무변경 · 가역.
- 선행 진단 전체 맥락 = HANDOFF_2026-06-12_composite-rootcause-probe.md (세션6-b).
- 원칙: #66(5단 격리) · #67(trailing-slash 자가치유·라이브검증완) · #68(env 정합 게이트) · #69(인계 in-chat 박제).
