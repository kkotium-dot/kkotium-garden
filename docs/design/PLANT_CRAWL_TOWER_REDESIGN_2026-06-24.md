# DESIGN BRIEF 2026-06-24 (rev25) - COPY-AUTO-2 DONE(Code·preview검증) · COPY-AUTO-1 VERIFIED

Authoring: DESKTOP -> CODE-CLI. SD-01 untouched. #43/#45/#55/#62/#82/#155/#156/#157/#158.
Baseline prod 41f4d16 (code: COPY-AUTO-1 자가복구). 권위 리서치: docs/research/NAVER_PRODUCT_NAME_DIAGNOSIS_AND_HOOK_PHRASE_2026-06.md

================================================================
## ★ COPY-AUTO-2 - DONE (Code · preview 실측 통과 · prod 검증대기)
================================================================
Zero-Touch AI 카피, 트리거 = 페이지 오픈(운영자 확정·쿼터 안전). 무료 제공자만(#155).

구현 (src/app/products/new/page.tsx + src/app/api/ai/seo-workflow + src/app/api/products):
- 페이지 오픈 시 디바운스(1.4s, 핸드타이핑 mid-keystroke 발사 방지) 후 `/api/ai/seo-workflow`를 **1회** 호출(`aiAutoFiredRef`). `allowPaidFallback:false` 하드코딩 → Groq→Gemini만, **Anthropic 절대 미사용**.
- 적용 게이트: 운영자 미편집(hookTouchedRef false) + 우리 템플릿 초안 상태(`seoHook && !isDraft`면 skip)일 때만. AI event_field로 1회 교체 후 isDraft=false(초안 배지 해제). 인플라이트 중 운영자 편집 시 미적용.
- **캐시(상품 영속)**: seoHook → `hookPhrase`(Naver register가 읽는 정식 컬럼)로 저장. 3개 경로(DB 저장·네이버 발행 dbPayload, 임시저장 excelDraftPayload) 모두 + POST create(명시 화이트리스트라 hookPhrase 추가)·PUT(sanitizeProductWrite 스키마 화이트리스트=자동 통과). 로드(?edit=)는 p.hookPhrase→seoHook(기존 死코드 p.seoHook 교정). 로드된 훅=isDraft false라 두 effect 모두 bail → 재오픈 0 재호출.
- 일일 자동 캡: localStorage `copyAuto2:day` 카운터(40/일). 초과 시 자동 발사 skip(템플릿 초안 유지·수동 사냥 버튼 항상 가용).

검증 (Code 실측 · preview dev · 로컬 GROQ 3키+GEMINI, ANTHROPIC 키 없음):
- 신규 오픈+상품명 → 템플릿 초안 즉시 → 디바운스 후 `POST /api/ai/seo-workflow` **1회**(200, ~2.7s=Groq) → 훅 "2만원 이상 무료배송"(AI 자연어) 교체·배지 해제 ✓
- 네트워크에 **api.anthropic.com 호출 0** · seo-workflow 1회만 ✓
- 편집 점유(디바운스 전 훅 직접입력) → seo-workflow 호출 **0**·내 텍스트 유지 ✓
- ?edit= 재오픈(hookPhrase 보유 상품) → 훅 캐시 로드·seo-workflow 호출 **0** ✓ (POST create가 hookPhrase 영속함도 확인)
- tsc0 · build0(클린 빌드).
▶ Desktop prod 검증: 신규 첫 오픈 → 템플릿 즉시 → (무료 가용 시) AI 1회 갱신 · 재오픈 0 · Anthropic 0(네트워크) · 편집 점유 미갱신. 주의: prod Gemini 429 → Groq 경로 확인.

================================================================
## COPY-AUTO-1 - VERIFIED (prod 41f4d16) [DONE]
================================================================
Desktop 라이브 PASS: 상품명 입력 → seoHook 자동 "30,000원 이상 무료배송"·초안 배지·AI 호출 0 · 편집 시 점유 latch(hookTouchedRef) · 비운 뒤 미재프리필. copyPrefilledRef(영구잠금)→hookTouchedRef 자가복구 수정 정확. (지난 "미발화"는 검증오류=검색창 오입력, #158.)

================================================================
## LANE PLAN (우선순위)
================================================================
1. ✅ COPY-AUTO-1 (prod) · ✅ COPY-AUTO-2 (Code·preview검증, prod 검증대기).
2. ✅ #34 backups git rm (41f4d16). 운영자: Groq 옛 키 콘솔 revoke 확인만.
3. COPY-AUTO-2 검증 (Desktop, 배포 후).
4. 명화 backfill (operator) → publish PUT (#46/#124).
5. HOOK-3 / CR-1 폴리시 — BACKLOG SPECS 참조.

================================================================
## BACKLOG SPECS (영구 #157)
================================================================
- HOOK-3: detail 헤드라인+서브카피 → 온실 아틀리에 상세작업 이송. 운영자 흐름 확정 후.
- CR-1 폴리시(선택): /crawl 40%+ 행 시각 변별 강화(weight 800→900·동일 녹색 미묘). 배지/배경 검토.
- Gemini 무료 폴백 실사용: 키 별도 GCP 프로젝트 분리(현재 공유 쿼터 동시 429). 비차단.
- NAME-DIAG-1.1: SEO-MATCH-1로 CLOSED.

================================================================
## PRINCIPLES
================================================================
- #158: 라이브 DOM 검증 시 대상 요소 정체를 먼저 확정(라벨/placeholder)하고 단언 — "첫 text input" 폴백 등 잘못된 타깃 주입은 false negative를 낳는다(검색창 vs 상품명 혼동 사례). 검증 방법 자체도 검증 대상.
- #157 브리프=활성+BACKLOG SPECS(영구) 분리. #156 키 env 전용·운영자 직접입력·Claude 키 미취급. #155 자동경로 무료 제공자 전용·Anthropic 명시적 액션만. #82 정직·가짜 금지·데이터 없는 슬롯 미노출. #45 Done=실측(대상 정확히). #43 백업파일 금지. #62 전역. SD-01 불가침.
