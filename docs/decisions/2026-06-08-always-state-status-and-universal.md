# DECISION — 적용 현황 상시 명시 + 전상품 범용 (2026-06-08)

> 운영 원칙 신설 (#54·#55). 비가역 0(기록). 트리거: 대표 상시 요구 — "적용사항 항상 명시" + "이 상품뿐 아니라 앞으로 모든 상품에 적용".
> 구현/등재 = Code(#41, PRINCIPLES_LEARNED.md). 본 문서 = Desktop 직접 기록(#49).

## 원칙 #54 — 적용 현황 항상 명시 (application status visibility)
- 모든 세션 보고에 "앱 적용 현황" 블록을 항상 포함. 상품별로 3구분 명시:
  - LIVE(production 실측) / DB-only(가역 반영) / 미적용(pending).
- 시스템화(채팅 의존 탈피): 관제탑/스튜디오에 상품별 "적용 현황 인디케이터"(속성·대표이미지·상세·발행 상태) 내장 → 앱에서 상시 가시.
- 근거: 무엇이 실제 라이브인지 추정 금지(#45 실측우선)·과잉/누락 작업 방지(ROI).

## 원칙 #55 — 전상품 범용 (product-agnostic)
- 다음은 전상품 공통이어야 함(명화 전용 일회성 금지):
  크롭 표준(주제 완전포함+프레이밍) · 아틀리에/스튜디오 UI · 발행 파이프라인 · 이미지 전략 · 라인 엔진 · 적용 현황 인디케이터.
- 명화 = 검증 케이스일 뿐, 특수 경로 아님. 신규 작업은 출시 전 범용화(상품 불문 동작) 선행.
- 이미 범용 확인: T5 파이프라인 수렴 · THUMBNAIL_CROP_EDIT_STANDARD · 2026-06-07 crop-full-subject-containment · KKOTIUM_DESIGN_SYSTEM · 라인 엔진(quality_reasons.line).

## Code 반영(별도 작업, 아틀리에 박스와 분리)
- PRINCIPLES_LEARNED.md에 #54·#55 등재(Python 덮어쓰기).
- 관제탑 asset-jobs-matrix row + 스튜디오 헤더에 상품별 적용 현황 인디케이터 추가:
  필드 4종 = attributesApplied / mainImageApplied / detailApplied / publishState.
  컬럼 부재 가드(#50), 전상품 동작, 텍스트 잘림 0.
