# HANDOFF — G8-ENGINE-Q4 Adobe Workflow SOP 시스템화 + 누끼·합성 파이프라인

> **상태**: OPEN (Code Phase G8-ENGINE-Q4 착수 대기)
> **작성**: 2026-05-29 Desktop turn (대표 지시: "누끼=Express, 합성=Firefly 편집, 모델 비교 활용, 명화송풍구 햇살 전환")
> **베이스라인**: 4cd524f (G8-ENGINE-Q3 [코드 완료], Vercel READY)
> **선행 권위 출처**: docs/research/KKOTIUM_ADOBE_WORKFLOW_RESEARCH_2026-05-29.md (Adobe SOP)
> **선행 권위 출처**: docs/research/KKOTIUM_ART_DIRECTION_RESEARCH_2026-05-29.md (카테고리×톤 매핑 + 법적 게이트)
> **선행 인계**: HANDOFF_g8_engine_q3_2026-05-29.md (Q3 완료 보고)

---

## 0. TL;DR (Code가 먼저 읽을 요약)

대표 지시 3건이 시스템 SOP가 됨:
1. **Adobe 도구 분업 표준화**: 누끼=Express, 배경생성·합성=Firefly(웹), 정밀합성=Photoshop. 시스템이 변형 유형별 도구·모델을 자동 결정해야 함.
2. **Firefly 모델 6종 풀라인업 확인**: Firefly Image 3/4/4Ultra/5 (상업 면책) + Gemini 2.5/3/3.1 (파트너) + GPT Image 1.5/2. 모델 선택 시스템 룰 필요.
3. **명화송풍구 톤 전환 완료**: 다크 시네마틱 폐기 → 자연광 우드 책상 backdrop 확보. **이전 Firefly_E(다크 차량) 자산은 시스템에서 폐기 결정**, 새 Firefly_E_v2(자연광 책상) 대체.

Q4 SCOPE = 5개 신규 모듈 + 3개 기존 고도화 + asset-legal-gate 보강.

---

## 1. Desktop 완료 사항 (Q3 + 이번 turn)

### 1-A. 누적 Firefly 백드롭 자산 (대표 다운로드 폴더)

| 파일 (Firefly 패턴) | 모델 | 톤 | 상품 정합 | 1순위 매핑 |
|---|---|---|---|---|
| Firefly_A (우드 키친) | Nano Banana 2 | 킨포크 자연광 | 보조 | 아이스트레이 S2 lifestyle |
| Firefly_B (베이지 시멘트) | Nano Banana 2 | 모던 미니멀 럭셔리 | 보조 | 아이스트레이 S5 price |
| Firefly_C (도마 + 푸드) | Nano Banana 2 | 감성 SNS | 보조 | 아이스트레이 S6 social |
| Firefly_D (화이트 마블) | Nano Banana 2 | 한국형 모던미니멀 | **🔥 아이스트레이 1순위** | S1 clean / S4 main |
| ~~Firefly_E (다크 차량 시네마틱)~~ | ~~Nano Banana 2~~ | ~~Foreign Cinematic Dark~~ | **🔴 폐기 (톤 부정합)** | — |
| Firefly_F (한지 갤러리) | Nano Banana 2 | korean-traditional | **🔥 달항아리 1순위** | S1 clean / S4 main |
| **Firefly_E_v2 (자연광 우드 책상)** | **Firefly Image 5 (네이티브)** | **자연광 햇살 인상주의** | **🔥 명화송풍구 1순위 (대체)** | **S1 clean / S4 main + lifestyle 합성 base** |

### 1-B. Firefly 모델 6종 풀라인업 확인 (Adobe 공식 UI 직접 검증)
- Adobe 모델 (상업적 안전): Firefly Image 5, Firefly Image 4 Ultra, Firefly Image 4, Firefly Image 3
- 파트너 모델 (크리에이터 책임): GPT Image 2, GPT Image 1.5, Gemini 3.1 (w/ Nano Banana 2), Gemini 3 (w/ Nano Banana Pro), Gemini 2.5 (w/ Nano Banana)

