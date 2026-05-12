# Smart Asset Workflow v3.1 FINAL — 상품 단위 적응형 자동화 시스템

> 채택일: 2026-05-12
> 채택 세션: 클로드 웹 기획 점검 세션
> 폐기 대안: v2.0 PDF "월 1회 카테고리 큐레이션 + 5섹션 일괄 템플릿"
> 핵심 철학: "자동화는 내 감각을 대신하는 게 아니라, 내 감각이 온전히 발휘될 시간을 벌어주는 도구여야 합니다."

## 1. 시스템 개요

3단계 파이프라인으로 상품 1개 단위 적응형 자동화 수행.

```
도매꾹 신상품 → Diagnosis(진단) → Automation(자동화) → Refinement(디자인) → 네이버 등록
                  ↓                    ↓                     ↓
              L1~L4 등급            등급별 분기 처리        디자이너 손길
              CTI 8축 추론          썸네일+상세 자동         (등급별 깊이 차이)
              골격 매칭
```

## 2. CTI(Concept-Tone Inference) 8축 명세

### 컨셉 4축

| 축 | 가능한 값 | 자동 추론 방법 |
|---|---|---|
| 페르소나 | 20s / 30-40s / senior / kidsmom | 카테고리 + 가격대 + 도매꾹 상품명 키워드 → Groq Llama 3.1 8B 분류 |
| 사용 맥락 | daily / gift / pro / event | 상품명·옵션명 키워드("선물", "프로", "한정") + 카테고리 매핑 |
| 가격 포지션 | budget / standard / premium | 카테고리 평균가 대비 (<70% / 70-130% / >130%) |
| 상품 유형 | single / options / set | 도매꾹 selectOpt 옵션 수 + 옵션명 패턴 |

### 톤앤매너 4축

| 축 | 가능한 값 | 자동 추론 방법 |
|---|---|---|
| 컬러 무드 | warm / calm / vivid / mono | Sharp 픽셀 통계(평균 RGB, 채도 분포) + 카테고리 디폴트 |
| 감성 톤 | friendly / professional / sensory / trust | 페르소나 + 가격 매트릭스에서 자동 도출 |
| 사진 스타일 | white / lifestyle / detail | 진단 단계 배경 균일도 + 구도 분석 결과 재사용 |
| 장르 | korean / minimal / vintage / natural | 카테고리 + 페르소나 → 6개 장르 중 매칭 |

### 추론 비용·정확도

- Groq Llama 3.1 8B: 무료, 상품당 약 500 토큰 = 1초 미만
- Claude Vision 보강(D 등급 또는 신뢰도 70% 미만): 본 앱 API 호출 이미지당 약 ₩10
- 새싹 단계 월 10건 이하 보강 = 월 ₩100 미만
- ANTHROPIC_MONTHLY_CAP 환경변수로 월 한도 cap, 도달 시 Sharp 4축만 fallback

### TypeScript 인터페이스

```typescript
interface ConceptTone {
  persona: '20s' | '30-40s' | 'senior' | 'kidsmom';
  context: 'daily' | 'gift' | 'pro' | 'event';
  pricePosition: 'budget' | 'standard' | 'premium';
  productType: 'single' | 'options' | 'set';
  colorMood: 'warm' | 'calm' | 'vivid' | 'mono';
  emotionalTone: 'friendly' | 'professional' | 'sensory' | 'trust';
  photoStyle: 'white' | 'lifestyle' | 'detail';
  genre: 'korean' | 'minimal' | 'vintage' | 'natural';
}

interface DiagnosisResult {
  qualityScore: number;        // 0-100
  competitionScore: number;    // 0-2 (1.0 = 카테고리 평균)
  roiScore: number;            // 음수=ROI 없음, 양수=ROI 있음
  grade: 'L1' | 'L2' | 'L3' | 'L4';
  conceptTone: ConceptTone;
  skeletonId: 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' | 'S9' | 'S10' | 'S11' | 'S12';
  inferenceConfidence: number; // 0-100
  diagnosedAt: Date;
}
```

## 3. L1~L4 등급 체계

