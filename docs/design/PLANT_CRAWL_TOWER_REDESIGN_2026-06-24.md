# DESIGN BRIEF 2026-06-24 (rev31) - IMAGE-SPLIT-1(이미지 3분할 복원) · AI-PRIORITY-1(작업별 제공자 우선순위)

Authoring: DESKTOP -> CODE-CLI. SD-01 untouched. #45/#55/#62/#82/#155/#156/#157/#158/#159/#160/#161.
Baseline prod a262a3b (COPY-AUTO-2.x 종결·Gemini 새 키 env 라이브). 권위 리서치: docs/research/NAVER_PRODUCT_NAME_DIAGNOSIS_AND_HOOK_PHRASE_2026-06.md

> 직전 종결: COPY-AUTO-1/2/2.1/2.2 전부 라이브 검증(재오픈 0·신규 1·Anthropic 0). NAVER-APP-1 해결. rev28/29 "2.1 미배포" 오기재 정정 완료.

================================================================
## ★ IMAGE-SPLIT-1 - 씨앗심기 이미지 3분할 복원 [Code A · 독립 · 우선]
================================================================
### 회귀 확인 (Desktop 라이브 재확정, prod a262a3b, 명화 편집)
- 파일 입력 zone **1개뿐**(라벨 "추가이미지 최대 9장 · JPG,PNG,WebP · 10MB", multiple). 상세페이지 이미지 업로드란 **소실**. 대표는 업로드본 중 지정 추정.
- 과거엔 엑셀 양식에 맞춰 3분할이었으나 리팩터링 중 상세페이지 zone 누락된 회귀.

### 네이버 엑셀 양식 ↔ 3분할 매핑 (복원 목표)
| Zone | 엑셀 컬럼 | 개수 | 네이버 필드 | 성격 |
|---|---|---|---|---|
| ① 대표 썸네일 | 대표이미지 파일명 | 1 | representativeImage | 검색·목록 대표컷 |
| ② 추가 썸네일 | 추가이미지 파일명 | ≤9 | optionalImages(갤러리) | 썸네일 나머지 |
| ③ 상세페이지 이미지 | 상품상세정보(상세페이지) | n | detailContent(상세설명 HTML 삽입) | 긴 세로 콘텐츠 이미지(Firefly 3-plane 합성물) |
- ①② 썸네일(정사각 제품컷)과 ③ 상세페이지(긴 콘텐츠)는 네이버에서 저장위치·필드가 다름(갤러리 vs 상세설명 본문).

