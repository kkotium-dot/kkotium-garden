# KKOTIUM GARDEN — ROADMAP

> **최종 업데이트**: 2026-05-27 PM B-13 PLANT 비주얼탭 액션블록 스코프 정합 (Code turn, 1 파일 +3/-3) — `autoRunVisual` 체크박스 + 네이버 직접 등록/엑셀 다운로드 버튼이 7탭 전부 노출되던 회귀 해소. 직전 B-12 + B-11 fix는 commit f244a48에 적용 완료.
> **HEAD**: 본 commit (origin/main, B-13 fix 적용) | **TSC**: 0 errors | **빌드**: OK | **배포**: https://kkotium-garden.vercel.app
> **신규 ledger**: `docs/plan/TASK_BRIDGE.md` — Desktop ↔ Code 실시간 hand-off, §3 ACTIVE / §4 STANDING / §6 PENDING 매 세션 정독 의무
> **v3.1 영구 참조**: `docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md` — 다음 세션부터 *반드시 정독 의무*
> **v2.0 이력 참조**: `docs/research/KKOTIUM_V2_ARCHITECTURE_2026_05.md` (Sprint X 폐기 후 일부 원칙은 작업원칙 #37·#38에서 유지)
> **Private API**: 28개 전체 권한 발급 ✅ (Sprint 8 자동발주 = 매출 상승 후 보류 트랙)
> **Vercel Hobby 제한 주의**: inventory-sync (daily) + daily + weekly 3 cron 사용 중. 6-B/6-C는 inventory-sync에 piggy-back, 6-E는 weekly에 piggy-back, P0-B/P0-C는 on-event (widget fetch 시 pure compute) — 모두 추가 cron 0건. Pro plan 시 `vercel.json` 한 줄로 6시간 cron 복귀 가능
>
> **이 파일의 역할**: 진행 중·예정 Sprint 계획 + 영구 참조 (체크리스트, 비용 로드맵, 도구 사용 패턴)
> **누적 인계 메시지 + Phase A/B/C 완료 이력**: `docs/plan/archive/ROADMAP_2026Q2_MAY.md`
> **세션별 자세한 기록**: `docs/plan/SESSION_LOG.md` (직전 5세션) + `archive/SESSION_LOG_*.md`
> **현재 진행 현황 요약**: `docs/plan/PROGRESS.md`
> **소싱 워크플로우 리서치**: `docs/research/SPROUT_TO_POWER_SELLER_WORKFLOW_2026_05.md`

---
## 다음 새 채팅 시작 메시지 — 2026-05-27 명화송풍구 등록 완주 (Desktop, B-12 fix 완료 후) ⭐ ACTIVE

본 메시지를 다음 새 채팅의 첫 입력으로 사용하세요. 이중 트랙 핑퐁 (작업원칙 #41) 정합.

```
꽃틔움 가든 Desktop. 명화송풍구 썸네일/상세 생성 -> 저장 -> 네이버 등록 완주 turn.
docs/handoff/HANDOFF_premium_image_boost.md 정독 후 진행.

[선행 상태 — 검증 완료]
- 진단 L2 "검토 후 자동화" 도달 (production persist=true 영속화 확인)
- 대표이미지: 화보 4종 진열컷 1000x1000 (Cloudinary, 선명도 351.8 ok)
- margin 50.69(B-7 깨진값) -> 2.03 교정 완료 (ROI 정상화)
- skeletonId S6 (명화 감성 트랙: hero/story/styledShot/spec/cta)
- Code 측 부수버그 B-5~B-10 완료 (production 5601e91)
- **B-12 네이버 등록 라우트 근본 재작성 완료** (본 commit) — categoryMap 폐기 + OAuth2 위임 + 거짓 라벨 0 + detail_image_url 본문 포함
- **B-11 저장배관 DB UPDATE 완료** (본 commit) — save-assets 200 후 Product URL 컬럼 자동 기록

[이번 turn 목표]
썸네일 4변형 생성 -> 상세 5섹션 생성 -> Supabase 저장 -> 네이버 카테고리
(50003356) + 원산지(200037) 매핑 -> 등록 완주. 그 후 하트클립 동일 흐름.

[작업 순서]
1. /studio?product=cmpnooli40001f0gveaxr8iim 진입 (Chrome MCP 실클릭)
2. 썸네일 4변형 생성 (clean/price/badge/lifestyle) -> 메인 선택
3. 상세 5섹션 생성 (S6 골격) -> 미리보기 확인
4. 저장 (save-assets) -> Supabase public URL 발급
5. 네이버 등록 (카테고리 50003356 / 원산지 200037 정확 매핑)
6. 완주 후 -> 하트클립(65322570) 동일 흐름 (소싱 데이터 crawl_logs 존재)

[STEP 0 — 환경 점검]
git rev-parse HEAD origin/main && git status --short && \
  curl -sIo /dev/null -w "Vercel HTTP: %{http_code}\n" \
    https://kkotium-garden.vercel.app/dashboard && \
  scripts/verify-vercel-deploy.sh

[통과 시]
- docs/handoff/HANDOFF_premium_image_boost.md 헤더 → [CLOSED 2026-05-27]
  + TASK_BRIDGE §7 ARCHIVED

[실패 시]
- Vercel 런타임 로그 정확한 스택 trace 확보 → 핸드오프 §4·§5 가설 재조정
  → Code 재진입 (B-7 회피 수동 교정 path 또는 grading 임계 조정)

작업원칙 절대 준수 — main 직접 push, Production smoke 3-tier(#45) 의무.
```


---
## ~~다음 새 채팅 시작 메시지 — 2026-05-27 B-4 진단 504 수정 → Desktop 재검증 → 명화송풍구 등록 완주~~ ✅ SUPERSEDED → 2026-05-27 본 ACTIVE (명화송풍구 등록 완주)

## 다음 새 채팅 시작 메시지 — 2026-05-27 B-4 진단 504 수정 → Desktop 재검증 → 명화송풍구 등록 완주 (보관용)

본 메시지를 다음 새 채팅의 첫 입력으로 사용하세요. 이중 트랙 핑퐁 (작업원칙 #41) 정합.

```
꽃틔움 가든 — B-4 push 직후 Desktop 재검증 turn.

[STEP 0 — 사전 정독 의무]
docs/plan/PROGRESS.md (헤더 + 2026-05-27 entry) →
docs/plan/ROADMAP.md (본 ACTIVE 메시지) →
docs/plan/SESSION_LOG.md (2026-05-27 entry) →
docs/plan/TASK_BRIDGE.md (§3 ACTIVE / §4 STANDING / §6 PENDING) →
docs/handoff/HANDOFF_diagnose_timeout.md (B-4 인계장 — Code 수정 완료 상태)

[STEP 0 — 환경 점검]
git rev-parse HEAD origin/main && git status --short && \
  curl -sIo /dev/null -w "Vercel HTTP: %{http_code}\n" \
    https://kkotium-garden.vercel.app/dashboard && \
  scripts/verify-vercel-deploy.sh --wait

[Desktop 검증 시나리오]
1. Chrome MCP로 production /studio?product=cmpnooli40001f0gveaxr8iim 진입
2. "AI 진단 실행" 버튼 → 504 없이 결과 카드 표시 (등급 / 골격 / 신뢰도 / 품질)
3. L1~L2 = 프리미엄 직진, L3 이하 = 이미지 보강 분기 진행
4. 썸네일 → 상세 → 저장 → 네이버 카테고리(50003356) + 원산지(200037) 매핑 → 등록
5. ③ 하트클립 동일 흐름 등록

[통과 시]
- docs/handoff/HANDOFF_diagnose_timeout.md 헤더 → [CLOSED 2026-05-27] + TASK_BRIDGE §7 ARCHIVED
- Code 측 진입 = 부수버그 B-5~B-8 별도 커밋 (PUT stock 500 / categories count:0 / 기본값 오류 / 760 원본)

[실패 시]
- Vercel 런타임 로그 정확한 스택 trace 확보 → 핸드오프 §4 가설 재조정 → Code 재진입

작업원칙 절대 준수 — main 직접 push, 검증은 production endpoint 기준.
```


---
## ~~다음 새 채팅 시작 메시지 — 2026-05-19 PM Sprint 8-IA Phase 1 진입 (자동화 관제 강등 + Section 5)~~ ✅ SUPERSEDED → 2026-05-27 B-4 진단 504 흐름으로 전환 (명화송풍구 등록 blocker 우선)

## 다음 새 채팅 시작 메시지 — 2026-05-19 PM Sprint 8-IA Phase 1 진입 (자동화 관제 강등 + Section 5) (보관용)

본 메시지를 새 채팅 1의 첫 입력으로 사용하세요. **이중 트랙 핑퐁 운영** (작업원칙 #41) 정합.

```
꽃틔움 가든 — Sprint 8-IA Phase 1 진입.

[STEP 0 — 사전 정독 의무]
docs/plan/PROGRESS.md (헤더 + Sprint 8-IA 진입 entry) →
docs/plan/ROADMAP.md (본 ACTIVE 메시지) →
docs/plan/SESSION_LOG.md (직전 entry) →
docs/plan/TASK_BRIDGE.md (§3 ACTIVE / §4 STANDING / §6 PENDING) →
docs/plan/SPRINT_PLAN.md (Sprint 8-IA Phase 1 Task 1-5 명세) →
docs/plan/PRINCIPLES_LEARNED.md (#41 핑퐁 + #46 거짓 라벨 금지)
정독 후 현재 상태 브리핑.

[STEP 0 — 환경 점검]
git rev-parse HEAD origin/main && \
  git status --short && \
  git stash list && \
  wc -l docs/plan/*.md && \
  curl -sIo /dev/null -w "Vercel HTTP: %{http_code}\n" \
    https://kkotium-garden.vercel.app/dashboard && \
  scripts/verify-vercel-deploy.sh --wait

[Sprint 8-IA 진입 배경]
2026-05-19 PM Desktop이 Chrome MCP로 /automation + /studio +
/settings/lifestyle-assets + /products/new 4 화면 시각 점검 결과:
- 자동화 관제 17/26 = 65% 가짜 라벨 (실 cron 가동 3건만)
- 빌더↔27 dedicated renderer 충돌
- lifestyle-picker 작동이 사용자 화면에서 안 보임
- 시각적 통일성 부재 (라이프 자산 ↔ 온실 아틀리에 ↔ PLANT)

사용자 Q1·Q2·Q3 권장안 모두 승인 → Sprint 8-IA 신설 + Phase 1/2 분할.
작업원칙 #46 (거짓 라벨 금지) 직접 발화 사례로 등재 완료.

[Phase 1 작업 범위 — 1.5일, 5 Task]

Task 1 (5분) — 사이드바 "자동화 관제" 제거
  파일: src/components/layout/Sidebar.tsx
  변경: OPS 섹션에서 "자동화 관제" entry 1줄 삭제
  검증: grep -n "자동화 관제" → 0 매칭

Task 2 (30분) — /automation → /admin/automation 이동
  파일 이동: src/app/automation/page.tsx
          → src/app/admin/automation/page.tsx
  페이지 헤더 갱신: 회색 배지 "관리자 영역 — 일상 사용 X" 추가
  라우팅: next.config.js redirects로 /automation → /admin/automation
  관리자 직접 URL 입력 시만 진입

Task 3 (30분) — automation-registry 26→8 entry 축소
  파일: src/lib/automation-registry.ts (현재 383 LOC)
  유지 8 entry (실 가동만):
    1. 도매꾹 재고 폴링 (6-A) — daily cron
    2. 굿서비스 추적 — weekly cron
    3. 일일 리포트 (KKOTTI) — 00:00 cron
    4. 주간 리포트 — Sun 09:00 cron
    5. Discord ORDERS — per-event
    6. Discord STOCK_ALERT — per-event
    7. Discord KKOTTI_RECOMMEND — per-event
    8. Discord DAILY/WEEKLY — per-event
  제거 18 entry (Sprint 6-B/6-C/8/9 미작성 작업 라벨 등)
  검증: registry entry count = 8
       4 pill summary = [정상 8] [대기 0] [오류 0] [보류 0]

Task 4 (1일) — 대시보드 Section 5 "정원 점검" 카드 신설
  신규 파일:
    - src/components/dashboard/SystemHealthCard.tsx (~150 LOC)
    - src/lib/i18n/system-health-strings.ko.json (~10 strings)
  수정 파일:
    - src/app/dashboard/page.tsx (Section 5 위치 추가)
  카드 명세:
    - 타이틀: "정원 점검" + 상태 배지 (정상 / 오류 / 점검 필요)
    - 본문 3줄:
      • 자동 실행 작업: 8개
      • 마지막 cron: N분 전
      • 지난 7일 Discord 발송: N건
    - 하단 링크: "자동화 상세 보기 →" → /admin/automation
  데이터 fetch: GET /api/automation/registry → 8 entry 상태, 5분 polling

Task 5 (30분) — 브라우저 통합 검증 + commit + push
  검증 시나리오:
    1. 사이드바 OPS 섹션에서 "자동화 관제" 사라짐
    2. /automation 직접 진입 → redirect 또는 404 작동
    3. /admin/automation 진입 → 8 entry 모두 정상 + 가짜 라벨 0건
    4. /dashboard 최하단 Section 5 카드 표시 + 상세 보기 링크 작동

[작업원칙 적용]
- #17 commit msg via .commit-msg.tmp + git commit -F
- #21 STEP 0 사전 점검 의무 통과
- #29 (e++) 사용자 닉네임 답변 본문 직접 입력 금지
- #31 (e) idempotent 가드 (스크립트 재실행 안전)
- #32 push 전 TSC + npm run build 둘 다 0 errors
- #35 한글 사전 분리 패턴 (system-health-strings.ko.json)
- #36 push 후 scripts/verify-vercel-deploy.sh --wait → exit 0 의무
- #41 두 환경 핑퐁 — Code 측이 build + ship, Desktop이 검증
- #46 registry 등재 = 실 가동 단정 후만 (본 sprint 직접 적용)

[Phase 1 검증 통과 후]
- TASK_BRIDGE.md §3 ACTIVE 갱신 (Phase 1 완료 + Phase 2 대기)
- §7 ARCHIVED에 Phase 1 hand-off 등재
- 새 채팅 2 진입 = Sprint 8-IA Phase 2 (Task 6-12, 4.5일)

작업원칙 절대 준수 — main 직접 push 정책. push 직후
scripts/verify-vercel-deploy.sh --wait → exit 0 의무.
```


---
## ~~다음 새 채팅 시작 메시지 — 2026-05-19 Sprint 7-PC-B-3 진입 대기~~ ✅ SUPERSEDED → Sprint 8-IA로 흐름 전환

> 2026-05-19 PM Desktop 진단 결과로 PC-B-3 (P19 혜택 prefill + P16 crawler) 진입 *전*에 IA 재설계 필요로 단정 → Sprint 8-IA로 sprint 분기. PC-B-3는 Sprint 8-IA Phase 2 완료 후 재진입 권고.

## 다음 새 채팅 시작 메시지 — 2026-05-19 Sprint 7-PC-B-3 진입 대기 (보관용)

본 메시지를 다음 새 채팅의 첫 입력으로 사용하세요. **이중 트랙 핑퐁 운영** (작업원칙 #41) 정합.

```
Sprint 7-PC-B-3 진입 대기. docs/plan/PROGRESS.md, ROADMAP.md, SESSION_LOG.md,
TASK_BRIDGE.md (§3 ACTIVE / §4 STANDING / §6 PENDING), PRINCIPLES_LEARNED.md
(#41 두 환경 핑퐁) 정독 후 현재 상태 브리핑.

직전 작업 = Sprint 7-PC-B 완주 (5건 paper-cut 해소) + TASK_BRIDGE.md 도입:
- PC-A hotfix 742ce91 (RC1+RC2+suggest 검증)
- PC-B-1 5a3b8c2 (P18 dome_code passthrough + P14 defensive)
- PC-B-2 29b7c49 (P15 옵션명 keyword rule + P17 supplier-notfound 배송 fallback)
- 작업원칙 #41 명문화 (Desktop↔Code 핑퐁 프로토콜) + TASK_BRIDGE.md ledger 신설

PENDING USER ACTIONS (TASK_BRIDGE §6):
- 디퓨저 dome_code seed — Desktop이 Supabase MCP로 5분 이내 실행
- P20 supplier seller ID 확인 (이현마켓 / gseller2022 도매꾹 마이페이지에서)
- P16 scope 결정 (additionalImages crawler 수정을 PC-B-3 포함 or PC-D 분리)

PC-B-3 진입 시 (사용자 결정 후):
- P19 혜택 prefill — store-settings benefit default load → prefill effect 적용
- P16 (PC-B 포함 결정 시) crawler 측 추가 이미지 추출 추가

작업원칙 #41 (두 환경 핑퐁) 적용:
- 본 Code 환경은 build + ship 전담
- Desktop이 Chrome MCP / Supabase MCP로 검증
- 각 sub-commit hash 보고 → Desktop 자동 cross-track 검증

작업원칙 절대 준수 — #17/#21/#24/#29/#31/#32/#34/#36/#41. push 직후
scripts/verify-vercel-deploy.sh --wait → exit 0 의무.
```


---
## ~~다음 새 채팅 시작 메시지 — 2026-05-18 Sprint 7-PC-A (paper-cut batch, handleNaverDirect 4-gate + P1/P2)~~ ✅ COMPLETED → PC-A/B 모두 통과, PC-B-3 대기

> Sprint 7-PC-A (4-gate + P1) + 7-PC-B-1 (P18 passthrough + P14) + 7-PC-B-2 (P15 + P17) 모두 완료. 5 paper-cut 해소. 작업원칙 #41 명문화 + TASK_BRIDGE.md 도입.

## 다음 새 채팅 시작 메시지 — 2026-05-18 Sprint 7-PC-A (보관용)

본 메시지를 다음 새 채팅의 첫 입력으로 사용하세요. *컨텍스트 보호*를 위해 새 세션 권장. **이중 트랙 핑퐁 운영** (Vercel-Runtime Track ↔ Web-Verify Track).

```
Sprint 7-PC (Paper-Cut Batch) — Vercel-Runtime Track / Web-Verify Track 핑퐁
계속 진행. docs/plan/PROGRESS.md, ROADMAP.md, SESSION_LOG.md, PRINCIPLES_LEARNED.md,
SPRINT_PLAN.md 정독 후 현재 상태 브리핑.

직전 작업 = Sprint 7-PC pre-sprint cleanup:
- 7차 SESSION_LOG.md archival split — 9 entries → archive/SESSION_LOG_2026-05-14.md
  (2026-05-13 Phase 2-b-1 ~ 2026-05-14 Phase 3-C-2)
- SESSION_LOG.md slim to 5 most recent entries (CLAUDE.md "직전 5세션" 정합)
- PROGRESS.md + ROADMAP.md paper-cut #1 (48b50fa Studio hydration order fix) entry 추가
- Supplier DB bornscent INSERT 완료 (cm62770f54a42a46a4ae4c53d) — Web-Verify Track이
  Supabase MCP로 직접 실행. P2 70% 해소

Sprint 7-PC 본격 진입 = 3 sub-sprint 핑퐁:
- PC-A: handleNaverDirect 4-gate validation + P1 카테고리 prefill autofill +
        P2 supplier "저장하고 적용" 흐름 — commit 후 Web-Verify Chrome MCP 재검증
- PC-B: prefill autofill 확장 P14-P19 (옵션 14종 silent truncation /
        옵션명-값 / additionalImages / 배송 / SEO / 혜택) — commit 후 재검증
- PC-C: AI fallback Groq Migration P13-A/B/C/D/E (5 endpoint) —
        userMemories 2026-05-15 정합 = Groq → Gemini 2.0-flash → Anthropic
        Sonnet 3단만. Perplexity + xAI DEPRECATED. commit 후 smoke 검증

검증 좌표 (Chrome MCP 재검증용 디퓨저 prefill URL):
https://kkotium-garden.vercel.app/products/new?prefill=eyJwcm9kdWN0...
(verbatim URL은 Web-Verify Track이 보유)

작업원칙 절대 준수 — #17/#21/#24/#29/#31/#32/#34/#36/#38. push 직후
scripts/verify-vercel-deploy.sh --wait → exit 0 의무.
```


---
## ~~다음 새 채팅 시작 메시지 — 2026-05-15 PM (Phase 3-C-3-h hardening 완료, 첫 실 상품 등록 대기)~~ ✅ COMPLETED → paper-cut #1 발견 (Case B 분기, 48b50fa) → Sprint 7-PC 진입

> Case B 시나리오 발화 — 사용자 첫 실 상품 등록 시도 중 paper-cut #1 (Studio hydration order) 발견 → 48b50fa로 hotfix → Web-Verify Track이 추가 22 paper-cut 인벤토리 작성 → Sprint 7-PC 진입.

## 다음 새 채팅 시작 메시지 — 2026-05-15 PM (Phase 3-C-3-h hardening 완료, 첫 실 상품 등록 대기) (보관용)

본 메시지를 다음 새 채팅의 첫 입력으로 사용하세요. *컨텍스트 보호*를 위해 새 세션 권장.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md,
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고
docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 정독 후
현재 상태를 파악한 후 브리핑해주세요.

직전 작업 = Sprint 7-M2 Phase 3-C-3 + 3-C-3-h 완료 (production 검증):
- Phase 3-C-3 (1daded2) — register-then-autorun + sequence chaining +
  golden-window deep-link
- Phase 3-C-3-h (c789e36) — Cloudinary fetch 차단 paper-cut 발견 →
  Sharp 직접 resize로 수정 (3 파일 +17/-14)
- production smoke 4 stages 모두 200 (diagnose 0.7s + thumbnail 4.8s +
  generate-detail 5.2s + save-assets 1.7s)
- TSC 0, build OK, sentinel 0, dict 99+178+105 통과
- production deploy: c789e36 verified ✅

본 세션 진입 작업 = 사용자 첫 실 상품 등록 결과 확인 + 다음 분기

STEP 0 — 환경 점검 (작업원칙 #21)
  직전 commit이 main 머지/배포됐는지 verify-vercel-deploy.sh로 확인.

STEP 1 — 사용자 첫 실 상품 등록 결과 청취:

  케이스 A — 등록 + autoRunVisual 자동 흐름 성공:
    - SequenceStatusBanner green "비주얼 자동화 완료" 확인
    - 스마트스토어에서 thumbnail/detail 노출 확인
    - 7일 골든윈도우 카운트다운 위젯 작동 확인
    - 다음: Phase 2-c (lifestyle-picker) 또는 신규 sprint 진입

  케이스 B — 등록 도중 paper-cut 발견:
    - 사용자가 발견한 증상 청취 (Banner red? UI freeze?
      특정 카드 disabled? Naver 등록 자체 실패?)
    - Vercel runtime logs로 root cause 진단
    - 즉시 hotfix → re-deploy → 재시도

  케이스 C — 등록 자체 미진행:
    - 사용자 일정/우선순위에 따라 Phase 2-c (lifestyle-picker)
      또는 Sprint 8 자동발주 진입

진입 전 확인:
- 5 plan MD 정독 + SMART_ASSET_WORKFLOW 정독
- 직전 commit (c789e36) main 도달 + production 200 확인
- SESSION_LOG.md ~1246줄 추정 (T1 1500 미달, 안전)
- 실 도매꾹 상품 (cmp3afb450001gng5468w0qpc, 도어벨)에 이미 Diagnosis +
  thumb + detail Supabase URLs 발행됨 — 사용자가 본 상품 등록 시
  publish-assets만 추가 호출되어 빠른 갱신 가능

다음 = 케이스에 따라 분기

작업원칙 절대 준수 — 평소와 동일. main 직접 push 정책 차단 시 fast-forward
merge 사용자 위임.
```


---

## 다음 새 채팅 시작 메시지 — 2026-05-15 (Sprint 7-M2 Phase 2-c — lifestyle-picker 30일 cooldown) ⭐ ACTIVE

본 메시지를 다음 새 채팅의 첫 입력으로 사용하세요. *컨텍스트 보호*를 위해 새 세션 권장.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md,
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고
docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 정독 후
현재 상태를 파악한 후 브리핑해주세요.

직전 작업 = Sprint 7-M2 Phase 3-C-3 완료 (Phase 3-C 트리오 완결):
- src/components/studio/useStudioActions.ts +186/-43 — 5 handler
  결과 반환 형 refactor + override 파라미터 + runFullSequence
- src/app/products/new/page.tsx +129/-1 (3641 → 3769 LOC) —
  autoRunVisual state + 토글 UI + handleNaverDirect 자동 활성화 +
  edit-mode unlock + PlantVisualInner autorun + SequenceStatusBanner
- src/components/dashboard/GoldenWindowWidget.tsx +2/-1 — href에
  &focus=visual 추가
- studio-strings.ko.json +10 strings (autorun + sequence chip 라벨,
  95 → 105)
- TSC 0, build OK (/products/new 62.5 kB), dict 99+178+105 통과,
  sentinel 0건, 인라인 한글 주석 0건
- production deploy: 1daded2 verified ✅

본 세션 진입 작업 = 사용자 의사결정 분기 후 진행

STEP 0 — 환경 점검 (작업원칙 #21)
  직전 commit이 main 머지/배포됐는지 verify-vercel-deploy.sh로 확인.

STEP 1 — 사용자 의사결정 청취 (3 옵션):

  옵션 1 (queued sprint): Sprint 7-M2 Phase 2-c — lifestyle-picker
    - 신규 src/lib/automation/lifestyle-picker.ts
    - Prisma LifestyleAsset 모델 추가 (id, url, tags[], lastUsedAt)
    - 카테고리/계절/감성톤 태그 매칭 + 30일 cooldown
    - thumbnail-generator의 lifestyle variant가 picker 호출
    - **권고**: 자산 풀이 비어있으면 작동 0 — 자산 입력 흐름 우선
      필요 (Phase 1 Claude Web 세션에서 정적 자산 사전 생성 후
      Supabase Storage에 업로드 → DB seed)

  옵션 2 (event-driven, 권고): 첫 실 상품 등록 + 콘텐츠 자동화 검증
    - 도매꾹 OpenAPI 또는 직접 입력으로 첫 상품 등록 (현재 0건)
    - PLANT 등록 → autoRunVisual 자동 흐름 실 production 검증
    - 발견된 paper-cut 즉시 수정 (Phase 3-C-3 hardening)
    - 골든윈도우 위젯 실제 데이터 노출 확인

  옵션 3 (보류 트랙): Sprint 8 자동발주 (Private API 28권한 보유)
    - 매출 상승 + 운영 흐름 안정화 후 진입 권고

  → 사용자 의사결정 후 그 옵션의 sub-phase 분할 + 단일 commit 단위
    작업 진행

진입 전 확인:
- 5 plan MD 정독 + SMART_ASSET_WORKFLOW 정독
- 직전 commit (1daded2) main 도달 + production 200 확인
- SESSION_LOG.md ~1104줄 추정 (T1 1500 미달, 안전)
- PLANT page.tsx 3769 LOC + dashboard page.tsx 거대 파일 — 옵션 1
  진입 시 lifestyle-picker는 src/lib/automation/ 별도 파일이라 PLANT
  변경 0건 가능

다음 = 사용자 선택 옵션의 다음 sub-phase + Sprint 7-M3 (운영 메트릭)

작업원칙 절대 준수 — 평소와 동일. main 직접 push 정책 차단 시 fast-forward
merge 사용자 위임.
```


---
## ~~다음 새 채팅 시작 메시지 — 2026-05-14 (Sprint 7-M2 Phase 3-C-3 — 등록 → publish 자동 wire-up)~~ ✅ COMPLETED

> Phase 3-C-3 completed on 2026-05-15. 4 files +290/-43, 1daded2 production verified. Sprint 7-M2 Phase 3-C trio (3-C-1 → 3-C-2 → 3-C-3) closed. Next handoff above.

## 다음 새 채팅 시작 메시지 — 2026-05-14 (Sprint 7-M2 Phase 3-C-3 — 등록 → publish 자동 wire-up) ⭐ ACTIVE

본 메시지를 다음 새 채팅의 첫 입력으로 사용하세요. *컨텍스트 보호*를 위해 새 세션 권장.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md,
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고
docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 정독 후
현재 상태를 파악한 후 브리핑해주세요.

직전 작업 = Sprint 7-M2 Phase 3-C-2 완료 (PLANT 7번째 탭 통합):
- src/app/products/new/page.tsx +93/-3 (3552 → 3641 LOC) — 7th tab
  "비주얼 자동화" + module-level <PlantVisualInner /> + savedProductId/
  savedNaverProductId state + handleNaverDirect wire-up
- studio-strings.ko.json +6 strings (plantTab.*, 89 → 95)
- 0 API route 변경, byte-identical 기존 6 탭
- TSC 0, build OK (/products/new 62 kB), dict 99+178+95 통과,
  sentinel 0건, 인라인 한글 주석 0건
- production deploy: c1616c0 verified ✅

본 세션 진입 작업 = Sprint 7-M2 Phase 3-C-3 (등록 → publish 자동 wire-up):

STEP 0 — 환경 점검 (작업원칙 #21)
  직전 commit이 main 머지/배포됐는지 verify-vercel-deploy.sh로 확인.

STEP 7-M2 Phase 3-C-3 — 등록 흐름 자동화 + 골든윈도우 surface

  배경: Phase 3-C-2로 7번째 탭 마운트 완료. 사용자가 *수동 클릭 5단계*
  (탭 클릭 → 진단 → 썸네일 → 상세 → 저장 → publish)를 거쳐야 함. 
  Phase 3-C-3는 *수동 단계 제거*가 핵심:

  대상 변경 1 — handleNaverDirect 자동 흐름 토글:
    - src/app/products/new/page.tsx
      1) 신규 state: autoRunVisual (bool, default true) + autoRunBusy
      2) 기본 탭 하단에 토글 UI: "등록 후 비주얼 자동 생성" (체크박스)
      3) handleNaverDirect 네이버 등록 성공 후 (L1156+):
         if (autoRunVisual) {
           setActiveTab('visual');
           // 다음 tick에서 PlantVisualInner mount → useStudioActions
           // 자동 호출 sequence: runDiagnose → runThumbnail → runSave 
           // → runPublish (pre-condition 검증 포함)
         }
      4) PlantVisualInner에 autorun prop 추가 → useEffect로 mount 시
         자동 sequence 실행 (idempotent — 이미 결과 있으면 skip)

  대상 변경 2 — 대시보드 골든윈도우 위젯:
    - src/app/dashboard/page.tsx
      1) 신규 위젯 GoldenWindowWidget (등록 후 D+1, D+3, D+7 카운트다운)
      2) Product.createdAt + ACTIVE 상태 + 등록 후 7일 미만 상품 목록
      3) per-row 액션: "콘텐츠 보강" → /products/new?edit=ID&focus=visual

  대상 변경 3 — useStudioActions에 autorun helper:
    - src/components/studio/useStudioActions.ts
      1) 신규 export: runFullSequence(): Promise<void>
         — runDiagnose → runThumbnail → runSave → runPublish (각 단계
         pre-condition 검증, 실패 시 sequence 중단 + 에러 표시)
      2) PlantVisualInner / studio page 양쪽에서 호출 가능

  검증:
    1. PLANT 신규 상품 등록 + 토글 ON → 자동 sequence 작동 확인
    2. 토글 OFF → 기존 수동 흐름 보존
    3. 대시보드 골든윈도우 위젯 0건 (등록 7일 미만 상품 없을 때) /
       N건 (있을 때) 표시 확인
    4. 자동 sequence 중간 실패 시 에러 surface + 부분 결과 보존

  Phase 3-D (별도 sprint):
    - lifestyle-picker 30일 cooldown + 태그 매칭
    - L3/L4 등급 분기 (Claude Vision 보강 호출)