| 등급 | 적용 조건 | 자동 처리 | 디자이너 개입 | 시간 | 비용/상품 |
|---|---|---|---|---|---|
| **L1 Light** | qualityScore≥80 + roiScore 음수 | 누끼+가격라벨 썸네일 + Groq 카피 3블록 + 3섹션 | 모바일 PWA 스와이프 승인 | 2-3분 | 거의 무료 |
| **L2 Medium** | qualityScore≥60 + competitionScore<0.8 | L1 + 5섹션 가변 합성 + Stock 라이프스타일 1장 | 데스크톱 카피 검수 + 미리보기 한 화면 승인 | 6-10분 | ~₩100 |
| **L3 Heavy** | roiScore 양수 + competitionScore≥0.8 | L2 + Claude 세션 사전 생성 Firefly 후보 3장 + Adobe Stock 후보 2장 | 후보 선택 + 텍스트 위치 미세 조정 + 필요시 Photoshop | 15-25분 | ~₩500 |
| **L4 Custom** | qualityScore<40 또는 예상마진 5배+ | 진단 + 권장 작업 범위 + Photoshop Variables CSV 자동 생성 | 풀 수동 (PSD 마스터 + Lightroom + Generative Fill/Harmonize) | 30-60분 | 디자이너 시간 |

## 4. 12개 레이아웃 골격 (S1~S12)

### 골격 매트릭스

| # | 별명 | 컨셉 시그니처 | 톤 시그니처 | 섹션 수 | 적합 카테고리 |
|---|---|---|---|---|---|
| S1 | 가성비 일상 미니멀 | budget·daily·single | friendly·white·minimal | 3 (Hero/스펙/배송) | 잡화, 소형가전, 문구 |
| S2 | 표준 일상 친근 (주력) | standard·daily·options | friendly·lifestyle·korean | 5 (Hero/문제/해결/사용예/CTA) | 리빙, 생활용품 |
| S3 | 프리미엄 선물세트 | premium·gift·set | trust·detail·minimal | 6 (+스토리+패키지컷) | 명절선물, 뷰티세트 |
| S4 | 표준 전문 신뢰 | standard·pro·single | professional·white·minimal | 5 (Hero/핵심성능/비교표/보증/CTA) | 가전, 공구, 의료기기 |
| S5 | 가성비 키즈맘 한국형 | budget·daily·set | friendly·vivid·korean | 4 (Hero/옵션소개/사용예/CTA) | 식품, 주방잡화, 키즈 |
| S6 | 표준 선물 감각 | standard·gift·single | sensory·lifestyle·minimal | 5 (Hero/스토리/연출컷/스펙/CTA) | 향초, 홈데코, 소품 |
| S7 | 프리미엄 전문 신뢰 | premium·pro·single | trust·white·minimal | 6 (Hero/기술/임상/비교/보증/CTA) | 건강기능식품, 의료기기 |
| S8 | 시즌 이벤트 비비드 | standard·event·set | sensory·vivid·korean | 5 (시즌후크/상품/옵션/사용예/CTA) | 한정판, 기획상품 |
| S9 | 자연주의 따뜻 | budget·daily·single | friendly·warm·natural | 4 (Hero/소재/사용예/배송) | 친환경, 반려용품, 식물 |
| S10 | 프리미엄 일상 감각 | premium·daily·options | sensory·calm·minimal | 6 (Hero/철학/디테일/사용예/리뷰/CTA) | 패션, 디자이너 브랜드 |
| S11 | 빈티지 한정 | standard·event·single | friendly·vivid·vintage | 4 (Hero/이벤트내용/혜택/CTA) | 콜라보, 한정판 |
| S12 | 산업 도구 차분 | budget·pro·options | professional·calm·minimal | 5 (Hero/스펙표/규격/사용예/배송) | 산업용, 도구, 소모품 |

### 골격 1개 구조 예시 (S2 — 가장 흔한 케이스)

```yaml
S2_standard_daily_lifestyle:
  description: "표준 일상 친근형 - 새싹 셀러 주력 골격"
  match_signature:
    concept: [standard, daily, options OR single]
    tone: [friendly, lifestyle, korean]
  sections:
    - id: hero
      height: 1080
      layout: "centered_product + tagline"
      copy_tone: "친근체, 한 줄 후크"
      bg_color_token: "warm_50"
    - id: problem
      height: 1400
      layout: "3_bullet_with_icons"
      copy_tone: "공감 질문 + 페인 포인트 3개"
    - id: solution
      height: 1600
      layout: "product_closeup + 3_benefits"
      copy_tone: "구체적 강점, 숫자 1개 이상"
    - id: usage
      height: 1500
      layout: "lifestyle_shot + caption"
      copy_tone: "일상 시나리오 1-2문장"
    - id: cta
      height: 800
      layout: "shipping + return + good_service_badge"
      copy_tone: "안심 문구, 공정위 표준 표현"
  total_height: 6380
  width: 860
  color_tokens:
    primary: "#E89B73"
    secondary: "#F4E4D7"
    accent: "#3D2C1E"
  fonts:
    title: "Pretendard Bold"
    body: "Pretendard Regular"
  copy_global_tone: "친근, 1인칭 권유, 이모지 0개"
```

