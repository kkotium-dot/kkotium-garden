# KKOTIUM GARDEN — 프로젝트 진행 현황
> 최종 업데이트: 2026-04-10 (Phase A 전체 완료 + Vercel 배포 완료)
> TSC: 0 errors | Naver API: ok=true | 배포: https://kkotium-garden.vercel.app
> **Phase A 완료 ✅ | Vercel 배포 완료 ✅ | Phase B 대기 중**

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
| 전체 상품 | 8개 (DRAFT) |
| 주문 | 몇 건 발생 (Phase B 착수 조건 충족!) |
| 네이버 Commerce API | ok=true ✅ |
| 네이버 검색광고 API | ✅ 키워드 검색량 실시간 |
| 네이버 DataLab API | ✅ ID: F7Hga62gDOYxZ3KRtLTL |
| Discord | 5채널 ✅ |
| TSC | 0 errors ✅ |
| Vercel 배포 | ✅ https://kkotium-garden.vercel.app |
| Phase A | **전체 완료** ✅ |

### 다음 작업 = **Phase B** (주문 발생 → 즉시 착수 가능)
| Task | 내용 |
|------|------|
| B-1 | 주문 관리 페이지 (`/orders`) 신설 |
| B-2 | 발주확인 + 송장등록 반자동화 |
| B-3 | 정원 창고 네이버 실시간 동기화 |
| B-4 | 상품 자동 품절 처리 |
| B-5 | 주간 수익 보고서 자동 Discord 발송 |

---

## 0. 작업 원칙

### 코드 작성
```
- JSX 이모지 완전 금지 → Lucide React 아이콘만
- 주석 영어만, 한글 리터럴 타입 금지
- new PrismaClient() 금지 → src/lib/prisma.ts 싱글톤만
- 카테고리: NAVER_CATEGORIES_FULL 로컬만 (API 호출 금지)
- 수정 후 npx tsc --noEmit → 0 errors 확인
- 600줄+ TSX → write_file 전체 교체
- Python 패치: 파일 작성 → 실행 → rm
- prisma migrate dev 금지 → db execute 또는 Supabase SQL Editor
- framer-motion 사용 금지 (미설치) → CSS animations
- bcrypt 사용 금지 → bcryptjs (Vercel Linux 호환)
- API route에 반드시 export const dynamic = 'force-dynamic' 추가
- useSearchParams() 사용 페이지는 반드시 Suspense로 감싸기
```

### 세션 관리
```
- iterm-mcp list_sessions → launch_session
- Chrome MCP: tabs_context_mcp → navigate
- heredoc 절대 금지
- dev 서버 재시작 필요 시 꽃졔님에게 요청
```

### 환경
```
앱 루트:   /Users/jyekkot/Desktop/kkotium-garden
Dev 서버:  http://localhost:3000
프로덕션:  https://kkotium-garden.vercel.app
DB:        Supabase PostgreSQL (doxfizicftgtqktmtftf)
스토어:    꽃틔움 KKOTIUM (smartstore.naver.com/kkotium)
GitHub:    https://github.com/kkotium-dot/kkotium-garden
Vercel:    vercel.com/kkotjyes-projects/kkotium-garden
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
ORDERS: 주문 관리 (/orders) — Phase B 착수 준비
TOOLS: 거래처 ✅ | 배송 레시피 ✅ | 네이버 기본값 ✅
```

---

## 3. 완료 이력

### P0~P5
- P0~P1: 도매꾹 OpenAPI, 공급사 매핑
- P2: 정원 창고, SEO 100점, 좀비 부활소
- P3: 대시보드 v5, 업로드 준비도
- P4: 네이버 커머스 API, 꼬띠 AI
- P5: Discord, 키워드 API, 엑셀 원클릭

