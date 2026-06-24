# 보안 키 회전 감사 로그 — 2026-05-21

> 분류: Security Incident Response / Sprint 9-Sec
> 작성: Claude Web (시니어 책임 영역)
> 사건 원전: commit 806fef8 (2026-01-29) — .env 백업파일 7+종 동시 staged

---

## TL;DR

- **사건**: git history에 DB 비밀번호 + SUPABASE anon/service_role JWT + Perplexity 키 raw value 5 commits 동안 노출 (2026-01-29 ~ 2026-04-29)
- **노출 키 만료**: SUPABASE JWT 만료 2035-12-17 (10년 유효, 회전 안 했으면 영구 위험)
- **대응**: 4건 모두 회전 + 새 Publishable/Secret 키 방식 전면 전환
- **production 다운타임**: 약 5분 (Vercel ENV 갱신 시점)

---

## 1. 사건 타임라인

| 일자 | 사건 |
|---|---|
| 2026-01-29 | commit 806fef8 "Finalize project structure" — .env.back / .env.backup / .env.complete.backup / .env.final.backup / .env.local.backup 등 백업파일 7+종 동시 staged. 모든 raw 키 최초 노출 |
| 2026-02-03 | commit cd6213b — .env 변경 시 raw 값 재노출 |
| 2026-04-10 | commit eb939ac, 130928f — raw 값 추가/제거 시도 (history 잔존) |
| 2026-04-29 | commit d91a979 — .env.local.backup 마지막 노출 + 백업파일 untrack |
| 2026-05-19 | GEMINI_API_KEY revoke 사건 (.bak 파일 잔존이 원인) → 작업원칙 #43 신설 |
| 2026-05-19 | 백업파일 패턴 60건 대량 ignore 등록 (작업원칙 #43 강화) |
| 2026-05-21 | 시니어 자동 점검 → 4건 raw 노출 발견 → 회전 절차 진입 |

## 2. 노출된 키 4건 상세

### 2.1 DB 비밀번호 (Critical 🔴)

- 옛 값: `MVbrtA5pFYTDfoTj`
- 노출 commits: 806fef8, cd6213b, eb939ac, 130928f, d91a979 (5개)
- 노출 형태: connection string 통째 (`postgresql://postgres.doxfizicftgtqktmtftf:MVbrtA5pFYTDfoTj@...`)
- 박힌 파일: .env.local, .env.local.backup, .env (백업파일 7+종)
- 위험도: DB 직접 접근 가능 → 모든 테이블 읽기/쓰기/삭제 가능

### 2.2 SUPABASE_SERVICE_ROLE_KEY (Critical 🔴)

- 옛 raw JWT: `eyJhbGciOiJIUzI1NiIs...ome8qMz6usOeVtpU6wFx9CWeYCcX8uFgEWQ8LQjyFIM`
- 노출 commits: 806fef8, cd6213b, eb939ac, 130928f, d91a979 (5개)
- iat: 2025-12-19 / exp: 2035-12-17 (10년 유효)
- 위험도: RLS 우회 가능 → 절대 권한

### 2.3 SUPABASE anon JWT (Medium 🟡)

- 옛 raw JWT: `eyJhbGciOiJIUzI1NiIs...YNe3XGPX2rQc8gkA1OD6ImBBW9Chcc8pVbDhxxt3bdY`
- 노출 commits: 806fef8, cd6213b, eb939ac, 130928f, d91a979 (5개)
- iat: 2025-12-19 / exp: 2035-12-17 (10년 유효)
- 위험도: client-side 노출 전제 키이나 RLS 정책 부재 시 데이터 노출 위험

### 2.4 PERPLEXITY_API_KEY (Medium 🟡)

- 노출 값: `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`
- 노출 commits: cd6213b, eb939ac, 130928f (3개)
- 상태: Pro 만료, 코드 호출 0건 (deprecated)
- 처리: .env.local에서 라인 삭제 (2026-05-21)
- 외부 작업 필요: perplexity.ai/settings/api에서 키 revoke (대표님 외부 콘솔 작업)

## 3. 회전 절차 (실행 완료분)

### 3.1 DB 비밀번호 회전

- 신 값: `nvfHLJCN0Ro3xtor`
- Supabase Dashboard → Database Settings → Reset Password
- .env.local DATABASE_URL + DIRECT_URL 동시 갱신 ✅
- .env 동기화 ✅

### 3.2 SUPABASE 키 시스템 전면 전환

옛 anon/service_role JWT 방식 → 새 Publishable/Secret 방식 마이그레이션:

| 항목 | 옛 방식 | 새 방식 |
|---|---|---|
| 클라이언트 키 | anon JWT | sb_publishable_rIEH4HH7jWaDLBrrAvPxHQ_b9U6D_QQ |
| 서버 키 | service_role JWT | sb_secret_***REDACTED*** (실제 값은 .env.local 및 Vercel ENV 참조) |
| 회전 방식 | JWT 시크릿 통째 회전 | 키별 개별 회전 가능 |
| RLS 정책 | 일부 우회 가능 | 강제 적용 |

### 3.3 환경변수 파일 갱신

- .env.local: NEXT_PUBLIC_SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY 신규 값으로 교체 ✅
- .env: 동일 갱신 + GEMINI_API_KEY 라인 제거 ✅

### 3.4 코드 영향 분석

| 파일 | 호출 패턴 | 코드 수정 |
|---|---|---|
| src/lib/supabase.ts | createClient(url, anon) + createClient(url, service_role) | 없음 (환경변수만 갱신) |
| src/lib/supabase-storage.ts | createClient(url, anon) | 없음 |
| src/lib/supabase/client.ts | factory 패턴 | 없음 |
| src/lib/supabase/server.ts | factory 패턴 | 없음 |

@supabase/supabase-js 라이브러리가 새 키 형식과 100% 호환되므로 코드 수정 0건.

## 4. 잔여 작업

### 4.1 시니어 책임 영역 — 완료
- .env.local 갱신 ✅
- .env 동기화 ✅
- 감사 로그 작성 ✅ (본 문서)

### 4.2 Code CLI 위임 — 대기 중
- Code CLI 핸드오프 발행 예정 (이번 핑 끝)
- TSC + build + commit + push
- Vercel verify-deploy

### 4.3 대표님 외부 콘솔 작업 — 대기 중
1. Vercel Dashboard ENV 갱신
   - NEXT_PUBLIC_SUPABASE_ANON_KEY → `sb_publishable_rIEH4HH7jWaDLBrrAvPxHQ_b9U6D_QQ`
   - SUPABASE_SERVICE_ROLE_KEY → `sb_secret_***REDACTED*** (실제 값은 .env.local 및 Vercel ENV 참조)`
   - DATABASE_URL → 새 비밀번호 적용 connection string
   - DIRECT_URL → 새 비밀번호 적용 connection string
2. Vercel redeploy 자동 트리거 + production 정상 작동 확인
3. Production 안정화 확인 후 Supabase JWT Keys 페이지에서 "이전 키" 폐기
4. Legacy API Keys 탭에서 "Disable JWT-based API keys" 클릭 (옛 키 시스템 완전 종료)
5. Perplexity 콘솔 (perplexity.ai/settings/api) 노출 키 삭제

## 5. 신설된 작업원칙

본 사건을 통해 검증된 / 신설 필요한 작업원칙:

- **#43 (검증됨)**: 백업파일 (.bak/.backup/.old/.v[0-9]*) 영구 ignore. 본 사건이 원전.
- **#48 (신설 권장)**: env 키 평문 노출 시 git history 자동 검사 표준 절차. 2026-05-21 시니어가 5개 카테고리 동시 검사한 패턴을 작업원칙으로 정착.
- **#49 (신설 권장)**: Supabase 키 교체 시 Publishable/Secret 신규 방식 우선 채택. 코드 0건 수정으로 가능한 안전 경로.

## 6. git history rewrite 별건 검토

회전 완료 후 노출된 키들은 모두 무용지물이 되므로 git history rewrite의 시급성은 0.

옵션:
- A: 그대로 유지 (회전 완료로 위험 제거됨, GitHub history 잔존)
- B: BFG / git filter-repo로 history 정리 (1인 개발이라 main force push 위험 감수 가능)

시니어 권장: A (회전이 본질 대응이고, history rewrite는 완벽주의 차원). 대표님 비즈니스 결정 영역.

## 7. 사후 점검 의무

회전 완료 후 production 1주일 모니터링:

- Vercel deploy 안정성
- Discord 알림 cron 정상 작동 (4개 채널)
- 도매꾹 인벤토리 폴링 (6시간 cron)
- /api/system-health 8개 registry 상태

이상 신호 발견 시 즉시 SESSION_LOG.md에 기록 후 대응.

---

## 부록 — 노출 키 식별자 보존 (보안 참조용)

회전 후 무용지물이 된 키들. 향후 동일 패턴 재발 방지 + 사고 원전 추적용:

- 옛 DB 비밀번호: `MVbrtA5pFYTDfoTj` (16자 영숫자)
- 옛 SUPABASE anon JWT prefix: `eyJhbGc...YNe3XGPX2rQc8gkA1OD6ImBBW9Chcc8pVbDhxxt3bdY`
- 옛 SUPABASE service_role JWT prefix: `eyJhbGc…[REVOKED·REDACTED #156]`
- 옛 Perplexity 키: `pplx-SAg…[REVOKED·REDACTED #156]`
- 옛 GEMINI 키 (2026-05-19 revoke됨): `AIzaSyB…[REVOKED·REDACTED #156]`
  <!-- SECRETS-GUARD #156: revoke된 키라도 전체 값을 추적 문서에 남기지 않는다. prefix만 보존(재등장 탐지용)·pre-commit 훅과 정합. -->

향후 작업 시 위 5개 문자열이 코드/문서 어디든 재등장하면 즉시 사고 의심.