### 골격 매칭 로직 (skeleton-matcher.ts 의사코드)

```typescript
function matchSkeleton(concept: ConceptTone): SkeletonId {
  if (concept.pricePosition === 'premium' && concept.context === 'gift') return 'S3';
  if (concept.pricePosition === 'premium' && concept.context === 'pro') return 'S7';
  if (concept.pricePosition === 'premium' && concept.context === 'daily') return 'S10';
  if (concept.context === 'pro' && concept.emotionalTone === 'professional') {
    return concept.pricePosition === 'budget' ? 'S12' : 'S4';
  }
  if (concept.context === 'event') {
    return concept.genre === 'vintage' ? 'S11' : 'S8';
  }
  if (concept.persona === 'kidsmom' || (concept.pricePosition === 'budget' && concept.productType === 'set')) return 'S5';
  if (concept.genre === 'natural') return 'S9';
  if (concept.context === 'gift') return 'S6';
  if (concept.pricePosition === 'budget' && concept.productType === 'single') return 'S1';
  return 'S2'; // 디폴트 주력 골격
}
```

## 5. Claude 디자인 자원 활용 맵

| 자원 | Diagnosis | Automation L1/L2 | Refinement L3/L4 |
|---|---|---|---|
| Adobe for Creativity MCP | — | — | create_firefly_board, search_design+fill_text, asset_search, image_apply_preset(80+) |
| Canva MCP | — | — | generate-design + export-design (SNS·배너 보조) |
| Claude Artifacts | CTI 시각화 위젯 | 5섹션 미리보기 / SEO 점수 / 다크패턴 필터 | A/B/C/D 시뮬레이터 / 컬러 팔레트 시안 |
| Claude Skills | — | canvas-design(SVG 오버레이), frontend-design(검수 UI) | theme-factory(12 골격 일괄), pdf/docx/xlsx(부속 문서), brand-guidelines |
| PlayMCP NaverSearch | datalab_shopping_category, search_shop | — | — |
| Claude Vision | 8축 보강 추론(옵션 2) | — | 디자이너 수동 분석(옵션 1, 비용 0) |

## 6. 본 앱 코드 구조

```
src/lib/
├── diagnosis/
│   ├── image-quality.ts              # Sharp 4축 + Cloudinary + Vision 점수화
│   ├── competition-analysis.ts       # 네이버 API + DataLab + Playwright 캐시
│   ├── ai-roi.ts                     # ROI 계산
│   ├── concept-tone-inference.ts     # CTI 8축 추론 (Groq + Vision 보강)
│   ├── grading.ts                    # L1~L4 + 골격 매칭 통합
│   └── prompts/
│       └── vision-quality-prompt.ts
├── automation/
│   ├── layout-skeletons/             # 12개 골격 JSON
│   │   ├── index.ts
│   │   ├── s1-budget-daily.ts
│   │   ├── s2-standard-daily.ts
│   │   └── ... (s3~s12)
│   ├── skeleton-matcher.ts           # CTI → 골격 매칭 로직
│   ├── thumbnail-generator.ts        # 4변형 자동 생성
│   ├── cloudinary-pipeline.ts        # named transformation wrapper
│   ├── sharp-composite.ts            # 재사용 합성 빌딩블록
│   ├── lifestyle-picker.ts           # 골격 태그 기반 라이브러리 검색
│   ├── copy-writer.ts                # Groq + 다크패턴 필터 + 톤 매니저
│   └── section-builder.ts            # 5섹션 가변 생성
├── refinement/
│   ├── psd-csv-export.ts             # Photoshop Variables용 CSV 생성
│   ├── asset-uploader.ts             # 디자이너 완성품 SKU 매칭
│   ├── review-queue.ts               # 검수 큐 상태 머신
│   └── skeleton-override-ui.ts       # 디자이너 골격 교체 핸들러
└── naver/
    ├── search-api.ts
    ├── datalab-api.ts
    └── good-service-score.ts

app/api/
├── diagnose/route.ts                 # POST: 진단 + CTI + 골격 매칭
├── automate/[grade]/route.ts         # POST: 등급별 자동 처리
├── thumbnail/[sku]/route.ts          # POST: 썸네일 4변형
├── copy/route.ts                     # POST: Groq 카피
├── review/route.ts                   # GET/POST: 검수 큐
├── refine/upload/route.ts            # POST: 디자이너 완성품 업로드
└── competition/[category]/route.ts   # GET: 카테고리 평균 캐시
```

