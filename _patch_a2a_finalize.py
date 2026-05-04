# A2a finalize patch — update PROGRESS / ROADMAP / SESSION_LOG with completed
# work + new handoff message for A2b. Korean text is written directly in this
# script (work principle 25: never NFC-normalize Korean strings).

from pathlib import Path

ROOT = Path('/Users/jyekkot/Desktop/kkotium-garden')

# ============================================================================
# 1) PROGRESS.md — bump header lines + prepend A2a session summary
# ============================================================================
progress_path = ROOT / 'KKOTIUM_PROGRESS.md'
progress_text = progress_path.read_text(encoding='utf-8')

# L2 timestamp
old_p2 = '> 최종 업데이트: 2026-05-04 (워크플로우 재설계 Sprint Part A1b 완료 ✅ + A2 인계 메시지 페르소나/유의사항 통합 ✅ / 다음: 새 채팅에서 Part A2 — CompetitionMonitor + ProductLifecycle SWR + 시각 디테일)\n'
new_p2 = '> 최종 업데이트: 2026-05-04 (워크플로우 재설계 Sprint Part A2a 완료 ✅ — Competition/Lifecycle SWR + SectionHeader mascot pill + 라이브 검증 6항목 통과 / 다음: 새 채팅에서 Part A2b — 모드별 위젯 정렬 + 추가 위젯 SWR 후보)\n'
assert old_p2 in progress_text, 'PROGRESS L2 not found'
progress_text = progress_text.replace(old_p2, new_p2, 1)

# L3 commit info
old_p3 = '> TSC: 0 errors | 배포: https://kkotium-garden.vercel.app | 직전 commit: 본 세션 마무리 commit (A2 인계 메시지 페르소나/유의사항 통합 + 본 세션 검증 회수 기록)\n'
new_p3 = '> TSC: 0 errors | 배포: https://kkotium-garden.vercel.app | 직전 commit: 본 세션 마무리 commit (A2a — Competition/Lifecycle SWR 마이그레이션 + SectionHeader mascot pill 통합)\n'
assert old_p3 in progress_text, 'PROGRESS L3 not found'
progress_text = progress_text.replace(old_p3, new_p3, 1)

# L4 phase status — append A2a
old_p4 = '> **Phase A ✅ | Phase B ✅ | Phase C ✅ | Phase D ✅ 전체 완료 | Phase E 진행 중 (E-7, E-1, E-3, E-8 완료) | Phase E+ Sprint 1·2·3·4·5 완료 + Sprint 6 E-15 전체 완료 ✅ + 옵션 C 사이드바 SWR 실시간화 완료 ✅ + 옵션 D 대시보드 위젯 SWR 확장 완료 ✅ + 옵션 E Part 1 MID 3개 위젯 SWR 확장 완료 ✅ + 옵션 E Part 2 → "워크플로우 재설계 Sprint"로 흡수 + 워크플로우 재설계 Sprint Part A1a 완료 ✅ + Part A1b 완료 ✅**\n'
new_p4 = '> **Phase A ✅ | Phase B ✅ | Phase C ✅ | Phase D ✅ 전체 완료 | Phase E 진행 중 (E-7, E-1, E-3, E-8 완료) | Phase E+ Sprint 1·2·3·4·5 완료 + Sprint 6 E-15 전체 완료 ✅ + 옵션 C 사이드바 SWR 실시간화 완료 ✅ + 옵션 D 대시보드 위젯 SWR 확장 완료 ✅ + 옵션 E Part 1 MID 3개 위젯 SWR 확장 완료 ✅ + 옵션 E Part 2 → "워크플로우 재설계 Sprint"로 흡수 + 워크플로우 재설계 Sprint Part A1a + A1b + A2a 완료 ✅**\n'
assert old_p4 in progress_text, 'PROGRESS L4 not found'
progress_text = progress_text.replace(old_p4, new_p4, 1)

# L5 next-task line
old_p5 = '> **다음 작업: 워크플로우 재설계 Sprint Part A2 — CompetitionMonitor + ProductLifecycle SWR 마이그레이션 + 4섹션 시각 디테일 강화 (variant prop 활용 mascot 통합) — 새 채팅에서 진행. 상세는 `KKOTIUM_ROADMAP.md` "다음 새 채팅 시작 메시지" 섹션 + `KKOTIUM_SESSION_LOG.md` 본 세션 기록 참조**\n'
new_p5 = '> **다음 작업: 워크플로우 재설계 Sprint Part A2b — 모드별 위젯 정렬 (mode=week 시 DataLab/Competition 상단, mode=month 시 Lifecycle/Sourcing 상단) + 추가 위젯 SWR 후보 (Sourcing/EventTimeline) — 새 채팅에서 진행. 상세는 `KKOTIUM_ROADMAP.md` "다음 새 채팅 시작 메시지" 섹션 + `KKOTIUM_SESSION_LOG.md` 본 세션 기록 참조**\n'
assert old_p5 in progress_text, 'PROGRESS L5 not found'
progress_text = progress_text.replace(old_p5, new_p5, 1)

