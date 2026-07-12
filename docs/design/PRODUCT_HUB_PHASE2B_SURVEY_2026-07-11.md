# 상품 허브 Phase 2b — 변이 액션 사전조사 + 좀비 스코어 단일화 (2026-07-11)

Authoring: DESKTOP(코드 전수 조사). 계기: Phase 2b(변이 액션 바) 안전 착수 전 기존 자산 조사·중복 방지. 원칙 #46/#55/#62. 상태: 조사 완료·Code Phase 2b 착수 근거.

## 0. Phase 2b 액션별 기존 자산 (전수 조사)
| 액션 | 기존 | 재사용/신설 |
|---|---|---|
| 상태 변경(판매중↔중지 등) | 허브 `onBulkStatusChange`(변이 존재) | **재사용** |
| 부활소 이동 | `product-lifecycle/route.ts`=GET 읽기전용(좀비 분석)·변이 없음 | 상태/태그 세팅 **신설**(경량) |
| 마진 재산정 | `naver-margin-advisor.ts`·`naver-fee-rates-2026.ts` 계산 lib | 변이 불필요·**재계산 표시**(읽기) |
| 재고 조정 | `crawler/stock-check`(POST=공급사 크롤·수동조정 아님)·inventory-badges(GET) | 수동조정 변이 **없음** → `products/[id]` update 재사용 검토 후 최소 신설 |
| 리셋 | 명확한 라우트 없음 | **정의 필요**: "앱 튜닝 내용을 연동 원본 상태로 되돌림"인지 운영자 확인 후 구현 |

## 1. ★systemic 발견 — 좀비/부활 판정 로직 이중화 (#62)
- **A. `product-lifecycle/route.ts`**: `calcZombieRisk(ageDays, totalSales, daysSinceLastSale, salesVelocity)` — 판매/기간 기반 zombieRisk 0~100 + stage(NEW/GROWING/PEAK/DECLINING/ZOMBIE). 대시보드 stats에서 사용.
- **B. `revival-score.ts`(신규·#244)**: `computeRevivalScore` — SUSPENSION/OUTOFSTOCK/약한SEO/이미지부족 기반 score+grade(S~C).
- 문제: **두 로직이 "부활 대상"을 다르게 판정** → 대시보드(A)와 허브 부활필터(B)가 불일치 가능. 운영자 혼란·#62 위반.
- **조치(권장)**: 단일 판정 소스로 통합. B(revival-score)를 부활 "필요도" 표준으로, A의 판매속도/기간 신호를 B에 흡수(가용 시)하거나, A는 "라이프사이클 단계 분석"·B는 "부활 필요도"로 역할 명확 분리+상호 참조. 최소한 두 곳이 같은 임계/등급을 쓰도록 상수 공유.

## 2. Phase 2b 안전 구현 순서 (Code)
1. **먼저 단일화(#62)**: revival-score ↔ product-lifecycle 판정 정합(공유 상수 or 통합 함수). 부활 등급이 전 화면 동일하게.
2. **변이 액션은 confirm 게이트(#46)**: 리셋·재고조정·부활소 이동·상태변경 — 각 `window.confirm`/모달 후 실행·낙관적 업데이트+실패 롤백.
3. **재사용 우선**: 상태변경=onBulkStatusChange·마진=계산 lib(읽기)·재고=products update. 신설 최소화.
4. **리셋 정의는 운영자 확인 후**(비가역 가능성).
5. 단계별 tsc0/build0→배포→Desktop 검증(각 액션 실동작·롤백·회귀0).

## 작업 유의사항/원칙 (신규)
- **#247** 새 기능(부활 스코어 등) 추가 시 **기존에 같은 개념의 로직이 있는지 먼저 전수 조사**(#62) — 중복 판정 로직은 화면 간 불일치를 낳음. 발견 시 단일 소스로 통합하거나 역할을 명확 분리+상수 공유. 변이 액션(리셋·재고·상태·부활소 이동)은 반드시 confirm 게이트(#46)+낙관적 업데이트+실패 롤백. 기존 mutation 라우트 재사용 우선·신설 최소화. "리셋"처럼 의미가 모호하고 비가역일 수 있는 액션은 구현 전 운영자에게 정의 확인.
