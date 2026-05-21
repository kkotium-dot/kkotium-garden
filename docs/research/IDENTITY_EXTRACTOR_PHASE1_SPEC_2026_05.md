# Sprint 7-M2 5-B: 상품 정체성 키워드 추출기 (Identity Extractor) Phase 1 구현 명세서

> 생성일: 2026-05-21
> 작성: Claude Web (시니어 책임 영역)
> 분류: Sprint 7-M2 Step 5-B / Identity Extractor Phase 1 (MVP)
> 근거 문서: docs/research/PRODUCT_IDENTITY_KEYWORD_STRATEGY_2026_05.md
> 트리거: 대표님 지적 — 대표 키워드 1개로 시장 판정 시 오판 (잠옷세트 44k 레드오션 vs
>   여성 리본 홈웨어는 다른 시장)
> PlayMCP 실측 검증 (2026-05-21):
>   - "달항아리 도어벨" -> 371개, leaf=도어벨 (본질)
>   - "개업선물" -> 547,655개, leaf=장식인형 (수식어, 카테고리 불일치로 정확히 분리됨)
>   - 함정 확인: category3(중분류)는 둘 다 "인테리어소품"으로 같으나 leaf는 다름
>     -> 매칭은 반드시 LEAF 카테고리로 비교해야 함

---

## TL;DR

- **목표**: 긴 상품명에서 "진짜 정체성 키워드"(본질)와 "용도/시즌/타깃 수식어"를 분리.
  본질 키워드로 시장을 판정해 role-engine.ts의 오판을 제거.
- **검증된 알고리즘**: 형태소 분석 -> 명사별 PlayMCP 쇼핑 단독검색 -> leaf 카테고리 매칭
  -> 본질/수식어 분리 -> 2~3토큰 조합 재검증
- **Phase 1 범위**: 모듈 A(정체성 추출) + role-engine 연결만. OI 공식/카테고리 percentile은 Phase 2.
- **재사용 자산**: spec-extractor.ts(토큰 사전 파서 패턴), shopping-search.ts/PlayMCP, role-engine.ts
- **핵심 함정 방어 2건**: (1) 형태소 분석기 오분할 -> 사용자 사전 필수 (2) leaf 카테고리로만 매칭

---

## 1. 검증된 5단계 파이프라인

```
"디자인 복 달항아리 도어벨 개업선물 액막이 집들이 이사 결혼 신혼 인테리어"
        |
[Step 1] 명사 추출 (형태소 분석 + 사용자 사전)
   -> ["디자인", "복", "달항아리", "도어벨", "개업선물", "액막이",
       "집들이", "이사", "결혼", "신혼", "인테리어"]
        |
[Step 2] 명사별 PlayMCP 쇼핑 단독검색 -> 1위 상품 leaf 카테고리 회수
   -> "도어벨" -> leaf=도어벨 (371개)
      "개업선물" -> leaf=장식인형 (547,655개)
      "달항아리" -> leaf=도자기/생활도자 (별도 확인 필요)
        |
[Step 3] 본 상품 leaf 카테고리와 매칭 (본 상품 leaf=도어벨)
   -> 본질: ["도어벨"] (leaf 일치)
   -> 수식어: ["개업선물"(장식인형), "집들이"(...), "이사"(...)] (leaf 불일치)
        |
[Step 4] 본질 키워드 2~3 토큰 조합 + 재검증
   -> ["달항아리 도어벨", "복 도어벨", "디자인 도어벨"] -> 카테고리 재매칭
   -> 매칭률 100% 조합 = 정체성 키워드 후보군
        |
[Step 5] 수식어는 롱테일 보조 풀로 보관
   -> ["개업선물", "집들이", "신혼", "인테리어"] -> 상품명 꼬리/태그용
        |
[OUTPUT] { identityKeywords, modifierKeywords, bestCombos }
        |
[연결] signal-collector.ts가 identityKeywords[0]로 시장 판정 (대표키워드 대신)
```

## 2. 신규/수정 파일 구조

