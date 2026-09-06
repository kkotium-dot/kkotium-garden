# DISCORD 알림 시스템 — 앱 확장 적용 현황 감사 (2026-09-06, Desktop)

> 요청: "디스코드 알림 기능과 내용이 앱에 어떻게 확장 적용되어 있는지 체크".
> 방법: 코드 전수 grep + 프로덕션 실측(단, 진단 GET이 실발송하는 설계라
> 의도치 않게 4채널 테스트발송 발생 — 아래 개선점1 참조).

## 아키텍처 (단일 권위, 잘 설계됨)
- `src/lib/discord.ts`: sendDiscord() 코어 + DISCORD_WEBHOOKS 레지스트리(5채널)
  + 공통헬퍼(getSeasonContext 계절, GRADE_EMOJI). 임베드 빌더는
  `src/lib/notifications/discord-builder.ts`로 분리(관심사 분리).
- 5채널(env 키는 STABLE, 채널 용도는 #250에서 재정의):
  | 채널 | 용도 | 웹훅상태(실측) |
  |---|---|---|
  | KKOTTI_RECOMMEND | 오늘추천 08:00 + 발행준비완료 | ✅ URL설정, 실크론 정상(아래) |
  | STOCK_ALERT | 품절/저재고(🔴10/🟠30/🟡100) | ✅ ok 204 |
  | PRICE_CHANGE | 공급가변동+마진경고 | ✅ ok 204 |
  | KKOTTI_SCORE | 리셋/부활후보/좀비 | ✅ ok 204 |
  | OPS_REPORT | 주간운영요약 월08:00 | ✅ ok 204 |

## 트리거 지점 전수 매핑 (채널별 발동처)
- **KKOTTI_RECOMMEND**(5): daily-recommendation, cron/daily(발행준비 L297),
  sourcing-recommender(L914, 소싱봇 소유), sourcing-daily 크론, test-daily.
- **STOCK_ALERT**(8): crawler/stock-check, dome-inventory-poller(L468/522),
  naver/orders/claim(주문시 재고), alerts/relist-reminder, cron/weekly.
- **PRICE_CHANGE**(6): products/[id](가격수정시 L146), crawler/stock-check,
  competition(경쟁사가격), dome-price-analyzer(L251, 🟠10%/🔴15%), cron/daily.
- **KKOTTI_SCORE**(9): products/score-check, products(등록시 L49), cron/daily
  (부활/좀비 L301/305/311), test-daily.
- **OPS_REPORT**(6): batch-register(일괄등록결과), weekly-report,
  cron/daily·weekly, backdrop-job-state.

→ 알림이 앱 전반(크론·상품 CRUD·크롤러·주문·경쟁분석)에 광범위 확장됨.
  단일 sendDiscord로 수렴(#62 단일권위 준수).

## 실측 발견

### KKOTTI_RECOMMEND "ok:false"는 오탐 — 채널은 정상
`/api/discord` 진단 GET이 KKOTTI_RECOMMEND만 다른 4채널과 달리
`/api/daily-recommendation`을 **HTTP self-fetch**로 호출→그 결과 data.sent를 봄.
그런데 daily-recommendation은 CRON_SECRET 인증 요구(route.ts L13-15) →
self-fetch에 인증헤더 없어 **401** → data.sent 못받아 ok:false 오탐.
로그 실측: `POST /api/daily-recommendation 401`.
**실제 크론(cron/daily L297)은 sendDiscord('KKOTTI_RECOMMEND') 직접 호출**
이라 정상. 또 cron/daily L323 주석: 오늘추천 발송은 sourcing bot(별도 크론
sourcing-daily)이 소유하도록 이관됨. → 채널 살아있음, 진단만 오탐.

## 🔴 개선점 2건

### 개선1(안전·중요) — 진단 GET이 실채널로 실발송
`/api/discord` GET/POST가 "테스트"인데 5개 실채널에 [테스트] 메시지를
실제 발송(status 204). 진단 목적 호출이 운영 채널을 오염시킴(Desktop이
이번에 의도치않게 4채널 발송함 — 정직보고). 개선: (a) 별도 테스트 전용
웹훅으로 라우팅, 또는 (b) ?dry=1 쿼리로 URL설정여부만 확인(발송 안 함),
또는 (c) 진단은 webhookUrls 존재여부만 반환하고 발송은 명시적 ?send=1일 때만.
"디스코드 실발송 주의"(작업룰)와 정면 충돌하는 현재 설계.

### 개선2(정합성) — 진단 GET의 KKOTTI_RECOMMEND self-fetch 401 오탐
다른 4채널처럼 직접 sendDiscord하거나, 소유가 sourcing-daily로 이관됐으니
진단에서 그 크론 상태/최근발송을 확인하는 방식으로. 현재는 항상 ok:false라
"채널 죽음" 오해 유발. (메모리: 소싱알림 self-fetch→직접호출 전환 기록 있음
— 이 진단 라우트만 잔재)

## Code 인계 (개선1 우선)
```
src/app/api/discord/route.ts GET/POST:
 - 현재: 호출 즉시 5채널 실발송(운영채널 오염 위험)
 - 개선: 기본은 dry-run(webhookUrls 설정여부+형식만 검사, 발송X).
   ?send=1 명시적일 때만 실발송, 그때도 [테스트] 프리픽스 확인.
 - KKOTTI_RECOMMEND: self-fetch(401 오탐) 제거. 직접 sendDiscord 테스트
   임베드 or 소유크론(sourcing-daily) 최근발송 로그 확인으로 대체.
 회귀: 실발송은 ?send=1일 때만. 기본 GET은 발송0 확인.
```

## 의존성
개선1·2 서로 독립(같은 파일이라 한 PR로 묶어도 무방). disposition 결함2와
무관. 카테고리 매처와도 무관.
