# 작업 인계 — 아침 소싱 알림(E-7) 미발송 원인 조사

> **담당 레인**: Claude Code
> **작성**: Desktop, 2026-08-08
> **BASELINE**: main 최신(`git pull` 후 확인)
> **의존성**: 없음(코드 리딩+로직 점검 위주, 다른 레인과 write set 안 겹침)
> **긴급도**: 높음 — 매일 아침 8시 운영자 핵심 알림이 안 오고 있음

---

## ★★★ 근본 원인 확정 (2026-08-08, 운영자 수동 Run + Desktop 실측)

**운영자가 Vercel 대시보드에서 `/api/cron/daily`를 수동 "Run"으로 실행 → "마진-가격" 메시지만 옴(소싱 추천 없음).**

Desktop이 즉시 DB 교차검증: 수동 Run 이후에도 `sourcing_opportunity_records`가 갱신 안 됨(여전히 어제 낮 스캔 시각만 최신). 즉 **크론은 실행됐지만 E-7(소싱 추천)까지 도달하지 못하고 중간에 끊김.**

**확정된 근본 원인**:
1. `maxDuration` 설정이 어디에도 없음(코드·vercel.json·next.config 전부 grep 확인) → Hobby 기본 타임아웃 10초 적용.
2. `cron/daily/route.ts` 실행 순서(같은 파일 안에서 순차 실행):
   - 0. 자동품절 확인 — 네이버 API를 상품 수만큼 반복 호출(제일 무거움)
   - 1. OOS 감지 · 2. 점수하락 감지
   - 2.5 opsDigest(마진경고 포함) ← "마진-가격 메시지"가 여기서 발송됨(운영자가 받은 것)
   - 3. 추천 데이터 산출 · 4. DB 저장
   - A3. 네이버 주문 동기화 — 외부 API
   - C-10. 자동 발주확인 — 외부 API
   - D-3. 경쟁 모니터링 — 자체 fetch(무거움)
   - E-7. 소싱 추천 ← 여기 도달 전에 10초 초과로 함수 강제 종료
3. E-7은 순서상 맨 마지막에서 두 번째이고, 그 앞에 무거운 외부 API 호출이 최소 6단계나 있어 10초 안에 못 옴.

## ★★★ 근본 수정 방향 확정 (전 상품 공통 관점 — 단건 수습 아님)

**금지**: E-7을 코드 순서상 앞으로 옮기는 것 — 미봉책이다. 다른 알림이 대신 밀려날 뿐, 크론이 늘어나면 재발한다.

**권장 근본 해법: E-7(소싱 추천)을 별도의 독립 Vercel 크론으로 분리**
- `vercel.json`에 6번째 크론 엔트리 신규 추가: `/api/cron/sourcing-daily`(가칭), 스케줄은 기존 daily와 같은 `0 23 * * *`(같은 시각에 별도 함수로 병렬 실행 — Vercel 크론은 서로 다른 path면 독립 함수라 서로의 타임아웃에 영향 안 줌).
- Hobby는 크론 슬롯 5개까지 대시보드에서 확인됨(Desktop 실측) — 6개째 추가 시 배포가 실패하는지는 실제 배포로 확정.
- 새 크론 핸들러는 `cron/daily/route.ts`의 E-7 블록을 그대로 옮기면 됨 — 로직 자체는 이미 정상, 위치만 옮기는 문제.
- 다른 알림은 기존 `cron/daily`에 유지하되, A3/C-10/D-3도 미실행이었을 가능성 있음(아래 추가조사 참조).

## ★ 추가 조사 필요 (근본 수정 전 확인)
운영자가 받은 게 "마진-가격 메시지만"이므로, opsDigest(2.5) 이후의 A3(네이버동기화)·C-10(자동발주)·D-3(경쟁모니터링)도 전부 실행 안 됐을 가능성이 높다. 즉 이 크론이 안고 있는 문제가 소싱 추천 하나가 아니라 더 넓은 범위일 수 있다. 전 상품 공통 관점에서:
1. `cron/daily`가 담당하는 전체 8~9개 섹션을 실행 시간 기준으로 재검토
2. 무거운 것(외부 API 반복 호출: 자동품절·네이버동기화·경쟁모니터링·소싱추천)과 가벼운 것(DB 조회 기반: OOS·점수하락·opsDigest)을 분리
3. 무거운 섹션들을 각각 독립 크론으로 분산하거나, 최소한 소싱 추천(E-7)만이라도 최우선으로 분리

## ★★★★ 최종 확정 (2026-08-08, Desktop Vercel 대시보드 직접 확인 — Code의 SSO 의심을 확정으로 승격)