## 7. Prisma 스키마 추가

```prisma
model Diagnosis {
  id                  String   @id @default(cuid())
  skuId               String   @unique
  
  qualityScore        Float
  qualitySignals      Json
  visionComment       String?
  
  competitionScore    Float
  competitionSamples  Json
  
  roiScore            Float
  roiBreakdown        Json
  
  conceptTone         Json     // ConceptTone 인터페이스 JSON 저장
  skeletonId          String   // 'S1' ~ 'S12'
  inferenceConfidence Float
  
  grade               Grade
  recommendedSections String[]
  
  diagnosedAt         DateTime @default(now())
}

enum Grade { L1 L2 L3 L4 }

model LifestyleAsset {
  id           String   @id @default(cuid())
  category     String
  tags         String[]   // 골격 매칭용 태그
  moodTags     String[]   // 톤 매칭용 태그
  source       String     // 'unsplash' | 'pexels' | 'adobeStock' | 'firefly'
  licenseUrl   String
  storageUrl   String
  width        Int
  height       Int
  colorPalette Json
  lastUsedAt   DateTime?
  usedBySkus   String[]
  
  @@index([category])
  @@index([tags])
}
```

## 8. 환경변수 보안 체크리스트 (Anthropic API 도입 전 필수)

1. `.env*` 와일드카드 + `!.env.example` 예외만 .gitignore에 명시
2. `.env.backup.*` 패턴 명시적 차단
3. `ANTHROPIC_API_KEY`는 Vercel Sensitive 토글 ON
4. `NEXT_PUBLIC_` 접두사로 ANTHROPIC_API_KEY 절대 노출 금지
5. API route에서 `process.env` 전체 echo back 금지
6. `console.log(env.X_KEY)` 금지
7. pre-commit hook에 `gitleaks` 또는 `git-secrets` 도입
8. Source map production 비활성화
9. Sentry 등 모니터링 도구 env 자동 캡처 scrub 설정
10. Preview deployment basic auth 또는 검색엔진 차단 헤더
11. `ANTHROPIC_MONTHLY_CAP` 환경변수로 월 비용 한도 cap
12. 한도 도달 시 Sharp 4축만 작동하는 자동 fallback 회로

## 9. 12주 점진적 로드맵

| Week | Sprint | 산출물 |
|---|---|---|
| 1-2 | 7-Diag MVP | Sharp 4축 + CTI 룰 기반 + 대시보드 L 배지 |
| 2-3 | 7-Skel | 12개 골격 JSON + Tailwind 토큰 (Skills theme-factory 활용) |
| 3-5 | 7-M1 + 7-M2 | 썸네일 4변형 + 5섹션 가변 합성 + Groq 카피 + 다크패턴 필터 |
| 6-8 | 7-Lib | Adobe MCP 100-200장 시드 + Supabase Storage 인덱스 |
| 9-12 | 7-M3 | PSD CSV 머지 + L4 디자이너 풀 워크플로우 |

## 10. 참고

- 직전 'Sprint 6 재검토' 채팅 (2026-05-07): 5섹션 자체 제작 + HTML 카피 원칙 결정 → v3.1에서 유지
- 직전 'Sprint X' 채택 (2026-05-11): Gemini 제거 + 5섹션 일괄 템플릿 → v3.1에서 폐기
- 본 v3.1 FINAL 채택 (2026-05-12): 상품 단위 적응형 + CTI + 12 골격으로 재구성
- 사용자 핵심 철학: "자동화는 내 감각을 대신하는 게 아니라, 내 감각이 온전히 발휘될 시간을 벌어주는 도구여야 합니다."
