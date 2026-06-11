# 빌드 플랜 — 누끼 + 크롭 마무리 시스템 (청크 분할)

작성 2026-06-09 · 데스크톱. 설계 권한 = `docs/design/REPRESENTATIVE_IMAGE_FINISHING_SYSTEM.md`. 구현 = Claude Code. **각 청크 = 새 채팅 1개**(컨텍스트 한계·중복작업 방지). 청크 시작 시 해당 진입 문구를 붙여넣고, 끝나면 본 플랜의 체크박스를 갱신·커밋.

핑퐁: Code가 청크 구현·커밋·push → 데스크톱이 production SHA(#36) + 엔드포인트 실측(#45) → 다음 청크. 모든 핸드오프에 `Target Session` + `Branch` 표기(#36).

---

## 의존성 그래프
```
C-1 (인앱 SIMPLE 누끼)  ─┐
C-2 (어도비 누끼 적용)   ─┼─→ C-3 (finish-image 라우터 + 스키마) ─→ C-5 (스튜디오 UI) ─→ C-6 (브라우저 테스트=데스크톱)
C-4 (seo-guard→개입대기열) ┘                                        ↑
                                                          C-4도 C-5 전 완료 권장
```
- **병렬 가능:** C-1 ∥ C-2 ∥ C-4 (서로 무관, 동시 다른 채팅 가능).
- **직렬:** C-3는 C-1+C-2 후, C-5는 C-3+C-4 후, C-6는 C-5 후.

---

## C-1 · 인앱 SIMPLE 누끼 (sharp 흰배경 평탄화)  [Code]
- [x] `src/lib/images/bg-difficulty.ts` — 배경 난이도 0~100 + 사유. sharp 가장자리 픽셀 통계(흰/중립 비율, 색 분산). 임계값 주석 문서화.
- [x] `src/lib/images/white-bg.ts` — sharp 누끼·흰배경 합성·1:1 1000px. simple-crop의 OCR/해상도 가드 재사용(공유 모듈로 추출 가능).
- [x] `POST /api/products/[id]/white-bg` — dry-run(base64 preview + warnings) / `confirm:true`(uploadAutomationAsset → mainImage+main_image_url, 가역). thumb-crop과 형제 구조.
- 검증: tsc 0 / build OK / 이모지 0 / 코드 한글 리터럴 0. 공급사 클린컷 1장으로 dry-run 200 + preview 확인.
- 진입 문구: 본 파일 "붙여넣기 — C-1" 절.

## C-2 · 어도비 누끼 적용 executor  [Code]
- [ ] `POST /api/products/[id]/apply-cutout` — body: `{ cutoutUrl }`(어도비 산출 PNG) 또는 업로드. sharp로 흰배경 합성·1:1·가드 → dry-run/confirm 적용. 해당 `bg_clean` asset_jobs 행을 `human_done`/`done` 전이.
- [ ] asset-edit-job의 bg_clean seed 응답에 sourceUrl + "apply-cutout로 회수" 안내 필드 추가(UI 연동용).
- 검증: tsc 0 / build OK. 임의 투명 PNG로 흰배경 합성·적용 dry-run 200.
- 진입 문구: "붙여넣기 — C-2" 절.

## C-3 · finish-image 단일 라우터 + 스키마  [Code, C-1·C-2 후]
- [x] `POST /api/products/[id]/finish-image` — bg-difficulty 판정 → SIMPLE이면 white-bg, COMPLEX면 bg_clean seed 반환. UI는 이 라우트 하나만 호출.
- [x] 마이그레이션: `Product.extra_images jsonb DEFAULT '[]'` + `Product.main_image_policy text NULL`(`lifestyle_intended` 등). Supabase migration 파일 `docs/design/MIGRATION_finishing_*.sql`.
- [x] 이전 대표 → extra_images 이동 옵션(`keepAsExtra:true`).
- 검증: tsc 0 / build OK / 마이그레이션 적용 확인(데스크톱 실측). 3상품 finish-image dry-run 분기 정확.
- 진입 문구: "붙여넣기 — C-3" 절.

## C-4 · seo-guard → 개입대기열 연결 + override 정책  [Code, 병렬 가능]
- [ ] seo-guard `main_image_white_bg=fail` → 개입대기열 항목(액션 `finish_representative` + deepLink) 생성. (개입대기열 소스 = OPERATOR_SYSTEM_BLUEPRINT 기준 위치 확인 후 연결.)
- [ ] override: `main_image_policy=lifestyle_intended` 설정 시 해당 상품 white_bg를 `info`로 강등(재알림 억제).
- 검증: 명화 override 설정 → seo-guard 재호출 시 info 강등 확인.
- 진입 문구: "붙여넣기 — C-4" 절.

## C-5 · 스튜디오 "대표이미지 마무리" 카드  [Code, C-3·C-4 후]
- [ ] 우측 패널 통합 카드: 현재 대표 + seo-guard 칩 + [자동 다듬기/직접 크롭/추가이미지 보관]. dry-run before→after → 적용 → seo-guard 재호출 칩 갱신.
- [ ] COMPLEX 분기 UI: sourceUrl 복사 + 결과 붙여넣기/업로드 → apply-cutout.
- [ ] 컨트롤타워/상품목록: white_bg fail 뱃지 + 일괄 진입.
- 검증: tsc 0 / build OK. (시각 QA는 C-6 데스크톱.)
- 진입 문구: "붙여넣기 — C-5" 절.

## C-6 · 브라우저 실무 테스트  [데스크톱]
- [ ] 3상품 각각 스튜디오 마무리 카드 실제 클릭 흐름(자동 다듬기·크롭·적용·재가드) 무오류 확인.
- [ ] 개입대기열 항목 생성·deepLink 이동 확인. override 강등 확인.
- [ ] 콘솔 에러 0 · 적용 후 mainImage 실제 교체(DB 실측) · 롤백 가능성 확인.
- [ ] 문제 없으면 다음 본작업으로. 문제 시 해당 청크 재오픈.

---

## 붙여넣기 — C-1 (새 Code 채팅)
```
[꽃틔움 가든 / Code 세션 / Target Session: C-1 인앱 SIMPLE 누끼 / Branch: feat/white-bg-simple]
설계 권한: docs/design/REPRESENTATIVE_IMAGE_FINISHING_SYSTEM.md (§3.1~3.3, §6)
빌드 플랜: docs/plan/CUTOUT_CROP_FEATURE_BUILD_PLAN.md (C-1 절)
작업:
1) src/lib/images/bg-difficulty.ts 신규 (sharp 가장자리 통계 → SIMPLE/COMPLEX 0~100 + reason)
2) src/lib/images/white-bg.ts 신규 (sharp 누끼·흰배경 합성·1:1 1000px; simple-crop의 OCR/해상도 가드 공유)
3) POST /api/products/[id]/white-bg 신규 (dry-run preview→confirm 적용; thumb-crop 형제 구조, uploadAutomationAsset 사용)
규칙: 이모지 0 / 주석 영어 / 한글 리터럴은 JSON 분리 / 수정 전 read_file / 수정 후 tsc --noEmit / 비가역 0(네이버 미접촉, DB 가역).
완료 시: 커밋·push, docs/plan/CUTOUT_CROP_FEATURE_BUILD_PLAN.md C-1 체크 + docs/plan/PARALLEL_WORK_TRACKER.md 갱신, 데스크톱 검증용 SHA 보고.
```

## 붙여넣기 — C-2 (새 Code 채팅)
```
[꽃틔움 가든 / Code 세션 / Target Session: C-2 어도비 누끼 적용 executor / Branch: feat/apply-cutout]
설계 권한: docs/design/REPRESENTATIVE_IMAGE_FINISHING_SYSTEM.md (§3.1, §6)
작업: POST /api/products/[id]/apply-cutout 신규 (cutoutUrl 받아 sharp 흰배경 합성·1:1·가드·dry-run/confirm 적용; 해당 bg_clean asset_jobs done 전이). asset-edit-job bg_clean 응답에 sourceUrl/회수안내 필드 추가.
규칙 동일(이모지0·영어주석·tsc·비가역0). 완료 시 커밋·push·체크·SHA 보고.
```

## 붙여넣기 — C-3 (새 Code 채팅, C-1·C-2 후)
```
[꽃틔움 가든 / Code 세션 / Target Session: C-3 finish-image 라우터+스키마 / Branch: feat/finish-image]
설계 권한: REPRESENTATIVE_IMAGE_FINISHING_SYSTEM.md (§3). 선행 C-1·C-2 머지 확인.
작업: POST /api/products/[id]/finish-image (bg-difficulty 분기) + 마이그레이션(Product.extra_images jsonb '[]', main_image_policy text) + keepAsExtra 이전대표 보관.
규칙 동일. 마이그레이션은 docs/design/MIGRATION_finishing_2026-06-09.sql 저장. 완료 시 커밋·push·체크·SHA 보고.
```

## 붙여넣기 — C-4 (새 Code 채팅, 병렬 가능)
```
[꽃틔움 가든 / Code 세션 / Target Session: C-4 seo-guard 개입대기열 연결 / Branch: feat/guard-queue]
설계 권한: REPRESENTATIVE_IMAGE_FINISHING_SYSTEM.md (§4) + docs/design/OPERATOR_SYSTEM_BLUEPRINT.md.
작업: seo-guard main_image_white_bg=fail → 개입대기열 finish_representative 항목+deepLink. main_image_policy=lifestyle_intended override 시 white_bg info 강등.
규칙 동일. 완료 시 커밋·push·체크·SHA 보고.
```

## 붙여넣기 — C-5 (새 Code 채팅, C-3·C-4 후)
```
[꽃틔움 가든 / Code 세션 / Target Session: C-5 스튜디오 대표이미지 마무리 카드 / Branch: feat/finish-ui]
설계 권한: REPRESENTATIVE_IMAGE_FINISHING_SYSTEM.md (§5) + STUDIO_ATELIER_UX_REDESIGN.md + KKOTIUM_DESIGN_SYSTEM.md.
작업: 우측 패널 통합 카드(자동 다듬기/직접 크롭/추가이미지 보관, dry-run before→after, 적용→재가드), COMPLEX 분기 UI(sourceUrl 복사·결과 회수), 컨트롤타워 white_bg fail 뱃지·일괄 진입.
규칙: 이모지0·Lucide 아이콘·영어주석·tsc·비가역0. 완료 시 커밋·push·체크·SHA 보고 → 데스크톱 C-6 테스트 요청.
```

---

## C-7 · 합성(누끼→무드 배경) 파이프라인 = Branch B 앱 기능  [Code]
누끼 + 무드 배경을 자연스럽게 어우러지게 합성 — 추가이미지/상세 히어로 전용(대표는 §9 흰배경).
- bg_clean(누끼)→composite→harmonize를 asset_jobs 파이프라인으로 연결(기존 job-type-routing 확장).
- harmonize = 색온도·그림자·접지(컨택트섀도) 정합. 레시피 = docs/handoff/HANDOFF_myeonghwa_composite_recipe_2026-06-09.md + 프리셋 tone&manner 매트릭스(ADAPTIVE_IMAGE_SEO_ENGINE).
- 실행 엔진: 인앱 sharp 합성(단순·단색 배경) / 복잡 무드 = Firefly 브라우저 반자동(#52) 결과 회수 → POST /api/products/[id]/apply-composite(C-2 apply-cutout 형제·추가이미지 슬롯 적용, 가역).
- 가드: harmonize 후 seo-guard 재검·추가이미지는 텍스트 허용(대표만 텍스트0).

## C-8 · 추가이미지 멀티슬롯 매니저  [Code, C-3 스키마 후]
- Product.extra_images jsonb(C-3) 위 슬롯 UI: 대표(1) + 추가(2~9) 순서·교체·삭제·재정렬.
- 각 슬롯 소스 라벨(라이프스타일/누끼흰배경/합성무드/디테일/박스) + seo-guard 칩.
- register/PUT payload가 네이버 대표+추가이미지로 매핑(GO 전 DB만). 비율 §9(1:1/4:5). 전상품 범용.

## 통합 적응형 흐름 (상황별 융통 + 개입점 자연)
[엔진 한 줄] 인제스트 → 품질평가 → 2갈래(A 그대로 / B 생성) → 대표 마무리(크롭·누끼·합성 적응 라우팅) → seo-guard → 개입대기열(필요 시만 자연 등장) → 적용(가역) → 발행 GO.
- 적응 라우팅: bg-difficulty + 품질점수가 SIMPLE(인앱 즉시)·ENHANCE·COMPLEX(Firefly 개입) 자동 선택.
- 개입점: seo-guard fail·COMPLEX·발행 GO만 개입대기열에 자연 등장(강제 순서 0).
- 편집·생성 환경: 인앱 sharp(크롭·흰배경·단순합성) + Firefly/Express/Photoshop 브라우저 반자동(누끼·무드합성·생성) — 도구 락인 0, 컨텍스트로 최적 라우팅.

## 붙여넣기 — C-7 (새 Code 채팅)
```
[꽃틔움 가든 / Code / Target Session: C-7 합성 파이프라인 / Branch: feat/composite-pipeline]
권한: docs/plan/CUTOUT_CROP_FEATURE_BUILD_PLAN.md (C-7) + HANDOFF_myeonghwa_composite_recipe_2026-06-09.md + ADAPTIVE_IMAGE_SEO_ENGINE.md tone&manner.
작업: POST /api/products/[id]/apply-composite (누끼+무드배경 합성·harmonize·naver_normalize→extra_images 슬롯 적용, 가역) + asset-edit-job composite/harmonize job타입 연결. 인앱 sharp 단순합성 + Firefly 회수 경로.
규칙: 이모지0·영어주석·tsc·비가역0. 완료 시 커밋·push·체크·SHA 보고.
```

## 붙여넣기 — C-8 (새 Code 채팅, C-3 후)
```
[꽃틔움 가든 / Code / Target Session: C-8 추가이미지 멀티슬롯 / Branch: feat/extra-images-slots]
권한: CUTOUT_CROP_FEATURE_BUILD_PLAN.md (C-8) + REPRESENTATIVE_IMAGE_FINISHING_SYSTEM §7-1·§9.
작업: 대표(1)+추가(2~9) 슬롯 UI(순서·교체·삭제·재정렬·소스라벨·seo-guard 칩), register/PUT payload 네이버 대표+추가이미지 매핑(GO 전 DB만).
규칙: 이모지0·Lucide·영어주석·tsc·비가역0. 완료 시 커밋·push·체크·SHA 보고.
```
