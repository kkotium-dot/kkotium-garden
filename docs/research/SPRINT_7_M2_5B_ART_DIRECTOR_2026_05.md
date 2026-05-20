# Sprint 7-M2 5-B: AI 아트디렉터 (Firefly 프롬프트 자동 설계) 구현 명세서

> 생성일: 2026-05-21
> 작성: Claude Web (시니어 책임 영역)
> 분류: Sprint 7-M2 Step 5-B / AI Art Director — Lifestyle Image Prompt Engine
> 전제: 길 B 확정 (분석+프롬프트 자동화, 생성은 Firefly 웹에서 셀러가 1-click)
> 셀러 비전 인용: "이미지 분석을 통해 그에 맞는 고감도 라이프스타일 이미지 생성을
>   위한 프롬프트를 만드는 것이 핵심이자 시작. 이는 데이터 자산이 된다."

---

## TL;DR

- **목표**: 상품을 분석 → Firefly 최적 프롬프트 자동 설계 → 셀러가 Firefly 웹에서 생성 → 결과 등록 → 프롬프트 영구 자산화
- **핵심 통찰**: 프롬프트 자체가 재사용·진화하는 데이터 자산. 비슷한 상품에 검증된 프롬프트 재활용
- **재사용 자산**: 8축 CTI 분석(이미 완성) + Adobe asset_inline_preview(이미지 분석) + groq-client(프롬프트 정제)
- **신규**: 프롬프트 번역기 + art_director_prompts 테이블 + "당신의 손길 대기 중" 상태 로직
- **자동화 한계 처리**: 신뢰도 낮음 / 가치 판단 필요 시 "Needs Your Magic" 상태로 셀러에게 정직하게 위임

---

## 1. 전체 파이프라인 (길 B)

```
[상품 입력]
    |
[1. 상품 분석] ── 8축 CTI(텍스트) + Adobe asset_inline_preview(실 이미지)
    |              → 색감/재질/무드/페르소나/컨텍스트/장르 종합
    |
[2. 프롬프트 번역] ── 분석 결과 → Firefly 영문 프롬프트 (Groq 정제)
    |                 ※ 데이터 자산의 심장
    |
[3. 자산 조회/저장] ── art_director_prompts 캐시 (유사 상품 프롬프트 재활용)
    |
[4. 상태 판정] ── 신뢰도 기반 3단계
    |     +- 높음 → "알아서 폈어요" (프롬프트 + Firefly 링크 제공)
    |     +- 낮음/가치판단 → "당신의 손길 대기 중" (셀러 디렉팅 요청)
    |     +- 중간 → "같이 다듬을까요" (프롬프트 초안 + 수정 제안)
    |
[5. 셀러 1-click] ── Firefly 웹에서 생성 → 결과 URL 등록
    |
[6. 자산화] ── 사용된 프롬프트 + 만족도 → art_director_prompts 영구 저장
```

---

## 2. 신규 파일 구조

| # | 파일 | 역할 | 예상 LOC |
|---|---|---|---|
| 1 | `src/lib/art-director/prompt-translator.ts` | 8축 분석 → Firefly 프롬프트 번역 (핵심 자산) | ~320 |
| 2 | `src/lib/art-director/prompt-dictionary.ts` | 축별 → 영문 시각 키워드 매핑 사전 | ~200 |
| 3 | `src/lib/art-director/image-analyzer.ts` | Adobe asset_inline_preview 결합 (실 이미지 분석) | ~120 |
| 4 | `src/lib/art-director/asset-status.ts` | "당신의 손길 대기 중" 3단계 상태 판정 | ~100 |
| 5 | `src/app/api/art-director/prompt/route.ts` | 프롬프트 생성 API | ~180 |
| 6 | `src/lib/i18n/art-director-messages.ko.json` | 상태 라벨 + 셀러 안내 한글 | ~50 |
| 7 | `scripts/verify-art-director.ts` | 검증 (달항아리 케이스 + 상태 분기) | ~150 |

신규 의존성: 없음 (Adobe MCP + groq-client 기존 재사용)
신규 DB 테이블: art_director_prompts (Supabase MCP, 시니어 직접 적용 예정)

---

## 3. 프롬프트 번역기 — 데이터 자산의 심장

### 3.1 입력 (이미 가진 분석 자산)
```typescript
interface ArtDirectorInput {
  productName: string;
  category: string | null;
  // 8축 CTI 결과 (concept-tone-inference.ts 출력 재사용)
  conceptTone: ConceptTone;       // persona/context/colorMood/genre 등
  inferenceConfidence: number;    // 0-100, 상태 판정에 사용
  // 실 이미지 분석 (Adobe asset_inline_preview, 선택)
  imageAnalysis?: {
    dominantColors: string[];     // 예: ["warm beige", "soft white"]
    detectedObjects: string[];    // 예: ["ceramic vessel", "wooden surface"]
    lightingMood: string;         // 예: "soft natural light"
  };
}
```

