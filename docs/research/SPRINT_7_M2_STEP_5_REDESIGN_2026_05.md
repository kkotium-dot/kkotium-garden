# Sprint 7-M2 Step 5 재설계 명세서 — L2 자동화 (v3.2 통합)

> 생성일: 2026-05-21
> 작성: Claude Web (시니어 책임 영역)
> 분류: Sprint 7-M2 Step 5 / L2 Automation Redesign
> 전제: Sprint 7-M3 Pre-Step 5 (다크패턴 lint) 선행 완료 가정

---

## TL;DR

- **목표**: L1 자동화(1.225초 완료) → **L2 자동화(6~10분, 동적 5~10섹션 완성 상세페이지)** 로 확장
- **v3.2 통합 4가지**: ① P-Filter 전처리 진단 ② 다크패턴 lint 자동 검사 ③ 4-시안 격자 승인 UX ④ 단일 캔버스 인라인 마법사 호환
- **합성 방식**: C 하이브리드 (Cloudinary 섹션 변환 + Sharp 최종 stitching)
- **자동화 도구 풀**: Adobe Firefly (MCP) / Cloudinary URL / Sharp / Groq / Canva (선택) / Figma (선택)

---

## 1. Step 5 작업 범위 — 6단계

### 단계 1: P-Filter 입력 검증 (신규 — v3.2)
- Sprint 8-PF 산출물 호출
- 입력 이미지 8단계 진단 → L1/L2/L3/L4 등급 자동 판정
- L4 등급이면 "재촬영 권고" 종료
- 워터마크 검출 → Adobe Firefly Generative Remove 자동 큐잉

### 단계 2: 9축 진단 결과 흡수 (기존)
- DiagnosisResult `recommendedGrade = 'L2'` 확인
- 스켈레톤 ID (S1~S14) 결정
- 빌딩블록 조합 결정 (B01~B12 중 5~10개 선택)

### 단계 3: 빌딩블록별 4-시안 생성 (신규 — v3.2)
- 각 빌딩블록에 대해 **4개 variant 동시 생성**
- Adobe Firefly + Cloudinary + Sharp 조합 자동 분기
- 격자뷰 데이터 구조로 반환 (Macks.ai 패턴)

### 단계 4: 다크패턴 lint 자동 검사 (신규 — v3.2)
- Sprint 7-M3 산출물 호출
- 6대 룰 동시 검사
- High 위반 시 자동 진행 차단 + 셀러 알림
- Medium 이하는 자동 수정 + 진행

### 단계 5: 최종 stitching (C 하이브리드)
- Sharp composite() 단일 패스
- 네이버 호환 출력 (860px / 5,000px / 20MB / 1:1 thumbnail)
- 다크패턴 lint 최종 통과 검증

### 단계 6: 결과 반환 (인라인 마법사 호환)
- 4-시안 격자 데이터
- Approve / Reject / Refine 인터랙션 준비된 데이터 구조
- 비파괴 편집 layer 정보 포함

---

## 2. 신규 파일 5개 (Code CLI 작업 분량)

| # | 파일 | 역할 | 예상 LOC |
|---|---|---|---|
| 1 | `src/lib/automation/section-composer.ts` | 빌딩블록별 단일 섹션 생성기 (각 함수 분리) | ~400 |
| 2 | `src/lib/automation/stock-curator.ts` | Adobe Stock 라이프스타일 큐레이션 캐시 어댑터 | ~150 |
| 3 | `src/lib/automation/master-asset-loader.ts` | 마스터 PSD 로더 (AssetLibrary 조회) | ~120 |
| 4 | `src/app/api/automation/l2/route.ts` | L2 자동화 API | ~250 |
| 5 | `src/lib/automation/__tests__/section-composer.test.ts` | Vitest 테스트 | ~150 |

**총 예상 LOC**: ~1,070줄  
**의존성 신규 도입**: 없음 (sharp + cloudinary + Adobe MCP 모두 기존)  
**신규 DB 테이블**: `stock_lifestyle_cache` (Supabase MCP apply_migration)

---

## 3. 핵심 API 설계 — L2 자동화 엔드포인트

### 3.1 요청
```typescript
POST /api/automation/l2

Body:
{
  productId: string,
  options?: {
    skipPFilter?: boolean,       // 이미 검증된 경우 skip
    variantsPerBlock?: number,   // 기본 4
    forceSkeletonId?: string,    // 직감 오버라이드
  }
}
```

