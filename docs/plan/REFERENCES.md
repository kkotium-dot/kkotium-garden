# 참조 자료 (핵심 파일 경로 / 알려진 이슈 / SEO 인사이트 / 기술 패턴)

> **이 파일의 역할**: 핵심 파일 경로 + 알려진 이슈 + SEO 전략 + 기술 패턴 레퍼런스. PROGRESS.md에서 분리됨 (작업원칙 #31 (b)).
> **분할 시점**: 2026-05-12 Session E-2 Phase 2 (HEAD `5892c42`)

---

## 핵심 파일 경로

| 역할 | 경로 |
|------|------|
| Prisma 싱글톤 | `src/lib/prisma.ts` |
| Naver API (bcryptjs) | `src/lib/naver/api-client.ts` |
| 카테고리 (4,993개) | `src/lib/naver/naver-categories-full.ts` |
| 카테고리 속성 | `src/lib/category-attributes.ts` |
| **꿀통지수 (SEO+마진+경쟁+보너스)** | `src/lib/honey-score.ts` |
| SEO 점수 | `src/lib/seo-calculator.ts` |
| 상품명 품질 체커 | `src/lib/product-name-checker.ts` |
| 경쟁 모니터 | `src/lib/competition-monitor.ts` |
| 굿서비스 점수 | `src/lib/good-service.ts` |
| 소싱 추천 엔진 | `src/lib/sourcing-recommender.ts` |
| 트렌드 분석 | `src/lib/trend-analyzer.ts` |
| **꼬띠 4모드 추천 (Sprint 6-D foundation)** | `src/lib/recommendation-modes.ts` + `src/lib/recommendation-runner.ts` |
| 업로드 준비도 | `src/lib/upload-readiness.ts` |
| 반품안심케어 수수료 | `src/lib/return-care-fees.ts` |
| 리뷰 감정분석 (E-11) | `src/lib/review-sentiment-analyzer.ts` |
| 자동 채우기 (E-15) | `src/lib/upload-readiness-filler.ts` |
| 도매꾹 자동 매핑 | `src/lib/crawler/auto-mapper.ts` |
| 네이버 상품 빌더 | `src/lib/naver/product-builder.ts` |
| 마진 계산기 | `src/components/products/MarginCalculator.tsx` |
| 상세페이지 빌더 | `src/components/products/DetailPageBuilder.tsx` |
| SEO 테이블 v3 | `src/components/naver-seo/NaverSeoProductTable.tsx` |
| 자동 채우기 모달 | `src/components/dashboard/AutoFillModal.tsx` |
| 등록 준비 위젯 (E-14) | `src/components/dashboard/UploadReadinessWidget.tsx` |
| 리뷰 성장 위젯 (E-2A) | `src/components/dashboard/ReviewGrowthWidget.tsx` |
| 굿서비스 위젯 | `src/components/dashboard/GoodServiceWidget.tsx` |
| 구매확정 리마인더 위젯 | `src/components/dashboard/ConfirmationReminderWidget.tsx` |
| 한달리뷰 리마인더 API | `src/app/api/orders/month-review-pending/route.ts` |
| 구매확정 리마인더 API | `src/app/api/orders/confirmation-pending/route.ts` |
| 네이버 등록 API | `src/app/api/naver/register/route.ts` |
| 자동 채우기 API (E-15) | `src/app/api/upload-readiness/auto-fill/route.ts` |
| 카카오 설정 API | `src/app/api/kakao-settings/route.ts` |
| 씨앗 심기 (3,476줄) | `src/app/products/new/page.tsx` |
| 정원 창고 (1,357줄) | `src/app/products/page.tsx` |
| 검색 조련사 | `src/app/naver-seo/page.tsx` |
| 주문 관리 | `src/app/orders/page.tsx` |
| 대시보드 | `src/app/dashboard/page.tsx` |
| 카카오 채널 설정 | `src/app/settings/kakao/page.tsx` |
| 인서트 카드 | `src/app/ops/insert-card/page.tsx` |
| 사이드바 | `src/components/layout/Sidebar.tsx` |
| cron daily | `src/app/api/cron/daily/route.ts` |
| cron weekly | `src/app/api/cron/weekly/route.ts` |

---

---

## 알려진 이슈 및 주의사항

| 이슈 | 원인 | 대응 |
|------|------|------|
| prisma migrate dev 실패 | shadow DB 없음 | Supabase SQL Editor 사용 |
| framer-motion 미설치 | 설치 안 함 | CSS animations 대체 |
| bcrypt 금지 | Vercel Linux 호환 안 됨 | bcryptjs 사용 |
| Gemini quota 소진 | 하루 1,500회/계정 | Groq fallback 자동 작동 |
| NAVER_CLIENT_SECRET $ 이스케이프 | dotenv-expand | 로컬: `\$2a\$04\$...`, Vercel: `$` 그대로 |
| Vercel 환경변수 변경 후 미반영 | 자동 재배포 안 됨 | `git commit --allow-empty && push` |
| 네이버 리뷰 API 미지원 | 커머스 API 범위 밖 | 수동 입력 + 크롤링만 |
| 알림톡 완전 무료 불가 | 카카오 딜러사 건당 과금 | 솔라피 13원, 가입 시 300포인트(23건분) |
| AI 자동 채우기 90점 도달 한계 | 11개 중 4개는 AI 영역 외 (이미지 2개/배송/마진) | 자동 max 72점 + 셀러 수동 28점 = 100점 |
| 새 채팅에서 HEAD ≠ origin/main 가능성 | 직전 채팅이 push 못하고 끝난 경우 | `git rev-parse HEAD origin/main` 교차 확인 의무 |
| 도매꾹 v4.5 옵션 해시 미스매치 | 공급사 부분 수정 시 해시 동일·텍스트 변경 | 해시 + 텍스트 동시 비교 (Sprint 6 P0-A) |
| 도매꾹 vacation 무시 | 휴가 공급사 등록 시 굿서비스 폭락 | seller.vacation 검증 (Sprint 6 P0-A) |

---

## 2026 네이버 쇼핑 SEO + 리뷰 전략 인사이트

### 핵심 변화 (리서치 통합)

```
1. 키워드 매칭 → 검색 의도 일치로 전환
   - 상품명 25~35자 최적, 속성+태그 상세 입력 → 상품명 외 키워드 노출
2. AI 추천이 검색 트래픽 20%+ 차지
   - AiTEMS ON 설정 필수 (전체 클릭 약 10%)
   - 2026.2 쇼핑 AI 에이전트: 리뷰 실시간 분석 → 상품 추천
3. 신뢰도(Trust) 지표 급부상
   - 굿서비스 점수 → 검색 랭킹 직접 반영
   - 톡톡 응답 기준 24h → 12h 강화
4. 반품안심케어 = 즉시 스위치 (건당 50~650원 → 매출 +13.6%)
5. 리뷰 = 장기 엔진 (0→10 무료, 50+ 시 알림톡 도입 검토)
6. 수수료 개편: 유입수수료 2% 폐지 → 판매수수료 2.73%
```

### 등급 체계 개편 (2025/12 시행, 2025.12.2 기준)

```
- 평가 기간: 3개월 → 1개월
- 빅파워: 4,000만 → 1,000만원/월
- 파워:   800만 → 300만원/월 (실무 보고: 800만으로 상향)
- 새싹:   200만 → 80만원/월
- 굿서비스 점수가 등급 산정에 정식 반영 (이중 평가)
```

### 단계별 운영 전략 (리서치 D항목)

```
씨앗 (월 0~200만원):
  SKU 30개 이하, 100% 단건 등록, 마진 50%+ 카테고리 집중
  전체 시간 70%를 등록 정밀도에 투자

새싹 (월 200~600만원):
  SKU 50~100개, 효자 상품 5개 식별 후 광고 집중
  반품안심케어 가입 필수 (매출 +13.6%)
  굿서비스 점수 일 단위 모니터링

파워 진입 (월 600~3,000만원):
  SKU 100~300개, 매출 상위 20% 상품에 광고 80% 집중
  Commerce API 자동 등록 일부 전환
  단골 커머스 도구 활용
  굿서비스 100건 중 2건 이내 실수 유지
```

---

## 기술 패턴 레퍼런스

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
// Vercel 환경변수:  NAVER_CLIENT_SECRET=$2a$04$...

// Groq round-robin (3keys + 401/403/JSON parse safety fallback)
// callGroq() → callGemini() → callAnthropic()

// 이모지 금지 예시
// Bad:  <span>🚚</span>
// Good: <Truck size={14} style={{ color: '#e62310' }} />

// 카카오 채널 QR URL (인서트 카드용)
// https://pf.kakao.com/_xkfALG

// 솔라피 알림톡 (E-13B 활성화 시)
// POST https://api.solapi.com/messages/v4/send
// 인증: HMAC-SHA256 (apiKey, date, salt, signature)
// npm: solapi 패키지

// 도매꾹 OpenAPI v4.5 (Sprint 6 P0-A 활용)
// https://domeggook.com/ssl/api/?ver=4.5&mode=getItemView&aid={KEY}&no={no}&om=json
// 응답: { domeggook: { basis, price, qty, deli, seller, thumb, selectOpt, category } }
// seller.vacation 휴가 검증 + channel 검증 필수
```

---