### 1-C. 명화송풍구 누끼 자산 부족 진단 (CRITICAL)
- `mainImage` = 4세트 비교 컷 (단품 누끼 불가, 4번 누끼 필요)
- `images[0]` = 도매꾹 stt_330 저해상 (1000×1000 사이즈 부족)
- `additionalImages` = null
- **다음 세션 Desktop 작업**: Adobe Express에서 4세트 비교 컷의 단품 4종 누끼 추출 → Firefly Image 5 + Composition Reference 합성

---

## 2. Code Q4 SCOPE — Adobe Workflow 시스템화

### 2-A. 신규: src/lib/automation/adobe-tool-router.ts

리서치 §1, §6 도구 분업을 시스템에 새김.

```typescript
// 입력: 변형 유형 (variant) + ToneDirective + 자산 보유 상태
// 출력: AdobeToolPlan {primaryTool, model, fallbackTool, rationale}

type AdobeTool = 'express' | 'firefly-generate' | 'firefly-edit' | 'photoshop-fill';
type FireflyModel = 
  | 'firefly-image-5'           // commercial-safe, 4MP, layered editing
  | 'firefly-image-4-ultra'     // commercial-safe, complex detail
  | 'firefly-image-4'           // commercial-safe, fast
  | 'gemini-3-nano-banana-pro'  // partner, 4K, Korean text
  | 'gemini-3-1-nano-banana-2'  // partner, balanced
  | 'gemini-2-5-nano-banana'    // partner, fast composite
  | 'imagen'                    // partner, product fidelity
  | 'gpt-image-2';              // partner, artistic

interface AdobeToolPlan {
  variant: 'clean' | 'lifestyle' | 'price' | 'badge';
  primaryTool: AdobeTool;
  model?: FireflyModel;
  fallbackTool?: AdobeTool;
  commercialSafety: 'adobe-indemnified' | 'creator-liable';
  rationale: string;
}

function planAdobeWorkflow(
  variant: ThumbnailVariant,
  toneDirective: ToneDirective
): AdobeToolPlan;
```

매핑 룰 (리서치 §6-E):
- **clean**: Adobe Express 누끼 (무크레딧·빠름) + 최종 textless Firefly 5 재생성 (면책)
- **lifestyle**: Firefly Image 5 Generate (배경) + Composition Reference (누끼) + Photoshop 비파괴 합성
- **price**: Adobe Express (텍스트·Brand Kit)
- **badge**: Adobe Express 텍스트 합성 + Firefly Image 5 (면책 필요 시)

baseTone별 모델 가중치:
- `korean-traditional` → Gemini 3.1/Pro (한국 미감 우위) + 최종 Firefly 재생성
- `foreign-cinematic` / `modern-minimal` → Firefly Image 5 (상업 안전)
- `kinfolk` 라이프스타일 → Nano Banana 2.5 합성 (편집력)
- 제품 충실도 critical (라벨·금속·유리) → Imagen

### 2-B. 신규: src/lib/automation/cutout-strategy.ts

누끼 추출 전략 (리서치 §1-A, §6).

```typescript
interface CutoutStrategy {
  source: 'product-main-image' | 'product-additional' | 'manual-upload';
  tool: 'adobe-express' | 'photoshop' | 'firefly-edit';
  qualityGate: {
    minWidth: 1000;
    minHeight: 1000;
    maxFileSizeMB: 4;  // Express 무료 5MB 한계 회피
    formatRequired: ['png', 'webp'];  // 투명도 필수
  };
  reasonIfBlocked?: string;  // 예: "이미지 해상도 부족 (stt_330)"
}

function planCutoutWorkflow(product: Product): CutoutStrategy;
```

명화송풍구 같은 케이스 자동 차단:
- `images[0]` 패턴이 도매꾹 `stt_330` (저해상) → 차단 + "수동 업로드 필요" 안내
- `mainImage` 단일 제품 컷 아님 (다중 진열) → 차단 + "단품 누끼 추출 필요" 안내

### 2-C. 신규: src/lib/automation/composition-reference.ts

리서치 §7-A Composition Reference 자동화.

```typescript
// 누끼 PNG를 Firefly Generate API에 reference로 전달
// (현재 Firefly API 직접 호출 미지원 시 Chrome MCP 자동화 + manual flag)

interface CompositionReferencePlan {
  cutoutAssetUrl: string;  // 누끼 PNG (Supabase Storage)
  backdropPrompt: string;
  model: FireflyModel;
  strength: number;  // 0.0-1.0
  seed: number;      // 동일 시드 = 4변형 톤 일관성
  styleReferenceUrl?: string;  // 브랜드 톤 무드보드
}

function buildCompositionPlan(
  product: Product,
  variant: ThumbnailVariant,
  toneDirective: ToneDirective,
  cutout: CutoutAsset
): CompositionReferencePlan;
```