진입 전 확인:
- 5 plan MD 정독 + SMART_ASSET_WORKFLOW 정독
- 직전 commit (c1616c0) main 도달 + production 200 확인
- SESSION_LOG.md ~937줄 추정 (T1 1500 미달, 안전)
- PLANT page.tsx 3641 LOC + dashboard page.tsx 거대 파일 — 변경 최소화
  의무 (state/wire-up + 위젯 추가만, 기존 흐름 byte-preserve)

다음 = Phase 3-D (lifestyle-picker) → Sprint 7-M3 (운영 메트릭 대시보드).

작업원칙 절대 준수 — 평소와 동일. main 직접 push 정책 차단 시 fast-forward
merge 사용자 위임.
```


---
## ~~다음 새 채팅 시작 메시지 — 2026-05-13 (Sprint 7-M2 Phase 3-C-2 — PLANT 7번째 탭 통합)~~ ✅ COMPLETED

> Phase 3-C-2 completed on 2026-05-14. 2 files +100/-3, c1616c0 production verified. Phase 3-C-3 (등록 → publish 자동 wire-up) = active handoff above. The message below is preserved for git history.

## 다음 새 채팅 시작 메시지 — 2026-05-13 (Sprint 7-M2 Phase 3-C-2 — PLANT 7번째 탭 통합) ⭐ ACTIVE

본 메시지를 다음 새 채팅의 첫 입력으로 사용하세요. *컨텍스트 보호*를 위해 새 세션 권장.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md,
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고
docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 정독 후
현재 상태를 파악한 후 브리핑해주세요.

직전 작업 = Sprint 7-M2 Phase 3-C-1 완료 (Studio 컴포넌트 추출):
- src/components/studio/ 9 신규 파일 (types / shell / useStudioActions /
  4 cards / ProductListPane / index barrel)
- /studio/page.tsx 1068 → 250 LOC (-77%), byte-identical markup
- i18n studio-strings.ko.json +4 strings (productList.title +
  publishPatched{Thumb,Detail,Sep})
- 5 API routes 변경 0, 동작 완전 동일
- TSC 0, build OK, dict 통과, sentinel 0

본 세션 진입 작업 = Sprint 7-M2 Phase 3-C-2 (PLANT 7번째 탭 통합):

STEP 0 — 환경 점검 (작업원칙 #21)
  직전 commit이 main 머지/배포됐는지 verify-vercel-deploy.sh로 확인.

STEP 7-M2 Phase 3-C-2 — PLANT /products/new 6→7 tab 확장

  배경: PLANT page.tsx (188KB, ~4000 LOC) 안에 6 tab (basic / option /
  image / shipping / seo / benefit) 구조. 7번째 탭 "비주얼 자동화" 추가
  필요. 등록 직후 *7일 골든윈도우* 활용해 콘텐츠 자동화 → 매출 ↑.

  대상 파일 수정:
    - src/app/products/new/page.tsx:
      1) L286: activeTab type 확장
         `'basic'|'option'|'image'|'shipping'|'seo'|'benefit'|'visual'`
      2) L838: validTabs 배열에 'visual' 추가 (deep-link 지원)
      3) L1597: tab navigation bar에 7번째 탭 추가
         label: '비주얼 자동화', Icon: Palette (lucide)
         tabDone 조건: actions.publish != null (Phase 3-C-3에서 활성화)
      4) L1646 이후: 7번째 tab panel 추가
         조건부 렌더링: `{activeTab === 'visual' && (...)}`

    7번째 탭 panel 컨텐츠:
      - 임시저장 productId 확인 (savedProductId)
      - savedProductId 없으면 안내 ("먼저 기본 탭에서 저장하세요")
      - 있으면 4 카드 마운트:
        ```typescript
        const actions = useStudioActions(savedProductId);
        const hasNaverId = !!savedNaverProductId; // 등록 후 활성화
        const canPublish = actions.hasSavedAsset && hasNaverId
                           && !actions.publishBusy;
        
        <DiagnosisCard {...actions} ... />
        <ThumbnailCard {...actions} ... />
        <DetailPageCard {...actions} ... />
        <ActionsCard ... canPublish={canPublish} hasNaverId={hasNaverId} />
        ```

  검증:
    1. PLANT에서 신규 상품 등록 흐름 끝까지 진행 (6 tab 채움)
    2. 임시저장 후 7번째 탭 활성화 확인
    3. 7번째 탭에서 AI 진단 → 썸네일 → 상세 → 저장 작동 확인
    4. 골든윈도우 시뮬레이션: 등록 직후 콘텐츠가 채워지는 시점

  Phase 3-C-3 (별도 sub-phase):
    - 등록 → publish-assets 자동 호출 wire-up
    - "에셋 저장 후 자동 갱신" 토글 추가
    - 등록 완료 후 대시보드로 navigate + 골든윈도우 카운트다운 노출

진입 전 확인:
- 5 plan MD 정독 + SMART_ASSET_WORKFLOW 정독
- 직전 commit main 도달 + production 200 확인
- SESSION_LOG.md ~820줄 추정 (T1 1000 미달, 안전)
- PLANT page.tsx 188KB 거대 파일 — 변경 최소화 의무 (탭 추가만)

다음 = Phase 3-C-3 (등록 → publish 자동 wire-up) → Sprint 7-M3 (운영
메트릭 대시보드, lifestyle-picker 등 후속 기능).

작업원칙 절대 준수 — 평소와 동일. main 직접 push 정책 차단 시 fast-forward
merge 사용자 위임.
```


