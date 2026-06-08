# 꽃틔움 가든 — 병행작업 트래커 (누락 0 원칙) · 최종 업데이트 2026-06-08 (rev2)

> 대표 상시 지시: "요청한 개선사항·병행작업은 항상 누락 없이 명심하고 진행." 본 문서 = 모든 열린 작업의 단일 추적부. 매 세션 갱신. Desktop 상시 유지. #54·#55·#56 준수.

## 상태 (실측 기준)
| # | 항목 | 상태 | 다음 행동 |
|---|---|---|---|
| 1 | 명화 대표 v2 → curated | ✅ DONE·검증완(앱 라이브, v2 동일) | — |
| 2 | 풀해상 상세 캡처(전상품) | 명화 ✅ · 달항아리 ✅(860x2294) · 아이스트레이 ❌ | 아이스트레이 도매번호 operator 제공 → 캡처 |
| 3 | 인제스트 supplier_product_code 항상 캡처 | ✅ DONE(parse-dome-no 폴백) | — |
| 4 | 2갈래 실품질 라우팅(A/A_EXTRACT/MIXED/B) | ✅ DONE·검증완(명화=A·달항아리=B) | — |
| 5 | 명화 상세 = Branch A(공급사 상세 그대로 채택) | ✅ DONE·검증완(detail=curated) | — |
| 6 | 상세 빌더 Track 2(27렌더러 실콘텐츠)=Branch B 전용 | ⏸ 별도 turn(명화 불필요) | 일정 시 |
| 7 | **아틀리에 2단계 — 우측 스크롤 아키텍처 교정** | ☐ Code(라이브 진단완) | sticky+max-h 함정 제거: 우측 패널 독립 스크롤(height=calc(100vh-offset)·overflow-auto·부모 클립 0) → 바닥까지 도달. 전상품 |
| 8 | **아틀리에 2단계 — job 생명주기 컨트롤** | ☐ Code(라이브 진단완) | 진행중 작업 취소/중단·임시저장(draft 영속)·단계 수정·재시도 추가. 전상품 |
| 9 | 아틀리에 2단계 — P4 공유카드 배지·전 /studio 토큰정렬·헤더 applyStatus 미러 | ☐ 후속 | Code |
| 10 | 개입대기열 2차(deepLink 정합)·3차(외부인증 Chrome MCP 반자동 #52) | ☐ 후속 | Code |
| 11 | applyStatus 정확성 · nextAction↔큐 정합 | ✅ DONE·검증완 | — |
| 12 | 명화 발행(SUSPENSION→큐레이션 완료, 발행 GO) | ⏸ GO 대기(비가역 #46) | 대표 "GO" 시 PUT |

## 앱 적용 현황 (명화 · 실측, f3c3784 LIVE)
- 대표 = **curated**(v2 동일) ✅ / 상세 = **curated**(Branch A, 공급사 1000x18291 그대로) ✅ / sourceStrategy = **A** / 발행 = **SUSPENSION**(drift 정확) / 속성·SEO = LIVE/DB
- 전상품 시스템(크롭스튜디오·라인·아틀리에·applyStatus·개입대기열·2갈래라우팅·풀해상캡처·인제스트 코드폴백) = LIVE

## 라이브 진단 메모 (아틀리에 2단계 근거)
- 우측 `aside.sticky top-4 / max-h 915px(calc 100vh-X) / overflow auto`: 펼침 시 바닥이 뷰포트 +85px → sticky 함정으로 미도달.
- 컨트롤 실측: 취소 0 · 임시저장/수정/되돌리기 0 · job 재시도 0 · draft 영속 0.

## 운영 메모
- 비가역(네이버 PUT) = 대표 "GO" 전 절대 미실행(#46). 현재까지 전부 가역.
- DB 백필/캡처/적용 = 가역 → Desktop 직접 실행(#41).