### 2-D. 신규: src/lib/automation/brand-kit-spec.ts

Adobe Express Brand Kit 명세 (리서치 §1-A, §6).

```typescript
// KKOTIUM 브랜드 키트를 시스템 출력으로 노출
// Express UI에 일관 적용 (수동 import 또는 향후 Express API 자동화)

export const KKOTIUM_BRAND_KIT = {
  colors: {
    brandRed: '#E62310',
    brandPink: '#FFCCEA',
    ink: '#111111',
    paper: '#FFFFFF',
  },
  typography: {
    korean: 'Pretendard',
    english: 'Inter',
    sizeScale: {
      senior: 1.3,    // 18pt+ (리서치 §5-C)
      default: 1.0,
    },
  },
  contrastMin: {
    senior: 7.0,      // WCAG AAA
    default: 4.5,     // WCAG AA
  },
} as const;
```

### 2-E. 고도화: src/lib/automation/asset-legal-gate.ts (Q3 모듈 확장)

리서치 §4 + 권위 면책 룰 추가.

```typescript
// 추가 게이트:
// 1. 파트너 모델 결과 = 크리에이터 책임 → 최종 상업컷은 Firefly 네이티브 재생성 강제
// 2. 도매꾹 상세페이지 감성 연출 컷 무단 변형 차단 (저작권법 제136조)
// 3. 명화 라벨 = 작가 사후 70년 PD만 (대표 명시 승인 플래그)

type LegalBlock = 
  | { type: 'face-detected', confidence: number }
  | { type: 'masterpiece-copyright', keyword: string }
  | { type: 'realistic-person', confidence: number }
  | { type: 'partner-model-final-commercial',    // 신규
      model: FireflyModel, 
      requiresFireflyNativeRegeneration: true }
  | { type: 'domeggook-emotional-shot-derivative', // 신규
      sourceUrl: string,
      requiresOriginalApproval: true };

// 명화송풍구처럼 master_pd_verified 플래그 적용 메커니즘
interface LegalApprovalOverride {
  productId: string;
  approvalType: 'master_pd_verified' | 'partner_model_business_accepted';
  approvedBy: 'kkoje' | 'system';
  evidence: string;  // 예: "반 고흐 1960 PD / 모네 1996 PD"
  approvedAt: Date;
}
```

DB 신규 컬럼 또는 테이블:
```sql
ALTER TABLE "Product" ADD COLUMN "legalApproval" TEXT;
-- 또는
CREATE TABLE "ProductLegalApproval" (
  id TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL REFERENCES "Product"(id),
  "approvalType" TEXT NOT NULL,
  "approvedBy" TEXT NOT NULL,
  evidence TEXT,
  "approvedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 2-F. 고도화: src/lib/automation/category-tone-mapper.ts (Q3 모듈)

명화송풍구 톤 결정 변경:
- 기존: `foreign-cinematic` + `darkPremium: true` (다크)
- 신규: `foreign-cinematic-sunlit` + `naturalLight: true` (햇살)

```typescript
type BaseTone = 'modern-minimal' | 'kinfolk' | 'korean-traditional' | 
                'foreign-cinematic' | 'foreign-cinematic-sunlit' |  // 신규
                'pastel-friendly';