### Phase A (2026-04-10 완료)
| Task | 내용 |
|------|------|
| A-1~2 | 엑셀 검증 모달, AI 상품명 역반영 (기존 확인) |
| A-3 | 주소록 API 연동 |
| A-4 | deliveryInfo 역추출 |
| A-5 | 카테고리 속성 가이드 |
| A-6 | 키워드 검색량 경쟁도 자동 판단 |
| A-7 | 마진 42% Discord 경고 |
| A-8 | DataLab 트렌드 (Perplexity fallback) |
| A-9 | 판매모드 오늘 할 일 태스크 3종 |
| A-10 | SEO AEO 기초 15점 |
| A-11 | vercel.json 배포 설정 |
| A-12 | 프로덕션 빌드 검증 + 배포 완료 |

### Vercel 배포 과정에서 수정한 것 (2026-04-10)
| 수정 | 내용 |
|------|------|
| force-dynamic 74개 | API routes 빌드 에러 수정 |
| Suspense 래핑 | products, products/new 페이지 |
| framer-motion 제거 | Kkotti.tsx → CSS 애니메이션 |
| bcrypt → bcryptjs | Vercel Linux 호환 |
| mixBlendMode 제거 | 로고 렌더링 수정 |

---

## 4. 핵심 파일 경로

| 역할 | 경로 |
|------|------|
| Prisma 싱글톤 | `src/lib/prisma.ts` |
| Naver API (bcryptjs) | `src/lib/naver/api-client.ts` |
| 카테고리 | `src/lib/naver/naver-categories-full.ts` |
| 카테고리 속성 | `src/lib/category-attributes.ts` |
| 꿀통지수 | `src/lib/honey-score.ts` |
| SEO 점수 | `src/lib/seo-calculator.ts` |
| 트렌드 분석 | `src/lib/trend-analyzer.ts` |
| Discord | `src/lib/discord.ts` |
| Sidebar | `src/components/layout/Sidebar.tsx` |
| Vercel 설정 | `vercel.json` |

---

## 5. 네이버 API 현황

| API | 상태 |
|-----|------|
| 토큰 발급 (bcryptjs) | ✅ |
| 채널 정보 | ✅ 꽃틔움 KKOTIUM |
| 주문 조회 | ✅ |
| 주소록 조회 | ✅ |
| deliveryInfo 역추출 | ✅ |
| DataLab | ✅ |
| 키워드 검색량 | ✅ |

---

## 6. 알려진 이슈

| 이슈 | 대응 |
|------|------|
| prisma migrate dev 실패 | shadow DB에 naver_categories 없음 → Supabase SQL Editor 사용 |
| framer-motion 미설치 | CSS animations로 대체 (Kkotti.tsx) |
| bcrypt 금지 | bcryptjs 사용 (Vercel Linux 호환) |

---

## 7. Vercel 환경변수 (24개 등록 완료)

프로젝트: `vercel.com/kkotjyes-projects/kkotium-garden`
- DATABASE_URL, DIRECT_URL, Supabase 키
- NAVER_CLIENT_ID/SECRET (bcryptjs로 처리)
- NAVER_SEARCHAD_* (3개), NAVER_DATALAB_* (2개)
- DISCORD_WEBHOOK_* (5개)
- GEMINI_API_KEY, PERPLEXITY_API_KEY
- CRON_SECRET, NEXT_PUBLIC_APP_URL
- Cloudinary 3개

---

## 8. 기술 패턴

```typescript
// Prisma
import { prisma } from '@/lib/prisma';
// Naver API (bcryptjs!)
import { naverRequest } from '@/lib/naver/api-client';
// 카테고리
import { NAVER_CATEGORIES_FULL } from '@/lib/naver/naver-categories-full';
// 카테고리 속성 가이드
import { getCategoryAttributeGuide } from '@/lib/category-attributes';
// API route 필수
export const dynamic = 'force-dynamic';
// 로컬 .env: NAVER_CLIENT_SECRET=\$2a\$04\$... (Vercel은 $ 그대로)
```