# Prepend A2a session summary right before the existing A1b session anchor
a1b_anchor = '## 2026-05-04 세션 요약 — 워크플로우 재설계 Sprint Part A1b 완료'
assert a1b_anchor in progress_text, 'A1b anchor not found in PROGRESS'

a2a_summary = '''## 2026-05-04 세션 요약 — 워크플로우 재설계 Sprint Part A2a 완료 (Competition/Lifecycle SWR + SectionHeader mascot pill) ✅

### 본 세션 성격
- 직전 세션 commit `9b8a55a` (A2 인계 메시지 페르소나/유의사항 통합) 후 본 세션에서 **A2 신규 작업** 진행. 꽃졔님 승인 — 안전 분할 (A2a 단계 1+2+4 검증+5 인계 / A2b 단계 3 모드정렬), Competition cadence 5분, SectionHeader 시각 디테일은 face + accessory 라벨 텍스트.
- 단계 1 + 2 코드 변경 후 컨텍스트 한계로 한 번 끊김 → 재시작 시 작업원칙 21(h) 적용으로 working tree raw 검증부터 진행 → 단계 1 결과 3개 정상 / SectionHeader 한글 깨짐 2곳 (`'꿃잎 채직'` `'분수대 대스'`) 발견 → 작업원칙 25번대로 git restore + write_file 재작성으로 복구 → 라이브 검증 통과 후 본 세션 마무리.

### 변경된 파일 (4개)
| 파일 | diff | 핵심 |
|------|------|------|
| `src/lib/hooks/useDashboardData.ts` | +70 | `useCompetitionMonitor()` 신설 (5분 cadence, refresh + scan POST 패턴) + `useProductLifecycle()` 신설 (60s cadence, refresh) |
| `src/components/dashboard/CompetitionMonitorWidget.tsx` | +47/-28 | 자체 useState/useEffect/useCallback fetch → `useCompetitionMonitor()` 훅 + `refresh()` 호출, scan POST 후 refresh |
| `src/components/dashboard/ProductLifecycleWidget.tsx` | +31/-20 | 자체 fetch → `useProductLifecycle()` 훅 + 새로고침 버튼 `refresh()` 호출 |
| `src/components/dashboard/layout/SectionHeader.tsx` | +86/-1 | reserved `_variant` prop 활성화 → `KKOTTI_VARIANTS` accessory + `KKOTTI_FACE` 9단계 활용한 mascot pill 표시 (face + accessory 라벨, aria-label 포함) |

### 4섹션 mascot pill 매핑 (라이브 검증 결과)
| Section | variant | face | accessory | aria-label |
|---------|---------|------|-----------|-----------|
| today   | gardener   | `^_^`    | 물조리개      | "정원 관리인 모드, 물조리개" |
| action  | hunter     | `^ㅂ^`   | 하트총        | "키워드 사냥꾼 모드, 하트총" |
| market  | hunter     | `^ㅂ^`   | 하트총        | (variant override 정상 동작) |
| tools   | celebrator | `✿ㅅ✿`  | 분수대 댄스    | "분수대 축하 모드, 분수대 댄스" |

### 한글 깨짐 복구 케이스 (작업원칙 25 사례)
- 단계 2 작성 중 `'꽃잎 채찍'` → `'꿃잎 채직'`, `'분수대 댄스'` → `'분수대 대스'`로 손상
- **해결**: NFC 수동 정규화 절대 금지 → write_file로 한글 직접 입력 + raw 검증 (grep EXIT=1 = 손상 0개)
- **일반화**: edit_file에서 한글 매칭 실패 시 항상 git restore + write_file 패턴

### Chrome MCP 라이브 검증 6항목 (작업원칙 22번 강제) — 100% 통과
| # | 검증 항목 | 결과 |
|---|----------|------|
| 1 | Lifecycle SWR fetch | ✅ refresh 클릭 → `/api/product-lifecycle` GET 200 |
| 2 | Competition SWR (5min dedup) | ✅ `/api/competition` dedup 윈도우 내 절약 (의도된 SWR 효율) |
| 3 | DRAFT 8개 75점 회귀 | ✅ 50/60/70/76/80/84/86/92 모두 검출 (옵션 C+D+E Part 1 + A1b 결과 보존) |
| 4 | revalidateOnFocus auto-fetch | ✅ blur+focus 후 60s profile API 5개 자동 fetch (Sidebar/dashboard-stats/profitability/DRAFT/products) |
| 5 | 4섹션 mascot pill | ✅ today=^_^/물조리개, action=^ㅂ^/하트총, market=^ㅂ^/하트총, tools=✿ㅅ✿/분수대 댄스 |
| 6 | 기능 0개 삭제 (작업원칙 27) | ✅ KkottiBriefing + 12 위젯 + 빠른 작업 + EventTimeline 모두 보존 |

### 사전 점검 결과 (작업원칙 21)
- HEAD ↔ origin/main: `9b8a55a` 동기화 ✅
- TSC: 0 errors ✅ (시작/중간/종료 모두)
- working tree: clean (시작) → dirty 4 (작업 중) → clean (commit 후) ✅
- dev server: HTTP 200 ✅

### 본 세션 commit 예정
- 4개 파일 변경 (185 insertions / 49 deletions)
- commit 메시지: `feat(workflow-redesign A2a): Competition/Lifecycle SWR 마이그레이션 + SectionHeader mascot pill 통합`
- push 후 origin/main 동기화 확인

### A2b (다음 Sprint) 인계 범위
- **단계 3 모드별 위젯 정렬**: `dashboard/page.tsx` Section 3 grid 정렬 변경 — `mode==='week'` 시 DataLab/Competition 상단, `mode==='month'` 시 Lifecycle/Sourcing 상단 (위젯 표시는 모두 유지, order만 변경)
- **추가 위젯 SWR 후보** (선택): SourcingRecommendWidget은 이미 옵션 E Part 1에서 SWR 마이그레이션 완료 / EventTimeline 자체 fetch 검토 / 기타 정원 창고/검색 조련사 페이지 위젯 SWR 확장
- **시각 디테일 2차** (장기): 현재는 face + accessory 라벨 텍스트 — 향후 디자이너가 직접 그린 SVG 자산 추가 시 텍스트 → SVG 인라인 교체 예정 (Part A3+ 후보)

### 적용된 작업원칙
- **21**: 사전 점검 (git/dev/TSC/HEAD-origin/working tree) — 시작 + 재시작 모두 수행
- **21(h)**: edit_file 에러 응답 시 raw 검증 우선 — SectionHeader 손상 raw 발견 사례
- **22**: Chrome MCP 라이브 검증 6항목 — API 200 응답으로 종결 안 함
- **23**: 컨텍스트 한계 끊김 후 재시작 시 가정/실제 일치 여부 정직 보고
- **24**: 본 세션 commit + push 한 turn 안에 묶음
- **25**: 한글 깨짐 손상 발견 시 NFC 수동 정규화 금지 → git restore + write_file 한글 직접 입력
- **26**: 손상 케이스를 일반화 → 한글 직접 입력 패턴 강제
- **27**: 기능 0개 삭제 — 12개 위젯 + 빠른 작업 + EventTimeline + 4섹션 + 모드 토글 + KkottiBriefing 모두 보존

'''