// fragrance 카테고리 매핑 업데이트
const FRAGRANCE_TONE: ToneDirective = {
  categoryGroup: 'automotive-fragrance',
  trustSignal: 'fragrance',
  baseTone: 'foreign-cinematic-sunlit',  // 변경
  colorMood: 'warm',                      // mono → warm (자연광)
  modelPolicy: 'no-human',
  darkPremium: false,                     // 변경
  naturalLight: true,                     // 신규
};
```

### 2-G. 고도화: art_director_prompts seed 업데이트

리서치 §3-D 5종 프롬프트 추가:
- "자연광 우드 책상" (1순위)
- "카페 창가"
- "자연광 차량 인테리어" (2순위)
- "우드 인테리어 선반"
- "발코니 햇살"

기존 #4 "Cinematic dark luxury car interior" 프롬프트는 `status='deprecated'`로 표시 (삭제 X — 리서치 추적성).

### 2-H. 신규: scripts/cutout-quality-check.js

대표가 Adobe Express에서 누끼 추출 후 업로드 전 자동 검증.

```bash
node scripts/cutout-quality-check.js <localPath>
# 검증:
# - 1000×1000 이상
# - 4MB 이하
# - 투명도 알파 채널 존재
# - 외곽선 클린 (단순 휴리스틱 — Sharp metadata)
```

---

## 3. 실행 순서 (의존성)

1. **DB 마이그레이션** — `Product.legalApproval` 또는 `ProductLegalApproval` 테이블 신규
2. **명화송풍구 legalApproval seed** — `master_pd_verified` 적용 (반 고흐 1960 / 모네 1996 PD 증거)
3. **category-tone-mapper.ts 고도화** — `foreign-cinematic-sunlit` 추가, 명화송풍구 톤 전환
4. **adobe-tool-router.ts 신규** — 변형×톤 → 도구·모델 결정
5. **cutout-strategy.ts 신규** — 자산 보유 상태 기반 누끼 전략
6. **composition-reference.ts 신규** — Firefly Composition Reference 자동화 계획
7. **brand-kit-spec.ts 신규** — KKOTIUM Brand Kit 상수 노출
8. **asset-legal-gate.ts 확장** — 파트너 모델·도매꾹 감성컷 게이트 추가
9. **art_director_prompts seed 갱신** — 5종 자연광 프롬프트 + #4 deprecated
10. **scripts/cutout-quality-check.js 신규**
11. **production 검증** — 표본 3종 응답에 `adobeWorkflow`, `cutoutStrategy`, `legalApproval` 노출

각 단계 TSC 0 / build 0 / verify-vercel exit 0.

---

## 4. 절대 준수

한글 literal / 이모지 금지(Lucide) / 영어 주석 / 한글 리터럴 타입 금지 / heredoc 금지(#26) / 거짓 라벨 금지(#46) / new PrismaClient 금지(prisma 싱글톤) / 외부 이미지 API 런타임 0(#38) / Production=Vercel only / SD-01 아랍어 footer 보존 / 비가역 0(네이버 미발행).

### 4-A. 신규 하드 룰

- **파트너 모델 최종 상업컷 차단**: clean/badge 변형의 최종 산출물은 Firefly 네이티브 (Image 4/5)로만 가능. 파트너 모델은 lifestyle 중간 자산까지만.
- **명화송풍구 legalApproval**: `master_pd_verified` 플래그가 있어야만 legalGate 통과.
- **누끼 품질 게이트**: 1000×1000 이하 입력 차단 (시스템적 게이트).
- **도매꾹 감성 연출 컷 무단 변형 금지**: 단순 제품컷만 차용, 감성 원본 그대로 사용 차단.

---

## 5. Code 붙여넣기 메시지 (새 Claude Code 세션)

```
꽃틔움 가든 Code. Phase G8-ENGINE-Q4 Adobe Workflow SOP 시스템화 + 누끼·합성 파이프라인.
[STEP 0] CLAUDE.md + PROGRESS 헤더 + TASK_BRIDGE §3 +
  docs/research/KKOTIUM_ADOBE_WORKFLOW_RESEARCH_2026-05-29.md ★1차 권위 출처 정독
  + docs/research/KKOTIUM_ART_DIRECTION_RESEARCH_2026-05-29.md
  + docs/handoff/HANDOFF_g8_engine_q4_2026-05-29.md 정독.
[베이스라인] 4cd524f (G8-ENGINE-Q3 코어 시스템 완료, Vercel READY).
[근거] 리서치가 Adobe 도구 분업·Firefly 모델 6종·명화송풍구 톤을 재정의.
  Desktop이 Firefly Image 5로 명화송풍구 자연광 우드 책상 backdrop 생성 완료.
