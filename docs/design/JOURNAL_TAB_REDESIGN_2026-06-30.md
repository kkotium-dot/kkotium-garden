# JOURNAL (일지) 탭 재설계 — 진행작업 생명주기 이관 + 활동기록 로드맵 (2026-06-30)

Authoring: DESKTOP. 권위: 본 문서 + studio/page.tsx(현 구현) + AtelierShell(탭 마운트) + OPERATOR_SYSTEM_BLUEPRINT #56. 구현=Code. 원칙 #55/#56/#45/#3-1.

================================================================
## 0. 배경 / 결정
================================================================
운영자 지시: **진행 작업(생명주기) 패널을 좌측 "일지(journal)" 탭으로 이동**.
- 현 상태: `JobLifecyclePanel`(생명주기)이 **중앙 워크스페이스**(studio/page.tsx workspaceSlot)에 위치. **일지 탭은 빈 스캐폴드**(`<ComingSoon/>`).
- 의미 정합: **일지 = 진행 작업의 생명주기를 기록·추적하는 자리**. 빈 스캐폴드가 실질 콘텐츠로 채워지고, 중앙은 미리보기·조립에 집중(디클러터 → 전환율 관점 plus).

================================================================
## 1. 일지 탭의 정체성 (선제적 개선 — 단순 이동이 아니라 토대)
================================================================
일지 = **1인 셀러의 "작업 일지"** — 두 축으로 성장:

| 구획 | 내용 | 단계 |
|---|---|---|
| **A. 진행 작업** (생명주기) | 현재 처리 중인 작업의 상태(썸네일/상세/SEO/발행 잡 lifecycle) — `JobLifecyclePanel` | **JOURNAL-1 (now)** |
| **B. 활동 기록** (activity log) | 완료된 행위의 시간순 이력 — 저장·발행·자산생성·AI호출 로그 | **JOURNAL-2 (next)** |

→ JOURNAL-1의 journalSlot은 **flex-column 섹션 구조**로 작성 → JOURNAL-2(활동 기록)가 **하단에 그대로 append**되도록 전방호환. 지금 placeholder는 넣지 않음(미완성 인상 방지) — B는 실기능으로 등장.

================================================================
## 2. JOURNAL-1 — 구현 스펙 (relocate-only, 확정)
================================================================
대상: `src/app/studio/page.tsx`

1. **워크스페이스에서 제거**: workspaceSlot의 `{/* Job progress (lifecycle) */}` 블록(JobLifecyclePanel 래퍼) 삭제.
2. **journalSlot 신설**(cultivationSlot 직후, sidebarTabs 위) — flex-column·minWidth:0·header(제목 s.journal + subtitle) + 본문:
   - `selectedProduct?.id` → `<JobLifecyclePanel productId=.../>`
   - else → `{a.workspace.selectPrompt}` (상품 선택 유도)
   - ★구조: header + 본문을 flex-column 섹션으로 → JOURNAL-2가 본문 아래 두 번째 섹션으로 자연 확장.
3. **journal 탭 content 교체**: `content: <ComingSoon .../>` → `content: journalSlot`. ComingSoon 미사용 시 제거(lint clean).
4. **i18n**: studio-strings.ko.json `atelier`에 `journal.subtitle` 추가(한글 json 격리 #3-1). 예: "진행 중인 작업의 생명주기를 기록합니다".
5. **반응형(#144)**: JobLifecyclePanel이 기존 넓은 중앙 → 384px 사이드바 패널로 이동 → overflow/깨짐 점검(minWidth:0). 깨지면 패널 내부 폭 보정.
6. 헤더 주석 현행화: '일지 stays a scaffold' → '일지 hosts JobLifecyclePanel (JOURNAL-1) + activity log (JOURNAL-2)'.

검증(Desktop, 배포 후): prod 일지 탭 → 생명주기 패널 렌더 · 384px 비깨짐 · 상품 미선택 시 선택 유도 문구 · 콘솔 0.

================================================================
## 3. JOURNAL-2 — 활동 기록 (backlog 등록, 다음 증분)
================================================================
- **목적**: 셀러가 "무엇을/언제 했는지" 한눈에 — 신뢰·재현·복기. 파워셀러 운영 일지의 핵심.
- **데이터원(우선 재사용 #181)**: 기존 잡/이벤트 소스 우선 조사 — `crawl_logs`(소싱), 발행 이력, 자산 생성(asset_registry/storage createdAt), seo-workflow 호출 로그(console.info served). 신규 테이블은 기존으로 못 채울 때만.
- **UI**: journalSlot 하단 두 번째 섹션 "활동 기록" — 시간 역순 타임라인(아이콘 + 행위 + 대상 + 시각). 상품 필터(현재 선택 상품 기준) + 전체 토글.
- **단계**: J2-1(읽기 전용 타임라인·기존 소스 집계) → J2-2(필터/검색) → J2-3(#56 Operator Action Queue 연동 — 미완 작업이 일지에서 바로 보이게).
- **확정 전 운영자 Q**: (a) 활동 기록 범위 = 현재 상품만 vs 스토어 전체, (b) 보존 기간/페이지네이션. → 권고: 현재 상품 기준 + 최근 50건 페이지네이션.

================================================================
## 4. 작업 유의사항 / 원칙 (신규)
================================================================
- **#182** 사이드바 탭 콘텐츠는 **활성 탭만 마운트**(AtelierShell `{activeTab.content}`) — 특정 탭이 안 보인다고 "미렌더 버그"로 단정 금지. 탭 전환 후 검증(지난 SF-1 혼선의 교훈: 도구함 탭에서 배양실 콘텐츠를 찾던 착오).
- **#183** 패널 이동(relocate-only) 시 **이동 전 폭 맥락 → 이동 후 폭(사이드바 384px)** 반응형 회귀 필수(#144). 넓은 곳→좁은 곳 이동은 overflow 점검 포인트.
- **#181 재확인**: JOURNAL-2는 기존 이벤트 소스(crawl_logs/발행/자산/AI로그) 집계 우선 — 신규 로깅 테이블은 최후.
- 일지 탭은 placeholder를 늘리지 않는다 — 빈 "준비 중"은 1개 이하로 유지, 실기능으로 대체.
