# HANDOFF — 모바일 폴리시(2-MOBILE-3) + P1~P3 설계 (2026-06-02 Desktop)

## 1. 2-MOBILE-3 — 모바일 컨트롤 오버플로 4건
| ID | 위치 | 원인 | 수정 |
|---|---|---|---|
| M1 | 글로벌 앱 헤더 | 꽃티움 버튼 가로 잘림 | 모바일 라벨 hidden + gap 축소 |
| M2 | products Toolbar 탭 행 | 6탭 flex 가로 고정 | overflow-x-auto w-full lg:w-auto |
| M3 | products Toolbar 컨테이너 | flex-wrap 들쭉날쭉 | 모바일 flex-col + 검색 full-width |
| M4 | BulkFloatMenu | minWidth 520 하드코딩 | lg:min-w-[520px] + maxWidth calc(100vw-24px) + 버튼행 scroll |

## 2. P1 — 골든윈도우 가드 (발행 후 자동 셀프-체크)
- 신규: PublishHealthReport.tsx. 발행 직후 자동 노출.
- 3축: 노출성(이미지/SEO/카테고리) + 가격경쟁력(시장가) + 키워드 충전율(검색량).
- 데이터원: /api/products/[id]/publish-readiness + keyword-stats 재사용 (신규 API 0).
- 행동유도: "D+1까지 키워드 1개 교체" 식 구체 액션.

## 3. P2 — 발행 관제탑 (대시보드 신호등)
- 신규: PublishReadyTrafficLight.tsx. 대시보드 Section 1 상단.
- 신호: 초록(4축 통과)/노랑(1~2 미흡)/빨강(3+ 미흡) 상품별 칩.
- 4축: 상품필드(19)+진위성+정보제공고시+이미지 (publish-readiness 게이트 재사용).
- 원클릭: 초록 칩 → /products?registerId=ID (page.tsx E-14 deep-link 이미 존재) → 발행모달 자동.

## 4. P3 — 단일 진실 SEO 필드 수술 (DEBT-01)
- title 4중컬럼(name/naver_title/seo_title/seoTitle) → 재실행 시 키워드 증식 시한폭탄.
- 순서: grep 전수추적(5사용처) → 단일 SoT 확정 → 나머지 read-only alias → 데이터 migration.
- ★선결조건: 달항아리·아이스트레이 발행 후 진행 (발행 전 스키마 변경 금지).

## 5. 실행 우선순위
P0 달항아리 발행 → P1 골든윈도우 가드 → (M 모바일, 병행) → P2 관제탑 → P3 SEO수술(발행 후).