[SCOPE] (의존성 순서):
  1. DB 마이그레이션 — Product.legalApproval 컬럼 OR ProductLegalApproval 테이블 신규.
  2. 명화송풍구(cmpnooli40001f0gveaxr8iim) master_pd_verified seed 
     (증거: 반 고흐 사후 1960 PD / 모네 사후 1996 PD).
  3. category-tone-mapper.ts 고도화 — baseTone에 'foreign-cinematic-sunlit' 추가,
     fragrance 카테고리 톤을 dark → sunlit로 전환 (colorMood mono→warm, 
     darkPremium false, naturalLight true).
  4. adobe-tool-router.ts 신규 — 변형(clean/lifestyle/price/badge) × ToneDirective 
     → AdobeToolPlan(primaryTool/model/fallbackTool/commercialSafety/rationale).
  5. cutout-strategy.ts 신규 — Product 자산 보유 상태 기반 누끼 전략.
     명화송풍구처럼 단품 누끼 자산 부재 시 manual-upload 강제.
  6. composition-reference.ts 신규 — Firefly Composition Reference 자동화 계획 출력.
  7. brand-kit-spec.ts 신규 — KKOTIUM_BRAND_KIT 상수 노출 (color/type/contrast).
  8. asset-legal-gate.ts 확장 — partner-model-final-commercial / 
     domeggook-emotional-shot-derivative 게이트 추가, legalApproval 플래그 우회.
  9. art_director_prompts seed 갱신 — 5종 자연광 프롬프트 (리서치 §3-D), 
     기존 #4 다크 시네마틱 status='deprecated' 표시.
 10. scripts/cutout-quality-check.js 신규 — 1000×1000/4MB/투명도 검증.
 11. production 검증 — 표본 3종 응답에 adobeWorkflow, cutoutStrategy, 
     legalApproval 노출 확인.
  각 단계 TSC0/build0/verify-vercel exit0.
[하드 룰] clean/badge 최종 상업컷은 Firefly 네이티브만(파트너 모델은 lifestyle 중간 
  자산까지). 명화송풍구 legalApproval=master_pd_verified 필수. 누끼 1000×1000 이하 
  차단. 도매꾹 감성 연출 컷 무단 변형 차단.