Code가 §추가조사에서 "SSO Protection이 원인일 수 있으나 단정 못함"이라 정직하게 남긴 부분을 Desktop이 브라우저로 직접 확인해 **확정**했다.

**Vercel 대시보드 → Settings → Deployment Protection → Vercel Authentication**:
- **"Require Log In" = 켜짐(Standard Protection)**
- 드롭다운 툴팁 원문: **"Standard Protection — Protect all except production **Custom Domains** for your project."**
- 이 프로젝트의 프로덕션 주소는 `kkotium-garden.vercel.app` — **이건 Custom Domain이 아니라 Vercel이 자동 발급한 기본 도메인**이다. 즉 "production Custom Domains" 예외에 해당하지 않는다.

**결론**: **프로덕션 자체가 Vercel Authentication에 걸려 있다.** Vercel 공식 문서(Deployment Protection 관련 여러 문서 확인, 2026-08-08 웹서치)를 종합하면, 이 보호를 우회하는 공식 경로는 다음뿐이다:
- 로그인한 팀원/프로젝트 멤버/접근그룹 멤버
- Shareable Link 소지자
- **"Protection Bypass for Automation" 헤더(`x-vercel-protection-bypass`)를 실은 요청**
- Trusted Sources의 OIDC 토큰(다른 Vercel 프로젝트/외부 서비스용)

**Vercel Cron이 이 보호를 "자동으로" 우회한다는 명시적 공식 문서는 찾지 못했다.** 이게 Code가 발견한 "5개 크론 전부 7일간 실행 로그 0건, 4xx/5xx 에러도 0건"과 정확히 부합한다 — 크론 요청이 Function(runtime logs가 잡는 지점)에 도달하기도 전에 Vercel 엣지의 인증 게이트에서 조용히 리다이렉트/차단되고 있을 가능성이 매우 높다.

**이게 사실이라면 지금까지의 모든 코드 레벨 원인(try-catch 구조·maxDuration·타임아웃)은 부차적이다** — 크론이 함수에 진입도 못 하면 그 안의 로직이 아무리 정확해도 무의미하다. 다만 타임아웃/try-catch 문제는 **SSO를 해결한 뒤에도 여전히 잠재 위험**이므로 함께 고쳐야 한다(§근본 수정 방향, 아래 유지).

## ★★★★ 최종 해결책 (2가지 옵션, 운영자 승인 필요 — Code가 임의 실행 금지)

**옵션 A — Vercel Authentication 끄기 (가장 간단, 보안 트레이드오프 있음)**
- 대시보드에서 "Require Log In" 토글 OFF.
- 장점: 즉시 해결, 코드 변경 0.
- 단점: **프리뷰 배포까지 전부 공개**된다(현재는 프리뷰도 보호되고 있었다는 뜻이므로, 꺼지면 프리뷰 URL을 아는 사람은 누구나 접근 가능). 프로덕션 API도 전부 공개 상태가 된다(이미 CRON_SECRET으로 크론 API는 보호되고 있으니 그 자체는 안전하나, 다른 미보호 API가 있는지 점검 필요).

**옵션 B — Protection Bypass for Automation 시크릿 사용 (권장, 안전)**
- 대시보드에서 시크릿 발급(Settings → Deployment Protection → Protection Bypass for Automation).
- Vercel Cron 요청에 이 시크릿이 자동으로 실리는지 확인 필요 — **Vercel 공식 문서에 "Vercel이 내부적으로 생성하는 크론 요청에 이 헤더를 자동으로 붙이는지"가 명시돼 있는지 Code가 재확인**. 만약 자동으로 안 붙는다면, 이 시크릿을 코드에서 알 방법이 없으므로 이 옵션은 실질적으로 무의미할 수 있다(자체 조사 필요).
- 대안: `SOURCING_RECOMMEND_LIVE` 등 CRON_SECRET 패턴처럼, Vercel이 크론 요청에 자동으로 붙이는 `Authorization: Bearer $CRON_SECRET` 헤더 자체가 이미 있는데도 SSO가 그 앞단에서 막는다면, **커스텀 도메인을 하나 연결하는 게 근본 해법**일 수 있다(Custom Domain 예외 조항을 활용). 도메인이 없다면 이 방법은 비용/시간이 든다.

**Code에게 요청**: 옵션 A/B 각각의 실현 가능성(특히 B의 "크론이 자동으로 bypass 헤더를 갖는지")을 Vercel 공식 문서로 추가 확인하고, 장단점을 정리해 운영자가 선택할 수 있게 제시할 것. **직접 설정을 바꾸지 말고 확인 결과만 보고.**

---