---
## ~~다음 새 채팅 시작 메시지 — 2026-05-13 (Sprint 7-M2 Phase 3-C-1 — StudioPanel 컴포넌트 추출)~~ ✅ COMPLETED

> Phase 3-C-1 completed on 2026-05-13. 9 신규 파일 in `src/components/studio/`, `/studio/page.tsx` 1068→250 LOC (-77%), byte-identical markup. Phase 3-C-2 (PLANT 7번째 탭) = active handoff above. The message below is preserved for git history.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md,
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고
docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 정독 후
현재 상태를 파악한 후 브리핑해주세요.

직전 작업 = Sprint 7-M2 Phase 3-D + 3-E + /studio UX polish 완료:
- src/app/api/products/[id]/publish-assets/route.ts (신규, Naver Commerce API patch)
- src/app/products/page.tsx (per-row "콘텐츠" Palette icon → /studio?product=ID deep-link)
- src/app/studio/page.tsx (UX: step indicator 1→4, disabled hint, publish 버튼 실 wire-up)
- src/lib/i18n/studio-strings.ko.json (+8 strings, 85 total)
- /studio가 *진단 → 썸네일 → 상세 → 저장 → Naver 갱신* end-to-end 완결

본 세션 진입 작업 = Sprint 7-M2 Phase 3-C-1 (StudioPanel 컴포넌트 추출):

STEP 0 — 환경 점검 (작업원칙 #21)
  직전 commit이 main 머지/배포됐는지 verify-vercel-deploy.sh로 확인.

STEP 7-M2 Phase 3-C-1 — 컴포넌트 추출 (refactor only, 동일 동작 보장)

  배경: Phase 3-C-2에서 PLANT page.tsx (188KB, 6 tab) 7번째 탭에 동일
  카드들을 마운트하려면 *공유 컴포넌트로 추출*이 선행 필요. /studio
  page.tsx 안의 inline 카드 4개를 src/components/studio/ 폴더로
  외부화 — refactor 전후 /studio 동작 100% 동일해야 함.

  대상 파일 신규 (src/components/studio/):
    - StudioCardShell.tsx — Card 컴포넌트 + 공유 Pill / PrimaryButton /
      SecondaryButton 분리
    - DiagnosisCard.tsx — /studio page.tsx에서 추출
    - ThumbnailCard.tsx — 동일
    - DetailPageCard.tsx — 동일
    - ActionsCard.tsx — 동일 (save + publish 2-row 구조)
    - useStudioActions.ts — useState 11개 + 4 fetch handler 묶음
      (runDiagnose / runThumbnail / runDetail / runSave / runPublish)
      → 두 페이지에서 재사용
    - types.ts — DiagnosisResult / ThumbnailResult / DetailResult /
      SaveResult / PublishResult / ProductRow 인터페이스 모음

  대상 파일 수정:
    - src/app/studio/page.tsx — 카드 import 변경 (~200 LOC 제거),
      useStudioActions 사용으로 단순화 (~400 LOC 제거)
    - 결과: /studio page.tsx ~640 LOC → ~150 LOC (shell only,
      ProductListPane + 카드 import + handler hook)

  중요 — refactor 전후 시각/기능 100% 동일:
    1. 추출 전후 `npm run build` 결과 size 비교 (/studio 8.32 kB 유지)
    2. 추출 전후 /studio production 동작 비교 (수동 클릭 테스트)
    3. TSC + sentinel + dict.py 모두 통과

진입 전 확인:
- 5 plan MD 정독 + SMART_ASSET_WORKFLOW 정독
- 직전 commit main 도달 + production 200 확인
- SESSION_LOG.md 704줄 (T1 1000 미달, 안전)

다음 = Phase 3-C-2 (PLANT 7번째 탭 추가) → Phase 3-C-3 (등록 흐름
wire-up). Phase 3-C 전체 완료 시 콘텐츠 자동화가 *PLANT 등록 흐름*과
*TEND 재가공 흐름* 양쪽에서 자연스럽게 도달 가능.

작업원칙 절대 준수 — 평소와 동일. main 직접 push 정책 차단 시 fast-forward
merge 사용자 위임.
```


---
## ~~다음 새 채팅 시작 메시지 — 2026-05-13 (Sprint 7-M2 Phase 3-C — PLANT 7번째 탭 "비주얼 자동화")~~ ⏸️ PARTIAL (3-D + 3-E + UX 우선 delivery)

> Phase 3-D (TEND per-row deep-link) + Phase 3-E (publish-assets API + /studio publish 버튼 실 wire-up) + UX polish 우선 진행됨 (사용자 피드백 반영). Phase 3-C는 Phase 3-C-1/2/3로 sub-phase 분할되어 active handoff above. The message below is preserved for git history.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md,
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고
docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 정독 후
현재 상태를 파악한 후 브리핑해주세요.

직전 작업 = Sprint 7-M2 Phase 3-A + 3-B 완료 (commit 3건):
- e6a1941 SESSION_LOG split (947 → 509)
- 5b543fe Phase 3-A — Supabase Storage 어댑터 + 2 API routes
  (generate-detail / save-assets)
- <sha> Phase 3-B — 온실 아틀리에 UI mount
  - src/lib/i18n/studio-strings.ko.json (77 strings)
  - src/app/studio/page.tsx (640 LOC, 2-pane MVP)
  - src/components/layout/Sidebar.tsx (TEND 4번째 entry)
  - scripts/verify-korean-dict.py (DEFAULTS 확장)

본 세션 진입 작업 = Sprint 7-M2 Phase 3-C (PLANT 7번째 탭 통합):

STEP 0 — 환경 점검 (작업원칙 #21)
  Phase 3-B commit이 main 머지/배포됐는지 verify-vercel-deploy.sh로 확인.
  /studio 페이지가 production HTTP 200 응답하는지 확인.

STEP 7-M2 Phase 3-C — PLANT 등록 흐름에 "비주얼 자동화" 탭 통합
  배경: 사용자가 신상품 등록 (씨앗 심기, /products/new) 직후 7일 신상품
  가산점 골든윈도우를 받는다. 그런데 빈 상세페이지로 등록되면 골든윈도우
  기간이 *콘텐츠 보강 작업 중*에 소진된다. 등록 흐름 안에 콘텐츠
  자동화를 강제해서 *콘텐츠 완성 = 등록 직후*가 되도록 한다.

  대상 파일 신규/수정:
    - src/app/products/new/page.tsx 또는 관련 탭 구조 — 7번째 탭 추가
      "🎨 비주얼 자동화" (실제 위치는 기존 6탭 구조 확인 후 결정)
    - src/components/studio/PlantStudioTab.tsx (신규) — /studio 페이지의
      카드 컴포넌트들 재사용해 PLANT 탭 안에 마운트
      (DiagnosisCard, ThumbnailCard, DetailPageCard, ActionsCard 추출
      필요시 src/components/studio/ 폴더로 이동해 두 페이지가 공유)

  탭 동작:
    - 6번째 탭 "검토" 완료 후 7번째 탭 unlock
    - 7번째 탭 진입 시 productId가 *이미 임시저장 됨* — diagnose/generate-detail
      호출 가능 상태
    - 탭 안에서 진단 → 썸네일 → 상세 → 저장 → "등록 완료" 버튼이
      네이버 Commerce API 등록과 함께 publish-assets 호출
    - 등록 완료 후 7일 골든윈도우 카운트다운 표시 (대시보드 P0-B 위젯 연결)

  Phase 3-D 동시 진입 권고:
    - src/app/products/page.tsx — per-row "콘텐츠" 액션 추가
    - 행 우측 액션 영역 (편집/SEO/콘텐츠) 3개 아이콘
    - 클릭 시 /studio?product=ID deep-link → 기존 상품 재가공
      (꿀통 점수 낮은 상품, OOS, 좀비 부활 직후 콘텐츠 보강)

  Phase 3-E (Naver API publish-assets):
    - src/app/api/products/[id]/publish-assets/route.ts (신규)
    - POST body: {thumbUrl?, detailUrl?}
    - Internal: getProduct(naverProductId) → updateProduct() 호출
      네이버 상품 대표이미지 / 상세 페이지 HTML 영역 patch
    - Phase 3-C와 함께 진입 — 등록 흐름 종료점이 publish-assets 호출

진입 전 확인:
- 5 plan MD 정독 + SMART_ASSET_WORKFLOW 정독
- /studio production 상태 확인 (Phase 3-B 동작 검증)
- /products/new 현재 6탭 구조 파악 (탭 추가 위치 결정)
- 작업원칙 #26 IA 점검 — PLANT 변경 시 Sidebar 영향 0
- 작업원칙 #40 Designer Sense — 등록 직전 *콘텐츠 검수 의무화* (자동 등록 금지)

다음 = Sprint 7-M3 (designer UI 마운트, lifestyle-picker, 운영 메트릭
대시보드) → Sprint 7-M4 (실제 상품 등록 통합 검증, Naver Commerce API
publish 작동 확인).

작업원칙 절대 준수 — 평소와 동일. main 직접 push 정책 차단 시 fast-forward
merge 사용자 위임.
```


---
## ~~다음 새 채팅 시작 메시지 — 2026-05-13 (Sprint 7-M2 Phase 2-c lifestyle-picker)~~ ⏸️ SUPERSEDED

> Phase 2-c (lifestyle-picker) was postponed in favor of Phase 3-A+B (API foundation + /studio UI mount) per user IA discussion 2026-05-13. SESSION_LOG split (e6a1941) + Phase 3-A (5b543fe) + Phase 3-B (commit 3) delivered instead. Phase 2-c는 후속 sprint (3-C 이후) 재진입 권고. The message below is preserved for git history.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md,
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고
docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 정독 후
현재 상태를 파악한 후 브리핑해주세요.

직전 작업 = Sprint 7-M2 Phase 2-b-3-b 완료 (B2B + S3 cleanup 3 렌더러):
- src/lib/automation/section-renderers/specTable.ts (S12, KFTC value placeholder)
- src/lib/automation/section-renderers/specifications.ts (S12, KFTC 4 cards
  invariant value + caveat strip)
- src/lib/automation/section-renderers/package.ts (S3, 3-step unboxing)
- section-copy.ts 3 신규 Groq 헬퍼 + strings.ko.json 3 슬롯
- S3 + S12 완전 dedicated, **dedicated 27/27 ✅ 100%** 달성
- 12 골격 모두 완전 dedicated, Sprint 7-M2 Phase 2 (렌더러) 종료
- 이전 docs의 "26"은 off-by-one — 실제 unique section ids 27

본 세션 진입 작업 = Sprint 7-M2 Phase 2-c (lifestyle-picker):

STEP 0 — 환경 점검 (작업원칙 #21)
  특히 Phase 2-b-3-b commit이 main 머지/배포됐는지 verify-vercel-deploy.sh
  로 확인. SESSION_LOG.md 947줄 (T1 1000 근접) — *분할 권고 판단 의무*.

STEP 7-M2 Phase 2-c — lifestyle-picker
  배경: 현재 모든 lifestyle/usage 렌더러는 `ctx.lifestyleAssetUrl ??
  ctx.sourceImageUrl` fallback만 사용. 즉 lifestyleAssetUrl이 주어지면
  쓰고, 없으면 원본 상품 이미지를 그대로 lifestyle 자리에 사용 — 평범한
  fallback이지만 *brand cohesion이 떨어지는* 한계.

  Phase 2-c 목표: LifestyleAsset DB 테이블 (Sprint 7-Diag MVP에서 생성됨,
  현재 0 rows)을 consume하는 lifestyle-picker 알고리즘 도입.

  대상 파일 신규:
    - src/lib/automation/lifestyle-picker.ts (LifestyleAsset 쿼리 + 매칭)
      - INPUT: SectionRenderContext (category / highlight / brandName) +
        sectionId
      - OUTPUT: LifestyleAsset row 1개 (url + moodTags + lastUsedAt) 또는 null
      - 매칭 로직:
        1) category 일치 LifestyleAsset 후보 fetch
        2) moodTags 교집합으로 정렬 (concept-tone과의 매칭)
        3) **30일 cooldown**: lastUsedAt > 30일 전 자산만 picker pool에 포함
           (top brand 사용자 인지 피로 방지)
        4) Random pick from top-3
        5) lastUsedAt 업데이트 (atomicity 보장)

    - src/lib/automation/lifestyle-picker.test.ts (unit test, optional)

  Renderer 패치 (선택적 — Phase 2-c는 *foundation* 도입이라 패치는
  Phase 2-c-2로 분리 가능):
    - usage.ts / styledShot.ts / detail.ts 등 lifestyle 자산 사용하는
      렌더러들이 lifestyle-picker.ts 호출
    - 현재 fallback (ctx.lifestyleAssetUrl) 우선, picker는 lastUsedAt 갱신
      side-effect 있음 — *Phase 3 API route에서만 호출* 권장

  진입 전 확인:
    - Supabase LifestyleAsset 테이블 schema 확인 (current Sprint 7-Diag MVP)
    - 30일 cooldown 정책 KFTC 의미 (피로 방지 = brand cohesion + 다크패턴 0)
    - lastUsedAt 업데이트 atomicity (race condition 방지 — UPDATE WHERE)
    - Phase 2-c는 *foundation only*, 실제 LifestyleAsset 데이터 seed는
      별도 작업 (Sprint 7-Lib 또는 사용자 manual seed)

  사용자 결정 위임:
    - Phase 2-c를 본 세션에서 진입할지, Phase 3 (API route)를 우선할지
    - Sprint 7-M2 Phase 2 종료 시점 (현재) 이미 의미 있는 마일스톤이라
      *Phase 3 우선*도 합리적 (production 통합 신호)

