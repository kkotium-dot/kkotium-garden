# 작업 인계 — 트랙C-3: 주간 소싱 요약 (Claude Code 레인)

> **담당 레인**: Claude Code (파일·git·빌드)
> **작성**: Desktop, 2026-08-06
> **BASELINE**: main `164a222` (이 시점 기준 — 착수 전 `git pull` 후 최신 확인, #291)
> **의존성**: 없음 (독립 병렬 안전 — write set이 Desktop①·Cowork③과 겹치지 않음, #322)
> **착수 전 필독**: `docs/DOMAIN_FACTS.md`, `CLAUDE.md`, `docs/plan/PRINCIPLES_LEARNED.md` #295~#331, 이 문서

---

## 1. 목표

주간 운영 리포트(`cron/weekly`, 매주 월 08:00 KST Discord 발송)에 **"이번 주 소싱 발굴·낙점 현황" 섹션을 추가**한다.

현재 주간 리포트는 자사 상품 지표(상품 수·재고·꿀통점수·주문·공급가 변동)만 담는다. 트랙C-1/C-2로 소싱 발굴→낙점(관심/소싱중/제외) 파이프라인이 완성됐으니, **한 주 동안 얼마나 발굴했고 무엇을 낙점했는지**를 주간 리포트에 얹어 운영자가 소싱 활동을 주 단위로 회고할 수 있게 한다.

**왜 지금인가**: #331 후속으로 소싱 레코드를 7일 보관(SOURCING_RETENTION_DAYS=7)하도록 방금 고쳤다(커밋 164a222). 즉 "최근 7일 = 정확히 한 주"의 소싱 이력이 DB에 항상 남아 있어, 주간 요약의 데이터 소스로 딱 맞는다.

---

## 2. write set (수정 가능 파일 — 이 밖은 건드리지 말 것)

| 파일 | 수정 내용 |
|---|---|
| `src/app/api/cron/weekly/route.ts` | 소싱 주간 집계 조회 + embed 파라미터 전달 |
| `src/lib/notifications/discord-builder.ts` | `buildWeeklyReportEmbed`에 소싱 섹션 필드 추가 (정의 위치: 625행, `WeeklyReportEmbedParams` 타입도 여기) |

**수정 금지 파일(동시 작업 중)**:
- `src/app/api/sourcing-recommend/route.ts` — Desktop①이 방금 수정(누적정리). 읽지도 쓰지도 말 것.
- `src/lib/wholesale-matcher.ts` — Cowork③ 리서치 대상.
- `src/components/dashboard/SourcingRecommendWidget.tsx` — 트랙C-2 완료 파일.

**주의(#322/#97)**: 다른 레인이 동시 작업 중이다. 담당 write set 밖 파일은 되돌리거나 정리하지 말 것. 범위 밖 변경을 발견하면 수정하지 말고 요약만 남긴다.

---

## 3. 데이터 소스 (실재 확인됨)

**테이블**: `sourcingOpportunityRecord` (Prisma 모델명) / `sourcing_opportunity_records` (DB 테이블, snake_case 컬럼).

실재 컬럼(information_schema 확인, 2026-08-06):
`id`(uuid) · `date`(date) · `keyword` · `category` · `monthly_search_volume`(int) · `competition` · `blue_ocean_score`(int) · `rank`(int) · `supply_price_range`(jsonb) · `wholesale_matches`(jsonb) · `ai_insight`(text) · `reco_type` · `operator_status`(varchar, null|interested|sourcing_started|skipped) · `operator_status_at`(timestamp) · `created_at`(timestamp)

Prisma 접근 시 camelCase: `prisma.sourcingOpportunityRecord.findMany({ where: { date: { gte: weekAgo } } })`. `operatorStatus`, `monthlySearchVolume`, `blueOceanScore` 등.

**보관 기간**: 7일(SOURCING_RETENTION_DAYS, sourcing-recommend/route.ts). 즉 `date >= weekAgo` 조회 시 항상 최근 한 주가 온전히 있다.

---

## 4. 집계 설계 (권장)

`cron/weekly/route.ts`의 GET 안, 기존 `weekAgo` 계산 이후에 소싱 집계를 추가:

```ts
// 주간 소싱 발굴·낙점 현황 (트랙C-3)
// best-effort(#82): 실패해도 주간 리포트 전체를 막지 않는다.
let sourcingWeekly = { discovered: 0, interested: 0, sourcingStarted: 0, skipped: 0, topKeywords: [] as string[] };
try {
  const weekRecords = await prisma.sourcingOpportunityRecord.findMany({
    where: { date: { gte: weekAgo } },
    select: { keyword: true, operatorStatus: true, blueOceanScore: true, date: true },
  });
  // 발굴 총계는 "고유 키워드 수"로(같은 키워드가 여러 날 반복 발굴될 수 있음)
  const uniqueKw = new Set(weekRecords.map(r => r.keyword));
  sourcingWeekly.discovered = uniqueKw.size;
  sourcingWeekly.interested = weekRecords.filter(r => r.operatorStatus === 'interested').length;
  sourcingWeekly.sourcingStarted = weekRecords.filter(r => r.operatorStatus === 'sourcing_started').length;
  sourcingWeekly.skipped = weekRecords.filter(r => r.operatorStatus === 'skipped').length;
  // 블루오션 상위 3개 키워드(중복 제거, 점수 desc)
  sourcingWeekly.topKeywords = [...new Map(weekRecords.map(r => [r.keyword, r])).values()]
    .sort((a, b) => b.blueOceanScore - a.blueOceanScore)
    .slice(0, 3)
    .map(r => r.keyword);
} catch { /* sourcing table may be empty or missing — degrade silently */ }
```

그다음 `buildWeeklyReportEmbed({ ... , sourcingWeekly })`로 전달.

**설계 판단(운영자 확정 원칙 반영)**:
- 낙점 카운트는 "현재 상태 기준"이다(주간 스냅샷). operator_status는 최신 상태만 저장되므로 "이번 주에 낙점한 건수"가 아니라 "이번 주 발굴분 중 현재 낙점 상태인 건수"로 해석 — 이 의미를 embed 문구에 정확히 반영(허위 라벨 금지 #46). 예: "이번 주 발굴 N건 · 관심 M · 소싱중 K".
- 발굴 0건이면 소싱 섹션을 **아예 넣지 않는다**(빈 섹션 노이즈 방지, 트랙C-1 요약배지 규칙과 동일 사상). `discovered === 0`이면 스킵.

---

## 5. embed 섹션 설계 (discord-builder.ts)

`WeeklyReportEmbedParams`에 옵셔널 필드 추가(기존 파라미터 무변경, additive):
```ts
sourcingWeekly?: {
  discovered: number;
  interested: number;
  sourcingStarted: number;
  skipped: number;
  topKeywords: string[];
};
```

`buildWeeklyReportEmbed` 안에서 `params.sourcingWeekly && params.sourcingWeekly.discovered > 0`일 때만 fields에 소싱 섹션 추가. 정원 컨셉 유지(#259, 소싱봇의 🌱 톤과 정합):
- 필드명 예: `🌱 이번 주 소싱`
- 값 예: `발굴 {discovered}건 · ⭐관심 {interested} · 🔎소싱중 {sourcingStarted}\n블루오션 TOP: {topKeywords.join(', ')}`

**문구 규칙(#283/#317)**: 이건 셀러(운영자)가 보는 알림이므로 정원 컨셉·이모지 OK. 단 판단을 요구하는 수치는 정확히(허위 0 금지 #325). 개발자 은어·영어 필드명 노출 금지.

---

## 6. 검증 계획 (필수)

1. **tsc 0 · build 0** (커밋 전 필수, #32).
2. **로컬 실호출 검증**: cron/weekly는 크론이지만 GET route이므로 브라우저/curl로 직접 호출 가능. `CRON_SECRET` 없으면 `isAuthorized`가 true 반환(로컬)하므로 인증 없이 호출됨.
   - 단 **실제 Discord 발송이 일어난다**(`sendDiscord('OPS_REPORT', ...)`). ⚠️ **로컬에서 이 route를 그냥 호출하면 실제 주간 리포트가 Discord로 발송된다.** 운영자 승인 없이 실발송 금지(#절대금지).
   - **안전 검증법**: route 호출 대신, 추가한 소싱 집계 로직만 분리 테스트하거나, `sendDiscord` 직전까지의 embed 객체를 로그/응답으로 확인. 또는 임시로 소싱 집계 부분만 별도 스크립트로 실행해 카운트 정확성 확인 후 원복. **실 발송은 하지 말 것.**
   - 소싱 데이터가 있어야 검증되므로, 필요 시 Desktop에 "소싱 레코드 테스트 주입" 요청(Desktop이 Supabase MCP로 주입/원복 담당). Code는 DB 직접 주입 권한이 없으니 무리하게 시도하지 말 것.
3. **응답 JSON 확인**: route가 반환하는 `stats`에 소싱 집계를 포함시켜(예: `stats.sourcing`), 발송 없이도 카운트를 눈으로 검증할 수 있게 한다.

**검증 한계 시 정직 보고(#310)**: Discord 실발송 없이 소싱 카운트 정확성만 확인 가능하다면, "embed 렌더는 미검증(실발송 필요)"으로 명시하고 다음 세션 확인 항목으로 넘긴다. 거짓 PASS 금지.

---

## 7. 인계 시 (Code → Desktop)

완료 후 다음을 인계 메시지(채팅 본문)에 명시:
- 커밋 SHA
- tsc/build 결과
- 소싱 카운트 검증 결과(어떤 데이터로, 어떤 수가 나왔는지)
- Discord embed 실발송 검증 여부(했으면 운영자 승인 하에, 안 했으면 "미검증-실발송필요"로 명시)
- 다음 단계 제안

**문서 3종 갱신(#319)**: 완료 시 `docs/handoff/CURRENT.md`(또는 Code 전용 핸드오프)·`PARALLEL_WORK_TRACKER.md` rev 추가·필요시 `PRINCIPLES_LEARNED.md`. 단 **CURRENT.md는 Desktop이 세션 종료 시 통합 관리**하므로, Code는 자기 작업 결과를 별도 핸드오프 파일(`docs/handoff/CODE_TRACK_C3_<날짜>.md`)로 남기고 Desktop이 병합하게 하는 게 충돌 안전(#284).

---

## 8. 요약 체크리스트

- [ ] `git pull` 후 BASELINE(164a222) 이후 변경 확인
- [ ] `cron/weekly/route.ts`에 소싱 주간 집계 추가(best-effort)
- [ ] `discord-builder.ts` `WeeklyReportEmbedParams`에 sourcingWeekly 옵셔널 필드 + embed 섹션(발굴>0일 때만)
- [ ] tsc 0 · build 0
- [ ] 소싱 카운트 정확성 검증(실발송 없이)
- [ ] Discord embed 실발송은 운영자 승인 필요 — 임의 발송 금지
- [ ] sentinel grep 0건 (닉네임 오기 변형 검사 — CLAUDE.md의 sentinel 목록 참조)
- [ ] 커밋(자기 write set만 개별 add)·push
- [ ] 핸드오프 파일 작성 + 채팅 인계 메시지
