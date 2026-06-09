# 꽃틔움 가든 — 병행작업 트래커 (누락 0 원칙) · 최종 업데이트 2026-06-08 (rev4)

> 대표 상시 지시: 요청 개선사항·병행작업 항상 누락 없이 추적. 매 세션 갱신. Desktop 상시 유지. #54·#55·#56 준수.

## 상태 (실측 기준)
| # | 항목 | 상태 | 다음 |
|---|---|---|---|
| 1 | 명화 대표 v2 → curated | ✅ DONE·검증완 | — |
| 2 | 풀해상 상세 캡처(전상품) | ✅ DONE — 명화·달항아리(860x2294)·아이스트레이(860x2480) 전부 확보 | — |
| 3 | 인제스트 supplier_product_code 항상 캡처 | ✅ DONE(parse-dome-no 폴백) | — |
| 4 | 2갈래 실품질 라우팅(A/A_EXTRACT/MIXED/B) | ✅ DONE·검증완 | — |
| 5 | 명화 상세 Branch A(공급사 그대로 채택) | ✅ DONE·검증완(detail=curated) | — |
| 6 | **상세 생성 엔진 Track 2 (Branch B)** | ☐ Code 착수(경로 A) | **상품정체성 기준** 7섹션 생성. 레퍼런스=docs/design/aroma_L3_detail_reference.html + ADAPTIVE_IMAGE_SEO_ENGINE.md |
| 6b | **상세 1차 틀 (aroma L3 정식 레퍼런스)** | ✅ 개선완 (주석버그·모바일16px·리뷰슬롯·sticky CTA + §7.2 전프리셋 토큰) | 대표 컨펌 → S2/S4 빌드업(Firefly/Met CC0 → Canva/Figma 860px) |
| 6c | (폐기) 브랜드-프론트 시안들(TEST_branchB / 1차틀_productID) | 폐기 | aroma_L3_detail_reference가 정식 대체 |
| 6d | **적응형 이미지·SEO·ROI 카피 엔진 문서화** | ✅ DONE(docs/design/ADAPTIVE_IMAGE_SEO_ENGINE.md) | — |
| 6e | **프리셋 시스템 앱 구현 (Phase A/B)** | ☐ Code · **GO(commit A→B-3 순차)** | A:globals.css :root+[data-preset]5종(§7.2) · B-1:7섹션 React 렌더러(레퍼런스 1:1) · B-2:SEO 린터 · B-3:generate-detail 소비(기존 PNG additive 보존). 빌드플랜=docs/plan/ADAPTIVE_PRESET_ENGINE_BUILD_PLAN.md |
| 6f | **전상품 프리셋 배정 정합** | ✅ DONE·실측 | 명화=aroma/L3 · 달항아리=tradition/L3(기본값에서 교정) · 아이스트레이=kitchen/L1. item3 컬럼 존재 교차검증 완 |
| 7 | 아틀리에 2단계 — 우측 스크롤 교정 | ✅ DONE·검증완(max-h 1005·overscroll contain·클립0·바닥도달) | — |
| 8 | 아틀리에 2단계 — job 생명주기(취소/재시도/되돌아가) | ✅ DONE·검증완(reopen→cancel 루프 200) | — |
| 9 | 아틀리에 2단계 — P4 공유카드 배지·전 /studio 토큰정렬·헤더 applyStatus 미러 | ☐ 후속 | Code |
| 10 | 개입대기열 2차(deepLink 정합)·3차(외부인증 Chrome MCP 반자동 #52) | ☐ 후속 | Code |
| 11 | applyStatus 정확성 · nextAction↔큐 정합 | ✅ DONE·검증완 | — |
| 12 | 명화 발행(SUSPENSION→큐레이션 완료, 발행 GO) | ⏸ GO 대기(비가역 #46) | 대표 "GO" 시 PUT |
| 13 | Branch A SEO/ROI 보강 자동화 | ☐ 후속 | Code(공급사 상세 + 미달요소 보강) |

## 앱 적용 현황 (명화 · 실측, d08341e LIVE)
- 대표 = curated(v2 동일) ✅ / 상세 = curated(Branch A 공급사 그대로) ✅ / 2갈래 = A / 발행 = SUSPENSION(drift 정확)
- 전상품 시스템 + 아틀리에 2단계(스크롤·임시저장·job 생명주기) = LIVE
- 상세 "앱 생성본" 테스트 = 경로 B 제작완(컨펌 대기) / 경로 A(엔진) Code 착수

## 운영 메모
- 비가역(네이버 PUT) = 대표 "GO" 전 절대 미실행(#46). 현재까지 전부 가역.
- DB 백필/캡처/적용/생명주기 전이 = 가역 → Desktop 직접 실행(#41).
