# KKOTIUM GARDEN — 프로젝트 진행 현황
> 최종 업데이트: 2026-04-14 (Phase D-1, D-2 완료)
> TSC: 0 errors | 배포: https://kkotium-garden.vercel.app | 최신 커밋: 17480d0
> **Phase A ✅ | Phase B ✅ | Phase C ✅ 전체 완료 | Phase D 진행 중 (D-1, D-2 완료)**
> 전략 참고문서: `260413-꽃틔움 가든 개선안 검증과 2026년 전략 로드맵` (프로젝트 파일)
> 최신 커밋: eb36391

---

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

## 현재 앱 상태 (2026-04-13)

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
| Phase A | 전체 완료 ✅ |
| Phase B | 전체 완료 ✅ |
| Phase C (C-1) | 완료 ✅ |

---

## AI API 키 현황 (2026-04-14 기준)

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

**Gemini 429 원인**: 3개 키가 같은 Google 프로젝트에서 생성되어 quota 공유.
각 키를 서로 다른 Google 계정에서 만들면 독립 quota 확보 가능.
현재 Groq 2개 키로 충분하므로 Gemini는 후순위.

---

## 다음 작업 우선순위 (2026-04-14 전략 리서치 기반 재정렬)

> 원칙: 무재고 1인셀러 + 무료 기능 최대 활용 + 검색 노출 직결 순서
> 전략 근거: `260413-꽃틔움 가든 개선안 검증과 2026년 전략 로드맵`

### Sprint 1: 등록 품질 기반 (무료, 즉시 착수 가능)
| Task | 내용 | 상태 | 비용 |
|------|------|------|------|
| C-6 | ✅ 완료 | 원산지코드 518건 자동완성 (naver-origin-codes.ts 로컬 상수) | 완료 | 무료 |
| C-7 | ✅ 완료 | 카테고리 4,993건 검증 + 11개 D1 속성 매핑 | 완료 | 무료 |
| C-8 | ✅ 완료 | calcAttributeCompleteness() 함수 (S/A/B/C/D 등급) | 완료 | 무료 |

### Sprint 2: API 전환 (무료, 핵심 업그레이드)
| Task | 내용 | 상태 | 비용 |
|------|------|------|------|
| C-1 | ✅ 완료 | 커머스 API 직접 상품 등록 (엑셀 대비 SEO 적합도 극대화) | 완료 | 무료 |

### Sprint 3: AI 최적화 + 운영 모니터링 (무료)
| Task | 내용 | 상태 | 비용 |
|------|------|------|------|
| C-2 | AEO 상세페이지 Q&A + FAQ 자동 생성 (Gemini/Groq) | ✅ 완료 | 무료 |
| C-9 | 굿서비스 점수 대시보드 (등급 관리 + Discord 알림) | ✅ 완료 | 무료 |

### Sprint 4: 수익 최적화 + 확장
| Task | 내용 | 상태 | 비용 |
|------|------|------|------|
| C-4 | 수익성 분석 대시보드 (유입경로별 수수료 + 순이익 시뮬레이터) | ✅ 완료 | 무료 |
| C-10 | 배송 자동화 확장 (자동 발주확인 + 수량 클레임 대응) | ✅ 완료 | 무료 |
| C-3 | 대량 등록 배치 파이프라인 (소싱보관함 10개 일괄) | ✅ 완료 | 무료 |
| C-11 | 씨앗 심기 UX 2-Panel Split 구조 개편 | ✅ 완료 | 무료 |

### Phase D: 중기 개선 (다음 작업)
| Task | 내용 | 상태 | 비용 |
|------|------|------|------|
| D-1 | 상품명 품질 체크 (50자 제한, 금지키워드 감지, 실시간 경고) | ✅ 완료 | 무료 |
| D-2 | 대시보드 위젯 레이아웃 정리 (2열 그리드 + 빠른 작업 바로가기) | ✅ 완료 | 무료 |
| D-3 | 경쟁 상품 모니터링 (카테고리 상위 키워드 패턴, 가격/리뷰 변화 알림) | ⬜ 대기 | 무료 |
| D-4 | Naver DataLab API 직접 통합 (카테고리별 실시간 트렌드 차트) | ⬜ 대기 | 무료 |
| D-5 | 씨앗 심기 탭 UX 추가 개선 (탭 완성도 뱃지, 스크롤 위치 유지) | ⬜ 대기 | 무료 |