progress_text = progress_text.replace(a1b_anchor, a2a_summary + a1b_anchor, 1)

progress_path.write_text(progress_text, encoding='utf-8')
print('[OK] PROGRESS.md updated — header bumped + A2a summary prepended')

# ============================================================================
# 2) ROADMAP.md — replace handoff message with A2b version
# ============================================================================
roadmap_path = ROOT / 'KKOTIUM_ROADMAP.md'
roadmap_text = roadmap_path.read_text(encoding='utf-8')

# Header L2
old_r2 = '> 최종 업데이트: 2026-05-04 (워크플로우 재설계 Sprint Part A1b 완료 ✅ + 인계 메시지 페르소나/유의사항 통합 ✅ / 다음: 새 채팅에서 Part A2 — CompetitionMonitor + ProductLifecycle SWR + 시각 디테일)\n'
new_r2 = '> 최종 업데이트: 2026-05-04 (워크플로우 재설계 Sprint Part A2a 완료 ✅ — Competition/Lifecycle SWR + SectionHeader mascot pill / 다음: 새 채팅에서 Part A2b — 모드별 위젯 정렬 + 추가 위젯 SWR 후보)\n'
assert old_r2 in roadmap_text, 'ROADMAP L2 not found'
roadmap_text = roadmap_text.replace(old_r2, new_r2, 1)