### 구현 (Code)
1. ★복원 우선(재발명 금지): `git log -p -- src/app/products/new/page.tsx` 등으로 상세페이지 업로드 zone 제거 커밋 추적 → 그 구조 복원.
2. 3 zone UI: 대표 썸네일(1) / 추가 썸네일(≤9) / 상세페이지 이미지(n) 분리. 폼 상태 3분할 — 현재 단일 업로드(additionalImages류)만 있으면 detailImages[] 추가, 대표 지정 로직 유지.
3. DB: 상세 이미지 필드 확인(명화는 이미 합성물 적재 — assets/detailImages 필드 존재 가능). 없으면 Prisma 마이그레이션(#150 DMMF allowlist 자동 반영).
4. 엑셀 매핑 미리보기: 3컬럼 모두 매핑 노출.
5. 네이버 발행 페이로드: ①②→이미지 갤러리, ③→상세설명 HTML.
6. **product-agnostic(#55)**: 전 상품 공통 3분할. tsc0/build0.
### 검증(Desktop, 배포 후)
- 명화 편집페이지 3 zone 라이브 표시 · 각 zone 파일입력 존재 · 엑셀 매핑 3컬럼 · 업로드본이 올바른 필드/스토리지에 적재(#92 3-step).

================================================================
## ★ AI-PRIORITY-1 - 작업별 제공자 우선순위 [Code B · 독립]
================================================================
운영자 의도: "Gemini가 문제없는 전제 하에, Gemini 결과가 더 도움되는 기능엔 Gemini 최우선." 작업 성격별로 Gemini-우선/Groq-우선 배치.

### 작업별 우선순위 배치 (확정)
| 작업 | 볼륨 | 품질민감 | 1순위 | 근거 |
|---|---|---|---|---|
| 훅·카피 생성(COPY-AUTO) | 낮음(캐시·40/일) | 높음 | Gemini→Groq | 한국어 정서 카피 품질·저볼륨 안전 |
| 상세 헤드라인·서브카피(HOOK-3) | 낮음 | 높음 | Gemini→Groq | 고객 노출 카피 |
| 실시간 키워드 추천/확장 | 높음 | 낮음 | Groq→Gemini | 속도·UI 즉시성 |
| 상품명 진단 보조 | 중 | 중 | Groq→Gemini | 빠른 응답 |
| MD 일괄·병렬 | 높음 | 중 | Groq→Gemini | 무료 43k/일 볼륨 |

### 구현 (Code) — 2단 롤아웃
1. 인프라: seo-workflow route에 `providerProfile` 도입. quality=[gemini,groq,anthropic*] / speed=[groq,gemini,anthropic*](기본). *anthropic은 allowPaidFallback 게이트 불변(#155 자동경로 도달 불가). 각 제공자 try/catch→실패시 다음 순서 폴백(체인 보존·graceful degrade). served 제공자 로그(튜닝용).
2. 배선: 카피/훅 호출부에 providerProfile 전달(값은 ★일단 speed). 키워드/실시간은 speed. **현행 무변화로 먼저 출하**.
3. ★활성화(카피/훅=quality 전환)는 **Gemini slot1 200 확인 후** 별도 커밋 한 줄. 지금은 금지.
- product-agnostic(#55): profile은 작업 속성. tsc0/build0.
### Gemini 상태 (활성화 게이트)
- slot1=신프로젝트(kkotium-gemini-1) 라이브. _2/_3 분리 운영자 진행 중(다른 계정/프로젝트로 동일 절차 → GEMINI_API_KEY_2/_3 교체+redeploy → 무료 쿼터 3배).
- [Code 선택·낮음] slot1 직접 smoke → 200/429 보고. 200이면 카피 quality 활성화 GO.

================================================================
## LANE PLAN (우선순위)
================================================================
1. IMAGE-SPLIT-1 (Code A·독립·우선) → Desktop 검증.
2. AI-PRIORITY-1 인프라 (Code B·독립) → Gemini slot1 200 확인 → 카피 quality 활성화.
3. Gemini _2/_3 분리 (운영자 진행 중).
4. 명화 backfill (운영자).
5. 명화 publish PUT <- backfill+reconcile+GO (#46/#124). ★NAVER 차단 해제됨.
→ Code A·B 상호 독립·동시 진행 가능.

================================================================
## BACKLOG SPECS (영구 #157)
================================================================
- NAVER-APP graceful 실패배너 강제검증(낮음). HOOK-3 아틀리에 이송. CR-1 폴리시(선택). NAME-DIAG-1.1 CLOSED.

================================================================
## PRINCIPLES
================================================================
- #162 (NEW): 작업별 AI 제공자 우선순위 = 품질민감·저볼륨 → Gemini우선 / 속도·고볼륨 → Groq우선. 인프라(라우팅)와 활성화(기본 프로파일 전환) 분리 — 활성화는 제공자 헬스 확인 후. anthropic 게이트 불변(#155).
- #161 자동발사 스킵은 발사직전 실제값 판정. #160 운영장애 즉시 표면화·#62 전역. #159 비동기 로드후 평가는 로드완료 게이트. #158 검증대상 정체 먼저확정. #157 브리프 rev 정정·SHA ground-truth. #156 키 env·운영자 직접. #155 자동경로 무료전용. #82 정직(MCP 행 보고·격리불가 명시). #55 product-agnostic. #45 Done=실측. #46/#124 발행 lock. SD-01 불가침.
- ★작업유의: 로컬 MCP(Control Chrome/filesystem) 4분 행 재발 시 #26 — 재시도 말고 Claude Desktop 재시작. 본 세션서 재시작으로 복구 확인.