### 3.2 응답 (인라인 마법사 호환)
```typescript
{
  ok: boolean,
  product: { id, grade, skeletonId },
  pFilter: {
    grade: 'L1' | 'L2' | 'L3' | 'L4',
    issues: string[],
    autoFixed: string[],
    requiresSellerReview: boolean,
  },
  buildingBlocks: Array<{
    blockId: 'B01' | 'B02' | /* ... */,
    title: string,
    variants: Array<{           // 4개 시안
      variantId: string,
      imageUrl: string,         // Cloudinary CDN URL
      copy: string,
      cost: number,
      darkPatternLint: LintResult,
    }>,
    selectedVariantId?: string, // 마법사에서 셀러가 선택
  }>,
  finalDetail: {
    stitchedUrl: string,        // Supabase Storage URL
    totalHeight: number,
    sections: number,
  },
  cost: {
    cloudinaryCredits: number,
    groqRequests: number,
    adobeFireflyRequests: number,
    anthropicRequests: number,
  },
  elapsedMs: number,
}
```

### 3.3 비파괴 편집 보장
- 모든 variant URL은 별도 layer로 저장 (asset_library 신규 row)
- Product 테이블의 `mainImage`/`detailImageUrl`은 **셀러 명시 Approve 시에만 update**
- 마법사 닫힘 시 임시 데이터는 24시간 보존 후 자동 삭제

---

## 4. 빌딩블록별 도구 매핑 (자동 분기)

| 빌딩블록 | 1순위 도구 | 2순위 fallback | Refine 추가 도구 |
|---|---|---|---|
| **B01 헤더 (무드)** | Adobe Firefly Generative Fill | Cloudinary URL + 텍스트 오버레이 | Canva MCP search-designs |
| **B02 페인포인트** | Groq 카피 + Sharp 텍스트 합성 | Groq 카피만 | Anthropic Sonnet (last-resort) |
| **B03 USP** | Sharp 텍스트 합성 (정적 마스터) | - | - |
| **B04 라이프스타일** | Adobe Stock 큐레이션 캐시 | Cloudinary URL + 마스터 PSD | Adobe Firefly Generate Image |
| **B05 신뢰 (인증)** | 정적 마스터 PSD (안전 인증 배지) | - | - |
| **B06 상세 사양** | Sharp 표 합성 | Groq 카피 표 변환 | - |
| **B07 사용 시나리오** | Groq 카피 + Sharp 합성 | - | Canva MCP |
| **B08 가격·옵션** | 다크패턴 lint 강제 통과 | - | (lint 자동 수정) |
| **B09 신뢰 FAQ** | Groq 카피 + 정적 템플릿 | - | - |
| **B10 후기** | (placeholder, 실제 후기 미존재 시 skip) | - | - |
| **B11 배송 안내** | 정적 마스터 PSD | - | - |
| **B12 CTA** | Sharp 합성 + 다크패턴 lint | - | (lint 자동 균등화) |

---

## 5. 4-시안 생성 전략

### 5.1 variant 차별화 원칙
4개 시안이 *서로 충분히 달라야* 셀러 선택에 의미 있습니다. 차별화 4축:

| variant | 톤 | 길이 | 감정 | 포커스 |
|---|---|---|---|---|
| 1 | 친근 | 짧게 | 따뜻 | 가치 |
| 2 | 전문 | 짧게 | 따뜻 | 가격 |
| 3 | 친근 | 길게 | 자극 | 가치 |
| 4 | 전문 | 길게 | 따뜻 | 가격 |

### 5.2 비용 추정 (variant 4개 기준)
| 빌딩블록 | Cloudinary | Groq | Adobe Firefly | 총 변환 비용 |
|---|---|---|---|---|
| B01 무드 | 4 credit | 4 req | 1 req (선택) | ~0.4원 |
| B02 페인포인트 | 4 credit | 4 req | - | ~0.4원 |
| B03 USP | 1 credit | - | - | ~0.1원 |
| B04 라이프스타일 | 4 credit | 4 req | - | ~0.4원 |
| B05~B11 (avg) | 2 credit | 1 req | - | ~0.2원 |
| B12 CTA | 4 credit | 4 req | - | ~0.4원 |

**상품 1개 L2 자동화 총 비용**: 약 ~3원 (8섹션 가정).  
1,000개 카탈로그 = 3,000원. 새싹 셀러 부담 0.

---

## 6. 다크패턴 lint 통합 지점

Sprint 7-M3 산출물 호출 패턴:

```typescript
import { lintBuildingBlock } from '@/lib/compliance/dark-pattern-lint';

// 빌딩블록 생성 직후
const variant = await generateB08Pricing(productData);
const lintResult = lintBuildingBlock('B08', variant);

if (lintResult.violations.some(v => v.severity === 'high')) {
  // 자동 수정 시도
  const fixed = await applyAutoFix(variant, lintResult);
  
  // 재검사
  const reLint = lintBuildingBlock('B08', fixed);
  if (reLint.violations.some(v => v.severity === 'high')) {
    // 셀러 명시 승인 필요 — variant 데이터에 경고 마킹
    variant.requiresSellerApproval = true;
    variant.lintWarnings = reLint.violations;
  }
}
```

### 자동 수정 가능 위반 (셀러 알림 없이 진행)
- 옵션 사전선택 → 자동 unselect
- CTA 버튼 시각 비중 → 자동 균등화
- 알림 빈도 초과 → 자동 큐잉

