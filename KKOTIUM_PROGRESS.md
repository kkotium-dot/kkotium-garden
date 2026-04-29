# KKOTIUM GARDEN — 프로젝트 진행 현황
> 최종 업데이트: 2026-04-27 (Phase E+ Sprint 2 완료 — E-2A 리뷰 성장 트래커 + E-2B 주문 페이지 리뷰 유도 뱃지)
> TSC: 0 errors | 배포: https://kkotium-garden.vercel.app
> **Phase A ✅ | Phase B ✅ | Phase C ✅ | Phase D ✅ 전체 완료 | Phase E 진행 중 (E-7, E-1, E-3, E-8 완료) | Phase E+ Sprint 1·2 완료 (E-4, E-2C, E-2A, E-2B)**
> 전략 참고문서: `260413-꽃틔움 가든 개선안 검증과 2026년 전략 로드맵` (프로젝트 파일)
> 리서치 참고문서 (2026-04-16 세션):
>   1. `스마트스토어 리뷰 관리와 반품안심케어, 무엇을 먼저 할 것인가`
>   2. `네이버 스마트스토어 파워셀러의 2025-2026 실전 무기 총정리`
>   3. `카카오 비즈니스 채널 2025-2026 완전 가이드`
>   4. `스마트스토어 셀러의 무료 알림톡, 정말 가능한가`
## 이 파일의 역할

> **KKOTIUM_PROGRESS.md** = 현재 상태 + 작업 원칙 + 완료 이력 + 기술 레퍼런스
> 새 채팅 시작 시 **가장 먼저 읽는 파일**
>
> **새 채팅 시작 순서:**
> 1. `KKOTIUM_PROGRESS.md` 전체 읽기
> 2. `KKOTIUM_ROADMAP.md` 전체 읽기
> 3. 해당 TASK 관련 코드 파일 read_file
> 4. 꽃졔님 승인 후 작업 시작
> 5. 완료 후 두 파일 모두 업데이트

---

## 현재 앱 상태 (2026-04-16)

| 항목 | 현황 |
|------|------|
| 전체 상품 | 8개 |
| 네이버 Commerce API | ok=true ✅ |
| 네이버 검색광고 API | ✅ 키워드 검색량 실시간 |
| 네이버 DataLab API | ✅ ID: F7Hga62gDOYxZ3KRtLTL |
| Discord | 5채널 ✅ |
| TSC | 0 errors ✅ |
| Vercel 배포 | ✅ https://kkotium-garden.vercel.app |
| GitHub | https://github.com/kkotium-dot/kkotium-garden |
| Phase A~D | 전체 완료 ✅ |
| Phase E | 진행 중 (E-7, E-1, E-3, E-8 완료) |
| Phase E+ | Sprint 1 완료 (E-4, E-2C) + Sprint 2 완료 (E-2A, E-2B) |
| 카카오 비즈니스 채널 | 꽃틔움 KKOTIUM (Public ID: `_xkfALG`) ✅ |

---

## 카카오 비즈니스 채널 정보 (2026-04-16 확인)

```
채널명: 꽃틔움 KKOTIUM
검색용 ID: 꽃틔움
채널 Public ID: _xkfALG
채널 URL: http://pf.kakao.com/_xkfALG
채팅 URL: http://pf.kakao.com/_xkfALG/chat
카테고리: 쇼핑 > 생활용품
상태: 공개, 검색 허용
매장관리/톡스토어/톡체크아웃: 미연결
```

---

## AI API 키 현황 (2026-04-16 기준)

| 서비스 | 환경변수명 | 상태 | 비고 |
|--------|-----------|------|------|
| **Groq** | **GROQ_API_KEY** | **정상 작동 ✅** | **1순위, 무료 14,400회/일** |
| **Groq** | **GROQ_API_KEY_2** | **정상 작동 ✅** | **round-robin, 합계 28,800회/일** |
| Gemini | GEMINI_API_KEY | 429 quota 초과 | 같은 프로젝트 quota 공유 문제 |
| Gemini | GEMINI_API_KEY_2 | 429 quota 초과 | 다른 Google 계정/프로젝트에서 발급 필요 |
| Gemini | GEMINI_API_KEY_3 | 429 quota 초과 | 키 유효하지만 무료 quota 소진 |
| xAI Grok | XAI_API_KEY | 크레딧 미배정 | console.x.ai에서 크레딧 구매 필요 |
| Perplexity | PERPLEXITY_API_KEY | Pro 만료 (401) | 비활성 |