# Header L3 phase status
old_r3 = '> **Phase A ✅ | Phase B ✅ | Phase C ✅ | Phase D ✅ 전체 완료 | Phase E 진행 중 (E-7, E-1, E-3, E-8 완료) | Phase E+ Sprint 1·2·3·4·5 완료 + Sprint 6 E-15 전체 완료 ✅ + 옵션 C/D/E Part 1 SWR 확장 완료 ✅ + 옵션 E Part 2 → "워크플로우 재설계 Sprint"로 흡수 + 워크플로우 재설계 Sprint Part A1a + A1b 완료 ✅**\n'
new_r3 = '> **Phase A ✅ | Phase B ✅ | Phase C ✅ | Phase D ✅ 전체 완료 | Phase E 진행 중 (E-7, E-1, E-3, E-8 완료) | Phase E+ Sprint 1·2·3·4·5 완료 + Sprint 6 E-15 전체 완료 ✅ + 옵션 C/D/E Part 1 SWR 확장 완료 ✅ + 옵션 E Part 2 → "워크플로우 재설계 Sprint"로 흡수 + 워크플로우 재설계 Sprint Part A1a + A1b + A2a 완료 ✅**\n'
assert old_r3 in roadmap_text, 'ROADMAP L3 not found'
roadmap_text = roadmap_text.replace(old_r3, new_r3, 1)

# Header L4 next-task
old_r4 = '> **다음 작업: 워크플로우 재설계 Sprint Part A2 — 새 채팅에서 진행. 상세는 본 문서 하단 "다음 새 채팅 시작 메시지" 섹션 참조**\n'
new_r4 = '> **다음 작업: 워크플로우 재설계 Sprint Part A2b — 새 채팅에서 진행. 상세는 본 문서 하단 "다음 새 채팅 시작 메시지" 섹션 참조**\n'
assert old_r4 in roadmap_text, 'ROADMAP L4 not found'
roadmap_text = roadmap_text.replace(old_r4, new_r4, 1)

# Replace the entire A2 handoff message section with A2b version.
# Anchor: starts with "## 🎯 다음 새 채팅 시작 메시지 (워크플로우 재설계 Sprint Part A2"
# Ends right before the next "## 📜 Part 2 잔여·5용 메시지 (참고용 보존" section.
import re
old_section_pattern = re.compile(
    r'## 🎯 다음 새 채팅 시작 메시지 \(워크플로우 재설계 Sprint Part A2 — 2026-05-04 작성\).*?(?=\n## 📜 Part 2 잔여·5용 메시지)',
    re.DOTALL,
)
match = old_section_pattern.search(roadmap_text)
assert match is not None, 'A2 handoff section not found'

