# TASK_BRIDGE.md — Desktop ↔ Code 공동 기억 장치

> **이 파일의 역할**: 🖥 Desktop (planning + verify) 와 💻 Code (build + ship) 가 *실시간*으로 작업을 인수인계하는 ledger. SESSION_LOG가 세션 종료 후 회고라면, TASK_BRIDGE는 세션 진행 중 살아있는 hand-off 장부.
>
> **새 세션 첫 turn 의무 정독 순서**: PROGRESS.md → ROADMAP.md → SESSION_LOG.md → **TASK_BRIDGE.md** (현재 진행 상태 1분 파악).
>
> **갱신 정책**: 매 hand-off 시 §3 ACTIVE 섹션 갱신 의무. 완료 hand-off는 §7 ARCHIVED로 이동. T1 1000 / T2 1500 줄 임계 도달 시 작업원칙 #31 분할.

---

## §0 본 파일의 7-step 시스템 (작업원칙 #41)

| Step | 행동 | 책임 |
|---|---|---|
| 1 | 세션 시작 시 §3 ACTIVE 정독 | 양 환경 |
| 2 | §4 STANDING + §6 PENDING 확인 | 양 환경 |
| 3 | 작업 진행 (단일 commit 단위) | 작업 측 (Desktop or Code) |
| 4 | 완료 시 §3 ACTIVE 갱신 (FROM/TO/BASELINE/SCOPE/NEXT) | 작업 측 |
| 5 | hand-off 메시지 보고 (5-step 형식) | 작업 측 |
| 6 | 검증 측 cross-track 확인 (git + Vercel + DB + Chrome 가능 한 만큼) | 검증 측 |
| 7 | 통과 시 다음 ACTIVE로 갱신 → §3 이전 entry는 §7로 archive | 검증 측 |

---

## §1 두 환경 역할 표 (영구 참조)

