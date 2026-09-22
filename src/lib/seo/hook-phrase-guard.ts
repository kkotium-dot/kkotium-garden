// src/lib/seo/hook-phrase-guard.ts
// ============================================================================
// HOOK_PHRASE_GUARD_2026-09-22 — 꽃틔움_가든_네이버_상품명_진단_엔진과_SEO_훅문구_개선
// 리서치(SOURCE_DOCS_INDEX, 2026-06) 대조 중 발견된 갭의 근본수정.
//
// 리서치 목표2 §(2): "이벤트필드(혜택형)는 구체적 수치 혜택만 통과한다"
//   통과 예: "2만원 이상 구매 시 무료배송", "신한카드 6개월 무이자"
//   거부: "무료배송/세일가"만 단독 표기, "끝까지 최선을 다하겠습니다"·
//         "품질보증 무료A/S" 같은 추상 홍보문구
// 현재 씨앗심기의 "SEO 훅문구" 필드(products/new/page.tsx)는 정확히 이
// 이벤트필드 용도("네이버 쇼핑 검색 결과 홍보문구")인데, 상품명
// (product-name-diagnosis.ts)과 달리 이 검증이 전혀 없어서 추상 홍보문구를
// 그대로 저장해도 경고가 안 뜸 — 실제 네이버 이벤트필드 검수 반려 위험.
//
// 순수 함수(입력=텍스트, DB/네트워크 없음) — 씨앗심기 화면이 타이핑마다
// 즉시 호출 가능. 새 판정 클래스 신설이 아니라 기존
// product-name-diagnosis.ts와 동일한 "신호등 hint" 패턴을 그대로 재사용
// (#295 단일권위 — UI가 소비하는 shape을 일관되게 유지).
// ============================================================================

export type HookPhraseStatus = 'pass' | 'warn';

export interface HookPhraseGuardResult {
  status: HookPhraseStatus;
  hint: string;
}

/**
 * Korean-numeral quantity signal — e.g. "이만원", "삼천원". Intentionally
 * requires the numeral run to be IMMEDIATELY followed by a unit, not just
 * "any 숫자 character anywhere in the sentence": a bare per-character check
 * (e.g. just /[일이삼...]/ ) false-positives on ordinary words that happen to
 * contain a numeral-homophone syllable — "당일배송"의 "일"(day, not "1"),
 * "프리미엄"처럼 무관한 단어. Caught by a local test harness before deploy
 * (9 cases, "당일배송 | 프리미엄 품질" incorrectly passed) — this stricter
 * "numeral run + adjacent unit" pattern fixes it without weakening real
 * matches like "이만원"/"삼천원".
 */
const KOREAN_NUMERAL_UNIT_RE = /[일이삼사오육칠팔구십백천만]+\s*(원|%|퍼센트|개|주|개월|년|포인트)/;

/** A concrete quantity signal: digits, Korean numerals, or a currency/percent/count unit
 * immediately adjacent to a number-like token. Mirrors the research's "수치 혜택" bar —
 * we do not try to fully parse the sentence, just detect that SOME quantity is present. */
const HAS_NUMERIC_BENEFIT_RE = /\d[,\d]*\s*(원|%|퍼센트|개|일|주|개월|년|포인트|p\b)/i;

/**
 * 리서치 목표2(2)의 "거부" 예시를 직접 시드로 한 추상 홍보어 사전.
 * 구체 수치가 있어도 이 표현이 섞여 있으면 여전히 '주의'로 낮춘다 —
 * 네이버 이벤트필드 검수가 정확히 이런 장식성 표현을 걸러낸다.
 */
const VAGUE_PROMO_PHRASES: readonly string[] = [
  '최선을 다하겠습니다',
  '품질보증',
  '무료 A/S',
  '무료A/S',
  '만족을 드리겠습니다',
  '정성을 다해',
  '믿고 구매',
];

/** Decorative/control characters the research flags as EP-system error triggers. */
const DECORATIVE_OR_CONTROL_RE = /[★☆●◇◆♥\t\r\n]/;

/**
 * Lint a single hook-phrase string against the Naver event-field (이벤트필드)
 * acceptance bar the research documents. Pure and synchronous — safe to call
 * on every keystroke.
 */
export function lintHookPhrase(text: string): HookPhraseGuardResult {
  const trimmed = (text ?? '').trim();
  if (trimmed.length === 0) {
    return { status: 'pass', hint: '' };
  }

  if (DECORATIVE_OR_CONTROL_RE.test(trimmed)) {
    return {
      status: 'warn',
      hint: '장식 특수문자(★●◇ 등)나 줄바꿈/탭은 이벤트필드 등록 시 오류를 유발할 수 있어요.',
    };
  }

  const hasNumericBenefit = HAS_NUMERIC_BENEFIT_RE.test(trimmed) || KOREAN_NUMERAL_UNIT_RE.test(trimmed);
  const vaguePhrase = VAGUE_PROMO_PHRASES.find((p) => trimmed.includes(p));

  if (vaguePhrase) {
    return {
      status: 'warn',
      hint: `"${vaguePhrase}" 같은 추상적인 문구는 이벤트필드 검수에서 거부되기 쉬워요 — "2만원 이상 무료배송"처럼 구체적인 수치 혜택으로 바꿔보세요.`,
    };
  }

  if (!hasNumericBenefit) {
    return {
      status: 'warn',
      hint: '네이버 이벤트필드는 구체적인 수치 혜택(예: "3만원 이상 무료배송", "6개월 무이자")만 통과해요 — 숫자를 넣어보세요.',
    };
  }

  return { status: 'pass', hint: '' };
}
