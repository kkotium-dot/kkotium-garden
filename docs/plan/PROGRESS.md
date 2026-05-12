# KKOTIUM GARDEN — 프로젝트 진행 현황
> 최종 업데이트: 2026-05-12 (v3.1 FINAL 기획 점검 완료)
> 활성 계획: Smart Asset Workflow v3.1 FINAL (CTI + 12 골격 + Claude 디자인 통합)
> 폐기 계획: Sprint X (Gemini 제거 + 5섹션 일괄 템플릿, 2026-05-11 채택 후 익일 폐기)
> TSC: 0 errors | Production: https://kkotium-garden.vercel.app
> 다음 작업: Sprint 7-Diag MVP (진단 모듈 + CTI 8축 추론)

---

---
## 2026-05-12 v3.1 FINAL 채택

본 세션(docs-only commit)에서 다음 5개 MD 일괄 갱신:
- SESSION_LOG.md: v3.1 FINAL 기획 점검 entry 추가
- ROADMAP.md: Sprint X 인계 메시지 deprecated, Sprint 7-Diag 진입 메시지 활성화
- SPRINT_PLAN.md: Sprint 7 v3.1 FINAL 매트릭스 추가
- PRINCIPLES_LEARNED.md: 작업원칙 #38·#39·#40 추가
- PROGRESS.md: 본 entry 추가
- docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md: 신규 문서 보존

다음 세션 = Sprint 7-Diag MVP 코드 작업 진입.

---

---

## 핵심 인덱스