**AI 우선순위**: Groq(2키 round-robin) → xAI Grok → Gemini(3키) → Anthropic → Perplexity

---

## Phase E+ 전략 리서치 요약 (2026-04-16 세션)

### 핵심 발견사항 (4개 리포트 종합)

**리뷰 관리:**
- 네이버 커머스 API에 리뷰 관련 API 없음 (GitHub Discussion #1582 공식 확인)
- 리뷰 0→10→50 단계별 성장 로드맵: 초기 10개는 알림톡 없이 확보 가능
- 리뷰 작성률 목표: 20~25% (구매확정 대비)
- 한달사용 리뷰로 동일 주문에서 리뷰 2건 확보 가능 (2단계 수집 구조)
- 네이버 자체 무료 리뷰 알림: 배송완료 3일 후 구매확정 요청 + 구매확정 시 리뷰 알림 자동 발송

**반품안심케어:**
- 건당 50~650원 투자 → 매출 평균 +13.6% (한양대 연구)
- 카테고리별 효과: 패션잡화 +58.3%, 가구/인테리어 +46.7%, 디지털/가전 +26.2%
- 2025.8.1 수수료 개편: 보상금 상한 7,000→8,000원, 카테고리별 이용료 인상
- N배송 연계 시 반품안심케어 수수료 네이버 지원

**카카오 비즈니스 채널:**
- 2025.12.31 친구톡 종료 → 브랜드 메시지 전환 (단가 2.5~3배 인상)
- 알림톡 건당 8원(카카오 공식) / 13원(솔라피)
- 카나나 상담매니저: 모든 톡채널에서 완전 무료 (2025.9 정식 출시)
- 챗봇 빌더: 일반 기능 무료, Event API만 건당 15원
- 쉬운광고: 일일 100원부터, 신규 6만원 무료 쿠폰
- 카카오 프로젝트 단골: 연 매출 10억 이하 소상공인 → 비즈월렛 30만원 지원

**알림톡 비용 결론:**
- 완전 무료 지속 발송 불가능: 모든 서비스가 건당 과금
- 솔라피 무료 플랜 = 플랫폼 0원 + 건당 13원 + 가입 시 300포인트(약 23건분)
- m8 무료 플랜 없음 (최저 월 4,800원)
- 네이버 내장 무료 기능으로 초기 리뷰 10개 확보 충분
- 알림톡 도입 시점: 월 주문 50건 이상

**파워셀러 전술:**
- 톡톡 자동응답 12시간 기준 강화 (2025.4)
- AiTEMS 추천 ON → 횟수 제한 없이 개인화 노출, 전체 클릭 약 10%
- 2026.2 쇼핑 AI 에이전트: 리뷰를 실시간 분석하여 상품 추천
- 수수료 개편: 유입수수료 2% 폐지 → 판매수수료 2.73%, 자체 마케팅 유입 시 0.91%

### E-13B 2단계 접근 전략 (확정)
```
1단계(지금 개발): UI만 구현
  - settings/kakao/page.tsx에 솔라피 API Key/Secret/PFID 입력 필드
  - 키 미입력 시 "솔라피 연동 후 사용 가능" 안내 표시
  - 주문 관리 페이지 알림톡 버튼도 UI만 배치
  - 실제 API 호출 코드는 키가 있을 때만 활성화

2단계(매출 성장 후 활성화): 솔라피 가입 → 키 입력 → 즉시 작동
  - 코드 추가 개발 없이 키만 넣으면 3단계 자동발송 가동
  - 월 주문 50건+ 시점에 검토
```

---

## 0. 절대 작업 원칙 (확약)

### 코드 작성 규칙
```
1. JSX 이모지 완전 금지 → Lucide React SVG 아이콘만 사용
2. 주석 영어만 작성, 한글 리터럴 타입 금지 ('조합형' 등)
3. new PrismaClient() 금지 → src/lib/prisma.ts 싱글톤만
4. 카테고리 → NAVER_CATEGORIES_FULL 로컬 상수만 (API 호출 금지)
5. 수정 후 반드시 npx tsc --noEmit → 0 errors 확인
6. 600줄+ TSX → write_file 전체 교체 (edit_file은 소규모만)
7. Python 패치: write_file → execute → rm (heredoc 절대 금지)
8. prisma migrate dev 금지 → db execute 또는 Supabase SQL Editor
9. framer-motion 사용 금지 (미설치) → CSS animations
10. bcrypt 사용 금지 → bcryptjs (Vercel Linux 호환)
11. API route에 반드시 export const dynamic = 'force-dynamic' 추가
12. useSearchParams() 사용 페이지 → 반드시 Suspense로 감싸기
13. Next.js route 파일: GET/POST/PUT/DELETE/dynamic 외 export 금지
14. PROGRESS.md + ROADMAP.md 항상 함께 업데이트
15. 카카오 채널 정보 하드코딩 금지 → store_settings에서 읽기
16. \uXXXX 유니코드 이스케이프 JSX에서 사용 금지 → 한글 리터럴 직접 사용 (렌더링 깨짐 방지)
```

### UI 작성 원칙 (2026-04-13 확정)
```
- 이모지 금지: Lucide React SVG 아이콘으로 100% 교체
- 전문 용어: 한글 설명 + (영문) 병기
  예) 상품코드 (SKU), SEO 검색최적화, 투자수익률 (ROI)
- 기능 버튼: 순한글
  예) 한 번에 임시등록, 건너뜀, 전체 저장
- 상태 라벨 통일:
  DRAFT = 임시저장 (초안 금지)
  ACTIVE (naverProductId 있음) = 네이버 판매중
  ACTIVE (naverProductId 없음) = 네이버 등록 대기
  OUT_OF_STOCK = 품절
  INACTIVE/HIDDEN = 재활성화 필요
```

### 세션 관리
```
- iterm-mcp list_all_sessions → 세션 확인 후 사용
- Chrome MCP: tabs_context_mcp → navigate
- heredoc 절대 금지 (터미널 행 유발)
- dev 서버 재시작 필요 시 꽃졔님에게 요청
- 브라우저 테스트 필수: API 레벨 성공 ≠ 브라우저 완료
```

### 보고 원칙
```
- 직접 실행 불가 시 거짓말 금지, 즉시 상황 설명
- Filesystem:edit_file 실패 후엔 Python 패치로 대체
- API 테스트 성공 후 반드시 브라우저 테스트로 재확인
- Vercel 환경변수 변경 후 반드시 재배포 트리거 필요
  (git commit --allow-empty -m "chore: redeploy ..." && git push)
- "진행해줘요" = end-to-end 완료 후 통합 브리핑 (중간 보고 없이)
```

---

## 1. 환경 정보

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

---

## 2. 앱 파이프라인

```
꿀통 사냥터 (크롤링) → 소싱 보관함 (SOURCED→PENDING→REGISTERED)
→ 씨앗 심기 (등록/편집) → 정원 창고 (목록/인라인 편집)
→ 검색 조련사 (SEO 점수 + AI 최적화 + 인라인 편집)
→ 엑셀 다운로드 → 네이버 스마트스토어 일괄등록
→ 대시보드 (실적/꼬띠추천/이벤트)
→ 주문 관리 (발주확인/송장등록)
→ 좀비 부활소 (재등록)
```

---

## 3. 메뉴 구조

```
GARDEN: 정원 일지 (/dashboard) ✅
HUNT:   꿀통 사냥터 (/crawl) ✅
PLANT:  씨앗 심기 (/products/new) ✅
TEND:   정원 창고 (/products) ✅
        검색 조련사 (/naver-seo) ✅ v3 인라인 편집
        좀비 부활소 ✅
ORDERS: 주문 관리 (/orders) ✅
TOOLS:  거래처 ✅ | 배송 레시피 ✅ | 네이버 기본값 ✅
        카카오 채널 설정 (/settings/kakao) → E-13A에서 신규 추가 예정
        인서트 카드 (/tools/insert-card) → E-13C에서 신규 추가 예정
```

---

## 4. 완료 이력

### 2026-04-27 Phase E+ Sprint 2 완료 세션

| 작업 | 내용 |
|------|------|
| **E-2A** | 리뷰 성장 트래커 + 운영 체크리스트: `/api/review-growth` GET/PATCH (manualReviewCount, reviewChecklist), `ReviewGrowthWidget` 대시보드 위젯, 9항목 체크리스트 (자동감지: returnCare, kakaoQrExposure), 단계 판정 (1: 0~10, 2: 11~50, 3: 51+), 작성률 목표 20~25%, 카카오 채널 칩 (single source of truth from store_settings) |
| **E-2B** | 주문 페이지 리뷰 유도 뱃지: DELIVERED+1~3일 (구매확정 유도/초록), COMPLETED+1~3일 (리뷰 요청/파랑), COMPLETED+28~32일 (한달 리뷰/보라), 알림톡 토스트 UI (E-13B 솔라피 연동 대기) |
| **DB 보정** | StoreSettings 스키마 `kakaoChannelUrl` 필드 추가, `kakaoChannelName` 디폴트 오타 (`꽃틄움` → `꽃틔움`) 수정 |
| **일괄 커밋** | `e09e63c` — 6 files changed, +602/-7 |

### 2026-04-16 Phase E+ Sprint 1 완료 세션

| 작업 | 내용 |
|------|------|
| **E-4** | 반품안심케어 마진 시뮬레이터: `return-care-fees.ts` 16개 카테고리별 수수료(2025.08.01), DB `return_care_enabled` 필드, 씨앗심기 Tab4 토글+수수료/효과 배지, 마진계산기 건당비용 반영, 꽀통지수 +15점 |
| **E-2C** | 리뷰 적립금 최적 설정 가이드: 혜택탭 적립금 권장값 안내(텍스트 500~1,000/포토 1,000~2,000/베스트 3,000~5,000), 최적 설정 시 초록 변경, 마진계산기 건당비용, 꽀통지수 +10점 |

### 2026-04-15~16 Phase E + Phase E+ 계획 수립 세션

| 작업 | 커밋 | 내용 |
|------|------|------|
| E-7 꼬띠 소싱 추천봇 | ca993ee | DataLab→키워드검색량→경쟁분석→BlueOcean→Groq AI→Discord+위젯 |
| E-1 상세페이지 빌더 | c920ab5 | 6종 블록 HTML 에디터 + 미리보기 + AEO import + 씨앗심기 통합 |
| E-3 수명 주기 대시보드 | a530ffb | 5단계 라이프사이클 + 좀비 리스크 + 판매속도 + 개선제안 |
| E-8 도매 자동 매칭 | 7f71937 | 도매꾹 OpenAPI 최소수량1 필터 + 도매매 검색 + 마진계산 |
| 한글화 | 93bd517, 52cd5a1 | E-7/E-1/E-3/E-8 위젯·빌더 영문→한글 전환 |
| Phase E+ 리서치 | - | 4개 리포트 작성 + 종합 개선안 확정 (코드 아닌 전략 수립) |

### 2026-04-14 Phase D 완료 세션

| 작업 | 커밋 | 내용 |
|------|------|------|
| C-9 굿서비스 점수 | d91e2cc | 3축 게이지 + 등급 시뮬레이터 + 개선팁 |
| C-2+C-12 AEO+트렌드 | cdf3157 | Groq Q&A 생성 + 경쟁 뱃지 + 시장 분석 |
| C-11 씨앗심기 2-Panel | - | 좌측 6탭 + 우측 38% sticky 고정패널 |
| D-1 상품명 품질 체크 | c8c05ba | 13개 검증룰, S~D 등급 |
| D-3 경쟁 모니터링 | f02ae2e | 스냅샷/변화감지/Discord 알림 |
| D-4 DataLab API | 5a3d0fe, f40c765 | 스파크라인 차트+기간 선택기 |
| D-2 대시보드 레이아웃 | 17480d0 | 2열 그리드 + 빠른 작업 바로가기 |
| D-5 탭 UX 개선 | 252337b | 6개 탭별 완성도 뱃지 |

### 2026-04-13 UI 원칙 + 검색조련사 v3 세션

| 작업 | 커밋 | 내용 |
|------|------|------|
| 이모지 전면 제거 | afc3144 | 전체 src/ JSX → Lucide React SVG |
| Groq AI fallback | 8a16fe3 | llama-3.1-8b-instant, 무료 14,400회/일 |
| 검색 조련사 v3 | df5874d | SEO 전체 필드 인라인 편집 + AI 버튼 3개 |
| C-1 커머스 API 등록 | 36d5d5f | product-builder.ts + register API + 모달 |
| C-12 시장 분석 | dd0758f~2a65bc2 | 네이버 쇼핑검색+Groq 실시간 분석 |

### Phase A~B (이전 세션)
| Task | 내용 | 완료일 |
|------|------|--------|
| A-1~A-12 | 엑셀 검증, SEO, DataLab, 배포 | 2026-04-10 |
| B-1~B-5 | 주문관리, 발주확인, 동기화, 품절처리, 주간보고 | 2026-04-12 |
| C-5 | 꼬띠 추천 v2 (TOP5+소싱보관함+검색량) | 2026-04-12 |

---

## 5. 핵심 파일 경로

| 역할 | 경로 |
|------|------|
| Prisma 싱글톤 | `src/lib/prisma.ts` |
| Naver API (bcryptjs) | `src/lib/naver/api-client.ts` |
| 카테고리 (4,993개) | `src/lib/naver/naver-categories-full.ts` |
| 카테고리 속성 | `src/lib/category-attributes.ts` |
| 꿀통지수 | `src/lib/honey-score.ts` |
| SEO 점수 | `src/lib/seo-calculator.ts` |
| 상품명 품질체커 | `src/lib/product-name-checker.ts` |
| 경쟁 모니터 | `src/lib/competition-monitor.ts` |
| 굿서비스 점수 | `src/lib/good-service.ts` |
| 소싱 추천 엔진 | `src/lib/sourcing-recommender.ts` |
| 트렌드 분석 | `src/lib/trend-analyzer.ts` |
| 업로드 준비도 | `src/lib/upload-readiness.ts` |
| Discord | `src/lib/discord.ts` |
| 마진 계산기 | `src/components/products/MarginCalculator.tsx` |
| 상세페이지 빌더 | `src/components/products/DetailPageBuilder.tsx` |
| 소싱 추천 위젯 | `src/components/dashboard/SourcingRecommendWidget.tsx` |
| 경쟁 모니터 위젯 | `src/components/dashboard/CompetitionMonitorWidget.tsx` |
| 굿서비스 위젯 | `src/components/dashboard/GoodServiceWidget.tsx` |
| DataLab 트렌드 위젯 | `src/components/dashboard/DataLabTrendWidget.tsx` |
| 리뷰 성장 트래커 위젯 (E-2A) | `src/components/dashboard/ReviewGrowthWidget.tsx` |
| 리뷰 성장 API (E-2A) | `src/app/api/review-growth/route.ts` |
| 반품안심케어 수수료 (E-4) | `src/lib/return-care-fees.ts` |
| SEO 테이블 v3 | `src/components/naver-seo/NaverSeoProductTable.tsx` |
| 씨앗 심기 | `src/app/products/new/page.tsx` |
| 정원 창고 | `src/app/products/page.tsx` |
| 검색 조련사 | `src/app/naver-seo/page.tsx` |
| 주문 관리 | `src/app/orders/page.tsx` |
| 대시보드 | `src/app/dashboard/page.tsx` |
| cron daily | `src/app/api/cron/daily/route.ts` |
| cron weekly | `src/app/api/cron/weekly/route.ts` |
| Sidebar | `src/components/layout/Sidebar.tsx` |

---

## 6. 네이버 API 현황

| API | 상태 |
|-----|------|
| 토큰 발급 (bcryptjs) | ✅ |
| 채널 정보 | ✅ 꽃틔움 KKOTIUM |
| 주문 조회 | ✅ |
| 발주 확인 | ✅ |
| 송장 등록 | ✅ |
| 상품 실시간 동기화 | ✅ |
| 주소록 조회 | ✅ |
| DataLab 트렌드 | ✅ |
| 키워드 검색량 | ✅ |
| 리뷰 API | ❌ 미지원 (GitHub #1582 확인) |

---

## 7. Vercel 환경변수 (현재 등록 목록)

```
DB: DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
Naver: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, NAVER_PROXY_URL
Naver SearchAd: NAVER_SEARCHAD_API_KEY, NAVER_SEARCHAD_SECRET_KEY, NAVER_SEARCHAD_CUSTOMER_ID
Naver DataLab: NAVER_DATALAB_CLIENT_ID, NAVER_DATALAB_CLIENT_SECRET
Discord: DISCORD_WEBHOOK_ORDERS, DISCORD_WEBHOOK_STOCK, DISCORD_WEBHOOK_DAILY,
         DISCORD_WEBHOOK_WEEKLY, DISCORD_WEBHOOK_KKOTTI
AI: GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3, GROQ_API_KEY, GROQ_API_KEY_2, PERPLEXITY_API_KEY
Cloudinary: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
Etc: CRON_SECRET, NEXT_PUBLIC_APP_URL
향후 추가 예정 (E-13B 활성화 시): SOLAPI_API_KEY, SOLAPI_API_SECRET, KAKAO_PF_ID, SENDER_PHONE_NUMBER
향후 추가 예정 (E-12 구현 시): DISCORD_WEBHOOK_REVIEW
```

---

## 8. 알려진 이슈 및 주의사항

| 이슈 | 원인 | 대응 |
|------|------|------|
| prisma migrate dev 실패 | shadow DB 없음 | Supabase SQL Editor 사용 |
| framer-motion 미설치 | 설치 안 함 | CSS animations로 대체 |
| bcrypt 금지 | Vercel Linux 호환 안 됨 | bcryptjs 사용 |
| Gemini quota 소진 | 하루 1,500회/계정 | Groq fallback 자동 작동 |
| NAVER_CLIENT_SECRET $ 이스케이프 | dotenv-expand | 로컬 .env: `\$2a\$04\$...`, Vercel: `$` 그대로 |
| Vercel 환경변수 변경 후 미반영 | 자동 재배포 안 됨 | `git commit --allow-empty && push` 필요 |
| detail_image_url 8개 null | 직접 입력 안 함 | 씨앗 심기 편집 모드에서 직접 입력 |
| 네이버 리뷰 API 미지원 | 커머스 API 범위 밖 | 수동 입력 + 크롤링만 가능 |
| 알림톡 완전 무료 불가 | 카카오 딜러사 건당 과금 | 솔라피 건당 13원, 가입 시 300포인트(23건분) |

---

## 9. 2026 네이버 쇼핑 SEO + 리뷰 전략 인사이트 (04-14~16 리서치)

### 핵심 변화
```
1. 키워드 매칭 → 검색 의도 일치로 전환
   - 상품명 25~35자 최적, 속성+태그 상세 입력 → 상품명 외 키워드 노출
2. AI 추천이 검색 트래픽 20%+ 차지
   - AiTEMS ON 설정 필수 (전체 클릭 약 10%)
   - 2026.2 쇼핑 AI 에이전트: 리뷰 실시간 분석 → 상품 추천
3. 신뢰도(Trust) 지표 급부상
   - 굿서비스 점수 → 검색 랭킹 직접 반영
   - 톡톡 응답 기준 24h→12h 강화
4. 반품안심케어 = 즉시 스위치 (건당 50~650원 → 매출 +13.6%)
5. 리뷰 = 장기 엔진 (0→10 무료로 가능, 50+ 시 알림톡 도입 검토)
6. 수수료 개편: 유입수수료 2% 폐지 → 판매수수료 2.73%, 자체마케팅 0.91%
```

### 등급 체계 개편 (2025/12 시행)
```
- 평가 기간: 3개월 → 1개월
- 빅파워: 4,000만 → 1,000만원/월
- 파워: 800만 → 300만원/월
- 새싹: 200만 → 80만원/월
```

---

## 10. 기술 패턴 레퍼런스

```typescript
// Prisma 싱글톤
import { prisma } from '@/lib/prisma';

// Naver API (bcryptjs! Supabase proxy 경유)
import { naverRequest } from '@/lib/naver/api-client';

// 카테고리 (로컬 상수만, API 호출 금지)
import { NAVER_CATEGORIES_FULL } from '@/lib/naver/naver-categories-full';

// API route 필수 헤더
export const dynamic = 'force-dynamic';

// 로컬 .env.local: NAVER_CLIENT_SECRET=\$2a\$04\$...
// Vercel 환경변수: NAVER_CLIENT_SECRET=$2a$04$... ($ 그대로)

// Groq round-robin
// ai-generate/route.ts: callGemini() → callGroq() → callPerplexity()

// 이모지 금지 예시
// Bad:  <span>🚚</span>
// Good: <Truck size={14} style={{ color: '#e62310' }} />

// 카카오 채널 QR URL (인서트 카드용)
// https://pf.kakao.com/_xkfALG

// 솔라피 알림톡 API (E-13B 활성화 시)
// POST https://api.solapi.com/messages/v4/send
// 인증: HMAC-SHA256 (apiKey, date, salt, signature)
// npm: solapi 패키지 사용 가능
```
