# KKOTIUM GARDEN — ROADMAP

> **최종 업데이트**: 2026-05-08 (본 세션: 작업원칙 #31 자동 분할 + Sprint 6/7/8 계획 + 미완 마무리 ✅)
> **HEAD**: 76f592d (origin/main 일치) | **TSC**: 0 errors | **배포**: https://kkotium-garden.vercel.app
>
> **이 파일의 역할**: 진행 중·예정 Sprint 계획 + 영구 참조 (체크리스트, 비용 로드맵, 도구 사용 패턴)
> **누적 인계 메시지 + Phase A/B/C 완료 이력**: `docs/plan/archive/ROADMAP_2026Q2_MAY.md`
> **세션별 자세한 기록**: `docs/plan/SESSION_LOG.md` (직전 5세션) + `archive/SESSION_LOG_*.md`
> **현재 진행 현황 요약**: `docs/plan/PROGRESS.md`
> **소싱 워크플로우 리서치**: `docs/research/SPROUT_TO_POWER_SELLER_WORKFLOW_2026_05.md`

---

## 다음 새 채팅 시작 메시지 — 2026-05-08 (Sprint 6 시작 가능 상태) ✅

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
- 한글 작업 후: grep -nE "꽃젤|혁섭|쿠드|식타|릴고|헌서|위젝|스칵|쿠두" 검증 (작업원칙 #29 (e))
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
