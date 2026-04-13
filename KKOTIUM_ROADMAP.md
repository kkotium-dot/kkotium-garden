# KKOTIUM GARDEN — 전체 작업 로드맵
> 최종 업데이트: 2026-04-13
> **Phase A ✅ 완료 | Phase B ✅ 완료 | Phase C 진행 중**

---

## Phase A: 무료 기능 전부 적용 + 배포 ✅ 완료 (2026-04-10)

| Task | 상태 | 내용 |
|------|------|------|
| A-1 | ✅ | 엑셀 다운로드 전 검증 모달 |
| A-2 | ✅ | 검색 조련사 AI 상품명 역반영 |
| A-3 | ✅ | 주소록 API 연동 |
| A-4 | ✅ | deliveryInfo 역추출 |
| A-5 | ✅ | 카테고리별 필수 속성 가이드 |
| A-6 | ✅ | 꿀통지수 키워드 검색량 가중치 |
| A-7 | ✅ | 마진 위험 Discord 고도화 |
| A-8 | ✅ | 네이버 DataLab 트렌드 연동 (Perplexity → silent fallback) |
| A-9 | ✅ | 오늘 할 일 지능화 확장 |
| A-10 | ✅ | SEO 2026 AEO 업데이트 |
| A-11 | ✅ | Vercel 배포 설정 |
| A-12 | ✅ | 프로덕션 빌드 검증 + 배포 |

---

## Phase B: 매출 발생 후 운영 자동화 ✅ 완료 (2026-04-12)

| Task | 상태 | 내용 | 완료일 |
|------|------|------|--------|
| B-1 | ✅ | 주문 관리 v3 (상태필터/드로어/동기화) | 2026-04-11 |
| B-2 | ✅ | 발주확인 + 송장등록 반자동화 | 2026-04-12 |
| B-3 | ✅ | 정원 창고 네이버 실시간 동기화 버튼 + 불일치 뱃지 | 2026-04-12 |
| B-4 | ✅ | 상품 자동 품절 처리 (cron/daily) | 2026-04-12 |
| B-5 | ✅ | 주간 수익 보고서 자동 생성 → Discord | 2026-04-12 |

---

## Phase C: 성장기 확장 (진행 중)

| Task | 상태 | 내용 |
|------|------|------|
| C-1 | ⬜ 대기 | 커머스 API 직접 상품 등록 (deliveryInfo JSON 인라인) |
| C-2 | ⬜ 대기 | AI 상세페이지 Q&A 구조화 (Gemini AEO, quota 리셋 후) |
| C-3 | ⬜ 대기 | 대량 등록 배치 파이프라인 (소싱보관함 10개 일괄) |
| C-4 | ⬜ 대기 | 순이익 계산기 확장 (광고비/반품비/택배비 차감 실이익) |
| **C-5** | **✅ 완료** | **꼬띠 추천 v2 (TOP5+소싱보관함+검색량+대시보드 등록버튼)** |

---

## 2026-04-13 완료 작업 (이번 세션)

### UI 원칙 확립 및 전면 적용
- **이모지 완전 제거**: JSX 내 모든 이모지 → Lucide React SVG 아이콘 교체
  - `products/new/page.tsx`: lucide-react import 추가, DSection icon prop `React.ReactNode`
  - `ProductFilters`, `ProductSort`, `ProductStats`, `ProductTable`, `SourcedProductManager`
  - `QuickActions`, `SearchFilter`, `ViewToggle`, `ProductForm` 등 전체
  - `workflow/page.tsx` 완전 재작성 (5단계 운영 가이드, Lucide 아이콘)
  - `crawl/page.tsx`, `naver-seo/page.tsx`, `settings/platforms/page.tsx` 등

- **상태 라벨 통일**:
  - `초안` → `임시저장`
  - `ACTIVE` 변경 메뉴 라벨 → `판매 중`
  - `pending` 탭 → `네이버 등록 대기`
  - `ProductSort.tsx`: `icon` prop optional로 변경

### AI API 체계 개선
- **cron Perplexity 분리**: `trend-analyzer.ts` fallback → `{ trendKeywords: [], trendCategories: [], source: 'fallback' }` (silent)
- **Groq 무료 fallback 추가**: `llama-3.1-8b-instant`, 하루 14,400회 무료
  - `ai-generate/route.ts`: Gemini → Groq → Perplexity 순서
  - Vercel 환경변수 `GROQ_API_KEY` 등록 완료
  - 브라우저 테스트 완료: `ok: true, provider: groq-llama3`

### 검색 조련사 SEO 인라인 편집 패널 v3
- `NaverSeoProductTable.tsx` 전면 재작성
- 행 클릭 시 열리는 인라인 패널:
  - 꼬띠 AI 최적화 버튼 3개 (정석SEO / 감성타겟 / 틈새키워드)
  - SEO 검색최적화 필드 전체 직접 편집 가능:
    네이버 상품명 / 키워드 / 상품설명 / 브랜드 / 원산지 / 소재 / 색상 / 사이즈 / 세탁방법
  - SEO 태그 인라인 추가/삭제 (최대 10개)
  - **전체 저장 버튼** → `PATCH /api/products/{id}` 한 번에 저장
  - 저장 완료 시 초록색 체크 표시 (2초 후 자동 복원)
  - 글자수 실시간 표시 (상품명 25~40자, 설명 80~200자 가이드)
  - 키워드 입력 시 칩 미리보기 자동 업데이트
- 브라우저 테스트 완료: 21개 입력 필드, 전체 저장 버튼, AI 버튼 모두 정상

---

## 미분류 개선 항목

| 항목 | 내용 | 우선순위 |
|------|------|---------|
| detail_image_url 입력 | 기존 8개 상품 씨앗 심기 편집 모드에서 직접 입력 (꽃졔님 직접) | 낮음 |
| API 키 교체 | 노출된 Gemini 3개 + Groq 키 교체 권장 | 보안 |
| 사이드바 배지 실시간화 | 소싱/등록대기/품절 숫자 실시간 업데이트 | 낮음 |
| 대시보드 파이프라인 배지 | 병목 구간 숫자 표시 | 낮음 |
| 엑셀 다운로드 이미지 경고 | 상세이미지 없는 상품 다운로드 시 강화 경고 | 낮음 |

---

## 비용 로드맵

| 시점 | 비용 |
|------|------|
| **지금 (Phase A+B+C 전체)** | **0원** |
| 월 매출 50만+ | Gemini 유료 ~$20/월 |
| 월 매출 100만+ | Supabase Pro $25/월 |
| 월 매출 200만+ | Vercel Pro $20/월 |

---

## 새 채팅 시작 체크리스트

1. `KKOTIUM_PROGRESS.md` 전체 읽기
2. `KKOTIUM_ROADMAP.md` 전체 읽기
3. 해당 TASK 관련 코드 파일 확인
4. 꽃졔님 승인 후 작업 시작
5. 완료 후 **두 파일 모두** 업데이트

## 중요 체크포인트

- 코드 수정 후: `npx tsc --noEmit` → **0 errors** 확인 필수
- push 전: 이모지 없는지 확인 (`grep -rn "이모지" src/`)
- Vercel 환경변수 변경 후: 반드시 `git commit --allow-empty && push`
- 브라우저 테스트: API 성공만으로 완료 처리 금지, 반드시 Chrome MCP로 확인