### 꽃졔님 직접 처리
| 항목 | 내용 |
|------|------|
| detail_image_url | 기존 8개 상품 씨앗 심기 편집 모드에서 직접 입력 |
| API 키 교체 | Gemini 3개 새 키 발급 완료 (quota 공유 문제 있음), Groq 2개 정상 |

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
- iterm-mcp list_sessions → launch_session (TTY 먼저 확인)
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
```

---

## 4. 완료 이력

### 2026-04-13 이번 세션 작업

| 작업 | 내용 | 커밋 |
|------|------|------|
| 이모지 전면 제거 | 전체 src/ JSX 이모지 → Lucide React SVG (60+건) | afc3144 |
| workflow 페이지 재작성 | 5단계 운영 가이드, Lucide 아이콘, 현행 용어 | 3e63830 |
| 컴포넌트 이모지 제거 | ProductSort/Stats/Table/Filter/SourcedManager 등 | 9dd708b |
| debug 엔드포인트 삭제 | src/app/api/debug/ 전체 제거 | 773ef10 |
| cron Perplexity 분리 | trend-analyzer.ts fallback을 silent로 교체 | e595361 |
| Groq AI fallback 추가 | llama-3.1-8b-instant, 무료 14,400회/일 | 8a16fe3 |
| Groq 재배포 | GROQ_API_KEY Vercel 등록 후 재배포 트리거 | 94ebf42 |
| 상태 라벨 정리 | 초안→임시저장, ACTIVE→판매 중, pending→네이버 등록 대기 | b8895aa |
| 검색 조련사 v3 | SEO 전체 필드 인라인 직접 편집 패널 (저장 버튼 포함) | df5874d |

### 검색 조련사 v3 인라인 편집 패널 기능
```
행 클릭 → 하단 패널 열림
- 꼬띠 AI 최적화: 정석SEO / 감성타겟 / 틈새키워드 버튼 3개
- SEO 필드 직접 편집:
  네이버 상품명 (글자수 실시간 표시, 25~40자 권장)
  키워드 (쉼표 구분, 칩 미리보기, 5~7개 권장)
  상품 설명 텍스트영역 (80~200자)
  브랜드 / 원산지 / 소재 / 색상 / 사이즈 / 세탁방법
  SEO 태그 (최대 10개, 인라인 추가/삭제)