### 3.2 번역 매핑 (prompt-dictionary.ts)
각 CTI 축을 Firefly가 알아듣는 영문 시각 키워드로 매핑. 규칙 기반 1차 + Groq 정제 2차.

| CTI 축 | 값 예시 | Firefly 키워드 매핑 |
|---|---|---|
| genre=korean | 한국적 | "Korean hanok interior, traditional warm aesthetic" |
| genre=minimal | 미니멀 | "Scandinavian minimalist, clean negative space" |
| genre=natural | 내추럴 | "organic natural materials, plant-filled cozy space" |
| context=gift | 선물 | "elegant gift presentation, premium unboxing mood" |
| context=daily | 일상 | "everyday lifestyle scene, lived-in authentic" |
| colorMood=warm | 따뜻 | "warm golden hour lighting, cozy amber tones" |
| colorMood=calm | 차분 | "soft diffused daylight, muted calm palette" |
| photoStyle=lifestyle | 라이프스타일 | "lifestyle product photography, in-context staging" |
| persona=30-40s | 30-40대 | "refined adult home setting, tasteful decor" |

### 3.3 번역 출력 (영문 Firefly 프롬프트)
```typescript
interface ArtDirectorPrompt {
  // 메인 프롬프트 (Firefly 붙여넣기용)
  prompt: string;
  // 예: "warm-toned Korean hanok living room, soft morning light through
  //      hanji paper window, a ceramic moon jar doorbell on a wooden shelf,
  //      cozy gift atmosphere, lifestyle product photography, 8k, photorealistic"
  negativePrompt: string;       // 예: "text, watermark, logo, low quality, distorted"
  aspectRatio: string;          // 네이버 권장 1:1 또는 4:5
  styleReference?: string;      // Firefly 스타일 프리셋 힌트
  // 자산화 메타
  derivedFrom: {
    axes: string[];             // 어떤 CTI 축이 기여했는지
    confidence: number;
    imageInformed: boolean;     // 실 이미지 분석 반영 여부
  };
}
```

### 3.4 Groq 정제 단계
규칙 기반으로 키워드를 조합한 뒤, Groq에게 *"자연스러운 Firefly 프롬프트로 다듬되 키워드는 유지"* 요청.
- groq-client.ts 재사용 (round-robin)
- 실패 시 규칙 기반 조합 그대로 사용 (fallback)
- 한글 리터럴 금지, 프롬프트는 영문 (Firefly는 영문 최적)

---

## 4. "당신의 손길 대기 중" — 상태 판정 로직

### 4.1 3단계 상태 (셀러 비전 + 신뢰도 기반)
```typescript
type AssetStatus = 'auto_bloomed' | 'needs_your_magic' | 'lets_refine';
```

| 상태 | 한글 라벨 | 발동 조건 | 셀러 액션 |
|---|---|---|---|
| auto_bloomed | 알아서 폈어요 | inferenceConfidence >= 75 AND 이미지 분석 성공 | 프롬프트 복사 → Firefly 생성 |
| needs_your_magic | 당신의 손길 대기 중 | confidence < 60 OR 가치 판단 카테고리 OR 이미지 분석 실패 | 셀러 직접 디렉팅 |
| lets_refine | 같이 다듬을까요 | 60 <= confidence < 75 | 프롬프트 초안 + 수정 제안 검토 |

### 4.2 "가치 판단 카테고리" 정의
일부 카테고리는 신뢰도와 무관하게 셀러 감각이 중요 → 자동 needs_your_magic:
- 감성 핸드메이드 / 작가 작품 / 고가 프리미엄 (브랜드 identity 직결)
- 셀러가 store_settings에서 커스텀 지정 가능 (확장)

### 4.3 상태 메시지 (귀엽고 긍정적, 셀러 비전 반영)
art-director-messages.ko.json:
```json
{
  "auto_bloomed": {
    "label": "알아서 폈어요",
    "tooltip": "상품에 딱 맞는 프롬프트를 준비했어요. 복사해서 Firefly에 붙여넣기만 하면 돼요."
  },
  "needs_your_magic": {
    "label": "당신의 손길 대기 중",
    "tooltip": "이 상품은 대표님의 감각이 필요해요. 어설픈 추측보다 직접 디렉팅하시는 게 좋겠어요."
  },
  "lets_refine": {
    "label": "같이 다듬을까요",
    "tooltip": "초안은 준비했어요. 한 번 보시고 톤을 더해주시면 완성도가 올라가요."
  }
}
```

핵심 원칙: needs_your_magic은 *실패가 아니라 셀러 감각이 빛날 차례*라는 긍정 프레이밍.

---

## 5. 프롬프트 자산화 — art_director_prompts 테이블

