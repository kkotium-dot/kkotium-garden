# 인계 — 적재 폴더 체계 + 연속성 (새 채팅용)

작성 2026-06-12 / Desktop 직접 기록 (#49) / 단일 권위 보조 = docs/plan/PARALLEL_WORK_TRACKER.md

---

## A. 직전 세션 상태 (검증됨)

- **docs-standard 세션 완료**: commit `015cc3f` production 라이브 검증(prod SHA == HEAD).
  - ADAPTIVE_COMPOSITE_ENGINE.md → v8 전면 개정(참조 드롭 하모나이즈 1차, PIL 결정론=폴백).
  - PRODUCT_REGISTRATION_WORKFLOW.md 신규(원산지 공급사 권위·국산 디폴트 금지·옵션 정합·고시 사이즈→스케일 앵커).
  - CLAUDE.md §3-6 memo(v8 절대조건).
  - 한글 sentinel 0·이모지 0 검증.
- **의심 파일**: `src/app/api/products/[id]/finish-image/route 2.ts` — `route.ts`와 byte-identical 중복 아티팩트(공백 포함 파일명, 권한 비정상). untracked. → **삭제 권장**(대표 GO 시 제거).
- **stash** `z3c-misdirected-changes-needs-redo` 잔존(무관, 보고만).

---

## B. 적재 폴더(FT) 체계 — 현황 정정 포함

### B-1. 자동분류 = LIVE (production 실측 확인)
- 명화(cmpnooli40001f0gveaxr8iim): `cutout/`(3) · `composite/`(9) 단계 폴더 **실제 생성됨** → FT 작동 확정.
- 달항아리(cmp3afb450001gng5468w0qpc): root_flat(9) — 신규 업로드 시 단계 폴더 생성(설계대로).
- 아이스트레이(cmpp62yje00015xup5h8pgwx0): root_flat(1).

### B-2. 정정 — 레거시 flat 미이동은 버그 아님
- 기존 flat 파일을 단계 폴더로 안 옮긴 것은 **URL 보존 설계**(mainImage/extra_images 절대 URL 무손상). listProductAssets가 flat+하위폴더 둘 다 읽음. → "미이관"은 정상.

### B-3. 발견된 정리 대상 (하우스키핑)
1. **stray `lifestyle/` 2개**(la-*.png, 2026-05-17) — 상품 경로 밖 고아 자산 → archive 이관 대상.
2. **명화 composite 9개 중 6개 폐기본**(AI 재드로잉 구버전) — extra_images 미참조 → archive 이관 대상.
3. **Adobe CC 중복 kkotium 폴더 6개** — 대표 수동 삭제(비가역, 보류).

### B-4. 경로 스킴 (확정)
```
product-assets/{productId}/{stage}/{variant}-{ts}.{ext}
  stage = source | cutout | composite | thumb | detail | archive
공개 URL = https://doxfizicftgtqktmtftf.supabase.co/storage/v1/object/public/product-assets/{경로}
대시보드 = https://supabase.com/dashboard/project/doxfizicftgtqktmtftf/storage/buckets/product-assets
Adobe CC 미러 = KKOTIUM_GARDEN/00_inbox·01_cutout·02_composite·03_thumbnail·04_detail·99_archive
```

---

## C. 적재 폴더 개선안 (전상품 체계, 제안)

| # | 개선안 | 효과 | 비고 |
|---|---|---|---|
| 1 | **source/ 스테이지 추가** | 공급사 원본 영구보존 → 누끼 재생성 항상 가능(#59) | AssetKind 6종화 |
| 2 | **자동 아카이브** | extra_images 스왑 시 탈락 composite 자동 archive/ 이동 | 수동 0 |
| 3 | **앱 내 자산 브라우저(C-5)** | 상품별·단계별 그리드 + 액션(대표/추가/아카이브/삭제) | 운영자 정식 표면 |
| 4 | **고아 자산 탐지** | DB 미참조 storage 파일 주기 점검·플래그(lifestyle stray류 자동검출) | 안전망 |
| 5 | **stray 경로 정리** | lifestyle/ 2개 출처확인 후 이관 | 일회성 |
| 6 | **네이밍 규약 강화** | variant = {source}_{mood}_{scale} + ts, 의미라벨 강제 | safeVariant 확장 |
| 7 | **Adobe 중복 폴더 정리** | 입구 정돈 | 대표 수동·비가역 |
| 8 | **레거시 flat 선택적 migrate-with-rewrite** | (옵션) 완전 정돈 | DB 참조 동시갱신 필수, 미필수 |

---

## D. Claude Code 핸드오프 — 세션 4 (asset-hygiene) 확정본

```
Target Session: asset-hygiene
Branch: main
작업: 적재 폴더 정비 + 개선(전상품). Supabase storage 클라이언트 사용(raw SQL 금지 — 메타 desync 방지). 전부 가역, dry-run 로그 선행.
1) source/ 스테이지 추가: AssetKind에 'source' 추가, 공급사 원본 회수 시 {pid}/source/ 저장(#59).
2) 자동 아카이브: apply-composite/compose에서 extra_images 스왑 시 탈락 composite를 {pid}/archive/ 로 이동 + DB 참조 무결성 검증.
3) 명화 composite 정리: extra_images 미참조 6종 → {pid}/archive/(삭제 아님). 참조 3종만 composite/ 유지.
4) stray 'lifestyle/' 2개: 참조 점검 후 미참조면 archive/로 이관.
5) 고아 자산 탐지 유틸: storage 파일 vs DB(mainImage/extra_images) 대조 → 미참조 목록 플래그.
6) 검증: 이관 후 mainImage/extra_images URL 깨짐 0, listProductAssets 정상, 전상품 동작.
규칙: 이모지 0·주석 영어·tsc·비가역 0·기존 URL 보존. .commit-msg.tmp 체인.
```

---

## E. 병행 트래커 (누락 0)

| 트랙 | 상태 |
|---|---|
| C-3 finish-image | DONE·프로덕션 검증 |
| docs-standard (v8 표준+등록 워크플로) | DONE `015cc3f` |
| route 2.ts 중복 | 삭제 대기(대표 GO) |
| FT 자동분류 | LIVE·검증 |
| 적재 폴더 정비(개선 1~6) | 세션 4 asset-hygiene |
| C-5 이미지 스튜디오 | 세션 2(자산 브라우저=개선 3 포함) |
| origin-integrity | 세션 3 |
| Operator Action Queue | 개입 5점 반영(BLUEPRINT) |
| 명화 4컷 하모나이즈 | 누끼 드롭 후 즉시 |
| 명화 발행 | 이미지셋 교체 후 GO(비가역) |
| 달항아리·아이스트레이 | v8 동일 적용 |

---

## F. 다음 채팅 첫 액션
1. (선택) route 2.ts 삭제 GO 확인.
2. 명화 첫 하모나이즈: cutout_C를 Firefly 참조 드롭(운영자) → Claude 생성·선별·형태가드·편집루프 운전.
3. Code 세션 2~4 paste 실행(병렬).
4. 모든 산출 후 extra_images 스왑(가역) → 명화 발행 GO 게이트.