- 전체 저장 버튼 → PATCH /api/products/{id} 한번에 저장
- 키워드 월간 검색량 자동 표시
```



### 2026-04-14 Sprint 3 C-9 굿서비스 점수 대시보드 세션

| 작업 | 커밋 | 내용 |
|------|------|------|
| C-9 계산 라이브러리 | d91e2cc | good-service.ts: 3축 점수 계산 + 등급 시뮬레이터 |
| C-9 API | d91e2cc | GET /api/good-service: 14일 주문 데이터 집계 → 점수 계산 |
| C-9 대시보드 위젯 | d91e2cc | GoodServiceWidget: 3축 게이지 + 등급 뱃지 + 개선팁 + 등급 시뮬레이터 |

### C-9 굿서비스 점수 기능 상세
```
- 3축 평가: 주문이행(40%) + 배송품질(30%) + 고객만족(30%)
- 등급 판정: 우수(90+) / 양호(75+) / 보통(60+) / 개선필요(40+) / 위험(0-39)
- 등급 시뮬레이터: 씨앗~플래티넘 목표 대비 갭 계산 (매출+판매건수+굿서비스점수)
- 14일 윈도우 데이터 기반 (네이버 기준 동일)
- 개선 포인트 자동 생성 (24h 발주확인율, 배송 정시율, 문의 응답율 등)
- API: GET /api/good-service → score + metrics + gradeSimulation + monthlySummary
```

### 2026-04-14 Sprint 3 C-2 + C-12 확장 세션

| 작업 | 커밋 | 내용 |
|------|------|------|
| C-2 AEO API | cdf3157 | POST/GET /api/products/[id]/aeo-generate, Gemini/Groq Q&A 5~8 + FAQ 3~5 |
| C-2 product-builder | cdf3157 | buildDetailContent()에 H2/H3 구조화 Q&A/FAQ HTML 자동 삽입 |
| C-2 검색 조련사 | cdf3157 | AEO Q&A 생성 버튼 인라인 패널에 추가 |
| C-12 검색 조련사 | cdf3157 | CompetitionCell 경쟁 강도 뱃지 컬럼 (낮음/보통/높음/치열) |
| C-12 씨앗 심기 | cdf3157 | MarketPriceHint 시장 평균가 비교 칩 |
| C-12 대시보드 | cdf3157 | MarketTrendWidget 내 상품 시장 트렌드 + 꼬띠 인사이트 |
| C-12 소싱 보관함 | cdf3157 | SourcedCompetitionBadge 경쟁 강도 + 평균가 |
| MarketAnalysisCard | cdf3157 | 영어 라벨 전체 한글화 (경쟁 상품수/평균 가격/가격대/경쟁 낮음~치열) |
| DB | migration | aeo_content JSONB + aeo_generated_at 컬럼 추가 |
| Prisma | generate | Product 모델 aeo_content Json? + aeo_generated_at DateTime? |

### 2026-04-13 C-1 + C-12 세션

| 작업 | 커밋 | 내용 |
|------|------|------|
| C-1 Step 1~3 | 36d5d5f | product-builder.ts + register API + NaverRegisterModal |
| C-1 Step 4~5 | b361139 | Supabase 버킷 통일 + Cloudinary 비활성화 |
| C-12 모듈 | dd0758f | shopping-search.ts + market-analysis API |
| C-12 SEO+꼬띠 | c793a89 | AI SEO에 경쟁 데이터 주입 + 꼬띠 시장 트렌드 |
| C-12 UI | 2a65bc2 | MarketAnalysisCard 정원 창고 사이드 패널 |
| C-12 검증 | d72a9ec | Naver OpenAPI + Groq 키 작동 확인 완료 |

### C-12 시장 분석 적용 현황
- 검색 조련사 AI SEO: 경쟁 데이터(가격/경쟁강도) 프롬프트 주입 ✅
- 꼬띠 AI 코멘트: 시장 트렌드 인사이트 컨텍스트 추가 ✅
- 정원 창고 사이드 패널: MarketAnalysisCard (경쟁 뱃지 + AI 인사이트 + 키워드 칩) ✅
- 시장 분석 API: GET /api/naver/market-analysis?q=keyword (1시간 캐시) ✅

### C-12 전체 적용 완료 (2026-04-14)
- 씨앗 심기: MarketPriceHint 판매가 아래 시장 평균 비교 칩 ✅
- 소싱 보관함: SourcedCompetitionBadge 경쟁 강도 + 평균가 ✅
- 대시보드: MarketTrendWidget 내 상품 시장 트렌드 위젯 ✅
- 검색 조련사 테이블: CompetitionCell 경쟁 강도 컬럼 ✅


### 2026-04-14 Sprint 4 C-11 씨앗 심기 2-Panel Split 세션

| 작업 | 내용 |
|------|------|
| C-11 Tab Nav | 6개 탭 네비게이션 바 (기본정보/옵션/이미지/배송A&S/SEO원산지/혜택) |
| C-11 2-Panel | 좌측 60% Tab + 우측 38% 고정 패널 (sticky, overflow scroll) |
| C-11 Tab Icons | Lucide React: Package/Layers/ImageIcon/Truck/Search/Gift |
| C-11 Tab Logic | activeTab state, conditional rendering per tab |
| 백업 | page.backup.pre-c11.tsx 보존 |

### 2026-04-14 Phase D-1 상품명 품질 체크 세션

| 작업 | 커밋 | 내용 |
|------|------|------|
| D-1 라이브러리 | c8c05ba | product-name-checker.ts: 13개 검증룰, 0~100점 점수, S~D 등급, highlight 지원 |
| D-1 씨앗심기 | c8c05ba | 실시간 글자수 카운터 + 등급 뱃지 + 상위 3건 이슈 인라인 표시 |
| D-1 검색조련사 | c8c05ba | 인라인 편집 패널 네이버 상품명 품질 경고 (상위 2건) |
| D-1 스토어명 | c8c05ba | store-settings API에서 storeName 자동 로딩 → 셀러명 감지 활성화 |

### C-11 씨앗 심기 2-Panel Split 기능 상세
```
- 좌측 60%: 6개 탭으로 기존 RSection/DSection 재배치
  Tab 1 (기본 정보): 카테고리 4단계/검색 + 상품명/판매가/공급가/재고/SKU/공급사
  Tab 2 (옵션): 옵션없음/조합형/단독형/직접입력형 테이블 UI
  Tab 3 (이미지): 대표/추가/상세 이미지 드롭존 + SEO 훅문구
  Tab 4 (배송 A/S): 꼬띠 배송 추천 + 배송 템플릿 + A/S 설정
  Tab 5 (SEO 원산지): 브랜드/원산지/수입사 + 상품정보고시
  Tab 6 (혜택): 리뷰 포인트 + 구매평/알림 + 할부
