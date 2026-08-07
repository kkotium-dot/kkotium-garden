# 작업 인계 — 트랙 ③구현: 카테고리 정밀화 1단계 (사전 기반)

> **담당 레인**: Claude Code 또는 Cowork
> **작성**: Desktop, 2026-08-07
> **BASELINE**: main `6532d2f` (착수 전 `git pull` 확인)
> **의존성**: 없음 (독립 병렬 안전 — write set이 다른 레인과 겹치지 않음, #322)
> **착수 전 필독**: `docs/design/KEYWORD_CATEGORY_PRECISION_2026-08-05.md`(설계 전문, 특히 §4·§4-4·§9) → `docs/design/KOREAN_ECOMMERCE_CATEGORY_SIGNAL_RESEARCH_2026-08-07.md`(리서치 근거) → `docs/DOMAIN_FACTS.md` → `CLAUDE.md`

---

## 1. 목표

"청소기" 같은 소싱 키워드로 도매 매칭 시 "귀청소기·어항청소기·차량용청소기" 같은 **다른 카테고리로 전환된 상품**을 판별해 표시(배제 아님, 후순위 강등)한다.

**1단계 범위(이번 작업)**: 상품명 기반 규칙 사전 매칭만. 도매 API 추가 호출 0. 2단계(대분류 대조)는 별도 후속 작업.

## 2. write set (수정 가능 파일 — 이 밖은 건드리지 말 것)

| 파일 | 작업 |
|---|---|
| `src/lib/category-mismatch-dict.ts` | 신규 — 6개 축 사전(블랙리스트) + head noun별 화이트리스트 |
| `src/lib/wholesale-matcher.ts` | `detectCategoryMismatch()` 함수 추가 + `categoryMismatch` 필드를 매칭 결과에 포함 |

**수정 금지 파일**: `src/app/api/sourcing-recommend/route.ts`, `src/components/dashboard/SourcingRecommendWidget.tsx` — 이 두 파일은 Desktop이 표시부 반영 시 별도 작업(2단계, 이 작업 완료 후 진행).

## 3. 사전 설계 (설계 문서 §4-4 그대로 구현)

### 3-1. 6개 축 블랙리스트 구조
```typescript
// 축별로 구조화 — 하드코딩 특정 상품 아니라 범용 한정어(#55)
type MismatchAxis = 'bodyPart' | 'animal' | 'placeVehicle' | 'targetDevice' | 'ageUser' | 'miniature';

const CATEGORY_MISMATCH_DICT: Record<MismatchAxis, string[]> = {
  bodyPart: ['귀', '코', '입', '눈', '손', '발', '두피', '얼굴', '치아', '이', '혀', '배꼽', '발톱', '손톱', '겨드랑이'],
  animal: ['강아지', '개', '애견', '고양이', '반려', '펫', '반려동물', '애묘', '반려견', '어항', '수족관', '수조', '관상어'],
  placeVehicle: ['차량용', '자동차', '세차', '캠핑용', '낚시용', '욕실용', '주방용', '사무용', '실외용', '야외용', '텐트용'],
  targetDevice: ['휴대폰', '스마트폰', '노트북', '카메라', '안경', '키보드', '신발', '자전거'],
  ageUser: ['유아', '아기', '신생아', '아동', '어린이', '시니어', '노인', '임산부'],
  miniature: ['미니어처', '모형', '장난감', '완구', '피규어', '인형용'],
};
```

### 3-2. 화이트리스트 (정상 하위속성 — 전환 아님, 반드시 함께 관리)
```typescript
// 청소기 기준 예시 — head noun별로 확장 가능한 구조로 설계
const WHITELIST_MODIFIERS = ['무선', '유선', '스틱', '핸디', '진공', '로봇', '침구', '차이슨'];
```
"미니"는 맥락 의존이라 miniature 축에 넣되, 화이트리스트 우선 체크로 오탐 방지(설계 §5 참조).

### 3-3. 판정 로직
```typescript
function detectCategoryMismatch(productName: string, searchKeyword: string): {
  mismatch: 'suspect' | null;
  axis: MismatchAxis | null;
  matchedModifier: string | null;
} {
  // 1. 검색 키워드 자체에 한정어가 포함되면 스킵 (accessoryRisk :55와 동일 로직)
  //    예: 키워드가 "귀청소기"면 "귀"를 한정어로 취급 안 함
  // 2. 상품명이 [블랙리스트 수식어] + [키워드] 접두 패턴인지 확인
  // 3. 매칭된 수식어가 화이트리스트에 없는지 확인
  // 4. 패턴 위치 규칙: 수식어가 head noun(키워드) 바로 앞에 올 때만 강신호 (설계 §Details 1)
}
```

## 4. wholesale-matcher.ts 통합

기존 `detectAccessoryRisk()`(:54)와 같은 패턴으로 통합. 매칭 결과 객체에 필드 추가:
```typescript
{
  // ... 기존 필드(price, priceOutlier, accessoryRisk 등)
  categoryMismatch: 'suspect' | null,  // 1단계는 suspect만. confirmed/cleared는 2단계(후속)
  categoryMismatchAxis: MismatchAxis | null,
  categoryMismatchModifier: string | null,  // "어떤 단어 때문에 걸렸는지" — 표시부에서 활용
}
```

**정렬 영향**: 설계 §4-1대로, `categoryMismatch: 'suspect'`인 항목은 정렬 시 후순위로. 단 **삭제는 절대 안 함**(#327) — 이번 1단계는 필드만 추가하고 실제 정렬/표시는 Desktop이 2단계에서 반영(작업 분리, write set 안 겹침).

## 5. 오탐 방지 체크리스트 (설계 §5 그대로)
- [ ] 키워드 자체가 한정어 포함 시 스킵 로직 정확히 구현(단위 테스트 권장)
- [ ] 화이트리스트가 블랙리스트보다 우선 체크됨
- [ ] "미니청소기"(크기, 정상) vs "미니어처청소기"(축소어, 전환) 구분 — 정확한 형태소 경계 처리 필요(단순 substring 매칭 시 오탐 위험, 상품명 정규화 후 토큰 경계 확인 권장)

## 6. 검증 계획
1. **tsc 0 · build 0** 필수.
2. **알려진 케이스로 단위 검증**: "청소기" 키워드에 "귀청소기"·"어항청소기"·"차량용청소기"·"무선청소기"(정상) 등 상품명 샘플을 넣어 `detectCategoryMismatch` 반환값 확인. Node 스크립트로 직접 함수 호출 검증(브라우저/DB 불필요, 순수 함수).
3. **실 소싱 데이터로 교차 확인**: 가능하면 현재 DB의 `sourcingOpportunityRecord.wholesaleMatches`(JSON)에 있는 실제 상품명으로 사전이 몇 건이나 잡는지 카운트(참고용, 배포 영향 없음).

## 7. 완료 후
- tsc/build 결과, 단위 검증 결과(어떤 케이스가 잡히고 안 잡혔는지) 결과 문서 작성: `docs/handoff/[레인]_TRACK3_IMPL_RESULT_2026-08-XX.md`
- 커밋(write set 2파일만 개별 add)·push
- 채팅으로 결과 요약 → Desktop이 검토 후 표시부(2단계) 반영·프로덕션 검증 진행

## 8. 요약 체크리스트
- [ ] `git pull` 후 BASELINE(6532d2f) 확인
- [ ] `category-mismatch-dict.ts` 신규 — 6개 축 + 화이트리스트
- [ ] `wholesale-matcher.ts`에 `detectCategoryMismatch()` 통합
- [ ] 키워드 자체 한정어 스킵 로직 구현
- [ ] tsc 0 · build 0
- [ ] 알려진 케이스(청소기/귀청소기/어항청소기/차량용청소기/무선청소기)로 단위 검증
- [ ] sentinel grep 0건
- [ ] 커밋·push + 결과 문서 + 채팅 인계
