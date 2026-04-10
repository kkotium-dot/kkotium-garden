# KKOTIUM GARDEN — 프로젝트 진행 현황
> 최종 업데이트: 2026-04-10 (Phase A 전체 완료, Vercel 배포 진행중)
> TSC: 0 errors | Naver API: ok=true | 앱: localhost:3000
> **Phase A A-1~A-12 완료 ✅ → Vercel 환경변수 등록 후 배포 완료 예정**

---

## 📋 이 파일의 역할

> **KKOTIUM_PROGRESS.md** = 프로젝트 현재 상태 + 작업 원칙 + 완료 이력 + 기술 레퍼런스
> - 새 채팅 시작 시 **가장 먼저 읽는 파일**
> - 작업 완료 후 **상태 갱신용**
>
> **KKOTIUM_ROADMAP.md** = Phase A/B/C 작업 계획 상세
>
> **새 채팅 시작 순서:**
> 1. `KKOTIUM_PROGRESS.md` 전체 읽기
> 2. `KKOTIUM_ROADMAP.md` 전체 읽기
> 3. 해당 TASK의 관련 코드 파일 read_file
> 4. 꽃졔님 승인 후 작업 시작

---

## 🚨 현재 앱 상태 (2026-04-10)

| 항목 | 현황 |
|------|------|
| 전체 상품 | 8개 (전부 DRAFT) |
| 네이버 판매중 | 0개 (업로드 전) |
| 평균 SEO 점수 | 16점 (카테고리/속성 미입력) |
| 네이버 Commerce API | ok=true ✅ 채널: 꽃틔움 KKOTIUM |
| 네이버 검색광고 API | ✅ 키워드 검색량 실시간 |
| 네이버 DataLab API | ✅ ID: F7Hga62gDOYxZ3KRtLTL |
| Discord | 5채널 발송 확인 ✅ |
| TSC | 0 errors ✅ |
| Phase A | **전체 완료** ✅ |
| Vercel | GitHub import 완료, 환경변수 등록 진행중 |

### 다음 작업
| 작업 | 상태 |
|------|------|
| Vercel 환경변수 등록 | 꽃졔님 직접 (아래 체크리스트 참고) |
| Vercel 첫 배포 | 환경변수 등록 후 Deploy 클릭 |
| Phase B | 첫 주문 발생 시 시작 |

---

## 0. 작업 원칙

### 코드 작성
```
- JSX 이모지 완전 금지 → Lucide React 아이콘만
- 주석 영어만, 한글 리터럴 타입 금지
- new PrismaClient() 금지 → src/lib/prisma.ts 싱글톤만
- 카테고리: NAVER_CATEGORIES_FULL 로컬만 (API 호출 금지)
- 수정 후 npx tsc --noEmit → 0 errors 확인
- 파일 수정 전 read_file 먼저
- 600줄+ TSX → write_file 전체 교체
- Python 패치: 파일 작성 → 실행 → rm (heredoc 금지)
- prisma migrate dev 금지 → db execute 또는 Supabase SQL Editor 사용
  (shadow DB에 naver_categories 없어서 migrate dev 실패)
```

### 세션 관리
```
- iterm-mcp list_sessions → launch_session → Chrome MCP tabs_context_mcp
- heredoc(<< 'EOF') 절대 금지
- dev 서버 재시작 필요 시 꽃졔님에게 요청
```

### 환경
```
앱 루트:   /Users/jyekkot/Desktop/kkotium-garden
Dev 서버:  http://localhost:3000
DB:        Supabase PostgreSQL (doxfizicftgtqktmtftf)
스토어:    꽃틔움 KKOTIUM (smartstore.naver.com/kkotium)
Vercel:    vercel.com/kkotjye / kkotium-garden
```

---

## 1. 앱 파이프라인

```
꿀통 사냥터 (크롤링) → 소싱 보관함 → 씨앗 심기 (등록)
→ 정원 창고 (목록) → 검색 조련사 (SEO) → 엑셀 다운로드
→ [Phase C] API 직접 등록 → 대시보드 (실적/꼬띠/이벤트)
→ [Phase B] 주문 관리 → 좀비 부활소 (재등록)
```

---

## 2. 메뉴 구조

```
GARDEN: 정원 일지 (/dashboard) ✅
HUNT: 꿀통 사냥터 (/crawl) ✅
PLANT: 씨앗 심기 (/products/new) ✅
TEND: 정원 창고 (/products) ✅ | 검색 조련사 (/naver-seo) ✅ | 좀비 부활소 ✅
ORDERS: 주문 관리 (/orders) — Phase B
TOOLS: 거래처 ✅ | 배송 레시피 ✅ | 네이버 기본값 ✅
```

---

## 3. 완료 이력

### P0~P5 (이전)
- P0~P1: 도매꾹 OpenAPI, 공급사 매핑, 배송 추천
- P2: 정원 창고, 검색 조련사 100점 SEO, 좀비 부활소
- P3: 대시보드 v5, 업로드 준비도, TOOLS 메뉴
- P4: 네이버 커머스 API, 실시간 주문/매출, 꼬띠 AI
- P5: Discord, 키워드 API, Perplexity, 엑셀 원클릭, EventTimeline

