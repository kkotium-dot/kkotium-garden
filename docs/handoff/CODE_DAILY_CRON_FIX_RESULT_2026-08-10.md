# 결과 — 아침 소싱 알림 크론 스케줄러 미실행 조사 (2026-08-10, Code)

> 원본 지시: `docs/handoff/CODE_DAILY_CRON_FIX_HANDOFF_2026-08-08.md`(최하단 "★★★★★★ 2026-08-10 최신 상태" + "다음 조사 방향")

---

## 요약

**정규 스케줄 자동 미실행의 근본 원인은 이번 세션에서도 확정하지 못했다.** Vercel Hobby 플랜의 크론 실행 내역(invocation history)을 코드/API 레벨에서 조회할 방법이 없고, 로그 보관도 1시간이라 사후 확인이 구조적으로 불가능하다. 다만 조사 과정에서 다음 3가지를 새로 확인/발견했다.

## 1. Vercel 공식문서 재확인 (다음 조사 방향 #1·#2)

[Vercel 공식 Cron Jobs Usage & Pricing 문서](https://vercel.com/docs/cron-jobs/usage-and-pricing)(2026-07-15 갱신) 직접 조회 결과:

| | Hobby | Pro |
|---|---|---|
| 프로젝트당 크론 개수 | **100개** | 100개 |
| 최소 간격 | 하루 1회 | 분 단위 |
| **스케줄 정밀도** | **시간 단위(±59분)** | 분 단위 |

> "a cron job configured as `0 1 * * *` will trigger anywhere between 1:00 am and 1:59 am."

**의미**: `0 23 * * *`(08:00 KST)로 등록된 우리 크론들은 **23:00~23:59 UTC(08:00~08:59 KST) 사이 아무 때나** 실행될 수 있다. 이 자체가 "미실행"의 원인은 아니다(정밀도 문제일 뿐, 미실행 문제가 아님) — 다만 Desktop이 "정규 스케줄 시각(정각)에 DB 레코드 없음"을 근거로 미실행을 판단했다면, 그 판단 기준 자체가 부정확할 수 있다는 뜻이다. **크론 슬롯 5개 상한 우려는 기각** — Hobby도 100개까지 허용되므로 현재 6개 등록은 문제가 아니다.

크론이 "스킵되는 조건"에 대한 별도 공식 문서는 찾지 못했다. Vercel 자체 트러블슈팅 가이드([링크](https://vercel.com/kb/guide/troubleshooting-vercel-cron-jobs))가 나열하는 실패 사유(플랜 한도 초과·Preview 배포 대상·CRON_SECRET 형식 오류·크론 표현식 오류·리다이렉트·캐싱·WAF·라우트 불일치·빌드 시 crons 미등록) 중 우리 프로젝트에 해당 가능성이 있는 항목을 점검:
- **캐싱**: `cron/sourcing-daily/route.ts`·`sourcing-recommend/route.ts` 모두 이미 `export const dynamic = 'force-dynamic'` 있음 — 해당 없음.
- **CRON_SECRET 형식**: 로컬 `.env.local`에는 값이 있으나 프로덕션 실제 값은 Code 권한으로 조회 불가(Vercel MCP에 env-var 조회 툴 없음) — Desktop/운영자가 대시보드에서 개행·특수문자 여부 육안 확인 필요.
- **크론 상세페이지(Recent Invocations)**: Code의 브라우저 세션은 Vercel에 로그인돼 있지 않아(로그인 페이지로 리다이렉트됨) 직접 확인 불가 — **이 항목은 Desktop/운영자만 확인 가능**.

## 2. Vercel Runtime Logs/Errors API로 재확인 (신규 시도)

Vercel MCP(`get_runtime_logs`, `get_runtime_errors`)로 직접 조회:
- `get_runtime_logs`(2026-08-08~2026-08-11 구간, `/api/cron/sourcing-daily` 검색): **"No logs found — Hobby 1h 보관 한도 초과"** — Desktop이 이미 확인한 로그 보관 한계와 동일하게 재확인됨. 이 API도 과거 실행 여부를 알려주지 못한다.
- `get_runtime_errors`(최근 7일, `/api/cron/sourcing-daily` + `/api/cron/daily`): **에러 0건.** 즉 두 라우트가 최근 7일간 한 번도 500/예외를 던진 적이 없다 — "실행됐지만 내부에서 실패"가 아니라 "애초에 안 불렸거나, 불렸다면 항상 무결하게 끝났다"는 뜻으로 좁혀진다.

## 3. DB 재검증 — 새로운 불일치 발견 (중요, Desktop 확인 요청)

`sourcing_opportunity_records`·`daily_recommendations`(season_tag='sourcing') 두 테이블을 Supabase MCP로 직접 조회(전체 스캔, 날짜 필터 없이):

```
최신 레코드: 2026-08-07 13:14:26 (5건, 낮 시간대 — Desktop이 명시한 "수동 웹 스캔" 시각과 일치)
그 이후: 8/8, 8/9, 8/10 레코드 0건 — 전무
```

**이건 인계문서 §"2026-08-10 최신 상태"의 아래 주장과 배치된다**:
> "`/api/cron/sourcing-daily`를 CRON_SECRET 인증 헤더로 curl 직접 호출 → `{sent:true}` + 디스코드 정상 도착 확인(8/8)"

이 주장이 사실이라면 8/8 날짜로 DB 레코드가 남아있어야 한다(POST 핸들러 로직상 `opportunities.length > 0`이어야 discord 발송도 되고, 그 경우 같은 조건문 안에서 DB 저장도 함께 실행됨 — 저장 없이 발송만 되는 경로는 코드에 없음, `sourcing-recommend/route.ts:222`~`292`). 그런데 DB에는 8/8 이후 레코드가 전혀 없다.

**가능한 설명 후보**(어느 것인지 Code는 확정 불가, Desktop 확인 요청):
1. 그 수동 테스트가 실제로는 Preview 배포 또는 다른 프로젝트/DB(브랜치)를 대상으로 실행됐을 가능성
2. 그날 `opportunities.length === 0`이었는데 `discordSent`를 잘못 읽었거나 다른 발송 경로(예: opsDigest)와 착각했을 가능성
3. 그 시점 이후 리테인 정리 로직(`SOURCING_RETENTION_DAYS=7`)이 예기치 않게 최신 레코드까지 지웠을 가능성 — 단, 코드는 `date < cutoff`만 삭제하므로 최신 레코드가 삭제될 수는 없음(코드 읽기로 배제됨)

**교훈 재확인(#310)**: 인계문서에 "확인됨"이라 적힌 과거 관찰도, 새 세션에서 실측이 가능하면 반드시 재검증한다 — 이번처럼 새 조사가 기존 "확정 사실"과 어긋나는 경우가 실제로 있었다.

## 4. 코드 개선 — 중복발송 방지 가드 추가 (완료)

외부 안전망(§5)을 붙이면 Vercel 자체 크론과 겹쳐 하루 2번 발송될 위험이 생긴다. 이를 근본적으로 막기 위해 `POST /api/sourcing-recommend`에 **당일 이미 저장된 레코드가 있으면 재실행을 스킵**하는 가드를 추가했다(`src/app/api/sourcing-recommend/route.ts`).

- dryRun(미리보기)·`discord:false` 호출은 예외 — 항상 신선한 미리보기를 생성한다.
- 발송 대상 호출(`discord:true` 또는 기본값)만 당일 레코드 존재 시 조기 반환(`{ ok:true, skipped:true, reason:'already-sent-today' }`).
- 이 가드는 **"수동으로 여러 번 눌러도 하루 한 번만 발송"**을 보장하므로, 크론 원인이 무엇이든(스케줄러 문제·중복 트리거 등) 안전망 역할도 겸한다.
- `npx tsc --noEmit` 0 errors 확인.

## 5. 외부 안전망(GitHub Actions) — 설계만, 미구현 (운영자 승인 대기)

"다음 조사 방향 #3"의 GitHub Actions 우회안은 **설계만 하고 아직 코드/시크릿을 추가하지 않았다.** 이유:
- 이 워크플로가 활성화되면 **매일 자동으로 실제 프로덕션 엔드포인트를 호출해 Discord에 실발송**하게 된다 — "실제 Discord 발송 테스트는 운영자 승인 필요" 원칙과 같은 성격의 결정이라고 판단해 임의로 켜지 않았다.
- 활성화하려면 프로덕션 `CRON_SECRET` 값을 GitHub repo secret으로 등록해야 하는데, 이는 "표준/영구 설정 변경"에 해당해 별도 승인 대상으로 판단했다.

**제안 설계**(승인 시 바로 구현 가능):
- `.github/workflows/sourcing-daily-safety-net.yml`, `schedule: cron '10 0 * * *'`(00:10 UTC = 09:10 KST) — Vercel 자체 크론의 시간창(23:00~23:59 UTC)이 완전히 끝난 뒤에만 실행해 겹침을 줄임.
- `curl -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" https://kkotium-garden.vercel.app/api/cron/sourcing-daily`
- §4의 당일-스킵 가드 덕에, 정규 크론이 이미 성공했다면 이 안전망 호출은 자동으로 `skipped:true`만 반환하고 아무것도 보내지 않는다.
- 필요 조치(운영자): GitHub repo Settings → Secrets에 `CRON_SECRET`을 프로덕션 값과 동일하게 등록.

## 6. 다음 단계

- [ ] **Desktop/운영자**: Vercel 대시보드에서 크론 이름 클릭 → 상세 페이지의 "Recent Invocations"/"Last Run" 존재 여부 확인(Code는 로그인 세션이 없어 불가)
- [ ] **Desktop/운영자**: §3의 DB 불일치(8/8 수동 테스트 기록 부재) 재확인 — 그날 실제로 무엇을 호출했는지 재점검
- [ ] **운영자 승인 시**: §5 GitHub Actions 안전망 구현 + `CRON_SECRET` repo secret 등록
- [ ] 승인 후에도 **실제 발송 테스트(워크플로 최초 1회 실행)는 사전 고지 후 진행**

## 검증
- `npx tsc --noEmit`: 0 errors
- 실제 Discord 발송 테스트: **하지 않음**(지시 준수)
- Vercel 설정 변경: **하지 않음**(읽기 전용 조사만)