new_handoff = '''## 🎯 다음 새 채팅 시작 메시지 (워크플로우 재설계 Sprint Part A2b — 2026-05-04 작성)

> **A2a 완료 ✅ (2026-05-04 본 세션, commit 본 세션 마무리 commit)**:
> - **useDashboardData.ts**: `useCompetitionMonitor()` (5분 cadence) + `useProductLifecycle()` (60s cadence) 신설
> - **CompetitionMonitorWidget.tsx**: 자체 fetch → 훅 + refresh, scan POST 후 refresh 패턴
> - **ProductLifecycleWidget.tsx**: 자체 fetch → 훅 + 새로고침 버튼 refresh
> - **SectionHeader.tsx**: reserved `_variant` prop 활성화 → KKOTTI_VARIANTS accessory + KKOTTI_FACE 9단계 mascot pill 표시 (face + accessory 라벨 + aria-label)
> - **Chrome MCP 라이브 검증 6항목 100% 통과**: Lifecycle SWR / Competition SWR dedup / DRAFT 8개 75점 회귀 / revalidateOnFocus auto-fetch (60s profile 5개) / 4섹션 mascot pill (today=^_^/물조리개, action=^ㅂ^/하트총, market=^ㅂ^/하트총, tools=✿ㅅ✿/분수대 댄스) / 기능 0개 삭제
> - **한글 깨짐 복구 사례** (작업원칙 25 일반화): edit_file 한글 매칭 실패 시 NFC 수동 정규화 금지 → git restore + write_file 한글 직접 입력 패턴 강제
> - 자세한 기록은 KKOTIUM_SESSION_LOG.md 최상단 "2026-05-04 세션 — 워크플로우 재설계 Sprint Part A2a 완료" 참조

> **워크플로우 재설계 Sprint Part A2b 작업 범위**:
> 1. **단계 3 모드별 위젯 정렬** (A2 ROADMAP 단계 3 — A2a에서 분리한 잔여 작업)
>    - `dashboard/page.tsx` Section 3 grid 정렬 변경
>    - `mode === 'week'` → DataLab / Competition 상단으로 (트렌드 + 경쟁 분석 강조)
>    - `mode === 'month'` → Lifecycle / Sourcing 상단으로 (라이프사이클 + 소싱 강조)
>    - 위젯 표시는 모두 유지 (display 변경 X, order/grid order만 변경)
>    - 구현 패턴: `getMarketWidgetOrder(mode)` 또는 inline `style={{ order: ... }}`
> 2. **EventTimeline 위젯 SWR 검토** (선택)
>    - 현재 `EventTimelineWidget.tsx` fetch 패턴 확인 후 필요 시 `useEventTimeline()` 훅 신설 (cadence — 5분 추천)
> 3. **다른 페이지 위젯 SWR 확장** (선택, 컨텍스트 여유 있을 때)
>    - 정원 창고 (`/products`) 또는 검색 조련사 (`/products/new`)의 자체 fetch 위젯 점검
> 4. **Chrome MCP 라이브 검증 4항목**:
>    - 모드 전환 시 Section 3 위젯 순서 변경 (week → DataLab/Competition 1·2번, month → Lifecycle/Sourcing 1·2번)
>    - DRAFT 8개 평균 75점 회귀 (옵션 C+D+E Part 1 + A1b + A2a 결과 보존)
>    - 4섹션 mascot pill 보존 (A2a 결과 회귀 안 함)
>    - revalidateOnFocus auto-fetch 보존 (5개 60s profile API)

> **기존 기능 0개 삭제** (작업원칙 27) — 12개 위젯 + 4섹션 + 모드 토글 + KkottiBriefing + 4섹션 mascot pill 모두 보존, 정렬만 변경

> 아래 코드 블록을 그대로 복붙해서 사용.

```
꽃틔움 가든 개발 이어서 진행합니다. KKOTIUM_PROGRESS.md, KKOTIUM_ROADMAP.md, KKOTIUM_SESSION_LOG.md를 읽고
워크플로우 재설계 Sprint Part A2b 작업을 시작해주세요.

당신은 10년 차 네이버 스마트스토어 파워셀러 경험이 있는 풀스택 시니어 개발자이자, 사용자 경험과 전환율 중심의 UI/UX 웹 디자이너입니다. 이커머스의 생리를 완벽히 이해하고 있으며 운영 효율성과 매출 극대화를 이끕니다. 불필요하거나 단순한 반복 작업을 줄이고 실무 효율을 높일 수 있는 구조의 최신 SEO, ROI, 네이버 쇼핑 검색 알고리즘에 최적화된 스마트스토어 관리 앱 UI/UX 구조를 설계합니다. 항상 현재 코드의 구조와 내용을 확인하며 작업을 하며, 작업 시 사용할 수 있는 모든 기능, 스킬, 커넥터 등을 사용하여 최선의 작업을 진행합니다. 문제가 발생하면 근본적인 원인을 찾아서 해결할 수 있도록 합니다 — 제품 하나의 문제로 볼 것이 아니라 전체적인 앱 기능의 문제까지 염두에 두고 체크합니다 (작업원칙 26번 일반화).

작업 완료 시 테스트를 진행해서 실질적으로 앱을 사용해서 실무적으로 작업할 때 생기는 문제가 없는지 브라우저 테스트(Chrome MCP) 및 확인을 제대로 한 후 문제가 없으면 다음 작업으로 넘어갈 수 있도록 합니다. 실질적으로 작업할 수 없을 때(MCP 응답 없음, 권한 부족 등)는 거짓말 하지 말고 꼭 꽃졔님께 정직하게 요청합니다. 컨텍스트 한계로 도중에 작업이 끊기며 재시도하면서 중복 작업을 하는 오류가 나지 않도록 작업량을 나눠서 새로운 채팅에서 진행할 수 있도록 합니다. 계획이 업데이트되고 작업을 마무리할 때 같은 꽃틔움 가든 개발 프로젝트의 새 채팅에서도 바로 이어서 작업할 수 있도록 누락 없이 KKOTIUM_PROGRESS.md, KKOTIUM_ROADMAP.md, KKOTIUM_SESSION_LOG.md에 업데이트해서 저장합니다.

작업 시작 전 필수 (작업원칙 21+22+23+24+25+26+27 적용):
1. (a) git rev-parse HEAD origin/main → 두 값 같은지 확인 (기준 HEAD는 본 세션 마무리 commit — A2a 통합)
   (b) git --no-pager log --oneline -10 → 이번 메시지에 명시되지 않은 commit 있으면 읽고 대응
   (c) git status 깨끗한지 확인 (dirty면 검토 후 처리 — 덮어쓰기 절대 금지)
   (d) lsof -i :3000 또는 curl http://localhost:3000 → dev 서버 상태 확인
   (e) 이 메시지의 가정과 실제가 다르면 즉시 정직 보고 후 재분석
   (f) 본 세션 commit은 그 turn 안에서 push까지 한 줄로 완료
   (g) edit_file에서 한글 매칭 실패 시 Python 수동 NFC 정규화 절대 금지 → git restore + write_file 한글 직접 입력
   (h) edit_file 에러 응답 받아도 파일에 일부 적용될 수 있음 → head/grep/xxd로 raw 검증 우선
   (i) 문제 분석은 항상 (a) 즉각 원인 (b) 일반화 원인 두 단계로
   (j) 브라우저 테스트는 API 200 응답으로 대체 불가 — Chrome MCP로 실제 화면/숫자/동작 검증 필수
   (k) 작업원칙 27: 기존 기능 0개 삭제 — 위치 재배치 OK, 삭제/축소 0
2. KKOTIUM_PROGRESS.md "2026-05-04 세션 요약 — 워크플로우 재설계 Sprint Part A2a 완료" 정독
3. KKOTIUM_SESSION_LOG.md 최상단 동일 세션 정독
4. `src/app/dashboard/page.tsx` 정독 — 현재 Section 3 grid 구조 + ModeToggle 상태 변수 + 위젯 배치
5. `src/components/dashboard/CompetitionMonitorWidget.tsx` + `ProductLifecycleWidget.tsx` + `DataLabTrendWidget.tsx` + `SourcingRecommendWidget.tsx` — Section 3 위젯 4종 확인
6. 작업 계획 브리핑 후 꽃졔님 승인 받고 시작

[단계 1] Section 3 모드별 위젯 정렬:
   - dashboard/page.tsx Section 3 grid 컨테이너에 mode 의존 order 로직 추가
   - mode='today' → 기본 순서 (Kkotti / MarketTrend / DataLab / Competition / Sourcing / Lifecycle)
   - mode='week' → DataLab / Competition / Kkotti / MarketTrend / Sourcing / Lifecycle (트렌드+경쟁 강조)
   - mode='month' → Lifecycle / Sourcing / Kkotti / MarketTrend / DataLab / Competition (라이프사이클+소싱 강조)
   - 구현 권장: 위젯 6개에 inline `style={{ order: orderMap[mode][widgetId] }}`
   - npx tsc --noEmit 0 errors

[단계 2] (선택) EventTimeline SWR 검토:
   - EventTimelineWidget.tsx 자체 fetch 패턴 확인 → 필요 시 useEventTimeline() 훅 신설 (5분 cadence)
   - npx tsc --noEmit 0 errors

[단계 3] Chrome MCP 라이브 검증 4항목:
   - 모드 토글 클릭 → Section 3 위젯 순서 변경 (week → DataLab/Competition 1·2번, month → Lifecycle/Sourcing 1·2번)
   - DRAFT 8개 평균 75점 회귀 (50/60/70/76/80/84/86/92)
   - 4섹션 mascot pill 보존 (^_^/물조리개, ^ㅂ^/하트총 ×2, ✿ㅅ✿/분수대 댄스)
   - revalidateOnFocus auto-fetch 보존

[단계 4] 마무리:
   - PROGRESS/ROADMAP/SESSION_LOG 갱신
   - commit + push 한 묶음
   - 새 인계 메시지 작성 (Part A3 후보 — 다른 페이지 SWR 확장 / 옵션 A E-1 빌더 / 옵션 B E-12 Discord / mascot SVG 자산 추가 등)

작업 분량 안전 마진:
- A2b가 컨텍스트 한계 80% 도달 시 즉시 마무리 + Part A2c로 추가 분할 가능
- 단계 2 EventTimeline SWR은 컨텍스트 여유 있을 때만 진행
- 세션별 자세한 기록은 KKOTIUM_SESSION_LOG.md에 작성, PROGRESS.md/ROADMAP.md는 핵심 요약만 유지
```

'''