### 셀러 명시 승인 필요 위반
- 첫 화면 총액 미표시 (B11 배송비 정보 누락)
- 환불·반품 안내 접근성 (B09 FAQ 위치)

---

## 7. P-Filter ↔ Step 5 데이터 흐름

```
[상품 등록 시작]
    |
[P-Filter 진단 (Sprint 8-PF)]
    |
    +- L1 → 단계 2 직행 (L1 자동화는 이미 완료, L2 진입 안 함)
    +- L2 → 단계 2 진입 (이 명세서 범위)
    +- L3 → 단계 2 진입 + 마법사에서 셀러 디렉팅
    +- L4 → 단계 2 중단 + 재촬영 권고
    |
[단계 2: 9축 진단 결과 흡수]
    |
[단계 3: 빌딩블록별 4-시안 생성]
    |
[단계 4: 다크패턴 lint 검사]
    |
[단계 5: stitching (셀러 Approve 후 실행)]
    |
[단계 6: 마법사 호환 응답 반환]
```

### P-Filter 결과 매핑
- P-Filter `requiresSellerReview: true` → L2 응답에 `pFilter.requiresSellerReview: true` 전달
- 마법사 첫 진입 시 *"이 이미지는 워터마크 자동 제거됐어요. 결과 확인해 주세요"* 토스트 노출

---

## 8. 인라인 마법사 호환 — UX 데이터 구조

마법사가 받을 데이터 형태:

```typescript
{
  product: { /* ... */ },
  
  // 좌측 모바일 미리보기 데이터
  preview: {
    sections: [
      { blockId: 'B01', selectedVariantUrl: string },
      // ...
    ],
    realtimeNineAxisScore: { c1: 0.85, c2: 0.72, /* ... */ },
  },
  
  // 우측 빌딩블록 패널 데이터
  panel: {
    blocks: [
      {
        blockId: 'B01',
        title: '헤더',
        status: 'pending' | 'in_progress' | 'completed' | 'requires_review',
        variants: [/* 4개 */],
        selectedVariantId?: string,
      },
      // ...
    ],
  },
  
  // 하단 진행 상태
  progress: {
    current: 4,
    total: 8,  // 스켈레톤별 동적
    autoSaved: true,
    historyVersions: [/* 최근 5개 */],
  },
}
```

---

## 9. Sprint 7-M2 Step 5 코드 CLI 핸드오프 (예고)

> 실제 핸드오프는 Sprint 7-M3 + Sprint 8-PF 완료 후 별도 발부.

### 진입 조건 체크리스트
1. Sprint 7-M3 (다크패턴 lint) commit + push 완료
2. Sprint 8-PF (P-Filter) commit + push 완료
3. `lintBuildingBlock` 및 `runPFilter` 함수 import 가능 상태
4. `stock_lifestyle_cache` 테이블 사전 시드 1건 이상 (시니어 Web 세션에서 처리)

### 핸드오프 분량
- Code CLI 작업 시간: 약 2시간
- 시니어 검증 + 더미 상품 L2 검증 (B+C 격리): 약 30분

---

## 10. 한계와 주의사항

1. **Adobe Stock 큐레이션 시드 의존**: stock_lifestyle_cache가 비어있으면 B04 라이프스타일은 fallback 마스터 PSD만 사용. 카테고리별 사전 시드 필수.
2. **Sharp 메모리 안전**: 4-시안 × 평균 8섹션 = 동시 32개 이미지 처리. Vercel 1024MB 한도 안전이지만, **variant 생성은 순차 처리 권장** (병렬 시 timeout 위험).
3. **다크패턴 lint High 위반 시 fallback 부재**: 일부 위반은 자동 수정 불가 (예: 옵션 사전선택 제거 후에도 추가 비용 옵션 자체가 없으면 빌딩블록 자체 생성 실패). 이 경우 L2 → L3 자동 다운그레이드 정책 필요.
4. **비파괴 편집 24시간 보존**: 셀러가 24시간 내 마법사 재진입하지 않으면 임시 layer 자동 삭제. Resume UX 사용자 안내 필수.
5. **4-시안 비용**: 빌딩블록 8개 × 4 variant = 32 LLM 호출. Groq 14,400 req/일 한도의 약 0.22% 사용. 새싹 셀러 일일 30상품 등록까지 안전.

---

## 부록 — Step 5 실행 순서 1줄 요약

```
P-Filter 진단 → 9축 결과 흡수 → 빌딩블록별 4-시안 생성 → 다크패턴 lint → stitching → 마법사 데이터 반환
```

각 단계 평균 시간:
- P-Filter: 1.5초
- 9축 흡수: 0.1초
- 4-시안 생성: 8섹션 × 4 variant 순차 = 3~5분
- 다크패턴 lint: 0.5초
- stitching: 2~3초
- **총 6~10분** (당초 예측치 부합)