### Phase A (2026-04-10 완료)
| Task | 내용 |
|------|------|
| A-1 | 엑셀 다운로드 전 ReadinessCheckModal (기존 확인) |
| A-2 | AI 상품명 역반영 버튼 (기존 확인) |
| A-3 | `api/naver/addressbooks/route.ts` — 출고지/반품지 자동 수집 |
| A-4 | `api/naver/sync-delivery/route.ts` — deliveryInfo 역추출 |
| A-5 | `lib/category-attributes.ts` — 13개 D1 카테고리 속성 가이드 |
| A-6 | `lib/honey-score.ts` — keywordMonthlyVolume 경쟁도 자동 판단 |
| A-7 | `api/products/[id]/route.ts` — 마진 42% Discord 경고 |
| A-8 | `lib/trend-analyzer.ts` — DataLab 우선 + Perplexity fallback |
| A-9 | `lib/daily-slots.ts` — 판매모드 태스크 3종 |
| A-10 | `lib/seo-calculator.ts` — AEO 기초 15점 |
| A-11 | `vercel.json` + `next.config.js` Vercel cron 설정 |
| A-12 | `next build` 0 errors 확인 |
| UI | 배송 레시피 — 주소록 동기화 + 배송 역추출 버튼 |

---

## 4. 핵심 파일 경로

| 역할 | 경로 |
|------|------|
| Prisma 싱글톤 | `src/lib/prisma.ts` |
| Naver API | `src/lib/naver/api-client.ts` |
| 카테고리 | `src/lib/naver/naver-categories-full.ts` |
| 카테고리 속성 | `src/lib/category-attributes.ts` |
| 키워드 API | `src/lib/naver/keyword-api.ts` |
| 업로드 준비도 | `src/lib/upload-readiness.ts` |
| 꿀통지수 | `src/lib/honey-score.ts` |
| SEO 점수 | `src/lib/seo-calculator.ts` |
| 트렌드 분석 | `src/lib/trend-analyzer.ts` |
| Discord | `src/lib/discord.ts` |
| 주소록 API | `src/app/api/naver/addressbooks/route.ts` |
| deliveryInfo 역추출 | `src/app/api/naver/sync-delivery/route.ts` |
| Vercel 설정 | `vercel.json` |

---

## 5. 네이버 API 현황

| API | 상태 |
|-----|------|
| 토큰 발급 (bcrypt) | ✅ |
| 채널 정보 | ✅ 꽃틔움 KKOTIUM |
| 주문 조회 | ✅ |
| 주소록 조회 | ✅ A-3 |
| deliveryInfo 역추출 | ✅ A-4 |
| DataLab 쇼핑인사이트 | ✅ A-8 (ID: F7Hga62gDOYxZ3KRtLTL) |
| 키워드 검색량 | ✅ HMAC-SHA256 |

---

## 6. DB 테이블

Product(8), Supplier, ShippingTemplate, NaverCategory(4993), OriginCode(518),
StoreSettings, CrawlLog, product_options, ProductEvent, daily_recommendations

**⚠️ prisma migrate dev 금지** — shadow DB에 naver_categories 없어서 실패
→ 스키마 변경 시 Supabase SQL Editor 또는 `npx prisma db execute` 사용

---

## 7. 알려진 이슈

| 이슈 | 대응 |
|------|------|
| Gemini 429 | 24h 캐시 + Perplexity fallback |
| prisma migrate dev 실패 | shadow DB 문제 → db execute 사용 |
| naverTemplateNo | 엑셀에서만 필요, Phase C API 등록 시 불필요 |

---

## 8. Vercel 환경변수 체크리스트

꽃졔님이 Vercel 대시보드에서 직접 입력해야 할 목록:

### 필수 (없으면 앱 작동 안 됨)
```
DATABASE_URL          = (Supabase → Settings → Database → Connection string/Transaction)
DIRECT_URL            = (Supabase → Settings → Database → Connection string/Session)
NAVER_CLIENT_ID       = (네이버 커머스 API 클라이언트 ID)
NAVER_CLIENT_SECRET   = (값에서 $ → $$ 로 변경! 예: \$2a\$04\$ → $$2a$$04$$)
DISCORD_WEBHOOK_KKOTTI_RECOMMEND = (Discord 웹훅 URL)
DISCORD_WEBHOOK_STOCK_ALERT      = (Discord 웹훅 URL)
DISCORD_WEBHOOK_PRICE_CHANGE     = (Discord 웹훅 URL)
DISCORD_WEBHOOK_KKOTTI_SCORE     = (Discord 웹훅 URL)
DISCORD_WEBHOOK_OPS_REPORT       = (Discord 웹훅 URL)
CRON_SECRET           = (임의 문자열, 예: kkotium2026cron)
NEXT_PUBLIC_APP_URL   = (배포 후 실제 URL, 예: https://kkotium-garden.vercel.app)
```

### 권장 (기능 일부 제한)
```
GEMINI_API_KEY                  = (Gemini AI 키)
PERPLEXITY_API_KEY              = (Perplexity API 키)
NAVER_SEARCHAD_API_KEY          = (키워드 검색량)
NAVER_SEARCHAD_SECRET_KEY       = (키워드 검색량)
NAVER_SEARCHAD_CUSTOMER_ID      = (키워드 검색량)
NAVER_DATALAB_CLIENT_ID         = F7Hga62gDOYxZ3KRtLTL
NAVER_DATALAB_CLIENT_SECRET     = CQPaXJ72S4
```

**⚠️ NAVER_CLIENT_SECRET 주의**: .env.local의 `\$` 이스케이프는 Vercel에서 불필요.
Vercel에는 실제 값 그대로 붙여넣기 (`$2a$04$...` 형태로 입력)

---

## 9. 기술 패턴

```typescript
import { prisma } from '@/lib/prisma';
import { naverRequest } from '@/lib/naver/api-client';
import { NAVER_CATEGORIES_FULL } from '@/lib/naver/naver-categories-full';
import { getCategoryAttributeGuide } from '@/lib/category-attributes';
// .env.local: NAVER_CLIENT_SECRET=\$2a\$04\$... (로컬만, Vercel은 $ 그대로)
```
