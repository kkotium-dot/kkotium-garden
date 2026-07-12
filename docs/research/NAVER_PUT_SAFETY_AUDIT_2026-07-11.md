# 신규 라우트 네이버 PUT 안전 감사 (#196) — 클린 (2026-07-11)

Authoring: DESKTOP(코드 실측 감사). 계기: 이번 세션 신규 라우트(리셋·허브 변이) 파괴적 PUT 재도입 여부 점검(#196 위험군·브라우저 불필요 독립작업). 원칙 #46/#62/#196. 상태: 감사 완료·이상 없음.

## 0. 감사 결과 (클린)
| 검사 | 결과 |
|---|---|
| 리셋 라우트(`products/[id]/reset`) | getProduct(네이버 GET 재조회·읽기) + prisma.product.update(로컬 write)만 · **네이버 PUT 없음** |
| 리셋 원산지 보존 | PRESERVED_ON_RESET=['naver_origin','originCode'] — 정정 유실 방지(#248) |
| 허브 변이(상태변경·부활소 이동·품절) | handleProductMutate→로컬 PATCH만 · 네이버 write 아님 |
| 전역 스캔 | **어떤 route.ts에도 `method:'PUT'` 리터럴 없음** — 네이버 쓰기는 api-client GET-merge 헬퍼로 중앙화(#196 준수) |

## 1. 결론
- 이번 세션 신규 라우트 전부 "네이버 읽기 + 로컬 write" 또는 "로컬 PATCH"로, **네이버 리스팅을 파괴적으로 덮어쓰지 않음.**
- 유일한 네이버 write = 발행(publish)이며 GET-merge + 운영자 GO 게이트(#46)로 보호.
- 조치 불필요. systemic PUT 안전이 허브 대규모 증설 후에도 유지됨.

## 작업 유의사항/원칙 (재확인)
- **#196** 네이버로의 모든 쓰기는 GET-merge(전체 필드 병합) 헬퍼 경유·라우트에서 직접 부분 PUT 금지. 신규 변이 기능은 가능한 로컬 DB write로 처리하고, 네이버 반영은 발행 경로(GET-merge+GO 게이트)로 일원화. 대규모 기능 증설 후엔 파괴적 PUT 재도입 여부를 전역 스캔으로 재확인(#62).