- 우측 38% sticky: 업로드 준비도 + 꿀통지수 + 마진계산기 + AI SEO + SEO 점수 + 엑셀 미리보기
- 하단 플로팅 바: 임시저장 / 네이버 API 등록 / 엑셀 다운로드
- 모든 기존 로직 100% 보존 (state, handlers, prefill, edit mode)
```

### Phase A~B (이전 세션)
| Task | 내용 | 완료일 |
|------|------|--------|
| A-1~A-12 | 엑셀 검증, SEO, DataLab, 배포 | 2026-04-10 |
| B-1 | 주문 관리 v3 | 2026-04-11 |
| B-2 | 발주확인 + 송장등록 | 2026-04-12 |
| B-3 | 정원 창고 네이버 동기화 | 2026-04-12 |
| B-4 | 품절 자동 처리 cron | 2026-04-12 |
| B-5 | 주간 수익 보고서 Discord | 2026-04-12 |
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
| 굿서비스 점수 | `src/lib/good-service.ts` |
| 굿서비스 API | `src/app/api/good-service/route.ts` |
| 굿서비스 위젯 | `src/components/dashboard/GoodServiceWidget.tsx` |
| 트렌드 분석 | `src/lib/trend-analyzer.ts` |
| 업로드 준비도 | `src/lib/upload-readiness.ts` |
| Discord | `src/lib/discord.ts` |
| 씨앗 심기 | `src/app/products/new/page.tsx` |
| 정원 창고 | `src/app/products/page.tsx` |
| 검색 조련사 | `src/app/naver-seo/page.tsx` |
| SEO 테이블 v3 | `src/components/naver-seo/NaverSeoProductTable.tsx` |
| AI SEO 생성 | `src/app/api/naver-seo/ai-generate/route.ts` |
| cron daily | `src/app/api/cron/daily/route.ts` |
| cron weekly | `src/app/api/cron/weekly/route.ts` |
| 주문 관리 | `src/app/orders/page.tsx` |
| 송장등록 API | `src/app/api/naver/orders/dispatch/route.ts` |
| 상품 동기화 | `src/app/api/naver/products/sync/route.ts` |
| Sidebar | `src/components/layout/Sidebar.tsx` |
| 마진 계산기 | `src/components/products/MarginCalculator.tsx` |

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

---

## 7. Vercel 환경변수 (현재 등록 목록)

```
DB: DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
Naver: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, NAVER_PROXY_URL
Naver SearchAd: NAVER_SEARCHAD_API_KEY, NAVER_SEARCHAD_SECRET_KEY, NAVER_SEARCHAD_CUSTOMER_ID
Naver DataLab: NAVER_DATALAB_CLIENT_ID, NAVER_DATALAB_CLIENT_SECRET
Discord: DISCORD_WEBHOOK_ORDERS, DISCORD_WEBHOOK_STOCK, DISCORD_WEBHOOK_DAILY,
         DISCORD_WEBHOOK_WEEKLY, DISCORD_WEBHOOK_KKOTTI