> **분할 이후 새 인덱스 (작업원칙 #31 (b), 2026-05-12)**
>
> - **작업원칙 #1~#25 (코드/UI/세션/보고)** → `docs/plan/PRINCIPLES_CODE.md`
> - **작업원칙 #26~#36 (학습된 패턴)** → `docs/plan/PRINCIPLES_LEARNED.md`
> - **Sprint 6/6.5/6-D/7/8/9+ 계획** → `docs/plan/SPRINT_PLAN.md`
> - **핵심 파일 경로 / 알려진 이슈 / SEO 인사이트 / 기술 패턴** → `docs/plan/REFERENCES.md`
>
> 본 파일 (PROGRESS.md)은 *현재 상태 스냅샷 + 진입점*만 유지합니다.

### 자주 참조하는 작업원칙 단축 인덱스

- [작업원칙 #26](PRINCIPLES_LEARNED.md) — IA 점검 + 고아 라우트 처리
- [작업원칙 #29](PRINCIPLES_LEARNED.md) — 한글 처리 절대 규칙 5가지
- [작업원칙 #29 (e++)](PRINCIPLES_LEARNED.md) — 사용자 닉네임 절대 규칙
- [작업원칙 #31](PRINCIPLES_LEARNED.md) — MD 의미 단위 자동 분할 + 인계 무결성
- [작업원칙 #32](PRINCIPLES_LEARNED.md) — TSC ≠ Production 빌드 검증
- [작업원칙 #33](PRINCIPLES_LEARNED.md) — useSearchParams Suspense 자동 점검
- [작업원칙 #34](PRINCIPLES_LEARNED.md) — 명백한 오류 파일 사용자 알림
- [작업원칙 #35](PRINCIPLES_LEARNED.md) — 한글 사전 분리 패턴
- [작업원칙 #36](PRINCIPLES_LEARNED.md) — Vercel deploy 검증 의무화
- [현재 앱 상태](#현재-앱-상태)
- [환경/메뉴/파이프라인](#환경--메뉴--파이프라인)

---

## 현재 앱 상태

| 항목 | 현황 |
|------|------|
| 전체 상품 | 8개 (모두 DRAFT) |
| 네이버 Commerce API | ok=true ✅ |
| 네이버 검색광고 API | ✅ (CUSTOMER_ID: 3755315) |
| 네이버 DataLab API | ✅ ID: F7Hga62gDOYxZ3KRtLTL |
| Discord | 5채널 ✅ |
| TSC | 0 errors ✅ |
| Vercel 배포 | https://kkotium-garden.vercel.app ✅ |
| GitHub | https://github.com/kkotium-dot/kkotium-garden |
| Phase A~D | 전체 완료 ✅ |
| Phase E | 진행 중 (E-7, E-1, E-3, E-8 완료) |
| Phase E+ | Sprint 1·2·3·4·5 완료 |
| 카카오 비즈니스 채널 | 꽃틔움 KKOTIUM (`_xkfALG`) ✅ |
| 도매꾹 Private API | 28개 전체 권한 발급 ✅ (Sprint 8 보류 트랙) |
| Solapi 알림톡 | 키 미입력 (월 50건+ 시 활성화) |

### 카카오 비즈니스 채널 정보

```
채널명: 꽃틔움 KKOTIUM
검색용 ID: 꽃틔움
채널 Public ID: _xkfALG
채널 URL: http://pf.kakao.com/_xkfALG
채팅 URL: http://pf.kakao.com/_xkfALG/chat
카테고리: 쇼핑 > 생활용품
```

### AI API 키 현황 (2026-04-30 기준)

| 서비스 | 환경변수명 | 상태 |
|---|---|---|
| **Groq** (1순위) | GROQ_API_KEY (lrltQb) | 정상 ✅ |
| **Groq** | GROQ_API_KEY_3 (3IGN7i) | 정상 ✅ |
| Groq | GROQ_API_KEY_2 (3pEakT) | 401 Invalid (Vercel 삭제 권장) |
| Gemini | GEMINI_API_KEY/_2/_3 | 429 quota 초과 (운영 기여 0) |
| xAI Grok | XAI_API_KEY | 크레딧 미배정 |
| Perplexity | PERPLEXITY_API_KEY | Pro 만료 (401, 비활성) |

**fallback 순서**: Groq round-robin (3키, 401/403/JSON parse safety) → Gemini round-robin → Anthropic last-resort

---

---

## 환경 / 메뉴 / 파이프라인

### 환경 정보

```
앱 루트:    /Users/jyekkot/Desktop/kkotium-garden
Dev 서버:   http://localhost:3000
Dev 로그:   /tmp/dev.log
프로덕션:   https://kkotium-garden.vercel.app
DB:         Supabase PostgreSQL (doxfizicftgtqktmtftf)
스토어:     꽃틔움 KKOTIUM (smartstore.naver.com/kkotium)
GitHub:     https://github.com/kkotium-dot/kkotium-garden
Vercel:     vercel.com/kkotjyes-projects/kkotium-garden
카카오채널: 꽃틔움 KKOTIUM (pf.kakao.com/_xkfALG)
```

### 사이드바 메뉴 구조 (9개 섹션, 2026-05-08 확정)

```
GARDEN: 정원 일지 (/dashboard) ✅
HUNT:   꿀통 사냥터 (/crawl) ✅ + 소싱 보관함 (/crawl?tab=history) ✅ [Z-3b]
PLANT:  씨앗 심기 (/products/new) ✅ 신버전 6탭 통합 (수정 모드 ?edit=ID 포함)
TEND:   정원 창고 (/products) ✅
        검색 조련사 (/naver-seo) ✅ v3 인라인 편집
        좀비 부활소 (/products/reactivation) ✅
ORDERS: 주문 관리 (/orders) ✅
OPS:    인서트 카드 (/ops/insert-card) ✅
TOOLS:  거래처 명단 (/settings/suppliers) ✅
        배송 레시피 (/settings/shipping) ✅
        공급사 열쇠방 (/settings/supplier-login) ✅
        카카오 채널 (/settings/kakao) ✅
        네이버 기본값 (/naver-settings) ✅
```

### 사이드바 미등록 라우트 (정리 대상 — Z-3c'/Z-3e)

- `/products/[id]/edit` — 외부 진입 0건 (구버전 ProductForm.tsx 582줄, 메인 흐름은 `/products/new?edit=ID`로 통합됨)
- `/products/upload` — CSV 일괄 업로드 (새싹 단계에서 권장 안 함, 리서치 3번)
- `/products/sourced` — 카드 그리드 뷰 (사이드바 미등록)
- `/products/out-of-stock` — `:158`이 dead route `/products/[id]/edit`를 가리킴 (수정 필요)
- 백업 파일 67개 (`*.bak*`, `*.backup*`, `*.v[0-9]*`)

### 앱 파이프라인

```
꿀통 사냥터 (크롤링) → 소싱 보관함 (SOURCED→PENDING→REGISTERED)
→ 씨앗 심기 (등록/편집, 6탭 통합)
→ 정원 창고 (목록/인라인 편집)
→ 검색 조련사 (SEO 점수 + AI 최적화 + 인라인 편집)
→ 엑셀 다운로드 또는 네이버 직접 등록 (Commerce API)
→ 대시보드 (실적/꼬띠추천/이벤트)
→ 주문 관리 (발주확인/송장등록 + 알림톡)
→ 좀비 부활소 (재등록)
```

---

---

## 네이버 API 현황

| API | 상태 |
|-----|------|
| 토큰 발급 (bcryptjs) | ✅ |
| 채널 정보 | ✅ 꽃틔움 KKOTIUM |
| 주문 조회 / 발주 확인 / 송장 등록 | ✅ |
| 상품 실시간 동기화 | ✅ |
| 주소록 조회 | ✅ |
| DataLab 트렌드 | ✅ |
| 검색광고 키워드 검색량 | ✅ (CUSTOMER_ID: 3755315) |
| 리뷰 API | ❌ 미지원 (GitHub #1582) |

---

## Vercel 환경변수

```
DB:         DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
Naver:      NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, NAVER_PROXY_URL
Naver SEO:  NAVER_SEARCHAD_API_KEY, NAVER_SEARCHAD_SECRET_KEY, NAVER_SEARCHAD_CUSTOMER_ID
DataLab:    NAVER_DATALAB_CLIENT_ID, NAVER_DATALAB_CLIENT_SECRET
Discord:    DISCORD_WEBHOOK_ORDERS, _STOCK, _DAILY, _WEEKLY, _KKOTTI
AI:         GROQ_API_KEY, GROQ_API_KEY_3 (실사용 2개), GEMINI_API_KEY/_2/_3 (quota 초과)
Cloudinary: CLOUDINARY_CLOUD_NAME, _API_KEY, _API_SECRET
Etc:        CRON_SECRET, NEXT_PUBLIC_APP_URL
향후 (E-13B): SOLAPI_API_KEY, SOLAPI_API_SECRET, KAKAO_PF_ID, SENDER_PHONE_NUMBER
향후 (E-12): DISCORD_WEBHOOK_REVIEW
```

---

---

## 참고 문서 인덱스

### docs/research/
- `SPROUT_TO_POWER_SELLER_WORKFLOW_2026_05.md` — 본 세션 신규 (15개 핵심 + 단계별 체크리스트)
- `COMMERCE_API_403_ROOT_CAUSE.md`
- `COMMERCE_API_ORDER_DIAGNOSIS.md`

### docs/plan/archive/
- `README.md` — archive 폴더 인덱스 (분할 정책 + 검색 패턴 + 파일명 규칙)
- `PROGRESS_2026Q2_MAY.md` — 5월 누적 PROGRESS 헤더 이력 (작업원칙 #31 분할, 동결)
- `ROADMAP_2026Q2_MAY.md` — deprecated 인계 메시지 9개 + Phase A/B/C 완료 이력 (동결)
- `SESSION_LOG_2026Q2_MAY.md` — 2026-05-01 ~ 2026-05-06 세션 24+ 건 (동결)
- `SESSION_LOG_2026-05.md` — 2026-05-06 ~ 2026-05-08 세션 9건 (두 번째 분할 2026-05-11, 동결)

### 프로젝트 파일 (외부 리서치)
- `260413-꽃틔움 가든 개선안 검증과 2026년 전략 로드맵`
- `스마트스토어 리뷰 관리와 반품안심케어, 무엇을 먼저 할 것인가`
- `네이버 스마트스토어 파워셀러의 2025-2026 실전 무기 총정리`
- `카카오 비즈니스 채널 2025-2026 완전 가이드`
- `Smartstore_Sprout_to_Power_Seller_Workflow_Optimization_Guide__May_2026.md`