## ★★★★★ 정정 (2026-08-08, Desktop curl 직접 실측 — 위 SSO 가설 기각)

**바로 위 "★★★★ 최종 확정"의 SSO 원인 지목을 철회한다.** UI 문구만 보고 성급히 확정했던 것을 curl 실측으로 재검증했다:

```
curl -sI https://kkotium-garden.vercel.app/               → HTTP/2 200 (정상, SSO라면 막혔어야 함)
curl -sI https://kkotium-garden.vercel.app/api/cron/daily → HTTP/2 401, content-type: application/json
```

`/`가 200으로 정상 응답한 것은 **SSO Protection이 실제로 이 도메인에 걸려있지 않음**을 뜻한다(Standard Protection이 걸려있다면 홈페이지도 로그인 리다이렉트를 받아야 한다). `/api/cron/daily`의 401은 Vercel 로그인 페이지(HTML)가 아니라 **애플리케이션 코드의 JSON 401**(`isAuthorized()`가 `CRON_SECRET` 불일치로 반환한 것) — 인증 헤더 없는 curl 요청이 정상적으로 막힌 것뿐이다.

**교훈(#310 재확인)**: UI 설정 화면의 문구·툴팁은 실제 동작의 증거가 아니다. curl/실제 요청 결과가 항상 우선한다. 이번엔 이 원칙을 스스로 어기고 대시보드 문구만으로 결론 내렸다가 정정하게 됐다.

**따라서 원인은 다시 최초 가설(타임아웃/실행순서)로 되돌아간다.** 운영자가 "Run"으로 마진-가격 메시지를 받은 것은 **인증은 정상 통과했고 크론이 실제로 실행됐다**는 뜻이며, opsDigest(2.5)까지는 갔지만 그 뒤 E-7(소싱 추천)에 도달하지 못했다는 최초 관찰은 그대로 유효하다.

## ★★★★★ 실행 지시 확정 (Code, 지금 바로 진행)

1. `cron/daily/route.ts`에 `export const maxDuration = 60;` 추가(다른 크론들처럼 명시 — inventory-sync=60초 참고, Hobby 상한 확인).
2. **E-7(소싱 추천) 블록을 독립 크론으로 분리**: `vercel.json`에 `/api/cron/sourcing-daily` 신규 엔트리(`0 23 * * *`, 기존 daily와 동일 시각 — Vercel은 서로 다른 path면 별개 함수라 독립 실행됨). 새 route 파일에 E-7 로직(434~458행) 이전 + `isAuthorized` 가드 동일 적용. 기존 `cron/daily`에서는 E-7 블록 제거(중복 발송 방지).
3. 섹션 1(OOS 후반부)·2(점수하락)·3(추천산출)·4(DB영속화)에 개별 try-catch 추가(Code §1 표에서 무보호로 확인된 4곳) — `results.xxxError` 패턴으로 통일.
4. tsc 0 · build 0 확인 후 커밋·push.
5. 배포 후 Vercel Cron Jobs 탭에서 신규 크론(`sourcing-daily`) 등록 확인(Hobby 슬롯 상한 걸리면 즉시 보고).
6. **실제 Discord 발송 테스트는 운영자 승인 필요** — 신규 크론 "Run" 테스트 전 채팅으로 확인 요청.

---



매일 아침 8시(KST) 오는 "꼬띠의 소싱 추천" 디스코드 알림이 최근 안 옴.

## 2. Desktop이 이미 확인한 사실 (중복 조사 불필요)
- **Vercel Cron Jobs 기능 = Enabled**, `/api/cron/daily`는 `0 23 * * *`(UTC)로 정상 등록됨(대시보드 직접 확인).
- **Hobby 플랜 로그 보관 = 최대 1시간**이라 어젯밤 크론이 실제로 호출됐는지 로그로 직접 확인 불가.
- **DB 교차검증**: `sourcing_opportunity_records` 8/7 레코드가 크론 예정 시각(23:00 UTC)이 아니라 Desktop이 낮에 수동으로 실행한 웹 스캔 시각(13:14 UTC)에만 생성됨. 즉 크론 경로로 생성된 흔적이 없음 — 다만 이게 "크론 자체가 안 불림"인지 "불렸지만 내부에서 실패"인지는 미구분.
- **코드 로직 자체**(`src/app/api/cron/daily/route.ts` :434~457, E-7 섹션)는 설계상 정상으로 보임 — `SOURCING_RECOMMEND_LIVE`를 명시적으로 `'false'`로 안 하면 기본 실발송.

## 3. 조사 범위 (write set: 읽기 위주, 수정은 원인 확정 후)

### 3-1. 코드 레벨 원인 후보 (우선 점검)
- `cron/daily/route.ts`의 **E-7 섹션(434행 부근) 이전 단계에서 예외가 나서 그 아래로 실행이 안 갔을 가능성**. 이 route는 하나의 큰 try-catch 안에서 순차 실행되는데, 앞쪽 섹션(B-4 자동품절·OOS·score drop·opsDigest·naverSync·autoConfirm·competition 등)에서 처리 안 된 예외가 터지면 이후 E-7까지 도달 못 할 수 있음. **각 섹션이 개별 try-catch로 감싸져 있는지, 아니면 공통 try-catch 하나에 의존하는지 정확히 확인**.
- `SOURCING_RECOMMEND_LIVE` 환경변수가 Vercel 프로덕션에 **실제로 어떤 값**으로 설정돼 있는지(Desktop은 코드만 봤고 실제 env 값은 못 봄). Vercel 프로젝트 설정 → Environment Variables에서 확인 요망(Code가 MCP로 조회 가능하면 확인).
- `/api/sourcing-recommend` POST 내부에서 실패할 수 있는 지점(외부 API 타임아웃 등) 점검. Vercel Hobby 함수 타임아웃(10초) 안에 이 무거운 크론(여러 외부 API 호출 순차 실행)이 다 끝나는지도 의심 포인트 — **10초 초과 시 마지막 실행 중이던 섹션에서 강제 종료될 수 있음**, E-7이 순서상 뒤쪽이라 타임아웃에 가장 취약.

### 3-2. 확인 방법
- Vercel 프로젝트 Functions 설정에서 `cron/daily`의 `maxDuration` 설정 확인 (Hobby 기본 10초).
- 코드에서 순차 실행되는 단계 수를 세어, 10초 안에 다 끝날 가능성이 현실적인지 판단(naverSync·competition·autoConfirm 등 외부 API 호출이 여러 번 있음 — 각각이 1~2초씩만 걸려도 합산하면 10초 초과 가능).

## 4. 근본 수정 방향 (원인 확정 후, 전 상품 공통 관점)
단건 수습(예: E-7만 앞으로 옮기기)이 아니라:
- **만약 타임아웃 문제라면**: 무거운 크론을 여러 개로 쪼개거나(각각 별도 vercel.json 크론 엔트리), E-7(소싱 추천, 운영자가 매일 보는 핵심 알림)을 **가장 먼저 실행되는 순서로 재배치**해 타임아웃에 가장 안전하게 만드는 게 근본적. 단, Hobby는 크론 슬롯이 이미 5개라 신중히 설계.
- **만약 앞 섹션 예외로 인한 조기 종료라면**: 각 섹션을 독립적인 try-catch(현재 일부는 이미 그렇게 돼 있음 — #82 best-effort 패턴)로 감싸 한 섹션 실패가 나머지를 막지 않게. 이미 존재하는 `results.xxxError` 패턴을 전 섹션에 일관 적용.

## 5. 검증 계획
- 원인 특정 후 수정 → **로컬에서 재현 어려우므로(크론은 프로덕션 전용) 코드 정적 분석 + Vercel 함수 실행 시간 로그(1시간 이내 최신 실행분)로 검증**.
- 실제 발송 테스트는 **운영자 승인 필요**(Discord 실채널에 알림이 감) — Vercel 대시보드 "Run" 버튼 수동 실행은 Code가 임의로 하지 말고 Desktop/운영자에게 확인 요청.

## 6. 완료 후
- 원인·수정 내용·검증 결과를 결과 문서로 정리: `docs/handoff/CODE_DAILY_CRON_FIX_RESULT_2026-08-08.md`
- 커밋 메시지에 원인을 명확히 기술(추측 아닌 확인된 사실 기반)
- 채팅으로 결과 요약 → Desktop이 검토 후 실발송 검증(운영자 승인 하) 진행

## 7. 요약 체크리스트
- [ ] `git pull` 최신 확인
- [ ] `cron/daily/route.ts` 섹션별 try-catch 구조 점검
- [ ] `SOURCING_RECOMMEND_LIVE` 환경변수 실제 값 확인(가능하면)
- [ ] 함수 타임아웃(maxDuration) 설정 확인
- [ ] 순차 실행 시간 추정(외부 API 호출 횟수·예상 소요)
- [ ] 원인 확정 → 근본 수정(전 상품 공통 관점)
- [ ] tsc 0 · build 0
- [ ] 결과 문서 작성 + 커밋·push + 채팅 인계
- [ ] **실제 Discord 발송 테스트는 하지 말 것** — 운영자/Desktop 승인 필요