AI: GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3, GROQ_API_KEY, PERPLEXITY_API_KEY
Cloudinary: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
Etc: CRON_SECRET, NEXT_PUBLIC_APP_URL
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
| GitHub secret scanning 차단 | 키 노출 감지 | Allow secret 승인 후 push |
| detail_image_url 8개 null | 직접 입력 안 함 | 씨앗 심기 편집 모드에서 직접 입력 |

---

## 9. 2026 네이버 쇼핑 SEO 전략 인사이트 (04-14 리서치)

> 상세 내용: `260413-꽃틔움 가든 개선안 검증과 2026년 전략 로드맵` 참조

### 핵심 변화 3가지
```
1. 키워드 매칭 → 검색 의도 일치로 전환
   - 상품명 50자 내외 권장 (25~35자 최적)
   - 속성+태그 상세 입력 → 상품명에 없는 키워드로도 노출 가능
   - 셀러명/조사/수식어/중복 키워드 배제

2. AI 추천이 검색 트래픽 20%+ 차지
   - AI 브리핑: 전체 검색의 20% 이상
   - 네이버플러스 스토어 AI 추천 → 평균 거래액 33%↑
   - 소규모 업체 매출 16.5%↑ (대규모 6.7%↑ 대비 더 큰 수혜)
   - 2026/02 쇼핑 AI 에이전트 출시 (대화형 상품 탐색)

3. 신뢰도(Trust) 지표 급부상
   - 굿서비스 점수 → 검색 랭킹에 직접 반영
   - AI 기반 어뷰징 실시간 감지
   - 리뷰 구체성/감성/제품-리뷰 일치도 AI 분석
```

### 등급 체계 개편 (2025/12 시행)
```
- 평가 기간: 3개월 → 1개월
- 빅파워: 4,000만 → 1,000만원/월
- 파워: 800만 → 300만원/월
- 새싹: 200만 → 80만원/월
- 굿서비스 점수 등급 반영 (주문이행/배송품질/고객만족)
- 14일간 데이터 매일 갱신 → 월평균 반영
```

### 수수료 변경 (2025/06)
```
- 기존 유입수수료 2% 폐지 → 판매수수료 2.73%로 전환
- 네이버페이 주문관리 3.63~3.74% 추가
- 판매자 마케팅 링크 유입 시 판매수수료 0.91%로 절감
- 배송비에는 수수료 미부과
- 스토어당 상품 제한: 50만개 → 5만개로 축소
```

### API 등록 vs 엑셀 등록 차이
```
엑셀: 태그/키워드 설정 불가, 속성 입력 제한 → SEO 적합도 저하
API:  모든 필드 정밀 제어 가능 → 속성/태그/키워드 완벽 입력
주의: 2026/02/24부터 단위가격 입력 의무화
주의: 고정 IP 미등록 시 점진적 사용 제한
주의: 상품 수정 시 요청에 포함되지 않은 정보는 삭제됨
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

// Gemini round-robin → Groq fallback
// ai-generate/route.ts: callGemini() → callGroq() → callPerplexity()

// Vercel 재배포 트리거 (환경변수 변경 후 필수)
// git commit --allow-empty -m "chore: redeploy for {변수명}" && git push

// 이모지 금지 예시
// Bad:  <span>🚚</span>
// Good: <Truck size={14} style={{ color: '#e62310' }} />
```