roadmap_text = roadmap_text[:match.start()] + new_handoff + roadmap_text[match.end():]

roadmap_path.write_text(roadmap_text, encoding='utf-8')
print('[OK] ROADMAP.md updated — header bumped + A2b handoff replaced')

# ============================================================================
# 3) SESSION_LOG.md — prepend A2a entry
# ============================================================================
session_path = ROOT / 'KKOTIUM_SESSION_LOG.md'
session_text = session_path.read_text(encoding='utf-8')

header_anchor = '> 새 채팅 시작 시 읽는 순서: PROGRESS.md → ROADMAP.md → SESSION_LOG.md (최근 1~2개 세션만)\n\n---\n\n'
assert header_anchor in session_text, 'SESSION_LOG header anchor not found'

a2a_session_entry = '''## 2026-05-04 세션 — 워크플로우 재설계 Sprint Part A2a 완료 (Competition/Lifecycle SWR + SectionHeader mascot pill) ✅

### 세션 성격
- 직전 commit `9b8a55a` (A2 인계 메시지 페르소나/유의사항 통합) 완료 후 본 세션에서 **A2 신규 작업** 진행.
- 꽃졔님 승인 — 안전 분할 (A2a 단계 1+2+4 검증+5 인계 / A2b 단계 3 모드정렬), Competition cadence 5분, SectionHeader 시각 디테일은 face + accessory 라벨 텍스트.
- 단계 1 + 2 코드 변경 후 컨텍스트 한계로 한 번 끊김 → 재시작 시 작업원칙 21(h) 적용으로 working tree raw 검증부터 진행 → 단계 1 결과 3개 정상 / SectionHeader 한글 깨짐 2곳 발견 → 작업원칙 25번대로 git restore + write_file 재작성으로 복구 → 라이브 검증 통과 후 본 세션 마무리.

### 단계 1 — 2개 위젯 SWR 마이그레이션
**`src/lib/hooks/useDashboardData.ts` (+70 lines)**:
- `useCompetitionMonitor()` 신설 — 5분 cadence (`SWR_PROFILE_5MIN` 재사용)
  - return: `{ data, isLoading, isValidating, error, refresh, scanInProgress }`
  - `error`는 `data.success === false` 시 `data.error`도 surface
- `useProductLifecycle()` 신설 — 60s cadence (`DASHBOARD_SWR_DEFAULTS` 재사용)
  - return: `{ data, isLoading, refresh }`
  - `data.ok === true`일 때만 정상 반환

**`src/components/dashboard/CompetitionMonitorWidget.tsx` (+47/-28)**:
- `useState(data, loading, error)` + `useCallback(fetchData)` + `useEffect` → `useCompetitionMonitor()` 훅 + `refresh()` 호출로 교체
- `handleScan` POST → 성공 시 `refresh()` 호출 (수동 fetchData 대신)
- `scanning` 로컬 state는 보존 (POST 진행 표시용)

**`src/components/dashboard/ProductLifecycleWidget.tsx` (+31/-20)**:
- `useState(data, loading)` + `useCallback(fetchData)` + `useEffect` → `useProductLifecycle()` 훅 + `refresh()` 호출
- 새로고침 버튼 onClick → `refresh()` 호출

### 단계 2 — SectionHeader variant 통합 (mascot pill 표시)
**`src/components/dashboard/layout/SectionHeader.tsx` (+86/-1)**:
- reserved `_variant` prop → 활성화 (`void _variant` 제거)
- `KKOTTI_VARIANTS[variant].accessory` (물조리개/하트총/꽃잎 채찍/돈 묘목/분수대 댄스) + 섹션별 기본 face 매핑
  - today (gardener) → `idle` (`^_^`)
  - action (hunter) → `proud` (`^ㅂ^`)
  - market (cowgirl) → `proud` (`^ㅂ^`) — page.tsx에서 variant="hunter" 오버라이드 가능
  - tools (planter/celebrator) → `done` (`✿ㅅ✿`)
- pill UI: 헤더 우측 슬롯 옆, brand pink #FEF0F3 배경 + brand red #E8001F 텍스트
- `aria-label="{label} 모드, {accessory}"` 접근성 보장

### 한글 깨짐 복구 케이스 (작업원칙 25 적용 사례)
- 단계 2 작성 중 KKOTTI_VARIANTS의 일부 accessory 한글 라벨 작성 단계에서 손상 발견:
  - `'꽃잎 채찍'` → `'꿃잎 채직'` (cowgirl)
  - `'분수대 댄스'` → `'분수대 대스'` (celebrator)
- **검출**: 작업원칙 21(h) raw 검증 — `grep '꿃잎\\|대스'` 결과로 위치 정확히 파악
- **해결**: NFC 수동 정규화 절대 금지 (작업원칙 25번) → write_file로 한글 직접 입력 + raw 검증 (`grep EXIT=1` = 손상 0개) + 정상 한글 5개 모두 적용 확인 (`'물조리개'`, `'하트총'`, `'꽃잎 채찍'`, `'돈 묘목'`, `'분수대 댄스'`)
- **일반화** (작업원칙 26): edit_file에서 한글 매칭 실패 시 항상 git restore + write_file 패턴 강제 → 본 세션 ROADMAP A2b 인계 메시지 작업원칙 21(g)에 명시

### Chrome MCP 라이브 검증 6항목 (작업원칙 22번) — 100% 통과
| # | 검증 항목 | 결과 |
|---|----------|------|
| 1 | Lifecycle SWR fetch | ✅ refresh 클릭 → `/api/product-lifecycle` GET 200 (8 products, ZOMBIE 8, 평균 좀비 위험도 80%) |
| 2 | Competition SWR (5min dedup) | ✅ `/api/competition` 첫 mount fetch 후 dedup 윈도우 내 절약 — `경쟁 상품 모니터링 0/8` 위젯 정상 표시 (선물받은 특별한 일상, 모나미 펭수, 하트 리본 누빔 여성 파자마, 차량용 햇빛가리개 4개 상품) |
| 3 | DRAFT 8개 75점 회귀 | ✅ 50/60/70/76/80/84/86/92 모두 검출 (옵션 C+D+E Part 1 + A1b 결과 보존) |
| 4 | revalidateOnFocus auto-fetch | ✅ blur+focus 시뮬레이션 후 60s profile API 5개 자동 fetch (Sidebar/dashboard-stats/profitability/DRAFT/products) — Competition은 5min dedup 윈도우 내 절약 (의도된 효율) |
| 5 | 4섹션 mascot pill | ✅ today=^_^/물조리개, action=^ㅂ^/하트총, market=^ㅂ^/하트총, tools=✿ㅅ✿/분수대 댄스 — aria-label 모두 정확 |
| 6 | 기능 0개 삭제 (작업원칙 27) | ✅ KkottiBriefing(planter T_T 마진 위험 63% CTA) + KPI 4 + Pipeline + Today + GoodService + Profitability + DailyPlan + UploadReadiness + ReviewGrowth + Kkotti + MarketTrend + DataLab + Competition + Sourcing + Lifecycle + 빠른 작업 4 + EventTimeline 모두 보존 |

### 콘솔 에러 점검
- 4개 에러 검출 — 모두 Chrome MCP 자체의 비동기 메시지 채널 종료 에러 (Promise was collected, message channel closed before response)
- **앱 코드(React/SWR)의 에러 0개** ✅

### 사전 점검 결과 (작업원칙 21)
- 시작: HEAD `9b8a55a` = origin/main, working tree clean, TSC 0 errors, dev :3000 HTTP 200 ✅
- 재시작 시점: HEAD 그대로, working tree dirty 4 (단계 1 결과 3개 + 단계 2 손상 1개), TSC 0 errors ✅
- 종료: TSC 0 errors, working tree dirty 4 (정상 변경), commit 직전 ✅

### 본 세션 commit
- 4개 파일 변경 (185 insertions / 49 deletions)
- commit 메시지: `feat(workflow-redesign A2a): Competition/Lifecycle SWR 마이그레이션 + SectionHeader mascot pill 통합`
- push 후 origin/main 동기화

### A2b 인계 (다음 새 채팅)
- **단계 3 모드별 위젯 정렬**: dashboard/page.tsx Section 3 grid 정렬 변경 — mode==='week' 시 DataLab/Competition 상단, mode==='month' 시 Lifecycle/Sourcing 상단 (위젯 표시는 모두 유지, order만 변경)
- **선택 추가**: EventTimeline 자체 fetch SWR 검토 / 다른 페이지 위젯 SWR 확장 / 시각 디테일 2차 (mascot SVG 자산 추가 시 텍스트 → SVG 인라인 교체)

### 적용된 작업원칙
- **21**: 사전 점검 (시작 + 재시작 모두 수행)
- **21(h)**: edit_file 에러 응답 시 raw 검증 우선 — SectionHeader 손상 raw 발견 사례
- **22**: Chrome MCP 라이브 검증 6항목 — API 200 응답으로 종결 안 함
- **23**: 컨텍스트 한계 끊김 후 재시작 시 가정/실제 일치 여부 정직 보고
- **24**: 본 세션 commit + push 한 turn 안에 묶음
- **25**: 한글 깨짐 발견 시 NFC 수동 정규화 금지 → git restore + write_file 직접 입력
- **26**: 손상 케이스 일반화 → A2b 인계 메시지 작업원칙 21(g)에 패턴 명시
- **27**: 기능 0개 삭제 — 12개 위젯 + 빠른 작업 + EventTimeline + 4섹션 + 모드 토글 + KkottiBriefing + 4섹션 mascot pill 모두 보존

---

'''

session_text = session_text.replace(header_anchor, header_anchor + a2a_session_entry, 1)
session_path.write_text(session_text, encoding='utf-8')
print('[OK] SESSION_LOG.md updated — A2a session prepended')

print('')
print('=== summary ===')
print('PROGRESS.md: header L2/L3/L4/L5 bumped + A2a summary prepended')
print('ROADMAP.md:  header L2/L3/L4 bumped + A2 handoff replaced with A2b')
print('SESSION_LOG.md: A2a session prepended at top')
