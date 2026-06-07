# DECISION — 명화 대표/상세 확정 + 이미지 편집 도구 체계 (2026-06-07)

> 운영자 확정 사항. 표준: docs/design/THUMBNAIL_CROP_EDIT_STANDARD.md

## 1. 명화 디퓨저 이미지 결정 (운영자 승인)
- **대표 이미지 = 가죽 도어 단품 장착컷(기준컷 #3)** 확정. (프리미엄 단품·글씨 없음·정책 안전)
- 추가컷: 흰 접시 단품(#4), 대시보드 2병(#1), 기프트박스(#5).
- **상세페이지 = 라인 A (양질 상세 그대로 활용 + SEO 문구 보강)**. 현재 hosted 상세(detail-S6)는 빈 스켈레톤이라 교체 대상 — 공급사 양질 상세로 대체.

## 2. 적용 단계 (production 도구 활성 세션에서 즉시 실행 — 전부 staged)
- 대표: #3 컷 1:1 영역확장(아웃페인트로 규격 맞춤) → 업로드 → mainImage 적용(가역).
- 상세: 공급사 양질 상세 hosting → detail_image_url 교체(가역).
- 발행전 프리뷰 재검수(canPublish) → 운영자 발행 GO → PUT(비가역).

## 3. 이미지 편집 도구 체계 — 데이터 레벨 현황 (실측)
asset_jobs 기존 보유(추가 작업 불필요):
- tool: firefly / adobe_express / figma / canva / claude_design / sharp / naver_api  (도구 라우팅 완비)
- lane: generate / process / compose / review / publish
- input_refs / output_refs (jsonb): 운영자 지정 크롭 좌표·편집 파라미터 저장 가능

→ 편집은 Firefly 단독이 아니라 상황별 도구 선택. 운영자 요청 시 해당 커넥터 호출.

## 4. Code 추가 필요 (job_type CHECK 확장 — 현재 21종, 편집 4종 누락)
기존: firefly_generate, remove_bg, color_correct, resize, vectorize, figma_compose, sharp_composite, mockup, naver_image_upload, naver_publish, product_cutout, mood_bg_generate, product_composite, harmonize, express_finalize, naver_normalize, quality_assess, thumb_crop, seo_text, seo_image, bg_swap
**추가**: region_crop, text_remove(inpaint), canvas_expand(outpaint), bg_clean
(스키마 변경은 Code apply_migration; Desktop이 information_schema 검증 — #41)

## 5. 도구 라우팅 매핑 (job_type → tool)
- region_crop → sharp (또는 운영자 지정 좌표)
- text_remove → firefly / adobe_express (생성형 채우기)
- canvas_expand → firefly / adobe_express (생성형 확장)
- bg_clean → firefly / adobe_express (배경제거)
- build_detail → canva / figma / claude_design
- generate_shot / mood_bg → firefly

## 6. 전상품 적용 + 병행
- 명화 = 라인A 첫 케이스. 달항아리·아이스트레이도 동일 파이프라인.
- 병행: Code(크롭 스튜디오 UI + job_type 확장) || Desktop(표준·결정 기록 + production 실행 검증).
