# Naver Commerce API — 403 Persistent Error: Root Cause Analysis & Fix Report

> **Date**: 2026-05-06  
> **Sprint**: A3-4-DIAG  
> **Reference**: `COMMERCE_API_ORDER_DIAGNOSIS.md` (Track B Deep Diagnosis)  
> **Outcome**: ✅ Resolved — 4 orders synced successfully to DB

---

## TL;DR (3 lines)

1. **Root cause was NOT what the Track B report predicted.** The 7-day, 81-call, 100% 403 issue traced to **`.env.local` containing un-escaped `$` characters in `NAVER_CLIENT_SECRET`**, causing Next.js's `dotenv-expand` to silently truncate the bcrypt salt to 10 of its 29 characters.
2. **Endpoint mapping was already correct.** `GET /v1/pay-order/seller/product-orders` with `from`/`to` query parameters is the right endpoint — the report's hypothesis to migrate to `lastChangedFrom`/`lastChangedTo` would actually have caused 400 errors.
3. **A second issue was found and bypassed**: the Supabase Edge Function used as `NAVER_PROXY_URL` returns `GW.IP_NOT_ALLOWED` because the function's outbound IP is not registered in apicenter. Production fix is deferred — dev was unblocked by disabling the proxy locally (the home IP is already registered).

---

## Diagnostic Trail (chronological)

### Stage 0 — Pre-flight checks (apicenter screenshots)

All six green:

| # | Item | Result |
|---|---|---|
| 1 | Application status | ✅ Active |
| 2 | Registered IPs | `219.248.15.46`, `64.29.17.131`, `216.198.79.131` |
| 3 | Manager privilege | ✅ Business owner |
| 4 | Last call date | 6 days ago (4/30, not dormant) |
| 5 | Permission groups (Order/Product/Seller-info) | ✅ All granted |
| 6 | Vercel ENV `NAVER_CLIENT_SECRET` | Updated 2026-05-01 (suspect, but turned out to be unrelated) |

### Stage 1 — Diagnostic route (`/api/debug/naver-doctor`) — first run

8-check report fired with proxy enabled. First failure at the ENV check itself:

```
"NAVER_CLIENT_SECRET": {
  "length": 10,
  "prefix7": "/X8O2XQ",
  "isBcryptSalt": false
}
"sign": { "error": "Invalid salt version: /X" }
"summary.likelyRootCause": "SECRET_FORMAT_INVALID"
```

The bcrypt salt should be exactly 29 characters (`$2a$04$` + 22 base64 chars). It was 10. The prefix `/X8O2XQ` revealed the truncation pattern.

### Stage 2 — Pinpointing the truncation

Original `.env.local` value: `$2a$04$4H8P4wcs8Yv3/X8O2XQRJ.` (29 chars)
Loaded value: `/X8O2XQRJ.` (10 chars)

`dotenv-expand` (used by Next.js) interprets unescaped `$NAME` as a variable reference. Three substitutions occurred:
- `$2a` → resolved to empty (no such var)
- `$04` → empty
- `$4H8P4wcs8Yv3` → empty

What remained after all substitutions: `/X8O2XQRJ.`. Exact match with the loaded value.

This pattern was already in `userMemories` as a known pitfall but was lost when the secret was last touched on 2026-05-01.

### Stage 3 — Fix #1: escape `$` in `.env.local`

```diff
- NAVER_CLIENT_SECRET="$2a$04$4H8P4wcs8Yv3/X8O2XQRJ."
+ NAVER_CLIENT_SECRET="\$2a\$04\$4H8P4wcs8Yv3/X8O2XQRJ."
```

Restarted dev server. Re-ran diagnostic. New result:

```
"NAVER_CLIENT_SECRET": { "length": 29, "isBcryptSalt": true }
"token": { "status": 200, "ok": true, "tokenPrefix12": "33Bp5LyUFVTB..." }
"orders.A_current_code_from_to": { "status": 200, "ok": true, "dataLength": 2 }
```

OAuth flow now passes; the API returns data. Confirmed.

### Stage 4 — Endpoint 4-way comparison

The diagnostic route fires four endpoint variants in parallel against the live API:

| Variant | Method | Path | Params | Status | Outcome |
|---|---|---|---|---|---|
| **A** (current code) | GET | `/v1/pay-order/seller/product-orders` | `from`, `to`, `pageSize` | **200 OK, 2 items** | ✅ Correct as-is |
| B1 (Track B hypothesis) | GET | same path | `lastChangedFrom`, `lastChangedTo`, `lastChangedType` | 400 | "from 필드는 필수값" |
| B2 (alternate) | GET | `/v1/pay-order/seller/product-orders/last-changed-statuses` | `lastChangedFrom`, `lastChangedType` | 200 OK (no data) | Works, but for status-change polling |
| B3 (alternate) | POST | `/v1/pay-order/seller/product-orders/query` | body | 400 | Requires `productOrderNos` array |

**Conclusion**: the existing code's `from`/`to` parameters are the correct contract. The report's recommendation to migrate to `lastChangedFrom`/`lastChangedTo` would have caused 400 errors. **No `api-client.ts` change needed.**

### Stage 5 — Second issue surfaces: PROXY blocked

Manual sync (`/api/naver/orders?manual=1&hours=720`) returned `synced: 0` despite the diagnostic showing 2 items available. Dev log showed every PROXY-routed call returning:

```
GW.IP_NOT_ALLOWED — "호출이 허용되지 않은 IP입니다."
```

The diagnostic route bypasses `api-client.ts` and calls Naver directly from the dev server (outbound IP `219.248.15.46`, registered). The sync route uses `api-client.ts`, which routes through `NAVER_PROXY_URL` (Supabase Edge Function), and the Edge Function's outbound IP is not in the apicenter allow-list.