| # | 파일 | 역할 | 예상 LOC | 구분 |
|---|---|---|---|---|
| 1 | src/lib/strategy/identity-extractor.ts | 5단계 파이프라인 메인 | ~260 | 신규 |
| 2 | src/lib/strategy/morpheme-tokenizer.ts | 형태소 명사 추출 + 사용자 사전 | ~180 | 신규 |
| 3 | src/lib/strategy/identity-dictionary.ts | 사용자 사전(복합명사) + 불용어 + 수식어 힌트 | ~150 | 신규 |
| 4 | src/lib/strategy/signal-collector.ts | identityKeywords 입력으로 보강 | 부분수정 | 수정 |
| 5 | scripts/verify-identity-extractor.ts | 달항아리/잠옷 케이스 검증 | ~160 | 신규 |

신규 의존성: 형태소 분석 — Phase 1은 **경량 규칙 기반 토크나이저**로 시작 (아래 §3 결정)
신규 DB: 없음 (strategy_signals 테이블에 identity_keywords 컬럼만 추가 — 시니어 MCP)

## 3. [중요 결정] 형태소 분석기 선택 — Phase 1은 규칙 기반

연구는 Mecab/Khaiii를 권장하나, 우리 런타임은 **Vercel 서버리스**다. Mecab은 C++ 바이너리 + 사전 파일이 필요해 서버리스 콜드스타트에 부적합 (작업원칙 #28: Vercel이 production).

**Phase 1 결정**: 경량 규칙 기반 토크나이저로 시작.
- 한글 명사 추출: 공백 분리 + 조사/어미 제거 (상품명은 원래 명사 나열식이라 효과적)
- 사용자 사전 우선 매칭: "달항아리", "도어벨" 등 복합명사를 먼저 보호 (오분할 방지)
- 불용어 제거: "디자인", "고급", "정품" 등 일반 수식어
- **장점**: 의존성 0, 서버리스 호환, 즉시 가동
- **한계**: 정밀도는 Mecab보다 낮으나, 상품명은 띄어쓰기로 명사가 이미 분리돼 있어 실용상 충분
- **Phase 3 확장**: 정밀도 부족 판명 시 외부 형태소 API(예: 자체 VM Mecab 서버) 연동

이것이 연구의 "Vercel 제약" 한계를 정면 돌파하는 현실적 선택이다.

## 4. 사용자 사전 설계 (함정 #6 방어)

identity-dictionary.ts:
```typescript
// Compound nouns that morpheme analyzers tend to over-split.
// Protected BEFORE tokenization so "달항아리" never becomes ["달","항아리"].
export const COMPOUND_NOUNS: string[] = [
  '달항아리', '도어벨', '문종', '풍경종', '홈웨어', '잠옷세트',
  // ... seeded from 도매매 categories + auto-grown from operation data
];

// Generic modifiers — never identity, always stripped or demoted.
export const GENERIC_MODIFIERS: string[] = [
  '디자인', '고급', '정품', '신상', '인기', '추천', '최고', '프리미엄',
];

// Usage/season/target hint tokens — likely modifiers (still verified by category).
export const USAGE_HINT_TOKENS: string[] = [
  '선물', '개업', '집들이', '이사', '결혼', '신혼', '입주', '답례',
  '명절', '추석', '설날', '생일', '기념일',
];
```

**자동 갱신 설계 (Phase 2)**: 최근 30일 상위 노출 신상품 상품명에서 빈도 >=5인 미등록 복합명사를 자동 후보화 -> 사용자 검토 후 COMPOUND_NOUNS 추가.

## 5. 카테고리 매칭 — LEAF로만 비교 (함정 #5 방어, 실측 확인됨)

```typescript
// PlayMCP/shopping API returns category1~4. category4 is leaf (deepest).
// When category4 is empty (some products), fall back to category3 but FLAG it.
// CRITICAL: matching on category3 (중분류) gives false positives —
// "개업선물" and "도어벨" share category3=인테리어소품 but differ at leaf.
function getLeafCategory(item: ShopItem): { leaf: string; isExact: boolean } {
  if (item.category4 && item.category4.trim()) {
    return { leaf: item.category4, isExact: true };
  }
  // leaf missing -> use category3 but mark low-confidence
  return { leaf: item.category3 ?? '', isExact: false };
}

function categoryMatch(nounLeaf: string, productLeaf: string): boolean {
  return nounLeaf.trim() !== '' && nounLeaf === productLeaf;
}
```

## 6. 상품수 인플레이션 보정 (함정 #4 방어)

```typescript
// shopping API 'total' includes 묶음/해외/중고 -> inflated.
// For competition accuracy, count unique sellers from top-40 items.
function countUniqueSellers(items: ShopItem[]): number {
  return new Set(items.map((it) => it.mallName).filter(Boolean)).size;
}
// signal-collector uses BOTH: raw total (rough) + uniqueSellers (corrected)
```

## 7. 출력 인터페이스

```typescript
export interface IdentityExtractionResult {
  // 본질 키워드 (leaf 카테고리 일치)
  identityKeywords: string[];          // ["도어벨"]
  // 2~3 토큰 조합 (재검증 통과)
  bestCombos: Array<{
    combo: string;                     // "달항아리 도어벨"
    productCount: number;              // 371
    uniqueSellers: number;             // 보정된 경쟁자 수
    categoryMatch: boolean;
  }>;
  // 수식어 (롱테일 보조 풀)
  modifierKeywords: Array<{
    token: string;                     // "개업선물"
    leafCategory: string;              // "장식인형"
    productCount: number;              // 547655
  }>;
  // 시장 판정에 쓸 대표 정체성 키워드 (bestCombos[0] 또는 identity[0])
  primaryIdentity: string;
  // 신뢰도 (사용자 사전 매칭률 + leaf 정확도)
  confidence: number;
  // API 호출 횟수 (모니터링)
  apiCalls: number;
}
```

## 8. signal-collector.ts 연결 (핵심 통합)

```typescript
// BEFORE: market judged by full product name or raw keyword
// AFTER:  market judged by primaryIdentity from extractor

const identity = await extractIdentity(productName, myLeafCategory);
const marketKeyword = identity.primaryIdentity;  // "달항아리 도어벨" not "달항아리"
const signals = await collectStrategySignals(marketKeyword, myLeafCategory);
// -> role-engine now classifies on the TRUE identity, not a misleading 대표키워드
```

## 9. API 호출 비용 관리

- 명사 N개 -> N회 쇼핑검색 단독 호출 + 조합 M개 재검증 = (N+M)회
- 달항아리 케이스: 명사 ~6개(불용어 제거 후) + 조합 3개 = ~9회
- **24h 캐시 필수**: strategy_signals 테이블에 명사별 leaf 결과 캐싱 (signal_key 기준)
- PlayMCP 우선 (대표님 지침), 검색광고 API는 Phase 2 OI 공식에서 추가

## 10. 검증 시나리오 (verify-identity-extractor.ts)

1. 달항아리: primaryIdentity="달항아리 도어벨" 확인, "개업선물"이 modifier로 분류 확인
2. 잠옷세트: "여성 리본 홈웨어 잠옷세트" 상품명 -> 본질="잠옷세트/홈웨어", 수식어="리본/여성" 확인
   (단, 여기서 "여성"은 타깃 수식어지만 잠옷 카테고리에선 의미 있을 수 있음 -> 경고 표시)
3. 사용자 사전: "달항아리"가 ["달","항아리"]로 안 쪼개지는지 확인
4. leaf 매칭: category3만 같고 leaf 다른 경우 false 반환 확인
5. 상품수 보정: total vs uniqueSellers 차이 출력

## 11. Code CLI 핸드오프 진입 조건

1. role-engine.ts 존재 (commit 2a754d0 확인됨)
2. signal-collector.ts 존재 (commit 2a754d0 확인됨)
3. shopping-search.ts 또는 PlayMCP 쇼핑검색 호출 경로 확인
4. strategy_signals 테이블 존재 (시니어 MCP 생성 완료) — identity_keywords 컬럼 추가 필요

## 부록 — Phase 1 이후 로드맵 (연구 Phase 2~3)

| Phase | 추가 | 비고 |
|---|---|---|
| 2 | OI 공식 + 카테고리 percentile + DataLab 트렌드 | 검색광고 API 검색수 결합 |
| 2 | 사용자 사전 자동 갱신 | 운영 데이터 기반 |
| 3 | sentencepiece BPE 토크나이저 / 외부 Mecab VM | 정밀도 부족 시 |
| 3 | 상품명 자동 조립기 (모듈 E) | product-builder.ts 연계 |