다음 = Sprint 7-M2 Phase 3 (API route + Diagnosis 연동 + Supabase Storage)
→ Sprint 7-M3 (designer UI 마운트, 1클릭 골격 교체).

작업원칙 절대 준수 — 평소와 동일. main 직접 push 정책 차단 시 fast-forward
merge 사용자 위임. SESSION_LOG.md 분할 우선 처리 권고.
```


---
## ~~다음 새 채팅 시작 메시지 — 2026-05-13 (Sprint 7-M2 Phase 2-b-3-b — 100% 완성, 3 렌더러)~~ ✅ COMPLETED

> Phase 2-b-3-b (B2B + S3 cleanup 3 렌더러) completed on 2026-05-13. **dedicated 27/27 ✅ 100%** (이전 docs의 "26"은 off-by-one 정정). 12 골격 모두 완전 dedicated. Phase 2-c (lifestyle-picker) = active handoff above.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md,
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고
docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 정독 후
현재 상태를 파악한 후 브리핑해주세요.

직전 작업 = Sprint 7-M2 Phase 2-b-3-a 완료 (감각 트랙 5 렌더러):
- src/lib/automation/section-renderers/material.ts (S9, KFTC origin/cert placeholder)
- src/lib/automation/section-renderers/styledShot.ts (S6, 3 stacked shots)
- src/lib/automation/section-renderers/philosophy.ts (S10, editorial paragraph)
- src/lib/automation/section-renderers/detail.ts (S10, 2x2 macro grid)
- src/lib/automation/section-renderers/reviews.ts (S10, KFTC critical
  placeholder × 3, 사용자 1/2/3 attribution, neutral 5-dot icon)
- section-copy.ts 5 신규 Groq 헬퍼 + strings.ko.json 5 슬롯
- S6/S9/S10 모두 완전 dedicated, dedicated 24/26 ids 도달

본 세션 진입 작업 = Sprint 7-M2 Phase 2-b-3-b (100% 완성, 3 렌더러):

STEP 0 — 환경 점검 (작업원칙 #21)
  특히 Phase 2-b-3-a commit이 main에 머지/배포됐는지 verify-vercel-deploy.sh로 확인

STEP 7-M2 Phase 2-b-3-b — 3 렌더러 (B2B + S3 cleanup)
  대상 파일 신규:
    - specTable.ts (S12) — full-width 다열 spec table (S1의 spec 보다 detail
      한 단계 위, 측정값 + 단위 + 카테고리 표준값 표기, KFTC: 측정값
      fabricate 0)
    - specifications.ts (S12) — regulation + compliance grid (인증번호 /
      KC mark / 안전기준 표기, KFTC: 인증번호 fabricate 0 — 모두
      placeholder, 디자이너 verify 의무)
    - package.ts (S3) — package unboxing sequence (3-step horizontal flow
      또는 vertical sequence, 박스 → 내용물 → 사은품)

  section-copy.ts에 3 신규 Groq 헬퍼 추가:
    - generateSpecTableCopy ({headline, columns: [3-4 col labels], rows: [...]})
    - generateSpecificationsCopy ({headline, regulations: [{label, value}] × 4})
    - generatePackageCopy ({headline, steps: [{label, caption} × 3]})

  중요 — Phase 2-b-3-a 패턴 그대로 *신규 fallback inline 한글 0건*:
    1. strings.ko.json에 3 신규 슬롯 추가 (specTable/specifications/package)
    2. section-copy.ts의 3 신규 헬퍼는 STRINGS.{slot} 참조만 사용
    3. ctx 보간이 필요하면 strings.ts 헬퍼 또는 TS template literal

  KFTC discipline:
    - specTable: 측정값 fabricate 0, 카테고리 표준 컬럼은 "상세 페이지 참조"
      placeholder
    - specifications: 인증번호 fabricate 0, KC mark / 안전기준 placeholder
    - package: 사은품·번들 placeholder 유지 (수량 fabricate 0)

  S3 / S12 골격 진입 후 dedicated 커버리지 변화:
    - S3: 5/6 → 6/6 ✅ 완전 (package 추가)
    - S12: 3/5 → 5/5 ✅ 완전 (specTable + specifications 추가)
  완전 dedicated 골격 누적: 9 → 11 → 12 (S3/S12 추가, **전 골격 완전**)
  dedicated 커버리지: 24/26 → 26/26 ✅ **100% 도달**

진입 전 확인:
- 5 plan MD 정독 + SMART_ASSET_WORKFLOW 정독
- Phase 2-b-3-a commit이 main에 도달했는지 verify-vercel-deploy.sh로 검증
- SESSION_LOG.md ~832줄 (T1 1000 미달, 안전)
- ko.json migration 정착 — Phase 2-b-3-b fallback은 dict 키 추가만으로 작성

다음 = Sprint 7-M2 Phase 2-c (lifestyle-picker — LifestyleAsset 30일 cooldown
+ 태그 매칭 알고리즘) → Sprint 7-M2 Phase 3 (/api/products/[id]/generate-detail
route + Diagnosis 연동 + Supabase Storage 업로드).

작업원칙 절대 준수 — 평소와 동일. main 직접 push 정책 차단 시 fast-forward
merge 사용자 위임.
```


---
## ~~다음 새 채팅 시작 메시지 — 2026-05-13 (Sprint 7-M2 Phase 2-b-3-a 감각 트랙 5 렌더러)~~ ✅ COMPLETED

> Phase 2-b-3-a (감각 트랙 5 렌더러) completed on 2026-05-13. S6 / S9 / S10 완전 dedicated. dedicated 24/26 섹션 ids. Phase 2-b-3-b = active handoff above.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md,
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고
docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 정독 후
현재 상태를 파악한 후 브리핑해주세요.

직전 작업 = Sprint 7-M2 STEP A 완료 (ko.json dict migration):
- src/lib/automation/section-renderers/strings.ko.json (신규 160 LOC, 116 strings)
- src/lib/automation/section-renderers/strings.ts (신규 49 LOC, typed loader)
- section-copy.ts 18 fallback 객체 STRINGS 키 참조로 교체
- clinical/comparison/options/spec.ts SVG hardcoded Korean → STRINGS slot
- scripts/verify-korean-dict.py argv 지원 (두 dict 기본 검증)
- 작업원칙 #35 강제 적용, inline 한글 0건 (Groq prompt 예시 제외)
- TSC 0 + npm run build OK + dict verify 통과 + sentinel grep 0

본 세션 진입 작업 = Sprint 7-M2 Phase 2-b-3-a (감각 트랙 5 렌더러):