### 5.1 스키마 (시니어 Supabase MCP 직접 적용 예정)
```sql
CREATE TABLE public.art_director_prompts (
  id              text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  product_id      text,                    -- 어떤 상품에서 나왔나
  category_hint   text NOT NULL,           -- 재사용 매칭 키
  concept_axes    jsonb NOT NULL,          -- 기여한 CTI 축 (재활용 매칭용)
  prompt          text NOT NULL,           -- Firefly 메인 프롬프트
  negative_prompt text,
  aspect_ratio    varchar DEFAULT '1:1',
  image_informed  boolean DEFAULT false,   -- 실 이미지 분석 반영 여부
  status          varchar NOT NULL,        -- auto_bloomed/needs_your_magic/lets_refine
  -- 자산 진화: 셀러 만족도 피드백
  seller_used     boolean DEFAULT false,   -- 셀러가 실제 사용했나
  seller_rating   integer,                 -- 1-5 (선택, 좋은 프롬프트 학습)
  result_image_url text,                   -- 생성 결과 등록 (5-B 등록 단계)
  created_at      timestamp with time zone DEFAULT now()
);
```

### 5.2 재활용 흐름 (데이터 자산의 진화)
```
신규 상품 입력
  → category_hint + concept_axes로 art_director_prompts 조회
  → seller_rating >= 4 인 유사 프롬프트 발견 시
     → "지난번 비슷한 상품에 잘 먹힌 프롬프트예요" 제안 (재활용)
  → 없으면 신규 번역 → 저장
```

비유: 우리 매장만의 촬영 콘셉트 노하우집이 자동으로 두꺼워짐.

---

## 6. 이미지 분석 연결 (Adobe asset_inline_preview)

### 6.1 통합 지점
- 상품 메인 이미지 URL → asset_inline_preview 호출 → 색감/객체/조명 분석
- 분석 결과를 ArtDirectorInput.imageAnalysis로 주입
- 실패/타임아웃 시 → 텍스트 8축만으로 진행 + needs_your_magic 경향

### 6.2 Adobe MCP 사전 호출 의무
- adobe_mandatory_init 먼저 호출 (Adobe 도구 사용 규칙)
- asset_inline_preview는 presigned URL 필요 → Supabase Storage URL 사용

---

## 7. API 설계 — /api/art-director/prompt

### 7.1 요청
```typescript
POST /api/art-director/prompt
{
  productId: string,
  options?: {
    skipImageAnalysis?: boolean,   // 이미지 분석 생략 (텍스트만)
    forceRefresh?: boolean,        // 캐시 무시하고 새로 번역
  }
}
```

### 7.2 응답
```typescript
{
  ok: boolean,
  status: 'auto_bloomed' | 'needs_your_magic' | 'lets_refine',
  statusLabel: string,             // 한글 라벨 (i18n)
  statusTooltip: string,
  prompt: ArtDirectorPrompt,       // 프롬프트 + negative + aspect
  fireflyUrl: string,              // https://firefly.adobe.com (프롬프트 프리필 불가 시 안내)
  reusedFrom?: string,             // 재활용된 기존 프롬프트 id (있으면)
  confidence: number,
  elapsedMs: number,
}
```

---

## 8. 한계와 주의사항

1. **Firefly 웹 프롬프트 프리필 불가**: 길 B는 셀러가 수동 붙여넣기. 프롬프트 복사 버튼 UX 필수. (길 A API 연동 시 자동화)
2. **이미지 분석 비용**: asset_inline_preview는 Adobe 호출. 상품당 1회로 제한, 캐시 적극 활용.
3. **영문 프롬프트**: Firefly는 영문 최적. 번역 품질이 결과 좌우 → Groq 정제 단계 중요.
4. **needs_your_magic 남발 방지**: 임계값(60/75)은 실사용 후 조정. 너무 자주 뜨면 자동화 가치 하락, 너무 안 뜨면 저품질 양산.
5. **프롬프트 자산 콜드 스타트**: 초기엔 재활용할 프롬프트 0건. 셀러가 rating 쌓을수록 가치 상승 (선순환).

---

## 9. Code CLI 핸드오프 진입 조건

1. B06 환각 해결 commit 8225428 완료 (확인됨)
2. art_director_prompts 테이블 사전 생성 (시니어 Supabase MCP — 본 명세서 적용 시)
3. concept-tone-inference.ts inferConceptTone import 가능 (확인됨)
4. groq-client.ts pickGroqKey/callGroq import 가능 (확인됨)

---

## 부록 — 달항아리 케이스 예상 출력

입력: "디자인 복 달항아리 도어벨" / category=기타장식용품 / genre=korean(추정) / context=gift

예상 프롬프트:
```
warm-toned Korean traditional interior, soft morning light, a ceramic moon jar
style doorbell hanging on a wooden door, hanok aesthetic, cozy housewarming gift
atmosphere, lifestyle product photography, shallow depth of field, 8k, photorealistic
```
negative: "text, watermark, logo, low quality, distorted, extra objects"
aspect: 1:1
예상 상태: lets_refine 또는 needs_your_magic (감성 인테리어 소품 → 셀러 감각 권장)
