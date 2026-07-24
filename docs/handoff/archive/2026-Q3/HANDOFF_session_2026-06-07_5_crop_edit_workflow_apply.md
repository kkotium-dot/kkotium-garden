# HANDOFF — 썸네일 크롭·편집 워크플로우 앱 적용 (2026-06-07 #5)

> Desktop → Code. 운영자 강한 지시 반영. 표준: docs/design/THUMBNAIL_CROP_EDIT_STANDARD.md (이번 작성)
> 핵심: 감지가 아니라 "올바른 컷 추출 + 편집"을 앱에서 실제 수행. 전상품 체계.

## 운영자 지시 요약 (반복·확정)
- 썸네일 = 상세페이지 속 잘 찍힌 제품컷을 1:1 규격으로 타이트 크롭. 배경·책글씨·잡요소 배제.
- 운영자가 크롭 영역 지정 → 그대로 크롭 + 편집 가능해야.
- 편집 = 글씨 제거(inpaint) · 캔버스 영역확장(outpaint) · 배경정리.
- 상세+썸네일 리디자인이 앱에 적용 + 창작 MCP(Firefly·Express·Canva·Figma·Claude Design) 상황별 융통 사용.
- 운영자 개입점 자연스럽게. 전상품 체계. 병행 누락 0.

## 작업 (우선순위)

### T1. 발행전 프리뷰에 크롭 스튜디오 (운영자 개입점)
- /products/[id]/preview 에 이미지 작업 패널 추가:
  1) 소스 이미지(상세페이지 분할 + 사이트 컷) 썸네일 그리드
  2) **영역 지정 크롭**: 운영자 박스 드래그 → 좌표(x,y,w,h) → crop job. 1:1 가이드 오버레이.
  3) 자동 크롭 후보 갤러리(좋은 컷 탐지) → 택1
  4) 편집 버튼: "글씨 제거" / "1:1 영역확장" / "배경정리" → 창작도구 job 생성
  5) 선택 컷 → mainImage/추가컷 적용(가역). 발행 버튼은 canPublish AND 이미지경고0.

### T2. 크롭 게이트 완화 (라인 A 흐름 복구)
- thumb-crop confirm: 라인A(상세 양질)에서 <1000px는 하드차단→경고. 업스케일/영역확장 안내. 적용 허용.

### T3. 창작도구 라우팅 배관 (생산 계층)
- asset_jobs job_type 확장: region_crop · text_remove(inpaint) · canvas_expand(outpaint) · bg_clean · generate_shot · build_detail.
- 각 job_type → 도구 라우팅(표준 §5): Firefly/Express(편집·생성) · Canva/Figma/Claude Design(상세 빌드).
- 운영자 영역 지정 좌표·편집 파라미터는 job params(jsonb)에 저장. (스키마 변경은 Code가 apply_migration; Desktop이 information_schema 검증)

### T4. 라인 자동 판정 → 모드 라우팅
- 분류기: 상세/사이트 품질 양호 → 라인A(crop/as-is) / 미달·고상품성 → 라인B(생성·빌드).
- 관제탑 nextAction에 라인별 액션 노출(크롭 택1 / 영역지정 / 생성 후보 택1 / 상세 빌드).

### T5. 전상품 적용 + 병행
- 명화(라인A 첫 케이스): 상세 크롭 대표 확정 → 발행. 달항아리·아이스트레이도 동일 파이프라인 통과.

## 검증
- tsc0/build/이모지0/한글코드0/비가역0. 창작 MCP 호출은 운영자 트리거(개입점). push→Desktop이 프리뷰·크롭·라우팅 3중 단정.

## 환경분담
- Code: UI·crop·라우팅·스키마(apply_migration)·빌드. Desktop: 표준 기록·MCP 실생산 검증·프리뷰 실측·발행 PUT.
