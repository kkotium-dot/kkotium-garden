# 대표이미지 마무리 시스템 — 누끼 + 크롭 통합 (Representative Image Finishing)

작성 2026-06-09 · 데스크톱(설계) · 권한문서. 본 문서는 `THUMBNAIL_CROP_EDIT_STANDARD.md`(§3/§5/§6) + `IMAGE_DETAIL_TWO_BRANCH_SYSTEM.md` + `OPERATOR_SYSTEM_BLUEPRINT.md`를 확장한다. 구현 담당 = Claude Code. 빌드 순서 = `docs/plan/CUTOUT_CROP_FEATURE_BUILD_PLAN.md`.

---

## 0. 한 줄 요약
크롭은 이미 앱 기능(`thumb-crop`)으로 완성돼 있고, **누끼(배경 제거 → 흰배경 본품)는 실행·적용 executor가 없다.** 누끼를 크롭과 동급의 시스템 기능으로 끌어올리고, 둘 다 **seo-guard 신호 → 개입대기열 → 적응형 라우팅**으로 자연스럽게 호출되게 한다. 전상품 범용(#55), 비가역 0(#46, 네이버 미접촉·DB 가역).

---

## 1. 현재 상태 (코드 실측 2026-06-09)

| 기능 | 라우트 | 상태 | 비고 |
|---|---|---|---|
| 크롭 region_crop | `POST /api/products/[id]/thumb-crop` | 완성 | sharp saliency/operator box, OCR 가드, 전체피사체 포함(contain/enforceSubject), dry-run preview→`confirm:true` 적용(mainImage+main_image_url, 가역) |
| 자산편집 job seed | `POST /api/products/[id]/asset-edit-job` | 부분 | region_crop=sharp 즉시 / text_remove·canvas_expand·**bg_clean**=firefly\|adobe_express, status `awaiting_human`만 seed |
| 라우팅 규칙 | `src/lib/jobs/job-type-routing.ts` | 완성 | 4 job type → tool/lane/requiresOperator |
| SEO 가드 | `GET /api/products/[id]/seo-guard` | 완성 | `main_image_white_bg` fail 감지(픽셀), 프리셋 독립 |

**갭(이번 작업 대상):**
1. `bg_clean`(누끼)에 **실행·적용 executor 없음** — 어도비 결과를 업로드·대표 적용하는 앱 경로가 없다.
2. **인앱 SIMPLE 누끼 없음** — 이미 밝은/흰 배경인 공급사 본품컷은 sharp 평탄화로 즉시 무료 처리 가능한데 미구현.
3. **seo-guard fail → 개입대기열 액션 미연결** — 감지는 되나 셀러 행동으로 이어지지 않음.
4. **대표=흰배경 강제 시 라이프스타일컷 버려짐** — 추가이미지로 재활용하는 슬롯 관리 부재.

---

## 2. 설계 원칙
- **감지는 가드, 결정은 셀러.** seo-guard `main_image_white_bg` fail은 차단이 아니라 권고. 셀러가 (a) 흰배경 교체 or (b) 라이프스타일 유지(사유 기록) 선택. (명화=가죽 유지 결정이 이 모델의 1호 사례.)
- **크롭과 누끼는 한 표면.** 둘 다 "대표이미지 마무리" 한 화면에서 dry-run 미리보기 → 적용. 같은 가드(텍스트 OCR·1:1·해상도) 공유.
- **적응형 자동/수동 라우팅.** 배경 난이도로 자동 분기 — SIMPLE(인앱 sharp, 즉시) / COMPLEX(어도비 개입, awaiting_human).
- **전상품 범용.** 제품·카테고리 불문 동일 경로. 명화는 검증 사례일 뿐.
- **비가역 0.** 모든 적용은 DB 필드 교체(이전 자산 스토리지 보존 → 롤백 가능). 네이버 PUT은 별도 GO.

---

## 3. 아키텍처 — 적응형 라우터

```
대표이미지 마무리 요청 (스튜디오 or 개입대기열 or 상품목록 배치)
        │
        ▼
[배경 난이도 판정]  src/lib/images/bg-difficulty.ts (신규)
  sharp 통계: 가장자리 픽셀 흰/중립 비율, 배경 색 분산
        │
   ┌────┴─────────────┐
   ▼                  ▼
SIMPLE (밝은/단색 배경)   COMPLEX (가죽·실사·복잡 배경)
   │                  │
   ▼                  ▼
인앱 sharp 누끼·평탄화      bg_clean 개입(어도비)  ← 기존 asset-edit-job 재사용
(white-flatten)          status awaiting_human + sourceUrl 제공
  POST .../white-bg       셀러가 어도비 MCP/Express 실행 → 누끼 PNG 확보
   │                       │
   └────────┬──────────────┘
            ▼
     [공통 마무리]  1:1 정규화 1000px · 흰배경 합성 · 텍스트 OCR 가드 · 흰배경 픽셀 재검
            ▼
     dry-run preview(base64) → confirm:true 적용
            ▼
     mainImage/main_image_url 교체(가역) + 이전 대표 → 추가이미지 슬롯 이동(옵션)
```

### 3.1 신규/변경 라우트
| 라우트 | 메서드 | 역할 | 런타임 |
|---|---|---|---|
| `/api/products/[id]/white-bg` (신규) | POST | 인앱 SIMPLE 누끼+흰배경 평탄화. dry-run→`confirm`. 같은 가드·적용부(thumb-crop과 형제) | nodejs(sharp) |
| `/api/products/[id]/apply-cutout` (신규) | POST | COMPLEX: 어도비가 만든 누끼 PNG(URL/업로드)를 받아 흰배경 합성·1:1·가드·적용. bg_clean job을 done 처리 | nodejs(sharp) |
| `/api/products/[id]/thumb-crop` (기존) | POST | 변경 없음(크롭). 마무리 화면이 호출 | nodejs |
| `/api/products/[id]/finish-image` (신규, 라우터) | POST | 위 3개를 묶는 단일 진입점 — 난이도 판정 후 자동 분기, UI는 이거 하나만 호출 | nodejs |

### 3.2 신규 라이브러리
- `src/lib/images/bg-difficulty.ts` — SIMPLE/COMPLEX 판정(0~100 score + 사유). 임계값 문서화.
- `src/lib/images/white-bg.ts` — sharp 기반 누끼·흰배경 합성·1:1 정규화. simple-crop의 가드(OCR·해상도)를 재사용/공유.

### 3.3 데이터 모델 (가역)
- 기존 `Product.mainImage` / `main_image_url` 교체 = 적용.
- 추가이미지 재활용: `Product`에 `extra_images jsonb`(신규, 기본 `[]`) — 라이프스타일컷 등 서브컷 URL 배열. register/PUT payload가 네이버 추가이미지로 매핑(별도 GO 전까지 DB만).
- 적용 이력: `asset_jobs`에 finishing job 1행(jobType `region_crop`|`bg_clean`, input_refs에 before/after URL) — 롤백·감사.

---

## 4. seo-guard 연동 (개입대기열 자연 호출)
- `seo-guard`의 `main_image_white_bg` = `fail` → 개입대기열(Operator Action Queue)에 항목 자동 생성: **"대표이미지 흰배경 다듬기"** + deep link(스튜디오 마무리 탭, 해당 상품 prefill).
- 셀러 선택 2지선다:
  1. **흰배경으로 교체** → `finish-image` 호출(자동 SIMPLE/COMPLEX).
  2. **이대로 유지** → `main_image_policy` = `lifestyle_intended` + 사유. 가드는 이후 이 상품에서 white_bg를 `info`로 강등(재알림 억제). (명화 가죽 = 이 경로.)
- 전상품 범용: 컨트롤타워/상품목록에서 white_bg fail 뱃지 + 일괄 진입.

---

## 5. UI 표면 (1인 셀러 효율 — UX/전환)
온실 아틀리에(스튜디오) 우측 패널에 **"대표이미지 마무리"** 카드 1개로 통합(크롭·누끼 분리 X):
- 상단: 현재 대표 미리보기 + seo-guard 칩(흰배경/텍스트/해상도/카테고리).
- 액션 행: `자동 다듬기`(finish-image) · `직접 크롭`(box 지정) · `추가이미지로 보관`.
- dry-run 미리보기(before→after 슬라이더) → `적용`(확정 1클릭, 비가역 아님). 적용 후 즉시 seo-guard 재호출로 칩 갱신.
- COMPLEX 분기 시: "어도비에서 누끼 만들기" 안내 + sourceUrl 복사 + 결과 붙여넣기/업로드 → apply-cutout. (반자동 패턴 #52: 셀러는 로그인·다운로드만, 나머지는 앱.)

원칙: **반복 수작업 제거** — 셀러가 포토샵을 직접 열 일을 앱 한 화면으로 흡수. 자동 가능분(SIMPLE)은 클릭 1회, 수동 필요분(COMPLEX)만 개입.

---

## 6. 가드 (전부 thumb-crop과 공유)
1. **텍스트 OCR**(TEXT_DETECTED, severity block) — Naver 2024-10-28 대표 텍스트 금지. 적용 차단.
2. **흰배경 픽셀 재검** — 적용 후 결과가 실제 흰/중립인지 재확인(자기검증).
3. **1:1 1000px** 정규화 — 미만은 LOW_RESOLUTION 경고(비차단) + canvas_expand 권고.
4. **전체피사체 포함** — 본품 클리핑 시 SUBJECT_CLIPPED 경고(소품 예외 override 가능).

---

## 7. 개선안 (시니어 부가 — 매출/효율)
1. **추가이미지 슬롯 매니저**: 대표를 흰배경으로 바꿔도 라이프스타일컷을 버리지 않고 네이버 추가이미지(최대 9)로 자동 편성 → 규정 준수 + CTR 동시 확보. (명화: 대표=흰배경 가능 시에도 가죽컷은 추가이미지로 살림.)
2. **셀러 override 정책 기록**: 가드 무시 결정을 사유와 함께 남겨 재알림 억제 + 추후 일괄 재검 가능.
3. **배치 진입(전상품)**: 컨트롤타워에서 white_bg fail 상품 일괄 → 한 번에 다듬기 큐. 새싹→파워셀러 단계 상품 수 증가 대비 운영 효율.
4. **SIMPLE 인앱 무료화**: 공급사 클린컷 다수는 connector 없이 sharp로 즉시 → AI 크레딧·수작업 절감(ROI).

---

## 8. 비범위 (이번에 안 함)
- 네이버 PUT/발행(별도 GO, #46).
- 서버사이드 AI 누끼 상시 의존(앱이 어도비 API 키를 들고 자동 호출하는 구조) — 현 정책상 미채택. COMPLEX는 셀러 개입(어도비 MCP/Express) 유지.
- 명화 대표: 대표님 신규 지시(2026-06-09) → 첨부 레퍼런스 규격(§9)에 맞춘 흰배경 본품 대표로 개선. 기존 가죽 라이프스타일컷 = 추가이미지로 보관(§7-1 슬롯). 이전 "가죽 유지"에서 갱신됨.

---

## 9. 대표이미지 규격 표준 (전상품 · 첨부 레퍼런스 기준 2026-06-09)
대표님 제공 실상품 촬영(흰배경 본품컷)에서 도출한 **전상품 공통 대표이미지 규격**. C-1~C-5 구현은 이 규격을 목표로 한다. 앞으로 올리는 모든 상품에 적용.

| 항목 | 규격 |
|---|---|
| 캔버스 | 1:1 정사각 1000×1000px, sRGB, JPEG q85+ |
| 배경 | 순백(#FFFFFF) 또는 거의 흰 중립. 부드러운 자연 그림자만 허용(하드 섀도·외곽선·도형 금지) |
| 피사체 | 단일 본품, 중앙 정렬, 프레임의 70~85%(전체 포함 + 6~12% 여백). 잘림 0 |
| 텍스트 | 홍보문구·워터마크·로고 0 (Naver 2024-10-28) |
| 색 | 실물 충실, 과채도 금지 |
| 정체성 | 상품 식별 요소(명화 라벨 등)이 또렷이 보이게 |
| 검증 | seo-guard main_image_white_bg PASS + OCR 텍스트 0 + 1:1 1000 확인 |

**추가이미지(2~9번) = 무드의 자리.** 라이프스타일(가죽·인카컷)·연출·디테일·사용씬·구성(박스) — 대표는 본품흰배경, 감성은 추가이미지·상세에서.

**적용 경로:** 소스가 이미 흰/밝은 배경(SIMPLE) → `/white-bg` 인앱(C-1). 연출·복잡 배경(COMPLEX) → `apply-cutout` Adobe(C-2). 난이도 자동 판정·분기 = `finish-image`(C-3). bg-difficulty 임계 50.

**명화 적용 예(검증 사례):** 공급사 클린컷 소스 → 흰배경 1:1 대표 생성 → 가죽 인카컷·박스컷은 추가이미지로. (C-1 머지 후 적용, C-6.)
