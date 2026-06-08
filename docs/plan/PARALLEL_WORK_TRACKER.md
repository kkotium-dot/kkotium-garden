# 꽃틔움 가든 — 병행작업 트래커 (누락 0 원칙) · 최종 업데이트 2026-06-08

> 대표 상시 지시: "요청한 개선사항·병행작업은 항상 누락 없이 명심하고 진행."
> 본 문서 = 모든 열린 작업의 단일 추적부. 매 세션 갱신(추가/완료/이관). Desktop이 상시 유지. 적용현황(#54)·전상품 범용(#55)·시스템 설계(#56) 준수.

## 진행/완료 상태 (실측 기준)
| # | 항목 | 상태 | 다음 행동 |
|---|---|---|---|
| 1 | 명화 대표 v2 → curated | ✅ DONE·검증완(앱 라이브, v2와 동일) | — |
| 2 | 풀해상 상세 캡처(전상품) | 명화 ✅(1000x18291) · 달항아리 ✅(860x2294, 코드 백필 후) · 아이스트레이 ❌ | 아이스트레이 도매 번호 operator 제공 → 캡처 |
| 3 | 인제스트가 supplier_product_code 항상 캡처 | ☐ Code(재발방지) | 도매 url 번호 파싱 저장 |
| 4 | 2갈래 라우팅 full(상세/썸네일 품질 분리평가→A/B/혼합) | 부분(sourceStrategy 가용성만 노출) | Code 실품질 평가 |
| 5 | 명화 상세 = Branch A(공급사 source_detail 그대로 + SEO/ROI 보강) | ☐ 결정·구현 | Code DetailPageCard 경로 + 보강 |
| 6 | 상세 빌더 Track 2(27렌더러 실콘텐츠) = Branch B 전용 | ⏸ 별도 turn(명화 불필요) | 일정 시 전용 turn |
| 7 | 아틀리에 2단계(P4 공유카드 배지·전 /studio 토큰정렬·헤더 applyStatus 미러) | ☐ 후속 | Code |
| 8 | 개입대기열 2차(deepLink 화면정합)·3차(외부인증 Chrome MCP 반자동 #52) | ☐ 후속 | Code |
| 9 | applyStatus 정확성(publishState=네이버 statusType·image curated/default/none) | ✅ DONE·검증완 | — |
| 10 | nextAction ↔ 개입대기열 정합 | ✅ DONE·검증완 | — |
| 11 | 명화 발행(SUSPENSION→큐레이션 적용 후 발행 GO) | ⏸ GO 대기(비가역 #46) | 대표 "GO" 시 PUT |

## 앱 적용 현황 (명화 · 실측, 555466c LIVE)
- 대표 = **curated**(v2 동일) ✅ / 상세 = default(스켈레톤, Branch A 채택 예정) / 발행 = **SUSPENSION**(drift 정확) / 속성·SEO = LIVE/DB
- 크롭스튜디오·라인·아틀리에·applyStatus·개입대기열·sourceStrategy·풀해상캡처 = LIVE

## 운영 메모
- 비가역(네이버 PUT) = 대표 "GO" 전 절대 미실행(#46). 현재까지 전부 가역.
- DB 백필/캡처/적용 = 가역 → Desktop 직접 실행 가능(#41).
