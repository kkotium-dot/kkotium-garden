// src/lib/strategy/identity-dictionary.ts
//
// Sprint 7-M2 5-B — Identity extractor dictionaries.
//
// Three Korean-token vocabularies used by morpheme-tokenizer.ts:
//   1. COMPOUND_NOUNS — multi-syllable nouns that naive whitespace tokenizers
//      would over-split (e.g. "달항아리" → ["달", "항아리"]). Matched FIRST so
//      the protected span survives into the noun list intact.
//   2. GENERIC_MODIFIERS — common Korean wholesale-listing puffery. Never
//      identity, always demoted to modifier or dropped entirely.
//   3. USAGE_HINT_TOKENS — usage / season / target words that LIKELY are
//      modifiers but still pass through shopping-search verification (some
//      categories — e.g. baby gift sets — treat 선물 as part of the identity).
//
// All Korean string literals live ONLY in this file so morpheme-tokenizer.ts
// and identity-extractor.ts stay free of literals (workflow principle #29 e).
// Auto-grown lists (Phase 2) will append here too — keep additions sorted by
// frequency to make manual review cheaper.

// ---------------------------------------------------------------------------
// 1. Compound nouns — protected before any splitting.
// ---------------------------------------------------------------------------
//
// Seeded from 도매매 leaf categories the seller has already touched plus the
// PlayMCP-verified terms from the Sprint 7-M2 5-B research session.
// Ordering note: list LONGER compounds first (e.g. "잠옷세트" before "잠옷")
// so the greedy matcher in morpheme-tokenizer prefers the longer span.

export const COMPOUND_NOUNS: ReadonlyArray<string> = [
  // Living / interior (seller's primary domain)
  '달항아리', '도어벨', '풍경종', '문종',
  '인테리어소품', '장식인형', '장식소품',
  '향초세트', '디퓨저세트', '방향제',
  // Loungewear / apparel
  '잠옷세트', '잠옷', '홈웨어', '파자마',
  '실내복', '수면바지', '수면양말',
  // Kitchen
  '주방용품', '식기세트', '도자기그릇', '머그컵',
  // Gifting bundles
  '답례품', '집들이선물', '개업선물', '신혼선물',
  // Seasonal
  '명절선물', '추석선물', '설날선물',
  // Common nouns whose -이 / -자 / -함이 endings collide with Korean particles
  // (the rule-based stripper cannot distinguish noun-final 이 from the
  // subject-marker 이 without dictionary knowledge — protect these here).
  '집들이', '액막이', '돌잡이', '걸이', '받침이', '복주머니',
];

// ---------------------------------------------------------------------------
// 2. Generic modifiers — never identity. Stripped during noun extraction or
// demoted to the modifier pool when they survive into the post-split list.
// ---------------------------------------------------------------------------

export const GENERIC_MODIFIERS: ReadonlyArray<string> = [
  '디자인', '고급', '정품', '신상', '인기', '추천', '최고', '프리미엄',
  '신형', '구형', '대용량', '소형', '대형', '미니', '맥시',
  '국내산', '수입', '직수입', '브랜드', '명품',
  // Visual / aesthetic puffery
  '예쁜', '귀여운', '심플', '모던', '클래식', '빈티지',
];

// ---------------------------------------------------------------------------
// 3. Usage / season / target hints — likely modifiers, verified per-category.
// ---------------------------------------------------------------------------

export const USAGE_HINT_TOKENS: ReadonlyArray<string> = [
  // Life events
  '선물', '개업', '집들이', '이사', '결혼', '신혼', '입주', '답례',
  // Holidays
  '명절', '추석', '설날', '발렌타인', '화이트데이', '크리스마스', '어버이날',
  // Personal events
  '생일', '기념일', '돌잔치', '백일',
  // Target audience hints (NOT category-decisive but useful signal)
  '여성', '남성', '아동', '유아', '시니어',
];

// ---------------------------------------------------------------------------
// Particles / endings — stripped from token tails during normalization.
// ---------------------------------------------------------------------------
//
// Korean particles (조사) and conjugation tails (어미) that frequently glue
// onto bare nouns in product titles. Only the most common forms — false
// positives are cheap (extra cleanup) but missed forms are costly (token
// fails to match dictionary entries).

export const PARTICLE_SUFFIXES: ReadonlyArray<string> = [
  // Subject / object / topic markers
  '은', '는', '이', '가', '을', '를',
  // Locative / instrumental
  '에', '에서', '에게', '한테', '로', '으로',
  // Conjunctive
  '와', '과', '도', '만',
  // Possessive
  '의',
];

// ---------------------------------------------------------------------------
// Stop nouns — pass tokenization but are never useful as identity probes.
// ---------------------------------------------------------------------------

export const STOP_NOUNS: ReadonlyArray<string> = [
  '상품', '제품', '아이템', '용품', '판매', '구매', '주문',
  '무료배송', '당일배송', '빠른배송',
  // Common quantifiers that look like nouns
  '개', '세트', '종', '단품',
];

// ---------------------------------------------------------------------------
// Convenience sets for O(1) lookup (built once at module load).
// ---------------------------------------------------------------------------

export const COMPOUND_NOUNS_SET: ReadonlySet<string> = new Set(COMPOUND_NOUNS);
export const GENERIC_MODIFIERS_SET: ReadonlySet<string> = new Set(GENERIC_MODIFIERS);
export const USAGE_HINT_TOKENS_SET: ReadonlySet<string> = new Set(USAGE_HINT_TOKENS);
export const STOP_NOUNS_SET: ReadonlySet<string> = new Set(STOP_NOUNS);