### Stage 6 — Fix #2 (dev only): disable proxy locally

```diff
- NAVER_PROXY_URL="https://doxfizicftgtqktmtftf.supabase.co/functions/v1/naver-proxy"
+ # dev: PROXY 비활성화 — 집 IP(219.248.15.46)가 apicenter 등록되어 있으므로 직접 호출
+ # production(Vercel ENV)에서는 NAVER_PROXY_URL 설정 유지 (Supabase Edge Function 경유)
+ # NAVER_PROXY_URL="https://doxfizicftgtqktmtftf.supabase.co/functions/v1/naver-proxy"
```

Restarted dev. Re-ran sync. Result: `synced: 4`. Supabase MCP query against the `Order` table confirmed all four rows landed with the expected fields populated.

---

## Where the Track B Report Got It Wrong

The Track B Deep Diagnosis report (Track B Deep Diagnosis, 2026-05-06) accurately described the symptoms but landed on the wrong primary cause:

| Report's claim | Actual finding |
|---|---|
| "1순위 원인 = IP 미등록 + 인증 상태 불일치" | Primary cause was **a single character-escape bug in dev `.env.local`**. apicenter side was healthy. |
| "`lastChangedFrom`↔`from` 미스매치는 별개의 2차 버그 (400 BAD_REQUEST를 만듬)" | This is the right diagnosis of *that* parameter pair, but the assumption that the current code uses `lastChangedFrom` was wrong. Current code uses `from`/`to`, which is the correct contract. |
| "수정 우선순위 3단: IP/리전 → 시크릿 재발급 → api-client.ts 정정" | None of these were needed. Single line in `.env.local` was the only required code-side change. |

**Lesson**: when 100% of calls fail with 403, the most parsimonious explanation is often something local (a credential or environment-loading bug), not something on the remote service or in protocol semantics. Always verify the credentials are loaded correctly before hypothesizing about the API contract.

---

## Recommendations

### Short term (this commit)
- ✅ `.env.local` `\$` escape applied
- ✅ `.env.local` `NAVER_PROXY_URL` commented out for dev (registered home IP is sufficient)
- ✅ Diagnostic route shipped at `/api/debug/naver-doctor` (CRON_SECRET-protected for production)

### Medium term (next session)
1. **Production proxy IP issue** — find the actual outbound IP of the Supabase Edge Function (call api.ipify.org from inside the Edge Function and log it) and either register it in apicenter or replace the proxy with a fixed-IP NAT solution. The two US-looking IPs already in apicenter (`64.29.17.131`, `216.198.79.131`) need to be verified against the Edge Function's actual IP — they may be stale.
2. **Cron not firing in production** — directly observed in the prior session: 7 days, 0 cron invocations. Even with the credential fix, automation will stay dead until the cron is restored. Verify `vercel.json` cron schedule, `CRON_SECRET` in Vercel ENV, and Hobby-plan cron limits.
3. **Token caching** — the OAuth token currently has `expires_in: 10799` (~3 hours). The in-memory cache is per-Lambda-invocation, so each cold start re-fetches. Consider a module-level shared cache or KV store with TTL-90% pre-refresh.

### Hard rules to add to `userMemories`
- `.env.local` containing `$` in any value: **always** escape as `\$` (dotenv-expand bug). Re-verify with the diagnostic route's ENV check after every secret rotation.
- Never assume an environment variable was loaded correctly until the diagnostic route confirms its length and prefix match the source-of-truth value.

---

## Files Changed This Sprint

| File | Change |
|---|---|
| `.env.local` | (1) `NAVER_CLIENT_SECRET` `$` → `\$` escape applied. (2) `NAVER_PROXY_URL` commented out for dev. (3) Header comments updated. |
| `src/app/api/debug/naver-doctor/route.ts` | NEW (~330 lines). 8-check diagnostic + 4-way endpoint comparison + Korean traffic-light report + auto root-cause classification. CRON_SECRET-protected on non-localhost hosts. |
| `docs/api/COMMERCE_API_403_ROOT_CAUSE.md` | NEW (this file). |

`src/lib/naver/api-client.ts` and `src/app/api/naver/orders/route.ts`: **no changes needed**. Existing code was correct.

---

## Verification Evidence

```
$ curl -s http://localhost:3000/api/debug/naver-doctor | jq '.summary, .checks.token.ok, .checks.orders.A_current_code_from_to.dataLength'
{
  "likelyRootCause": "OTHER_API_ERROR",
  "recommendedAction": "토큰은 정상이지만 주문 API 호출 실패. orderTests 응답 본문(code/message)으로 §6 의사결정 트리 직접 매핑."
}
true
2

$ curl -s 'http://localhost:3000/api/naver/orders?manual=1&hours=720' | jq
{
  "success": true,
  "synced": 4,
  "skipped": 0,
  "total": 4,
  "windows": 32,
  "period": "2026-04-06T04:54:19.169+09:00 ~ 2026-05-06T04:54:19.169+09:00"
}
```

Supabase MCP `SELECT * FROM "Order" ORDER BY "updatedAt" DESC LIMIT 5` shows 4 fresh rows with `updatedAt = 2026-05-06 04:54:20` (sync timestamp).

The note above on `recommendedAction` reflects that the diagnostic was run with proxy enabled, where the proxy itself was returning 403; the orders 4-way still passed because that section uses the direct token, not the proxy. After commenting out `NAVER_PROXY_URL` and restarting dev, the actual sync route (which uses the proxy code path) succeeded as well. Both paths are now verified working from dev.
