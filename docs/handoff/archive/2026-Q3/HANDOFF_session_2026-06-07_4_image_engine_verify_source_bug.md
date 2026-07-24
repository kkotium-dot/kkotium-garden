# HANDOFF — 작업3·4·5 검증 + 소스 버그 (2026-06-07 #4)

> Desktop 교차검증(#45). Code 작업3·4·5(이미지 전략 엔진, c14c474).

## 검증 결과
| 항목 | 판정 |
|---|---|
| 작업3 T0 tier 산출/surfacing | ⚠️ 소스 버그 — 메커니즘 작동(matrix tier 노출, quality_reasons.imageTier 영속)하나 틀린 이미지 평가 |
| 작업4 crop→대표 가드 | ✅ confirm:true → applied:false + blockReason LOW_RESOLUTION(860px). 저해상 대표 진입 차단 정확 |
| 작업5 detail-strategy | ✅ /detail-strategy 200. 아이스트레이 BUILD·C/52·missing[재질]·gaps(fill_attributes/fill_seo/fill_notice/build_detail) nextAction 정합 |

## ★ 핵심 버그 — assess-quality 대표 소스 오류 (#46)
- assess-quality `sources.representative.url` = **main_image_url(레거시 thumb-clean 합성본)**.
- 그러나 발행 빌더 representativeImage = **mainImage(Cloudinary main-hwabo-4set)** (update dryRun 확인).
- 메모리: main_image_url=레거시/미사용, mainImage=실 대표(Cloudinary).
- → tier가 틀린 이미지로 산출됨(명화 T3는 신뢰 불가). 다른 상품의 이미지 전략 판단에도 영향.
- 명화 영향: image=done·overall=ok·발행준비 A/84 → T3는 정보용 라벨, 발행 미차단(4종합성 네이버 검증 통과).

## Code 수정 (우선)
- assess-quality 대표 평가 소스를 main_image_url → **mainImage**(빌더 representativeImage 필드)로 교정.
  detail 소스도 빌더 detailImage 필드와 정합 확인. 재실행 시 명화 tier 재산출.

## 명화 발행 잔여
- 정보고시 HB 표시 검증(Code: update dryRun preview에 productInfoProvidedNotice 노출) → 대표 GO → PUT(비가역).
- 대표이미지: 4종합성 그대로(A/84 통과) 수용 또는 풀해상 화보 단품.

## 전체 체계 상태
- 관제탑 3상품 정확 surfacing(명화 ok/달항아리 publish/아이스트레이 재질).
- 이미지 전략 엔진 T0~T3 + crop 가드 + detail-strategy 배포. 소스 버그만 잔여.
- 작업4 가드 실증: 437/860px 저해상 크롭 대표 진입 차단 확인.

## 원칙
- 비가역0(#46)/실측(#45)/환경분담(#41). assess 대표 소스=빌더 representativeImage와 일치해야 tier 신뢰.