| 측면 | 🖥 **Desktop** | 💻 **Code** |
|---|---|---|
| **MCP 강점** | Supabase / Vercel / Chrome / Filesystem(read) / image-search / web | Filesystem(write) / Bash / Git / TSC / Playwright |
| **주특기** | 리서치 · 아키텍처 · 오류 진단 · 외부 자료 대조 · 검증 smoke · paste-ready 본문 작성 | 코드 작성 · 테스트 · 패키지 · git · 로컬 서버 · MD 실 적용 |
| **할 수 있는 것** | Supabase `execute_sql`/`apply_migration` · Vercel deploy 조회 · Chrome E2E · 코드 read · *제안 본문* 작성 | 모든 파일 *생성/편집* · `tsc --noEmit` · `npm run build` · `git push` · MD 파일 *실제 적용* |
| **할 수 없는 것** | 코드 파일 *생성/편집* · 큰 추적 MD 부분편집 · git commit · 패키지 설치 (★ 단 핸드오프 MD는 #49로 write_file 직접 작성 허용) | Supabase/Vercel/Chrome/image-search MCP 직접 호출 |
| **핸드오프 인계 (#49)** | docs/handoff/ MD를 Filesystem:write_file로 직접 작성(다운/업로드 0) | 작성된 핸드오프 git add/commit 보존 + 큰 추적 MD Python full-overwrite 반영 |
| **세션 시작 트리거** | "꽃틔움 가든 Desktop 진입 + TASK_BRIDGE §3 정독" | CLAUDE.md 자동 + 4 MD 정독 |
| **세션 종료 의무** | §3 ACTIVE 갱신 + 사용자에게 paste-ready 메시지 전달 | 동일 + git push + `verify-vercel-deploy.sh --wait` |

---

## §2 핑퐁 프로토콜 — 5-step 표준 hand-off 형식

```
┌─── [TASK BRIDGE] hand-off ──────────────────────────
│ FROM: 🖥 Desktop  ↔  TO: 💻 Code  (또는 역방향)
│ BASELINE: <SHA> (Vercel production READY)
│ SCOPE: <Sprint 이름 + sub-phase>
│
│ ▼ STEP 0 (점검) — Code 측이 자동 실행
│   cd /Users/jyekkot/Desktop/kkotium-garden && \
│   git rev-parse HEAD origin/main && \
│   git status --short && \
│   curl -s -o /dev/null -w "production_http=%{http_code}\n" \
│     https://kkotium-garden.vercel.app/
│
│ ▼ SCOPE (작업 범위) — 단일 commit 단위
│   <상세 변경 명세>
│
│ ▼ VERIFICATION TRIGGER (검증 신호)
│   push 직후 hash 보고 → Desktop이 자동:
│   (1) git HEAD + Vercel deploy cross-check
│   (2) Supabase 사전 단정 (필요 시)
│   (3) Chrome MCP smoke
│   (4) 결과 보고 + 다음 hand-off 또는 PENDING
│
│ ▼ FALLBACK (실패 시)
│   <회귀 시 즉시 대응 path>
└─────────────────────────────────────────────────────
```

역방향 (💻 Code → 🖥 Desktop) 도 동일 5-step.

---

## §3 ACTIVE HAND-OFF ⭐ (항상 최상단 한 섹션, 매 hand-off 시 갱신)

### 2026-07-18 (113) 작업 H — 정원 창고/꽃밭 돌보기 화면 분화 (H-1~H-4, 코드변경 있음·tsc0·build0·prod 배포대기)
- **Target**: 다음 세션 · 권위 docs/design/SCREEN_DIFFERENTIATION_SPEC_2026-07-17.md + 원칙 #266/#264/#62/#265 + 운영자 승인(2026-07-18).
- **착수 순서**: 지시대로 H-4(시스템 가드) 먼저 → H-3 좀비배지 제거가 자동으로 따라옴 확인 → H-1/H-2/H-3 나머지.
- **H-4 DONE (★최우선)**: `src/lib/products/tuning-signals.ts`의 `loadTuningScores()` 최상단에 `allProducts.filter(p => !!p.naverProductId)` 가드 추가 + `TuningSourceProduct`에 `naverProductId` 필드 신설. 이 함수 하나가 4개 호출부(`/api/products`·`/api/products/linked`·`/api/dashboard/stats`·`/api/products/[id]/naver-detail`·`daily-signals.ts` 디스코드 다이제스트) 전부의 공통 관문이라 **한 곳 수정으로 5곳 동시 정상화**(#62). 전수 확인: 5개 호출부 모두 `naverProductId` 이미 Prisma select에 포함 + 필드명 일치 확인(캐스팅 그대로 통과). **실측**: `/api/dashboard/stats` zombieCount=1로 목록의 좀비 배지 1건(플라티코)과 일치 확인.
- **H-1 DONE**: 헤더 액션 완전 분기. 정원 창고 = `[크롤링에서 가져오기]`(→`/crawl`) `[준비된 것 일괄 발행 N]`(readinessMap 기준 100% 상품만, 기존 `NaverRegisterModal` 재사용) `[+ 상품 등록]`. 꽃밭 돌보기 = 기존 `[네이버 동기화][네이버 상품 가져오기]` 유지, `[+ 상품 등록]` 제거. 새로고침 버튼은 공통 유지.
- **H-2 DONE**: 정원 창고 필터를 `TAB_CONFIG`에 얹지 않고 로컬 `gardenReadiness` 서브필터(준비 미흡/발행 가능/전체)로 분리 — 판매 상태 축과 완전히 다른 축이라 혼재 방지. `gardenCounts`를 draft-필터된 부분집합에서만 계산해 **뷰 스코프 누출 근본 차단**(스펙 지적사항). 꽃밭 돌보기 더보기 드롭다운에서 `draft` 항목 제거(정원 창고는 사이드바 "꿀통 창고" 진입점 소관으로 일원화). 부수 조치: `oos`/`reactivation`/`revival`/`lowMargin`/`drift`/`ready` TAB_CONFIG 필터에 `!!p.naverProductId` 방어 가드 추가(엣지케이스 누출 방지, revival은 H-4로 이미 자동 방어됨).
- **H-3 부분 DONE**: 컬럼 헤더 라벨 조건부 전환(정원="작업 단계/예상 마진/예상 판매가", 꽃밭="상태/순마진/판매가"). 정원 창고 행에서 `InventoryBadge`("재고 확인 실패") 렌더 억제. 좀비 배지는 H-4로 자동 해결(지시대로 순서 이득 확인).
  - **★스코프 축소 2건(운영자 재확인 필요)**: (1) 스펙 4-3 표의 "정원=배송 컬럼 제거·준비도 핵심 강조 / 꽃밭=준비도 컬럼 제거·점수→좀비지수 교체" 같은 **컬럼 재배치/제거**는 이번 턴에 미착수 — `COL` 그리드 템플릿과 `renderRow`/`TableHeader`가 강하게 결합돼 있어 폭 재분배 없는 라벨 교체보다 리스크가 커서 별도 검증 턴으로 분리 판단. (2) "네이버 재고 폴링도 동일 가드(#260 연장)" — `dome-inventory-poller.ts`를 확인한 결과 이건 **네이버가 아니라 도매꾹(공급사) 재고 폴러**이고, 헤더 주석에 "Persist InventorySnapshot rows for every product (incl. DRAFT)"가 **의도적 설계**로 명시돼 있음(발행 전에도 공급사 재고를 미리 알고 싶다는 합리적 이유 가능). 백엔드 폴링 자체를 끄는 대신 **화면 렌더링만 억제**하는 쪽으로 스코프를 좁혔음 — 폴링을 실제로 꺼야 한다면 별도 지시 필요(비용/DB 부하 관점 재검토 대상일 수 있음).
- **검증**: tsc0 · `rm -rf .next && npm run build` 0 errors · 로컬 dev 브라우저 실측 — 정원 창고: 네이버동기화/가져오기 버튼 0개·판매중/판매중지/좀비꽃 필터 0개·좀비배지 0건·재고확인실패 0건·헤더 라벨 전환 확인(스크린샷). 꽃밭 돌보기: 상품등록 버튼 제거·기존 필터/배지/좀비 정상 표시·회귀 없음 확인(스크린샷). sentinel grep 0. **prod 미배포** — 이 턴 종료 시점 기준.
- **패치 위치**: `src/lib/products/tuning-signals.ts`(H-4 가드) · `src/app/products/page.tsx`(H-1/H-2/H-3, TAB_CONFIG 가드 포함).
- **다음 1액션**: [운영자] push+deploy 승인 후 **육안 확인 필수**(#265) — 특히 정원 창고 헤더 3버튼·필터 3종·"준비된 것 일괄 발행" 동작. [운영자] 스코프 축소 2건(컬럼 재배치, 도매꾹 재고폴링 실제 차단 여부) 진행 여부 결정.
- **의존성**: (112) 커밋 위에 이어짐.

### 2026-07-18 (112) #266 정합 확인 + 작업 G 잔여(swap/NaverPushPanel) 배포 완료 (FROM 💻 Code, 코드변경 있음·tsc0·build0·prod 배포완료)
- **Target**: 다음 세션 · 권위 docs/plan/PRINCIPLES_LEARNED.md #266 + docs/design/KKOTTI_PERSONA_VOICE_GUIDE.md + 운영자 승인(2026-07-18).
- **#266 정합 확인(코드 변경 없음)**: 운영자가 "9f0de1b에 Desktop 교정 3건이 함께 들어갔으니 되돌리지 말 것"이라 안내해 `git blame`으로 실측 — `src/app/products/page.tsx`의 `TAB_CONFIG.all.filter`가 이미 `p => !!p.naverProductId`(스토어 등록 여부 기준, #266 정의와 일치), `draft.filter`도 `status === 'DRAFT' && !p.naverProductId`로 정합, h1도 `{pageTitle}`(`tab==='draft' ? '정원 창고' : '꽃밭 돌보기'`) 동적 렌더로 이미 반영되어 있음을 확인. **손대지 않음** — 지시대로 되돌리지 않았고, 추가 수정도 불필요했음.
- **작업 G 잔여 그룹(swap+NaverPushPanel) DONE**: `swap-strings.ko.json`(7건 — concept.hint/human.hint/review.sliderHint/empty.title·hint/migrationPending.hint/error.title)·`NaverPushPanel.strings.ko.json`(4건 — autoWarnBody/stockOverwriteWarn/previewFail, autoWarnTitle은 배지형 라벨이라 미적용)에 정원사(까꿍)·카우걸(이랴) 톤 적용. 둘 다 `// No emoji` 컴포넌트 규율 유지(신규 텍스트는 이모지 없이 마커만; swap-strings의 기존 "🌷" 이모지는 손대지 않고 그대로 둠 — 원래 있던 것이라 범위 밖).
- **검증**: `persona-audit.py` 0건 파일 18→16개로 감소 · tsc0 · `rm -rf .next && npm run build` 0 errors · sentinel/이모지(신규분) grep 0 · push+`scripts/verify-vercel-deploy.sh --wait`(#36) 완료, prod HEAD `dc5b0da`, `/products` HTTP 200.
- **작업 G 잔여 남은 항목(운영자 보류 지시, 미착수)**: AssetBrowser(13)/GeneratedAssetLocations(12)/lifestyle-assets(12) — "꽃단장은 나중에 한 번에 수정" 지시로 보류(그때 페르소나 동시 적용). 나머지 13개 — 노출 빈도 낮아 보류. 0건 파일 16개 잔여.
- **R-1/R-2/R-3 시각 검증 — 대기 중**: 운영자가 "Desktop DOM 확인 완료했으나 시각 검증은 운영자 육안 필요(#265)"라고 명시. 이번 턴에서는 코드 변경 없이 대기만 함 — **운영자 스크린샷 회신 오면 후속 판단 필요**(다음 세션 최우선 확인 사항).
- **패치 위치**: `src/lib/i18n/swap-strings.ko.json` · `src/components/products/NaverPushPanel.strings.ko.json`.
- **다음 1액션**: [운영자] R-1/R-2/R-3 스크린샷 회신 → 문제 있으면 즉시 후속 수정, 없으면 rev58 3건 완전 종결. [운영자] "작업 H — 정원창고/꽃밭돌보기 화면 분화" 설계(b6167c7, docs only) 검토 후 착수 승인 여부. [운영자] 작업 G 잔여 16개 파일 착수 시점 결정.
- **의존성**: (111) 커밋 위에 이어짐. af9b760(#266 원칙)·b6167c7(작업 H 설계, docs only) 두 Desktop 커밋을 이번 세션에서 확인·반영.

### 2026-07-17 (111) rev58 R-1/R-2/R-3 — 운영자 스크린샷 발견 3건 전부 수정·검증 완료 (FROM 💻 Code, 코드변경 있음·tsc0·build0·prod 배포대기)
- **Target**: 다음 세션 · 권위 docs/plan/PARALLEL_WORK_TRACKER.md rev58 R-1/R-2/R-3 + docs/design/PANEL_REDESIGN_SPEC_2026-07-17.md + 운영자 승인(2026-07-17).
- **R-1 (자사 경쟁자 오집계, 🔴 최우선) DONE**: `src/lib/naver/shopping-search.ts`의 `analyzeCompetition(query, ownMallKey)`에 자사 몰명 제외 필터 추가(공백무시 부분일치) + `sampleSize` 필드 신설(자사 제외 후 실제 통계 낸 표본 크기). `src/app/api/naver/market-analysis/route.ts`가 `StoreSettings.storeName`(미설정 시 기본값 '꽃틔움')을 조회해 전달. `MarketAnalysisCard.tsx`에 R1 확장 — `sampleSize`가 1~2면 260px 전체 카드 대신 한 줄 축약("경쟁 상품 N개뿐(참고용)"), 0이면 기존 규칙대로 완전히 숨김. **실측**: 플라티코 쿼리를 API 직접 호출 — 자사 제외 후 `totalResults:0, sampleSize:0`으로 완전히 사라짐(원래 버그였던 "경쟁자는 꽃틔움 KKOTIUM 1개만 존재" 문구 자체가 이제 발생 불가). 실 경쟁사 10건 있는 쿼리("디자인 복 달항아리")는 전체 카드 그대로 정상 렌더 확인 — 회귀 없음.
- **R-2 (하단 액션 11개 과밀, 🟡) DONE**: `SidePanel`(products/page.tsx) 하단을 이동경로 3개(꽃단장/발행준비/상세, 유지)+상태 select(유지, [반영]탭이 다루지 않는 DRAFT~HIDDEN 전체 상태기계)+주액션 [상품 수정](빨강, `<Link>`)+[⋯더보기] 2버튼으로 재구성. 더보기 드롭다운에 재고동기화·부활소이동·리셋·엑셀다운로드·삭제 5종 수렴(지시된 4종 + 재고동기화 추가 포함, 근거: 다른 어디에도 없는 고유 액션이라 폐기 대신 이동). 품절처리/재판매 버튼은 [반영]탭과 중복이라 완전 삭제(`isOOS`/`toggleOOS` 제거). 마진 재계산은 [정보]탭 가격 섹션의 기존 순마진율 행이 이미 흡수(전 턴 F-3에서 이미 구현돼 있었음 — 주석만 명시적으로 보강). **실측**: 브라우저 스크린샷으로 하단 컨트롤이 상태select+상품수정+더보기 3개로 줄어든 것 확인.
- **R-3 (패널이 목록 컬럼 가림, 🟡) DONE**: `ProductsPageInner`의 목록 컨테이너(`.flex-1.min-w-0.p-6.space-y-4`)에 `marginRight: sideProduct ? 'min(720px, 50vw)' : 0`(패널 폭과 동일 값, transition 포함) 부여 — 압축모드 대신 밀어내기 방식(지시 사양대로, 구현 단순). **실측**: DOM 컴퓨티드스타일로 `marginRight:"720px"`, 목록 폭 793px로 축소되어 순마진·판매가 컬럼이 패널 열림 상태에서도 보임을 확인.
- **검증**: tsc0 · `rm -rf .next && npm run build` 0 errors · 로컬 dev 브라우저 실측 3건 전부(스크린샷 + JS DOM 조회 + API 직접 curl 호출 교차검증) · sentinel/이모지 grep 0. **아직 커밋 전** — 이 턴 종료 시점 기준.
- **패치 위치**: `src/lib/naver/shopping-search.ts`(analyzeCompetition 자사제외+sampleSize) · `src/app/api/naver/market-analysis/route.ts`(storeName 조회) · `src/components/products/MarketAnalysisCard.tsx`(R1 확장 축약 렌더) · `src/app/products/page.tsx`(SidePanel 하단 재구성 + 목록 margin-right).
- **다음 1액션**: [운영자] git push + `scripts/verify-vercel-deploy.sh --wait` 확인(#36) 후 **prod에서 반드시 육안 확인**(#265 — 수치 검증만으로 "정상"이라 단정 금지, 이번 3건 전부 운영자 스크린샷에서 발견됐던 사례). 특히: (a) 자사 스토어명이 실제로 "꽃틔움"이 아니라 다른 명칭으로 설정돼 있으면 이 부분일치 로직이 자사를 못 걸러낼 수 있음 — 설정→스토어 화면에서 실제 storeName 값 확인 요망. (b) 더보기 드롭다운 UX(위치·클릭 영역) 육안 확인.
- **의존성**: (110) 작업 G 커밋(717a296) 위에 이어짐.

### 2026-07-17 (110) 작업 G — 꼬띠 페르소나 앱 UI 적용 1~5순위 그룹 완료·배포 (FROM 💻 Code, 코드변경 있음·tsc0·build0·prod 배포완료)
- **Target**: 다음 세션 · 권위 docs/design/KKOTTI_PERSONA_VOICE_GUIDE.md §5 체크리스트 + 운영자 승인(2026-07-17).
- **배경**: 2026-07-14 인계 "Code 블록 A" 2번(앱 UI 페르소나 적용) 미착수분. `python3 scripts/persona-audit.py` 기준 대상 파일 30개 중 23개(77%)가 페르소나 0건이던 상태.
- **DONE — 5개 우선순위 그룹 전부 적용·배포**:
  1. `publish-readiness-strings.ko.json`(11건) — 발행 체크리스트 fail/hint. 원산지·주소동기화(법적/차단 사유)만 이랴 오프너로 긴급도 구분, 나머지 필드는 해유체.
  2. `seo-drawer.ko.json`(15건) — SEO 편집 드로어 empty/error/hint/toast/imageGuide. 50자/100자 등 숫자 기준은 원문 보존.
  3. `NaverHealthBanner.strings.ko.json`(7건) — 대시보드 상시 노출 인프라 알림 7종. PROXY_SECRET·NAVER_CLIENT_SECRET 등 기술 지시는 원문 보존, 오프너/어미만 페르소나화.
  4. `automation-strings.ko.json`(4건, **의도적 부분 적용**) — empty(2)+envWarn(2)만 적용. groupHint/statusHint/description(16건)은 "코드 작성 예정"·"Sprint 9+ 진입 시" 등 로드맵 개발 용어가 섞인 관제 상태표라 페르소나 미적용 유지(#233 과밀 방지 + #262 셀러 용어 우선 판단, 감사 스크립트는 파일당 1건 이상이면 통과라 empty/envWarn만으로 충족).
  5. `publish-preview-strings.ko.json`(16건) — 발행 전 검수(이미지 경고 8종·발행차단 3종·크롭스튜디오 3종·에러 2종). 1000px·2024-10-28 정책 등 기준 수치·정책 참조는 원문 보존.
- **이모지 정책**: 5개 파일 모두 렌더 컴포넌트가 `// No emoji (#3-1)`를 명시(PublishReadinessCard/naver-seo 드로어/NaverHealthBanner/preview page/CropStudioPanel) → 이모지 글자 없이 텍스트 마커(이랴/까꿍/해유/어유)만 사용해 대상 컴포넌트의 기존 "No emoji" 설계를 존중. persona-audit.py의 PERSONA 정규식(까꿍|빵야|이랴|어유|에유|해유)은 이모지를 요구하지 않으므로 감사 통과에 지장 없음.
- **검증**: 그룹마다 `python3 scripts/persona-audit.py` 재실행(0건 파일 23→18개로 감소 확인) → `npx tsc --noEmit` 0 errors → `rm -rf .next && npm run build` 0 errors → 그룹별 개별 커밋(5개 커밋) → 1회 push+`scripts/verify-vercel-deploy.sh --wait`(#36)로 배포 검증. sentinel grep 0. prod HTTP 200 확인(/products·/naver-seo·/control).
- **미착수 — "나머지" 18개 파일**(#6, 다음 세션): `components/detail/preset/samples.ko.json`(15) · `components/studio/AssetBrowser.strings.ko.json`(13) · `components/products/GeneratedAssetLocations.strings.ko.json`(12) · `lib/i18n/lifestyle-assets-strings.ko.json`(12) · `lib/i18n/swap-strings.ko.json`(7) · `lib/i18n/detail-content-templates.ko.json`(5) · `components/products/NaverPushPanel.strings.ko.json`(4) · `lib/i18n/products-new-strings.ko.json`(3) · 대시보드 위젯 5종(각 2건: SupplierGardenWidget/OrderProcessingNudge/ParetoInboxRow/CompetitorRadarWidget/GoldenWindowWidget) · `lib/automation/section-renderers/strings.ko.json`(2) · 1건짜리 4개(InventoryBadge/PriceMovementWidget/concept-presets/p-filter-messages). 우선순위 미지정 상태라 다음 세션에서 운영자 판단 필요(발행 임박도·노출 빈도 기준).
- **패치 위치**: `src/lib/i18n/{publish-readiness,seo-drawer,automation,publish-preview}-strings.ko.json` · `src/components/dashboard/NaverHealthBanner.strings.ko.json`.
- **다음 1액션**: [운영자] 프로덕션에서 실제 UI 육안 확인(특히 publish-preview의 이미지 경고 8종 — 실제 발행 시나리오에서 톤이 과하지 않은지). [운영자] "나머지" 18개 파일 진행 여부·우선순위 지정. [Desktop] persona-audit.py 재실행해 5그룹 반영 확인(0건 18개 잔여 정상인지).
- **의존성**: (108)/(109) 작업 F 커밋 위에 이어짐. git 이력에 반영 완료(e0736b4~6ca377f, prod 배포 확인됨).

### 2026-07-17 (109) 작업 F-2·F-3 — 발행여부 기본필터 + 패널 재설계 완료 (FROM 💻 Code, 코드변경 있음·tsc0·build0·prod 배포대기)
- **Target**: 다음 세션 · 권위 docs/design/PANEL_REDESIGN_SPEC_2026-07-17.md(신규) + PRODUCT_IA_REDESIGN_V2_CONFIRMED_2026-07-12.md §1 + 운영자 승인(2026-07-17, F-1/F-2/F-3 동시 승인).
- **배경**: (108)에서 F-1(라우트 병합)만 완료하고 보강 1(발행여부 분리)을 미착수로 남겼음. 같은 세션에서 운영자가 F-2(그 보강1)와 F-3(패널 재설계 신규 스펙)을 추가 승인해 이어서 완료.
- **F-2 DONE**: `/products` 기본 뷰(`TAB_CONFIG.all`) 필터를 `() => true` → `p => p.status !== 'DRAFT'`로 변경. 라벨도 '전체'→'발행 전체'로 의미 명확화(#262). `?tab=draft`(꿀통창고 진입점)는 무변경("같은 테이블 두 뷰" 유지). 실측: 로컬 dev 4건 중 작성중 3건 제외, 재활성화 1건만 기본뷰 노출 확인.
- **F-3 DONE (PANEL_REDESIGN_SPEC_2026-07-17.md R1~R4 전부 적용)**: SidePanel 정보 탭을 스펙 순서(좀비사유→지금할일[조건부]→한눈에보기[꿀통지수+SEO만]→가격→재고·배송→네이버정보[연동만]→상품정보[신규·SKU+등록일]→시장분석[조건부]→꼬띠한마디[비좀비만])로 전면 재배열. **R1**: `MarketAnalysisCard.tsx`에 `totalResults===0 && avgPrice===0` 시 컴포넌트 자체가 null 반환하는 가드 추가(전상품 범용·#55, 호출부 아닌 컴포넌트 레벨이라 다른 사용처에도 자동 적용). **R2**: 꿀통지수 카드에서 `hs.warnings` 렌더(순마진 중복 텍스트 포함) 제거 — 마진 수치는 가격 섹션 1곳에서만 노출(좀비 사유의 마진 문구는 별개 사유 설명이라 예외 유지, #264). **R3**: 라벨 6개(지금 할 일/한눈에 보기/가격/재고·배송/네이버 정보/상품 정보) 11px·600·#9CA3AF·non-uppercase 통일, 고아 텍스트였던 공급사명을 "재고·배송" 섹션으로 편입, `InventoryBadge`도 같은 섹션에 신규 연결(`inventoryByProductId` prop 스레딩). **R4**: 좀비사유+지금할일+한눈에보기가 스크롤 없이 보이도록 최상단 배치(로컬 1280px 뷰포트 스크린샷으로 확인).
- **검증**: tsc0 · `rm -rf .next && npm run build` 0 errors · 로컬 dev 브라우저 DOM 실측(1760x1000 뷰포트, Desktop 원 진단과 동일 조건) — 패널 폭 720px(40.9%, 스펙 범위 내 유지) · 라벨 6개 확인(스펙 기준 5개 이상 충족) · `순마진` 텍스트 출현 1회(비좀비 상품)·2회(좀비 상품, 사유+가격 각 1회로 스펙이 명시한 예외와 일치) · 좀비상품(플라티코)에서 시장분석 섹션이 실데이터(경쟁상품수11 등) 존재 시 정상 노출(R1은 "0일 때만 숨김"이므로 실데이터 노출은 사양대로임, 위반 아님) · 좀비아님 상품(디자인복달항아리)에서도 동일 구조 확인.
- **미확정 — 운영자 판단 필요**: R4의 "hiddenPx ≤100px" 수치 목표는 스펙 진단 시점(명화·비좀비·시장분석 비어있음 상태) 기준값이라, 좀비+미흡항목+실시장데이터가 모두 있는 상품(예: 플라티코)에서는 hiddenPx가 361px로 더 큼 — 이는 정보량이 실제로 많아서(좀비사유+지금할일+시장분석 전부 유효 콘텐츠)이지 중복/소음이 아님. 구조적 R1~R3 규칙은 전부 충족했으나, 이 수치 자체가 상품마다 다를 수 있다는 점을 육안 확인 시 참고할 것.
- **패치 위치**: `src/app/products/page.tsx`(TAB_CONFIG.all 필터+라벨, SidePanel 정보 탭 전면 재배열, inventory prop 추가) · `src/components/products/MarketAnalysisCard.tsx`(R1 empty-hide 가드).
- **다음 1액션**: [운영자] git push + `scripts/verify-vercel-deploy.sh --wait` 승인(#36) — 로컬 커밋만 된 상태. [Desktop] prod 배포 후 실측 재검증 + **육안 확인 필수**(스펙 §5 요구사항, Desktop 스크린샷 도구 장애로 시각 검증 위임됨) — 특히 R4 스크롤 체감, 재고·배송 섹션의 InventoryBadge 표시 여부(재고 폴링 데이터 있는 상품에서).
- **의존성**: (108) 커밋(e0736b4) 위에 이어지는 작업. 아직 커밋 전.

### 2026-07-17 (108) 작업 F — /products + /products/link 목록 병합 완료 (FROM 💻 Code, 코드변경 있음·tsc0·build0·prod 배포대기)
- **Target**: 다음 세션 · 권위 docs/design/PRODUCT_IA_REDESIGN_V2_CONFIRMED_2026-07-12.md §3 "연동+앱등록 구분 없이 하나의 목록" + 운영자 승인(2026-07-17, 보강 2건 포함).
- **배경**: 2026-07-14 작업 C(797d111)는 메뉴만 조정(하위 4개 제거)했을 뿐 `/products`와 `/products/link` 두 라우트가 그대로 남아 근본 미해결이었음(운영자 지적).
- **DONE**: (1) `/products`를 꽃밭 돌보기 유일 라우트로 확정 — `/products/link`(1117줄) git rm(이력 보존). (2) `/products/link`에만 있던 4기능을 `/products` SidePanel에 PanelTabs로 흡수: 동기화(diff, `/api/products/{id}/naver-sync`) / 반영(상태 preview + `NaverPushPanel` 재사용) / 품절대체(`SubstituteEditor` 재사용) — `product.naverProductId` 있을 때만 탭 노출, 미연동 DRAFT/작성중 상품은 정보 탭만(신규 엔드포인트 0). (3) 헤더 "네이버 상품 가져오기" 버튼→모달(구 Zone1 이식, `/api/products/import` 재사용, 기존 탭바에 탭 추가 안 함 — #262/#233 과밀 방지). (4) control-tower-engine.ts의 `substitute_ready`/`sync_drift` 딥링크 `/products/link`→`/products` 갱신(고아 링크 방지).
- **보강 반영(운영자 승인 조건 2건)**: (a) SidePanel 헤더를 "상태점만"→"썸네일+상품명+상태"로 재설계(#212 zone3 헤더 패턴 미러, 프리미엄 SaaS 구조화). (b) 좀비 사유 카드(product.tuningScore·#264)를 정보 탭 최상단(스크롤 없이 첫 화면)에 배치. ※ "기본 뷰가 발행 여부로 분리돼야 한다"는 보강 1(작성중 노출 제거)은 **미착수** — 현재 TAB_CONFIG.all이 여전히 작성중 포함 전체 노출 중(스펙 §1 "미발행=꿀통창고" 기준 위반 소지). 다음 세션 판단 필요.
- **검증**: tsc0 · `rm -rf .next && npm run build` 0 errors(스테일 `.next/types` 캐시가 삭제된 `/products/link` 참조로 1차 실패 → 클린 빌드로 해소) · 로컬 dev 브라우저 실측(Browser 도구): 명화(연동, naverProductId 有)에서 4탭 전부 렌더 확인(동기화=diff 테이블 실데이터·반영=상태미리보기+NaverPushPanel·품절대체=저장된 대체정보 로드) / 64구 아이스틀(미등록)에서 정보 탭만 노출 확인(조건 분기 정상) / 임포트 모달(필터·부활등급·페이지네이션·상품번호 직접입력) 렌더 확인. sentinel grep 0(src 대상). 이모지 0.
- **패치 위치**: `src/app/products/page.tsx`(SidePanel 재설계 + SyncTab/PushTab/NaverImportModal 신규 + 헤더 버튼 교체) · `src/app/products/link/*`(삭제) · `src/lib/automation/control-tower-engine.ts`(딥링크 2곳).
- **다음 1액션**: [운영자] 보강1 미착수분(발행 여부 기본 필터) 착수 여부 결정 — 현재 tab=all이 작성중 포함이라 "꽃밭 돌보기=발행/연동만" 스펙과 다름(단, ?tab=draft는 꿀통창고 진입점으로 이미 존재하므로 UX 임팩트는 제한적). [운영자] git push + `scripts/verify-vercel-deploy.sh --wait` 승인(#36) — 로컬 커밋만 된 상태, prod 미반영. [Desktop] prod 배포 후 4탭 브라우저 재검증(#88, 로컬 dev 검증은 본 턴 완료했으나 prod 별도 확인 필요).
- **의존성**: push 전 사용자 최종 확인 필요(커밋 전이므로 아직 git 이력에 없음).

### 2026-07-14 (107) 문서부채 정리 + IA재설계 P1~P4/페르소나/재고이슈 갭 등재 + 명화 소싱단절 발견 (FROM 🖥️ Desktop, HEAD=origin/main=prod ea4e26d, docs only·코드변경0·네이버 무접촉·비가역0)
- **Target**: 다음 세션(Desktop 또는 Code) · 3주 문서 갱신 공백(2026-06-24~07-13) 사후 보정 + 신규 발견 2건 등재.
- **배경**: (106)까지는 2026-07-10 기준. 그 사이(07-11~07-13) 상품 IA 전면 재설계(P1~P4)·꼬띠 페르소나 전면 적용·재고 가시화가 실제로는 진행·배포까지 완료됐으나(git log e7a3581~ea4e26d), PARALLEL_WORK_TRACKER.md와 본 TASK_BRIDGE.md 둘 다 갱신되지 않아 "코드는 있는데 문서에 없는" 상태였음.
- **DONE (문서 정리·코드 무관)**:
  1. `PARALLEL_WORK_TRACKER.md`를 rev51로 갱신 — rev50(2026-06-24) 이하 원문은 하단에 그대로 보존, 최상단에 rev51 신규 절로 P1~P4/씨앗심기폼/재고가시화/페르소나 전부를 커밋SHA와 함께 표로 등재.
  2. `PRINCIPLES_LEARNED.md`에 원칙 #254~#260 정식 이관 완료. 단 **#149~#253 사이 약 100개 원칙은 여전히 미이관** — 경고 블록으로 표시, 다음 세션 필수 작업.
  3. **원칙 #260 신규**: `/products` 명화 카드 "재고 -1개"의 근본원인 = `inventory_snapshots.qty=-1`은 도매매 API가 productNo를 못 찾을 때의 실패 센티널(실재고 아님). 폴링 대상 전 상품이 2주+ 연속 이 상태.
  4. **★신규 발견(본 턴)**: 명화 상품(productNo 65322245)을 `/api/crawler/domemae`로 실측 → **도매매에서 상품이 삭제/판매종료되어 소싱 자체가 끊김을 운영자 확인**. 재고 -1은 UI 버그가 아니라 실제 소싱단절을 정직 반영한 것. 명화는 대체 상품 전환 필요(운영자 판단, 이번 세션 미착수).
- **검증**: 문서 변경만이라 tsc/build 무관. Supabase SQL + `/api/crawler/domemae` POST 라이브 호출로 실측(2026-07-14). 코드 수정 0건(진단만).
- **패치 위치**: `docs/plan/PARALLEL_WORK_TRACKER.md`(rev51 prepend) · `docs/plan/PRINCIPLES_LEARNED.md`(#254~#260 + 미이관 경고블록) · 본 파일(§3 갱신).
- **다음 1액션**:
  - [운영자] 명화 대체 상품 결정(재소싱 or 유사 대체품) — 결정되면 씨앗심기부터 재시작.
  - [Desktop 또는 Code] CRON_SECRET 로컬↔prod 불일치 확인됨(로컬 값 401 재현) — Vercel 대시보드 실값 확인 후 로컬 동기화 → `/api/admin/test-daily-discord` 실발송 검증.
  - [Code] 원칙 #149~#253 정식 이관(중간 우선순위 — 특히 #196/#197 네이버 full-replace PUT 규칙 포함).
  - [Desktop] P4 좀비엔진 배지/사유 텍스트 상세 브라우저 검증(현재는 필터 동작만 확인).
  - [Code] 재고 스냅샷 qty=-1/unknown UI 표시 수정(#260 규칙 (1)) — 운영자 착수 승인 대기.
- **의존성**: 명화 대체 상품 결정은 재고 UI 수정과 독립(병행 가능). CRON_SECRET 확인은 디스코드 실발송 검증의 유일한 선행조건.

### 2026-07-10 (106) 부분 PUT 2곳 제거 — publish-assets GET-merge + 레거시 PUT deprecate (FROM 💻 Code, main faf2a4e, 규칙 3-7 systemic·비가역 게이트 유지·prod 배포대기)
- **Target**: Claude Code CLI · 권위 NAVER_STORE_OPERATIONS_UPDATE_2026-07-09 §4-C + CLAUDE.md 3-7. (105)에서 spawn한 task_45ebdf1b(부분 PUT 2곳) 완결 — 사용자 systemic 확장 지시.
- **DONE (faf2a4e)**: (1) publish-assets/route.ts — `{originProduct:{images:{representativeImageUrl},detailContent}}` 부분 PUT(주석에 "네이버 부분 업데이트 허용"이라는 그릇된 전제 명시분) 제거 → 신규 GET-merge 헬퍼 `updateProductAssets`(api-client.ts, updateProductPriceStatus 동형) 교체: GET origin-products/{no} read → 대표이미지(canonical representativeImage.url shape·optionalImages 보존·레거시 flat mirror 삭제)/detailContent만 override → 전체 payload PUT · originProduct 부재 loud throw · dryRun 지원 · https 가드. 라우트 body에 dryRun 옵션 추가(기존 studio 호출 {thumbUrl,detailUrl} 하위호환 유지). (2) naver/products/route.ts PUT — toNaverPayload(원산지/고시/옵션/배송 누락 레거시 빌더)를 그대로 PUT하던 파괴적 경로 확인: 앱 내 호출자 0(preview 화면은 canonical POST /api/naver/products/update 사용)·dryRun/confirm 게이트 없음 → 410 Gone + canonical update 위임으로 neuter. toNaverPayload는 POST(register=신규 생성·full-replace 아님)에만 잔존. updateProduct import 제거.
- **검증**: tsc0 · build0(Compiled successfully) · sentinel grep 0. verify-vercel-deploy = push 후 확인. 실 발행 라운드트립(썸네일/상세 갱신 후 상품명·가격·옵션·원산지·고시 미소실) = Desktop(#88).
- **패치 위치**: src/lib/naver/api-client.ts(updateProductAssets NEW) · src/app/api/products/[id]/publish-assets/route.ts · src/app/api/naver/products/route.ts(PUT deprecate).
- **★ 잔여 관찰(비 3-7, 별건 품질 트랙)**: naver/products/route.ts POST(register)는 여전히 레거시 toNaverPayload 사용(원산지/고시/옵션 누락) — 신규 생성이라 3-7 파괴 위험은 없으나 불완전 등록 품질 이슈. products/new 페이지가 canonical /api/naver/products/register 대신 이 레거시 POST를 호출. 별도 품질 트랙(3-7 범위 아님).
- **다음 1액션**: [Desktop] publish-assets dryRun 검증 — POST /api/products/{id}/publish-assets {thumbUrl, detailUrl, dryRun:true} → 응답 dryRun:true·applied:false·preservedFieldCount>0·previousRepresentativeImageUrl 확인 후, 실 발행(dryRun 생략) 1건에서 상품명·가격·옵션·원산지·고시 미소실 확인(#88). [Code] 잔여 register 품질 트랙 착수는 사용자 승인 후. [결정·대표] 레거시 POST register→canonical /register 전환 여부.

### 2026-07-10 (105) sync POST 파괴적 부분 PUT 제거 — GET-merge systemic 확장 (FROM 💻 Code, main 5bcdbf7, 규칙 3-7·#62·prod deployed)
- **Target**: Claude Code CLI · 권위 §4-C + CLAUDE.md 3-7. §4-C(104)는 products/update route만 방어했으나 /api/naver/sync POST(대량 가격·상태 동기화)에 부분 PUT 잔존 — Code가 104에서 별건 관찰로 flag했고 사용자가 systemic 확장 지시.
- **DONE (5bcdbf7)**: (1) api-client.ts `updateProductPriceStatus()` GET-merge 헬퍼 추가(updateStock 동형) — GET origin-products/{no}로 현재 전체 상태 read → salePrice/statusType만 override → 전체 payload PUT · originProduct 부재 시 loud throw(부분 PUT 금지) · dryRun 지원(비가역 게이트). (2) sync/route.ts updateProduct 부분 PUT 제거 → updateProductPriceStatus 교체. 이전엔 detailContent:''·images:{representativeImageUrl:''}·leafCategoryId:'' 등 빈값을 보내 FULL REPLACE로 전 필드 소실 위험이었음. body 스트림 1회 읽기 정리(auth manual + dryRun 공유). 응답 dryRun 플래그.
- **검증**: tsc0 · build0 · verify-vercel-deploy OK(production 5bcdbf7 REGISTERED). 실 sync PUT 라운드트립 = Desktop(#88).
- **패치 위치**: src/lib/naver/api-client.ts(updateProductPriceStatus) · src/app/api/naver/sync/route.ts.
- **★ 별건 잔존(미수정·spawn_task task_45ebdf1b 분리)**: updateProduct 부분 PUT 2곳 남음 — (1) publish-assets/route.ts:104-124(썸네일/상세 patch·주석에 "부분 업데이트 허용" 그릇된 전제 명시·발행 파이프라인 매 갱신 소실 위험) (2) naver/products/route.ts:120-121 PUT(toNaverPayload 완전성 미확인·레거시/중복 여부 확인 필요). 동일 위험 계열 별도 트랙.
- **다음 1액션**: [Desktop] sync POST dryRun 검증 — POST /api/naver/sync {manual:true, dryRun:true} → 응답 dryRun:true·synced=대상수·PUT 미실행 확인 후, 실 동기화(dryRun 생략) 1건 라운드트립에서 상품명·이미지·옵션 미소실 확인(#88). [Code] task_45ebdf1b(부분 PUT 2곳) 착수는 사용자 승인 후. [결정·대표] publish-assets/naver-products PUT 교체 GO.


### 2026-07-10 (104) 네이버 §4 P1 3태스크 A/B/C — 단위가격·주문sync·수정 null 방어 (FROM 💻 Code, main 284faab, additive·비가역0·네이버 무접촉·prod deployed)
- **Target**: Claude Code CLI · 권위 docs/research/NAVER_STORE_OPERATIONS_UPDATE_2026-07-09.md §4 (P1). 각 독립 커밋·Desktop 검증.
- **DONE (A · 단위가격 unitCapacity · 2026-04-29 필수 · 284faab)**: (1) DB Supabase 마이그 `product_unit_price_fields` 4컬럼(unit_price_yn/unit_total_capacity/unit_capacity/unit_indication_unit) additive. (2) 판별 정책 `src/lib/naver/unit-price-policy.ts` NEW — D1 '식품'|'화장품/미용'=전 mandatory · D1 '생활/건강' + D2 세제/청소/화장지/기저귀/생리대/… = mandatory · 그외 optional. classifyUnitPricePolicy + validateUnitPriceFields. (3) product-builder LocalProduct 4필드 + NaverProductPayloadV2.detailAttribute.unitPriceInfo 타입 + 사용(Y)시 emit {unitPriceYn/totalCapacityValue/unitCapacity/indicationUnit}. (4) validateForRegistration unit-price gate — mandatory 미충족 시 발행 BLOCK. (5) UI /products/new 기본정보 탭 원산지 DSection 뒤 새 USection — 필수/권장/미지정 배지 + 안내 + 사용Y 체크박스(mandatory disabled+자동활성 버튼) + 3필드(총량/기준량/표시단위). (6) 편집 hydrate + POST/PUT 배선 (sanitizeProductWrite DMMF 파생이라 PUT 자동 인식).
- **DONE (B · 주문sync overlap + 2RPS Queue · 3ddd31f)**: (1) `orders/route.ts` splitWindows에 5분 overlap 추가(경계 유실 방지·to까지 커버시 loop 종료 무한루프 방어·overlap≥window 방어). (2) `api-client.ts` throttleNaverRequest() 프로세스 전역 큐 도입(500ms gap=2RPS) — naverRequest 진입 최상단 await·tail-Promise 체인으로 동시성 순차화. 기존 429 반응형 백오프와 병용.
- **DONE (C · 상품수정 null 방어 · d6aa583)**: `update/route.ts`에 실 PUT 직전 GET origin-products/{no} 호출 → DB-built detailContent가 <div>${name}</div> placeholder 뿐이면 네이버 값 보존 · sellerTags 부재 & 네이버 태그 존재시 유지 · metaDescription 빈문자 & 네이버 값 존재시 유지. GET 실패는 fatal 아님(로그+DB-built PUT). 응답 nullDefense: string[] + productEvent note 태그.
- **검증**: tsc0 · build0 (route /products/new 64.5kB) · verify-vercel-deploy OK (production 284faab REGISTERED). Prisma generate 정합. 브라우저 UI 렌더 + 실 등록/수정/주문sync 실측 = Desktop(#88 필수).
- **패치 위치**: prisma/schema.prisma · src/lib/naver/{unit-price-policy.ts NEW, product-builder.ts, api-client.ts} · src/app/api/naver/{orders/route.ts, products/update/route.ts} · src/app/api/products/route.ts · src/app/products/new/page.tsx.
- **★ 별건 관찰(비 P1)**: `src/app/api/naver/sync/route.ts` (POST 대량 sync)는 여전히 `updateProduct(no, {originProduct:{detailContent:'', images:{representativeImageUrl:''}, leafCategoryId:'', ...}})` 부분 PUT — 규칙 3-7 + §4-C 이중 위반(전체 payload 소실 위험). 이번 커밋 범위 아님 → 별도 트랙 필요(현재 무단 트리거 경로 = 대시보드 manual:true bypass).
- **다음 1액션**: [Desktop] (1) A UI 실 렌더 검증 — /products/new 카테고리 '식품' 계열 선택시 필수 배지+3필드+체크박스 disabled 표시, '기타' 계열은 권장 배지 확인. (2) A 실 등록 dryRun 검증 — 명화(차량용방향제=optional) publish-preview payload에 unitPriceInfo 없음 · 식품 계열 테스트 상품에서 4필드 세팅 후 payload emit 확인. (3) B 주문 sync 실측 — /api/naver/orders?hours=48&manual=1 (5분 겹침·2RPS 지연 프로파일) 로그 확인. (4) C 실 update dryRun — 임의 상품에 description 비운 상태로 confirm:false로 payload preview → confirm:true PUT 시 응답의 nullDefense 배열 관찰. [Code] Desktop 검증 결과 대기 · 별건 sync/route.ts 파괴적 부분 PUT 트랙은 사용자 결정 대기. [결정·대표] A 판별 정책의 D1/D2 매핑 목록이 실제 네이버 대상목록과 정합하는지(정책 변동성 큼·§231) Desktop 재확인 요청.


### 2026-06-17 (103) 엔진 프롬프트 last-mile E1·E2·E3·E4 (FROM 💻 Code, main 8eadbbb, additive·비가역0·네이버 무접촉)
- **Target**: Claude Code CLI · 권위 docs/handoff/HANDOFF_2026-06-17_engine-prompt-gap-verdict-and-consolidation-plan.md. 전상품(#55/#62). queue-masking과 의존성 0(병렬).
- **진단(Desktop)**: 6축 엔진 resolvedPrompt 조립하나 마지막 1마일 끊김 — resolution 미주입·한글 subject 누수·benchmarkDna 미주입·슬롯보드 280자 프리뷰만. 두 프롬프트 엔진(System1/System2) 미병합.
- **DONE (P0 4건·additive)**: E1 resolution→assemblePrompt cameraClause(2K/4K 도달). E2 category-subject.ts(naverCategoryCode→영어 subject·전상품·fallback 'product')→strategy route product.name(한글) 교체. E3 engine/strategy 응답 full resolvedPrompt+resolution + SlotFunnelBoard 전체프롬프트+1클릭복사+추천설정카드(모델/그라운딩/비율/해상도·#56 운영자 복사). E4 MoodAxisData.referenceAesthetic(영어 6무드)+프롬프트 주입(benchmarkDna 한글 display 유지).
- **검증 (prod)**: 명화 strategy 9슬롯·slot0 full resolvedPrompt 695자(>280)·resolution 4K·ASCII100%(subject 'car air-vent fragrance diffuser'·한글누수0)·aesthetic절. tsc0·build0·test PASS(prompt/strategy/thumbnail)·이모지0·신규한글리터럴0. E3 UI 렌더(복사+설정카드)=Desktop 브라우저(#88).
- **패치 위치**: src/lib/mood/{types,spec-data,prompt-assembler}.ts · src/lib/engine/{types,strategy-assembler,category-subject}.ts · src/app/api/engine/strategy/route.ts · src/components/studio/engine/{useEngineStrategy,SlotFunnelBoard}.tsx · src/lib/i18n/studio-strings.ko.json.
- **PENDING (로드맵)**: E5 per-scent concept input(P1)·E6 assetization 폐루프(P1)·E7 엔진통합(P1·★비가역=구조PR 전 Desktop/대표 확인)·E8 경쟁 teardown(P2)·E9 프롬프트 성능학습(P2).
- **다음 1액션**: [Desktop] E3 슬롯보드 브라우저 렌더 검증(/studio 이미지탭·전체프롬프트+복사 동작+설정카드·#88). [Code] E5/E6 착수(additive) · E7 구조 PR은 확인 후. [결정·대표] E7 단일 프롬프트 권위 통합 GO.


### 2026-06-17 (102) 개입 대기열 큐 마스킹 수정 — 상품당 다중 카드 스택 (FROM 💻 Code, main a91156d, additive·비가역0·P0)
- **Target**: Claude Code CLI · Desktop P0 적발(명화 2개 awaiting_human인데 대기열 1개만·자산 정합 마스킹).
- **DONE**: 근본=상품당 1카드 노출(route interventionById 첫잡만 + ControlTowerRow.actionQueue 단수 + widget map 1). 수정 2커밋(389fecb+a91156d): route asset-jobs-matrix 전체 개입 수집(interventionsById·타입별 dedup·primary[0]+extra[1:]) → ComputeContext.imageJobInterventionsExtra + ControlTowerRow.extraQueue(computeProductRow이 extra별 precise 카드 생성) → widget flatMap(actionQueue+extraQueue)·key=productId+type(충돌방지) → ★응답 매핑에 extraQueue 추가(엔진 구성만으론 미전달, 1차 누락 보강).
- **검증 (prod)**: 명화 2카드[variant_composite+registry_drift] 동시·아이스[fill_attributes]/달항[apply_curated_main] 단일 무변경(비회귀). asset_jobs 실측 2건(compose+process). tsc0·build0·이모지0·additive·비가역0·네이버 무접촉. 스택 시각렌더=Desktop(#88).
- **패치 위치**: src/app/api/products/asset-jobs-matrix/route.ts · src/lib/automation/control-tower-engine.ts · src/components/dashboard/ControlTowerMatrixWidget.tsx. 원칙 #100.
- **다음 1액션**: [Desktop] 명화 2카드 동시 렌더 브라우저 검증(#88). [Code] Phase3 / 옵션 3표현 reconcile / realism_lane ingest 게이트. [결정·대표] PUBLISH-명화 thumbnail+Cotton+GO.


### 2026-06-17 (101) variant_composite 개입카드 — 옵션 변형별 대표 컷 커버리지 (FROM 💻 Code, main 0b6db66, additive·비가역0·네이버 무접촉)
- **Target**: Claude Code CLI · Desktop 감사(명화 3향 0/3·바인딩 전무) 스펙 구현. registry_drift 패턴 동형.
- **DONE (5계층)**: (1)데이터 asset_registry.variant 컬럼(Supabase 마이그 add_asset_registry_variant·additive·비가역0)+Prisma+idx. (2)computeVariantCoverage(variant-coverage.ts) — 분모=Product.options jsonb stockQuantity>0(진실원천·#96)·분자=variant바인딩 LIVE composite distinct(고아제외)·missing=차집합. (3)카드 INTERVENTION_VARIANT_COMPOSITE·control-tower INPUT_DECISION·이미지탭 딥링크·label「변형별 대표 컷(N/M)」·seed<100%&hasOptions·clear=100%·cron 전상품 상시. (4)ingest-firefly variant param(생성물→asset_registry.variant 바인딩)+적재 후 syncVariantCompositeCard. (5)widget 라벨+상세칩.
- **검증 (prod 통합·라운드트립)**: 명화 active=[레몬유칼립·에이프릴·블랙체리](3·코튼 stock0 제외)·covered0·missing3·reconciled false→카드 seed→matrix actionQueue INPUT_DECISION·deepLink tab=image. 바인딩 시뮬 covered 0→1(0.33)→복원0. 달항/아이스 hasOptions=false=카드없음. tsc0·build0·test PASS·이모지0·신규한글리터럴0·prisma 싱글톤·Sharp-only·네이버 무접촉.
- **패치 위치**: prisma/schema.prisma · src/lib/storage/variant-coverage.ts · src/lib/jobs/intervention.ts · src/lib/automation/control-tower-engine.ts · src/app/api/products/[id]/{asset-integrity,ingest-firefly}/route.ts · src/app/api/cron/asset-integrity-sweep/route.ts · src/components/dashboard/ControlTowerMatrixWidget.tsx · src/lib/i18n/control-tower-strings.ko.json.
- **부수 발견(전상품 일관성)**: 옵션 3표현 드리프트 — optionValues(3)·options jsonb(4·코튼stock0)·product_options 테이블(4 ON_SALE). variant_composite 분모=options jsonb stock>0=3 확정. 3표현 정합 reconcile=별도 과제(데이터 드리프트 동근원, PUBLISH-명화 Cotton 결정과 연결).
- **다음 1액션**: [Desktop] variant_composite + reconcile UI 카드 브라우저 렌더 검증(#88) + 명화 3향 컷 생성→ingest variant 바인딩→카드 clear 확인. [Code] 옵션 3표현 reconcile / P3 Phase3 슬롯조립. [결정·대표] PUBLISH-명화 Cotton(3표현 드리프트 동근원)+GO #46.


### 2026-06-17 (100) REGISTRY↔STORAGE per-orphan reconcile UI — 카드 actionable 완결 (FROM 💻 Code, main f2f97ce, additive·비가역0)
- **DONE**: registry_drift 카드를 actionable로 완성(#56 루프). RegistryDriftReconcile(ControlTowerMatrixWidget 인라인) — '고아 검토·정리' 버튼→GET drift 로드→storage-only 고아(등록/아카이브 per-row+벌크)·registry-only 고아(정리 per-row+벌크)→POST reconcile(action:reconcile·confirm·#46)→after 갱신+onRefresh(reconciled 시 카드 자동 clear). 아카이브=window.confirm. ko.json registry_drift 13키 추가.
- **검증**: tsc0·build0·이모지0·신규한글리터럴0. 데이터레인 prod 검증완(reconcile route 라운드트립·GET shape: storageOnly 22 {path,stage}·registryOnly botanical {path}·컴포넌트 소비가능). UI 버튼 인터랙션=Desktop 브라우저(#88).
- **패치 위치**: src/components/dashboard/ControlTowerMatrixWidget.tsx · src/lib/i18n/control-tower-strings.ko.json.
- **REGISTRY-STORAGE-DRIFT 전상품 시스템 완결**: 탐지(#93/#94)→reconcile 백엔드→개입카드→per-orphan 결정 UI 4단.
- **다음 1액션**: [Desktop] reconcile UI 버튼 인터랙션 검증(/dashboard 명화 카드 '고아 검토·정리'→등록/아카이브/정리→카드 clear·#88) + variant_composite 스펙(명화 3향 변형 composite 누락 감사 후 인계). [Code] variant_composite 개입카드(checkProductIntegrity에 옵션변형별 composite 누락 추가·registry_drift 패턴·전상품) → P3 Phase3 슬롯조립. [결정·대표] PUBLISH-명화 Cotton 옵션+GO #46.


### 2026-06-17 (99) REGISTRY↔STORAGE 드리프트 개입카드 — 관제탑 시드/렌더 (FROM 💻 Code, main 78f8a90, additive·비가역0·네이버 무접촉)
- **Target**: Claude Code CLI · **Branch**: main · additive·#56 비강제·네이버 무접촉·비가역0. Desktop 원산지 행 검증 PASS 수신 후 P2 카드 착수.
- **DONE (registry_drift 개입카드·#62 P2)**: reconcile 백엔드(952ed61)에 운영자 결정 표면화.
  - INTERVENTION_REGISTRY_DRIFT 타입 + RegistryDriftPayload + buildRegistryDriftPayload(intervention.ts).
  - control-tower-engine: registry_drift → INPUT_DECISION·이미지탭 딥링크.
  - asset-integrity route syncCard + cron sweep: asset_integrity(ok 게이트)와 독립 registry_drift 카드(reconciled 게이트). cron은 ok 상품도 드리프트 평가(전상품 상시·ok early-continue 제거).
  - ControlTowerMatrixWidget: 라벨+상세(미등록/인덱스고아/미정의단계 칩·예시·힌트). ko.json matrix.intervention.registry_drift.
- **검증 (prod 통합)**: 명화 POST seed→carded=true→asset-jobs-matrix actionQueue에 registry_drift 카드(category=INPUT_DECISION·stage=registry_drift·deepLink=/studio?...&tab=image) 표면화 확인. 카드 라운드트립(seed awaiting_human·payload.storageOnly22·samples6 / 멱등 1유지 / clear 0복원). tsc0·build0·test PASS·이모지0·신규한글리터럴0(ko.json)·prisma 싱글톤·Sharp-only·네이버 무접촉.
- **패치 위치**: src/lib/jobs/intervention.ts · src/lib/automation/control-tower-engine.ts · src/app/api/products/[id]/asset-integrity/route.ts · src/app/api/cron/asset-integrity-sweep/route.ts · src/components/dashboard/ControlTowerMatrixWidget.tsx · src/lib/i18n/control-tower-strings.ko.json.
- **다음 1액션**: [Desktop] registry_drift 카드 브라우저 렌더 검증(/dashboard 관제탑·명화 카드 라벨/칩/딥링크·#88) + 결정플로우. [Code] per-orphan 등록vs아카이브 결정 UI(자산탭 — 고아 리스트·register/archive 버튼→reconcile route) → P3 Phase3 슬롯조립. [결정·대표] PUBLISH-명화 Cotton 옵션+GO #46.


### 2026-06-17 (98) 발행패널 원산지 행 + 아이스 정규화 + reconcile 백엔드 (FROM 💻 Code, main 952ed61, additive·비가역0·네이버 무접촉)
- **Target**: Claude Code CLI · **Branch**: main · 전부 가역·additive·네이버 무접촉. Desktop ORIGIN-GATE 전경로 검증 PASS 수신 후 P2 착수.
- **DONE (a) 발행패널 원산지 진실성 행(#95·#56 갭 해소)**: origin 판정을 evaluateOriginTruth 헬퍼로 추출(product-builder) → validateForRegistration(발행 BLOCK)과 strategy 게이트(UI) 단일 진실원천 공유. EngineGateView.originTruth + PrePublishGatePanel 원산지 행(통과/치유경고/차단·인라인). ko.json origin/originHint/originHeal. prod smoke 명화/아이스 gate.originTruth=pass·0200037.
- **DONE (b) 아이스 originCode 정규화**: 200037→0200037 + naver_origin '중국'(코드 정합·가역·#95 치유 영속). 검증 heal→pass.
- **DONE (P2) reconcileRegistryDrift 백엔드(#62)**: register(asset_registry insert·additive·멱등)·archive(파일 archive/ 이동·가역)·clearRegistry(stale 행 삭제). 라이브 재확인 고아만 처리. route POST 'reconcile'(confirm 게이트). prod 라운드트립 PASS(register 22→21·멱등0·복원22·파일무접촉)·route smoke no-op LIVE.
- **검증/게이트**: tsc0·build0·test PASS·이모지0·신규한글리터럴0(ko.json)·prisma 싱글톤·Sharp-only·네이버 무접촉·비가역0(confirm 게이트).
- **패치 위치**: src/lib/naver/product-builder.ts(evaluateOriginTruth) · src/app/api/engine/strategy/route.ts · src/components/studio/engine/{useEngineStrategy,PrePublishGatePanel}.tsx · src/lib/i18n/studio-strings.ko.json · src/lib/storage/asset-integrity.ts(reconcileRegistryDrift) · src/app/api/products/[id]/asset-integrity/route.ts.
- **다음 1액션**: [Code] reconcile 개입카드 UI(운영자 등록vs아카이브 결정·드리프트 카드 시드·control-tower 배선·브라우저 결합) → P3 Phase3 슬롯조립. [Desktop] 발행패널 원산지 행 브라우저 시각검증(명화 통과 렌더) + Lemon 6축 재생성. [결정·대표] PUBLISH-명화 Cotton 옵션(데이터 드리프트)+비가역 GO #46.


### 2026-06-17 (97) 원산지 진실 게이트 + 옵션 정합 가드 (FROM 💻 Code, main 440ef92, additive·비가역0·네이버 무접촉)
- **Target**: Claude Code CLI · **Branch**: main · additive·전 발행경로 공유·네이버 무접촉·비가역0.
- **배경(Desktop #45 반영)**: 명화 DB origin=중국(0200037)·옵션 라이브 정합 → 세션9 "payload 국산/4" 경보 = stale(#96). 진짜 root-cause = payload-builder의 silent 폴백 `resolveOriginAreaCode(originCode ?? '0200037')` — origin 미상 시 중국 추측, validateForRegistration에 origin 검사 전무.
- **DONE (ORIGIN-TRUTH-GATE·#95·전상품)**: 
  - validateForRegistration origin HARD GATE — originCode 미상/무효 시 발행 BLOCK(추측 금지·관제탑 publish track 자동 개입 #56), 선행0 절삭 치유 시 WARNING.
  - validateForRegistration 옵션 정합 가드 — DB option_rows vs payload combinations 불일치 WARNING(미로드 경로 skip·오탐0).
  - buildNaverProductPayload + register route: silent 중국폴백 '0200037' 제거 → 빈 origin loud throw(last-line defense).
- **검증 (3-tier·#88)**: (1)로컬 validate 3상품(명화/달항아리 PASS·canRegister·payload origin=DB / 아이스 200037 heal WARNING) (2)tsc0·build0·test PASS·이모지0·신규한글리터럴0(영어 에러) (3)prod smoke 명화 publish-preview canRegister=true·readiness S/94·errors[] 무회귀. product_options=relation·발행경로 include 확인(옵션 소실 버그 없음).
- **패치 위치**: src/lib/naver/product-builder.ts(validateForRegistration·buildNaverProductPayload) · src/app/api/naver/register/route.ts. 원칙 #95·#96·#97.
- **다음 1액션**: [Code 진행] P2 reconcile 개입카드(명화 composite stale 18+botanical registry-only → 운영자 등록vs아카이브·전상품·가역·#56) → P3 Phase3 슬롯조립. [결정·대표] PUBLISH-명화 옵션 Cotton 상태(DB 4 ON_SALE↔의도 3=데이터 드리프트, SOLD_OUT 처리 or 행 제거) + 비가역 GO #46. [Desktop] product-builder 정독 root-cause 핀포인트 인계 시 본 작업과 대조(이미 origin silent 폴백 = 핵심).


### 2026-06-17 (96) REGISTRY↔STORAGE 드리프트 탐지 차원 + 핸드오프 보존 (FROM 💻 Code, main b40a711, additive·비가역0·네이버 무접촉)
- **Target**: Claude Code CLI · **Branch**: main (직접) · additive·read-only 탐지·네이버 무접촉·비가역0.
- **선행 보존**: 세션8 Desktop 핸드오프 2건 git 보존(ba09a28·#49) — engine-stage1-verify·prod-verify-registry-storage-drift.
- **DONE (REGISTRY-STORAGE-DRIFT 탐지)**: 기존 #80/#81 자산 정합 가드(storage vs DB ref)에 asset_registry 교차 차원 확장(#93). 
  - listProductStageFolders(automation-storage): `{pid}/` 직속 폴더 열거 — STAGE_DIRS 외 폴더 invisible 문제 해소(#94, undefined-stage 탐지).
  - checkProductIntegrity.registryDrift(asset-integrity): storageOnly(미등록 물리)·registryOnly(파일부재 등록)·undefinedStages. **advisory — ok 게이트 불변(스턱 카드 0·#56)**. 고아 reconcile=운영자 결정(등록 vs 아카이브)=COMPOSITE-CLEANUP/저긴급 배지 후속.
  - scripts/verify-registry-drift.ts: 전상품 데이터레인 검증 아티팩트.
- **검증/게이트 (3-tier·#88)**: (1)로컬 데이터레인(tsx·production Supabase) (2)tsc0·build0·test PASS·이모지0·한글리터럴0·외부 image API 0·네이버 무접촉 (3)prod API smoke registryDrift LIVE. **실측**: 명화 registryOnly=1(botanical-1781410335495.png 파일부재 정확)·storageOnly composite=9(핸드오프 ground-truth 정밀일치)·undefinedStages=0(plate=STAGE_DIRS v2 내·#94 우려 코드레벨 기해소) / 달항아리 storageOnly=9 / 아이스 storageOnly=1 = 전상품 드리프트 thesis 확인. ok=true 전건.
- **패치 위치**: src/lib/storage/asset-integrity.ts · src/lib/storage/automation-storage.ts · scripts/verify-registry-drift.ts. 원칙 #93·#94.
- **ENG-1 검증완 반영**: 핸드오프 §5 — ENG-1 "빌드완료·검증대기"→"완료·검증완(3탭 브라우저 PASS)". CAT-CODE-명화 종결.
- **다음 1액션**: [결정·대표] NEXT-TRACK 택1 — (a)Phase 3 슬롯조립(Code·feat/funnel-slot-fill·전제=registry 메타 join) (b)Lemon 6축 재생성(Desktop/Firefly)+Cotton 품절후보 결정 (c)정합성/태깅 정리 우선. [결정·대표] PUBLISH-명화 2건 확인(원산지 중국산 vs payload 국산·옵션 3 vs 4·비가역 GO #46). [후속·Code 비긴급] REGISTRY-STORAGE-DRIFT 저긴급 배지(UNSEEDED-BACKLOG-BADGE 동일계열·#56) + 고아 reconcile 개입(등록vs아카이브).


### 2026-06-17 (95) 전상품 #62 배치 — emptyCard 중립화 + 미시드 개입카드 + signal 가드 + category 동기화 (FROM 💻 Code, main, additive·전부 가역·비가역0·네이버 무접촉)
- **Target**: Claude Code CLI · **Branch**: main (직접) · 전부 가역·additive·네이버 무접촉.
- **DONE (4건)**:
  - 1) emptyCard 중립화 — category-dna.ts emptyCard() 기본 slotSequence에서 향수편향 슬롯(scent_note/use_install/size_duration) 제거 → 카테고리 중립 [hero,problem,solution_usp,trust,gift,cta]. 미시드 안전폴백.
  - 2) 미시드 개입카드 — category_dna_unseeded(intervention.ts 타입+payload builder, control-tower-engine idle priority 점화[무회귀: 다음액션 있으면 미점화], control-tower-strings.ko.json, matrix widget IV 타입+label+detail, asset-jobs-matrix route dnaUnseeded 배치[seededCodes batch·guarded]).
  - 3) deriveProductSignals 가드 — '리필'+본품동반/giftBiased면 lowInvolvement 미발화(키워드 JSON refillTerms/commodityHard/bundleAnchor). 순수 소모품은 가드 예외.
  - 4) category 동기화 — src/lib/naver/category-sync.ts 헬퍼(전상품·naverCategoryCode→leaf, syncProductCategory) + 명화 Product.category DB '아로마방향제/디퓨저'→'차량용방향제' 동기화.
- **검증/게이트**: tsc0·build0·이모지0·신규한글리터럴0(키워드/문구 i18n JSON)·prisma 싱글톤·sentinel clean·테스트 11 PASS. 로컬 실증: 명화=9슬롯(scent_note 복원·lowInvolvement false)·아이스트레이=6중립(향0)·순수소모품=가드예외(여전히 단축). prod 3상품 재호출(명화 복원·아이스 중립·달항아리 50000963 중립) = push+deploy 후.
- **패치 위치**: src/lib/engine/category-dna.ts · src/lib/engine/slot-decision-table.ts · src/lib/engine/seeds/product-signal-keywords.json · src/lib/jobs/intervention.ts · src/lib/automation/control-tower-engine.ts · src/app/api/products/asset-jobs-matrix/route.ts · src/components/dashboard/ControlTowerMatrixWidget.tsx · src/lib/i18n/control-tower-strings.ko.json · src/lib/naver/category-sync.ts.
- **VERIFIED (Desktop 2026-06-17)**: item1/3/4 PASS(명화 9복원·아이스 6중립·라벨동기화·명화 준비도 S/94) · item2 zero-masking PASS(positive 렌더=idle+미시드 상품 부재로 미관측). ICE-TRAY-DNA 종결(#88).
- **다음 1액션**: [결정] PUBLISH-명화 · CAPTURE-METHOD(3h). [Stage 2 후속·비긴급] UNSEEDED-BACKLOG-BADGE — 저긴급 상시 배지(미시드 N·DNA 시드 권고·긴급큐 비마스킹·#55·#56), branch feat/unseeded-backlog-badge.

### 2026-06-17 (94) Image+SEO/ROI Engine Stage 1 빌드 완료 + 6축 main 머지 (FROM 💻 Code, main 8964ce7, additive·비가역0·네이버 무접촉)
- **MERGE**: 6AXIS-MERGE GO 수행 — feat/mood-camera-system → main fast-forward(349b9db)·push·prod LIVE(6축 UI + 엔진 Stage 0). verify-vercel-deploy OK.
- **DONE (ENG-1, 2 commits)**: 26f8560 백엔드 + 8964ce7 UI.
  - 3a 명명정렬(Rating/PerformanceMetric.generationId→slotGenerationId·schema+Supabase 마이그레이션·0행보존·#62)
  - 3b CategoryDna 로더(src/lib/engine/category-dna.ts·card↔row·DataLab 파생) + 50014980 시드 행(active·9슬롯·필수3·conf 0.7)
  - 3c 9슬롯 결정테이블(slot-blueprint+slot-decision-table) · 3d 전략조립기(strategy-assembler=6축 assemblePrompt 재사용·신설0) · 3e 모델라우팅
  - 3f 개입 dna_confirm/variant_select(intervention.ts+control-tower-engine·additive·firefly_auto 패턴) + ko.json 라벨
  - 3g 썸네일정책→publish-readiness 배선(옵셔널 thumbnailSignals·회귀0)
  - 3i UI: GET /api/engine/strategy + CategoryDnaCard(분석)·SlotFunnelBoard(이미지)·PrePublishGatePanel(발행)·useEngineStrategy·tab= 딥링크·WorkbenchTabs 옵셔널 슬롯
- **검증/게이트**: tsc0·build0·이모지0·신규한글리터럴0(월/대 i18n·키워드 JSON)·prisma 싱글톤·외부 image API 0·비가역0·sentinel clean. 테스트 11 PASS. prod: /studio 200·/api/engine/strategy 200(명화 fallback)·400(no productId).
- **패치 위치**: src/lib/engine/* · src/app/api/engine/strategy/route.ts · src/components/studio/engine/* · src/components/studio/workbench/WorkbenchTabs.tsx · src/app/studio/page.tsx · src/lib/jobs/intervention.ts · src/lib/automation/{control-tower-engine,publish-readiness}.ts · src/components/dashboard/ControlTowerMatrixWidget.tsx
- **RESOLVED (CAT-CODE-명화·경로A, 2026-06-17 Code)**: Product.naverCategoryCode 50003356(실내·오분류)→50014980(차량용방향제) 정정. cmpnooli40001f0gveaxr8iim·DB only·네이버무접촉. 검증 strategy 재호출 dnaSource none→db·scent_note 등장·슬롯 4→7('본품리필'→lowInvolvement로 problem/size_duration 드롭, 9 아님). payload leafCategoryId=50014980 자동(register/route.ts:128)·category 속성셋 앱 미주입(무관).
- **NEW FINDING (ICE-TRAY-DNA·#62)**: 아이스트레이 50005257 향수슬롯 렌더 = 오상속 아님. 근본 = emptyCard() 기본열(category-dna.ts:228-238)이 scent_note 포함(향수편향) → 미시드 전 카테고리 오염. dnaSource none 실측. 결정필요: (A)전용 DNA 재시드 (B)emptyCard 중립화(scent_note 제거·전상품 근본). 코드변경=승인 대기.
- **다음 1액션**: [Desktop] ENG-1 브라우저 실측(§7) — /studio 3탭: 분석 DNA카드 렌더·이미지 슬롯 보드(칩·진행률·슬롯카드)·발행 게이트패널·개입 대기열 dna_confirm/variant_select. 통과 시 Stage 2(학습루프). [결정] ICE-TRAY-DNA(전용시드 vs 범용폴백 중립화)·CAPTURE-METHOD(3h). (CAT-CODE-명화=종결)


### 2026-06-16 (93) 무드-카메라 6축 이미지 시스템 설계 + 전상품 codify (FROM 🖥 Desktop, docs only·비가역0·네이버 무접촉)
- **What**: 무드-카메라 스펙 심층리서치→전상품 공통 시스템 박제. 6축(M1 신뢰/M2 욕망/M3 명료/M4 코지/M5 발랄/M6 프리미엄)·무드별 카메라 매핑·벤치마크DNA·프롬프트 조립기(긍정형 제외)·누적학습 라이브러리·3계층 아키텍처. 근본원인 3건 규명(Sony 하드코딩·편집모드 참조오염·Nano Banana 네거티브 필드 없음).
- **박제**: 신규 docs/research/MOOD_TO_CAMERA_SPEC_RESEARCH_2026-06-16.md + docs/design/MOOD_CAMERA_SPEC_SYSTEM.md. codify FIREFLY_AUTOMATION_PLAYBOOK §9·PRODUCT_REGISTRATION_WORKFLOW §11+rev3·PRINCIPLES_LEARNED #82~#86·PARALLEL_WORK_TRACKER(IMG 5항목).
- **이미지**: cut-1(Lemon)·cut-2(Cotton) 생성·검증·Adobe 보존(오염0·4:5 1856×2304·2K). cut-3·4 보류(트러스티드 클릭 경로 확보 후 새 6축 재개).
- **다음 1액션**: [Code] 6축 시스템 앱 빌드(MoodAxis/CameraSpec/PromptBlock/PromptLibraryEntry/Generation 테이블·3단계 UI·Layer3 가드·firefly_auto subcheck 5종) — 상품별 코딩 0(#55). [Desktop] cut-3·4 재개→ingest×4→실앱테스트. item3 명화 SUSPENSION→발행(대표 GO).

### 2026-06-16 (93) Image+SEO/ROI Engine Stage 0 + control tower codify (FROM Code, feat/mood-camera-system, additive·비가역0)
- **DONE (ENG-0 Stage 0)**: 6 Prisma models (category_dna / slot_plan / prompt_version / slot_generation / rating / performance_metric — Supabase applied), datalab-client.ts (8 endpoints), thumbnail-policy.ts gate + test 6/6. tsc0 / build0. 'Generation' -> slot_generation (collision avoid).
- **DONE (control tower)**: LIVE BOARD atop PARALLEL_WORK_TRACKER + principles #87~#89 + CLAUDE.md index.
- **VERIFY-PENDING (#88)**: [Desktop] confirm 6 tables · policy-gate test · Vercel READY+SHA -> then Stage 1.
- **authority**: docs/design/IMAGE_SEO_STRATEGY_ENGINE.md (engine) · docs/research/IMAGE_SEO_STRATEGY_ENGINE_RESEARCH_2026-06-16.md (evidence).

### 2026-06-14 (87) 내용인식 분류 + IA 3탭 + 한글화 + 인앱삭제 (FROM 💻 Code, main, 비가역 0·additive)
- **What**: 내용인식 스테이지 분류(classifyAsset·파일명+Sharp 메타신호·confidence/qualityFlags/conflict·preflight /assets/classify) + 워크벤치 IA 5탭→3탭(grouped·회귀0) + 한글화(음차 표면화) + 인앱 삭제(/assets/action delete·2단계 게이트·비가역#46).
- **Desktop 검증완(전턴)**: task2 정규화·task4 칩·task5 ZIP·토큰추론 전부 PASS.
- **검증**: tsc0·build0·비가역0. 권위 §8 박제.
- **다음 1액션**: [Desktop] 3탭 IA + 내용인식 칩 + 인앱삭제 브라우저 검증.

### 2026-06-14 (86) 적응형 이미지 엔진 + 폴더 백필 시스템 (FROM 💻 Code, main, 비가역 0·additive·백필 dry-run만)
- **What**: 분류기 결함 A·B 수정(backdrop→plate·archive 선행) + 슬롯비율 정규화 2층방어(config/image-slot-matrix·images/slot-ratio, /assets/upload·/ingest-firefly) + 설정 config화 + 반자동 업로드 stage칩·오버라이드(AssetBrowser) + 상품별 ZIP 내보내기(/assets/export·zip-store) + 레거시 백필 스크립트.
- **백필 PENDING (운영자 GO)**: `npx tsx scripts/backfill-legacy-assets.ts` dry-run = 20건/3상품(cmp3afb9·cmpnooli10·cmpp62yje1). GO 시 `--go --confirm`. COPY→DB갱신→검증→retire·멱등. common/lifestyle 제외.
- **검증**: tsc0·build0·비가역0. 권위 docs/playbook/ADAPTIVE_IMAGE_ENGINE_AND_FOLDER_SYSTEM_2026-06-14.md §7.
- **다음 1액션**: [운영자] dry-run 검토·GO. [Code] GO 후 백필 실행·storage/DB 검증.

### 2026-06-13 (85) #71 사실성 레인 박제 + 향씬 실사정정 + realism_lane 스펙 (FROM Desktop 세션7-g rev2 / TO Code)

| 항목 | 상태 |
|---|---|
| 권위 | docs/playbook/SCENT_MOOD_4SCENE_GRADE_2026-06-13.md(rev2 Desktop 박제완) + docs/design/SCENT_MOOD_BACKGROUND_SYSTEM.md |
| #71 박제 ✅ | '진짜 예술은 진짜로(Authenticity Realism Lane)' PRINCIPLES_LEARNED.md(#69↔#74 사이) + CLAUDE.md §7. AUTHENTIC-ART(라벨·S5)=퍼블릭도메인 실제만, PHOTOREAL=실사·AI회화 금지, 비명화 보편(#55) |
| HTML 실사정정 ✅ | myeonghwa_detail_v2.html .scent-visual 4향 '실사 정물 — [장면]', 히어로 tag-a 실사 프리미엄 환경(벽면 실제 모네 액자·퍼블릭도메인) |
| realism_lane 스펙 ✅ | docs/design/REALISM_LANE_GUARD_SPEC_2026-06-13.md(코드 별도 턴): 슬롯 realism_lane 파생 + PHOTOREAL 회화마감 경고(#56 동형·강제모달 0)·AUTHENTIC-ART 퍼블릭도메인 게이트 |
| 검증 ✅ | tsc0·build0·이모지0·신규 한글리터럴0·prisma 싱글톤·sentinel clean·네이버 무접촉. push READY |
| 다음 | [Code] realism_lane 가드 구현 턴(파생+경고 위젯). [Desktop] 4컷 실사 생성→팔레트 정합→누끼합성 |

### 2026-06-12 (84) /assets composite=0 P0 종결 — Desktop 3-tier LIVE 검증 + probe 삭제 (FROM 💻 Code, production 619dbff, 비가역 0·네이버 무접촉)

| 항목 | 상태 |
|---|---|
| 권위 | HANDOFF_2026-06-12_composite-VERIFIED-desktop.md. (83) probe+하드닝 배포 → Desktop 검증 종결 turn. |
| P0 종결 ✅ | Desktop 3-tier 전부 통과: (1) /assets composite=9(x-vercel-cache MISS·fresh) (2) SQL storage.objects 9건 1:1 (3) /studio 에셋탭 고유 composite 9썸네일 LIVE 렌더(naturalWidth>0). cutout=3 무회귀. |
| 근본원인 ✅ | §5 2행 no-slash list버그 확정(env키 drift 배제·cutout=3 상시정상)·§3 trailing-slash 자가치유(#67) 영구복구. |
| probe 삭제 ✅ | src/app/api/debug/storage-probe 삭제 커밋(임시 진단 역할 종료). tsc0·build0. |
| 다음 | [대표] 명화 publish GO(#46·비가역). [Desktop] P1 실사용 E2E. [Code] asset-hygiene·origin-integrity 별도세션. |

### 2026-06-12 (83) /assets composite=0 probe 배포 + trailing-slash 자가치유 (FROM 💻 Code, main 4e4e8b5, 비가역 0·additive·debug-gated)

| 항목 | 상태 |
|---|---|
| 권위 | HANDOFF_2026-06-12_composite-rootcause-probe.md. Desktop 5단 격리(#66) 전 계층 무혐의·로컬 service key=composite9·prod만 0 → 런타임 단일변수. |
| probe ✅ | GET /api/debug/storage-probe/[id]?token=CRON_SECRET(force-dynamic·nodejs): env keyPrefix/keyLen·storage-js list 3종·REST list 1호출 노출. ★spec /api/_debug/는 App Router private folder(언더스코어=라우팅제외)=무조건404 → /api/debug/ 교정(#34·빌드트리 등재 확인). 확정 후 삭제(임시). |
| 하드닝 ✅ | automation-storage collect() trailing-slash 자가치유(#67): no-slash 0행→`prefix/` 재시도. 0행일 때만=정상결과 불변·list버그 영구복구. |
| 검증 ✅ | tsc0·build0·이모지0·한글리터럴0. push 4e4e8b5. |
| 다음 | [Desktop] probe 호출→§5 판정(env키 drift→운영자 Vercel env 1액션 / list버그→하드닝 종결)→/assets composite=9 LIVE→probe 삭제 커밋. |

### 2026-06-12 (82) 이미지 스튜디오+충실도카드+적재v2 main 병합·production LIVE (FROM 💻 Code, main fa9ad01, 비가역 0)

| 항목 | 상태 |
|---|---|
| 병합·배포 ✅ | feat/image-studio(715f564/dbb9fe7/fa9ad01) → main FF·Vercel production READY(dpl_AK4omPEX·target=production·verify exit0·smoke 200). |
| DB LIVE ✅ | Product.fidelity 컬럼+명화 카드 완성(scents 4향·mountMechanic) / asset_registry / product_asset_objects 함수. |
| 기능 ✅ | C-5 자산브라우저·taxonomy v2(8스테이지)·STAGE_NAMING·AssetRegistry 인테이크·fidelity_check/mount_check 게이트·충실도 프롬프트 주입·refetch #62. |
| ★미해결 | /assets composite 9개 미표시(prod Storage list() 빈응답·사전존재·저영향). RPC 수정 승인 후 신형 sb_secret_ 키 롤 public USAGE 부재(42501) 차단 → 스키마 usage grant 대표 결정 대기. 가짜보고0(#63). |
| 다음 | [Desktop] P0 실사용 검증(#63). [대표] /assets RPC 권한 결정. [Code] asset-hygiene·origin-integrity 별도세션. |

### 2026-06-11 (81) 적응형 합성 엔진 권위문서 신규 + 합성표준 MD 정합 (FROM 💻 Code, main, 비가역 0·docs only)

| 항목 | 상태 |
|---|---|
| 권위 | 신규 docs/design/ADAPTIVE_COMPOSITE_ENGINE.md = 전상품 합성 표준(저장소 권위문서 합성·대표 리뷰 대기). 근거 REP_FINISHING §2/§9·#52/#53/#55/#57·2026-06-10 3-plane·대표 2026-06-11. |
| 엔진 doc ✅ | 6원칙(상품진실 앵커·현실감·3-plane·≥2무드·대표vs추가 분리·적응라우팅)·3-plane 모델·앱통합(C-3/C-7/C-9/C-5)·워크플로7·상품현실시트 템플릿·명화 정정 2무드(걸이형15ml·과대금지). |
| 명화 정체 ✅ | 대표 2026-06-11: 걸이형 15ml·상품 스튜디오컷 가능·핵심=실질적 비율·현실감. ★누끼진실성 caveat: 2026-06-10 reed 육안기록과 불일치 → 합성 전 실비율 누끼 재확인(불일치 시 재누끼). #44/#45/#46. |
| 원칙 #61 ✅ | 상품진실 앵커+3-plane+≥2무드=전상품 합성표준. ★#58~#60 미등재(핸드오프/TASK_BRIDGE 기록)·#61 직행 = 대표 번호 정합 확인 필요(플래그). |
| MD 정합 ✅ | PROGRESS·SESSION_LOG·트래커 rev11(F-합성 9T0 폐기·엔진화/F-엔진 신규/C-3 preview READY·병합대기)·ROADMAP·PLAYBOOK 체크리스트·CLAUDE.md 링크. Python #29b·손상 0. |
| stash z3c | /products/sourced 폐기 리다이렉트 리팩터(needs-redo·ROADMAP Z-3c'). 보류 권고·재작업/폐기 대표 결정(#34). |
| 다음 | [대표] C-3(feat/finish-image-router·preview READY) 병합 GO → [Code] C-5 스튜디오 마무리 카드. [Desktop+대표] Firefly 트랙2(명화 정정 2무드·실비율 누끼). |

### 2026-06-11 (80) C-9 DONE·라이브 확정 전파 + 잔여 MD 정합 (FROM 💻 Code, production 6bbc2a4, 비가역 0·docs only)

| 항목 | 상태 |
|---|---|
| 권위 | NEW_CHAT_STARTER_2026-06-11_C9DONE + PARALLEL_WORK_TRACKER rev10. (79) C-9 빌드·라이브 검증의 문서 전파 turn. |
| MD 정합 ✅ | PROGRESS·SESSION_LOG 2026-06-11 세션4 회고(C-9 DONE·라이브 7ed81a6→6bbc2a4·Desktop 3중+전상품·P1 무회귀·트래커 rev10). PARALLEL_WORK_TRACKER 앱 적용 현황 production HEAD 982f856→6bbc2a4 + C-9 라이브 한 줄. (Code Python #29b 전체덮어쓰기·한글 손상 0). |
| 한글 손상 ✅ | grep FFFD+sentinel 0(intentional 패턴 정의 제외). NEW_CHAT_STARTER "전상품" 정상(이미 클린·재확인). |
| 검증 ✅ | docs only·코드 미접촉·비가역 0. 트래커 C-9 DONE 행은 Desktop rev10에 기록완(중복 아님). |
| 다음 | [Desktop] Firefly 트랙2(명화 무드 합성·대표 파일드롭). [Code] 다음 빌드 = C-3(finish-image 통합 라우터) 또는 C-5(스튜디오 마무리 카드) — 대표 순서결정 1건. |

### 2026-06-11 (79) C-9 개입카드 3종 빌드·라이브 검증 (FROM 💻 Code, production 7ed81a6, additive·가역)

| 항목 | 상태 |
|---|---|
| 권위 | C9_INTERVENTION_CARDS_BUILD_SPEC.md + CUTOUT_HERO_STANDARD §3. 토대 스키마=Desktop apply_migration c9_intervention_fields(적용완). |
| 엔진 ✅ | control-tower-engine: ComputeContext.imageJobIntervention + ActionQueueItem(interventionType/payload) + computeActionQueueItem 분기(firefly_drop=AUTH·hero_crop/source=INPUT_DECISION, 없으면 기존 AUTH 폴백) + computeControlTowerRow ctx 전달. 순수모듈 유지. |
| 라우트 ✅ | matrix loader 최신 awaiting_human 이미지잡 intervention 분리 가드쿼리(#50). apply-cutout 소스 최장변<300 OR OCR텍스트 → hero_crop_request awaiting_human. apply-composite requestFireflyDrop → firefly_drop(드롭킷·3plane 프롬프트·Nano Banana Pro·4:3) / 소스부재 → source_request. intervention.ts 헬퍼(상수·payload 빌더·setJobIntervention, 명화 하드코딩 0). |
| UI ✅ | 개입대기열 카드 interventionType별 인라인 확장 렌더(드롭킷경로+프롬프트 복사+크롭가이드+소스입력), 강제모달 0(#56). i18n control-tower-strings 추가, 코드 한글리터럴 0. |
| 검증 ✅ | tsc 0·build 0·픽토그램 이모지 0·내 diff 한글리터럴 0. ★라이브(production 7ed81a6): 명화 apply-composite requestFireflyDrop → product_composite firefly_drop awaiting_human 잡 1건(cmq93j92u0000k9h5rjsc9t5u) 시드 → /asset-jobs-matrix 명화 actionQueue category=AUTH·stage=firefly_drop·interventionType=firefly_drop·payload.dropkitPath 노출 = PASS. 회귀 0: 아이스트레이/달항아리 interventionType=None·기존 stage 유지. deepLink는 스펙 /products/{id}/studio(404) → 실재 /studio?product={id}로 교정. |
| ★ 잔존(의도) | 명화 firefly_drop 잡 1건=라이브 검증 산출물이자 실제 트랙2 다음스텝(가역). Desktop이 카드 Chrome 실측 후 Firefly 합성 실행 or 불요 시 잡 cancel. |
| 다음 | [Desktop] 관제탑 개입대기열 명화 firefly_drop 카드 Chrome 실측(드롭킷경로·프롬프트복사·확장토글) → Firefly 무드 합성(트랙2) → composite/ 적재. |

### 2026-06-11 (78) P1 배포 독립 재검증 — 전상품 정합 (FROM 🖥 Desktop, production 48e6926, 비가역 0)

| 항목 | 상태 |
|---|---|
| 재검증 ✅ | Desktop 독립 3중+전상품: production 48e6926 READY(d594d85 포함)·라이브 /assets 명화 cutout=3·total=13·달항아리9·아이스트레이1·Storage=API 3상품 완벽일치 무회귀(#55). Code (77) 보고와 100% 부합. |
| 결론 | P1 /assets 중첩prefix cutout=0 종결. 비가역 0. |
| 다음 | [Desktop] 생성에셋위치 카드 Chrome 실측 + Firefly 무드 합성(트랙2·RECOVERY §4) → composite/ 적재. |

### 2026-06-11 (77) /assets cutout=0 P1 버그 수정 빌드·배포 (FROM 💻 Code, production d594d85, 가역·additive)

| 항목 | 상태 |
|---|---|
| 권위 | Desktop 진단·수정(automation-storage.ts listProductAssets.collect). 직전 (76)서 cutout 3건 업로드했으나 /assets가 cutout=0 노출하던 P1. |
| 근본원인 | Supabase Storage list()에 sortBy:{column:'created_at'}를 중첩 prefix({pid}/cutout)에 주면 빈 배열 반환(이 프로젝트 storage 버전 quirk) → root는 통과·중첩 스테이지 0건. 게다가 'if(error||!data) return'이 에러를 묵살해 한 세션 내내 은폐. |
| 수정 ✅ | sortBy {column:'name', order:'asc'}로 교체(name 정렬은 안정적) + error를 console.error 로깅 후 return(묵살 제거). diff 직독 명세 일치. |
| 검증 ✅ | npx tsc 0 · npm run build exit 0(Compiled successfully). push d594d85 · verify-vercel-deploy OK · gh deploy status success. ★라이브 재검증: GET /assets → {source:0, cutout:3, composite:0, thumb:0, detail:0, archive:0, root:10} — cutout=3 통과(0 아님). |
| 다음 | [Desktop] 생성에셋위치 카드 Chrome 실측(cutout 3컷 썸네일) + Firefly 무드 합성(트랙2·RECOVERY §4) → composite/ 적재. |

### 2026-06-11 (76) 명화 진짜 누끼 v2 3종 {pid}/cutout/ 영구화 (FROM 💻 Code, 가역·additive, #59)

| 항목 | 상태 |
|---|---|
| 권위 | RECOVERY §3-1 + 대표 제공 실사 히어로크롭 v2 (Desktop hand-off). |
| #58 검증 ✅ | 3종 육안 확정 = 실상품 디스이즈 차량 클립형: A=리필 드롭병+명화라벨 클립병 세트(330x326)·B=항구범선 라벨+올리브 가지(512x560)·C=들판 라벨 단품 정면(371x460). 전부 RGBA 투명 PNG·파일명=실치수 일치. 리드목업 아님. |
| 업로드 ✅ | Storage API POST(x-upsert·image/png) 3건 success → product-assets/cmpnooli40001f0gveaxr8iim/cutout/. public URL 3건 HTTP 200·Content-Type image/png·바이트 로컬 정합(B 507,979 / A 164,853 / C 212,752). |
| 효과 | /api/products/[id]/assets cutout 단계 0→3건(생성에셋위치 카드 반영). 엔진 고정명 cutout.png 교체는 별건(대표컷 재선정 후). 비가역 0(업로드=가역 additive·네이버 0). |
| 다음 | [Desktop] Firefly 무드 합성(트랙2)·mainImage 재선정(RECOVERY §4) → composite/ 적재. |

### 2026-06-11 (75) storage-visibility 미커밋 작업분 검증 + main 직접 커밋 (FROM 💻 Code, 비가역 0·코드 additive)

| 항목 | 상태 |
|---|---|
| 진단 확인 ✅ | feat/asset-storage-visibility 작업분은 커밋 이력 0 — 전부 working tree(M 5 + untracked 9). 브랜치는 main과 동일 SHA(5e2cce2)의 빈 껍데기 → 대표 지시대로 main 직접 커밋·브랜치 삭제. |
| 코드 직독 ✅ | NEW GET /api/products/[id]/assets(읽기전용·listProductAssets 래핑·스테이지별 그룹+legacy root·mutation 0) + GeneratedAssetLocations 카드(상품 상세 마운트·한글 .strings.ko.json 분리 #35·Lucide만·이모지 0). AssetKind 'source' 단계 additive 확장(asset-taxonomy 00_source·automation-storage 타입/주석). .gitignore assets/generated/ 제외(캐논=Supabase #59). |
| 검증 ✅ | npx tsc --noEmit 0 errors · npm run build exit 0(/api/products/[id]/assets ƒ 등록). 비가역 0(네이버 0·DB 0·읽기전용). |
| 커밋 | main 직접 2건 분리(src+.gitignore=feat / docs=RECOVERY·플레이북·핸드오프·TASK_BRIDGE (74)(75)) + feat/asset-storage-visibility 브랜치 삭제 + push. SHA·Vercel READY는 push 후 hand-off 메시지로 회신(#36·#45). |
| 다음 | Desktop 교차검증(production SHA + /products/[id] 생성에셋위치 카드 Chrome 실측) → RECOVERY §5(진짜 누끼 재추출→{pid}/cutout/ 업로드). |

### 2026-06-11 (74) 명화 리드목업 3건 Supabase 삭제 실행 (FROM 💻 Code, 대표 GO 확인, 비가역 1건 실행·검증 통과)

| 항목 | 상태 |
|---|---|
| 권위 | HANDOFF_2026-06-10_PRODUCT-IDENTITY-RECOVERY.md §2(폐기 대상)·§6-1(붙여넣기 문구) + 세션 내 대표 GO 확인. 직전 cutout-fix 핸드오프의 "정확한 제품" 기록은 RECOVERY §8이 명시 대체(리드디퓨저 전제 오류). |
| 사전점검 ✅ | 3/3 실재 + 육안 확정(#45/#58): cutout.png=myeonghwa-cutout.png SHA256 동일(253x776 RGBA)·myeonghwa-main-1000.jpg 1000² — 전부 리드디퓨저 AI목업(실상품=디스이즈 차량 클립형 아님). DB 참조 0건: Product.mainImage=thumb-cropmain-1780913225888·detail_image_url=detail-source-1780914984379(둘 다 보존군). 유일 참조 asset_jobs aj_mh_gen_001=cancelled(과거 메타·무해). |
| 백업 ✅ | ~/Desktop/kkotium-asset-backup/2026-06-11-myeonghwa-reed-mockup/ 3건 다운로드·사이즈/SHA256 대조 일치(레포 외부=working tree 무오염). |
| 삭제 실행 ✅ | Storage API DELETE 3건 success(GO 후). 재조회 검증: 폴더 잔존 10건=보존군 전부 무사(detail-source 2·thumb 4·backdrop 2·detail-S6 1·myeonghwa-backdrop-860)·삭제대상 잔존 0건. |
| 영향(의도됨) | 엔진 고정명 cutout.png 조회 → 진짜 누끼 재추출·{pid}/cutout/ 업로드 전까지 공급사 fallback. 잘못된 목업 누끼 사용 차단이 목적이라 RECOVERY 플랜 정합. |
| ★ flag(#34) | myeonghwa-backdrop-860.jpg가 삭제된 목업과 동일 배치(06-04 05:43) 업로드분 — 목업 연관 의심. 삭제 지시 3건에 미포함이라 보존, Desktop 육안확인 후 대표 결정 위임. |
| 다음 | RECOVERY §5 순서 유지 — [Desktop] 진짜 누끼 재추출(detail-source y7580~8210) → [Code] {pid}/cutout/ 영구 업로드. [별건] storage-visibility 머지 paste(§6-2) 대기. |

### 2026-06-10 (72) 병합 production READY 확인 + C-4 라이브 검증(seo-guard info 강등) + SUSPENSION 선결 해소 확인 (FROM 🖥 Desktop, main 982f856, 비가역 0)

| 항목 | 상태 |
|---|---|
| 병합 production READY ✅ | Vercel list_deployments 실측: dpl_FXyEE7V56gjJEjQXsE3kT5LmLnXQ = state READY·target production·SHA 982f856(ref main, merge C-1+C-7+C-2+FT). 세션2 종료 시 BUILDING이던 병합이 READY 확정. /white-bg·/apply-cutout·/apply-composite 라이브. "production 미반영" 블로커 해소. |
| C-4 라이브 검증 ✅ | 스키마 실측: main_image_policy(varchar)·extra_images(jsonb [] NOT NULL) production DB 반영. 명화 main_image_policy=lifestyle_intended 설정(가역 DB write=POST 라우트 컬럼-only 효과 직독 확인, 대표 영구결정 6h라 유지). GET /seo-guard production before/after: main_image_white_bg fail->info·seoGuard.ok false->true. 엔진 직독: 명화 nextAction=resolve_suspension(Step6 publishDrift 우선)·apply_curated_main 삼중 소거(SUSPENSION+curated+lifestyleRep). 대조군 달항아리 mainImageApplied=default→apply_curated_main 노출(정상). |
| SUSPENSION 선결 해소 ✅ | 명화 실측: naver_material=유리·naver_color=투명 채워짐·missingRequired=[]·readinessGrade S/94·attributeGrade A/78. SUSPENSION 근본원인(재질/색상 누락) 내부 게이트 해소. 남은 것=네이버 update PUT(statusType->SALE·안전번호 HB 2종). 대표 GO 후 비가역(#46). |
| 단계폴더 baseline ✅ | storage.objects 재실측: 명화13·달항아리9·아이스트레이1 전부 root_flat·단계 0. 병합 production됐으나 배포 후 신규 업로드 0건이라 미생성(정상). C-6=스튜디오 적용 1회로 단계폴더 실생성 검증(대표 실행 or Chrome 반자동·Claude 앱 POST 불가). |
| 인계 ✅ | NEW_CHAT_STARTER_2026-06-10_C6_studio_run.md 작성(권위본)·트래커 rev6 갱신. |
| 다음 | [Desktop+대표] C-6 단계폴더 실생성 + 명화 Firefly 무드(트랙2). [Code] PROGRESS/SESSION_LOG 세션3(#29b)·C-3→C-5→C-8. [후속 대표 GO] 명화 SUSPENSION 해제 update PUT(선결 해소됨, 비가역). 진입=NEW_CHAT_STARTER_2026-06-10 §5. |

### 2026-06-09 (71) 자산 폴더 자동분류 검증 + Adobe CC 폴더 생성 + 누끼 3종 재작업 (FROM 🖥 Desktop, feat/composite-pipeline 39c8072, 비가역 0)

| 항목 | 상태 |
|---|---|
| 누끼 3종 재작업 ✅ | 1차 170px 카드컷 폐기 → 대표 실촬영 히어로컷 3장에서 image_remove_background → 투명PNG 완전포함 3종(A 들판소녀·B 차량가죽범선·C 흰배경). 투-트랙(#57): 정보형 새배경(C)·감성형 Firefly 무드(B). track1_C 새배경 합성 산출완. Firefly는 대표 파일드롭 대기(키트). |
| C-2 검증 ✅ | apply-cutout 직독: whiteBgFinish 재사용·bg_clean done 전이·#57 sourceGuidance·OCR block 가드·비가역0 정합. |
| FT 폴더 자동분류 ✅ | FT-코드(Code): AssetKind 2→5종·경로 {pid}/{kind}/{variant}·list 재귀(stage 필드)·findCachedAsset root우선+fallback·asset-taxonomy.ts·생산자 정합. tsc0/build/8생산자/기존 flat 미이동. FT-검증(Desktop): storage.objects 조회 → 명화13·달항아리9·아이스트레이1 전부 root_flat·하위호환 확인(단계폴더 실생성은 병합 후 신규업로드 시=C-6). FT-Adobe(Desktop, 승인): KKOTIUM_GARDEN/ 루트+6폴더 생성완(STAGE_FOLDER 미러). 중복 kkotium 6개=백업됨·삭제는 대표 Adobe 웹 직접(비가역). |
| 인계 ✅ | NEW_CHAT_STARTER_2026-06-09_2 갱신(권위본)·ASSET_FOLDER_TAXONOMY_BUILD·#57·트래커 FT 행. |
| 다음 | 병합 GO(권고) → C-6 실무테스트(단계폴더 실생성 포함) + 명화 Firefly 무드 + Code PROGRESS.md 갱신·C-4·C-3→C-5→C-8. 진입=NEW_CHAT_STARTER_2 §5. |

### 2026-06-09 (70) 명화 누끼 산출 + Adobe 백엔드 복구 확인 + 합성 실행 인계 (FROM 🖥 Desktop, feat/composite-pipeline a28946e, 비가역 0)

| 항목 | 상태 |
|---|---|
| 상태 교차검증 ✅ | production(target=production READY)=e0c7f19(main). C-1/C-7는 preview 빌드만 READY·production 미반영(병합 대기). composite-pipeline a28946e(C-1+C-7, base dbbb04d). 드리프트 0·직전(69) 지점 그대로. |
| Adobe 백엔드 복구 ✅ | adobe_mandatory_init 200·image_remove_background 정상. 직전 세션 400 블로커 해소. 단 compositing/gen-fill/prompt 배경교체는 Adobe MCP 영구 미지원(라우팅 문서) → 무드 합성=Firefly 웹UI(#52), 누끼만 MCP. |
| 명화 누끼 산출 ✅ | 풀해상 상세(1000x18291) 밴드스캔+육안: 클린 단독샷 부재 실측(본품은 4종변형 카드에 작게·텍스트·연출배경). 본품 크롭(x222-392,y7655-8085, 170x430)→image_remove_background→투명 PNG 누끼 성공(텍스트·이웃캡 정상 제거·유리경계 깨끗). 한계(#46): 170x430 소형 → Firefly 레퍼런스로 충분, §9 대표(1000)엔 작음. 대표=가죽 확정이라 무관. 파일 대표님 다운로드 제공(myeonghwa_bottle_cutout.png). |
| 부수 확정 | 상세 r2(환경부) 밴드 실측 안전번호 2종 = HB19-12-1462 / HB21-12-2572. SUSPENSION 해제 입력값(대표 GO 후 비가역). |
| 인계 ✅ | docs/handoff/NEW_CHAT_STARTER_2026-06-09_2_composite_run.md 작성(다음 채팅 권위본). 트래커 rev5 갱신. |
| 다음 | 명화 Firefly 합성(누끼 레퍼런스 드롭=대표·프롬프트 구동=Claude·다운로드=대표→apply-composite 회수) + 병합 GO(권고) + 병렬 C-2·C-4·C-3→C-5→C-8. 새 채팅 진입=NEW_CHAT_STARTER_2 §5. |

### 2026-06-09 (69) C-7 검증 + extra_images 마이그레이션 적용 + 합성 인계 (FROM 🖥 Desktop, feat/composite-pipeline 65275b9, 비가역 0)

| 항목 | 상태 |
|---|---|
| C-7 검증 ✅ | job-type-routing(product_composite/harmonize·isFinishingJobType)·apply-composite 라우트(in-app+Firefly 회수·추가이미지 적용·P2022 가드) read 검증. asset_jobs CHECK에 product_composite/harmonize 존재 실측 → job seed 무결함. |
| 마이그레이션 ✅ | extra_images jsonb(기본 []·NOT NULL) Desktop apply_migration 적용·검증완(additive·가역·production 무해). C-7 confirm 경로 unblocked(P2022 degrade 해소). |
| 인계 ✅ | docs/handoff/NEW_CHAT_STARTER_2026-06-09_composite.md 작성(다음 채팅 권위본). Firefly 탭 Chrome id 1396049947 준비됨. |
| 병합 권고 | feat/composite-pipeline = C-1+C-7 포함. /white-bg·/apply-composite는 순수 additive(UI 미연결→production blast 0) → composite-pipeline → main 병합으로 C-1+C-7 동시 반영 권장(충돌 0, 라이브 실측 가능). 대표 OK 시 Code/터미널 병합. |
| 다음 | 명화 합성(Firefly 브라우저 구동 → apply-composite compositeUrl 회수) + 병합 결정 + 병렬 C-2·C-4·C-3→C-5→C-8. 새 채팅 진입=NEW_CHAT_STARTER §5. |

### 2026-06-09 (68) 대표이미지 규격(§9) + 합성/추가이미지 체계 확장 + C-1 검증 (FROM 🖥 Desktop, main/feat dbbb04d, 비가역 0)

| 항목 | 상태 |
|---|---|
| 권위 | 대표 지시: 명화 대표=가죽 확정(재변경 없음)·나머지 썸네일=레퍼런스 비율 개선·누끼는 합성 입력·누끼+합성 앱 기능·전체 체계 설계. |
| C-1 검증 ✅ | feat/white-bg-simple 2ff4a77 3파일+CropWarning read 검증완(지난 턴). dbbb04d=docs-only(런타임 무변, #36 확인). |
| §9 규격 박제 ✅ | REPRESENTATIVE_IMAGE_FINISHING_SYSTEM §9 — 대표이미지 전상품 규격(1:1 1000·순백·본품70~85%·텍스트0). 첨부 레퍼런스 기준. |
| 체계 확장 ✅ | CUTOUT_CROP_FEATURE_BUILD_PLAN에 C-7(합성 apply-composite·harmonize=Branch B)·C-8(추가이미지 멀티슬롯) + 통합 적응형 흐름(상황별 융통+개입점 자연) + 붙여넣기 문구. 합성 레시피 = HANDOFF_myeonghwa_composite_recipe. |
| 정직 메모(#46) | ⚠ Adobe 이미지 백엔드(bartlebee encode) 이번 세션 400 오류 → 누끼/합성/미리보기 직접 산출 불가. + compositing/gen-fill는 애초 Adobe MCP 미지원. 이미지 산출 경로 = 앱 파이프라인(Code) or 로그인된 Firefly 브라우저 반자동(#52). |
| 다음 | TO 💻 Code — C-1 머지 게이트(C-6 후) / C-2·C-4·C-7 병렬 가능 / C-3→C-5→C-8 직렬. 명화 실제 합성 = 대표 로그인 Firefly 탭 오픈 시 Desktop 구동. |

### 2026-06-09 (67) 누끼+크롭 마무리 시스템 설계·인계 (FROM 🖥 Desktop, main c55248d, 비가역 0)

| 항목 | 상태 |
|---|---|
| 권위 | 대표 지시: 누끼+크롭을 전상품 앱 기능으로(#55). 명화 대표=가죽 유지(override 1호). |
| 설계서 ✅ | docs/design/REPRESENTATIVE_IMAGE_FINISHING_SYSTEM.md 신규 — 적응형 라우터(SIMPLE 인앱 sharp / COMPLEX 어도비 개입) + seo-guard 연동 + 추가이미지 슬롯 + override 정책. |
| 빌드플랜 ✅ | docs/plan/CUTOUT_CROP_FEATURE_BUILD_PLAN.md 신규 — C-1~C-6 청크(각 = 새 채팅 1개), 의존 그래프, 청크별 붙여넣기 진입 문구 포함. |
| 코드 실측 ✅ | thumb-crop=완성(크롭) / asset-edit-job bg_clean=seed만·executor 없음 / job-type-routing 4타입 / seo-guard fail 감지되나 개입대기열 미연결. |
| 트래커 ✅ | PARALLEL_WORK_TRACKER 6h(가죽 유지 결정)·누끼/크롭 시스템 섹션(C-1~C-6) 등재. |
| 정직 메모(#46) | 이번 세션 Adobe 이미지 도구는 deferred(tool_search 필요)·bash/스토리지 업로드 없음 → 생성물 영구호스팅·DB 적용 불가 → 적용부는 앱(Code) 담당이 올바른 구조. "첨부했던 썸네일 크롭 후보"는 본 컨텍스트에 없음(요약 유실) → 필요 시 구현 채팅에서 재첨부 요청. |
| 다음 | TO 💻 Code — C-1(인앱 SIMPLE 누끼) ∥ C-2(어도비 적용) ∥ C-4(가드→대기열) 병렬 가능. 각 청크 새 채팅. 구현·push 후 Desktop이 SHA(#36)+엔드포인트(#45) 검증 → C-3 → C-5 → C-6(브라우저 테스트=Desktop). |

### 2026-06-09 (66) 6g 잔존 브랜드 오타 flag 3곳 전부 처리 (FROM Code, main aa7e5b9, 비가역 0)

| 항목 | 상태 |
|---|---|
| 권위 | PARALLEL_WORK_TRACKER 6g + 대표 승인(전부 진행). 커밋 aa7e5b9. |
| 처리 ✅ | export/naver(CSV 브랜드 칼럼)·naver-defaults(KKOTIUM_DISPLAY brand/manufacturer/importer + 카카오채널 5곳) 오타 교정·구조 보존('(협력사)'·'@'·kkotium-supplier 영문 슬러그 유지). layout.rtf(.rtf 잔존본·참조 0) git rm(#34, 이력 보존). |
| 안전 | 정답=신뢰소스(layout.tsx) 추출 + 코드포인트 토큰 치환(수기 0). 1차 정규식 greedy 오훼손은 커밋 전 HEAD 복원으로 차단(미반영). 전역 브랜드 오타/변종 0(grep). |
| ★ 별도 결정 | naver-defaults 제조사/수입사 '(협력사)' 표기 vs MEMORY 정책(없으면 기본 브랜드)은 미변경 — 정책 결정 시 별건. |
| 검증 | tsc 0·build OK·전역 오타/변종 0·비가역 0. production aa7e5b9. ★프리셋 엔진 Phase A/B 전 commit + 브랜드 정합 완료. |

### 2026-06-09 (65) 프리셋 엔진 B-2 SEO 린터 + B-3 generate-detail 소비 + site title/brand 오타 교정 (FROM Code, main 9f90faf, 비가역 0)

| 항목 | 상태 |
|---|---|
| 권위 | BUILD_PLAN commit B-2·B-3 + PARALLEL_WORK_TRACKER 6g. 커밋: title eef3ce1 · B-2 86aa160 · B-3 73d4111 · brand 9f90faf. |
| B-2 SEO 린터 ✅ | seo-guard-linter.ts(순수·동기·프리셋 독립 orthogonalToPreset=true) 3체크: 상품명50(checkProductName)·대표 화이트배경(naver-normalize 픽셀 결과 주입·미검사 시 manual #46)·카테고리 8자리 leaf. GET /api/products/[id]/seo-guard(대표 fetch→assertWhiteBackground 4모서리, BACKGROUND_NOT_WHITE만 false·TOO_SMALL/네트워크 null). |
| B-3 generate-detail ✅ | concept_preset/intensity/overrides select + presetLayout(preset·recommendedPreset(categoryToFamily thin)·matchesRecommendation·content·slots·locked) + seoGuard 항상. buildPresetDetailContent(데이터 섹션=groundedFacts only #46·내러티브=중립 과장0 템플릿 JSON). presetOnly 분기(diagnosis/PNG 불필요·전상품). 기존 27렌더러 PNG 경로 보존. /studio/preset-preview Live 로드(productId→presetOnly→렌더+seoGuard 칩+추천 일치). |
| title/brand ✅ | site title 오타 교정(eef3ce1). 6g 잔존 브랜드 오타 grep 11곳 → 안전군 5곳(Header UI·Discord 알림 4) 교정. 정답 문자열은 신뢰 소스(layout.tsx)에서 추출해 치환(수기 입력 0)·코드포인트 검증(U+D2D4)·변종(U+D2C8) 오염 0. |
| ★ flag(사용자 결정) | 외부/정책 영향 3곳 미처리: export/naver route(네이버 export 식별 필드)·naver-defaults.ts(브랜드/제조사/수입사/카카오채널, MEMORY 정책 연관)·layout.rtf(실 소스 아님·.rtf 잔존본 #34). |
| 검증 | tsc 0·build OK·이모지 0·코드 한글 리터럴 0(주석 영어·문구 JSON)·sentinel 0·브랜드 변종 0·비가역 0(네이버 0·DB read-only). |
| ★ 다음 | Desktop Control Chrome: (1) /studio/preset-preview Live 로드 — 3상품 productId→presetLayout 렌더+seoGuard 칩 (2) GET /seo-guard 3상품 결과 (3) 탭 title·헤더 브랜드 정상 표기 (4) flag 3곳 처리 결정. ★프리셋 엔진 Phase A/B 전 commit(A·B-1·B-2·B-3) 완료. |

### 2026-06-09 (64) 적응형 프리셋 엔진 Phase B-1 — 7섹션 React 렌더러 (FROM Code, main 6e6aad1, 비가역 0)

| 항목 | 상태 |
|---|---|
| 권위 | BUILD_PLAN commit B-1 + aroma_L3_detail_reference.html 1:1. 승인: 레퍼런스 React 렌더러 신설. |
| (1) 렌더러 ✅ | DetailPresetArticle(순수 presentational·hooks 0 → renderToStaticMarkup(B-3)+클라 미리보기 공용). 7섹션(hook/value/spec+scents/usage/trust/cta/notice+brandbar+sticky-buy) 1:1. 100% props-driven(컴포넌트 한글 0)·인라인 SVG→Lucide(이모지 0). |
| (2) CSS 모듈 ✅ | preset-detail.module.css .root 스코프. semantic 토큰만 참조→data-preset 교체=전섹션 재스킨. hero/story 장식 color-mix 토큰화(타프리셋 재스킨)·terracotta/rose-dust var(--…, var(--accent)) fallback. scent 스와치 리터럴(향 정체성·aroma). intensity=패딩 밀도(l1/l2/l3). 모바일 16px·sticky-buy. |
| (3) 슬롯/타입 ✅ | types.ts DetailContent(7섹션)+PresetOverrides(accent/heroCopy/moodImage=개입점 CONCEPT §5). samples.ko.json 3종 fixture(명화 aroma/L3·달항아리 tradition/L3·아이스트레이 kitchen/L1, 한글 데이터 분리). |
| (4) 검증 페이지 ✅ | /studio/preset-preview(상품 선택+preset/intensity 토글 재스킨 실측, 코드 한글 0). |
| 검증 | tsc 0·build OK(/studio/preset-preview 10.3kB)·이모지 0·코드 한글 리터럴 0(주석 영어)·sentinel 0·비가역 0(네이버 0·DB 0·렌더 read-only). |
| ★ 다음 | Desktop Control Chrome /studio/preset-preview 라이브: (1) 명화 aroma/L3·달항아리 tradition/L3·아이스트레이 kitchen/L1 3종 렌더 (2) preset 토글로 동일 콘텐츠 재스킨(surface/accent/ink 전환) (3) intensity 밀도·모바일 sticky-buy. 후속=B-2(SEO 린터)→B-3(generate-detail 소비). |

### 2026-06-09 (63) 적응형 프리셋 엔진 Phase A — 토큰 정합 (FROM Code, main 0b969f3, 비가역 0). ★production 0b969f3 검증

| 항목 | 상태 |
|---|---|
| 권위 | docs/plan/ADAPTIVE_PRESET_ENGINE_BUILD_PLAN.md commit A + ADAPTIVE §7.2. 선행 docs 커밋 5df7ba6(BUILD_PLAN·ADAPTIVE §7.1/7.2·aroma L3 레퍼런스·트래커 rev4). |
| 전제 ✅ | item3 Supabase 컬럼 실재(Desktop 확인)·신규 SQL 0. 전상품 프리셋 배정(명화 aroma/L3·달항아리 tradition/L3·아이스트레이 kitchen/L1). blast radius 0(엔진 미연결 grep 실측). |
| (1) globals.css ✅ | 구 --preset-* 6토큰 → :root 고정 코어(--brand-red/pink·--font-body·--font-display Noto Serif KR·--sp-1~6·--r-*·--shadow, 충돌 0) + [data-preset] 5종 semantic(§7.2 verbatim: surface/surface-subtle/surface-deep/accent/accent-soft/ink/ink-soft/line/card, aroma만 terracotta/rose-dust). bare :root 금지=셸 --surface 비파괴, [data-preset] 스코프 한정. |
| (2) 폰트/리네임 ✅ | layout.tsx Noto Serif KR webfont 추가. section-variants --preset-surface→--surface·--preset-text→--ink. concept-presets palette §7.2 리치셋(text→ink·gift/pet 색 교정·surfaceDeep/accentSoft/line/card 추가). |
| 검증 | tsc 0·build OK·잔여 --preset- 0·accent 5종 globals↔concept-presets 3-way 일치·코드 한글 리터럴 0(신규)·비가역 0. verify-vercel-deploy: production 0b969f3 OK. |
| ★ 다음 | commit B-1(7섹션 React 렌더러 레퍼런스 1:1). A는 렌더 소비처 없어 단독 시각검증 제한적 → B-1서 명화 aroma/L3·달항아리 tradition/L3·아이스트레이 kitchen/L1 재스킨 Control Chrome 실측. |

### 2026-06-08 (62) 아틀리에 job 생명주기 컨트롤 (FROM Code, main d08341e, 비가역 0). ★control loop production 실측

| 항목 | 상태 |
|---|---|
| 권위 | PARALLEL_WORK_TRACKER #8 + STUDIO_ATELIER_UX_REDESIGN. 선결(워크벤치 asset_jobs 표시) 해소. |
| 선결 ✅ | JobLifecyclePanel을 controls 슬롯 상단 마운트(SWR 8s 폴링·jobs 0이면 미표시). 워크벤치 우측에 asset_jobs 표시 통합. |
| (1) 컨트롤 ✅ | asset-job-state ALLOWED_TRANSITIONS 확장: in_progress->cancelled(중단)·done/cancelled->ready(운영자 step-back/reopen). NEW /api/products/[id]/jobs(GET 목록·P2021 가드 / POST {jobId,action:cancel|retry|reopen}→transitionJob 래핑·소유 가드·JobTransitionError 409). 취소/재시도/되돌아가 수정. |
| (2) 레드 스코프 ✅ | 취소=뉴트럴(회색)·재시도/되돌아가=아웃라인. 레드 0(발행GO·메인지정만 유지). 상태칩 그린/앰버/보라/뉴트럴. |
| ★ 실측 | production control loop: 명화 asset_jobs(10 cancelled) GET → reopen(cancelled->ready) success → cancel(ready->cancelled) success(복원). transitionJob 상태머신·전이로그 동작 확인. 비가역 0(asset_jobs DB만). |
| 검증 | tsc 0·build OK(/jobs ƒ)·이모지 0·한글 코드 0·비가역 0(네이버 0). |
| ★ 다음 | Desktop Control Chrome: 워크벤치 우측 진행 작업 패널·취소/재시도/되돌아가 버튼 동작·레드 스코프 실측. 명화 stale 10잡은 cancelled 복원됨(audit 전이 2행). |

### 2026-06-08 (61) 아틀리에 2단계 — 우측 독립 스크롤 교정 + 워크벤치 임시저장 (FROM Code, main b665440, 비가역 0)

| 항목 | 상태 |
|---|---|
| (1) 스크롤 ✅ | 근본원인: WorkbenchTabs ScallopCard overflow:hidden+flex:1이 탭 패널 클리핑→aside 스크롤 무력화. 교정: overflow:visible·flex:1 제거(카드 성장→aside 스크롤이 마지막 버튼 도달) + WorkbenchShell aside max-h calc(100vh-2rem)·overscroll-behavior:contain·paddingBottom 24. 전상품 우측 공통. |
| (3) 임시저장 ✅ | useStudioActions가 경량 입력(manualCutout/Backdrop/overrideSkeleton/mainVariant)을 productId별 localStorage 디바운스(600ms) 저장+복원(restoredForId 가드). 헤더 임시저장됨 HH:MM 표시. draftSavedAt/clearDraft. 이탈/새로고침 유지·가역. |
| (2) job 생명주기 ⏸SCOPED | 취소/재시도/단계 되돌아가 수정. 워크벤치(AiQueueStepper=로컬 HITL)는 asset_jobs 미표시 → asset_jobs 표시 통합 + cancel/retry/step-back 엔드포인트(transitionJob 래핑) 별도 turn. |
| 검증 | tsc 0·build OK·이모지 0·한글 코드 0·비가역 0. /studio 200. 스크롤 바닥·임시저장은 Desktop Control Chrome DOM 실측 필요. |
| ★ 다음 | Desktop Control Chrome: 우측 펼침 시 마지막 버튼 도달·새로고침 후 복원·임시저장됨 표시. 후속: job 생명주기 전용 turn. |

### 2026-06-08 (60) 인제스트 재발방지 + 2갈래 실품질 + 명화 상세 Branch A (FROM Code, main f3c3784, 비가역 0). ★명화 큐레이션 完(main+detail curated)

| 항목 | 상태 |
|---|---|
| 권위 | docs/plan/PARALLEL_WORK_TRACKER.md #3·4·5 + IMAGE_DETAIL_TWO_BRANCH_SYSTEM.md. |
| (1) 재발방지 ✅ | parse-dome-no.ts(도매 url 번호 파서·sharp-free) + products create가 supplier_product_code를 explicit→productNo→url(sourceUrl/url/productUrl) 파싱 폴백 → 누락 0(전상품). |
| (2) 2갈래 실품질 ✅ | capture-source-detail가 공급사 상세 assessImageQuality→quality_reasons.sourceDetailGood(score>=50). engine deriveSourceStrategy(상세품질×썸네일 curated → A/A_EXTRACT/MIXED/B/unknown). matrix read + 관제탑 칩 4값. ★production 실측: 명화=A(상세양호+대표curated)·달항아리=B(캡처 860x2294 저점)·아이스트레이=unknown(미캡처). 가용성→실품질 전환 완료. |
| (3) 명화 상세 Branch A ✅실행 | NEW POST adopt-source-detail(detail_image_url=source_detail_url + mostly_blank 확인 후 detailCurated 스탬프·detailBranch=A, 가역·생성 안 함). DetailPageCard "공급사 상세 그대로 적용" 버튼(sourceDetailUrl 시·생성 대안). ★명화 실행: re-capture(sourceDetailGood)→adopt→detail=**curated**(production 실측). |
| ★명화 큐레이션 完 | main=curated(v2 크롭)·detail=curated(Branch A 공급사 상세)·sourceStrategy=A. 잔여=SUSPENSION 해제(대표 GO 비가역만). |
| 검증 | tsc 0·build OK(adopt-source-detail ƒ)·이모지 0·한글 코드 0·비가역 0(네이버 0; DB 가역만). |
| ★ 다음 | Desktop: (a) 명화 main+detail=curated·sourceStrategy=A 매트릭스/Chrome 실측 + 명화 상세 미리보기(공급사 1000x18291 채택본) 육안 → 대표 컨펌 (b) 아이스트레이 도매번호 operator 제공→capture (c) 명화 SUSPENSION 해제 발행 GO(비가역, 대표). 후속: Branch A SEO/ROI 보강 자동화·Branch B 27렌더러(별 turn). |

### 2026-06-08 (59) 풀해상 상세 캡처(P16 해소) + 명화 main=curated 실행 + 2갈래 sourceStrategy (FROM Code, main 555466c, 비가역 0·네이버 0). ★item1·4 EXECUTED

| 항목 | 상태 |
|---|---|
| 권위 | docs/design/IMAGE_DETAIL_TWO_BRANCH_SYSTEM.md. 지난 turn item1 BLOCKED(소스 부재) 해소. |
| (1) 풀해상 캡처 ✅실행 | 근본원인 실측: getItemView desc.contents=객체(item/deli/event), 풀해상은 공급사 godohosting hotlink 보호. capture-supplier-detail.ts(desc.contents URL 추출·_stt 썸네일 제외·Referer fetch·최대면적) + POST /api/products/[id]/capture-source-detail → product-assets 업로드 → source_detail_url 컬럼(apply_migration add_source_detail_url). ★명화 실행: this_is_air_freshener_detail.jpg=**1000x18291** 캡처→Supabase 저장. |
| (4) 명화 main=curated ✅실행 | 캡처 Supabase 소스에 thumb-crop box{147,9407,696,696}→1000²(업스케일 1.44x+언샤프)·confirm:true. dry-run: region 정확·OCR 텍스트0·LOW_RESOLUTION caution만(비차단). 적용→mainImage=product-assets/thumb-cropmain. ★production 매트릭스 실측: 명화 main=**curated**(default→전이 완료). |
| (2) sourceStrategy 부분 ✅ | applyStatus.sourceStrategy(A=source_detail_url 확보→그대로활용 후보 / unknown). matrix hasSourceDetail + 관제탑 칩. 명화=A 실측. ★good/poor 품질 분리 평가(A/B 확정)는 후속. |
| (3) Branch A SEO보강 ⏸ | 공급사 상세 양호 시 "그대로+SEO/ROI보강"(생성 안 함) 본격 구현은 후속 turn. Track2(27렌더러)는 Branch B 전용(명화 불필요). |
| 검증 | tsc 0·build OK(capture-source-detail ƒ)·이모지 0·한글 코드 0·비가역 0(네이버 0; DB 가역+additive 컬럼만). production 실측 명화 main=curated·sourceStrategy=A. |
| ★ 다음 | Desktop: (a) 명화 main=curated 매트릭스/Chrome 실측 + 새 대표컷 육안(상세 9407px 부근 제품 단품) (b) 전상품 capture-source-detail 실행(풀해상 확보) (c) 명화 detail은 Branch A=상세 그대로 활용 결정 시 source_detail_url→detail 적용 or 부분 크롭. 후속: 품질 분리 평가·Branch A SEO보강. 명화 SUSPENSION 해제는 대표 GO(비가역). |

### 2026-06-08 (58) 명화 큐레이션 마무리 — 정합 통일·상세 curated 한정·크롭 언샤프 (FROM Code, main 6bf8ddf, 비가역 0). ★item1 실행 BLOCKED(소스 부재)

| 항목 | 상태 |
|---|---|
| 권위 | Desktop TASK_BRIDGE 4항목. Track1 라이브 통과 확인(명화 inspect→SUSPENSION 캐시→publish=none+drift·queue=resolve_suspension·main=default). |
| (4) 정합 통일 ✅ | nextAction을 SoT 단일 사다리로 통일 — curated 게이트(default 대표/상세→apply_curated_main/build_detail)·SUSPENSION drift(resolve_suspension)를 computeNextAction에 흡수. computeActionQueueItem=key→category 매퍼로 축소. verify_publish 잔존 제거. production 실측: 3상품 nextAction.key==queue.stage 전부 일치. tsx 7케이스. |
| (3) 상세 curated 실콘텐츠 한정 ✅ | classifyDetail = product-assets AND quality_reasons.detailCurated. apply-detail가 mostly_blank(occupancy<0.15) 검사 후 비-blank일 때만 detailCurated 스탬프. 빈 스켈레톤=default. production 실측: 명화·달항아리 detail=default(스켈레톤, 전 curated 오표기 해소). |
| (1) 크롭 언샤프 ✅ + 실행 ❌BLOCKED | simple-crop extractSquare 업스케일(<1000) 시 언샤프(sigma 1.0) 추가·배포 완료. ★실행 불가: 핸드오프 좌표(1000x18291)의 공급사 상세 원본이 DB/crawl_logs에 부재 — product.images·crawl_logs.images 모두 domeggook _stt_330(실측 330x330 썸네일)만 보유. _stt_960/_org/base 전부 404. 330² 썸네일에 좌표 적용 시 region 1x1 garbage(dry-run 확인). #46 날조 금지 → 미실행. |
| (2) 상세 7섹션 실콘텐츠 ⏸SCOPED | generate-detail은 skeleton+27 section-renderers 시스템(layout-skeletons+section-renderers). 실콘텐츠 7섹션(디자인토큰+공급사이미지+정보고시/속성 주입+아트갤러리 무드)은 renderer 실콘텐츠 authoring=대형 기능. 본 turn 미착수, 전용 turn 권고. apply 파이프라인(Track2)+mostly_blank 게이트는 준비됨. |
| 검증 | tsc 0·build OK·이모지 0·한글 코드 0·비가역 0(네이버 0; DB 가역만). |
| ★ 다음 | (a) item1: Desktop이 **1000x18291 공급사 상세 원본 URL 제공** 또는 직접 크롭 실행 또는 696² crop 본 전달 → 그러면 thumb-crop endpoint(언샤프 적용)로 1클릭 mainImage=curated. (b) item2: detail 7섹션 실콘텐츠 엔진 전용 turn. (c) 통과 시 명화 main=curated→상세 실콘텐츠 적용→대표 컨펌→update PUT(비가역). |

### 2026-06-08 (57) applyStatus 정확성 교정 + 전상품 상세페이지 적용 게이트 (FROM Code, main 74765e7, 비가역 0·네이버 0)

| 항목 | 상태 |
|---|---|
| 권위 | Desktop TASK_BRIDGE 2건 + always-state-status 결정문 + DETAIL_PAGE_PLAYBOOK.md. 근거: 라이브 매트릭스에서 명화 applyStatus 전부 LIVE 오표기. |
| 트랙1 정확성 (1e5f3a1) | (a) publishState=캐시된 네이버 statusType 기반(앱 status 아님): SALE만 LIVE / registered 非SALE(SUSPENSION)=publishDrift+미발행 / registered 미동기=DB. naver_status_type 컬럼 추가(apply_migration add_naver_status_type)+inspect 라우트가 실측 캐시(로컬 DB write·Naver mutate 0). (b) main/detail 3상태 ImageApplyState curated(앱 product-assets 버킷)/default(공급사 원본)/none — mainImage(빌더 필드) 기준. (c) actionQueue: GO 이전 default 대표/상세→apply_curated_main/build_detail 선행, SUSPENSION→resolve_suspension. 위젯 curated 초록·default/drift 앰버·none 점선(레드 0). tsx 7케이스. ★production 실측: 명화 main=default·detail=curated(skeleton·caveat)·publish=DB(미동기)·queue=apply_curated_main(전 LIVE 오표기 해소). |
| 트랙2 상세 빌더 (74765e7) | 기존 detail 빌더(section-builder+detail-html-serializer+generate-detail+DetailPageCard 미리보기) 위 적용 단계 추가: NEW POST /api/products/[id]/apply-detail(미리보기 PNG→product-assets curated 업로드→detail_image_url set, 가역 DB·네이버 0). DetailPageCard "이 상세로 적용" 2단계 컨펌 게이트(productId/onApplied optional·PLANT 무파손). 적용 시 detail_image_url=product-assets→applyStatus.detail=curated 자동 전이. |
| 검증 | tsc 0·build OK(apply-detail ƒ)·이모지 0·한글 코드 0·비가역 0(네이버 0; DB 가역+additive 컬럼만). |
| ★ caveat(#46) | 명화 detail-S6 skeleton이 product-assets라 provenance상 'curated'로 읽힘 — 빈 스켈레톤 품질은 publish-preview mostly_blank 게이트가 별도 포착, Track2 적용이 실 curated 상세로 교체. 정확 skeleton 판별은 후속. naver_status_type는 inspect 실행 전까지 null→publish=DB(미확인). |
| ★ 다음 | Desktop: (1) inspect 명화 실행→naver_status_type=SUSPENSION 캐시→매트릭스 publish=주의(drift) 재실측 (2) 명화 상세 generate→미리보기→"이 상세로 적용"→detail curated 전이 라이브 실측 + 대표 컨펌. 후속: detail 엔진 7섹션 플레이북 정합 강화·skeleton 판별. |

### 2026-06-08 (56) 개입 대기열(Operator Action Queue) 전상품 시스템 레이어 + #56 (FROM Code, main 415358b, 비가역 0)

| 항목 | 상태 |
|---|---|
| 권위 | docs/design/OPERATOR_SYSTEM_BLUEPRINT.md §3·§4 + always-state-status 결정문. 전상품 범용(#55)·적용현황 상시(#54)와 통합. main 직접. |
| 1) 엔진 파생 | control-tower-engine computeActionQueueItem: nextAction+image 게이트 → 4분류(AUTH=awaiting_human / AUTO=in_progress·done / GO_PENDING=publish·verify_publish / INPUT_DECISION=그 외). ActionQueueItem={productId,productName,category,stage,deepLink,detail}. 신규 컬럼 0·가드 불요. ControlTowerRow.actionQueue + matrix row 노출. tsx 8케이스 실증. |
| 2) 관제탑 위젯 | OperatorActionQueue를 관제탑 상단 마운트(테이블 위). 전상품 카드(카테고리 칩+상품명+행동 1줄+1클릭 deepLink), 순서 GO>AUTH>입력결정>자동(순서 강제 아님·우선 정렬만). 적용현황(결과축)과 좌우 한 쌍(행동축). 레드=GO_PENDING 1곳만(75/15/10). |
| 3) 원칙 #56 | PRINCIPLES_LEARNED #56(개입 자연스러움) 등재 — 개입점 항상 surface·순서 강제 0·자동/반자동 경계·레드 스코프. |
| 4) P3 폴리시 | FireflyPromptBuilder "프롬프트 복사" CTA primary(레드)→secondary(뉴트럴). 레드=메인지정 1차 액션+GO만. 라이브 잔존 레드 2곳 중 보조 1곳 정리. |
| 검증 | tsc 0·build OK·렌더 이모지 0·한글 코드 0·비가역 0. production smoke: matrix actionQueue 전상품 4분류 노출. |
| ★ 다음 | Desktop Control Chrome 라이브 실측: (1) 개입 대기열 4분류 카드·카테고리 칩 색(GO 레드 1곳) (2) deepLink 1클릭 정확 화면 (3) 레드 스코프=GO+메인지정만(복사 뉴트럴 확인). 2차(딥링크 정합 세부)·3차(Firefly/네이버 Chrome MCP 반자동 #52)는 후속 로드맵. |

### 2026-06-08 (55) 아틀리에 워크벤치 UI 재설계 1단계 + 적용현황 인디케이터 + #54/#55 (FROM Code, main 직접, 비가역 0)

| 항목 | 상태 |
|---|---|
| 권위 | docs/design/STUDIO_ATELIER_UX_REDESIGN.md + KKOTIUM_DESIGN_SYSTEM.md + docs/decisions/2026-06-08-always-state-status-and-universal.md. 브랜치 main 직접(SD-04 복귀). |
| 트랙A 스튜디오 (d91ad9b) | P1: AiQueueStepper 4열 그리드(54px 짓눌림·제목잘림·.gp-sticker 배지겹침) → 세로 스텝 리스트(Lucide CheckCircle/Loader/Circle·상태칩 별도 컬럼·좌측 4px 액센트·overflow 해소). P3: 워크벤치 레드 제거(스텝·번호원·헤더·레드틴트 그림자 → 핑크/뉴트럴), 레드=메인지정 CTA(변형 select)만. P5: FireflyPromptBuilder 라벨/값 분리·프롬프트 14px 모노. P6/P2: ThumbnailCard 1차(4변형 pick-main) 상단 강조 + 2차(디자이너 소스) Disclosure 기본접힘 + 중첩박스 제거(단일 섹션+divider)+핑크 STEP 2 배지. ★P4(공유 Card 스텝배지)·2단계(전 /studio)는 후속. |
| 트랙B 인디케이터 (6516c4b) | control-tower-engine ApplyStatus 4필드(attributesApplied/mainImageApplied/detailApplied/publishState) tri-state(LIVE 등록=라이브/DB 가역반영/none 미적용)=기존 신호 파생(신규컬럼 0·전상품). matrix row applyStatus. 관제탑 ApplyStatusIndicator(LIVE 초록/DB 뉴트럴/미적용 점선·레드 0·텍스트잘림 0). PRINCIPLES_LEARNED #54(적용현황 항상 명시)·#55(전상품 범용) 등재. ★스튜디오 헤더 미러는 후속. |
| 검증 | tsc 0·build OK(/studio 125kB)·렌더 이모지 0(Lucide)·한글 코드 0(문구 JSON)·비가역 0. 워크벤치 레드 잔존(AiQueueStepper·FireflyPromptBuilder)=0. |
| ★ 다음 | push+verify-vercel-deploy → Desktop Control Chrome 실측: (1) studio 카드 scrollWidth<=clientWidth(overflow=false)·큐 제목잘림 0·배지겹침 0 (2) 레드 사용처=메인지정 CTA 1곳 (3) 1차 강조·2차 접힘 (4) 관제탑 applyStatus 인디케이터 라이브(LIVE/DB/미적용·레드 0). 후속: P4 Card 배지·2단계 전 /studio·스튜디오 헤더 적용현황. |

### 2026-06-07 (54) 크롭 스튜디오 main 병합 + production 배포 (FROM Code, main FF merge, 비가역 0)

| 항목 | 상태 |
|---|---|
| 권위 | 대표 승인: feature/crop-studio 크롭 스튜디오 완성본(T1~T6) → main 병합 GO → production 배포. |
| 병합 | feature/crop-studio → main **fast-forward** 병합(main 1d00be8 이후 무분기) + origin/main push. 본 트랙 12 commit(T1~T6 + 권위문서 + 표준 §1 outpaint 보강 + 본 ledger)이 production에 반영. |
| 표준 §1 보강 | outpaint 적용 범위 명문화: outpaint=고해상 소스 비율 전환용. 저해상 prominence는 타이트 크롭 + 통제된 업스케일(<=1.8x) 1순위, outpaint 후순위(저해상 확장 시 제품 축소·이음새 리스크). |
| 검증 | 병합 전 tsc 0/build OK 누적 확인. push 후 verify-vercel-deploy.sh --wait → production HEAD == main 병합 SHA(이제 main 배포라 production-SHA 검사 정상). |
| ★ 다음 | Desktop production 3중 검증: (1) /products/[id]/preview 라이브 크롭 스튜디오(bbox 오버레이·완전포함 자동후보·수동 침범 스냅·confirm 차단·라인 게이트) (2) 관제탑 라인 배지/override (3) thumb-crop contain dry-run 명화 subjectBBox/contained. 통과 시 명화 라인A 대표 크롭 확정 → 발행 GO(비가역, 대표 명시 승인). |

### 2026-06-07 (53) T6 크롭 주제 완전포함 가드 (FROM Code, feature/crop-studio 11f6287, 비가역 0·네이버 미접촉)

| 항목 | 상태 |
|---|---|
| 권위 | docs/decisions/2026-06-07-crop-full-subject-containment.md(Desktop 기록) + 표준 §1. 트리거: 명화 대표 B 유리병 하단 잘림 운영자 지적. 본 T6로 feature/crop-studio = 크롭 스튜디오 완성본 → main 병합 GO 대기. |
| bbox 검출 | quality-classifier.detectSubjectBBox: 기존 subject occupancy의 bg-ring+SUBJECT_DELTA 재사용해 제품 bbox(source px) 산출. 256px 분석·행/열 projection noise floor(3%)로 stray 제거. subject 미검출 시 null. |
| 컨테인먼트 기하 | NEW src/lib/images/subject-containment.ts(순수·sharp 0): containmentSquare(bbox+>=8% 패딩 완전포함 최소 정사각·중앙·클램프·소스 부족 시 contained=false+expandPx) / boxClipsSubject(침범 변 산출) / snapBoxToSubject. tsx 9케이스 실증. |
| simple-crop | contain(자동=완전포함 정사각)·enforceSubject(수동 박스 침범 차단)·allowSubjectClip(연출소품 예외) 옵션 추가. SUBJECT_CLIPPED 경고: 자동 소스부족=warn+canvas_expand / 수동 침범=block(allowClip 시 warn). result에 subjectBBox/contained. thumb-crop route가 옵션 전달+노출. |
| 크롭 스튜디오 UI | onLoad 시 완전포함 자동후보+제품 bbox 로드(contain·ocr off). bbox 점선 오버레이(주황). 수동 박스 침범 시 빨강 박스+경고+"주제 완전포함으로 맞춤" 1클릭 스냅(snapBoxToSubject)+연출소품 예외 체크. preview/apply에 enforceSubject(수동 박스만)·allowSubjectClip 전달. |
| 표준 명문화 | 표준 §1 "부분 잘림 반려"에 정량 규칙(>=8% 패딩·바닥/상단 잘림 0·제품 정의·연출소품 예외·확장 우선순위 canvas_expand>업스케일<=2x>색패드) 추가. |
| 검증 | tsc 0·build OK(Compiled successfully·/preview 8.85kB·sharp 클라이언트 누출 0)·이모지 0(Lucide)·한글 코드 0·비가역 0. tsx geometry 9케이스 PASS. |
| ★ 다음 | push → Desktop: (1) /preview 크롭 스튜디오 Chrome 실측 — 명화 상세에서 제품 bbox 오버레이·완전포함 자동후보(바닥 여유)·수동 박스 침범 시 빨강+스냅 1클릭·침범 confirm 차단·연출소품 예외 (2) thumb-crop contain dry-run 명화 — subjectBBox/contained/region 단정 (3) **feature/crop-studio → main 병합 GO**(production 배포). |

### 2026-06-07 (52) 크롭 스튜디오 T1~T5 시공 (FROM Code, feature/crop-studio df9b6ac, 비가역 0·네이버 미접촉)

| 항목 | 상태 |
|---|---|
| 권위 | docs/design/THUMBNAIL_CROP_EDIT_STANDARD.md + HANDOFF_session_2026-06-07_5_crop_edit_workflow_apply.md + MASTER §6·§9. 대표 승인: 브랜치 feature/crop-studio·T3→T2→T1→T4→T5 순. T3는 (51)에서 완료·Desktop 25값 검증 통과(무회귀). |
| T2 게이트 완화 | simple-crop CropWarning에 severity(block/warn)+remediation 추가(SoT). SOURCE_TOO_SMALL·LOW_RESOLUTION=warn(canvas_expand 안내·적용 허용), TEXT_DETECTED=block(Naver 2024-10-28·override 불가). thumb-crop confirm 가드를 severity===block 필터로 교체 → 라인A <1000px 적용 허용·cautions 노출. 커밋 90c4f4c. |
| T1a 시드 엔드포인트 | NEW POST /api/products/[id]/asset-edit-job — 박스 좌표·params를 input_refs(jsonb) 저장, 도구=job-type-routing(region_crop→sharp ready / text_remove·canvas_expand·bg_clean→firefly|adobe_express awaiting_human). 동일타입 active job 멱등. 커밋 cf175ac. |
| T1b 크롭 스튜디오 | NEW CropStudioPanel(/preview 대표섹션 직후 마운트): 소스선택(상세/대표)+영역 드래그(자연px 매핑·1:1 정사각 가이드)+자동 후보 갤러리(thumb-crop dry-run attention/entropy)+지정영역 미리보기+대표로 적용(confirm 가역)+편집3종(글씨제거/1:1확장/배경정리→asset-edit-job). i18n cropStudio. 커밋 2ee5c3e. |
| T4a 라인 엔진 | control-tower-engine: ProductLine A/B + deriveLine(NEW/score<40/no-detail→B else A) + resolveLine(★운영자 override 우선·자동판정 미덮어씀). nextAction 라인별 crop_pick(/preview)·build_image(/swap). matrix가 quality_reasons.line/lineSource 로드→engine. publish-preview 라인 인지 게이트(text_overlay/representative_missing/detail_missing 항상 차단·라인A는 해상도/배경/단품/상세품질 caution화·라인B 엄격). tsx 9케이스(명화 ENHANCE/62→A·override 양방향). 커밋 3b6e3fc. |
| T4b 라인 override UI | NEW POST /api/products/[id]/line(quality_reasons.line+lineSource=operator·recommended_mode 미접촉·503 가드). 관제탑 LineCell 배지(A크롭/B빌드)+1클릭 토글+source 표기. track.line 라벨 "회선"→"라인" 교정. 커밋 de89715. |
| T5 전상품 | 등록상품 verify_publish→/preview 라우팅(라인게이트+크롭스튜디오+update PUT 동일 화면 수렴). 파이프라인 product-agnostic(matrix product-driven·라인 분류기 per-product). tsx 7케이스 ladder 일관. 커밋 df9b6ac. |
| 검증 | 매 commit tsc 0·이모지 0(Lucide)·한글 코드 0(주석 영어·문구 JSON). 최종 build OK(Compiled successfully). 비가역 0(네이버 0; DB는 additive CHECK·INSERT·가역 UPDATE만; 크롭 apply=가역 mainImage set). tsx 16케이스 실증(라인 분류+override+ladder). |
| ★ 다음 | push(feature/crop-studio) → Desktop 검증: (1) /preview 크롭 스튜디오 Chrome 실측(드래그 박스·자동 후보·대표 적용·편집3종 asset_jobs 시드 input_refs 좌표) (2) 관제탑 라인 배지/토글 + 명화 라인A override 후 nextAction crop_pick 확인 (3) publish-preview 라인A 명화 canPublish 게이트(텍스트만 차단·해상도 caution) (4) feature 브랜치 → main 병합/PR 결정(production 배포는 main 머지 후). |

### 2026-06-07 (51) T3 크롭/편집 job_type 4종 + 도구 라우팅 (FROM Code, feature/crop-studio bc65a7a, migration LIVE·비가역 0·네이버 미접촉)

| 항목 | 상태 |
|---|---|
| 권위 | docs/design/THUMBNAIL_CROP_EDIT_STANDARD.md §3/§5 + HANDOFF_session_2026-06-07_5_crop_edit_workflow_apply.md (T3). 대표 승인: 브랜치=feature/crop-studio 신규(SD-04 일시 예외)·진행=T3 먼저(스키마)→Desktop information_schema 검증→T1/T2/T4/T5. |
| ★ 브랜치 모드 | 본 트랙은 **feature/crop-studio**에서 진행(SD-04 main-direct 일시 예외). Vercel production은 main에서만 배포 → 본 브랜치는 **preview 빌드**(production SHA 불일치=정상, webhook 끊김 아님). T3 검증 신호=**live Supabase 제약**(이미 25값)·Desktop information_schema. |
| T3 마이그레이션 | apply_migration phase4_crop_edit_job_types 적용 완료. asset_jobs job_type CHECK **21→25** 확장: region_crop·text_remove·canvas_expand·bg_clean(additive, 기존 21종 verbatim 보존). 적용 전 live 제약 baseline(드리프트 0=phase3와 동일 확인) → 적용 후 pg_get_constraintdef로 25값 재검증. 박제 docs/handoff/MIGRATION_phase4_crop_edit_2026-06-07.sql. 커밋 bc65a7a. |
| T3 도구 라우팅 | NEW src/lib/jobs/job-type-routing.ts(순수): JOB_TYPE_ROUTES 맵 — region_crop→sharp(in-app, requiresOperator=false) / text_remove·canvas_expand·bg_clean→firefly primary + adobe_express fallback(requiresOperator=true=창작 MCP 개입점). lane=process·ipSafe=true. routeForJobType()·isCropEditJobType() 헬퍼 + job_type 토큰 상수 export(매직스트링 0). prisma schema 주석 Phase 4 갱신. 아직 런타임 라우트 미배선(T1에서 소비). |
| 검증 | tsc 0·build OK(exit 0 'Compiled successfully')·이모지 0·한글 코드 0(주석 영어·리터럴 0)·비가역 0(네이버 0; DB는 additive CHECK만, 기존 행/쿼리 무영향). |
| ★ 다음 | push(feature/crop-studio) → Desktop 2중 단정: (1) information_schema/pg_constraint로 asset_jobs_job_type_check **25값** 단정(region_crop·text_remove·canvas_expand·bg_clean 존재·기존 21종 보존) (2) 기존 asset_jobs 행 CHECK 위반 0(additive 무회귀). 통과 시 Code가 T2(게이트 완화)→T1(크롭 스튜디오)→T4(라인 라우팅)→T5(전상품) 연속 시공. |

### 2026-06-07 (50) 발행 전 검수 화면 + update 로더 SoT 추출 (FROM Code, production push 대기, 비가역 0·렌더 read-only)

| 항목 | 상태 |
|---|---|
| 권위 | docs/handoff/HANDOFF_session_2026-06-07_4_image_engine_verify_source_bug.md. Desktop 검수: 명화 대표(4종합성 캡션텍스트=텍스트정책 위반 소지+하단쏠림)·상세(detail-S6 스켈레톤=미완성) → 발행 전 검수 화면 필요. |
| 로더 SoT | NEW load-update-context.ts: loadNaverUpdateContext가 payload 조립(product+options·shipping·bundle·addresses·validation·deliveryInfo·noticeAssets·storeName). update route 로딩 1~7 → 로더 호출 교체(가드·dryRun/PUT 분기 불변, 동작 보존). 프리뷰=실 PUT 페이로드 drift 0 보장. 커밋 d68c027. |
| 검수 엔드포인트 | NEW GET /api/products/[id]/publish-preview(읽기전용·Node·maxDuration 60): 대표(빌더 mainImage) assessImageQuality+ocrFullFrame → 경고(text_overlay/low_resolution/background_not_uniform/subject_not_single) + 상세 완성도(mostly_blank<15%·low_quality<40·detail_missing) + 공유 빌더 페이로드 요약(name·태그·속성·정보고시 etc.qualityAssuranceStandard HB·origin·statusType) + canPublish=준비도 S/A AND canRegister AND imageWarnings 0. 커밋 437b40b. |
| 검수 화면 | NEW /products/[id]/preview: 대표/상세 렌더 + 체크칩(1000px/단색/텍스트0/단품) + 경고 + 페이로드 요약 + 게이트 사유 3칩. "이 상태로 발행"은 canPublish AND 등록상품일 때만 활성 → 2단계 명시 확인 → update confirm:true(비가역). publish-preview-strings.ko.json i18n. 커밋 437b40b. |
| 검증 | tsc 0·build OK(publish-preview ƒ·preview 페이지 4.5kB)·이모지 0·한글 코드 0(신규 파일; update route 기존 에러문구·★ 마커 verbatim 보존, 추가 라인 0)·비가역 0(렌더 read-only, 발행은 기존 PUT 경로 명시 확인 후). |
| ★ 다음 | push → Desktop 3중 단정: (1) update dryRun 회귀 0 재확인(로더 추출 후 명화 payloadPreview == (49) 베이스라인: name·HB·origin·statusType) (2) /products/[id]/preview 명화 — 대표 text_overlay 경고·상세 mostly_blank 경고 → canPublish=false(발행 버튼 비활성) 실측 (3) 양질 상품(달항아리?)에서 canPublish=true 시 게이트 통과 확인. 명화 대표/상세 보완(풀해상 단품·상세 빌드) 후 재검수 → 대표 GO → PUT. |

### 2026-06-07 (49) assess 대표 소스 교정 + dryRun 정보고시 노출 (FROM Code, production push 대기, 비가역 0·네이버 미접촉)

| 항목 | 상태 |
|---|---|
| 권위 | docs/handoff/HANDOFF_session_2026-06-07_4_image_engine_verify_source_bug.md. 작업3·4·5 검증 통과(작업4 가드 860px blocked 실증·작업5 detail-strategy 200) + 소스 버그 1건. |
| 수정1 assess 소스 | assess-quality sources.representative를 main_image_url(레거시 thumb-clean) → mainImage(빌더 representativeImage·Cloudinary)로 교정. 평가 대상이 실 발행 대표와 일치 → tier 신뢰 회복. detail은 이미 detail_image_url 정합. body.imageUrl override 우선 유지. 커밋 3d3a3a6. |
| 수정2 dryRun 정보고시 | update dryRun payloadPreview에 productInfoProvidedNotice 포함 → etc.qualityAssuranceStandard HB 신고번호(HB21-12-2572·HB19-12-1462) surfacing. confirm 경로 미변경. 커밋 37cefde. |
| 검증 | tsc 0·build OK·이모지 0(★ 마커=기존 형제 라우트 선례·미접촉)·한글 코드 0(추가 라인 기준; 기존 에러문구 미접촉)·비가역 0(dryRun·DB 가역만). |
| ★ 다음 | push → Desktop 3중 단정: (1) 명화 assess-quality 재실행 → sources.representative.url == mainImage(main-hwabo-4set) 확인·tier 재산출 (2) update dryRun → payloadPreview.productInfoProvidedNotice.etc.qualityAssuranceStandard에 HB 표시 단정 (3) HB 정확 시 대표 GO → update confirm:true PUT(비가역) → 3중 검증. |

### 2026-06-07 (48) 이미지 전략 엔진 작업3·4·5 — T0 티어 + crop→대표 + 상세전략 (FROM Code, production push 대기, 비가역 0·네이버 미접촉)

| 항목 | 상태 |
|---|---|
| 권위 | docs/handoff/IMAGE_SEO_STRATEGY_ENGINE_2026-06-07.md §E 3·4·5 + HANDOFF_session_2026-06-07_3_matrix_verify_cleanup.md(작업1+2 검증 통과·명화 stale job 6 cancelled→ok). |
| 작업3 T0 티어 | quality-classifier deriveImageTier(rep,detail): T0 그대로(USE_AS_IS, >=1000·단색·텍스트0·단품 isUseAsIs)·T1 상세크롭(isDetailCroppable)·T2 보강·T3 신규. 소스별(대표 vs 상세) 분기. assess-quality가 대표(main)+상세(detail) 각각 평가→quality_reasons.imageTier/imageStrategy/sources 영속. engine ComputeContext.imageTier→image.tier(null 해소). matrix가 quality_reasons.imageTier read(가드). 위젯 TierBadge 노출. 커밋 4063dc0. |
| 작업4 crop→대표 | thumb-crop confirm:true → 크롭 버퍼 product-assets 업로드 → mainImage+main_image_url set(빌더 필드). 품질가드(SOURCE_TOO_SMALL/LOW_RESOLUTION/TEXT_DETECTED) 차단(applied:false·blockReasons) — 437px upscale-blur·텍스트 대표 진입 방지. dryRun 기본 preview 유지. 커밋 25e126f. |
| 작업5 상세전략 | NEW /api/products/[id]/detail-strategy(읽기전용): 상세 품질 score>=50→AS_IS else BUILD + 미충족 네이버 기준 갭(재질·색상/SEO 필드/정보고시/errors) 산출. 갭 키=nextAction 동일 키(fill_attributes/fill_seo/fill_notice/resolve_validation/build_detail) 통일→관제탑 연동. publish-readiness+validateForRegistration 재사용. 커밋 a1d8c90. |
| 검증 | tsc 0·build OK(detail-strategy·thumb-crop·assess-quality·asset-jobs-matrix ƒ)·이모지 0·한글 코드 0(주석 영어·데이터 리터럴만)·비가역 0(네이버 0; thumb-crop confirm=DB 가역 set+Storage, detail-strategy read-only). tsx 실증 tier 4케이스(rep good→T0/weak+detail→T1/subject→T2/빈약→T3). |
| ★ 다음 | push → Desktop 3중 단정: (1) assess-quality 명화/달항아리/아이스트레이 실행 → imageTier 산출·matrix TierBadge 노출(명화=T0 4종합성 그대로 기대) (2) thumb-crop confirm 실측 — 437px 상세 화보=blocked(applied:false)·>=1000 소스=mainImage set 후 matrix image done (3) detail-strategy 갭 목록 ↔ nextAction 정합. 통과 시 명화 정보고시 HB dryRun preview 노출(별건) → 대표 GO. |

### 2026-06-07 (47) 이미지·SEO 전략 엔진 통합 — 관제탑 SoT + nextAction (작업1+2) (FROM Code, production push 대기, 비가역 0·네이버 미접촉)

| 항목 | 상태 |
|---|---|
| 권위 | docs/handoff/IMAGE_SEO_STRATEGY_ENGINE_2026-06-07.md §E 작업1·2. 대표 승인 범위=기반 1+2 먼저(3·4·5는 Desktop 단정 후). |
| 핵심 갭 | 관제탑 matrix가 asset_jobs 단독 → 등록/준비된 상품(명화 A/84, 잡 없음)이 risk/blocked/nextAction null. |
| 작업1 SoT 엔진 | NEW src/lib/automation/control-tower-engine.ts(순수): computeControlTowerRow가 publish track=validateForRegistration 준비도(canRegister/readinessGrade·score/attributeGrade/missingRequired)=네이버 register/update dryRun과 동일 SoT, image track=asset_jobs overlay+자산 presence(누락 시 degrade). matrix route를 asset_jobs 단독→**상품 기반**(DRAFT+등록, take 100, product_options include)으로 재작성, asset_jobs는 overlay(P2021/P2022 가드, 위젯 미blank). mode 배지 기존 가드 유지. |
| 작업2 nextAction | 결정적 사다리: !mainImage→add_main_image(blocker) / !canRegister→resolve_validation(blocker) / missingRequired(재질·색상)→fill_attributes(action·detail) / image 미완→prepare_image / 준비완→publish / 등록+cert null→verify_certification / 등록+cert→verify_publish. 각 1클릭 href(/products/[id]·/edit·/swap). |
| UI | ControlTowerMatrixWidget: 상품셀에 준비도 배지(grade/score 색상)+nextAction 링크칩(severity 색·detail). strings JSON에 nextAction 7키·publishDetail 추가(이모지 0·리터럴 0). |
| 검증 | tsc 0·build OK(asset-jobs-matrix ƒ)·이모지 0·한글 코드 0(주석 영어·데이터 리터럴만)·비가역 0(GET read-only, 엔진 순수). tsx 실증 6케이스: A 등록(no cert)→done/ok/verify_certification·grade B/62 / B +cert→verify_publish / C draft missing→pending/caution/fill_attributes detail '재질, 색상' / D no main→blocked/add_main_image / E ready→publish / F no addr→blocked/resolve_validation. |
| ★ 다음 | push → Desktop 3중 단정: (1) GET /api/products/asset-jobs-matrix — 명화 row 노출·publish done·nextAction verify_certification(또는 cert 설정 시 verify_publish)·readiness grade/score 표기 (2) Chrome 관제탑 — 준비도 배지+nextAction 1클릭 링크 (3) draft 상품 missingRequired→fill_attributes 칩 확인. 통과 시 작업3(T0 분류기)·4(crop→대표 set)·5(상세 as-is) 다음 turn. |

### 2026-06-07 (46) P3 4중컬럼 동기 + 재질/색상 필수속성 enum (FROM Code, production push 대기, 비가역 0·네이버 미접촉)

| 항목 | 상태 |
|---|---|
| 권위 | docs/handoff/MYEONGHWA_PUBLISH_READINESS_2026-06-07.md §1·39·40. |
| 항목1 재질/색상 enum | category-attribute-enums.{ts,ko.json}: 재질(유리/플라스틱/세라믹/우드/…/기타)·색상(투명/화이트/…/기타) 큐레이트 enum + normalizeAttributeValue(exact→synonym→substring→기타, 자유입력 0). POST /api/products/[id]/attributes(dry-run 기본·완성도 before/after·confirm 시 naver_material/color 기록·가역). getD1CategoryName export. 실증: 50003356=가구/인테리어, BEFORE missingRequired[재질·색상]C/31(핸드오프 dryRun 일치)→유리/투명 AFTER[]A/78. |
| ★ 정직(#46) | 빌더는 구조화 카테고리 속성을 Naver에 미전송 → missingRequired는 내부 완성도 게이트(naver_material/color null). 본 작업은 그 게이트 해소(enum 기록). 구조화 attributeId/valueId 실제 제출은 라이브 Naver 속성 스키마 조회(Desktop API)=별건. |
| 항목2 P3 SoT | seo-text confirm 시 seoTitle←naver_title·keywords←tags·brand_line←resolved line 동기(단일 SoT). 발행 빌더 name=naver_title/sellerTags=tags 현행 유지(미접촉), 내부 비동기만 제거. |
| 항목3 naver_certification | 대표가 에이프릴/레몬 HB 2종 확정 시 4향 신고번호 → formatSafetyDeclaration ETC surfacing(기구현, 대기). |
| 검증 | tsc 0·build OK(attributes ƒ 등록)·이모지 0·한글 코드 0(FALLBACK='기타' 데이터 리터럴만)·비가역 0(DB 가역 UPDATE만). enum/완성도 tsx 실증. |
| ★ 다음 | push → Desktop: (1) attributes dry-run(material:유리병·color:투명) → normalized 유리/투명·after missingRequired 0 재단정 (2) confirm:true 반영 → update dryRun missingRequired 0 확인 (3) seo-text confirm 시 4중컬럼 동기 확인 (4) 안전번호 2종 확정 → SUSPENSION 해제 대표 GO(비가역). |

### 2026-06-07 (45) 작업7 seo-text 재수정 (2회째 결함·#45 정직) (FROM Code, production push 대기, 비가역 0)

| 항목 | 상태 |
|---|---|
| ★ over-claim 원인 | 직전 smoke가 top-level `tags`(10)를 읽어 통과 보고했으나 Desktop은 `draft.tags`(null) 확인 — SeoTextDraft에 tags 필드 자체가 없었음(tagCandidates만). #45 적용 전 dry-run 실측 교훈 재확인. |
| 결함1 draft.tags | SeoTextDraft.tags 필드 추가 + 라우트가 verifyTags 선별(verified>weak>missing, error 제외) 결과를 draft.tags에 연결. 제한어는 풀에서 이미 제외. |
| 결함2 상품명 스터핑 | composeName에서 situational append 제거(extraTokens 파라미터 삭제). 상품명=product 자기 토큰만(형태소 dedup). situational(신차선물·운전자선물·차량인테리어)은 tags 전용. 명화 name 32자(스터핑 0·차량용 1회). |
| 결함3 scents | body.attrs.scents(정보고시 4종, 코튼어라운드 포함) 우선 + DB option_rows.values 전체 읽기. DB 옵션 3종↔정보고시 4종 동기화는 별건(대표 결정). |
| 결함4 origin | attributes.origin=DB SoT(naver_origin)만 — body 오버라이드 제거. Desktop이 originCode 0200037→00·naver_origin 중국→국산 교정(가역) 완료 → 라우트가 국산 반영. |
| 검증 | tsc 0·build OK(seo-text ƒ)·이모지 0·한글 코드 0·비가역 0. 생성기 tsx 실증: name 32자·스터핑 false·차량용 1·draft.tags 라우트 연결·origin 국산·scents 4. |
| ★ 다음 | push → Desktop dry-run 재검증: **draft.tags 10(non-null)**·상품명 스터핑 0·중복 0·origin 국산·scents(body 4). 통과 시 confirm:true 반영(가역). 안전번호 에이프릴/레몬 2종 확정 + 향 코튼어라운드 옵션 추가 = 대표 결정 → SUSPENSION 해제 PUT(비가역). |

### 2026-06-07 (44) 작업5 간편 크롭 + 작업6 BG_SWAP 연결 (FROM Code, production push 대기, 비가역 0·네이버 미접촉)

| 항목 | 상태 |
|---|---|
| 작업5 크롭 | src/lib/images/simple-crop.ts: 상세페이지 입력→1:1 크롭(사람 box OR sharp 네이티브 strategy.attention/entropy)→1000px Sharp(srgb/jpeg q85)→OCR 정책가드. ★누끼/합성 없음(간편=상세페이지 크롭). smartcrop-sharp 미설치(sharp 네이티브로 대체·런타임 의존성 0·#38). OCR=p-filter-watermark에 ocrFullFrame 추가(공유 워커 재사용·fail-open). 경고 3종: SOURCE_TOO_SMALL(long<1000)·LOW_RESOLUTION(크롭변<1000=437 화보)·TEXT_DETECTED(2024.10.28). 라우트 POST /api/products/[id]/thumb-crop(dry-run·base64 preview·maxDuration 60). 합성 실증: 2000→1000²무경고/437→LOW_RESOLUTION/box 정확. |
| 작업6 BG_SWAP | src/lib/jobs/enqueue-mode-chain.ts enqueueModeChain(productId,mode): chainForMode 체인을 asset_jobs로 시드(멱등=기존 skip·quality_assess=done·첫 작업 ready·나머지 blocked+predecessor reason). NEW=기존 B안 swap 6단계(product_cutout..naver_normalize, mode-chains를 swap-pipeline STAGE_ORDER와 정합—express_finalize 추가)→**기존 /products/[id]/swap UI가 그대로 구동**(재사용, 미재구현). 라우트 POST /api/products/[id]/enqueue-pipeline(body.mode OR recommended_mode·P2021/P2022 가드). |
| 검증 | tsc 0·build OK(thumb-crop·enqueue-pipeline ƒ 등록)·실 emoji 0(★→NOTE 교체)·한글 코드 0(주석 영어; 가-힣 정규식 범위는 OCR Hangul 검출 기능코드)·비가역 0(네이버 0; thumb-crop=read-only, enqueue=DB 가역 INSERT). |
| ★ 다음 | push → Desktop: (1) thumb-crop 명화 detail(437x8000 화보) 실측 — LOW_RESOLUTION 경고·OCR·1000² preview (2) enqueue-pipeline 실상품 시드 검증(asset_jobs 행 생성·관제탑 반영·NEW면 /swap UI 구동). ★enqueue는 DB INSERT라 Desktop이 대상 상품 선택. MD분할(#31) 별도 commit 진행. 제조국 확정→SUSPENSION 해제는 대표 결정. |

### 2026-06-07 (43) 작업7 SEO 생성기 재수정 — 실제 태그 확장 엔진 (FROM Code, production push 대기, 비가역 0·DB 가역만)

| 항목 | 상태 |
|---|---|
| 근본원인 | 직전 생성기(turn 42)가 caller 입력 재배열만 → 빈 body 호출 시 tags[]·attributes{}·형태소 중복(Desktop 교차검증 '공허'). 라우트가 product 키워드 필드를 안 읽음 + 실제 확장 로직 부재. |
| 라우트 DB-소싱 | /seo-text가 product.keywords/targetKeywords/naver_keywords/tags/product_options(option_rows=scents)/naver_material/color/origin/naverCategoryCode 실제 read → roots/attrs 구성. body 오버라이드 우선. |
| 확장 엔진 | expandTagCandidates: roots(제한어·stopword 제거)→scents→modifier×nounRoot 복합어(product 존재 modifier 우선)→brandToken×nounRoot→synonyms→situational. RESTRICTED_SELLER_TAGS exact 필터·20자·24캡. 확장사전 src/lib/seo/tag-expansion.ko.json(데이터). |
| 검증 선별 | verifyTags(풀)→STATUS_RANK verified0/weak1/missing2/error3 정렬→error 제외 상위 10(weak 대체). 태그사전 불가 시 풀 head 10 fallback. |
| 상품명 dedup | composeName 형태소 collapse: len≥4 토큰의 선행 3자 형태소 1회만(차량용방향제 유지·차량용디퓨저 제거) + substring 제거 + 50자 캡. brand_line 순서. |
| 명화 실데이터 검증 | name 50자·차량용 1회(중복0)·풀 24·제한어 0·attributes{향4·제형 액체형/보충액·용량 15/30ml·제조국·용도} 채움·findings 0. tsc 0·build OK·이모지 0·한글 코드 0(주석 영어·확장사전 JSON). |
| ★ 다음 | push → Desktop: seo-text 명화 dry-run 재검증(태그사전 verified/weak status·최종 10·attributes 비어있지 않음·상품명 중복 0). 작업5(smartcrop 간편 크롭)·6(BG_SWAP 연결)·MD분할(#31, SESSION_LOG 1528/TASK_BRIDGE 1075+/PROGRESS 1416+) 다음 turn. |

### 2026-06-07 (42) Track B 결함2 + 안전기준ETC + 작업7 SEO 텍스트 (FROM Code, production push 대기, 비가역 0·네이버 미접촉)

| 항목 | 상태 |
|---|---|
| 권위 | HANDOFF_session_2026-06-07_phase3_verify_track_a_findings.md. 승인 범위=결함2+안전기준+작업7(작업5·6은 다음 turn). |
| 결함1 마이그레이션 | MIGRATION_phase3_adaptive_mode_2026-06-07.sql 테이블명 "products"→"Product" 교정 + 규약 주석(Product=PascalCase 무@@map / asset_jobs·published_assets=snake @@map). Desktop은 이미 "Product"로 재적용 성공 — 파일/향후 규약 정합. |
| 결함2 quality_reasons | assess-quality 영속 하드닝: JSON.parse(JSON.stringify()) 평탄화 + read-back 자기검증(after.quality_reasons.metrics 길이 → persisted/storedReasonsCount 응답). 근본은 로컬 DB 부재로 미재현(#46 정직) — Desktop 재호출로 persisted=true 단정 신호. |
| 안전기준 ETC | product-builder.ts: LocalProduct.naver_certification(SoT) + formatSafetyDeclaration + buildProductInfoProvidedNoticeEtc가 qualityAssuranceStandard에 '안전기준 적합확인 신고번호 HB... (상품상세참조)' 병기. 값 있을 때만(일반 상품 회귀 0). ETC 전용필드 부재로 품질보증기준 병기(전용 생활화학 고시 타입 전환은 별도). 방향제 SUSPENSION 해제 선결 항목. |
| 작업7 SEO | src/lib/seo/seo-text-generator.ts(순수·한글 리터럴 0): brand_line 템플릿(SEED=실용 우선 / GREENHOUSE=감성·롱테일 우선)·dedupeTokens(부분문자열 collapse)·50자 캡·detectNameRules 재사용. POST /api/products/[id]/seo-text(dry-run 기본·verifyTags 태그사전·confirm:true 시 naver_title/tags DB 반영=가역). 명화 초안 실증: name 48자·중복(차량용) 제거·findings 0·태그 10·속성 요약. |
| 검증 | tsc 0·build OK(seo-text·assess-quality ƒ 등록)·실 emoji 0·한글 코드 0(주석 영어·데이터 리터럴만)·비가역 0(네이버 0, DB 가역 UPDATE만)·생성기/안전 ETC tsx 실증(가짜 라벨 0 #46). |
| ★ 다음 | push hash → Desktop: (1) assess-quality 재호출 persisted=true + DB quality_reasons.metrics 6건 단정 (2) seo-text dry-run 명화 검수(태그사전 status) (3) ★제조국 확정→originCode 교정(가역)→naver_certification HB 입력→update dryRun(statusType SALE·회귀0)→대표 승인 SUSPENSION 해제(비가역). 작업5(간편 크롭, smartcrop-sharp)·6(BG_SWAP)·MD분할(#31) 다음 turn. |

### 2026-06-07 (41) 적응형 3모드 시스템 앱 내장 (Track B) — 작업 1~4 (FROM Code, production push 대기, 비가역 0·네이버 미접촉)

| 항목 | 상태 |
|---|---|
| 권위 | docs/research/KKOTIUM_ADAPTIVE_SEO_IMAGE_SYSTEM_2026-06-06.md §1/§5 + HANDOFF_session_2026-06-06_3_simple_mode_correction(간편=상세페이지 크롭). 승인 범위=작업 1~4(비용0 최速 ROI). |
| 작업1 스키마 | Product에 brand_line(SEED|GREENHOUSE)·quality_score(Int 0-100)·recommended_mode(SIMPLE|ENHANCE|NEW)·quality_reasons(Json) 추가. 인덱스 컬럼만·Prisma 관계 0(BackdropJob 선례)·DB CHECK. prisma generate 완료. 마이그레이션 박제 docs/handoff/MIGRATION_phase3_adaptive_mode_2026-06-07.sql(Phase1/2 이후 incremental ALTER + products CHECK). |
| 작업2 분류기 | src/lib/images/quality-classifier.ts 정량 1차(sharp). 6지표: 해상도20·선명도(라플라시안분산)20·피사체비중20·배경단색도15·텍스트밴드휴리스틱15·1:1적합10 → 0~100 + recommendedMode + needsVlm(40~70). 임계값 export(운영 보정). VLM 2차 assessWithVlm=시그니처만(null 반환). 합성 3샘플 판별 실증: 깨끗한고해상=75(SIMPLE)/저해상흐림=31(NEW)/작은피사체=54(ENHANCE·needsVlm). |
| 작업3 관제탑 | matrix API에 mode 필드(recommended/score/source) 별도 쿼리 + 컬럼부재 P2021/P2022 가드(#50). ControlTowerMatrixWidget 모드 컬럼+ModeCell(배지 간편/보강/신규+점수+AI추천/직접지정 + 드롭다운 1클릭 변경). POST /api/products/[id]/mode(오버라이드, quality_reasons.modeSource=operator). POST /api/products/[id]/assess-quality(저장이미지 fetch→분류기→컬럼 기록, node runtime). 한글 strings JSON(이모지 0·리터럴 0). |
| 작업4 job_type | 마이그레이션 CHECK에 quality_assess/thumb_crop/seo_text/seo_image/bg_swap 추가(기존 16종과 공존, 소문자 컨벤션). src/lib/jobs/mode-chains.ts 모드별 체인: SIMPLE=[assess,crop,seo_text] / ENHANCE=[assess,crop,seo_image,seo_text] / NEW=[assess,B안6단계,seo_image,seo_text]. 순수 데이터+chainForMode 빌더(DB 미접촉). schema 주석 갱신. |
| 검증 | tsc 0·build OK(/api/products/[id]/assess-quality·/mode·asset-jobs-matrix ƒ 등록)·실 emoji 0(→ 화살표만)·한글 코드 0(주석 영어·문구 JSON)·비가역 0(네이버 0, DB 신규 컬럼/CHECK만)·분류기 수치 실증(가짜 라벨 0 #46). |
| ★ 다음 | push hash → Desktop: (1) Supabase apply_migration 순서 Phase1→Phase2→**Phase3**(MIGRATION_phase3_adaptive_mode) drift 0 (2) Chrome 관제탑 모드 배지·1클릭 변경 실측 (3) assess-quality 실상품 이미지로 점수/추천모드 검증(모드 추천 수용률 ≥70% 목표). 작업 5~7(간편=상세페이지 크롭 도구·BG_SWAP 재사용·SEO 텍스트 일괄)은 다음 turn. SESSION_LOG.md 1528줄>1500 → #31 분할 대기(별도 commit). `* 2.*` 중복본 정리 대표 결정 대기(#34). |

### 2026-06-06 (40) Phase 2 제품교체(B안) 루프 앱 내장 — 스키마 확장 + 상태머신 + 워크플로우 UI + Sharp 규격화 (FROM Code, production push 대기, 비가역 0·네이버 미접촉)

| 항목 | 상태 |
|---|---|
| 권위 | KKOTIUM_PRODUCT_SWAP_LOOP_DESIGN_2026-06-06.md §1/§6/§7/§8 + HANDOFF_phase2_product_swap_app. B안=실제 누끼 고정+배경만 AI. |
| 작업1 스키마 | AssetJob에 concept_combo_id + AssetReference(조인) 추가. job_type 6종(product_cutout/mood_bg_generate/product_composite/harmonize/express_finalize/naver_normalize) + status 4종(awaiting_human/human_done/review/rejected)은 DB CHECK 확장. 마이그레이션 박제 docs/handoff/MIGRATION_phase2_product_swap_2026-06-06.sql(Phase1 이후 incremental ALTER). 커밋 d059acd. |
| 작업2 상태머신 | asset-job-state.ts 전이표 확장: in_progress→awaiting_human→human_done→in_progress, in_progress→review→done|rejected, rejected→ready(사람 재시도). 낙관적잠금/전이로그 패턴 계승. d059acd. |
| 작업3 워크플로우 | /api/products/[id]/swap-pipeline(읽기 6단계+쓰기 전이, DB만·P2021 가드) + /products/[id]/swap UI(컨셉카드+단계 타임라인+awaiting_human CTA·Firefly/Express 딥링크·체크리스트+before/after 슬라이더·승인/거부). SWR 8초 폴링. 커밋 e0090b3. |
| 작업4 관제탑 | 매트릭스에 awaiting_human(attention) 추가 → 막힘 다음 핀. human_done/review→in_progress, rejected→pending. 커밋 f4ae170. |
| 작업5 Sharp | src/lib/images/naver-normalize.ts: 대표(1:1 1300px 흰배경 q80) / 상세(860px 분할). ★ 대표 흰배경 가드(assetKind + 4모서리 luma/chroma) — 라이프스타일 합성컷 대표 라우팅 차단. 커밋 870fd19. |
| 작업6 docs | 5종 MD + 작업원칙 #51(B안)/#52(브라우저 반자동)/#53(도구 적재적소) 신설. |
| 검증 | tsc 0·build OK(swap 라우트 ƒ 등록)·이모지 0·한글 리터럴 0·비가역 0(네이버 0, DB만)·대표 흰배경 가드 동작. |
| ★ 다음 | push hash → Desktop: (1) Supabase apply_migration(Phase1 먼저 + MIGRATION_phase2) drift 0 (2) Chrome swap UI 실측(타임라인·awaiting_human CTA·전후슬라이더) (3) 명화 B안 end-to-end(고해상 누끼 확보→Firefly 배경→합성→검수). 명화 SUSPENSION 대표 의도(결함 아님). |


### 2026-06-06 (39) Phase 1 누락 방지 골격 — asset_jobs 상태머신 + 관제탑 매트릭스 (FROM Code, production push 대기, 비가역 0·네이버 미접촉)

| 항목 | 상태 |
|---|---|
| 권위 | docs/research/KKOTIUM_HYBRID_PIPELINE_SYSTEM_DESIGN_2026-06-06.md §4/§7 + HANDOFF_phase1_asset_jobs_tracking_2026-06-06.md. |
| 작업1 스키마 | AssetJob/AssetJobTransition/PublishedAsset 3종(prisma/schema.prisma). BackdropJob 선례: cuid id·product_id 인덱스컬럼(Prisma 관계 0 → Product 미접촉)·String enum은 DB CHECK. version 낙관적잠금·ip_safe·heartbeat. prisma generate 완료. 커밋 a55976b. |
| 마이그레이션 | docs/handoff/MIGRATION_phase1_asset_jobs_2026-06-06.sql 박제(Prisma 패리티 DDL + CHECK). ★ Desktop이 Supabase apply_migration(name: phase1_asset_jobs_tracking) 선행 필요. prisma/migrations는 gitignore. |
| 작업2 상태머신 | src/lib/jobs/asset-job-state.ts: transitionJob(허용전이 가드+version 낙관적잠금+전이 자동로그, failed→ready retry 가드) / claimNextJob(FOR UPDATE SKIP LOCKED) / detectZombies(heartbeat 10분). 순수 DB·네이버 미접촉. |
| 작업3 관제탑 | /api/products/asset-jobs-matrix(읽기전용·집계) + ControlTowerMatrixWidget(상품x트랙: 이미지/발행/회선/운영정합, 막힘행 핀·WIP 카운터·누락감지 칩). ★ P2021 가드로 마이그레이션 전 push 안전(migrationPending degrade, #50). 한글은 strings JSON matrix 섹션(이모지 0·리터럴 0). 대시보드 마운트. 커밋 e9a6c95. |
| 작업4 docs | 5종 추적 MD + PROGRESS 세션핸드오프 섹션 표준화(§7-c 에피소드). 작업원칙 #50 등재(migrationPending 역순배포 가드). |
| 검증 | tsc 0·build OK·이모지 0·한글 리터럴 0(주석 영어/문구 JSON)·비가역 0(네이버 0, 신규 테이블만). |
| ★ 다음 | (A) push hash 보고 → Desktop Supabase apply_migration + Chrome 관제탑 실측(막힘핀·WIP·누락칩) (B) Phase 2(ip_safe 발행 게이트 + 2단계 발행) (C) 명화 SUSPENSION 의도적(결함 아님) — 시스템 오인 금지. |


### 2026-06-06 (38) GET-merge updateStock 배포 + inspect statusType 거짓초록 교정 + sync/cron 엔드포인트 오용 교정 (FROM Code, production e3ab753, 실 PUT/OOS 0)

| 항목 | 상태 |
|---|---|
| 게이트 해제 | 직전 inspect 실측(13564133057=originProductNo·shape 호환 VALID)으로 GET-merge 배포 게이트 해제됨. |
| 작업1 GET-merge 배포 | api-client.ts GET-merge(updateStock/setProductOutOfStock/bulkUpdateStock 전부 getProduct→stockQuantity override→전체 PUT) + CLAUDE.md §3-7 커밋 5f68d47. 실 PUT/OOS 0(코드만, mark-oos alsoNaver는 best-effort catch라 안전). |
| 작업2 statusType 거짓초록 | inspect 인라인 drift가 name·salePrice만 비교 → SUSPENSION을 inSync:true 오판. App status→네이버 statusType 매핑(ACTIVE→SALE 등) 추가 후 statusType drift 포함. 커밋 c6d00de. ★ diffNaverProduct는 이미 statusType 비교 보유 — 실제 누락은 inspect 인라인이었음(#46 정직). production 실증: 명화 drift inSync:false·diffs=[statusType naver:SUSPENSION app:SALE]. |
| 작업3 엔드포인트 오용 | sync/route.ts:40 + cron/daily:87이 origin 번호에 channel-products(404 위험) → 양쪽 `/v2/products/origin-products/{id}`로 교정(statusType/stock을 originProduct에서 read). cron 자동중지(LIVE PUT)는 NAVER_AUTOSUSPEND_ENABLED env 게이트(기본 off)로 감싸 read 교정이 mutate 재활성 안 하도록 — off면 wouldSuspend 후보만 노출(비가역 0), on이면 §3-7 v2 PUT. 커밋 e3ab753. |
| 검증 | tsc 0·build OK·이모지 0·실 PUT/OOS 0·가짜 라벨 0(#46). push e6ffc5f→e3ab753. verify 180s timeout이나 gh api로 production e3ab753 state=success 확인(슬로우 빌드, #36 webhook 정상). 명화 DB-mode inspect 실증 GREEN. |
| ★ 부수 확정 | 명화 statusType=SUSPENSION(판매중지)·앱 ACTIVE = 실 drift 확정 → SUSPENSION 해제 트랙 필요(대표 결정). |
| ★ 다음 | (A) Desktop GET-merge dryRun 교차검증 (B) 명화 SUSPENSION→SALE 해제(updateStock GET-merge 또는 update confirm, 비가역, 대표 승인) (C) 명화 이미지 반영 트랙 (D) NAVER_AUTOSUSPEND_ENABLED 활성 여부 대표 결정 (E) `* 2.*` 중복본 정리(#34). |


### 2026-06-06 (37) 읽기전용 inspect 라우트 신설 + 명화 번호종류 실측 확정 — 13564133057=originProductNo (FROM Code, production cb15dfb, 비가역 0·GET only)

| 항목 | 상태 |
|---|---|
| 배경 | Desktop 검증서: GET-merge updateStock 배포 전 미확정 2건 — (1)naverProductId가 origin/channel 번호 불명(채널 정황) (2)GET origin-products가 PUT body 호환 shape인지. |
| 작업1 inspect 라우트 | `GET /api/naver/products/[productId]/inspect` 신설(읽기전용·mutate 0). origin-products + channel-products 양 probe→200/404 캡처, numberKind 분류, resolvedOriginProductNo 역추적, putTargetWarning, originProductRaw 반환, drift 인라인 계산. `?probe=<no>`로 DB 없이 raw 번호 검증. naverRequest/NaverApiError(HEAD)만 import → 단독 배포 가능(GET-merge 미동반). 커밋 cb15dfb·verify exit 0. |
| ★ 실측 (production probe 13564133057) | **numberKind=ORIGIN**: origin-products GET 200·channel-products GET 404 → 13564133057=**originProductNo**. storedIsCorrectPutTarget=true. Desktop '채널번호 정황' 가설 **반증**. PUT /origin-products/13564133057 정타. |
| ★ shape 호환 | originProduct top-keys: name·salePrice·stockQuantity(2997)·statusType·leafCategoryId·images·detailContent·detailAttribute·deliveryInfo·customerBenefit·saleType = PUT body 동일 → **GET-merge 전제 VALID**. |
| 작업2 번호 정합 가드 | 실측=ORIGIN → 번호 교정 불필요(스킵). register priority(productNo??originProductNo) 결과적으로 origin 저장 정합. 미래 상품 견고성은 후속(추측 교정 금지 #46). |
| 부수 발견 | (a) 명화 statusType=SUSPENSION(판매중지)·앱 ACTIVE = drift. (b) 기존 sync/route.ts:40·cron/daily:87이 origin 번호에 channel-products 엔드포인트 사용 → 404 가능(API_ERROR 경로). 별도 점검 대상. |
| 검증 | tsc 0·build OK·이모지 0·비가역 0(GET only)·가짜 라벨 0(#46). |
| ★ 다음 | (A) 정합 확정됨 → **GET-merge api-client.ts 배포 승인 요청**(현 uncommitted, mark-oos 라이브경로 안전화) (B) 명화 SUSPENSION→SALE 여부 대표 확인 (C) sync/cron channel-products 오용 점검 (D) 명화 이미지 반영(update confirm:true, 비가역). |


### 2026-06-06 (36) updateStock 부분 PUT 위험 안전화 — GET-merge 전체 페이로드 교체 + T2.5 트랙 신설 (FROM Code, production <PENDING push>, 비가역 0·실 PUT 0)

| 항목 | 상태 |
|---|---|
| 결함 | `api-client.ts updateStock`이 `{originProduct:{stockQuantity}}` 부분 PUT 사용. 네이버 v2 PUT=FULL REPLACE(#1650)이므로 재고만 보내면 상품명/가격/이미지/옵션/원산지/상세 전소실 위험. setProductOutOfStock·bulkUpdateStock도 동일 의존. |
| 작업1 호출처 전수조사 | 라이브 호출처 1개: `src/app/api/alerts/[id]/mark-oos/route.ts:95` setProductOutOfStock (UI 품절버튼 + `alsoNaver=true`, 기본 false). → 라이브(긴급). bulkUpdateStock=미사용. 폴러(dome-inventory-poller updateStockProfile)=무관 로컬 DB함수(api-client 미import). |
| 작업2 안전화 | updateStock을 **GET-merge**로 교체: `getProduct`로 현재 전체 originProduct read→stockQuantity만 override→전체 PUT. 이미지 재업로드 0·DB의존 0·네이버 측 변경분 보존. `{dryRun:true}` 옵션(GET-merge 미리보기, PUT 미실행). productNo 없으면 throw, bulkUpdateStock은 skip 버킷. setProductOutOfStock/bulkUpdateStock 동일 경로 통일. |
| 작업3 T2.5 | `diffNaverProduct(productNo, appExpected)` 읽기전용 diff 헬퍼 추가(name/price/stock/status/repImg). 마스터 플랜에 T2.5 "네이버 양방향 동기화 정합성" 트랙 신설. CLAUDE.md §3-7 "재고 수정도 전체 페이로드 교체 필수" 등재. |
| 검증 | 오프라인 merge 증명(구PUT 8필드 소실 vs 신merge 9필드 보존+stock 50→0). TSC 0/build OK. 이모지 0(★ 주석 마커, 형제 라우트 선례). 가짜 라벨 0(#46). 실 PUT 0(대표 승인 전 비가역 금지). |
| 의심 파일(#34) | working tree에 macOS 중복본 다수 untracked(`* 2.ts`/`* 2.md`/`* 2.json`, docs/handoff·research 신규 MD). 본 turn 미접촉·미커밋. 대표 결정 위임. |
| ★ 다음 | (A) Desktop 교차검증(updateStock GET-merge 로직 + diffNaverProduct) (B) mark-oos alsoNaver 실경로는 이제 안전(실패해도 best-effort catch) — 대표 승인 시 실 OOS 1건 검증 (C) 명화 이미지 반영 트랙(update confirm:true, 비가역) 재개 (D) `* 2.*` 중복 파일 정리 결정. |


### 2026-06-05 (35) 네이버 상품 수정 라우트 신설(PUT origin-products) + update dryRun 검증 (FROM Code, production 70b4edc, 비가역 0)

| 항목 | 상태 |
|---|---|
| 작업1 수정 라우트 | src/app/api/naver/products/update/route.ts. PUT /v2/products/origin-products/{no}. 전체 페이로드 교체(공식 #1650). buildNaverProductPayload 재사용. 실 PUT은 confirm===true만(기본 dryRun-safe). 이미지 shop-phinf 선행. naverProductId 없으면 409. |
| 작업2 대표이미지 점검 | mainImage=Cloudinary 공급사 원본(빌더가 읽는 값). main_image_url=Supabase 썸네일(빌더 미독). → 교정 반영하려면 mainImage 승격 선결. 본 turn 점검만(mutate 0). |
| 작업3 dryRun | mode UPDATE·canRegister true·originAreaCode 0200037·sellerTags 제한어 0·옵션 3 distinct·PUT 0. representativeImage 아직 공급사 원본(mainImage 미승격 실증). |
| 가짜 라벨 | 0(#46). dryRun GREEN ≠ 이미지 반영 완료. 비가역 0(confirm 미전달). TSC 0/build OK. |
| ★ 다음 | (A) Desktop update dryRun 교차검증 (B) 명화 mainImage 승격(clean 썸네일 재생성→저장→셋, 가역) (C) 대표 승인→update confirm:true 실 PUT(비가역)→3중 검증 (D) updateStock 부분 PUT 위험 별도 점검. |


---

> §3의 더 오래된 hand-off(2026-06-05 (34) ~ 2026-05-26 (9))는 `docs/plan/archive/TASK_BRIDGE_2026-06-early.md`로 이관(2026-06-07 #31 분할). 검색용으로만 참조.

---

## §4 STANDING DECISIONS (사용자가 영구 위임한 결정 — 변경 금지 사항)

| ID | 결정 | 근거 / 날짜 |
|---|---|---|
| SD-01 | Studio (/studio) footer 아랍어 텍스트 **영구 보존** — paper-cut 인벤토리 영구 제외, 수정/삭제/조사/문서화/source 추적 금지 | 사용자 의도적 개인 감사 메시지, 2026-05-18 |
| SD-02 | bornscent supplier DB INSERT 완료 (id `cm62770f54a42a46a4ae4c53d`, code `DMM-BRNSC`) — P2 자동 매칭 OK | Desktop이 Supabase MCP 직접 INSERT, 2026-05-18 |
| SD-03 | AI fallback chain = Groq (primary, 2 working keys) → Anthropic Sonnet (last-resort). Gemini API는 키 커밋 노출 사고로 revoke 상태 — 키 보안 해결 시 재사용 가능(모델 금지 아님). Firefly 웹 UI의 모델 선택(Gemini/Nano Banana/FLUX 등)은 키와 무관, 전 모델 자유 사용. Perplexity + xAI DEPRECATED. (2026-06-01 정정) | PROGRESS.md 2026-05-15 v3.1 FINAL + 2026-06-01 Desktop 정정 |
| SD-04 | main 직접 push (1인 개발, 브랜치 없음) | 작업원칙 #4 |
| SD-05 | Vercel production = source of truth (dev 가정 production 아키텍처 금지) | 작업원칙 #28 |
| SD-06 | 사용자 닉네임 답변 본문 직접 입력 금지 (사용자 메시지 인용 / 코드 변수 / write_file MD만 허용) | 작업원칙 #29 e++ |
| SD-07 | 자동화 *모니터링* UI는 *대시보드 Section 5 카드*가 primary 진입점 — `/admin/automation`은 관리자 전용 fallback. registry는 *실 가동 작업만* 등재 (미구현 작업 사전 라벨 금지) | 사용자 Q1·Q2 결정 2026-05-19 |
| SD-08 | 꼬띠 = 튤립 마스코트(다람쥐 아님), 공식 안내자. 닥스훈트 배송·좀비소(좀비 보관소) = 컨셉 후보 미실현(라우트 미생성, i18n 주석만). 정원 그린 보조색 공식 추가. 2-Zone(감성=대시보드 풀 / 작업=SEO·아틀리에 절제, 무채색화 금지). | 2026-06-01 Desktop GARDEN_CONCEPT_ANALYSIS 정합 |

---

## §5 OPEN PAPER-CUTS (Sprint 7-PC 22-PC 인벤토리)

### 진행 완료 (11건)

| ID | 영역 | Commit | 상태 |
|---|---|---|---|
| P1 | 카테고리 prefill autofill | `742ce91` (PC-A hotfix) | ✅ silent fail 사라짐 — 디퓨저는 P13-D scope에서 d3 정확도 완성 |
| P2 | 공급사 매핑 (bornscent) | 비-commit (Supabase INSERT) | ✅ 70% 해소, 자동 매칭 작동 |
| P14 | 옵션 14종 silent truncation | `5a3b8c2` (PC-B-1 defensive) | ✅ 회귀 0 확정 — 14종 모두 input.value로 정상 렌더링 |
| P15 | 옵션 그룹명 매핑 | `29b7c49` (PC-B-2) | ✅ 디퓨저 → '향' 자동 적용 |
| P18 | dome_code passthrough infra | `5a3b8c2` (PC-B-1) + `5fa8560` (seed) | ✅ infra + seed 완료 — cache hit 활성화 |
| P13-A | seo-workflow Groq migration | `2276ed7` (PC-C) | ✅ 완료 (PC-C) |
| P13-B | description + perplexity Groq migration | `2276ed7` (PC-C) | ✅ 완료 (PC-C) |
| P13-C | keywords Groq migration | `2276ed7` (PC-C) | ✅ 완료 (PC-C) |
| P13-E | aeo-generate Groq migration | `2276ed7` (PC-C) | ✅ 완료 (PC-C) |
| P23 | AI chain memory 정합 위반 (시스템 정합성 CRITICAL) | `2276ed7` (PC-C) | ✅ 완료 — Groq primary chain 코드 적용 |
| P13-D | category/suggest Groq migration → **P30로 분리** | PC-D 권고 | → P30 분리 (잔존 사용처) |

### 진행 중 / 대기

| ID | 영역 | 권고 sprint |
|---|---|---|
| **G7-SKU** | 빈 SKU unique 충돌 -> SKU 미입력 상품 2번째부터 저장 500 (P0) | `1aa5969` Fix A 자동발급 엔진 + Fix C payload 확장 + Fix B backfill ✅ **[CLOSED 2026-05-28 Desktop]** (probe 자동 SKU 확인) |
| **G7-userId** | **userId="default" FK 위반 -> DRAFT 저장 500 (P0)** | **17143f0 [CLOSED 2026-05-28] — Desktop POST 200 재검증 통과** |
| P17 | supplier-notfound 시 배송 fallback | `29b7c49` (PC-B-2, infra 완료) — notfound 케이스 prefill URL로 실 검증 대기 |
| P19 | 혜택 prefill | PC-B-3 (P16 결정 후) |
| P16 | additionalImages 0건 (crawler 측) | PC-B-3 또는 PC-D 분리 (사용자 결정) |
| P20 | 기존 supplier 2건 (이현마켓, gseller2022) `domeggook_seller_id` NULL backfill | 사용자가 도매꾹 마이페이지에서 실제 seller ID 확인 후 Desktop이 Supabase MCP UPDATE |
| P21 | crawler catD2 정규화 — 도매꾹 실제 "인테리어소품" → prefill "홈인테리어소품" 오염 (MEDIUM) | PC-D |
| P22 | crawler productNo 만료 갱신 — 도매꾹이 새 ID로 재등재 시 우리 DB stale 404 (LOW-MEDIUM) | PC-D 또는 Sprint 6-A 회귀 |
| **P24** | **Groq 모델 한국어 정합 (8b→70b hotfix)** — `2276ed7` smoke 후 productNames degenerate 발견 | **본 commit (PC-C-hotfix)** |
| P25 | lib/trend-analyzer.ts Perplexity 잔존 | PC-D |
| P26 | lib/utils/env-checker.ts Perplexity 잔존 | PC-D |
| P27 | /api/naver-seo/ai-generate Perplexity 잔존 | PC-D |
| P28 | /api/kkotti-comment Perplexity 잔존 | PC-D |
| P29 | /api/aeo-generate Gemini 잔존 | PC-D |
| P30 | /api/category/suggest Gemini 잔존 (구 P13-D scope) | PC-D |
| P31 | lib/review-sentiment-analyzer Gemini 잔존 | PC-D |
| P32 | lib/upload-readiness-filler Gemini 잔존 | PC-D |
| **P33** | **lib/gemini.ts.bak 보안 위반 (백업파일 노출) — 17개 일괄 처리** | **`f9119a0` (PC-C-hotfix) ✅ 완료** |
| P34 | Gemini 재진입 시점 (예약) | Sprint 8 (월 매출 100만+) |
| **P35** | **provider 응답 문자열 stale (route.ts hardcoded 8b)** — GROQ_MODEL 상수 참조로 fix | **`0b941a6` (PC-C-archive) ✅ 완료** |
| **P36** | **.backup 패턴 60건 git 추적 + .gitignore 누락** (작업원칙 #43 메타-단정 사례) | **`0b941a6` (PC-C-archive) ✅ 완료** |
| **P25** | **lib/trend-analyzer.ts Perplexity dead code 삭제** | **본 commit (PC-D) ✅ 완료** |
| **P26** | **lib/utils/env-checker.ts PERPLEXITY 검사 → GROQ/ANTHROPIC** | **본 commit (PC-D) ✅ 완료** |
| **P27** | **/api/naver-seo/ai-generate Perplexity + xAI + Gemini 삭제** | **본 commit (PC-D) ✅ 완료** |
| **P28** | **/api/kkotti-comment Perplexity + Gemini 삭제, Groq primary** | **본 commit (PC-D) ✅ 완료** |
| **P29** | **/api/products/[id]/aeo-generate Gemini → Groq** | **본 commit (PC-D) ✅ 완료** |
| **P30** | **/api/category/suggest Gemini → Groq** | **본 commit (PC-D) ✅ 완료** |
| P31 | lib/review-sentiment-analyzer.ts — 단정 결과: 이미 Groq primary (헤더 정합 갱신만 권고) | scope 외 (이미 정합) |
| P32 | lib/upload-readiness-filler.ts — 단정 결과: 이미 Groq primary (헤더 정합 갱신만 권고) | scope 외 (이미 정합) |
| #3 | handleNaverDirect silent fail (2026-05-17 발견) | `742ce91` (PC-A) ✅ 해소 단정 — 사용자 첫 실 상품 등록 시 검증 의무 |
| **P37** | **자동화 관제 가짜 라벨 (17/26 미가동 작업)** — Sprint 8-IA Phase 1로 해소 | **Phase 1 ✅ 해소 예정** |
| **P38** | **상세페이지 빌더 ↔ 27 dedicated renderer 충돌** — Phase 2 흡수 결정 | Sprint 8-IA Phase 2 |
| **P39** | **lifestyle-picker 연결 가시화 부재** — picker 작동이 사용자 화면에서 안 보임 | Sprint 8-IA Phase 2 |
| **P40** | **시각적 통일성 부재** — 라이프 자산 페이지 ↔ 온실 아틀리에 ↔ PLANT 디자인 토큰 불일치 | Sprint 8-IA Phase 2 |
| **B-1** | **온실 아틀리에 클릭 무반응** — Phase 3-C-1 6 컴포넌트 `'use client'` 누락 | 본 commit ✅ 완료 (Desktop 재검증 대기) |
| **B-2** | **runThumbnail 빈 outputs 침묵 실패** (#46 위반 소지) | 본 commit ✅ 완료 |
| **B-3** | **달항아리 도어벨 데이터 보정** | ✅ [CLOSED 2026-06-02] 카테고리 50000963 교정 완료. 마진 27200/20900(23%). 단 마진 얕아 발행 전 가격 재검토 권고(첫 발행은 명화 50.7% 우선) |

---

## §6 PENDING USER ACTIONS (사용자 직접 작업 대기)

| 항목 | 내용 | 트리거 |
|---|---|---|
| P20 supplier seller ID 확인 | 도매꾹 마이페이지에서 이현마켓 / gseller2022 실제 seller ID 확인 | 사용자 시간 |
| P16 scope 결정 | additionalImages crawler 수정을 PC-B-3 포함 or PC-D 분리 | 사용자 판단 |
| 첫 실 상품 NAVER 등록 | dome_code seed 완료 ✅ → 디퓨저 prefill → autoRunVisual end-to-end 검증 | Desktop Chrome 검증 통과 직후 |
| P21·P22 fix scope 결정 | crawler 정규화 + productNo 만료 갱신 fix 진입 시점 결정 | 사용자 판단 |

---

## §7 ARCHIVED HAND-OFFS (완료된 hand-off 누적)

<!-- archived 2026-06-17 세션9: 검증완료된 §3 entries 88~92 이동 (T1 1000 트림·#31) -->

### 2026-06-15 (92) 워크플로 rev2 codify + 상태 정합 → item2(Firefly)·item3(발행) ACTIVE (FROM 💻 Code, main a96909c, docs·비가역0)
- **종결 확인**: item1 레거시 백필(#79)·#80 STALE 근본수정·#81 자산 정합 가드 전부 production 검증 클린(3상품 ok·depth-2 0·dead 0). 등록 워크플로 rev2 codify(권위 PRODUCT_REGISTRATION_WORKFLOW.md).
- **ACTIVE item2 (Firefly)**: [Desktop] 4컷 생성(realism lane·생성설정 4플래그 확인)→누끼합성(v8 참조드롭 하모나이즈)→정규 stage 적재. firefly_auto 카드 경유.
- **ACTIVE item3 (발행)**: 충실도/실물대조/마운트/네이밍 게이트 통과 후 네이버 v2 FULL REPLACE(#57·전체 payload)·명시 GO(비가역 #46).
- **다음 1액션**: [Desktop] /dashboard 관제탑 정합 카드 부재 확인 → Firefly 4컷 생성 시작.

### 2026-06-15 (91) 자산 정합 점검 시스템 가드 (#81·#80 후속, FROM 💻 Code, main, additive·비가역0·교정만 confirm게이트)
- **What**: 드리프트 상시감지·개입점화. checkProductIntegrity(라이브 listProductAssets 기준 depth-2/root 잔존·DB ref dead[전컬럼 중첩jsonb+asset_references+published_assets 전수]·선택 비율) → control-tower 개입 대기열 asset_integrity 카드 시드(setJobIntervention·lane process·멱등·best-effort·강제모달0 #56), 정합 OK면 clear. 1클릭 교정(POST /api/products/[id]/asset-integrity {action:fix,confirm:true}·#46 게이트 → 루트→정규 이동·archive 백업·exhaustive ref 리맵). cron /api/cron/asset-integrity-sweep(KST 자정). tool='sharp'.
- **검증**: 현 3상품 ok(depth-2 0·dead 0). 드리프트 round-trip(이동→detect→card seed[matrix 쿼리 노출]→1클릭 fix→복원→clear) PASS. tsc0·build0·외부 image API 0(Sharp만)·네이버 무접촉. 박제 §8.11 + #81.
- **다음 1액션**: [Desktop] /dashboard 관제탑 정합 카드 부재(3상품 OK) 확인 + 의도 드리프트 1건 주입(파일 root 이동 or seed 호출)→카드 생성·1클릭 교정·재점검 OK 확인.

### 2026-06-15 (90) /assets STALE 캐시 근본수정 — Storage 리스트 라이브화 (FROM 💻 Code, main, additive·비가역0)
- **What**: Desktop 실앱테스트 적발 — /api/products/[id]/assets 전상품 STALE(studio가 죽은 depth-2 URL 404 렌더·현 canonical 누락). 명화 /assets 22(pre-backfill snapshot) vs 실제 41. 배포로도 미소거(Vercel Data Cache). 근본=getServerClient supabase list가 Next Data Cache 잔류(force-dynamic만으론 SDK fetch 미차단). 수정=global.fetch no-store 주입(전 Storage read 라이브) + route fetchCache='force-no-store'+revalidate=0. 클라 이미 no-store.
- **검증**: listProductAssets 라이브 = 명화 41(depth-2 0·전 canonical stage)·아이스트레이 2(detail1·archive1·depth-2 0)·cmp3afb 18(depth-2 0). tsc0·build0·네이버 무접촉. 박제 §8.10 + #80.
- **다음 1액션**: [Desktop] /assets no-store 재검증(명화 41·depth-2 0 / studio 렌더 depth-2 0) → Firefly 4컷.

### 2026-06-15 (89) 백필 dangling 정정 — DB ref 감사/치환 EXHAUSTIVE 전환 + taxonomy archive 선행 (FROM 💻 Code, main, 비가역 1·교정)
- **What**: Desktop #45 적발 — 직전 'dangling 0' 부정확. Product.quality_reasons(jsonb·cmpnooli4)에 구 depth-2 URL 잔존(404). 근본=하드코딩 컬럼리스트가 jsonb 누락. instance 교정(정규 detail/ URL·200 확인) + class 근본수정(updateDbRefs·residualRefCount 컬럼리스트-FREE 전수스캔·중첩 jsonb 포함) + 신규 scripts/remap-depth2-refs.ts(dangling-only·dry-by-default·자가검증) + taxonomy archive 마커 plate 선행(GO#3 확장·\b word-boundary로 gold 오탐 차단).
- **결과**: 전3상품 사후 전수스캔 잔존 depth-2 ref=0. 교정 1필드/1치환. build0·tsc0·네이버 무접촉.
- **다음 1액션**: [Desktop] to_jsonb 전수 재검증(0 확인) → Firefly 4컷 / 다음 상품.

### 2026-06-15 (88) 분류기 누끼 신호 교정(알파≠투명) + 삭제 모달 UX (FROM 💻 Code, main, 비가역 0·additive)
- **What**: 세션7-i Desktop 실측 BUG 수정 — cutout 신호를 `hasAlpha`(채널 존재)에서 `hasAlpha && sharp.stats().isOpaque===false`(실제 투명)로 교정. 불투명 RGBA(canvas/Firefly/디자인툴 PNG) → 누끼 신호 무시·비율 폴백. 3경로(/assets/classify·/assets/upload·/ingest-firefly) 신호 일원화 + 응답에 isOpaque·hasTransparency 추가·칩 '투명 배경' 사유. 삭제 확인 = native confirm 2단계 → 커스텀 모달(썸네일·자산명·단계·비가역·추가이미지 해제 경고).
- **재검증(sharp 실이미지 7/7 PASS)**: 1000² 불투명PNG→thumbnail / 400×1200→detail / 900×1125→composite / 투명PNG→cutout / JPEG 3종 회귀 전부 정답.
- **검증**: tsc0·build0·비가역0·sentinel clean. 권위 §8.7·8.8 박제 + PRINCIPLES_LEARNED #78.
- **다음 1액션**: [Desktop] /assets/classify로 불투명PNG 재검증(정답 확인) → 다음(레거시 백필 GO 대기 / Firefly 4컷).


> 30개 도달 시 `docs/plan/archive/TASK_BRIDGE_YYYY-MM.md` 분할.

### 2026-05-28 (G8-ENGINE 실증)

- ✅ G8-ENGINE 디자인 라인 실증 (Desktop turn, 코드 0) ← 확정 동선 6단계 실 MCP 호출 전수 통과
  - 1.도매꾹 Referer 다운로드 760x760 200 / 2.Adobe CC 청크업로드 init+PUT+finalize 200 -> presignedAssetUrl
  - 3.image_remove_background 투명 누끼 성공(투명체 경계+손 보존, rembg 우위) / 4.asset_search GenAIAsset 경로정상(자산 0건)
  - 5/6.Pillow+Noto CJK 4변형(clean/price/badge/lifestyle) 차별화 육안증명 -> '4변형 거의 동일' 결함 해소
  - 아키텍처 확정: Adobe Express MCP 외부 누끼 합성 불가->서버 Sharp 유지 / image_remove_background는 CC presignedAssetUrl만
  - 실측 정정: /mnt/user-data/uploads 읽기전용->/home/claude 스크래치
  - 비가역 0(Supabase 미저장, 네이버 미발행). 핸드오프 HANDOFF_g8_engine_design_line_proven_2026-05-28.md
  - 다음: Code Phase G8-ENGINE(asset-source-resolver + thumbnail-generator 리팩터 + B 수동 오버라이드 UI)

### 2026-05-19

- ✅ PC-A 742ce91 (3-fix 통과) ← Desktop 검증
- ✅ PC-B-1 5a3b8c2 (P18 passthrough + P14 defensive) ← Desktop 검증
- ✅ PC-B-2 29b7c49 (P15 옵션 그룹명 + P17 배송 fallback) ← Desktop 검증
- ✅ dome_code seed 5fa8560 (디퓨저 dome_code INSERT + P21·P22 등재) ← Desktop 검증
- ✅ Sprint 7-PC-C 전면 종료 `2276ed7` ← Desktop 5-source 검증 통과
  (Groq migration 5 endpoint, +240/-305 LOC, build OK + Vercel READY)
- ✅ Sprint 7-PC-C-hotfix `f9119a0` ← Desktop 5-source 검증 통과
  (70b 교체 + 17 .bak rm + #42~#45 명문화 + paper-cut 11건, 22 files
  +154/-3625 LOC, Vercel READY)
  - Verification: HTTP 200 / 2.14s / productNames 다양성 3/3 unique
  - 한국어 정합 100% / P24 결함 완전 해소
  - 추가 단정: provider 문자열 stale → P35 후속 fix
  - 추가 단정: .backup 60건 잔존 → P36 후속 fix (메타-단정 사례)
- ✅ Sprint 7-PC-C-archive `0b941a6` ← Desktop 3-source 검증 통과
  (P35 GROQ_MODEL 상수 export + P36 60 .backup rm + .gitignore +6 patterns
  + #43 메타-단정 강화, 65 files +52/-18741 LOC, Vercel READY)
  - Production smoke: provider="groq-llama-3.3-70b-versatile" 정합 확정
  - productNames/hooks 3/3 unique, 한국어 자연어 100%
  - 누적 정리: .bak 17 + .backup 60 = 77 보안 위반 파일 해제
- ✅ Sprint 8-IA 진입 결정 (Desktop turn) ← 자동화 관제 진단 + IA 재설계 단정
  - Chrome MCP로 /automation + /studio + /settings/lifestyle-assets + /products/new 4 화면 시각 점검
  - 17/26 가짜 라벨 발견 + 빌더↔renderer 충돌 + lifestyle 연결 부재 진단
  - 사용자 Q1·Q2·Q3 권장안 모두 승인 → 새 채팅 2개 분할 결정
  - md 6건 paste-ready 분할 작성 (Turn 1 + Turn 2)

### 2026-05-27 PM (B-13a)

- 🟡 IN-VERIFY: B-13a PLANT 페이지 상단 헤더 중복 등록 버튼 제거 (Code turn, 본 commit) ← Desktop 7탭 순회 재검증 대기
  - page.tsx line 1792-1805 14줄 `<div>` 블록 삭제 (handleNaverDirect 버튼 + handleGenerate 버튼 헤더 인스턴스)
  - 핸들러 카운트: handleNaverDirect 3->2, handleGenerate 4->3 (line 817 비-functional 주석 포함)
  - functional call site: 양쪽 visual 탭 1곳만 잔존
  - Desktop Chrome MCP 실측 evidence: pre-state totalRegisterButtons=2 (HEADER zone top=115px)
  - TSC 0 + build OK (/products/new 64.2 -> 63.9 kB)
  - 핸드오프 HANDOFF_plant_header_duplicate_buttons_2026-05-27.md 본 commit으로 [CLOSED]
  - 5-19 진단의 cascade miss 사례 — 하단 블록만 식별하고 헤더 dup 누락. b6ce4bb 재검증으로 발견

### 2026-05-27 PM (B-13)

- 🟡 IN-VERIFY: B-13 PLANT 비주얼탭 액션블록 스코프 정합 (Code turn, 본 commit) ← Desktop 6탭 미노출 + visual 탭 노출 재검증 대기
  - page.tsx 2 edit: visual 탭 종료 `</>)}` 위치를 line 3401 -> 하단 버튼 `</div>` 직후로 이동
  - 결과: autoRunVisual 체크박스 + 네이버 직접 등록 + 엑셀 다운로드 버튼 블록 전체가 `activeTab === 'visual'` 조건 안
  - 작업1(/atelier 404)·작업2-a(7번째 탭): 코드 이미 반영 완료로 폐기 단정 (Desktop 실측 정정판 hand-off)
  - 작업원칙 #44 stale fact 직접 해소 사례 (PROGRESS.md 2026-05-15 Phase 3-C-3 entry의 "체크박스 위치"가 코드 실제와 불일치였음)
  - TSC 0 + npm run build OK (/products/new 64.2 kB 변경 0) + sentinel 0
  - 핸드오프 `HANDOFF_atelier_routing_plant_checkbox_2026-05-27.md` 본 commit으로 [CLOSED]

### 2026-05-27 PM

- ✅ B-12 네이버 등록 라우트 근본 재작성 + B-11 저장배관 DB UPDATE (Code turn, 본 commit) ← Desktop 등록 완주 검증 대기
  - register/route.ts: categoryMap(의류 7종) 폐기 -> `product.naverCategoryCode` 직접 사용
  - register/route.ts: `X-Naver-Client-Id` 헤더 폐기 -> `naverRequest` OAuth2(bcrypt 전자서명) 위임
  - register/route.ts: API 실패 시 `status='registered'` + 가짜 ID(`PENDING_`/`ERROR_`/`MOCK_`) 3건 모두 제거(#46)
  - register/route.ts: detailContent에 `<img src="${detail_image_url}">` 삽입 (Desktop B-11 우회로 살려둔 186KB 상세 PNG 활용)
  - save-assets/route.ts: Storage 업로드 200 후 `prisma.product.update`로 `main_image_url`/`detail_image_url` 자동 기록 (B-11 §3-1)
  - useStudioActions §3-2 단정: 코드 정독 결과 이미 detailBase64 동봉 중 — 변경 0건
  - TSC 0 + npm run build OK + sentinel grep 0
  - **실 네이버 발행은 비가역 -> 대표 승인 후 별도 Desktop turn**

### 2026-05-27

- ✅ B-4 진단 504 근본 복구 (Code turn) ← Desktop 검증 통과 (production 진단 200/정상, 504 소멸)
- ✅ 명화송풍구 이미지 보강 + margin 교정 (Desktop turn) ← 진단 L4->L2 도달, persist=true 영속화
  - 이미지: 330px -> 화보 4종컷 1000x1000 (Cloudinary, 선명도 99.6->351.8)
  - margin: 50.69(깨진값) -> 2.03 (Supabase 직접 UPDATE)
  - 진단 엔진(P-Filter) 신뢰도 검증: 3회 재진단으로 좋은/나쁜 이미지 정확 구분 입증
- ✅ 부수버그 7-commit 정리 (Code turn, production 5601e91) ← **Desktop production smoke 3-tier 검증 통과**
  - C1 `a37f588` docs: ROADMAP ACTIVE 교체 + 5 MD/handoff
  - C2 `3c6859f` **B-7**: margin DB %(퍼센트) vs grading 배수 단위 불일치 근본 복구 + POST 디폴트 정합(KKOTIUM_DEFAULTS)
  - C3 `bf66d45` **B-8**: 도매꾹 crawler thumb.original 우선 + desc.contents 화보 추출
  - C4 `d3ff2fc` **B-5**: PUT 500 — stock 등 미존재 ceec럼 REJECT_KEYS 화이트리스트
  - C5 `d9e7ed7` **B-6**: /api/naver/categories 로컬 4,993 연결 (DB 미시드 우회)
  - C6 `234a745` **B-9**: rationale 응답 shape `string[]` 통일
  - C7 `5601e91` **B-10**: grading.decideGrade에 pFilterGrade floor 추가
  - Desktop 검증 evidence (production smoke):
    - B-6: `/api/naver/categories?q=디퓨저` -> 50003356 아로마방향제/디퓨저, fullPath 4단계 완전, count 1
    - B-9: 명화송풍구 재진단 rationale = `list` 길이 1, 항목 113자 정상 문장 (지난 턴 글자단위 분해 -> 해소)
    - B-10/B-7: 재진단 grade L2 = pFilterGrade L2 (floor 반영), roiBreakdown.margin 2.028 (자동계산)
    - 매 commit tsc 0 + build OK + verify-vercel-deploy.sh --wait exit 0 (Code 보고) + Desktop 재확인

### 2026-05-20

- ✅ Sprint 8-IA Phase 1 Task 1-3 `db72408` (Code turn) ← sidebar demote + admin move + registry 31→8
  - registry 8 entry 확정 (inventory-poll / good-service-track / discord-* 4 / cron-daily / cron-weekly)
  - /automation → /admin/automation 라우트 이동 + sidebar 항목 제거
  - 작업원칙 #46 (a)~(e) 5 규칙 적용 (실 가동 단정만 등재)
- ✅ Sprint 8-IA Phase 1 Task 4 `12495cf` (Code turn) ← SystemHealthCard + /api/system-health 신설
  - 신규 API: 8 registry × 4 신호 (InventorySnapshot / CategoryTrendCache / DomeCategory / Discord env) → HealthItem[]
  - 신규 컴포넌트: SystemHealthCard.tsx (60s polling + window focus revalidate)
  - Dashboard Section 3 가든 헬스 상단에 마운트 (기존 IA 보존)
  - TSC 0 / build 0 / Vercel READY (12495cf) / production /api/system-health 200 + items=8 ✅
  - V1~V5 단정 / V6 (브라우저 console) Desktop Chrome MCP 검증 의무 — TASK_BRIDGE §3 ACTIVE 신호로 이관

### 2026-05-26

- 🟡 IN-VERIFY: Studio 클릭 버그 수정 (Code turn) ← 6 컴포넌트 `'use client'` + B-2 빈 outputs guard
  - 진단 출처: Desktop Chrome MCP + Supabase MCP + Vercel MCP 전수 검증 (실 클릭 0 API 호출 / JS .click() 200 / 백엔드 정상)
  - Code 측 build + ship: tsc 0 + build 0 / Vercel push 대기
  - 상세 근거: `docs/handoff/HANDOFF_studio_click_bug.md` (HANDOFF doc git 추적 신규 등록)
  - Desktop 실클릭 재검증 통과 시 §3 ACTIVE 이전 + HANDOFF doc CLOSED 처리

---

## §8 작업원칙 #41 본문

본 원칙은 PRINCIPLES_LEARNED.md에도 동일 등재.

### 작업원칙 #41 — 두 환경 핑퐁 프로토콜 (2026-05-19 명문화)

**배경**: Sprint 7-PC paper-cut batch에서 두 환경 (🖥 Desktop ↔ 💻 Code) 핑퐁 운영 패턴이 자연 발생. 본 패턴을 영구 작업원칙으로 등재.

**규칙 7가지**:

(a) **역할 상호 배타** — Desktop은 planning + verify, Code는 build + ship. 두 환경 overlap 0. §1 표 참조.

(b) **5-step 표준 hand-off** — 모든 hand-off는 §2 형식 (FROM / TO / BASELINE / SCOPE / VERIFICATION / FALLBACK).

(c) **TASK_BRIDGE §3 ACTIVE 갱신 의무** — 매 hand-off 직후 갱신. SESSION_LOG와 *역할 분리* (TASK_BRIDGE = 실시간, SESSION_LOG = 회고).

(d) **단일 commit 단위** — 변경 50 LOC 이하 권고. 단일 sub-phase 단일 commit.

(e) **push 직후 검증 의무** — `scripts/verify-vercel-deploy.sh --wait` exit 0 + Vercel `list_deployments` HEAD 일치 확인.

(f) **Cross-track 검증 4-source** — 가능한 한 git + Vercel + Supabase + Chrome 4 source 모두 cross-check. 단일 source 단정 금지.

(g) **한계 정직 보고** — Desktop은 MD edit 불가 / Code는 Chrome MCP 불가. 각자의 한계는 §1 표 그대로. *못 하는 작업 우회 시도 금지*, 다른 환경에게 hand-off.

---

### 작업원칙 #49 — Desktop 핸드오프 직접 write (2026-06-04 명문화)

본 원칙은 PRINCIPLES_LEARNED.md에 정식 등재. 요지: Desktop은 인계 핸드오프 MD를 docs/handoff/에 Filesystem:write_file로 직접 작성(대표 다운/업로드 0), Code는 git add/commit 보존 + 큰 추적 MD(5종/PRINCIPLES)는 Python full-overwrite로 반영(#29b 불변). 핸드오프=Desktop 직접 쓰기 / 누적 MD=Code 반영.

---

## §9 컨텍스트 끊김 방지 (Recovery Drill)

세션 끊김 / 새 세션 진입 시 다음 4-step:

```
1. PROGRESS.md 헤더 정독 (직전 commit + 다음 작업)
2. ROADMAP.md "다음 새 채팅 시작 메시지" ⭐ ACTIVE 정독
3. SESSION_LOG.md 최근 entry 정독
4. TASK_BRIDGE.md §3 ACTIVE + §4 STANDING + §6 PENDING 정독 ★
   ↑ 본 layer가 새로 추가됨 — 4-step 모두 통과해야 정확한 상태 단정 가능
```

§3 ACTIVE 섹션이 *짧게 한 줄 인계 메시지*로 작동하도록 매 hand-off 시 갱신 의무. 사용자가 매번 paste하지 않아도 두 환경이 자동 sync.
