# HANDOFF — crawl_logs INSERT await 누락 dangling promise 수정 (G1 Tier-2 회귀)

> **작성**: 2026-05-28 Desktop turn (Track B G1 재개 — DB 3중 검증 Tier-2 중 발견)
> **상태**: OPEN — Claude Code 1-commit 처리 대기 (P1, 소싱 보관함 동선 단절)
> **베이스라인**: HEAD `d2f5d6e` (origin/main, Vercel READY — desc.contents fix 직후)
> **선행**: desc.contents {} fix(d2f5d6e)로 G1 크롤 응답은 200 정상. 그 직후 Tier-2(DB 행) 검증에서 발견.

---

## 1. 증상

`POST /api/crawler/domemae { url: "36904429" }` → HTTP 200 + 완전한 응답 데이터(name/price/options/images/seller). 그러나:

- `crawl_logs` 에 `36904429` row **0건**
- `crawl_logs` 최신 row = 2026-05-27 06:17 (명화송풍구). 2026-05-28 당일 크롤 반영 0건.
- Vercel runtime log `[crawl-log-insert]` 에러 **0건** → INSERT가 에러로 실패한 게 아니라 promise 자체가 미실행/미완료로 버려짐.

## 2. 근본 원인

`src/app/api/crawler/domemae/route.ts` 의 소싱 스냅샷 INSERT:

```ts
prisma.$executeRaw`
  INSERT INTO crawl_logs (...) VALUES (...)
`.catch((e) => console.error('[crawl-log-insert]', e));   // <- await 없음 (fire-and-forget)
```

직후 `NextResponse.json({...})` 가 즉시 반환된다. Vercel serverless 함수는 응답 반환 시 인스턴스를 freeze/종료하므로, `await` 되지 않은 INSERT promise가 **완료 전에 버려진다(dangling promise)**.

- 기존 3건(명화송풍구 65322245 / 하트클립 65322570 / 달항아리 63860451)이 INSERT된 것은 race condition(응답 직렬화가 INSERT보다 느려 우연히 완료)일 뿐 — 비결정적.
- 로컬 dev는 프로세스가 살아있어 항상 완료되므로 미발현. **production serverless 특유 회귀**.

## 3. 영향 범위 (P1)

- 단건 크롤(`/crawl` 페이지, AlternativeProductPanel, DomemaeCrawler)의 **소싱 보관함 기록이 간헐/완전 누락**.
- 크롤은 성공(응답 200)하나 소싱 보관함(crawl_logs 기반)에서 상품이 안 보임 → 씨앗심기(PLANT)로 넘기는 동선 단절.
- 새싹 셀러 핵심 파이프라인(크롤 → 소싱 보관함 → 씨앗심기) 신뢰성 저하.

## 4. 근본 수정 명세 (Code, 1 파일 1건)

파일: `src/app/api/crawler/domemae/route.ts`

```ts
// BEFORE (fire-and-forget)
prisma.$executeRaw`
  INSERT INTO crawl_logs (...) VALUES (...)
`.catch((e) => console.error('[crawl-log-insert]', e));

// AFTER (await — catch가 reject를 swallow하므로 응답은 막히지 않음)
await prisma.$executeRaw`
  INSERT INTO crawl_logs (...) VALUES (...)
`.catch((e) => console.error('[crawl-log-insert]', e));
```

- `.catch`가 그대로 있으므로 INSERT 실패해도 응답 흐름은 보존(블로킹 0). `await`는 promise 완료만 보장.
- INSERT 지연은 단건당 수십 ms 수준 — 무시 가능.
- 동일 패턴이 다른 라우트(bulk crawler stream 등)에도 있는지 점검 권장: `grep -rn "prisma.\$executeRaw" src/app/api/crawler/` 후 await 누락 fire-and-forget 일괄 점검.

## 5. 검증 (Code)

- `npx tsc --noEmit` 0 / `npm run build` exit 0 / 한글 sentinel grep 0
- push 후 `scripts/verify-vercel-deploy.sh --wait` exit 0

## 6. 검증 후 재개 동선 (Desktop, 작업원칙 #41 + #45 3-tier)

Code fix + Vercel READY 신호 시 Desktop이 동일 36904429로:

1. `POST /api/crawler/domemae { url: "36904429" }` → 200
2. Supabase `SELECT ... FROM crawl_logs WHERE url LIKE '%36904429%'` → **row 1건 생성 단정** (Tier-2)
3. 응답 ↔ DB row 필드 일치 단정 (Tier-3: name / supplier_price / images / options / category_code)
4. 통과 시 G2(카테고리 자동 추천)부터 정주행 계속 → G3~G8 + E1~E3
5. 통과 시 본 핸드오프 헤더 → `[CLOSED]` + TASK_BRIDGE §7 ARCHIVED

## 7. 비고

- desc.contents fix 핸드오프(`HANDOFF_crawler_desc_contents_type_2026-05-28.md`)와 별개 이슈이나, 같은 Track B G1 재개 turn에서 연속 발견됨. 두 핸드오프 모두 crawler route 신뢰성 트랙.
- 36904429 = `desc.contents == {}` + `crawl_logs INSERT race` 동시 재현 골든 픽스처. 두 fix의 회귀 테스트 케이스로 보존 권장.