STEP 0 — 환경 점검 (작업원칙 #21)
  특히 STEP A commit이 main에 머지/배포됐는지 verify-vercel-deploy.sh로 확인

STEP 7-M2 Phase 2-b-3-a — 5 렌더러 (감각 트랙)
  대상 파일 신규:
    - material.ts (S9) — material macro + origin caption (KFTC: 원산지
      claim placeholder, fabricate 0)
    - styledShot.ts (S6) — 3 styled lifestyle shots
    - philosophy.ts (S10) — brand philosophy paragraph (의학·과학 효능 차단)
    - detail.ts (S10) — detail macro grid 2x2
    - reviews.ts (S10) — 3 customer review cards (별점 fabricate 금지,
      "실제 사용자 후기" placeholder)

  section-copy.ts에 5 신규 Groq 헬퍼 추가:
    - generateMaterialCopy ({headline, originLabel, macroCaption, certLine})
    - generateStyledShotCopy ({headline, captions: [3]})
    - generatePhilosophyCopy ({headline, paragraph, signature})
    - generateDetailGridCopy ({headline, cells: [{title, body} × 4]})
    - generateReviewsCopy ({headline, reviews: [{quote, attribution} × 3]})

  중요 — Phase 2-b-3-a의 *신규 fallback inline 한글 0건* 패턴:
    1. strings.ko.json에 신규 슬롯 5개 추가 (material/styledShot/philosophy/detail/reviews)
    2. section-copy.ts의 5 신규 헬퍼는 STRINGS.{slot} 참조만 사용 (inline 0)
    3. ctx 보간이 필요한 경우 buildSpecRows 같은 strings.ts 헬퍼 패턴 또는
       TS template literal로 처리 (한글은 dict, 변수는 TS)

  KFTC discipline 강화 (감각 트랙은 효능 주장 위험 높음):
    - philosophy.ts: 의학·과학 효능 주장 단어 prompt 차단 (filterDarkPatterns
      외 추가 layer, copy-writer dark pattern rule 'superlative' 의존)
    - reviews.ts: 별점 fabricate 금지, reviewerName placeholder "사용자",
      "고객 ○○님" 같은 익명화 패턴
    - material.ts: 원산지·재질 fabricate 금지, "상세 페이지 참조" placeholder

  S6/S9/S10 골격 진입 후 dedicated 커버리지 변화:
    - S6: 4/5 → 5/5 ✅ 완전 (styledShot 추가)
    - S9: 3/4 → 4/4 ✅ 완전 (material 추가)
    - S10: 4/6 → 6/6 ✅ 완전 (philosophy/detail/reviews 추가)

  완전 dedicated 골격 누적: S1 · S2 · S4 · S6 · S7 · S8 · S9 · S10 · S11
  = 9개 (12 골격 중 75%)
  dedicated 커버리지: 19/26 → 24/26 (2개 잔여: specTable / specifications
  / package — Phase 2-b-3-b 처리)

진입 전 확인:
- 5 plan MD 정독 + SMART_ASSET_WORKFLOW 정독
- STEP A commit이 main에 도달했는지 verify-vercel-deploy.sh로 검증
- SESSION_LOG.md ~728줄 (T1 1000 미달, 안전)
- ko.json migration 완료 — Phase 2-b-3-a fallback은 dict 키 추가만으로 작성

다음 = Sprint 7-M2 Phase 2-b-3-b (B2B 2 + S3 cleanup 1, 3 렌더러: specTable
/specifications/package) + Phase 2-c (lifestyle-picker) + Phase 3 (API route
/api/products/[id]/generate-detail).

작업원칙 절대 준수 — 평소와 동일. main 직접 push 정책 차단 시 fast-forward
merge 사용자 위임.
```


---
## ~~다음 새 채팅 시작 메시지 — 2026-05-13 (ko.json dict migration → Sprint 7-M2 Phase 2-b-3)~~ ✅ PARTIAL (STEP A 완료)

> STEP A (ko.json dict migration) completed on 2026-05-13. STEP B (Phase 2-b-3) split into 2-b-3-a (감각 5) + 2-b-3-b (B2B 2 + S3 cleanup 1) = active handoff above. The message below is preserved for git history.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md,
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고
docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 정독 후
현재 상태를 파악한 후 브리핑해주세요.

직전 작업 = Sprint 7-M2 Phase 2-b-2 완료 (commit 5fe44d5):
- src/lib/automation/section-renderers/optionIntro.ts (S5)
- src/lib/automation/section-renderers/seasonalHook.ts (S8, KFTC date 카드 의무)
- src/lib/automation/section-renderers/options.ts (S8)
- src/lib/automation/section-renderers/eventDetails.ts (S11, KFTC 3 카드 의무)
- src/lib/automation/section-renderers/benefits.ts (S11, inline SVG glyphs + disclosure)
- section-copy.ts 5 신규 Groq 헬퍼
- S8·S11 완전 dedicated, dedicated 19/26 ids

본 세션 진입 작업 = ko.json dict migration 우선 + Sprint 7-M2 Phase 2-b-3:

STEP 0 — 환경 점검 (작업원칙 #21)
  특히 5fe44d5가 main에 머지/배포됐는지 verify-vercel-deploy.sh로 확인

STEP A — ko.json dict migration (작업원칙 #35 강제 적용)
  배경: 한글 fallback inline 누적 ~45건 (Phase 1 + 2-a + 2-b-1 + 2-b-2),
  작업원칙 #35 의 *대량 한글 작성 작업* 임계 30건을 이미 초과.
  Phase 2-b-3 + 2-b-4 진입 시 추가 ~25건 도입 예상.

  대상 파일 신규:
    - src/lib/automation/section-renderers/strings.ko.json (모든 fallback Korean strings)
    - src/lib/automation/section-renderers/strings.ts (loader + 키 typing)
    - scripts/verify-korean-dict.py (있으면 본 dict 검증에 포함)

  마이그레이션 패턴:
    1. 각 *Copy fallback 객체의 한글 strings를 strings.ko.json으로 추출
    2. 키 네이밍: "{slot}.{field}.{index?}" 예: "hero.title.default", "problem.bullets.1"
    3. section-copy.ts의 fallback 정의를 STRINGS.hero.title.default 등 키 참조로 교체
    4. 컨텍스트 보간 (${ctx.category} 같은) 은 strings.ts의 헬퍼 함수로 처리
    5. 검증: TSC 0 + verify-korean-dict.py NFC + FFFD + sentinel 모두 0건

STEP B — Sprint 7-M2 Phase 2-b-3 (감각/B2B 트랙) + 2-b-4
  대상 파일 신규 (7 렌더러):
    Phase 2-b-3 (감각 트랙):
      - material.ts (S9) — material macro + origin caption
      - styledShot.ts (S6) — 3 styled lifestyle shots
      - philosophy.ts (S10) — brand philosophy paragraph
      - detail.ts (S10) — detail macro grid 2x2
      - reviews.ts (S10) — 3 customer review cards
    Phase 2-b-3 (B2B 트랙):
      - specTable.ts (S12) — full-width spec table
      - specifications.ts (S12) — regulation + compliance grid
    Phase 2-b-4 (cleanup):
      - package.ts (S3) — package unboxing sequence

  7 렌더러 너무 많으면 sub-phase 추가 분할 권장:
    Phase 2-b-3-a: 감각 5 (material/styledShot/philosophy/detail/reviews)
    Phase 2-b-3-b: B2B 2 + S3 cleanup 1 = 3

  본 phase 완료 시 dedicated 26/26 ✅ 100% — 12 골격 모두 완전 dedicated.

진입 전 확인:
- 5 plan MD 정독 + SMART_ASSET_WORKFLOW 정독
- 5fe44d5가 main에 도달했는지 verify-vercel-deploy.sh로 검증
- SESSION_LOG.md 534줄 (분할 후 슬림, T1 1000 미달) — 본 세션 직접 entry 추가 가능
- ko.json migration이 *Phase 2-b-3 진입 전 의무* — Phase 2-b-3 fallback 도입 시 dict 키 참조 패턴 사용

다음 = Sprint 7-M2 Phase 2-c (lifestyle-picker) + Sprint 7-M2 Phase 3
(/api/products/[id]/generate-detail route + Diagnosis 연동).

작업원칙 절대 준수 — 평소와 동일. main 직접 push 정책 차단 시 fast-forward
merge 사용자 위임.
```

---

## ~~다음 새 채팅 시작 메시지 — 2026-05-13 (Sprint 7-M2 Phase 2-b-2: 이벤트/세트 트랙)~~ ✅ COMPLETED

> Sprint 7-M2 Phase 2-b-2 (이벤트/세트 트랙) completed on 2026-05-13 (commit 5fe44d5). S8 / S11 완전 dedicated. dedicated 19/26 섹션 ids.
> Phase 2-b-3 / 2-b-4 + ko.json migration = active handoff above. The message below is preserved for git history.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md,
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고
docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 정독 후
현재 상태를 파악한 후 브리핑해주세요.

직전 작업 = Sprint 7-M2 Phase 2-b-1 완료 (commit fff2867):
- src/lib/automation/section-renderers/corePerformance.ts (S4)
- src/lib/automation/section-renderers/technology.ts (S7)
- src/lib/automation/section-renderers/clinical.ts (S7, KFTC strict)
- section-copy.ts 3 신규 Groq 헬퍼 (numeric value fabricate 0건)
- TSC 0, build 28/28, 한글 sentinel 0
- S4·S7 완전 dedicated 도달 (S1·S2와 함께 4 골격 완전)
- dedicated 14/26 섹션 ids

본 세션 진입 작업 = Sprint 7-M2 Phase 2-b-2 (이벤트/세트 트랙):

STEP 0 — 환경 점검 (작업원칙 #21)
  특히 fff2867이 main에 머지/배포됐는지 verify-vercel-deploy.sh로 확인

STEP 7-M2 Phase 2-b-2 — 5 렌더러 (S5/S8/S11 전용)
  대상 파일 신규:
    - optionIntro.ts (S5) — option grid with color chips (food/kids multi-pack)
    - seasonalHook.ts (S8) — seasonal banner + explicit date window (KFTC: 날짜
      범위 명시 의무, "마감 임박" 금지)
    - options.ts (S8) — option grid with thumbnail chips (single-line option spec)
    - eventDetails.ts (S11) — drop calendar + edition meta (limited collab)
    - benefits.ts (S11) — 3 perk cards with icons (시간 한정 혜택 — fair-trade
      phrasing 의무)

  필요 시 section-copy.ts에 4 신규 슬롯 추가:
    - generateOptionIntroCopy ({headline, options:[{name, sub}], helperLine})
    - generateSeasonalHook ({banner, dateWindow:{start, end}, hookLine})
    - generateOptionsTableCopy ({headline, rows:[{name, spec}]})
    - generateEventDetails ({headline, edition, dropDate, quantity, story})
    - generateBenefitsCopy ({headline, perks:[{title, body, iconHint}]})

  KFTC discipline 강화:
    - seasonalHook + eventDetails: 날짜 명시 의무, "선착순 N", "마감 임박" 금지
    - benefits: 시간 한정 혜택의 *시작-종료* 날짜 또는 *수량*을 명시
    - copy-writer dark pattern filter가 'scarcity' rule로 이미 차단 중 — 추가
      검증 의무 없음

  S5/S8/S11 골격 진입 후 dedicated 커버리지 변화:
    - S5: 1/4 → 2/4 (optionIntro)
    - S8: 3/5 → 5/5 ✅ (seasonalHook + options 추가)
    - S11: 2/4 → 4/4 ✅ (eventDetails + benefits 추가)

진입 전 확인:
- 5 plan MD 정독 + SMART_ASSET_WORKFLOW 정독
- fff2867이 main에 도달했는지 verify-vercel-deploy.sh로 검증
- SESSION_LOG.md 1170+ 줄 추정 — 본 세션 STEP 0에서 분할 권고 (작업원칙
  #31 (a) T1 1000 권고 임계 초과, T2 1500 의무 임계 미달)
- 작업원칙 #35 한글 fallback 누적 ~32건 도달 시 ko.json 분리 권고 (현재 30건)

다음 = Sprint 7-M2 Phase 2-b-3 (감각/B2B 트랙, S9/S10/S12 전용 6 렌더러).

작업원칙 절대 준수 — 평소와 동일. main 직접 push 정책 차단 시 fast-forward
merge 사용자 위임.
```

---

## ~~다음 새 채팅 시작 메시지 — 2026-05-13 (Sprint 7-M2 Phase 2-b: 15 골격 전용 렌더러)~~ ✅ PARTIAL (Phase 2-b-1 완료)

> Sprint 7-M2 Phase 2-b-1 (신뢰 트랙) completed on 2026-05-13 (commit fff2867). S4 / S7 완전 dedicated. dedicated 14/26 섹션 ids.
> Phase 2-b-2 / 2-b-3 / 2-b-4 = active handoff above. The message below is preserved for git history.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md,
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고
docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 정독 후
현재 상태를 파악한 후 브리핑해주세요.

직전 작업 = Sprint 7-M2 Phase 2-a 완료 (commit 449719b):
- src/lib/automation/section-renderers/spec.ts, story.ts, product.ts,
  comparison.ts, warranty.ts, shipping.ts (6 공유 렌더러)
- section-copy.ts 5 신규 Groq 헬퍼 추가
- index.ts registry 갱신 (dedicated 11/26 섹션 ids)
- TSC 0, build 28/28, 한글 sentinel 0

골격별 dedicated 커버리지: S1 3/3 / S2 5/5 / S3 5/6 / S4 4/5 / S6 4/5 /
                          S7 4/6 / S9 3/4 / S12 3/5 / 나머지 부분 커버

본 세션 진입 작업 = Sprint 7-M2 Phase 2-b (15 골격 전용 렌더러):

STEP 0 — 환경 점검 (작업원칙 #21)
  특히 449719b가 main에 머지/배포됐는지 verify-vercel-deploy.sh로 확인

STEP 7-M2 Phase 2-b — 15 골격 전용 렌더러
  대상 파일 신규 (각 SectionRenderer 시그니처):
    - corePerformance.ts (S4) — 4 metric cards with units
    - technology.ts (S7) — mechanism diagram + caption
    - clinical.ts (S7) — bar chart + study meta (sample size / duration)
    - optionIntro.ts (S5) — option grid with color chips
    - styledShot.ts (S6) — 3 styled lifestyle shots
    - seasonalHook.ts (S8) — seasonal banner + date window
    - options.ts (S8) — option grid with thumbnail chips
    - material.ts (S9) — material macro + origin caption
    - philosophy.ts (S10) — brand philosophy paragraph
    - detail.ts (S10) — detail macro grid 2x2
    - reviews.ts (S10) — 3 customer review cards
    - eventDetails.ts (S11) — drop calendar + edition meta
    - benefits.ts (S11) — 3 perk cards with icons
    - specTable.ts (S12) — full-width spec table
    - specifications.ts (S12) — regulation + compliance grid
    - package.ts (S3) — package unboxing sequence

  필요 시 section-copy.ts에 신규 슬롯 추가 — JSON 출력 + filterDarkPatterns
  + 결정형 fallback 패턴 유지.

  15개 너무 많으면 sub-phase 추가 분할 권장:
    Phase 2-b-1: S4/S7 전용 (corePerformance/technology/clinical) — 신뢰 트랙
    Phase 2-b-2: S5/S8/S11 전용 (option/seasonalHook/options/eventDetails/benefits) — 이벤트/세트 트랙
    Phase 2-b-3: S9/S10/S12 전용 (material/philosophy/detail/reviews/specTable/specifications) — 감각/B2B 트랙
    Phase 2-b-4: S3 잔여 (package) — 1개

진입 전 확인:
- 5 plan MD 정독 + SMART_ASSET_WORKFLOW 정독
- 449719b가 main에 도달했는지 verify-vercel-deploy.sh로 검증
- SESSION_LOG.md T1 1000 임박 상태 — 본 세션 STEP 0에서 분할 권고/의무
  판단 후 진행 (작업원칙 #31 (a) T1 임계 도달 또는 초과)

다음 Sprint 7-M2 Phase 2-c (lifestyle-picker) + Phase 3 (API route)는
별도 세션에서 진행 권장.

작업원칙 절대 준수 — 평소와 동일. main 직접 push 정책 차단 시 fast-forward
merge 사용자 위임.
```

---

## ~~다음 새 채팅 시작 메시지 — 2026-05-13 (Sprint 7-M2 Phase 2: 21 잔여 렌더러 + lifestyle-picker)~~ ✅ PARTIAL (Phase 2-a 완료)

> Sprint 7-M2 Phase 2-a (6 공유 렌더러) completed on 2026-05-13 (commit 449719b). dedicated 11/26 섹션 ids.
> Phase 2-b/2-c = active handoff above. The message below is preserved for git history.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md,
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고
docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 정독 후
현재 상태를 파악한 후 브리핑해주세요.

직전 작업 = Sprint 7-M2 Phase 1 완료 (commit 993098f):
- src/lib/automation/section-renderers/ (10 신규 파일)
- types.ts + section-copy.ts + _placeholder.ts + hero/problem/solution/usage/cta + index.ts
- src/lib/automation/section-builder.ts (top-level orchestrator)
- S2 주력 5 섹션 end-to-end + 21 나머지 ids는 _placeholder safety net
- 1,306 LOC, TSC 0, build 28/28, 한글 sentinel 0

본 세션 진입 작업 = Sprint 7-M2 Phase 2 (21 잔여 렌더러 + lifestyle-picker):

STEP 0 — 환경 점검 (작업원칙 #21)
  특히 993098f가 main에 머지/배포됐는지 verify-vercel-deploy.sh로 확인

STEP 7-M2 Phase 2 — 21 잔여 렌더러 + lifestyle-picker
  대상 파일 신규:
    section-renderers/:
      - spec.ts (S1/S3/S6 공유, 2-column 스펙 테이블)
      - story.ts (S3/S6/S10 공유, editorial paragraph + signature shot)
      - product.ts (S3/S8 공유, product detail grid 2x2)
      - package.ts (S3, package unboxing sequence)
      - corePerformance.ts (S4, 4 metric cards)
      - comparison.ts (S4/S7 공유, comparison table)
      - warranty.ts (S4/S7 공유, warranty terms + cert logos)
      - optionIntro.ts (S5, option grid with color chips)
      - styledShot.ts (S6, 3 styled lifestyle shots)
      - technology.ts (S7, mechanism diagram + caption)
      - clinical.ts (S7, bar chart + study meta)
      - seasonalHook.ts (S8, seasonal banner + date window)
      - options.ts (S8, option grid with thumbnail chips)
      - material.ts (S9, material macro + origin caption)
      - shipping.ts (S1/S9/S12 공유, shipping + return + recyclable badge)
      - philosophy.ts (S10, brand philosophy paragraph)
      - detail.ts (S10, detail macro grid 2x2)
      - reviews.ts (S10, 3 customer review cards)
      - eventDetails.ts (S11, drop calendar + edition meta)
      - benefits.ts (S11, 3 perk cards)
      - specTable.ts (S12, full-width spec table)
      - specifications.ts (S12, regulation + compliance grid)

    automation/:
      - lifestyle-picker.ts (LifestyleAsset 30일 cooldown + 태그 매칭 알고리즘)

  각 renderer = SectionRenderer 시그니처 준수.
  필요 시 section-copy.ts에 신규 슬롯 (storyParagraph / specRows / benefitItems
  등) 추가 — JSON 출력 + filterDarkPatterns + 결정형 fallback.

  21개 너무 많으면 sub-phase 추가 분할 권장:
    Phase 2-a: 공유 렌더러 6개 (spec/story/product/comparison/warranty/shipping)
    Phase 2-b: 골격 전용 렌더러 15개
    Phase 2-c: lifestyle-picker

진입 전 확인:
- 5 plan MD 정독 + SMART_ASSET_WORKFLOW 정독
- 993098f가 main에 도달했는지 verify-vercel-deploy.sh로 검증
- SESSION_LOG.md 임박 분할 — T1 1000 도달 직후 (~1020 줄). 본 세션 STEP 0에서
  분할 권고/의무 판단 후 진행 (작업원칙 #31 (a)).

작업원칙 절대 준수 — 평소와 동일. main 직접 push 정책 차단 시 fast-forward merge 사용자 위임.
```

---

## ~~다음 새 채팅 시작 메시지 — 2026-05-13 (Sprint 7-M2: 5섹션 상세페이지 빌더)~~ ✅ PARTIAL (Phase 1 완료)

> Sprint 7-M2 Phase 1 (5섹션 빌더 + S2 5 렌더러) completed on 2026-05-13 (commit 993098f). 10 신규 파일 1,306 LOC, npm run build 28/28, S2 주력 골격 end-to-end + 21 나머지 ids placeholder safety net.
> Phase 2/3 = active handoff above. The message below is preserved for git history.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md,
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고
docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 정독 후
현재 상태를 파악한 후 브리핑해주세요.

직전 작업 = Sprint 7-M1 썸네일 자동화 4변형 완료 (commit 9bedaaf):
- src/lib/automation/skeleton-matcher.ts (SKELETONS 8축 점수화)
- src/lib/automation/sharp-composite.ts (Buffer 빌딩블록 8개)
- src/lib/automation/cloudinary-pipeline.ts (fetch-mode URL builder)
- src/lib/automation/copy-writer.ts (Groq + 다크패턴 6 규칙)
- src/lib/automation/thumbnail-generator.ts (4변형 orchestrator)
- src/app/api/thumbnail/[sku]/route.ts (POST endpoint)
- 1,424 LOC, TSC 0, build 28/28 + ƒ /api/thumbnail/[sku], 코드 한글 0건

본 세션 진입 작업 = Sprint 7-M2 (5섹션 상세페이지 빌더):

STEP 0 — 환경 점검 (작업원칙 #21)
  특히 9bedaaf가 main에 머지/배포됐는지 verify-vercel-deploy.sh로 확인

STEP 7-M2 — 5섹션 가변 상세페이지 빌더
  대상 파일 신규:
    - src/lib/automation/section-builder.ts (entry: 골격별 sections[] consume → 합성)
    - src/lib/automation/lifestyle-picker.ts (LifestyleAsset 30일 cooldown + 태그 매칭)
    - src/lib/automation/section-renderers/ (폴더, 섹션 id별 renderer)
        ├── hero.ts
        ├── problem.ts
        ├── solution.ts
        ├── usage.ts
        ├── cta.ts
        ├── spec.ts (S1/S3/S6 공유)
        ├── story.ts (S3/S6/S10 공유)
        ├── corePerformance.ts (S4)
        ├── comparison.ts (S4/S7)
        ├── warranty.ts (S4/S7)
        ├── optionIntro.ts (S5)
        ├── styledShot.ts (S6)
        ├── technology.ts (S7)
        ├── clinical.ts (S7)
        ├── seasonalHook.ts (S8)
        ├── product.ts (S3/S8)
        ├── options.ts (S8)
        ├── material.ts (S9)
        ├── shipping.ts (S1/S9/S12 공유)
        ├── philosophy.ts (S10)
        ├── detail.ts (S10)
        ├── reviews.ts (S10)
        ├── eventDetails.ts (S11)
        ├── benefits.ts (S11)
        ├── specTable.ts (S12)
        ├── package.ts (S3)
        └── specifications.ts (S12)
    - src/app/api/products/[id]/generate-detail/route.ts (POST: 단일 상품 상세페이지 합성)

  각 섹션 renderer = (skeleton: SkeletonSpec, section: SectionSpec, ctx: ProductContext, copy: SectionCopy) => Promise<Buffer>.
  section-builder는 골격의 sections[] 순회 + 각 renderer 호출 + 수직 stacking 합성 (Sharp).
  copy-writer.ts에 section-specific slot 추가 (heroTitle / problemBullets / solutionBenefits 등).

  Skills frontend-design / canvas-design 활용 권장 (Artifacts 검수 위젯 = Sprint Y-2 DetailPagePreview).

진입 전 확인:
- 5 plan MD 정독 + SMART_ASSET_WORKFLOW 정독
- Sprint 7-M1 commit 9bedaaf가 main에 도달했는지 verify-vercel-deploy.sh로 검증
- 26+ 섹션 renderer 일괄 생성 시 작업원칙 #24 (한 turn 안에) 무리하지 말고 sub-phase 분할 권장:
    Phase 1: section-builder.ts + 5 핵심 렌더러 (hero/problem/solution/usage/cta = S2 주력)
    Phase 2: 나머지 21 렌더러 + lifestyle-picker
    Phase 3: /api/products/[id]/generate-detail route + Diagnosis 연동

작업원칙 절대 준수 — 평소와 동일. main 직접 push 정책 차단 시 fast-forward merge 사용자 위임.
```

---

## ~~다음 새 채팅 시작 메시지 — 2026-05-13 (Sprint 7-M1: 썸네일 자동화 4변형)~~ ✅ COMPLETED

> Sprint 7-M1 썸네일 4변형 completed on 2026-05-13 (commit 9bedaaf). 6 신규 파일 1,424 LOC, npm run build 28/28 + ƒ /api/thumbnail/[sku], 다크패턴 6 규칙 + 작업원칙 #38 strict 준수.
> The message below is preserved for git history. Use the ACTIVE message above.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md,
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고
docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 정독 후
현재 상태를 파악한 후 브리핑해주세요.

직전 작업 = Sprint 7-Skel 12 골격 spec 완료 (commit a29e8c5):
- src/lib/automation/layout-skeletons/ (신규 13 파일)
- index.ts module-load invariant로 grading.SKELETON_SECTIONS와 정합성 자동 검증
- 12개 SkeletonSpec 객체 (S1~S12) 각 matchSignature 8축 + sections[] + colorTokens
- npm run build 28/28 통과, 코드 내 한글 0건

본 세션 진입 작업 = Sprint 7-M1 (썸네일 자동화 4변형):

STEP 0 — 환경 점검 (작업원칙 #21)
  특히 a29e8c5가 main에 머지/배포됐는지 verify-vercel-deploy.sh로 확인

STEP 7-M1 — 썸네일 4변형 자동 생성기
  대상 파일 신규:
    - src/lib/automation/thumbnail-generator.ts (4변형 entry, clean/price/badge/lifestyle)
    - src/lib/automation/cloudinary-pipeline.ts (named transformation wrapper)
    - src/lib/automation/sharp-composite.ts (Sharp 합성 빌딩블록)
    - src/lib/automation/copy-writer.ts (Groq 카피 + 다크패턴 정규식 필터)
    - src/lib/automation/skeleton-matcher.ts (SkeletonSpec.matchSignature consume,
      ConceptTone → SkeletonId scoring; 현재 concept-tone-inference.ts 안의
      단순 if 트리를 SKELETONS 컬렉션 기반 점수화로 강화)
    - src/app/api/thumbnail/[sku]/route.ts (POST: 4변형 일괄 생성)

  각 변형 = 골격 colorTokens + 텍스트 오버레이 + 도매꾹 원본 이미지 합성:
    - clean    누끼 + 흰 배경 + 상품명만
    - price    누끼 + 가격 강조 배지
    - badge    누끼 + 카테고리/시즌 배지 (S8/S11 골격 활용)
    - lifestyle Supabase Storage 라이프스타일 컷 + 상품 오버레이 (S2/S6/S9/S10)

  4변형 미리보기 = Claude Artifacts skill canvas-design 활용 권장 (Sprint 7-M2 합성 빌더 결과를 사전 시각화).

진입 전 확인:
- 5 plan MD 정독 + SMART_ASSET_WORKFLOW 정독
- Sprint 7-Skel commit a29e8c5가 main에 도달했는지 verify-vercel-deploy.sh로 검증
- skeleton-matcher 강화 시 SKELETONS[id].matchSignature를 점수화 함수에 직접 consume
  (단순 wildcard match → 가중 점수 + tie-breaking 디폴트 S2)

작업원칙 절대 준수 — 평소와 동일. main 직접 push 정책 확인 의무 (직전 세션 turn에서 차단 1회).
```

---

## ~~다음 새 채팅 시작 메시지 — 2026-05-13 (Sprint 7-Skel: 12 골격 JSON 정의)~~ ✅ COMPLETED

> Sprint 7-Skel 12 골격 spec completed on 2026-05-13 (commit a29e8c5). 13 신규 파일, npm run build 통과, section id 정합성 invariant 자동 검증.
> The message below is preserved for git history. Use the ACTIVE message above.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md,
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고
docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 정독 후
현재 상태를 파악한 후 브리핑해주세요.

직전 commit은 df66111 (Sprint 7-Diag MVP Phase 2-B — diagnose pipeline end-to-end).
누적 Sprint 7-Diag 완료 = 4 commit (0dd3bbd / d98a11c / df66111 + 본 docs entry).
Production functional test 3 PDF 예시 정확 매칭 확인 (S5 / S10 / S4).

본 세션 진입 작업 = Sprint 7-Skel:

STEP 0 — 환경 점검 (작업원칙 #21)
STEP 7-Skel — 12 골격 JSON 정의 + skeleton-matcher 강화
  대상 파일 신규:
    - src/lib/automation/layout-skeletons/index.ts
      (S1~S12 export + SkeletonSpec 타입 + SkeletonId 재export)
    - src/lib/automation/layout-skeletons/s1-budget-daily-single.ts
    - src/lib/automation/layout-skeletons/s2-standard-daily-options.ts (주력)
    - src/lib/automation/layout-skeletons/s3-premium-gift-set.ts
    - src/lib/automation/layout-skeletons/s4-standard-pro-single.ts
    - src/lib/automation/layout-skeletons/s5-budget-daily-set.ts
    - src/lib/automation/layout-skeletons/s6-standard-gift-single.ts
    - src/lib/automation/layout-skeletons/s7-premium-pro-single.ts
    - src/lib/automation/layout-skeletons/s8-standard-event-set.ts
    - src/lib/automation/layout-skeletons/s9-budget-daily-natural.ts
    - src/lib/automation/layout-skeletons/s10-premium-daily-options.ts
    - src/lib/automation/layout-skeletons/s11-standard-event-vintage.ts
    - src/lib/automation/layout-skeletons/s12-budget-pro-options.ts

  각 골격 파일은 SMART_ASSET_WORKFLOW Section 4 매트릭스 + S2 yaml 예시
  (라인 101~143) 패턴 따라 SkeletonSpec 객체 export:
    - description (한 줄)
    - matchSignature (concept + tone 시그니처)
    - sections: SectionSpec[] (id, height, layout, copy_tone, bg_color_token)
    - total_height, width
    - color_tokens (primary/secondary/accent)
    - fonts (title + body)
    - copy_global_tone

  Skills theme-factory 활용 일괄 생성 시도 권장 (한 세션 안에 12개).

진입 전 확인:
- 5 plan MD 정독 + SMART_ASSET_WORKFLOW 정독
- 본 v3.1 패키지 Section 4-A 분포 (sapling 80% S1/S2/S5) + 4-B 확장성 (S13+)
  + 4-C 작동 예시 (skeleton-matcher 검증 시드) 모두 참조 의무
- SKELETON_SECTIONS (grading.ts) 와 신규 SkeletonSpec.sections 정합성 유지

작업원칙 절대 준수 — 평소와 동일.
```

---

## ~~다음 새 채팅 시작 메시지 — 2026-05-12 (v3.1 FINAL 채택 후 7-Diag 진입)~~ ✅ COMPLETED

> Sprint 7-Diag MVP completed on 2026-05-13 (commit df66111). Production functional test passed: 3 PDF cases (S5 / S10 / S4) matched exactly.
> The message below is preserved for git history. Use the ACTIVE message above.


본 메시지를 다음 새 채팅의 첫 입력으로 사용하세요.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md, 
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고 
현재 상태를 파악한 후 브리핑해주세요.

직전 docs commit은 4b58a52 (v3.1 FINAL adoption).
직전 작업은 'v3.1 FINAL docs 일괄 갱신' (docs-only).

본 세션 진입 작업:

STEP 0 — 환경 점검 (작업원칙 #21)
STEP 7-Diag — 진단 모듈 MVP 본격 코드 작업
  대상 파일 신규/수정:
    - src/lib/diagnosis/concept-tone-inference.ts (신규)
    - src/lib/diagnosis/image-quality.ts (신규, Sharp 4축)
    - src/lib/diagnosis/grading.ts (신규, L1~L4 + CTI 통합)
    - src/lib/diagnosis/prompts/vision-quality-prompt.ts (신규, Claude Vision 보강용)
    - prisma/schema.prisma (Diagnosis 모델 추가, ConceptTone JSON 필드)
    - app/api/diagnose/route.ts (신규, 동기 처리 1초 미만 목표)
  
  CTI 8축은 본 진입 작업의 핵심.
  구체 명세는 docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 참조.

진입 전 확인:
- 5개 MD 정독 + 신규 research 문서 정독
- ANTHROPIC_API_KEY 도입 시 환경변수 보안 체크리스트 12개 항목 적용 (research 문서 Appendix E)
- 7-Skel(12 골격 정의)은 본 세션에서 Skills theme-factory 활용해 한 번에 일괄 생성 시도

작업원칙 절대 준수 — 평소와 동일.
```

---

## ~~다음 새 채팅 시작 메시지 — 2026-05-11 (Sprint X 채택 후) ✅~~ (deprecated, 2026-05-12 v3.1 FINAL 채택으로 폐기)

*아래 메시지는 v3.1 FINAL 채택 전 버전입니다. 위의 ACTIVE 메시지를 사용하세요. 본 섹션은 변경 이력 보존 목적으로만 남깁니다.*

(직전 'Sprint X' 인계 메시지 본문은 그대로 보존)

---

---

## 다음 새 채팅 시작 메시지 — 2026-05-12 Sprint X (v2.0 아키텍처 채택 + Gemini 제거 + 정적 자산 라이브러리)


> **DEPRECATED** — 2026-05-12 v3.1 FINAL adoption. Use the ACTIVE message above. This section preserved for git history only.
<!-- sprint-x-handoff-short v1 -->

```
꽃틔움 가든 — Sprint X (v2.0 아키텍처 채택) 시작.

docs/plan/PROGRESS.md (슬림 진입점) → ROADMAP.md → SESSION_LOG.md 정독. 본 Sprint는 사용자 제공 리서치 v2.0 채택이라 *반드시 docs/research/KKOTIUM_V2_ARCHITECTURE_2026_05.md 전체 정독 의무*. PRINCIPLES_LEARNED.md 작업원칙 #37 신규 정독. SPRINT_PLAN.md Sprint X / Y / Z 정의 정독. STEP 0 환경 점검 후 현재 상태 + Sprint X 디테일 계획 + Day 1~7 분할 권장안을 브리핑해주세요. 본 작업 시작은 제 Y/N 승인 후 진행.

[STEP 0 환경 점검]
git rev-parse HEAD origin/main && \
  git status --short && \
  git stash list && \
  wc -l docs/plan/*.md && \
  curl -sIo /dev/null -w "Vercel HTTP: %{http_code}\n" https://kkotium-garden.vercel.app/dashboard && \
  echo "Latest prod deploy SHA: $(gh api 'repos/kkotium-dot/kkotium-garden/deployments?environment=Production&per_page=1' --jq '.[0].sha[0:7]')" && \
  scripts/verify-vercel-deploy.sh

[v2.0 아키텍처 핵심 메시지 — 정독 후 반드시 인지]
- "Vercel 런타임 = 정적 자산 + 안전한 서버 연산만"
- "Production runtime never calls image generation APIs" (작업원칙 #37)
- 2-Phase 분리:
  • Phase 1 (Creative): Claude Web Pro Max 세션 — Adobe MCP / Canva MCP / Artifacts. 신규 카테고리·시즌·A급 단건. API 키 노출 위험 0.
  • Phase 2 (Production): Vercel 런타임. Groq만 사용. 일 10~100건 자동.
- Gemini 완전 제거 — 비용 77% 절감 + 자동 폐기 사고 0회 절감

[Sprint 7 P0/P1 + P0-B enhancement 완료 정리]
- P0-A 옵션 정확도 / P0-B 골든윈도우 + DataLab market context / P0-C 효자상품 ✅
- P1-A 카테고리 1페이지 일치율 / P1-B 금기어 페널티 / P1-C 태그 사전 등재 검증 ✅
- 브라우저 E2E 검증 완료 (Claude Preview MCP, 3 시나리오)
- production a495572 → f958bb0 (MD only)

[Sprint X 작업 범위 — 7일 액션 플랜 분할 권장]
**디자이너 작업 (사용자 Claude Web 세션에서, Day 1~3)**:
- Day 1: Adobe MCP search_design + create_firefly_board로 카테고리별 템플릿 + 무드보드 + Lightroom 50장 큐레이션 → Supabase Storage 업로드
- Day 2: 5섹션 마스터 PSD 제작 (Photoshop Variables 정의)
- Day 3: Lightroom 마스터 프리셋 (카테고리 5-7개)

**본 앱 코드 작업 (Day 4~7)**:
- **Day 4 우선** (Sprint X 첫 본 세션):
  • 신규 src/lib/image/cloudinary.ts (누끼 + 패딩 빌더)
  • 신규 src/lib/image/sharp-composite.ts (5섹션 합성)
  • 신규 src/lib/image/lifestyle-picker.ts (Supabase Storage 인덱스 기반 선택기)
  • Gemini 의존성 제거 — /api/category/suggest의 suggestWithGemini() 함수 제거 + .env.local 3개 변수 제거 + Vercel env 제거
  • TSC 0 errors 확인
- Day 5: Groq 카피라이팅 + 다크패턴 정규식 필터 강화
- Day 6: A/B/C 분류 알고리즘 + 검수 위젯 (Claude Artifacts 4.1/4.4 본 앱 구현체)
- Day 7: 네이버 커머스 API 연동 + 첫 C급 일괄 등록

[Sprint Y / Sprint Z 후속 (Sprint X 완료 후 별도 세션)]
- Sprint Y: 5섹션 상세페이지 자동 생성 (Sharp + Groq + 다크패턴 + DetailPagePreview + ABCSimulator + BatchProgressMonitor)
- Sprint Z: 라이프스타일 큐레이션 + DesignTokenPanel + 보안 체크리스트 자동 검증 스크립트

[페르소나]
B2B 이커머스 ERP + 네이버 파워셀러 + UI/UX 시니어. 단독 IA/삭제 결정 금지. Sprint X Day 4 작업 시 *각 신규 lib 파일별로 사용자 명시 승인 단계 진행* — Sharp / Cloudinary 합성 결과 시각 검증 단계가 핵심.

[중요 — 본 Sprint는 7일짜리 분할 의무]
v2.0 PDF의 7일 액션 플랜은 "한 세션에 모두" 가 아닌 *Day 단위 분할*. Sprint X 첫 세션 = Day 4 본 앱 코드 작업만 (Day 1~3은 사용자 디자이너 작업이며 본 앱 작업 의존성 없음, 병렬 진행). Day 5/6/7 각각 별도 세션 권장.

[제한사항 정직 보고]
- Adobe Firefly Services API: 라이선스 차단 확정 (Adobe Developer Console "License required" 메시지). v2.0 PDF의 Phase 1 Adobe MCP path는 사용자가 *Claude Web Pro Max + Adobe MCP* 통해 진행 (Vercel API 통합 불가).
- 본 세션은 사용자가 직접 Claude Web 세션에서 Adobe MCP 사용 가능한지 확인 후 Day 1~3 작업 병렬 시작.
- 본 앱은 Day 4부터 코드 작업 진행, 정적 자산이 Supabase Storage에 채워지면 자동으로 활성화.

[주의 — 작업원칙 위반 학습]
worktree vs main 절대 경로 혼동 사고 누적 3회 (Phase 3 이전). Phase 4 + Phase 5 + Sprint 7 P0/P1 누적 0회 — Edit/Write 호출 시 절대 경로 시작이 워크트리 prefix `/Users/jyekkot/Desktop/kkotium-garden/.claude/worktrees/<name>/`인지 *매 호출 확인 의무*.

[silent failure 학습 — 2회 발견 패턴]
"API 키 다 등록했는데 실제 작동하나?" 의문이 silent bug 발견의 핵심 트리거. Sprint X Day 4에서 Gemini 의존성 제거 후에도 *Cloudinary + Groq + Supabase Storage 모든 path functional test 의무*. 본 v2.0 채택의 핵심 가치 (보안 표면 0)가 실제 production에서 작동하는지 production curl + 브라우저 E2E로 매 commit 검증.
```

---
## 직전 인계 메시지 — Sprint 7 Track B AI Studio (취소됨 — v2.0 아키텍처 채택으로 Sprint X로 대체)

<!-- sprint-7-trackb-handoff-short v1 -->

```
꽃틔움 가든 — Sprint 7 Track B (AI Studio) 시작.

docs/plan/PROGRESS.md (슬림 진입점) → ROADMAP.md → SESSION_LOG.md 정독. 필요 시 PRINCIPLES_LEARNED.md / PRINCIPLES_CODE.md / SPRINT_PLAN.md / REFERENCES.md spot-read. STEP 0 환경 점검 후 현재 상태 + Track B 디테일 계획을 브리핑해주세요. 본 작업 시작은 제 Y/N 승인 후 진행.

[STEP 0 환경 점검]
git rev-parse HEAD origin/main && \
  git status --short && \
  git stash list && \
  wc -l docs/plan/*.md && \
  curl -sIo /dev/null -w "Vercel HTTP: %{http_code}\n" https://kkotium-garden.vercel.app/dashboard && \
  echo "Latest prod deploy SHA: $(gh api 'repos/kkotium-dot/kkotium-garden/deployments?environment=Production&per_page=1' --jq '.[0].sha[0:7]')" && \
  scripts/verify-vercel-deploy.sh

[Sprint 7 P0 + P1 완료 정리]
- P0-A 옵션 정확도 / P0-B 골든윈도우 / P0-C 효자상품 (Inbox 4 placeholders 모두 live)
- P0-B enhancement: DataLab market context cache + silent 10→3 chunked bug fix
- P1-A 카테고리 1페이지 일치율 검증 — Naver Shopping search API 통합. agreed/override/synthesized 3 모드
- P1-B 상품명 금기어 페널티 — banned_word 15개 + duplicate + special_chars + length 4 rule. NameRulesPanel 인라인 발화
- P1-C 태그 사전 등재 검증 — Search Ad keyword volume proxy + threshold 30/10. TagVerificationPanel 수동 trigger
- **브라우저 E2E 검증 완료** (Claude Preview MCP) — 3 입력 시나리오 / 카테고리 자동 추천 / 태그 검증 panel 모두 실제 작동 확인
- production a495572

[Sprint 7 Track B AI Studio 작업 범위]
**M1 썸네일 (AI 이미지 생성/편집)** — 도매꾹 원본 이미지 → AI 배경 제거 + 깨끗한 흰배경 + 텍스트 추가
- Adobe Firefly / Imagen / Cloudinary AI transforms 검토 (이미 NEXT_PUBLIC_CLOUDINARY_* 환경변수 보유)
- `src/lib/ai-image/thumbnail-generator.ts` (신규)
- `씨앗 심기` 이미지 업로드 영역에 "AI 썸네일 자동 생성" 버튼

**M2 상세페이지 5섹션** — AI가 자동 생성하는 상세페이지 구조
- 5섹션: 후킹 / 핵심특징 / 사용법 / 스펙 / 신뢰
- 기존 `aeo_content` 필드 + 기존 `seo_hook_text` 활용
- AI 호출 Gemini → Groq fallback (기존 패턴)

**M3 어도비 통합** — Adobe MCP / Adobe Firefly API 통합 가능성 검토
- 현재 NEXT_PUBLIC_CLOUDINARY로 단순 이미지 변환만
- Adobe Firefly API 키 사용자 보유 여부 사전 확인 필요

**M4 A/B 테스트** — 썸네일/상세페이지 변형 2개를 동시 등록 후 CTR/전환율 비교
- 사용자 첫 상품 등록 + 7일+ 실 데이터 누적 필요 — 본 Sprint에서는 *infrastructure*만, 검증은 보류

[페르소나]
B2B 이커머스 ERP + 네이버 파워셀러 + UI/UX 시니어. 단독 IA/삭제 결정 금지. M3 어도비 통합 깊이 (Cloudinary로 충분 vs Firefly 풀 통합) 결정은 사용자 위임 (API 키 확인 필요).

[참고 — MD 분할 권고]
SESSION_LOG.md 현재 ~1400줄 (T1 1000 초과, T2 1500 미달). Track B 진입 시 자동 분할 권장.

[주의 — 작업원칙 위반 학습]
worktree vs main 절대 경로 혼동 사고 누적 3회 (Phase 3 이전). Phase 4 + Phase 5 + Sprint 7 P0/P1 누적 0회 — Edit/Write 호출 시 절대 경로 시작이 워크트리 prefix `/Users/jyekkot/Desktop/kkotium-garden/.claude/worktrees/<name>/`인지 *매 호출 확인 의무*.

[silent failure 패턴 학습]
Sprint 7 P0-B에서 DataLab 10→3 chunk 실패, Sprint 7 P1-A에서 NAVER_CLIENT_ID Open API 401 모두 functional test에서만 발견됨. *"API 키 다 등록했는데 실제 작동하나?"* 의 의문이 silent bug 발견의 핵심 트리거. Track B AI Studio 진입 시 사용자 등록된 Cloudinary + Adobe / Firefly 키도 *동일하게 functional test로 작동 검증 의무*.
```

---
## 직전 인계 메시지 — Sprint 7 P1 (참고용, 완료됨)

<!-- sprint-7-p1-handoff-short v1 -->

```
꽃틔움 가든 — Sprint 7 P1 시작.

docs/plan/PROGRESS.md (슬림 진입점) → ROADMAP.md → SESSION_LOG.md 정독. 필요 시 PRINCIPLES_LEARNED.md / PRINCIPLES_CODE.md / SPRINT_PLAN.md / REFERENCES.md spot-read. 아래 STEP 0 환경 점검 후 현재 상태 + P1 디테일 계획을 브리핑해주세요. 본 작업 시작은 제 Y/N 승인 후 진행.

[STEP 0 환경 점검]
git rev-parse HEAD origin/main && \
  git status --short && \
  git stash list && \
  wc -l docs/plan/*.md && \
  curl -sIo /dev/null -w "Vercel HTTP: %{http_code}\n" https://kkotium-garden.vercel.app/dashboard && \
  echo "Latest prod deploy SHA: $(gh api 'repos/kkotium-dot/kkotium-garden/deployments?environment=Production&per_page=1' --jq '.[0].sha[0:7]')" && \
  scripts/verify-vercel-deploy.sh

[Sprint 7 P0 완료 정리]
- P0-A 옵션 정확도 — option-integrity.ts (hashOptions + validateStatus/Channel + evaluateIntegrity), /api/crawler/domemae returns integrityFlags, /crawl IntegrityBanner
- P0-B 골든 윈도우 — golden-window-tracker.ts (D+1/3/7 stages), /api/golden-window/active, GoldenWindowWidget (Inbox 3rd placeholder 교체)
- P0-C 효자 상품 — pareto-analyzer.ts (30-day OrderItem aggregation), /api/products/pareto, TopProductsCard 활성화 (Section 3), ParetoInboxRow (Inbox 4th placeholder 교체)
- automation-registry: golden-window + pareto-recalc pending → active (on-event)
- production 8c477ee

[Sprint 7 P1 작업 범위]
- **P1-A 카테고리 1페이지 일치율 검증** (리서치 6번)
  • `src/lib/category-page-validator.ts` (신규) — 네이버 쇼핑 1페이지 카테고리 분포 분석 → 80%+ 일치 카테고리만 추천
  • `/api/category/suggest` 강화 — Phase 5 cache layer 위에 1페이지 일치율 검증 추가
  • automation-registry: category-1page pending → active
- **P1-B 상품명 금기어 페널티 강화** (리서치 4번)
  • `src/lib/honey-score.ts` 강화 — 이벤트/할인/배송/적립/쿠폰 키워드 + 중복 단어 3회+ + 허용 외 특수문자 명시적 검출
  • 씨앗 심기 / 검색 조련사 UI에 빨간 알림 추가
- **P1-C 태그 사전 등재 검증** (리서치 7번)
  • `src/lib/naver/tag-dictionary.ts` (신규) — 네이버 검색광고 API 키워드 도구 활용 (CUSTOMER_ID: 3755315)
  • 태그 입력 UI에 "사전 미등재" 경고
  • automation-registry: tag-dictionary pending → active

[페르소나]
B2B 이커머스 ERP + 네이버 파워셀러 + UI/UX 시니어. 단독 IA/삭제 결정 금지. P1-B 금기어 정책 (blocking vs warning-only) 결정은 사용자 위임 (Session D 학습: 셀러 자율성 보호).

[참고 — MD 분할 권고]
SESSION_LOG.md 현재 1016줄 (T1 1000 도달). 다음 세션 STEP 0에서 자동 분할 권고 (의무 아님, 작업원칙 #31 (a) T1 권고 / T2 1500 의무).

[주의 — 작업원칙 위반 학습]
Session E-1 + Phase 3에서 worktree vs main 절대 경로 혼동 사고 누적 3회 (작업원칙 #34). Phase 4 + Phase 5 + Sprint 7 P0에서 각 0회 — Edit/Write 호출 시 절대 경로 시작이 워크트리 prefix `/Users/jyekkot/Desktop/kkotium-garden/.claude/worktrees/<name>/`인지 *매 호출 확인 의무* (P1 유지).
```

---
## 직전 인계 메시지 — Sprint 7 P0 (참고용, 완료됨)

<!-- sprint-7-handoff-short v1 -->

```
꽃틔움 가든 — Sprint 7 시작.

docs/plan/PROGRESS.md (슬림 진입점) → ROADMAP.md → SESSION_LOG.md 정독. 필요 시 PRINCIPLES_LEARNED.md / PRINCIPLES_CODE.md / SPRINT_PLAN.md / REFERENCES.md spot-read. 아래 STEP 0 환경 점검 후 현재 상태 + Sprint 7 디테일 계획을 브리핑해주세요. 본 작업 시작은 제 Y/N 승인 후 진행.

[STEP 0 환경 점검]
git rev-parse HEAD origin/main && \
  git status --short && \
  git stash list && \
  wc -l docs/plan/*.md && \
  curl -sIo /dev/null -w "Vercel HTTP: %{http_code}\n" https://kkotium-garden.vercel.app/dashboard && \
  echo "Latest prod deploy SHA: $(gh api 'repos/kkotium-dot/kkotium-garden/deployments?environment=Production&per_page=1' --jq '.[0].sha[0:7]')" && \
  scripts/verify-vercel-deploy.sh

[Sprint 6 완료 정리 — 디테일은 SESSION_LOG.md 직전 5 entries 참고]
- Phase 3 (6-B 가격 변동) ✅ — InventorySnapshot.supplierPrice + PriceMovementAlert + dome-price-analyzer.ts + PriceMovementWidget. production c8aba85
- Phase 4 (6-C 다른 셀러 + supplier-score) ✅ — CompetitorSnapshot + supplier-score-aggregator (pure compute) + CompetitorRadarWidget + SupplierGardenWidget. production b836687
- Phase 5 = Session F (6-E 카테고리 캐시) ✅ — dome_categories + category_mappings + dome-category-cache.ts + /api/category/suggest cache layer + cron-weekly piggy-back. production a8a58c2. Gemini hit-rate cache 작동 검증 완료 (2nd call cacheHit: "name_hash")
- 6-D 4모드 발송은 이미 daily cron + inventory poller + price analyzer에서 active — Phase 5 추가 작업 0건

[Sprint 7 작업 범위 — P0/P1]
- **P0-A 도매꾹 OpenAPI v4.5 옵션 정확도 강화** (리서치 11번)
  • `src/lib/option-integrity.ts` (신규) — selectOpt 해시 + 텍스트 동시 비교
  • `src/lib/crawler/auto-mapper.ts` 강화 — seller.vacation 검증 + channel 도매꾹/도매매 검증
  • `src/app/crawl/page.tsx` — 옵션 변경 / 휴가 / 채널 불일치 시 UI 알림
- **P0-B 등록 7일 골든 윈도우 트래킹 위젯** (리서치 10번)
  • `src/lib/golden-window-tracker.ts` (신규) — D+1/D+3/D+7 분기, 클릭/판매 상태 평가
  • `src/components/dashboard/GoldenWindowWidget.tsx` (신규) — Inbox 3번째 placeholder ("등록 7일 골든 윈도우", P0-B) 교체
  • "상품명 토큰 1개 교체 권장" 자동 제안 (가장 약한 키워드)
  • automation-registry: golden-window pending → active
- **P0-C 효자 상품 자동 식별 (멱법칙 시각화)** (리서치 10번)
  • `src/lib/pareto-analyzer.ts` (신규) — orders 테이블 기반 상위 20% 자동 식별
  • `src/components/dashboard/cards/TopProductsCard.tsx` 강화 — Section 3 정원 건강의 "효자 상품 TOP 5" 카드 활성화 (현재 PO-C 준비 중 배지)
  • automation-registry: pareto-recalc pending → active
- 본 Sprint 후 P1 (P1-A 카테고리 1페이지 + P1-B 금기어 + P1-C 태그사전) → Sprint 7 Track B AI Studio

[페르소나]
B2B 이커머스 ERP + 네이버 파워셀러 + UI/UX 시니어. 단독 IA/삭제 결정 금지. P0-A 옵션 변경 감지 시 *blocking vs warning-only* 정책 결정은 사용자 위임 (Session D 학습: 셀러 자율성 보호 패턴).

[주의 — 작업원칙 위반 학습]
Session E-1 + Phase 3에서 worktree vs main 절대 경로 혼동 사고 누적 3회 (작업원칙 #34). Phase 4 + Phase 5에서 각 0회 — Edit/Write 호출 시 절대 경로 시작이 워크트리 prefix `/Users/jyekkot/Desktop/kkotium-garden/.claude/worktrees/<name>/`인지 *매 호출 확인 의무* (Sprint 7 유지).
```

---

## Session E 작업 디테일 (인계 메시지 본문에서 분리 — 새 세션이 정독 시 흡수)

### Phase 3 (Sprint 6-B 가격 변동 백엔드) — 완료 요약

- DB 결정: **InventorySnapshot 확장 채택** (사용자 위임 사항). PriceMovementAlert 별도 테이블 (LowStockAlert 미러).
- 통합 전략: 도매꾹 getItemView가 basis + qty + price.supply를 한 호출로 반환 → 별도 cron 0, 별도 API 호출 0. dome-inventory-poller의 active loop에서 evaluatePriceMovement도 함께 호출.
- Cold start: 사전 snapshot < 1건일 때는 alert 비발생 (baseline 계산 불가).
- Discord: orange/red만 PRICE_CHANGE 채널 발송 (yellow는 dashboard widget only — spam 방지).

### Phase 4 (Sprint 6-C + 공급사 누적 평가) — 완료 요약

- Sprint 6-C 채택 아키텍처:
  - DB: 신규 `competitor_snapshots` 테이블 (per-product per-poll capture). SupplierStockProfile *확장 안 함* — 별도 테이블이 raw data + aggregated layer 분리 깔끔.
  - Adapter: `domemae-adapter.searchItems`를 실제 구현 (getItemList v4.5). Keyword = 상품명 첫 3 token, sortBy=popular, pageSize=20.
  - Tracker: 활성 상품당 1 search call/cron. 6-A getItemView와 별도 API quota 버킷이지만 같은 cron 호출 안에서 실행 (별도 cron route 0).
  - Widget: CompetitorRadarWidget — 우리 가격이 1페이지 median 대비 ±5% 안이면 green, 5-10% yellow, 10%+ red.
- 공급사 누적 평가 채택 아키텍처:
  - **신규 테이블 0개** — pure compute approach. SupplierStockProfile + PriceMovementAlert + Product (기존 데이터)에서 직접 산정.
  - composite = 0.45 × trustScore + 0.35 × depletionScore + 0.20 × priceStability (0..100)
  - Tier: 80+ green ("꽃나무처럼 든든") / 60+ yellow ("조금만 더 지켜봐요") / red ("대안 검토 권장")
  - 마운트: Section 4 잠재력 (사용자 위임 사항을 시니어 판단으로 결정 — Inbox보다 잠재력 카드 분위기에 정합)

### Phase 5 작업 범위 — Sprint 6-E 카테고리 캐시 + 6-D 4모드 발송 통합

1. **Sprint 6-E 도매꾹 카테고리 캐시** — `src/lib/dome-category-cache.ts` (신규)
   - 도매꾹 getCat ver 2.0 전체 카테고리 트리 캐시 (4-5 depth, 수천 노드)
   - 신규 테이블: `DomeCategory` (캐시) + `CategoryMapping` (도매꾹 → 네이버 매핑 기억)
   - AI 카테고리 매핑 (`api/category/suggest`) 강화: 캐시 hit 시 AI 호출 skip (현재 매번 AI 호출 → 80%+ hit-rate 목표)
   - cron-weekly에 캐시 갱신 통합 (변경 빈도 낮음, 주간 1회 충분)

2. **Sprint 6-D 4모드 발송 통합** — 꼬띠 4모드 (Recommend / Stock / Price / Score) Discord 발송 path 활성화
   - 현재 `dome-curator.ts`에 4모드 foundation 완료 (Sprint 6-D 1-5단계)
   - 정원 일지 발송 path는 dry-run only — Phase 5에서 cron-daily에 통합 + Discord KKOTTI_RECOMMEND 채널 발송 활성화
   - `automation-registry`: `kkotti-curator` (또는 동등 entry) pending → active

3. 검증 + commit + push + verify-vercel-deploy.sh --wait
4. MD 갱신 + Sprint 7 인계

### 작업원칙 강제 (요약 — 풀 디테일은 PROGRESS.md)

- #17 commit msg `.commit-msg.tmp` + `git commit -F`
- #21 사전 점검 (HEAD/status/stash/wc + Latest prod deploy SHA == HEAD)
- #22 브라우저 시각 검증 의무 (API 200 ≠ 실작동 완료) — Session D에서 오타 1건 catch한 가치 입증
- #24 commit + push 한 turn 안에
- #26 IA 점검 — 새 위젯 마운트 슬롯 결정은 사용자 위임 (단독 IA 결정 금지)
- #29 (a~e++) 한글 처리 6+1 규칙
- #31 MD 1500줄 자동 점검 — SESSION_LOG 1336줄 T2 1500 미달 권고만, 본 세션 분할 의무 아님
- #32 push 전 `npm run build` 의무
- #33 useSearchParams Suspense 자동 점검
- #34 명백한 오류 파일 발견 시 사용자 알림
- #35 한글 사전 분리 패턴
- #36 Vercel deploy 검증 의무 (push 후 `verify-vercel-deploy.sh --wait`)

### Sprint 6 이후 일정 (계획서 원본 순서, 변경 없음)

- **Session F**: 6-E + 6-D 위젯 통합 (카테고리 매핑 + 꼬띠 4모드 정원 일지 발송 통합)
- **Sprint 7**: AI Studio 4모듈 (M1 썸네일 / M2 상세페이지 5섹션 / M3 어도비 통합 / M4 A/B 테스트)
- **Sprint 8**: 매출 상승 + 운영 흐름 안정화 후 Private API 자동발주 활용 (보류 트랙)

### 보류 트랙 (사용자 결정 필요)

- **6-A 실 데이터 검증** — 사용자 첫 도매꾹 상품 등록 후: minq 배너 시각 확인 (특히 minq>=2인 묶음 상품) + 폴링 1회 자동 실행 결과 + 알림 발생 시 mark-oos 모달 trigger 시각 확인. 본 검증은 사용자 환경에서만 가능.
- **VERCEL_TOKEN 발급** (https://vercel.com/account/tokens) — 발급 시 `verify-vercel-deploy.sh`이 build state까지 확인. 현재는 GitHub Deployments path로 deployment 등록까지만 확인. 두 path 모두 자동 fallback.
- **Vercel Pro plan upgrade** ($20/월) — `vercel.json` 한 줄 수정으로 6시간 cron 복귀. 매출 600만원+ 도달 후 진입 권장.
- **잔재 파일 정리** (작업원칙 #34 보고) — `src/app/products/page.backup.*.tsx` 3건 + dashboard `*.BROKEN.backup` 2건 + `DashboardFilters.backup.tsx` 1건 + `recursing-galileo-205156` worktree (ff4ef4d 옛 commit). 사용자 별도 승인 시 별도 세션 처리.
- **기존 네이버 스토어 100개+ 상품 일괄 연동** — 본격 소싱 안정화 후 사용자 요청 시 시작.
- **Sprint 8 Private API 자동발주** — 매출 상승 + 운영 흐름에 따라 진입.
- **한글 sentinel 패턴 확장** — Session D에서 발견된 "즐시"/"개을" 같은 자모 결합 오타는 현재 sentinel(#29 e)에 없음. 패턴 추가 시 grep noise 증가 — 사용자 결정 위임.

### 환경 / 시크릿 (참고용)

- Supabase project ID: `doxfizicftgtqktmtftf`
- Naver Search Ad CUSTOMER_ID: `3755315`
- 카카오 채널 Public ID: `_xkfALG` (꽃틔움 KKOTIUM)
- AI: Groq lrltQb + 3IGN7i 정상 2키
- 도매매 Open API Key: `a6ff…c470bb`
- 도매꾹 Private API: 28개 전체 권한 발급 ✅ (Sprint 8 보류 트랙)
- Vercel project: `prj_H5HamuDSG0Na6j5dwDlYe9A6FfC4`
- Vercel team: `team_uwIkDWZsS2gogA04mZIVDuPF`
- Discord 5채널 webhook URL: orders / stock-alerts / daily / weekly / kkotti (Vercel 환경변수)

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