[절대준수] 한글literal금지 / 이모지금지(Lucide) / 영어주석 / heredoc금지(#26) / 
  거짓라벨금지(#46) / new PrismaClient금지 / 외부이미지API런타임0(#38) / 
  Production=Vercel / SD-01 보존 / 비가역0.
[통과 후] Desktop 새 채팅에서:
  (a) Adobe Express에서 4세트 명화송풍구 비교컷의 단품 4종 누끼 추출.
  (b) Firefly Image 5 + Composition Reference로 누끼 4종 + Firefly_E_v2 배경 합성.
  (c) 3종 표본 4변형 종합 검증 → 통과 시 G8-ENGINE-Q4 [CLOSED].
```

---

## 6. P2 적재 재정의 (Q3 적재 + Q4 Adobe SOP 통합)

### 6-A. 우선순위 자산 (이번 turn 신규 결정)

| 상품 | skeletonId | 자산 파일 | 모델·소스 | 적재 |
|---|---|---|---|---|
| 아이스트레이 | S1 / S4 | Firefly_D (화이트 마블) | Nano Banana 2 | scripts/upload-backdrop.js |
| 아이스트레이 | S2 | Firefly_A (우드 키친) | Nano Banana 2 | scripts/upload-backdrop.js |
| 아이스트레이 | S5 | Firefly_B (베이지 시멘트) | Nano Banana 2 | scripts/upload-backdrop.js |
| 아이스트레이 | S6 | Firefly_C (도마 + 푸드) | Nano Banana 2 | scripts/upload-backdrop.js |
| **명화송풍구** | **S1 / S4 / S2** | **Firefly_E_v2 (자연광 우드 책상)** | **Firefly Image 5 (면책)** | **scripts/upload-backdrop.js** |
| 달항아리 | S1 / S4 | Firefly_F (한지 갤러리) | Nano Banana 2 | scripts/upload-backdrop.js |

### 6-B. 적재 명령 (Code 환경)
```bash
# 아이스트레이 (Q3 적재)
node scripts/upload-backdrop.js cmpp62yje00015xup5h8pgwx0 S1 ~/Downloads/Firefly_D.jpg
node scripts/upload-backdrop.js cmpp62yje00015xup5h8pgwx0 S4 ~/Downloads/Firefly_D.jpg
node scripts/upload-backdrop.js cmpp62yje00015xup5h8pgwx0 S2 ~/Downloads/Firefly_A.jpg
node scripts/upload-backdrop.js cmpp62yje00015xup5h8pgwx0 S5 ~/Downloads/Firefly_B.jpg
node scripts/upload-backdrop.js cmpp62yje00015xup5h8pgwx0 S6 ~/Downloads/Firefly_C.jpg

# 명화송풍구 (Q4 신규)
node scripts/upload-backdrop.js cmpnooli40001f0gveaxr8iim S1 ~/Downloads/Firefly_E_v2.jpg
node scripts/upload-backdrop.js cmpnooli40001f0gveaxr8iim S4 ~/Downloads/Firefly_E_v2.jpg
node scripts/upload-backdrop.js cmpnooli40001f0gveaxr8iim S2 ~/Downloads/Firefly_E_v2.jpg

# 달항아리 (Q3 적재)
node scripts/upload-backdrop.js cmp3afb450001gng5468w0qpc S1 ~/Downloads/Firefly_F.jpg
node scripts/upload-backdrop.js cmp3afb450001gng5468w0qpc S4 ~/Downloads/Firefly_F.jpg
```

### 6-C. 적재 후 검증
- 표본 3종 /api/thumbnail 재호출
- `assetSource.backdrop=auto-cache` 전환 확인
- 4변형 응답에 `toneDirective`, `legalGate.passed:true`, `adobeWorkflow` 노출 확인

---

## 7. P3 Desktop 다음 세션 — Adobe Express 누끼·합성

### 7-A. Adobe Express 누끼 4종 추출 (명화송풍구)
1. Adobe Express 열기 (Chrome MCP)
2. main-hwabo-4set.jpg 업로드
3. 배경 제거 → 단품 4개 분리 (Crop으로 1개씩 분할 후 각각 누끼)
4. 다운로드 4종 (Firefly_E_cutout_1.png ~ _4.png)

### 7-B. Firefly Image 5 + Composition Reference 합성
1. Firefly_E_v2 (빈 우드 책상) 베이스
2. 누끼 4종을 각각 Composition Reference로 업로드
3. Strength 0.7~0.8 (제품 위치 고정)
4. 동일 Seed 적용 (4변형 일관성)
5. 다운로드 4종 (Firefly_E_composed_1~4.jpg)

### 7-C. 종합 검증
- 3종 표본 × 4변형 = 12장 before/after 육안 검증
- 통과 시 G8-ENGINE-Q4 [CLOSED]

---

## 8. 작업 유의사항 (이번 turn 추가)

- **#46 자기교정 3건**:
  1. 이전 Q3 인계서의 명화송풍구 "다크 시네마틱 가죽" 처방이 **인상주의 라벨과 부정합** → 자연광 우드 책상으로 정정. 리서치 §3 권위 출처.
  2. 핸드오프 SCOPE의 "ProductLegalApproval 테이블 OR Product.legalApproval 컬럼" 선택지에서 **실제 스키마 영향도가 적은 쪽을 Code가 판단** (Q3 ArtDirectorPrompt 사례 정합).
  3. Firefly 모델 6종 풀라인업 직접 검증으로 이전 추정 정정 — Image 5는 public beta이지만 Adobe UI에 "Adobe 모델 상업적으로 안전함" 카테고리로 명시.
- **리서치 권위 우선**: 본 인계서와 리서치(ADOBE_WORKFLOW + ART_DIRECTION) 충돌 시 **리서치가 1차 출처**.
- **이전 Firefly_E 폐기 결정 시스템 반영**: art_director_prompts seed에서 다크 시네마틱 #4를 `status='deprecated'`로 표시 (삭제 X — 추적성).
- **계도기간 활용**: AI 기본법 1년 계도기간 동안 시스템 정비. 2027.1.22 본격 단속 전까지 안정화.
- **SD-01 / 비가역 0**: 아랍어 footer 보존, 네이버 미발행.

---

## 9. P4 진입 조건 (Q4 완료 후)

Code Phase G8-ENGINE-Q4 [코드 완료] 통보 후:
1. Desktop 새 채팅에서 Adobe Express 누끼 4종 추출 (명화송풍구)
2. Firefly Image 5 Composition Reference 합성
3. 표본 3종 종합 4변형 검증
4. 통과 시 G8-ENGINE-Q4 [CLOSED]
5. 이후 Sprint 8-IA Phase 2 (Task 4-12) 또는 Q5 (Custom Models·Bulk Create) 진입 결정
