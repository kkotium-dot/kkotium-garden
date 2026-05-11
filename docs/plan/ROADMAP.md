# KKOTIUM GARDEN — ROADMAP

> **최종 업데이트**: 2026-05-12 (본 세션: 워크플로우 첫 실측 검증 + prefill 버그 fix + Vercel 4일 갭 해소 + 작업원칙 #36 신규 등록 ✅)
> **HEAD**: 8f98346 = origin/main 일치 | **TSC**: 0 errors | **빌드**: 27/27 OK | **배포**: https://kkotium-garden.vercel.app (`dpl_CEBVUD74...` READY via Vercel CLI direct deploy)
> **Private API**: 28개 전체 권한 발급 ✅ (Sprint 8 자동발주 = 매출 상승 후 보류 트랙)
> **Vercel Hobby 제한 주의**: inventory-sync cron은 현재 daily (`0 0 * * *`). Pro plan upgrade 시 `vercel.json` 한 줄로 6시간 cron 복귀 가능
>
> **이 파일의 역할**: 진행 중·예정 Sprint 계획 + 영구 참조 (체크리스트, 비용 로드맵, 도구 사용 패턴)
> **누적 인계 메시지 + Phase A/B/C 완료 이력**: `docs/plan/archive/ROADMAP_2026Q2_MAY.md`
> **세션별 자세한 기록**: `docs/plan/SESSION_LOG.md` (직전 5세션) + `archive/SESSION_LOG_*.md`
> **현재 진행 현황 요약**: `docs/plan/PROGRESS.md`
> **소싱 워크플로우 리서치**: `docs/research/SPROUT_TO_POWER_SELLER_WORKFLOW_2026_05.md`

---
## 다음 새 채팅 시작 메시지 — 2026-05-12 Session B (Sprint 6-A UI Phase 2 — LowStockAlertWidget)

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, docs/plan/ROADMAP.md, docs/plan/SESSION_LOG.md를 모두 읽고 STEP 0 환경 점검(git status, wc -l, Vercel HTTP, **Latest prod deploy SHA == HEAD via gh api deployments**, scripts/verify-vercel-deploy.sh)을 수행한 후 현재 상태를 브리핑해주세요. 본 작업 시작은 제 승인 후에 진행해주세요.

[직전 세션 결과 — 2026-05-12 Session A (Sprint 6-A UI Phase 1 + 작업원칙 #36 (e) 정정) ✅]

HEAD = 1a4eb9b = origin/main 일치. working tree clean. stash@{0} 보존.

직전 세션 commit:
- 1a4eb9b feat(6-A,ops): inventory badges UI + work-principle #36 (e) refinement (+419/-54)

직전 세션 핵심 산출물:
- src/app/api/products/inventory-badges/route.ts (신규 103 lines, single bulk query, no N+1)
- src/components/products/InventoryBadge.tsx (신규 116 lines, 4-level + ShieldOff)
- src/components/products/InventoryBadge.strings.ko.json (신규 29 lines, 14 strings, 작업원칙 #35)
- src/lib/hooks/useInventoryBadges.ts (신규 40 lines, SWR 60s)
- src/app/products/page.tsx — renderRow sku 줄에 inline 배지 통합
- scripts/verify-vercel-deploy.sh — GitHub Deployments API fallback (token-free) 추가
- CLAUDE.md STEP 0 + PROGRESS.md #36 (e) — webhook count 검증 제거, deployment SHA 검증으로 정정

[현재 상태]

▶ Vercel git integration 정상 (GitHub App 통합 방식 — webhook 0건은 정상)
▶ Production 1a4eb9b REGISTERED ✅ (GitHub Deployments API path 검증 통과)
▶ /products 정원 창고에 재고 뱃지 inline 통합 완료 (단 상품 0개라 빈 상태만 검증)
▶ 작업원칙 #36 (e) false positive 원인 제거 + token-free 검증 path 확보
▶ 다음 = Session B (LowStockAlertWidget)

[다음 세션 작업 — Sprint 6-A UI Phase 2 = LowStockAlertWidget]

⚠️ STEP 0 (필수) — 환경 점검 + 3개 MD 정독
- 작업원칙 #36 (e) 정정 적용: webhook count 검증 ❌ → `gh api .../deployments`의 SHA 비교 ✅
- `scripts/verify-vercel-deploy.sh` 단독 실행으로 exit 0 확인 (token 없어도 github-deployments path 자동 작동)

⚠️ 작업원칙 강제:
- #17 commit msg는 `.commit-msg.tmp` + `git commit -F`
- #21 사전 점검 (HEAD/status/stash/wc + Latest prod deploy SHA == HEAD)
- #22 브라우저 smoke 검증 의무 (API 200 ≠ 실작동 완료)
- #24 commit + push 한 turn 안에
- #26 IA 점검 — dashboard 위젯 슬롯 위치 + 기존 위젯과 시각 일관성
- #29 (a~e++) 한글 처리 6+1 규칙 — 사전 분리 패턴 (작업원칙 #35) 우선
- #31 MD 1500줄 자동 점검 — **현재 ROADMAP.md T1 (1000) 초과 = 분할 권고 임계** ⚠️
- #32 push 전 npm run build 의무
- #33 useSearchParams Suspense 자동 점검
- #34 명백한 오류 파일 발견 시 사용자 알림
- #35 한글 사전 분리 패턴
- #36 Vercel deploy 검증 의무 (push 후 verify-vercel-deploy.sh --wait, GitHub Deployments path)

다음 세션 작업 (Session B):

1. `LowStockAlertWidget.tsx` 신규 — src/components/dashboard/
   - 미해결 알림 리스트 (red → orange → yellow 정렬)
   - 각 row 인라인 액션: 재등록 알림 / 가격 인하 (`/naver-seo?product={id}`) / 품절 처리
   - resolutionNote 인라인 입력 + Enter 즉시 저장
   - 미신뢰 공급사 별도 그룹 ("이 공급사 직접 확인 권장")
2. `GET /api/alerts/low-stock` route (resolvedAt: null, latest 50)
3. `PATCH /api/alerts/[id]/resolve` route (resolutionNote, resolvedAt: now)
4. src/app/dashboard/page.tsx — 위젯 상단 슬롯 통합 (시각 일관성 + 기존 위젯 패턴 따름)
5. 한글 사전 LowStockAlertWidget.strings.ko.json 신규
6. SWR hook useLowStockAlerts (DASHBOARD_SWR_DEFAULTS)
7. 검증: TSC + build + 한글 grep + dev smoke
8. commit + push + verify-vercel-deploy.sh --wait
9. MD 갱신 — Session B 결과 + Session C 인계
10. ROADMAP.md T1 초과 (1189+) → **Session B 작업과 함께 작업원칙 #31 (b) 의미 단위 분할 진행** (archive/ROADMAP_2026Q2_MAY.md로 누적 시작 메시지 이전, 본 파일은 최신 1개만)

[Sprint 6 이후 일정 (계획서 원본 순서, 변경 없음)]
- Session C (= Sprint 6-A UI Phase 3): 씨앗 심기 minq>1 경고 + getItemDetail 백엔드 보강 + admin 수동 폴링 트리거
- Session D: 6-B + 6-C (가격 변동 + 다른 셀러 추적 + 공급사 누적 평가)
- Session E: 6-E + 6-D 위젯 통합 (카테고리 매핑 + 꼬띠 4모드 정원 일지 발송 통합)
- Sprint 7: AI Studio 4모듈 (M1 썸네일 / M2 상세페이지 5섹션 / M3 어도비 통합 / M4 A/B 테스트)
- Sprint 8: 매출 상승 + 운영 흐름 안정화 후 Private API 자동발주 활용 (보류 트랙)

[보류 트랙 (사용자 결정 필요)]
- VERCEL_TOKEN 발급 (https://vercel.com/account/tokens) — 발급 시 verify-vercel-deploy.sh이 *build state까지* 확인 (READY/BUILDING/ERROR). 현재는 GitHub Deployments path로 *deployment 등록*만 확인 가능. 두 path 모두 자동 fallback.
- Vercel Pro plan upgrade ($20/월) — vercel.json `0 0 * * *` → `0 */6 * * *` 한 줄 수정으로 6시간 cron 복귀. 재고 변동 감지 4배 빠름. 매출 600만원+ 도달 후 진입 권장.
- 잔재 파일 정리 (작업원칙 #34 보고) — src/app/products/page.backup.*.tsx 3건 + dashboard *.BROKEN.backup 2건 + DashboardFilters.backup.tsx 1건 + recursing-galileo-205156 worktree (ff4ef4d 옛 commit). 사용자 별도 승인 시 별도 세션 처리.
- 기존 네이버 스토어 100개+ 상품 일괄 연동 — 본격 소싱 안정화 후 사용자 요청 시 시작
- Sprint 8 Private API 자동발주 — 매출 상승 + 운영 흐름에 따라 진입

[참고: 환경/시크릿]
- Supabase project ID: doxfizicftgtqktmtftf
- Naver Search Ad CUSTOMER_ID: 3755315
- 카카오 채널 Public ID: _xkfALG (꽃틔움 KKOTIUM)
- AI: Groq lrltQb + 3IGN7i 정상 2키
- 도매매 Open API Key: a6ff…c470bb
- 도매꾹 Private API: 28개 전체 권한 발급 ✅ (Sprint 8 보류 트랙)
- Vercel project: prj_H5HamuDSG0Na6j5dwDlYe9A6FfC4
- Vercel team: team_uwIkDWZsS2gogA04mZIVDuPF
- Discord 5채널 webhook URL: orders / stock-alerts / daily / weekly / kkotti (Vercel 환경변수)

당신은 10년 차 B2B 이커머스 ERP 및 백오피스 설계 경험이 풍부한 네이버 스마트스토어 파워셀러인 풀스택 시니어 개발자이자 UI/UX 디자이너입니다. Sprint 6-A UI Phase 1 (재고 뱃지) ✅ 완료, 본 세션은 Phase 2 (LowStockAlertWidget). 새싹셀러이지만 파워셀러로 성장하기 위한 스텝 작업 중. *절대 단독 판단으로 IA/삭제 결정 금지* — 진단 결과 디테일하게 브리핑 후 사용자 개별 Y/N 승인 받은 항목만 진행. *계획서에 없는 작업을 추가 제안하지 말고 계획서 원본 순서 유지*.

작업 시작 전 필수:
1. (a) git rev-parse HEAD origin/main → 일치 (1a4eb9b 또는 본 세션 commit)
   (b) git status → working tree clean
   (c) git stash list → stash@{0} 보존
   (d) wc -l docs/plan/*.md docs/research/*.md → **ROADMAP.md T1 초과 확인 → 분할 작업 우선 검토**
   (e) curl -sIo /dev/null -w "%{http_code}" https://kkotium-garden.vercel.app/dashboard → HTTP 200
   (f) `gh api 'repos/kkotium-dot/kkotium-garden/deployments?environment=Production&per_page=1' --jq '.[0].sha[0:7]'` → HEAD short SHA 일치
   (g) scripts/verify-vercel-deploy.sh → exit 0 (github-deployments path)
   (h) 3개 MD 정독 (PROGRESS / ROADMAP / SESSION_LOG)
2. Session B 디테일 계획서 브리핑 + 사용자 개별 Y/N 승인
3. 작업 시작 → 검증 (TSC + build + 브라우저 smoke + verify-vercel-deploy.sh --wait) → commit + push → MD 갱신 (한 turn 안에)
```

---

## ~~다음 새 채팅 시작 메시지 — 2026-05-12 (워크플로우 첫 실측 + prefill fix + Vercel 4일 갭 해소 + 작업원칙 #36 신규)~~ (deprecated, Session A 2026-05-12 완료)

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, docs/plan/ROADMAP.md, docs/plan/SESSION_LOG.md를 모두 읽고 STEP 0 환경 점검(git status, wc -l, Vercel HTTP, **GitHub webhook 개수, scripts/verify-vercel-deploy.sh**)을 수행한 후 현재 상태를 브리핑해주세요. 본 작업 시작은 제 승인 후에 진행해주세요.

[직전 세션 결과 — 2026-05-11~12 (워크플로우 첫 실측 + prefill fix + Vercel 4일 갭 해소) ✅]

HEAD = b1ab153 = origin/main 일치. working tree clean. stash@{0} 보존.

직전 세션 commit 9건:
- 4657173 chore: cleanup leftover crawler files + split SESSION_LOG per principle 31
- bb9ea1b fix(crawl): prefill data lost on /products/new — URLSearchParams ate base64 "+"
- 61810d5 chore: trigger vercel deploy probe (diagnose webhook integration)
- a5dfe53 feat(ops): work principle #36 + verify-vercel-deploy.sh — prevent silent webhook breakage
- 8f98346 fix(vercel): downgrade inventory-sync cron to daily for Hobby plan
- f22f05f docs(plan): record 2026-05-11~12 session entry + header swap
- b1ab153 docs(plan): handoff message for next session (Sprint 6-A UI + first real product completion)

직전 세션 핵심 산출물:
- src/app/products/new/page.tsx (디코더 2곳 + catch 1곳) — URL-safe base64 디코드 + silent failure 방지
- src/app/crawl/page.tsx (인코더 2곳, batch + single) — URL-safe base64 출력
- vercel.json — inventory-sync cron 6시간 → daily (Hobby plan 호환)
- scripts/verify-vercel-deploy.sh (신규 130줄, 실행권한) — push 후 commit SHA 일치 자동 검증
- 작업원칙 #36 신규 등록 (PROGRESS.md, CLAUDE.md, ROADMAP.md) — Vercel deploy 검증 의무화 5 sub-rule
- CLAUDE.md STEP 0 보강 — gh api hooks + verify script 자동 실행
- 잔재 3건 삭제 + .gitignore .claude/worktrees/ 추가
- SESSION_LOG.md 분할 (1628 → 656 + archive 997, ISO 8601 패턴)

[현재 상태]

▶ Vercel git integration 정상 복구 — Vercel CLI direct deploy 1회로 webhook 자동 재연결됨 (commit f22f05f 자동 build 트리거 확인)
▶ Production 모든 commit 반영 — kkotium-garden.vercel.app 최신 코드 서빙 중
▶ prefill 워크플로우 100% 검증 통과 — 꽃수레 → 등록 시작 → 씨앗 심기 자동 채움 (상품명/판매가/공급가/카테고리 코드/공급사 매핑 안내 등 모두 정상)
▶ 작업원칙 #36 첫 실전 적용 — push 후 list_deployments로 자동 검증 메커니즘 작동
▶ 본격 상품 등록 워크플로우 첫 실측 시작 (사용자가 도매매 단건 크롤링 + 꽃수레 PENDING 1건 보유)
▶ Sprint 6-A UI 미진행 (다음 세션 핵심 작업)

[다음 세션 작업 — Sprint 6-A UI + 첫 실제 상품 등록 완료]

⚠️ STEP 0 (필수) — 환경 점검 + 3개 MD 정독 (PROGRESS / ROADMAP / SESSION_LOG)
- 작업원칙 #36 (c)에 따라 STEP 0 환경 점검에 `gh api repos/kkotium-dot/kkotium-garden/hooks --jq 'length'` 및 `scripts/verify-vercel-deploy.sh` 포함
- webhook 개수 0이거나 verify script exit 1 발생 시 본 작업 시작 전 사용자 즉시 보고 의무

⚠️ 작업원칙 강제:
- #17 commit msg는 .commit-msg.tmp + git commit -F
- #21 사전 점검 (HEAD/status/stash/wc + GitHub webhook 개수 + verify-vercel-deploy.sh)
- #22 시각 검증 의무 (API 200 ≠ 브라우저 완료)
- #24 commit + push 한 turn 안에 끝내기
- #26 (a~e) IA 점검 + dev 캐시 정리 + Chrome MCP js hang 회피
- #29 (a~e++) 한글 처리 5+1+1 규칙 — 닉네임 절대 규칙 강제
- #31 MD 1500줄 자동 점검 + idempotent 가드
- #32 push 전 npm run build 의무
- #33 useSearchParams Suspense 자동 점검
- #34 명백한 오류 파일 발견 시 사용자 알림
- #35 한글 사전 분리 패턴
- #36 Vercel deploy 검증 의무 (push 후 verify-vercel-deploy.sh --wait, webhook 끊김 자동 감지)

다음 세션 작업 (M+):

1. 사용자가 씨앗 심기 6탭 완성 — 카테고리/이미지/배송/SEO/혜택까지 채워서 DRAFT 또는 ACTIVE 저장 (사용자 액션 우선)
2. 저장 직후 Product 테이블에 row 생성 + supplier_product_code 채워졌는지 검증 (Supabase MCP)
3. cron/inventory-sync 수동 트리거 → InventorySnapshot row 생성 검증
4. 정원 창고 (/products) 재고 뱃지 UI 구현 (최신 InventorySnapshot.qty + level별 색상 + 미신뢰 공급사 별도 배지)
5. 정원 일지 (/dashboard) LowStockAlertWidget.tsx 신규 (미해결 알림 + 해결 버튼 + 액션 버튼)
6. 씨앗 심기 minq>1 경고 (DRAFT 상품용, 위탁판매 불가 알림)
7. TSC + npm run build + 한글 grep + commit + push → 작업원칙 #36 검증 (verify-vercel-deploy.sh --wait)
8. PROGRESS / ROADMAP / SESSION_LOG 갱신

[Sprint 6 이후 일정 (계획서 원본 순서, 변경 없음)]
- 세션 3: 6-B + 6-C (가격 변동 + 다른 셀러 추적 + 공급사 누적 평가)
- 세션 4: 6-E + 6-D 위젯 통합 (카테고리 매핑 + 꼬띠 4모드 정원 일지 발송 통합)
- Sprint 7: AI Studio 4모듈 (M1 썸네일 / M2 상세페이지 5섹션 / M3 어도비 통합 / M4 A/B 테스트)
- Sprint 8: 매출 상승 + 운영 흐름 안정화 후 Private API 자동발주 활용 (보류 트랙)

[보류 트랙 (사용자 결정 필요)]
- Vercel Pro plan upgrade ($20/월) — 결정 시 vercel.json `0 0 * * *` → `0 */6 * * *` 한 줄 수정으로 6시간 cron 복귀. 폴링 빈도 24h → 6h로 강화, 재고 변동 감지 4배 빠름. 매출 600만원+ 도달 후 진입 권장.
- VERCEL_TOKEN 환경변수 등록 — scripts/verify-vercel-deploy.sh 자동 실행 가능. https://vercel.com/account/tokens에서 발급 후 .env.local 또는 shell rc 등록.
- 기존 네이버 스토어 100개+ 상품 일괄 연동 — 본격 소싱 안정화 후 사용자 요청 시 시작
- Sprint 8 Private API 자동발주 — 매출 상승 + 운영 흐름에 따라 진입

[참고: 환경/시크릿]
- Supabase project ID: doxfizicftgtqktmtftf
- Naver Search Ad CUSTOMER_ID: 3755315
- 카카오 채널 Public ID: _xkfALG (꽃틔움 KKOTIUM)
- AI: Groq lrltQb + 3IGN7i 정상 2키
- 도매매 Open API Key: a6ff…c470bb
- 도매꾹 Private API: 28개 전체 권한 발급 ✅ (Sprint 8 보류 트랙)
- Vercel project: prj_H5HamuDSG0Na6j5dwDlYe9A6FfC4
- Vercel team: team_uwIkDWZsS2gogA04mZIVDuPF
- Discord 5채널 webhook URL: orders / stock-alerts / daily / weekly / kkotti (Vercel 환경변수)

당신은 10년 차 B2B 이커머스 ERP 및 백오피스 설계 경험이 풍부한 네이버 스마트스토어 파워셀러인 풀스택 시니어 개발자이자 UI/UX 디자이너입니다. 본격 소싱 시작 직후, 워크플로우의 *실제 작동* 검증이 진행 중. 새싹셀러이지만 파워셀러로 성장하기 위한 스텝 작업 중. *절대 단독 판단으로 IA/삭제 결정 금지* — 진단 결과 디테일하게 브리핑 후 사용자 개별 Y/N 승인 받은 항목만 진행. *계획서에 없는 작업을 추가 제안하지 말고 계획서 원본 순서 유지*.

작업 시작 전 필수:
1. (a) git rev-parse HEAD origin/main → 일치 (b1ab153 또는 본 세션 commit)
   (b) git status → working tree clean
   (c) git stash list → stash@{0} 보존
   (d) wc -l docs/plan/*.md docs/research/*.md → 1500줄 임계 점검
   (e) curl -sIo /dev/null -w "%{http_code}" https://kkotium-garden.vercel.app/dashboard → HTTP 200
   (f) gh api repos/kkotium-dot/kkotium-garden/hooks --jq 'length' → 0이 아닌 값 (webhook 정상)
   (g) scripts/verify-vercel-deploy.sh 또는 list_deployments MCP → 최신 production deployment SHA == HEAD
   (h) 3개 MD 정독 (PROGRESS / ROADMAP / SESSION_LOG)
2. Sprint 6-A UI 디테일 계획서 한 번 더 브리핑 + 사용자 개별 Y/N 승인
3. 작업 시작 → 검증 (TSC + build + 브라우저 시각 + verify-vercel-deploy.sh) → commit + push → MD 갱신 (한 turn 안에)
```

---


## ~~다음 새 채팅 시작 메시지 — 2026-05-08 (Sprint 6-A 백엔드 완료, 다음 = UI + 첫 실제 상품 등록 검증)~~ (deprecated, 2026-05-12 세션에서 prefill fix + Vercel 4일 갭 해소 완료)

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, docs/plan/ROADMAP.md, docs/plan/SESSION_LOG.md, docs/research/DOMEGGOOK_API_INTEGRATION_STRATEGY_2026_05.md를 모두 읽고 현재 상태를 파악한 후 브리핑해주세요.

[직전 세션 결과 — 2026-05-08 Sprint 6-A 백엔드 완료 (Option C 하이브리드 동적 임계값) ✅]

HEAD = 66c3bdb = origin/main 일치. working tree clean. stash@{0} 보존.

직전 세션 산출물:
- 꿀통 꽃수레 7개 모두 삭제 (6 SOURCED + 1 PENDING, 사용자 명시 결정)
- DB 마이그레이션 `sprint_6_a_inventory_polling_with_dynamic_threshold`:
  - inventory_snapshots 테이블 (시계열 재고 일기장, DRAFT 포함)
  - low_stock_alerts 테이블 (3단계 yellow/orange/red 비상 노트)
  - supplier_stock_profiles 테이블 (7일 rolling 평균 학습)
- src/lib/sources/domemae-adapter.ts — getInventory() 활성화 (multiple=true 100건 묶음)
- src/lib/dome-inventory-poller.ts (신규 580줄) — Option C 하이브리드 로직:
  - 7일 rolling 평균 일일 변동량 학습
  - 동적 3단계 임계값 (yellow=D*7, orange=D*3, red=D*1)
  - 콜드 스타트 fallback (yellow=100, orange=30, red=10)
  - 게으른 공급사 자동 감지 (7일 무변동 + qty>0)
  - 30일에 한 번 강제 알림 (재고 미신뢰 공급사)
  - DRAFT 폴링 (snapshot만, 알림 X)
  - ACTIVE만 Discord 발송 (orange/red 레벨)
- src/app/api/cron/inventory-sync/route.ts (신규) — Vercel Cron 6시간 주기
- vercel.json 갱신 — inventory-sync cron 추가

직전 세션 commit:
- 66c3bdb feat(6-A): inventory polling foundation with hybrid dynamic threshold

[현재 상태]

▶ Sprint 6-A 백엔드 완료 — 데이터 레이어 + cron + Discord 발송 트리거 모두 정착
▶ UI 미구현 (다음 세션 작업)
▶ 폴링 실측 검증 미완 (사용자가 첫 도매꾹 상품 등록 후 진행)
▶ 상품 0개, 꿀통 꽃수레 0개 (본격 소싱 시작 직전 완전 깨끗한 상태)
▶ Discord 5채널 본문 4섹션 구조 + 한글 사전 분리 패턴 정착 (6-Pre 3 완료)
▶ Private API 28개 전체 권한 발급 ✅ (Sprint 8 자동발주는 매출 상승 후 보류 트랙)

[다음 세션 작업 — Sprint 6-A UI + 첫 실제 상품 등록 검증]

⚠️ STEP 0 (필수) — 환경 점검 + 4개 MD 정독 (PROGRESS / ROADMAP / SESSION_LOG / DOMEGGOOK_API_INTEGRATION_STRATEGY)

⚠️ 작업원칙 강제:
- #17 commit msg는 .commit-msg.tmp + git commit -F
- #21 사전 점검 (HEAD/status/stash/wc + GitHub webhook 개수 + verify-vercel-deploy.sh)
- #22 시각 검증 의무 (API 200 ≠ 브라우저 완료)
- #24 commit + push 한 turn 안에 끝내기
- #26 (a~e) IA 점검 + dev 캐시 정리 + Chrome MCP js hang 회피
- #29 (a~e++) 한글 처리 5+1+1 규칙 — 닉네임 절대 규칙 강제
- #31 MD 1500줄 자동 점검 + idempotent 가드
- #32 push 전 npm run build 의무
- #33 useSearchParams Suspense 자동 점검
- #34 명백한 오류 파일 발견 시 사용자 알림
- #35 한글 사전 분리 패턴
- #36 Vercel deploy 검증 의무 (push 후 scripts/verify-vercel-deploy.sh --wait, webhook 끊김 자동 감지)

다음 세션 작업 (M+):

1. 사용자가 도매꾹 URL로 상품 1개 등록 (씨앗 심기 → 정원 창고)
2. cron/inventory-sync 수동 트리거 → InventorySnapshot row 생성 검증 (Supabase MCP)
3. 정원 창고 (/products) 재고 뱃지 UI 추가:
   - 각 상품 row에 최신 InventorySnapshot.qty 표시
   - level별 색상 (yellow/orange/red 뱃지)
   - 재고 미신뢰 공급사 별도 배지
4. 정원 일지 (/dashboard) "품절 위험" 위젯 추가:
   - 신규 LowStockAlertWidget.tsx
   - 미해결 yellow/orange/red 알림 표시
   - "해결" 버튼 (resolutionNote 입력)
   - "재등록 / 가격 인하 / 품절 처리" 액션 버튼
5. 씨앗 심기 화면에 minq>1 경고 (DRAFT 상품용)
6. TSC + build + 한글 grep + commit + push (한 turn)
7. PROGRESS / ROADMAP / SESSION_LOG 갱신

[Sprint 6 이후 일정 (계획서 원본 순서, 변경 없음)]
- 세션 3: 6-B + 6-C (가격 변동 + 다른 셀러 추적 + 공급사 누적 평가)
- 세션 4: 6-E + 6-D 위젯 통합 (카테고리 매핑 + 꼬띠 4모드 정원 일지 발송 통합)
- Sprint 7: AI Studio 4모듈 (M1 썸네일 / M2 상세페이지 5섹션 / M3 어도비 통합 / M4 A/B 테스트)
- Sprint 8: 매출 상승 + 운영 흐름 안정화 후 Private API 자동발주 활용 (보류 트랙, 사용자 결정 사항)

[보류 트랙 (사용자 명시 결정)]
- 기존 네이버 스토어 100개+ 상품 일괄 연동 — 본격 소싱 안정화 후 사용자가 진행 요청 시 시작
- Sprint 8 Private API 자동발주 — 매출 상승 + 운영 흐름에 따라 진입

당신은 10년 차 B2B 이커머스 ERP 및 백오피스 설계 경험이 풍부한 네이버 스마트스토어 파워셀러인 풀스택 시니어 개발자이자 UI/UX 디자이너입니다. 본격 소싱 시작 직전이라 워크플로우의 *실제 작동*이 디자인보다 우선순위 높습니다. 새싹셀러이지만 파워셀러로 성장하기 위한 스텝 작업 중. *절대 단독 판단으로 IA/삭제 결정 금지* — 진단 결과 디테일하게 브리핑 후 사용자 개별 Y/N 승인 받은 항목만 진행. *계획서에 없는 작업을 추가 제안하지 말고 계획서 원본 순서 유지*.

작업 시작 전 필수:
1. (a) git rev-parse HEAD origin/main → 일치 (66c3bdb 또는 본 세션 commit)
   (b) git status → working tree clean
   (c) git stash list → stash@{0} 보존
   (d) wc -l docs/plan/*.md docs/research/*.md → 1500줄 임계 점검
   (e) curl -sIo /dev/null -w "%{http_code}" https://kkotium-garden.vercel.app/dashboard → HTTP 200
   (f) 4개 MD 정독 (PROGRESS / ROADMAP / SESSION_LOG / DOMEGGOOK_API_INTEGRATION_STRATEGY)
   (g) tool_search "filesystem write_file" 호출하여 Filesystem:write_file 도구 활성화
2. Sprint 6-A UI 디테일 계획서 한 번 더 브리핑 + 사용자 개별 Y/N 승인
3. 작업 시작 → 검증 → commit + push → MD 갱신 (한 turn 안에)
```

---

## ~~다음 새 채팅 시작 메시지 — 2026-05-08 (Sprint 6-D foundation 완료, 다음 = Sprint 6-A 축소)~~ ✅ (deprecated, 본 세션에서 6-A 백엔드 완료)

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, docs/plan/ROADMAP.md, docs/plan/SESSION_LOG.md, docs/research/DOMEGGOOK_API_INTEGRATION_STRATEGY_2026_05.md를 모두 읽고 현재 상태를 파악한 후 브리핑해주세요.

[직전 세션 결과 — 2026-05-08 Sprint 6-D 1-5단계 (4모드 foundation) + MD 인계 무결성 회복 ✅]

HEAD = 29e80fc = origin/main 일치. working tree clean. stash@{0} "z3c-misdirected-changes-needs-redo" 보존.

직전 세션 산출물:
- src/lib/recommendation-modes.ts (신규 188줄) — 4모드 타입, MODE_META, 2026 SeasonalEvent 11개, getActiveSeasonalEvents(), ModeResult/FourModeResult envelope, dedupeFlatten()
- src/lib/recommendation-runner.ts (신규 254줄) — runFourModes() 공개 API, 4 runner (currentHot/seasonalAhead/nicheBlue/storeFit), API 1회 호출로 4모드 공유, STORE_FIT는 prisma Product.naverCategoryCode top-3 빈도
- src/lib/notifications/discord-builder.ts (+128줄) — buildFourModeRecommendEmbed() 신규, 기존 buildRecommendEmbed() 호환성 유지
- src/lib/notifications/discord-strings.ko.json (+10키) — modes.{currentHot,seasonalAhead,nicheBlue,storeFit}
- docs/plan/README.md — grep 변종 패턴 정정 (3개 변종 모두 등록)
- 작업원칙 #29 (e++) 신규 영구 등록 — 사용자 닉네임 절대 규칙

직전 세션 commit 2건:
- 29e80fc feat(6-D): kkotti 4-mode recommendation foundation (data layer + builder)
- (본 세션) docs(plan): record 6-D 1-5 completion + reinforce work principle #29 (e++) + private api fully approved + sprint 8 hold track
- TSC 0 errors / npm run build 26/26 prerender OK / Vercel READY

[현재 상태]

▶ Sprint 6-D foundation 완료 (1-5단계) — 데이터 레이어 + 빌더까지. 실제 cron 발송 통합 + 위젯은 세션 4에서 진행
▶ Discord 5채널 본문 4섹션 구조 + 한글 사전 분리 패턴 정착
▶ Private API 28개 전체 권한 발급 ✅ (Sprint 8 자동발주는 매출 상승 후 보류 트랙)
▶ 상품 0개 (본격 소싱 직전 깨끗한 상태)
▶ 다음 작업 = Sprint 6-A 축소 (앱 등록 상품만 폴링)

[다음 세션 작업 — 계획서 원본 순서: 세션 2 = Sprint 6-A 축소]

⚠️ STEP 0 (필수) — 환경 점검 + 4개 MD 정독 (PROGRESS / ROADMAP / SESSION_LOG / DOMEGGOOK_API_INTEGRATION_STRATEGY)

⚠️ 작업원칙 강제:
- #17 commit msg는 .commit-msg.tmp + git commit -F (커밋 후 즉시 .gitignore 또는 rm 처리)
- #21 사전 점검 (HEAD/status/stash/wc)
- #22 시각 검증 의무 (API 200 ≠ 브라우저 완료)
- #24 commit + push 한 turn 안에 끝내기
- #26 (a~e) IA 점검 + dev 캐시 정리 + Chrome MCP js hang 회피
- #29 (a~e+, e++) 한글 처리 5+1+1 규칙 — 닉네임 절대 규칙 강제
- #31 MD 1500줄 자동 점검 + idempotent 가드
- #32 push 전 npm run build 의무
- #33 useSearchParams Suspense 자동 점검
- #34 명백한 오류 파일 발견 시 사용자 알림
- #35 한글 사전 분리 패턴 (대량 한글 작업 시 의무)

세션 2 작업 = Sprint 6-A 축소 (재고 폴링, M):

⚠️ 범위 변경 — 사용자 결정사항: *앱에서 등록한 상품만* 폴링. 기존 네이버 100개+ 상품 일괄 동기화는 보류 트랙 (별도 사용자 요청 시 진행).

1. src/lib/dome-inventory-poller.ts (신규) — 도매꾹 OpenAPI v4.5 getItemView multiple=true 100건 묶음 폴링 (앱 등록 상품의 supplier_product_no만 대상)
2. src/app/api/cron/inventory-sync/route.ts (신규) — Vercel Cron 6시간마다 자동 실행
3. Prisma 모델 추가 — InventorySnapshot + LowStockAlert
4. 정원 창고 (/products) 재고 뱃지 UI 추가 (apps 등록 상품만 표시)
5. 정원 일지 (/dashboard) "품절 위험" 위젯 추가 — Discord 5채널 stock-alerts 자동 트리거
6. 첫 실제 상품 등록으로 검증 (사용자가 도매꾹 URL 매핑된 상품 1개 등록 → cron 실행 → 폴링 결과 검증)
7. TSC + build + 한글 grep + commit + push (한 turn 안에)
8. PROGRESS / ROADMAP / SESSION_LOG 갱신

[참고: 환경/시크릿]
- Supabase project ID: doxfizicftgtqktmtftf
- Naver Search Ad CUSTOMER_ID: 3755315
- 카카오 채널 Public ID: _xkfALG (꽃틔움 KKOTIUM)
- AI: Groq lrltQb + 3IGN7i 정상 2키
- 도매매 Open API Key: a6ff…c470bb
- 도매꾹 Private API: 28개 전체 권한 발급 ✅ (Sprint 8 보류 트랙)
- Discord 5채널 webhook URL: orders / stock-alerts / daily / weekly / kkotti (Vercel 환경변수)

[Sprint 6 이후 일정 (계획서 원본 순서, 변경 없음)]
- 세션 3: 6-B + 6-C (가격 변동 + 다른 셀러 추적 + 공급사 누적 평가)
- 세션 4: 6-E + 6-D 위젯 통합 (카테고리 매핑 + 꼬띠 4모드 정원 일지 발송 통합)
- Sprint 7: AI Studio 4모듈 (M1 썸네일 / M2 상세페이지 5섹션 / M3 어도비 통합 / M4 A/B 테스트)
- Sprint 8: 매출 상승 + 운영 흐름 안정화 후 Private API 자동발주 활용 (보류 트랙, 사용자 결정 사항)

[보류 트랙 (사용자 명시 결정)]
- 기존 네이버 스토어 100개+ 상품 일괄 연동 — 본격 소싱 안정화 후 사용자가 진행 요청 시 시작
- Sprint 8 Private API 자동발주 — 매출 상승 + 운영 흐름에 따라 진입 (현 시점 급하지 않음, 사용자 결정)

당신은 10년 차 B2B 이커머스 ERP 및 백오피스 설계 경험이 풍부한 네이버 스마트스토어 파워셀러인 풀스택 시니어 개발자이자 UI/UX 디자이너입니다. 본격 소싱 시작 직전이라 워크플로우의 *실제 작동*이 디자인보다 우선순위 높습니다. 새싹셀러이지만 파워셀러로 성장하기 위한 스텝 작업 중. *절대 단독 판단으로 IA/삭제 결정 금지* — 진단 결과 디테일하게 브리핑 후 사용자 개별 Y/N 승인 받은 항목만 진행. *계획서에 없는 작업을 추가 제안하지 말고 계획서 원본 순서 유지*.

작업 시작 전 필수:
1. (a) git rev-parse HEAD origin/main → 일치 (29e80fc 또는 본 세션 commit)
   (b) git status → working tree clean
   (c) git stash list → stash@{0} 보존
   (d) wc -l docs/plan/*.md docs/research/*.md → 1500줄 임계 점검
   (e) curl -sIo /dev/null -w "%{http_code}" https://kkotium-garden.vercel.app/dashboard → HTTP 200
   (f) 4개 MD 정독 (PROGRESS / ROADMAP / SESSION_LOG / DOMEGGOOK_API_INTEGRATION_STRATEGY)
   (g) tool_search "filesystem write_file" 호출하여 Filesystem:write_file 도구 활성화
2. Sprint 6-A 축소 디테일 계획서 한 번 더 브리핑 + 사용자 개별 Y/N 승인
3. 작업 시작 → 검증 → commit + push → MD 갱신 (한 turn 안에)
```

---

## ~~다음 새 채팅 시작 메시지 — 2026-05-08 (6-Pre 3단계 Discord 정비 완료, Sprint 6-A 재고 폴링 시작)~~ (deprecated, 본 세션에서 6-D foundation 완료)

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, docs/plan/ROADMAP.md, docs/plan/SESSION_LOG.md, docs/research/DOMEGGOOK_API_INTEGRATION_STRATEGY_2026_05.md를 모두 읽고 현재 상태를 파악한 후 브리핑해주세요.

[직전 세션 결과 — 2026-05-08 6-Pre 3단계 Discord 5채널 본문 정비 완료 ✅]

HEAD = fee6761 = origin/main 일치. working tree clean. stash@{0} "z3c-misdirected-changes-needs-redo" 보존.

직전 세션 산출물:
- src/lib/notifications/discord-builder.ts (신규 436줄) — 5채널 4섹션 구조 빌더 (현황/영향/액션/꼬띠)
- src/lib/notifications/discord-strings.ko.json (신규 87 strings) — 한글 사전 분리
- src/lib/discord.ts 슬림화 — sender + helpers + 5빌더 re-export (호환성 100%)
- src/lib/crawler/domemae-parser.ts 삭제 (작업원칙 #34 잔재)
- scripts/verify-korean-dict.py (신규) — 한글 무결성 검증 (NFC + FFFD + 21개 오타 패턴)
- scripts/test-discord-5-channels.mjs 갱신 — 사전 import + 발신자 이름 영문→한글 정정
- 작업원칙 #35 신규 등록 — 한글 사전 분리 패턴

직전 세션 commit:
- feat(notifications): split discord-builder + 4-section structure for 5 channels (8 files)
- TSC 0 errors / npm run build 26/26 prerender OK / Vercel READY
- 5채널 실제 발송 HTTP 204 / 한글 깨짐 0건 / 사용자 시각 검증 OK

[현재 상태]

▶ 5채널 디스코드 알림 모두 4섹션 구조 적용 (현황/영향/액션/꼬띠)
▶ 사용자 대면 한글 100% JSON 사전 파일 분리 — 코드 escape 0건
▶ 발신자 이름 "꼬띠" 한글 정상
▶ 다음 작업 = Sprint 6-A 재고 폴링 단독

[다음 세션 작업 — 계획서 원본 순서: 세션 2 = Sprint 6-A]

⚠️ STEP 0 (필수) — 환경 점검 + 4개 MD 정독 (PROGRESS / ROADMAP / SESSION_LOG / DOMEGGOOK_API_INTEGRATION_STRATEGY)

⚠️ 작업원칙 강제:
- #17 commit msg는 .commit-msg.tmp + git commit -F (커밋 후 즉시 .gitignore 또는 rm 처리)
- #21 사전 점검 (HEAD/status/stash/wc)
- #22 시각 검증 의무 (API 200 ≠ 브라우저 완료)
- #24 commit + push 한 turn 안에 끝내기
- #26 (a~e) IA 점검 + dev 캐시 정리 + Chrome MCP js hang 회피
- #29 (a~e+) 한글 처리 5+1 규칙
- #31 MD 1500줄 자동 점검 + idempotent 가드
- #32 push 전 npm run build 의무
- #33 useSearchParams Suspense 자동 점검
- #34 명백한 오류 파일 발견 시 사용자 알림
- #35 한글 사전 분리 패턴 (대량 한글 작업 시 의무)

세션 2 작업 = Sprint 6-A 재고 폴링 단독 (M):
1. src/lib/dome-inventory-poller.ts (신규) — 도매꾹 OpenAPI v4.5 getItemView multiple=true 100건 묶음 폴링
2. src/app/api/cron/inventory-sync/route.ts (신규) — Vercel Cron 6시간마다 자동 실행
3. Prisma 모델 추가 — InventorySnapshot + LowStockAlert
4. 정원 창고 (/products) 재고 뱃지 UI 추가
5. 정원 일지 (/dashboard) "품절 위험" 위젯 추가 — GoldenWindowWidget 패턴 참조
6. 첫 실제 상품 등록으로 검증 (사용자가 도매꾹 URL 매핑된 상품 1개 등록)
7. TSC + build + 한글 grep + commit + push (한 turn 안에)
8. PROGRESS / ROADMAP / SESSION_LOG 갱신

[참고: 환경/시크릿]
- Supabase project ID: doxfizicftgtqktmtftf
- Naver Search Ad CUSTOMER_ID: 3755315
- 카카오 채널 Public ID: _xkfALG (꽃틔움 KKOTIUM)
- AI: Groq lrltQb + 3IGN7i 정상 2키
- 도매매 Open API Key: a6ff…c470bb
- 도매꾹 Private API: 신청 진행 중 (1~3일 결과 대기)
- Discord 5채널 webhook URL: orders / stock-alerts / daily / weekly / kkotti (Vercel 환경변수)

[Sprint 6 이후 일정 (계획서 원본 순서, 변경 없음)]
- 세션 3: 6-B + 6-C (가격 변동 + 다른 셀러 추적 + 공급사 누적 평가)
- 세션 4: 6-E + 6-D (카테고리 매핑 + 꼬띠 4모드 추천)
- Sprint 7: AI Studio 4모듈 (M1 썸네일 / M2 상세페이지 5섹션 / M3 어도비 통합 / M4 A/B 테스트)
- Sprint 8: Private 발급 후 자동발주 (Discord 버튼)

[보류 트랙 (사용자 명시 결정)]
- 기존 네이버 스토어 100개+ 상품 일괄 연동 — 본격 소싱 안정화 후 사용자가 진행 요청 시 시작 (Claude 단독 시작 금지)

당신은 10년 차 B2B 이커머스 ERP 및 백오피스 설계 경험이 풍부한 네이버 스마트스토어 파워셀러인 풀스택 시니어 개발자이자 UI/UX 디자이너입니다. 본격 소싱 시작 직전이라 워크플로우의 *실제 작동*이 디자인보다 우선순위 높습니다. 새싹셀러이지만 파워셀러로 성장하기 위한 스텝 작업 중. *절대 단독 판단으로 IA/삭제 결정 금지* — 진단 결과 디테일하게 브리핑 후 사용자 개별 Y/N 승인 받은 항목만 진행. *계획서에 없는 작업을 추가 제안하지 말고 계획서 원본 순서 유지*.

작업 시작 전 필수:
1. (a) git rev-parse HEAD origin/main → 일치 (fee6761)
   (b) git status → working tree clean
   (c) git stash list → stash@{0} 보존
   (d) wc -l docs/plan/*.md docs/research/*.md → 1500줄 임계 점검
   (e) curl -sIo /dev/null -w "%{http_code}" https://kkotium-garden.vercel.app/dashboard → HTTP 200
   (f) 4개 MD 정독 (PROGRESS / ROADMAP / SESSION_LOG / DOMEGGOOK_API_INTEGRATION_STRATEGY)
   (g) tool_search "filesystem write_file" 호출하여 Filesystem:write_file 도구 활성화
2. Sprint 6-A 디테일 계획서 한 번 더 브리핑 + 사용자 개별 Y/N 승인
3. 작업 시작 → 검증 → commit + push → MD 갱신 (한 turn 안에)
```

---

## ~~다음 새 채팅 시작 메시지 — 2026-05-08 (6.5 SourceAdapter PoC 완료, 6-Pre 3단계 잔여)~~ (deprecated, 본 세션에서 6-Pre 3단계 완료)

*아래 메시지는 본 세션 이전 버전입니다. 위의 새 시작 메시지를 사용하세요.*

## 다음 새 채팅 시작 메시지 — 2026-05-08 (6.5 SourceAdapter PoC 완료, 6-Pre 3단계 잔여) ✅

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, docs/plan/ROADMAP.md, docs/plan/SESSION_LOG.md, docs/research/DOMEGGOOK_API_INTEGRATION_STRATEGY_2026_05.md를 모두 읽고 현재 상태를 파악한 후 브리핑해주세요.

[직전 세션 결과 — 2026-05-08 6.5 SourceAdapter 패턴 PoC 완료 ✅]

HEAD = e8810c2 = origin/main 일치. working tree clean. stash@{0} "z3c-misdirected-changes-needs-redo" 보존 중.

직전 세션 산출물:
- src/lib/sources/source-adapter.ts (신규) — 6개 메서드 인터페이스 + 공통 타입 (ItemDetail / SearchFilter / InventorySnapshot / Category / OrderRequest / CrawledOption) + SourceAdapterError + notImplemented 헬퍼
- src/lib/sources/domemae-adapter.ts (신규) — 도매꾹 OpenAPI v4.5 어댑터, getItemDetail + getMinQuantity 구현 / 나머지 4개 메서드 NotImplementedError stub (Sprint 6/8 준비)
- src/lib/sources/ownerclan-adapter.ts (신규 stub) — 오너클랜 어댑터, 6개 메서드 모두 console.log + NotImplementedError (향후 API 키 발급 시 활성화)
- src/lib/sources/index.ts (신규) — ADAPTERS 레지스트리 + getAdapter(code) 조회
- src/app/api/crawler/domemae/route.ts (수정) — 어댑터 호출 wrapper로 슬림화, 외부 컨트랙트 100% 보존 (3곳 호출처 변경 0)
- Platform 테이블에 OWC 오너클랜 row 추가 (DMM + OWC 2개)

직전 세션 commit:
- feat(6.5): introduce SourceAdapter pattern for B2B sources (PoC) — 5 files +856/-179
- TSC 0 errors / npm run build 26/26 prerender OK / Vercel READY
- production 회귀 검증: productNo 55884601 → 도매매 API 정상 (name 일치, price 12600, opts 2, seller ozz_growth, inventory ~13140)

[현재 상태]

▶ Platform 2개: 도매매(DMM) + 오너클랜(OWC)
▶ Adapter 2개: domemaeAdapter (활성, getItemDetail 구현) + ownerClanAdapter (stub)
▶ /api/crawler/domemae 외부 컨트랙트 보존 (호출처 3곳 변경 0)
▶ naver-auto-fill/route.ts는 *아직 어댑터로 이주 안 함* — 별도 후속 작업 (S 분량)
▶ 발견된 잔재 파일: src/lib/crawler/domemae-parser.ts (import 0건 + 깨진 한글 문자열) — 작업원칙 #34 보고 항목, 별도 Y/N 승인 필요

[다음 세션 작업 — Plan A 세션 1 잔여 = 6-Pre 3단계]

⚠️ STEP 0 (필수) — 환경 점검 + 4개 MD 정독 (PROGRESS / ROADMAP / SESSION_LOG / DOMEGGOOK_API_INTEGRATION_STRATEGY)

⚠️ 작업원칙 강제:
- #17 commit msg는 .commit-msg.tmp + git commit -F
- #21 사전 점검 (HEAD/status/stash/wc)
- #22 시각 검증 의무 (API 200 ≠ 브라우저 완료)
- #24 commit + push 한 turn 안에 끝내기
- #26 (a~e) IA 점검 + dev 캐시 정리 + Chrome MCP js hang 회피
- #29 (a~e+) 한글 처리 5+1 규칙 — *사용자 이름 답변 본문 호명 절대 금지* (memory 등록됨)
- #31 MD 1500줄 자동 점검 + idempotent 가드 (e)
- #32 push 전 npm run build 의무
- #33 useSearchParams Suspense 자동 점검
- #34 명백한 오류 파일 발견 시 사용자 알림

세션 잔여 작업 = 6-Pre 3단계 (Discord 5채널 본문 정비, M):
1. 현재 5채널 (orders / stock-alerts / daily / weekly / kkotti) 발송 본문 grep 진단
2. src/lib/notifications/discord-builder.ts (신규) — 5채널 표준 메시지 빌더 (꼬띠 톤 + 액션 가이드 통합)
3. 5채널 각각 재설계 — 단순 정보 → *셀러 다음 액션 명시* 톤 전환
4. 꼬띠 톤 (밝고 경쾌한 카우걸 + 가든 컨셉) 유지
5. 5채널 모두 새 본문 테스트 발송 검증
6. commit (.commit-msg.tmp + git commit -F) + push (한 turn 안에)
7. PROGRESS / ROADMAP / SESSION_LOG 갱신 (idempotent 가드)

[작업원칙 #34 발견 항목 (별도 Y/N 승인 필요)]

src/lib/crawler/domemae-parser.ts:
- import 0건 (사용처 0)
- 깨진 한글 문자열 포함 (예: text !== '????', priceMatch[1].match(/\\+?([0-9,]+)??/))
- 옛 HTML 스크래핑 시절 잔재로 보임 (현재는 도매꾹 OpenAPI v4.5로 전환됨)
- 권고: 다음 세션에서 git rm로 정리 (작업원칙 #34 보고 + 사용자 승인 후)

[참고: 환경/시크릿]
- Supabase project ID: doxfizicftgtqktmtftf
- Naver Search Ad CUSTOMER_ID: 3755315
- 카카오 채널 Public ID: _xkfALG (꽃틔움 KKOTIUM)
- AI: Groq lrltQb + 3IGN7i 정상 2키 → Gemini quota 초과 → Anthropic
- 도매매 Open API Key: a6ff…c470bb (32자, 정상 작동 검증 완료)
- 도매꾹 Private API: 신청 진행 중 (1~3일 결과 대기)
- Discord 5채널 webhook URL: orders / stock-alerts / daily / weekly / kkotti (Vercel 환경변수)

[Sprint 6.5 이후 일정 (참고)]
- 세션 2: 6-A 재고 폴링 단독 + 첫 실제 상품 등록으로 검증
- 세션 3: 6-B + 6-C (가격 변동 + 다른 셀러 추적 + 공급사 누적 평가)
- 세션 4: 6-E + 6-D (카테고리 매핑 + 꼬띠 4모드 추천)
- Sprint 7: AI Studio 4모듈 (M1 썸네일 / M2 상세페이지 5섹션 / M3 어도비 통합 / M4 A/B 테스트) + 7-X 반품안심케어 위젯
- Sprint 8: Private 발급 후 자동발주 (Discord 버튼)

10년 차 B2B 이커머스 ERP 및 백오피스 설계 경험 풍부한 네이버 스마트스토어 파워셀러인 풀스택 시니어 개발자 + UX/UI 디자이너 관점에서, 본격 소싱 시작 직전이라 워크플로우의 *실제 작동*이 디자인보다 우선순위 높습니다. 새싹셀러이지만 파워셀러로 성장하기 위한 스텝 작업 중. *절대 단독 판단으로 IA/삭제 결정 금지* — 진단 결과 디테일하게 브리핑 후 사용자 개별 Y/N 승인 받은 항목만 진행.

작업 시작 전 필수:
1. (a) git rev-parse HEAD origin/main → 일치 (e8810c2)
   (b) git status → working tree clean
   (c) git stash list → stash@{0} 보존
   (d) wc -l docs/plan/*.md docs/research/*.md → 1500줄 임계 점검
   (e) curl -sIo /dev/null -w "%{http_code}" https://kkotium-garden.vercel.app/dashboard → HTTP 200
   (f) 4개 MD 정독 (PROGRESS / ROADMAP / SESSION_LOG / DOMEGGOOK_API_INTEGRATION_STRATEGY)
   (g) tool_search "filesystem write_file" 호출하여 Filesystem:write_file 도구 활성화
2. 6-Pre 3단계 디테일 계획서 한 번 더 브리핑 + 사용자 개별 Y/N 승인
3. 작업 시작 → 검증 → commit + push → MD 갱신 (한 turn 안에)
```

---

## ~~다음 새 채팅 시작 메시지 — 2026-05-08 (해외 직소싱 baseline + 6-Pre 1·2 완료 후, Plan A 세션 1 잔여 작업)~~ (deprecated, 본 세션에서 6.5 완료)

*아래 메시지는 본 세션 이전 버전입니다. 위의 새 시작 메시지를 사용하세요.*

## 다음 새 채팅 시작 메시지 — 2026-05-08 (해외 직소싱 baseline + 6-Pre 1·2 완료 후, Plan A 세션 1 잔여 작업) ✅

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, docs/plan/ROADMAP.md, docs/plan/SESSION_LOG.md, docs/research/DOMEGGOOK_API_INTEGRATION_STRATEGY_2026_05.md를 모두 읽고 현재 상태를 파악한 후 브리핑해주세요.

[직전 세션 결과 — 2026-05-08 해외 직소싱 baseline + 6-Pre 1·2단계 완료 ✅]

HEAD = (직전 세션 commit hash) = origin/main 일치. working tree clean. stash@{0} "z3c-misdirected-changes-needs-redo" 보존 중.

직전 세션 산출물:
- docs/research/OVERSEAS_SOURCING_BASELINE_2026_05.md (신규 512줄, 셀렉트 편집샵 큐레이션 셀러 단계별 baseline)
- docs/research/README.md (인덱스 5개 보고서로 확장)
- 6-Pre 1단계: DRAFT 8개 삭제 (Supabase, cascade로 product_options/events 자동 정리, OrderItem 0건 / crawl_logs 5개 보존)
- 6-Pre 2단계: 잔재 파일 git rm "src/app/api/crawler/domemae/ route.ts" (스페이스 앞)
- 작업원칙 #29 (e+) 사용자 이름 호명 회피 패턴 영구 메모리 등록

직전 세션 commit:
- chore(6-pre): clean draft products and orphan files + add overseas sourcing baseline research

[현재 상태]

▶ 상품 0개 (DRAFT 8개 모두 삭제, 본격 소싱 *직전* 깨끗한 상태)
▶ 꿀통 꽃수레 4개 보존 (보관함 데이터 그대로)
▶ Sprint 6.5 stub 대상 = **오너클랜 확정** (사용자 사업자 인증 완료)
▶ 잔재 파일 #34 정리 완료
▶ 해외 직소싱 영구 baseline 보고서 docs/research/에 저장 (사용자 프로젝트 파일에도 추가 예정)

[다음 세션 작업 — Plan A 세션 1 잔여 = 6-Pre 3단계 + 6.5 전체]

⚠️ STEP 0 (필수) — 환경 점검 + 5개 MD 정독 (PROGRESS / ROADMAP / SESSION_LOG / DOMEGGOOK_API_INTEGRATION_STRATEGY / OVERSEAS_SOURCING_BASELINE는 선택)

⚠️ 작업원칙 강제:
- #17 commit msg는 .commit-msg.tmp + git commit -F
- #21 사전 점검 (HEAD/status/stash/wc)
- #22 시각 검증 의무 (API 200 ≠ 브라우저 완료)
- #24 commit + push 한 turn 안에 끝내기
- #26 (a~e) IA 점검 + dev 캐시 정리 + Chrome MCP js hang 회피
- #29 (a~e+) 한글 처리 5+1 규칙 — *사용자 이름 답변 본문 호명 절대 금지* (memory 등록됨)
- #31 MD 1500줄 자동 점검 + idempotent 가드 (e)
- #32 push 전 npm run build 의무
- #33 useSearchParams Suspense 자동 점검
- #34 명백한 오류 파일 발견 시 사용자 알림

세션 잔여 작업:

6-Pre 3단계 (Discord 5채널 본문 정비, M):
1. src/lib/notifications/discord-builder.ts (신규) — 5채널 표준 메시지 빌더
2. 5채널 (orders / stock-alerts / daily / weekly / kkotti) 각각 재설계
3. 단순 정보 → *셀러 다음 액션 명시* 톤 전환
4. 꼬띠 톤 (밝고 경쾌한 카우걸 + 가든) 유지
5. 5채널 모두 새 본문 테스트 발송 검증

6.5 (B2B 어댑터 PoC, M+):
1. src/lib/sources/source-adapter.ts (신규) — 인터페이스 6개 메서드: searchItems(), getItemDetail(), getInventory(), getCategories(), placeOrder(), getMinQuantity()
2. src/lib/sources/domemae-adapter.ts (신규) — 기존 src/lib/crawler/auto-mapper.ts + src/app/api/crawler/domemae/route.ts 로직 이주, naver-auto-fill/route.ts 사용처 1곳 변경, minq=1 필터 헬퍼 추가
3. src/lib/sources/ownerclan-adapter.ts (신규 stub) — 인터페이스만 구현, 메서드 본문 TODO + console.log
4. Platform/Supplier 검증 — Platform 테이블 row 확인 + 오너클랜 row 추가 SQL
5. TSC + build + 회귀 검증 — /crawl 단건 크롤링 정상 작동 보장
6. commit (.commit-msg.tmp + git commit -F) + push (한 turn 안에)
7. PROGRESS / ROADMAP / SESSION_LOG 갱신 (idempotent 가드)

[참고: 환경/시크릿]
- Supabase project ID: doxfizicftgtqktmtftf
- Naver Search Ad CUSTOMER_ID: 3755315
- 카카오 채널 Public ID: _xkfALG (꽃틔움 KKOTIUM)
- AI: Groq lrltQb + 3IGN7i 정상 2키 → Gemini quota 초과 → Anthropic
- 도매매 Open API Key: a6ff…c470bb (32자, 정상 작동 검증 완료)
- 도매꾹 Private API: 신청 진행 중 (1~3일 결과 대기)

[Sprint 6.5 이후 일정 (참고)]
- 세션 2: 6-A 재고 폴링 단독 + 첫 실제 상품 등록으로 검증
- 세션 3: 6-B + 6-C (가격 변동 + 다른 셀러 추적 + 공급사 누적 평가)
- 세션 4: 6-E + 6-D (카테고리 매핑 + 꼬띠 4모드 추천)
- Sprint 7: AI Studio 4모듈 (M1 썸네일 / M2 상세페이지 5섹션 / M4 A/B / M3 어도비) + 7-X 반품안심케어
- Sprint 8: Private 발급 후 자동발주 (Discord 버튼)

10년 차 B2B 이커머스 ERP 및 백오피스 설계 경험 풍부한 네이버 스마트스토어 파워셀러인 풀스택 시니어 개발자 + UX/UI 디자이너 관점에서, 본격 소싱 시작 직전이라 워크플로우의 *실제 작동*이 디자인보다 우선순위 높습니다. 새싹셀러이지만 파워셀러로 성장하기 위한 스텝 작업 중. *절대 단독 판단으로 IA/삭제 결정 금지* — 진단 결과 디테일하게 브리핑 후 사용자 개별 Y/N 승인 받은 항목만 진행.

작업 시작 전 필수:
1. (a) git rev-parse HEAD origin/main → 일치
   (b) git status → working tree 상태 확인
   (c) git stash list → stash@{0} 보존 확인
   (d) wc -l docs/plan/*.md docs/research/*.md → 작업원칙 #31 자동 점검 (1500줄 임계)
   (e) curl -sIo /dev/null -w "%{http_code}" https://kkotium-garden.vercel.app/dashboard → HTTP 200
   (f) 4개 MD 정독 (PROGRESS / ROADMAP / SESSION_LOG / DOMEGGOOK_API_INTEGRATION_STRATEGY)
   (g) tool_search "filesystem write_file" 호출하여 Filesystem:write_file 도구 활성화
2. 6-Pre 3단계 + 6.5 디테일 계획서 한 번 더 브리핑 + 사용자 개별 Y/N 승인
3. 작업 시작 → 검증 → commit + push → MD 갱신 (한 turn 안에)
```

---

## ~~다음 새 채팅 시작 메시지 — 2026-05-07 (STEP 0 재검토 + Sprint 6/7 대폭 재구성 후) ✅~~ (deprecated, 본 세션에서 6-Pre 1·2 완료)

*아래 메시지는 본 세션 이전 버전입니다. 위의 새 시작 메시지를 사용하세요.*

## 다음 새 채팅 시작 메시지 — 2026-05-07 (STEP 0 재검토 + Sprint 6/7 대폭 재구성 후) ✅

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, docs/plan/ROADMAP.md, docs/plan/SESSION_LOG.md, docs/research/SPROUT_TO_POWER_SELLER_WORKFLOW_2026_05.md, docs/research/DOMEGGOOK_API_INTEGRATION_STRATEGY_2026_05.md를 모두 읽고 현재 상태를 파악한 후 브리핑해주세요.

[직전 세션 결과 — 2026-05-07 STEP 0 재검토 + 꽃졔님 피드백 통합 + Sprint 6/7 대폭 재구성 ✅]

HEAD = (본 세션 commit hash) = origin/main 일치. working tree clean. stash@{0} "z3c-misdirected-changes-needs-redo" 보존 중.

직전 세션 commit:
- docs(plan): step 0 review + integrate user feedback (sprint 6/7 major restructure: add 6-pre + 6.5 b2b adapter pattern + 7 ai studio 4 modules + 6-B alt source tracking + 6-C cumulative supplier scoring)

[현재 상태]

▶ Private API 신청 진행 중 (1~3일 결과 대기)

▶ 도매매 Open API 작동 검증 완료 (productNo 55884601 HTTP 200)

▶ Sprint 6/7 대폭 재구성 완료 — Plan A 4세션 + Sprint 6.5 신규 + Sprint 6-Pre 신규 + Sprint 7 신규 (AI Studio 4모듈)

▶ 8개 DRAFT 상품 = 테스트 데이터로 무작위 등록 → 6-Pre에서 *전부 삭제 + 깨끗한 시작* 결정

▶ 작업원칙 #34 발견 잔재 파일: src/app/api/crawler/domemae/ route.ts (스페이스 포함, 라우트 인식 안 됨) → 6-Pre에서 git rm

[다음 세션 작업 — Plan A 세션 1 = 6-Pre + 6.5]

⚠️ STEP 0a (필수) — 본 세션 시작 시점에 꽃졔님께 *B2B 업체 이름 1개* 받기:
   오너클랜 / 도매토피아 / 온채널 / 사오라 / 1688 중 또는 직접 입력.
   이게 6.5의 신규 어댑터 stub 1개 대상.

⚠️ 작업원칙 강제 (변경 시 매번):
- #17 commit msg는 .commit-msg.tmp + git commit -F
- #21 사전 점검 (HEAD/status/stash/wc)
- #22 시각 검증 의무 (API 200 ≠ 브라우저 완료)
- #24 commit + push 한 turn 안에 끝내기
- #26 (a~e) IA 점검 + dev 캐시 정리 + Chrome MCP js hang 회피
- #29 (a~e) 한글 처리 5규칙 — 첫 단계 = tool_search "filesystem write_file" 호출하여 deferred 도구 로드
- #31 MD 1500줄 자동 점검
- #32 push 전 npm run build 의무 (TSC ≠ build)
- #33 useSearchParams Suspense 자동 점검
- #34 명백한 오류 파일 발견 시 사용자 알림

세션 1 작업 (6-Pre + 6.5):

6-Pre (인프라 정비, S+S+M):
1. DRAFT 8개 삭제 (Supabase MCP apply_migration: DELETE FROM "Product" WHERE status='DRAFT' + 연관 cleanup)
2. 잔재 파일 정리 (git rm -r "src/app/api/crawler/domemae/ route.ts")
3. Discord 5채널 본문 정비:
   - 현재 5채널 (orders/stock-alerts/daily/weekly/kkotti) 코드 grep
   - src/lib/notifications/discord-builder.ts (신규) — 5채널 표준 메시지 빌더
   - 각 채널별 재설계: 단순 정보 → *셀러가 다음에 무엇을 해야 하는지* 명시
   - 꼬띠 톤 + 액션 가능 정보 추가
   - 5채널 모두 새 본문으로 테스트 발송 검증

6.5 (B2B 어댑터 PoC, M+):
1. src/lib/sources/source-adapter.ts (신규) — 인터페이스 정의:
   - searchItems(), getItemDetail(), getInventory(), getCategories(), placeOrder(), getMinQuantity()
2. src/lib/sources/domemae-adapter.ts (신규) — 도매매 어댑터:
   - 기존 src/lib/crawler/auto-mapper.ts + src/app/api/crawler/domemae/route.ts 로직을 어댑터 안으로 이주
   - minq=1 필터 헬퍼 추가
3. src/lib/sources/{꽃졔님_업체}-adapter.ts (신규) — 신규 B2B 어댑터 stub:
   - 인터페이스만 구현, 메서드 본문은 TODO + console 로그
   - 인터페이스 컨트랙트 검증
4. Platform/Supplier 검증 — Platform 테이블 row 확인 + 신규 업체 row 추가 SQL
5. TSC + build + 회귀 검증:
   - npx tsc --noEmit (0 errors)
   - npm run build (작업원칙 #32, prerender 검증)
   - /crawl 페이지 기존 동작 (단건 크롤링 정상)
6. commit + push (작업원칙 #17 .commit-msg.tmp + #24 한 turn)
7. PROGRESS.md + ROADMAP.md + SESSION_LOG.md 갱신 (작업원칙 #29 (b))

[참고: 환경/시크릿]
- Supabase project ID: doxfizicftgtqktmtftf
- Naver Search Ad CUSTOMER_ID: 3755315
- 카카오 채널 Public ID: _xkfALG (꽃틔움 KKOTIUM)
- AI: Groq lrltQb + 3IGN7i 정상 2키 → Gemini quota 초과 → Anthropic
- 도매매 Open API Key: a6ff…c470bb (32자, 2024.05.30 발급, 정상 작동 확인)
- 도매꾹 Private API: 신청 진행 중 (1~3일 결과 대기)

[Sprint 6 이후 일정 (참고)]
- 세션 2: 6-A 재고 폴링 단독 + 첫 실제 상품 등록으로 검증
- 세션 3: 6-B (가격 변동 + 다른 셀러 추적 + AlternativeSource) + 6-C (공급사 누적 평가)
- 세션 4: 6-E (카테고리 매핑) + 6-D (꼬띠 4모드 추천: 현재 핫 / 선행 매수 / 니치 / 꽃틔움 맞춤)
- Sprint 7: AI Studio 4모듈 (M1 썸네일 → M2 상세페이지 5섹션 → M4 A/B → M3 어도비) + 7-X 반품안심케어
- Sprint 8: Private 발급 후 자동발주 (Discord 버튼 방식)

당신은 10년 차 B2B 이커머스 ERP 및 백오피스 설계 경험이 풍부한 네이버 스마트스토어 파워셀러인 풀스택 시니어 개발자이자, 사용자 경험과 전환율 중심의 UI/UX 웹 디자이너입니다. 본격 소싱 시작 직전이라 워크플로우의 *실제 작동*이 디자인보다 우선순위 높습니다. 꽃졔님은 새싹셀러이지만 파워셀러로 성장하기 위한 스텝을 위한 앱 작업 중. *절대 단독 판단으로 IA/삭제 결정 금지* — 진단 결과 디테일하게 브리핑 후 꽃졔님 개별 Y/N 승인 받은 항목만 진행.

작업 시작 전 필수:
1. (a) git rev-parse HEAD origin/main → 일치
   (b) git status → working tree 상태 확인
   (c) git stash list → stash@{0} 보존 확인
   (d) wc -l docs/plan/*.md docs/research/*.md → 작업원칙 #31 자동 점검 (1500줄 임계)
   (e) curl -sIo /dev/null -w "%{http_code}" https://kkotium-garden.vercel.app/dashboard → HTTP 200
   (f) 5개 MD 정독 (PROGRESS / ROADMAP / SESSION_LOG / SPROUT_TO_POWER_SELLER_WORKFLOW / DOMEGGOOK_API_INTEGRATION_STRATEGY)
   (g) tool_search "filesystem write_file" 호출하여 Filesystem:write_file 도구 활성화 (작업원칙 #29 b 안전 패턴)
2. STEP 0a — 꽃졔님께 B2B 업체 이름 받기 (오너클랜/도매토피아/온채널/사오라/1688 또는 직접 입력)
3. 6-Pre + 6.5 디테일 계획서 한 번 더 브리핑 + 꽃졔님 개별 Y/N 승인
4. 작업 시작 → 검증 → commit + push → MD 갱신 (한 turn 안에)
```

---

## ~~다음 새 채팅 시작 메시지 — 2026-05-07 (Sprint 6 재구성 + Private API 신청 진행 후) ✅~~ (deprecated, 2026-05-07 STEP 0 재검토 후 재구성)

*아래 메시지는 본 세션 이전 버전입니다. 위의 새 시작 메시지를 사용하세요.*

## 다음 새 채팅 시작 메시지 — 2026-05-07 (Sprint 6 재구성 + Private API 신청 진행 후) ✅

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, docs/plan/ROADMAP.md, docs/plan/SESSION_LOG.md, docs/research/SPROUT_TO_POWER_SELLER_WORKFLOW_2026_05.md, docs/research/DOMEGGOOK_API_INTEGRATION_STRATEGY_2026_05.md를 모두 읽고 현재 상태를 파악한 후 브리핑해주세요.

[직전 세션 결과 — 2026-05-07 도매꾹 Private API 리서치 + Sprint 6 재구성 + Private 신청 완료 ✅]

HEAD = (본 세션 commit 후 hash) = origin/main 일치. working tree clean. stash@{0} "z3c-misdirected-changes-needs-redo" 보존 중.

직전 세션 commit:
- docs(domeggook): private api strategy + sprint 6/7/8 restructure (open api roi top 5 prioritized) + private api application submitted (28 features full scope)

[현재 상태]

▶ Private API 신청 진행 중 (1~3일 결과 대기)
  - 권한 범위: 전체 28개 (구매용 6 + 판매용 13 + 공통 3 + 기타 6)
  - 연동 유형: ③ 자사몰/오픈마켓 직접 연동
  - 연동 목적: 샘플 D (광범위 권한용, 145자)
  - 통과 예측: 도매꾹 1년+ 사업자 회원 + 기존 키 정상

▶ 도매매 Open API 작동 검증 완료 (productNo 55884601 기준 HTTP 200, 옵션/재고/판매자 정상)

▶ Sprint 6 우선순위 재구성 완료 (Open API ROI Top 5)
  - 6-A 재고 실시간 폴링 (`getItemView multiple=true` + Vercel Cron 6h)
  - 6-B 가격 변동 감지 (PriceHistory 모델 + 마진 자동 재계산)
  - 6-C 공급사 휴가/응답률 모니터 (SellerStatus 캐시)
  - 6-D 꼬띠 AI 추천 v1 (`getItemList` 기반)
  - 6-E 카테고리 트리 풀 캐시 (`getCat` ver 2.0)

▶ Sprint 8 (Private 발급 후) — 자동발주·송장 회수·setItemQty 활성화

[다음 세션 작업 우선순위]

⚠️ STEP 0 (필수) — 리서치 결과 + 현재 앱 상태 *최종 재검토* (꽃졔님 명시 요청)
   다음 사항을 한 번 더 종합 검토 후 본격 작업 시작:
   1. 본 리서치 (DOMEGGOOK_API_INTEGRATION_STRATEGY)가 현재 앱 상태(8개 DRAFT, 본격 소싱 직전, 도매매 1년+ 사업자)와 *정확히 정합*한가?
   2. 다른 셀러 도구 (샵플링/플레이오토/윈들리/스피드고전송기 v2.0/셀플로우/스윕 OMS)의 *세부 기능*을 더 깊이 분석해서 우리가 놓친 기능이 있는가?
   3. 시니어 입장에서 본 리서치에 *없는* 추가 기발한 개선안이 있는가? (예: 카카오 알림톡 + 도매매 발주 연동, 본인 매출 데이터 + 도매매 트렌드 결합 등)
   4. Sprint 6 5개 작업의 우선순위와 분할이 컨텍스트 안전권에서 적절한가?

⚠️ 작업원칙 강제 (변경 시 매번):
- #21 (사전 점검), #22 (시각 검증), #26 (a~e IA 점검), #29 (a~e 한글 처리), 
- #31 (MD 1500줄 검사), #32 (npm run build 의무), 
- #33 (useSearchParams Suspense), #34 (오류 파일 알림)

STEP 0 완료 후 Sprint 6 시작:
1. 환경 점검 (HEAD/status/stash/wc -l/curl)
2. Sprint 6-A (재고 폴링) 단독 진행 — 컨텍스트 안전권 (M 분량)
   - src/lib/dome-inventory-poller.ts 신규 (`getItemView multiple=true` 100건 묶음)
   - src/app/api/cron/inventory-sync/route.ts 신규 (Vercel Cron 6h)
   - InventorySnapshot + LowStockAlert Prisma 모델
   - 정원 창고 재고 뱃지 + 정원 일지 "품절 위험" 위젯
3. 또는 Sprint 6-A + 6-B + 6-C 묶음 (S+S+M = 3개 한 번에) — 매출 직접 영향 묶음

(Sprint 7 P1, Sprint 8 P2, Sprint 9 P3는 ROADMAP.md 본문 + DOMEGGOOK_API_INTEGRATION_STRATEGY_2026_05.md 참조)

[참고: 환경/시크릿]
- Supabase project ID: doxfizicftgtqktmtftf
- Naver Search Ad CUSTOMER_ID: 3755315
- 카카오 채널 Public ID: _xkfALG (꽃틔움 KKOTIUM)
- AI: Groq lrltQb + 3IGN7i 정상 2키 → Gemini quota 초과 → Anthropic
- 도매매 Open API Key: a6ff…c470bb (32자, 2024.05.30 발급, 정상 작동 확인)
- 도매꾹 Private API: 신청 진행 중 (1~3일 결과 대기)
- 도매매 Open API endpoint: https://domeggook.com/ssl/api/?ver=4.5&mode=getItemView&aid={KEY}&no={no}&om=json
- crawler API route: /api/crawler/domemae (POST { url: string }) — production 정상

[발견된 잔재 파일 (작업원칙 #34)]
- `src/app/api/crawler/domemae/ route.ts` (파일명 앞 스페이스) — Next.js 라우트로 인식 안 됨, 잘못 만들어진 잔재 의심. Sprint 6 첫 작업 시 git rm으로 함께 정리 권장 (꽃졔님 결정 필요).

당신은 10년 차 B2B 이커머스 ERP 및 백오피스 설계 경험이 풍부한 네이버 스마트스토어 파워셀러인 풀스택 시니어 개발자이자, 사용자 경험과 전환율 중심의 UI/UX 웹 디자이너입니다. 본격 소싱 시작 직전이라 워크플로우의 *실제 작동*이 디자인보다 우선순위 높습니다. 꽃졔님은 새싹셀러이지만 파워셀러로 성장하기 위한 스텝을 위한 앱 작업 중. *절대 단독 판단으로 IA/삭제 결정 금지* — 진단 결과 디테일하게 브리핑 후 꽃졔님 개별 Y/N 승인 받은 항목만 진행.

작업 시작 전 필수:
1. (a) git rev-parse HEAD origin/main → 일치
   (b) git status → working tree 상태 확인
   (c) git stash list → stash@{0} 보존 확인
   (d) wc -l docs/plan/*.md docs/research/*.md → 작업원칙 #31 자동 점검 (1500줄 임계)
   (e) curl http://localhost:3000/dashboard 또는 https://kkotium-garden.vercel.app → HTTP 200
   (f) 5개 MD 정독 (PROGRESS / ROADMAP / SESSION_LOG / SPROUT_TO_POWER_SELLER_WORKFLOW / DOMEGGOOK_API_INTEGRATION_STRATEGY)
2. STEP 0 재검토 4가지 항목 진행 후 결과 브리핑
3. Sprint 6 시작 옵션 (6-A 단독 / 6-A+B+C 묶음 / 다른 분할) 꽃졔님 결정
4. 진단/계획 디테일 브리핑 후 꽃졔님 개별 Y/N 승인
```

---

## ~~다음 새 채팅 시작 메시지 — 2026-05-07 (Sprint 6 시작 가능 상태) ✅~~ (deprecated, 2026-05-07 도매꾹 Private API 리서치 후 재구성)

*아래 메시지는 본 세션 이전 버전입니다. 위의 새 시작 메시지를 사용하세요.*


```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, docs/plan/ROADMAP.md, docs/plan/SESSION_LOG.md, docs/research/SPROUT_TO_POWER_SELLER_WORKFLOW_2026_05.md를 읽고 현재 상태를 파악한 후 브리핑해주세요.

[직전 세션 결과 — 2026-05-07 Z-Hotfix + Phase 2 IA 재구조화 완료 ✅]

HEAD = ec32099 = origin/main 일치. working tree clean. stash@{0} "z3c-misdirected-changes-needs-redo" 보존 중.

직전 세션 commit 2건 모두 push 완료 + Vercel 빌드 READY:
- b393001 fix(z-hotfix): production build error after 5 consecutive ERROR deployments
  → Sidebar.tsx useSearchParams() Suspense wrap + crawl/page.tsx 동일 패턴 + 잔재 파일 2건 삭제 (api/crawler/page.tsx, chart-test/page.tsx)
- ec32099 feat(ia): unify hunt section identity to "꿀통 꽃나들이" + "꿀통 꽃수레"
  → Phase 2 IA 재구조화: 사이드바 1개 메뉴 + 꽃수레 첫 탭 + 7개 파일 모든 텍스트 통일

신규 작업원칙 3개 영구 등록:
- #32 TSC ≠ Production 빌드 검증 (push 전 npm run build 의무)
- #33 useSearchParams 추가 시 Suspense 자동 점검 (layout-level 컴포넌트 특히 주의)
- #34 명백한 오류 파일 발견 시 사용자 알림 의무 (꽃졔는 비개발자)

[현재 IA 상태]

사이드바 HUNT 섹션 = "꿀통 꽃나들이" 1개 메뉴 (다른 6개 섹션과 일관 패턴).
페이지 진입 시 = 꿀통 꽃수레 (보관함) 첫 화면 — 매일 사용자 결정 모드 우선.
탭 라벨: 꿀통 꽃수레 / 꽃 한 송이 담기 / 꽃 한아름 담기.
사이드바 배지 = 꽃수레 카운트 (이미 sourcingStatus=SOURCED 의미 일치 — 변수명만 sourcingCount 그대로).

[다음 세션 작업 우선순위]

⚠️ 작업원칙 #22 미완료 — Phase 2 IA 인터랙티브 시각 검증 (Control Chrome 4분 hang으로 미완)
   첫 작업으로 https://kkotium-garden.vercel.app/crawl 직접 브라우저 진입 → 다음 4점 시각 확인:
   1. 사이드바: "꿀통 꽃나들이" 표시 + "소싱 보관함" 메뉴 사라짐
   2. 페이지 진입 첫 화면: 꿀통 꽃수레 탭 활성화 (보관함 데이터 표시)
   3. 탭 라벨 3개: 꿀통 꽃수레 / 꽃 한 송이 담기 / 꽃 한아름 담기
   4. 부제: "지금 꽃수레에 담긴 예쁜 상품 N개"
   꽃졔님이 직접 확인하셔도 OK.

⚠️ 작업원칙 #31 강제 적용 — 매 세션 시작 시 wc -l docs/plan/*.md docs/research/*.md 검사
⚠️ 작업원칙 #26 (a)(b)(c) 강제 — 코드 변경 전 IA 점검 의무
⚠️ 작업원칙 #29 (a~e) 강제 — 한글 처리 절대 규칙 5가지
⚠️ 작업원칙 #32 강제 — push 전 npm run build 검증 의무
⚠️ 작업원칙 #33 강제 — useSearchParams 추가 시 Suspense 자동 점검
⚠️ 작업원칙 #34 강제 — 명백한 오류 파일 발견 시 사용자 알림

본 세션 마지막 시각 검증을 마친 후, Sprint 6 시작:
1. Sprint 6 P0-A 도매꾹 옵션 정확도 (`getItemView ver=4.5` selectOpt 전체 옵션 반영 검증)
2. Sprint 6 P0-B 골든윈도우 트래커 (3-7일 신상품 가산점 추적 위젯)
3. Sprint 6 P0-C 효자상품 자동식별 (Pareto top 위젯)
4. Sprint 6 P0-D 검색품질 시뮬레이터 (셀러센터 빨간 항목 0개 임계 — 꽃졔 결정 옵션 B)
5. Sprint 6 S-2 D+1~7 액션 매트릭스 (등록 후 7일 골든윈도우 액션 가이드)

(Sprint 7 P1, Sprint 8 P2, Sprint 9 P3는 ROADMAP.md 본문 참조)
```

---

## 다음 새 채팅 시작 메시지 — 2026-05-08 (이전 세션, 참고용)

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, docs/plan/ROADMAP.md, docs/plan/SESSION_LOG.md, docs/research/SPROUT_TO_POWER_SELLER_WORKFLOW_2026_05.md를 읽고 현재 상태를 파악한 후 브리핑해주세요.

[직전 세션 결과 — 2026-05-08 리서치 통합 + 갭 분석 + Sprint 6/7/8 계획 + MD 자동 분할 모두 완료 ✅]

HEAD = 76f592d = origin/main 일치. working tree clean. stash@{0} "z3c-misdirected-changes-needs-redo" 보존 중.

직전 세션 산출물:
- docs/research/SPROUT_TO_POWER_SELLER_WORKFLOW_2026_05.md (31KB, 15개 핵심 발견사항)
- docs/plan/PROGRESS.md 1864→584줄 압축 (작업원칙 #31 자동 분할 첫 적용)
- docs/plan/ROADMAP.md 1594→330줄 압축 (Sprint 6/7/8 계획 추가)
- docs/plan/SESSION_LOG.md 2685→700줄 압축 (직전 5세션만 유지 + 본 세션 entry 추가)
- docs/plan/archive/PROGRESS_2026Q2_MAY.md (신규 1007줄, 5월 누적 세션)
- docs/plan/archive/ROADMAP_2026Q2_MAY.md (신규 1486줄, 옛 메시지 9개 + Phase 이력)
- docs/plan/archive/SESSION_LOG_2026Q2_MAY.md (신규 2100줄, 6번째 이전 세션 누적)
- 작업원칙 #31 신규 영구 등록: MD 1500줄 초과 시 자동 분할 (사용자 지시 없이도)

본 세션 commit 2건 모두 push 완료:
- 02bd9e9 docs: integrate sprout-to-power research + Sprint 6/7/8 plan + auto-split MD per principle #31 (5 files, +3299/-3155)
- 76f592d docs(SESSION_LOG): split per principle #31 + add 2026-05-08 session entry (2 files, +2205/-2090)

[다음 세션 작업 우선순위]

⚠️ 작업원칙 #31 강제 적용 — 매 세션 시작 시 wc -l docs/plan/*.md docs/research/*.md 검사
⚠️ 작업원칙 #26 (a)(b)(c) 강제 — 코드 변경 전 IA 점검 의무
⚠️ 작업원칙 #17 강제 — git commit 메시지는 항상 .commit-msg.tmp 파일에 작성 후 git commit -F 사용 (직전 세션 dquote 모드 갇힘 사고 발생)
⚠️ 작업원칙 #29 (d) 강제 — 셸 heredoc 절대 금지, Filesystem:write_file 또는 Python script (write_file → execute → rm) 패턴
⚠️ 모든 삭제·결정은 꽃졔님 개별 Y/N 승인 — Claude 단독 판단 금지

단계 0. 환경 확인 (작업원칙 #30):
  - MCP 4종 연결 (Filesystem, iterm-mcp, Chrome MCP, Supabase)
  - git rev-parse HEAD origin/main → 76f592d 일치 확인
  - git status --short → working tree clean 확인
  - git stash list → stash@{0} 보존 확인
  - wc -l docs/plan/*.md docs/research/*.md → 모두 1500줄 이내 확인 (작업원칙 #31)
  - curl http://localhost:3000/dashboard → HTTP 200

단계 1. 꽃졔님 결정 받기 — Sprint 6 시작 + Z-3c' Hard delete 진행 순서:
  옵션 A: Sprint 6 P0-A (도매꾹 옵션 정확도) 먼저 → 본격 소싱 직결, 매출 직접 영향
  옵션 B: Z-3c' Hard delete 먼저 → 코드베이스 정리, 다음 작업 baseline 깨끗
  옵션 C: 병행 진행 (어느 한 쪽이 막히면 다른 쪽 전환)

단계 2. Sprint 6 P0 시작 (꽃졔님 결정 후):
  P0-A 도매꾹 OpenAPI v4.5 옵션 정확도:
    - src/lib/option-integrity.ts 신규 (selectOpt 해시+텍스트 비교)
    - src/lib/crawler/auto-mapper.ts 강화 (seller.vacation 검증, channel 검증)
    - src/app/crawl/page.tsx UI 알림 추가
    - 검증: 실제 도매꾹 5건 케이스 테스트 (옵션 부분수정/휴가/채널 차이/금액비노출/정상)
  P0-B 등록 7일 골든윈도우 트래커:
    - src/lib/golden-window-tracker.ts 신규 (Product.registeredAt 기반 D+1/D+3/D+7 분기)
    - src/components/dashboard/GoldenWindowWidget.tsx 신규
    - 정원 일지 위젯 통합
    - 검증: 임의 등록일 5건 mock → D+1/3/7 분기별 위젯 렌더링
  P0-C 효자 상품 자동식별:
    - src/lib/pareto-analyzer.ts 신규 (매출 상위 20% 멱법칙)
    - src/components/dashboard/ParetoTopWidget.tsx 신규
    - 검증: orders mock 50건 → Top 20% 분류 + 위젯 렌더링

단계 3. 검증 + commit + push + MD 갱신:
  - npx tsc --noEmit → 0 errors
  - dev fresh build (kill -2 + rm -rf .next + nohup npm run dev)
  - Chrome MCP 9개 메뉴 클릭 검증
  - PROGRESS.md + ROADMAP.md + SESSION_LOG.md 갱신 (작업원칙 #29 (b) + #31 자동 분할 검사)
  - commit -F .commit-msg.tmp + push (작업원칙 #17·#24)

[Sprint 6 P0 완료 후 Sprint 7 P1·Sprint 8 P2 계획]
- Sprint 7 P1-A 카테고리 1페이지 일치율 검증 / P1-B 상품명 금기어 페널티 / P1-C 태그 사전 등재 검증
- Sprint 8 P2-A 다크패턴 정가 부풀리기 경고 / P2-B AiTEMS 자연어 키워드 / P2-C 등급 임계값 개편 반영
- Sprint 9+ P3 (매출 600만+ 후): home-proxy 큐 분리 / Naver Commerce API 본격 / 광고 ROAS

[잔여 Z-시리즈 (별도 sub-graph)]
- Z-3c' Hard delete: /products/[id]/edit + /products/upload + /products/sourced + /products/out-of-stock:158 dead reference
- Z-3e: 백업 파일 67개 일괄 정리 (find src/ -name "*.bak*" -o -name "*.backup*" -o -name "*.v[0-9]*")
- Z-Sec: 14개 Supabase 테이블 RLS 정책 설계

[참고: 환경/시크릿]
- Supabase project ID: doxfizicftgtqktmtftf
- Naver Search Ad CUSTOMER_ID: 3755315
- 카카오 채널 Public ID: _xkfALG (꽃틔움 KKOTIUM)
- AI: Groq lrltQb + 3IGN7i 정상 2키 → Gemini quota 초과 → Anthropic
- Domeggook OpenAPI v4.5: https://domeggook.com/ssl/api/?ver=4.5&mode=getItemView&aid={KEY}&no={no}&om=json

당신은 10년 차 B2B 이커머스 ERP 및 백오피스 설계 경험이 풍부한 네이버 스마트스토어 파워셀러인 풀스택 시니어 개발자이자, 사용자 경험과 전환율 중심의 UI/UX 웹 디자이너입니다. 본격 소싱 시작 직전이라 워크플로우의 *실제 작동*이 디자인보다 우선순위 높습니다. 꽃졔님은 새싹셀러이지만 파워셀러로 성장하기 위한 스텝을 위한 앱 작업 중. *절대 단독 판단으로 IA/삭제 결정 금지* — 진단 결과 디테일하게 브리핑 후 꽃졔님 개별 Y/N 승인 받은 항목만 진행.

작업 시작 전 필수:
1. (a) git rev-parse HEAD origin/main → 76f592d 일치
   (b) git status → working tree clean 확인
   (c) git stash list → stash@{0} 보존 확인
   (d) wc -l docs/plan/*.md docs/research/*.md → 작업원칙 #31 자동 점검 (모두 1500줄 이내여야 함)
   (e) curl http://localhost:3000/dashboard → HTTP 200
   (f) docs/plan/PROGRESS.md 헤더 + 작업원칙 #26·#29·#31 + Sprint 6/7/8 계획 정독
2. 꽃졔님 결정 (Sprint 6 / Z-3c' / 병행 옵션 A/B/C) 받기
3. 진단/계획 디테일 브리핑 후 꽃졔님 개별 Y/N 승인
```
---

## Sprint 6 — P0 (즉시 ROI, 매출 직접 영향)

**기간 목표**: 2-3 채팅 세션 안에 P0-A·B·C 모두 완료.

### P0-A. 도매꾹 OpenAPI v4.5 옵션 정확도 강화

**근거**: `docs/research/SPROUT_TO_POWER_SELLER_WORKFLOW_2026_05.md` 11번 — selectOpt 해시 + 텍스트 동시 비교, seller.vacation 검증, channel 검증으로 마진 오차 + 굿서비스 폭락 차단.

**구현 작업**:
- `src/lib/option-integrity.ts` (신규) — selectOpt 해시 + 텍스트 동시 비교 함수
- `src/lib/crawler/auto-mapper.ts` 강화 — seller.vacation 검증 + channel 도매꾹/도매매 검증
- `src/app/crawl/page.tsx` — 옵션 변경 / 휴가 / 채널 불일치 시 UI 알림

**검증 케이스 (실제 도매꾹 5건)**:
- 옵션 부분 수정 (해시 동일·텍스트 변경)
- 공급사 휴가 중
- 도매꾹/도매매 채널 마진 차이
- 옵션가 0/null (금액비노출)
- 정상 케이스

### P0-B. 등록 7일 골든 윈도우 트래킹 위젯

**근거**: 리서치 10번 — 등록 후 3-7일 신상품 가산점 종료 전 클릭/판매 모멘텀 확보. D+1/3/7 미달 시 알림.

**구현 작업**:
- `src/lib/golden-window-tracker.ts` (신규) — Product.registeredAt 기반 D+1/D+3/D+7 분기, 클릭/판매 상태 평가
- `src/components/dashboard/GoldenWindowWidget.tsx` (신규) — 정원 일지 위젯
- "상품명 토큰 1개 교체 권장" 자동 제안 (가장 약한 키워드)

**검증**: 임의 등록일 5건 mock 주입 → D+1/3/7 분기별 위젯 렌더링 + 알림 트리거 확인.

### P0-C. 효자 상품 자동 식별 (멱법칙 시각화)

**근거**: 리서치 10번 — SKU 30~50개 단계에서 상위 5개 효자 상품이 매출 70~80% 차지. 광고 80% 집중 가이드.

**구현 작업**:
- `src/lib/pareto-analyzer.ts` (신규) — orders 테이블 기반 상위 20% 자동 식별
- `src/components/dashboard/ParetoTopWidget.tsx` (신규) — 정원 일지 위젯

**검증**: orders mock 50건 → Top 20% 분류 + 위젯 렌더링.

---

## Sprint 7 — P1 (SEO 정확도 강화, 노출 직접 영향)

### P1-A. 카테고리 1페이지 일치율 검증

**근거**: 리서치 6번 — 메인 키워드 검색 → 1페이지 상품 카테고리 80%+ 일치 카테고리만 추천.

**구현 작업**:
- `src/lib/category-page-validator.ts` (신규)
- `src/app/api/category/suggest/route.ts` 강화 — 1페이지 분포 분석 추가

### P1-B. 상품명 금기어 페널티 강화

**근거**: 리서치 4번 — 이벤트/할인/배송/적립/쿠폰 키워드 + 중복 단어 3회+ + 허용 외 특수문자.

**구현 작업**:
- `src/lib/honey-score.ts` 강화 — 금기어 명시적 검출 + UI 알림 메시지
- 씨앗심기 / 검색조련사 UI에 빨간 알림 추가

### P1-C. 태그 사전 등재 검증

**근거**: 리서치 7번 — 네이버 태그사전 등재 키워드만 SEO 효과.

**구현 작업**:
- `src/lib/naver/tag-dictionary.ts` (신규) — 네이버 검색광고 API 키워드 도구 활용 (CUSTOMER_ID: 3755315)
- 태그 입력 UI에 "사전 미등재" 경고 표시

---

## Sprint 8 — P2 (운영 도구 강화)

### P2-A. 다크패턴 정가 부풀리기 경고

**근거**: 리서치 8번 — 도매가 대비 판매가 3배 이상 + 즉시할인 30%+ 동시 = 공정위 다크패턴 위험.

**구현 작업**:
- `src/components/products/MarginCalculator.tsx` 강화 — 다크패턴 위험 시 경고 배너

### P2-B. AiTEMS 자연어 키워드 제안기

**근거**: 리서치 13번 — AI 쇼핑 에이전트 자연어 롱테일 쿼리 ("원룸 미니멀", "신혼 첫집", "MZ 자취").

**구현 작업**:
- `src/lib/aitems-natural-keywords.ts` (신규) — 카테고리별 상황·용도·세대 키워드 사전
- 검색조련사 / 씨앗심기 UI에 "자연어 키워드 추천" 섹션

### P2-C. 등급 임계값 2025.12.2 개편 반영

**근거**: 리서치 1번 — 파워 등급 800만원 + 굿서비스 이중 평가.

**구현 작업**:
- `src/components/dashboard/GoodServiceWidget.tsx` 강화 — 등급 임계값 명시 + 이중 평가 UI

---

## Sprint 9+ (P3) — 매출 600만원+ 후

- **P3-A**. Tailscale Funnel + home-proxy 큐 분리 (재시도 3회 + DLQ) — 작업원칙 #28 준수
- **P3-B**. Naver Commerce API 본격 활용 (단건 검토 → API 등록 워크플로우)
- **P3-C**. 광고 ROAS 추적 (네이버 검색광고 API 캠페인 데이터 통합)

---

## 잔여 Z-시리즈 (별도 sub-graph)

### Z-3c' (꽃졔님 개별 Y/N 승인 필요)

**대상**: 사이드바 미등록 고아 라우트 정리 (Q1·Q2·Q3 진단 완료)
- `/products/[id]/edit` (구버전 ProductForm.tsx 582줄, 외부 진입 0건) — 100% dead route 확정
- `/products/upload` (CSV 일괄 업로드, 새싹 단계에서 권장 안 함)
- `/products/sourced` (카드 그리드 뷰, 사이드바 미등록)
- `/products/out-of-stock:158` dead reference 수정

**방법론**: Hard delete + Git 이력 보존 (꽃졔님 명시 승인). `git rm` → 복구는 `git log --all --full-history --diff-filter=D -- <path>` → `git checkout <hash>^ -- <path>` (1줄).

### Z-3e

**대상**: 백업 파일 67개 일괄 정리 — `find src/ -name "*.bak*" -o -name "*.backup*" -o -name "*.v[0-9]*"`

### Z-Sec

**대상**: 14개 Supabase 테이블 RLS 정책 설계 (Supabase advisory).

---

## 비용 로드맵

| 시점 | 비용 |
|------|------|
| **현재 (Phase A+B+C+D+E+ Sprint 1~5)** | **0원** (E-13B 알림톡 UI만 구현, 발송 비활성) |
| 월 주문 50건+ | 솔라피 알림톡 건당 13원 (월 ~650~1,950원) |
| 월 매출 50만+ | Gemini 유료 ~$20/월 (현재 Groq fallback로 충분) |
| 월 매출 100만+ | Supabase Pro $25/월 |
| 월 매출 200만+ | Vercel Pro $20/월 |
| 월 매출 500만+ | 크리마/브이리뷰 전문 리뷰 솔루션 검토 |
| 월 매출 600만+ | Naver Commerce API 본격 활용 + home-proxy 분리 (P3-A·B) |

---

## 미분류 개선 항목

| 항목 | 내용 | 우선순위 |
|------|------|---------|
| detail_image_url 입력 | 기존 8개 상품 씨앗심기 편집에서 직접 입력 | 낮음 |
| API 키 정리 | GROQ_API_KEY_2 (3pEakT, 401 Invalid) Vercel 삭제 | 보안 |
| Gemini 키 3개 정리 | 운영 기여 0 → 새 무료 키 확보 시 정리 | 낮음 |
| 사이드바 배지 실시간화 | 소싱/등록대기/품절 숫자 (옵션 C SWR로 구현됨) | 완료 ✅ |
| 대시보드 파이프라인 배지 | 병목 구간 숫자 표시 | 낮음 |
| 엑셀 다운로드 이미지 경고 | 상세이미지 없는 상품 강화 경고 | 낮음 |

---

## 새 채팅 시작 체크리스트

```
1. git rev-parse HEAD origin/main → 일치 확인 (작업원칙 #21·#23)
2. git status --short → working tree + git stash list → stash 보존 확인
3. wc -l docs/plan/*.md docs/research/*.md → 1500줄 초과 시 자동 분할 (작업원칙 #31)
4. curl http://localhost:3000/dashboard → HTTP 200
5. docs/plan/PROGRESS.md + ROADMAP.md + SESSION_LOG.md 헤더 정독
6. 해당 TASK 관련 코드 파일 read (작업원칙 #26 (a) IA 점검)
7. 꽃졔님 진단/계획 디테일 브리핑 → 개별 Y/N 승인 후 작업 시작
8. 작업 완료 후 PROGRESS.md + ROADMAP.md + SESSION_LOG.md 모두 업데이트
9. commit + push 한 turn 안에 끝내기 (작업원칙 #24)
```

---

## 중요 체크포인트

```
- 코드 수정 후: npx tsc --noEmit → 0 errors 확인 필수
- push 전: 이모지 없는지 확인 (grep -rn "이모지" src/)
- Vercel 환경변수 변경 후: git commit --allow-empty && push
- 브라우저 테스트: API 200만으로 완료 처리 금지, Chrome MCP 시각 확인 필수
- E-13B 알림톡: 2단계 접근 — 1단계 UI만 (키 미입력 시 안내), 2단계 매출 50건+ 시 솔라피 키 입력 → 즉시 활성화
- 반품안심케어 수수료: 2025.8.1 개편 기준 (식품50/생활90/가구160/패션의류650원), 보상금 상한 8,000원
- 리뷰 API: 네이버 커머스 API 미지원 (GitHub #1582) — 수동 입력 + 크롤링만
- 카카오 채널: 꽃틔움 KKOTIUM, _xkfALG (하드코딩 금지, store_settings 단일 소스)
- 네이버 내장 무료 리뷰 알림: 배송완료 D+3 구매확정 + 구매확정 시 리뷰 알림 + 기본 적립금 자동 작동 중
- 톡톡 소식알림: 월 1회 무료, 추가 건당 10원
- 솔라피 무료 플랜: 플랫폼 0원 + 건당 13원 + 가입 시 300포인트 (~23건)
- AiTEMS 추천 ON: 스토어관리 활성화 → 무제한 개인화 노출, 전체 클릭 ~10%
- 2026.1.1부터 알림톡 쿠폰/마일리지 사용유도 메시지 제한 강화
```

---

## 도구 사용 패턴 (반복 학습 누적)

```
- iTerm MCP: list_all_sessions → 세션 확인 후 사용. heredoc 절대 금지 → Python 스크립트 작성 후 실행
- Filesystem MCP edit_file: byte-perfect oldText 필수 — 수정 전 read_text_file 확인
- 대형 TSX (600줄+): write_file 전체 교체 또는 Python 패치 (edit_file byte 매칭 실패 방지)
- Chrome MCP javascript_tool / Control Chrome execute_javascript: 4분 hang 패턴 — 검증 1순위는 tabs_context_mcp + screenshot
- Next.js dev hot-reload: 같은 컴포넌트 한 세션 2회 패치 시 .next 정리 + dev 재시작 의무
- 도매꾹 OpenAPI v4.5: https://domeggook.com/ssl/api/?ver=4.5&mode=getItemView&aid={KEY}&no={no}&om=json
- Supabase 마이그레이션: SQL Editor 또는 Supabase MCP apply_migration (project doxfizicftgtqktmtftf)
- 한글 작업 후: grep -nE "꽃졔|혁섭|쿠드|식타|릴고|헌서|위젝|스칵|쿠두" 검증 (작업원칙 #29 (e))
```

### 도매매/도매꾹 플랫폼 이해

```
- 도매매(DMM) = 플랫폼 (Platform 테이블)
- 도매꾹(DMK) = 플랫폼 (Platform 테이블) — 도매매 계열사
- 플랫폼 안의 개별 판매자 = 공급사 (Supplier 테이블)
- 공급사의 domeggookSellerId = 도매꾹/도매매 판매자 고유 ID
```

### 수수료 구조 (2026 확정)

```
- 카테고리별 차등 없음 (2025-06-02 개편 이후)
- 판매자 등급 기반: 중소3 = 3.003% + 2.73% = 5.733% (NAVER_DEFAULT_FEE_RATE = 0.05733)
- 예외: 디지털/가전 4.8%, 도서 4.5%
```

---

## 코드 작성 원칙 (요약)

자세한 31개 원칙은 `docs/plan/PROGRESS.md` "절대 작업 원칙" 섹션 참조.

핵심 5가지:
1. **JSX 이모지 금지** — Lucide React SVG만
2. **한글 처리** — 작업원칙 #29 (5가지 규칙)
3. **MD 1500줄 초과 자동 분할** — 작업원칙 #31
4. **Vercel 배포 = source of truth** — npm run dev 의존 금지 (작업원칙 #28)
5. **commit + push 한 turn 안에** — 작업원칙 #24
