# DESIGN BRIEF 2026-06-24 (rev23) - COPY-AUTO-1 프리필 갭 FIX · GEMINI-RESTORE/COPY-AUTO-1 DONE(prod) · backups 제거

Authoring: DESKTOP -> CODE-CLI. SD-01 untouched. #43/#62/#82/#155/#156/#157.
Baseline prod d5c6dc0 (rev50). 권위 리서치: docs/research/NAVER_PRODUCT_NAME_DIAGNOSIS_AND_HOOK_PHRASE_2026-06.md
(rev23 메모: Filesystem MCP 다운으로 Desktop 미기록 → Code-CLI가 인-챗 핸드오프 기준으로 반영. #41 핑퐁.)

> 운영 메모(#157): 이 브리프는 단일 파일을 rev마다 덮어써서 과거 rev 상세가 유실될 수 있음(rev20 COPY-AUTO-1 상세가 rev21에서 소실 → Code가 정직 요청). 이후 **활성 작업 + 하단 'BACKLOG SPECS(영구)' 누적 보관** 원칙. 미착수 작업의 상세 스펙은 BACKLOG SPECS에 남긴다.

================================================================
## ★ COPY-AUTO-1 프리필 갭 - FIX (Code, 이번 세션 · prod 검증대기)
================================================================
증상(Desktop 라이브 재현): 신규 /products/new에서 상품명 입력 + 무료배송 기준 30,000(기본값) 존재에도 seoHook 자동 프리필 미발화(훅 빈칸·초안 배지 없음). 프리뷰는 통과했으나 실제 신규상품 플로우에서 안 뜸(#45 — 프리뷰 통과 ≠ 실측 통과).

원인/수정 (src/app/products/new/page.tsx):
- 기존 프리필 useEffect가 `copyPrefilledRef`로 **첫 발화 후 영구 잠금** → 로드/세팅 비동기 레이스로 한 번 잘못 잠기면 자가복구 불가. 데이터(카테고리/키워드/threshold) 도착 후 re-run 안 함.
- 수정: ref를 `hookTouchedRef`(운영자가 직접 입력/삭제한 순간만 latch)로 교체. latch 전에는 데이터 변경마다 **자가복구 재실행** — 비어 있거나 우리 초안을 들고 있는 동안 최선 템플릿 라인으로 계속 동기화. 운영자 편집/AI 적용/저장된 훅이 점유하면 더 이상 건드리지 않음.
- event_field는 threshold만으로 단독 생성: `buildTemplateCopy`는 null 반환 안 하고, `templateHookLine`이 event_field("{N}원 이상 무료배송")를 최우선 반환. 카테고리 불요. (이름만 있어도 톤 헤드라인으로 항상 비어있지 않은 라인 생성.)
- textarea onChange가 `hookTouchedRef=true` + 초안 배지 해제.

검증(Code 실측·preview dev): 상품명 입력 → seoHook "30,000원 이상 무료배송" + 초안 배지 즉시 표시 · 수동 편집 시 배지 해제 + 점유 이양 · 필드 비운 뒤 가격 변경에도 재프리필 안 함(점유 존중) · AI 네트워크 호출 0 · tsc0 · build0. ▶ Desktop은 prod 배포본에서 동일 재확인 요망(#45·#88, 캐시 hard-refresh 권장).

================================================================
## GEMINI-RESTORE - DONE (prod, rev49/50)
================================================================
- src/lib/gemini.ts env 기반 복원(`process.env.GEMINI_API_KEY`, 하드코딩 0). AI 체인: Groq(무료) → Gemini Flash(무료) → Anthropic(유료·최후, 명시적 액션만 #155).
- ⚠ 운영 관측(rev50): Gemini 키 3종 429-quota flagged — 무료 티어 쿼터 소진 정황. Groq 1차 무료 경로는 동작. (모니터 항목.)

================================================================
## COPY-AUTO-1 (기본) - DONE (prod, rev50 · 26c13b3)
================================================================
PURE `buildTemplateCopy` + templateHookLine + 진입 자동 프리필 + 초안 배지. 0원·AI 호출 0. (위 '프리필 갭 FIX'가 실 신규플로우 발화를 보강.)

================================================================
## SECRETS-GUARD - DONE (prod afb1476)
================================================================
- test_groq.py 실 Groq 키 하드코딩 → env 교체. SECURITY 문서 revoke 키 prefix만 레닥션. pre-commit 훅(키패턴+.env/.bak/.backup staging 차단) + 설치 스크립트. *.bak 129→0, stale 워크트리 8개 제거.
- ✅ Vercel #36 자가복구. 현재 트리 real-키 0·추적 시크릿 0(.env.example 제외).

### ★ 운영자 조치 (잔여)
1. 🟡 **노출 Groq 키 ROTATION (콘솔 확인만)**: 과거 노출 Groq 키는 **현재 코드 3슬롯에 없음(이미 교체 확인됨)** → 코드 조치 불요. 운영자는 Groq 콘솔에서 옛 키 revoke 여부만 확인.
2. ✅ #34 **backups/ 제거 완료(이번 세션)**: 운영자 GO → `git rm -r backups/20260202_215123/`(ProductFilters.tsx/page.tsx/route.ts 3개 추적파일) 제거·커밋. backups/ 추적 #43 재발 위험 해소.

================================================================
## LANE PLAN (우선순위)
================================================================
1. ✅ GEMINI-RESTORE (prod).
2. ✅ COPY-AUTO-1 기본 (prod).
3. ★ COPY-AUTO-1 프리필 갭 FIX (Code 완료 · Desktop prod 검증대기).
4. ✅ #34 backups 제거 (Code 완료). 운영자: Groq 옛 키 콘솔 revoke 확인.
5. COPY-AUTO-2 Zero-Touch (Code — 프리필 갭 검증 후 착수). 트리거=페이지 오픈(운영자 확정).
6. 명화 backfill (operator) → publish PUT (#46/#124).
7. HOOK-3 / CR-1 폴리시 — BACKLOG SPECS 참조.

================================================================
## BACKLOG SPECS (영구 — rev 덮어쓰기에도 유지 #157)
================================================================
- COPY-AUTO-2 (Zero-Touch 완전 자동초안): 트리거=**페이지 오픈**(운영자 확정·쿼터 안전). 첫 오픈 시 무료(Groq→Gemini) 1회 생성→캐시. Anthropic 절대 미사용(#155). 재진입 재호출 0. 가드레일: 자동 경로 `allowPaidFallback=false`, 일일 자동 캡.
- HOOK-3 (detail→온실 아틀리에 이송): 상세 헤드라인+서브카피를 아틀리에 상세작업으로 이송. 운영자 흐름 확정 후.
- CR-1 폴리시(선택): /crawl 40%+ 행 시각 변별 강화(현재 weight 800→900·동일 녹색이라 미묘). 배지/배경 추가 검토.
- NAME-DIAG-1.1: SEO-MATCH-1로 해소됨(공용 includesNormalized). CLOSED.

================================================================
## PRINCIPLES
================================================================
- #157: 설계 브리프는 활성작업 + 하단 BACKLOG SPECS(영구) 분리 보관 — rev 덮어쓰기로 미착수 스펙이 유실되지 않게. Code가 스펙 부재 시 추측 금지·요청(정직).
- #156 키는 env에만·신규키 운영자 직접 입력·Claude 키 미취급·.gitignore+훅 이중방어·유출키 영구폐기. #155 자동경로 무료 제공자 전용. #82 시크릿 스캔 정직·값 미노출. #43 백업파일 금지. #62 전역. #45 Done=실측. #88 완료=검증. SD-01 불가침.
