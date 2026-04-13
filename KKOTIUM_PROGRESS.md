# KKOTIUM GARDEN — 프로젝트 진행 현황
> 최종 업데이트: 2026-04-13 (이모지 전면 제거, Groq AI fallback, 검색 조련사 SEO 인라인 편집 v3 완료)
> TSC: 0 errors | 배포: https://kkotium-garden.vercel.app | 최신 커밋: df5874d
> **Phase A ✅ | Phase B ✅ | Phase C 진행 중 (C-5 완료)**

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
| Phase C (C-5) | 완료 ✅ |

---

## AI API 키 현황 (2026-04-13 기준)

| 서비스 | 환경변수명 | 상태 | 비고 |
|--------|-----------|------|------|
| Gemini | GEMINI_API_KEY | 일일 quota 소진 중 | 한국시간 오전 9시 리셋 |
| Gemini | GEMINI_API_KEY_2 | 일일 quota 소진 중 | 각각 다른 구글 계정 |
| Gemini | GEMINI_API_KEY_3 | 일일 quota 소진 중 | 무료: 하루 1,500회/계정 |
| **Groq** | **GROQ_API_KEY** | **정상 작동 ✅** | **무료 14,400회/일, llama-3.1-8b-instant** |
| Perplexity | PERPLEXITY_API_KEY | Pro 만료 (401) | 비활성 |

**AI 우선순위**: Gemini(3키 round-robin) → Groq(무료 fallback) → Perplexity(만료)

**⚠️ 중요**: 2026-04-13 채팅에서 Gemini 키 3개 + Groq 키 1개가 노출됨.
Gemini 키는 quota 리셋 후 Google AI Studio에서 새 프로젝트 키로 교체 권장.
Groq 키도 교체 권장: `https://console.groq.com/keys`

---

## 다음 작업 우선순위

| Task | 내용 | 상태 |
|------|------|------|
| C-1 | 커머스 API 직접 상품 등록 | ⬜ 대기 |
| C-2 | AI 상세페이지 Q&A (AEO) | ⬜ 대기 (Gemini 필요) |
| C-3 | 대량 등록 배치 파이프라인 | ⬜ 대기 |
| C-4 | 순이익 계산기 확장 | ⬜ 대기 |
| — | detail_image_url 8개 상품 직접 입력 | 꽃졔님 직접 |
| — | 노출된 API 키 교체 (Gemini 3개 + Groq) | 꽃졔님 직접 |

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

## 9. 기술 패턴 레퍼런스

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
