// src/lib/naver/category-deterministic-matcher.ts
// UCE-1/UCE-3 (Universal Category Engine, 2026-08-27): deterministic category
// matching against the FULL master (NAVER_CATEGORIES_FULL, 5,021 leaves) —
// no AI call, no maintenance burden. Replaces the old hand-picked
// FALLBACK_RULES (~57 entries) with a rule that covers all 5,021 leaves and
// stays correct automatically whenever the master is regenerated (UCE-3).
//
// Core insight: Naver leaf category names are themselves the best keyword
// dictionary — they're already curated, already exhaustive, and Korean
// compounds don't need spaces (e.g. "달항아리" contains "항아리", a real
// leaf name under 생활/건강>주방용품>보관/밀폐용기). So the primary signal
// is a straight substring test of the product name against every leaf name
// in the master, scored by specificity (match length, d4 > d3).
//
// This is PURE — no I/O, no AI, no DB. Runs before Groq (UCE-1: "결정론적
// 매칭 1순위, AI는 실패 시 보조로 강등").
//
// UCE-7 (2026-08-27, 명사중심 재설계): the length-only scoring above had a
// real production bug — wholesale titles are space-separated ("실리콘 주걱")
// while a leaf name is often the compact concatenation of modifier+head
// ("칫솔살균기", "차량용방향제", "요가매트"). A plain `name.includes(label)`
// never sees these because the space breaks the substring. Fix:
//   1. Also test every leaf against the space-free join of extracted nouns
//      (`nounsCompact`), which recovers exactly this class of compound leaf.
//   2. Weight matches by WHICH noun matched, not just match length. Korean
//      noun phrases put the head noun last ("실리콘 주걱" — 주걱 is the
//      object, 실리콘 is a material modifier). A match on the tail noun
//      (핵심/말단명사) is boosted; a match on an earlier modifier-only noun
//      is penalized. This fixes cases like "실리콘 주걱" incorrectly ranking
//      생활/건강>공구>접착용품>실리콘 (a 3-char modifier match) above
//      생활/건강>주방용품>조리기구>주걱 (the actual 2-char head-noun match).
//   3. Reverse-containment fallback: when no leaf/d3/d2 forward-contains the
//      product name/nounsCompact at all, also check whether the head noun
//      alone is contained INSIDE a leaf name (e.g. "빨대" inside
//      "일회용빨대") — weaker signal (no modifier corroboration), scored
//      below every forward match, but better than returning nothing for a
//      product whose exact head noun isn't itself a bare leaf.
//
// Known limitation: slash-packed labels ("필라테스/요가") can occasionally
// out-score the correct product category when a lesson/service category
// happens to pack the same two words a clothing item's name contains (e.g.
// "요가복" → 여가/생활편의>예체능레슨>필라테스/요가 out-scores the correct
// 스포츠/레저>요가/필라테스>요가복). We don't special-case this — the caller's
// existing Naver page-1 distribution check (validatePageCategory) is the
// intended corrective layer, and the correct answer still surfaces in the
// top-3 either way.

import { NAVER_CATEGORIES_FULL } from './naver-categories-full';
import { extractNouns } from '../strategy/morpheme-tokenizer';
import { GENERIC_MODIFIERS_SET, STOP_NOUNS_SET } from '../strategy/identity-dictionary';

// UCE-10 (2026-09-04, tie-break fix): (d1|d2|d3) -> count of non-empty d4
// children. Computed once at module load (NAVER_CATEGORIES_FULL is static),
// not per-call - a per-call scan would make the branch tie-break O(n^2).
// Replaces the old isLeafItself(+1) bonus, which always favoured a
// coincidental same-named leaf (0 children) over the real, broader branch
// (many children) sharing that d3 name.
const D3_CHILD_COUNT = new Map<string, number>();
for (const c of NAVER_CATEGORIES_FULL) {
  if (!c.d3 || !c.d4) continue;
  const key = `${c.d1}|${c.d2}|${c.d3}`;
  D3_CHILD_COUNT.set(key, (D3_CHILD_COUNT.get(key) ?? 0) + 1);
}
function branchBreadthBonus(d1: string, d2: string, d3: string): number {
  const childCount = D3_CHILD_COUNT.get(`${d1}|${d2}|${d3}`) ?? 0;
  return Math.min(2, Math.log2(childCount + 1) * 0.5);
}

/** Which scoring tier produced this candidate — exposed so callers (route.ts
 *  UCE-7b) can gate on match STRENGTH, not just score. Tier 1 = exact leaf
 *  match (trust the score); Tier 2/3 are weak/broad by construction and
 *  should always be treated as low-confidence regardless of their number. */
export type MatchTier = 1 | 2 | 3 | 4;

export interface DeterministicMatch {
  d1: string;
  d2: string;
  d3: string;
  d4?: string;
  /** Which leaf/branch text actually matched — for debugging & UI trust signal. */
  matchedTerm: string;
  score: number;
  /** 1=leaf exact, 2=d3-only, 3=reverse-containment fallback, 4=d2-only. */
  tier: MatchTier;
  /** UCE-11 (결함B, 2026-09-06): true when this candidate is a genuine deep
   *  leaf (d4) whose entire identity rests on a bare name that ALSO names a
   *  broader/richer BRANCH under a different d1 elsewhere in the master, and
   *  nothing else in the product's own text corroborates this candidate's own
   *  d2 — see homonymUnconfirmed computation in matchDeterministicCategories. */
  homonymUnconfirmed?: boolean;
}

const MIN_TERM_LEN = 2; // shorter than this is too generic to trust as a signal

// UCE-7a: head-noun (말단/핵심명사) vs modifier-noun weighting. A match on the
// tail noun of the extracted noun list is far more likely to name what the
// product actually IS; a match on an earlier noun is far more likely to be a
// material/usage modifier describing it. See file header for the motivating
// "실리콘 주걱" bug. ×3 / ×0.5 per UCE-7 design doc (docs/design/
// UCE7_MATCH_QUALITY_2026-08-27.md §3 UCE-7a).
const HEAD_NOUN_BOOST = 3;
const MODIFIER_NOUN_PENALTY = 0.5;
// UCE-9: exact d2/d3 branch-name match — scored as if headNoun were itself a
// self-matching leaf with the full head-noun boost (length*10, +headroom,
// ×HEAD_NOUN_BOOST ≈ length*30). This must beat a spurious partial/substring
// collision elsewhere (실측: "청소기" 부분매칭 105점이 "무선청소기" 완전일치
// 150점에 져야 함), but must NOT beat a genuinely more specific compound leaf
// that already encodes the modifier ("전동칫솔"=135점 leaf가 bare "칫솔"
// 완전일치=60점보다 여전히 이겨야 함 — 더 구체적인 매치가 항상 우선).
const EXACT_BRANCH_SCORE_PER_CHAR = 30;
// UCE-7: reverse-containment fallback weight (headNoun found INSIDE a leaf
// name, e.g. "빨대" inside "일회용빨대") — deliberately below every forward
// tier's baseline so a real forward match always wins when one exists.
const REVERSE_HEAD_WEIGHT = 6;

// UCE-7c: service/lesson d2 buckets are never a valid category for a physical
// wholesale product — this engine only ever matches physical goods. Every d2
// under 여가/생활편의 is a class/rental/travel/care SERVICE (verified against
// the full master, 2026-08-27), which is how "차량용방향제" could previously
// out-rank into 여가/생활편의>원데이클래스>수공예 클래스 (its slash-packed
// "캔들/방향제/향수" label happens to share vocabulary with the product name).
// Listed at the d2 level (not blanket d1) so a future physical-goods d2 added
// under this d1 isn't silently excluded too.
const EXCLUDED_SERVICE_D2 = new Set<string>([
  '국내렌터카',
  '국내여행/체험',
  '예체능레슨',
  '원데이클래스',
  '자기계발/취미 레슨',
  '장기 국내여행/체험',
  '장기 해외여행',
  '해외여행',
  '홈케어서비스',
]);

/** A candidate term is unusable as a signal if it's itself a generic
 *  wholesale-listing modifier/stopword (e.g. "무선","세트") — some Naver leaf
 *  names ARE bare generic words (taxonomy quirk), which would otherwise
 *  produce confident-looking but meaningless matches on any product whose
 *  title happens to contain that common word. */
function isGenericTerm(term: string): boolean {
  return GENERIC_MODIFIERS_SET.has(term) || STOP_NOUNS_SET.has(term);
}

/** Split a "A/B/C" tree-node name into its synonym parts, dropping ones too
 *  short to be a reliable standalone signal. Naver often packs synonyms into
 *  a single d2/d3/d4 label this way (e.g. "마스크/팩", "아로마방향제/디퓨저"). */
function splitSynonyms(label: string): string[] {
  return label.split('/').map((p) => p.trim()).filter((p) => p.length >= MIN_TERM_LEN);
}

// UCE-10 (2026-09-04, 결함B): master leaf names spell the formal "...용"
// (for-use-of) suffix ("실내용방향제") while wholesale titles routinely drop
// it ("실내방향제") — a pure substring test misses this and the product
// leaks to an unrelated leaf. Stripping "용" and retrying is a weaker signal
// than an exact match (전수스캔: 355건 중 정규화 충돌 3건뿐, 문맥으로 구분
// 가능 — docs/design/UCE10_TIE_BREAK_AND_SOURCING_PARITY_2026-09-04.md),
// so it's scored at a discount rather than treated as equal.
const YONG_NORM_PENALTY = 0.85;
function stripYong(s: string): string {
  return s.replace(/용/g, '');
}

/** Score a single tree-node label against a set of candidate haystacks
 *  (the raw product name, and the space-free join of its extracted nouns).
 *  Handles both plain labels ("우산꽂이" — whole-string substring) and
 *  slash-packed labels ("아로마방향제/디퓨저" — every synonym part must
 *  appear somewhere in one of the haystacks; a product rarely repeats every
 *  synonym verbatim, so this is scored by total matched length rather than
 *  requiring the packed string itself). */
interface TermMatch {
  score: number;
  /** UCE-11 (결함F, 2026-09-06): true only for a slash-packed label where
   *  SOME but not ALL synonym parts matched (matched.length < parts.length).
   *  A partial coverage hit means we only have weak textual evidence that
   *  the product is any ONE particular synonym in the packed group — see
   *  headNounWeight, which uses this to refuse to also stack a positional
   *  HEAD_NOUN_BOOST on top of an already-uncertain partial match. */
  partial: boolean;
}

function termMatchScore(label: string, haystacks: readonly string[]): TermMatch {
  if (!label || isGenericTerm(label)) return { score: 0, partial: false };
  if (label.includes('/')) {
    const parts = splitSynonyms(label);
    const matched = parts.filter((p) => !isGenericTerm(p) && haystacks.some((h) => h.includes(p)));
    if (matched.length === 0) return { score: 0, partial: false };
    const full = matched.length === parts.length;
    const len = matched.reduce((sum, p) => sum + p.length, 0);
    // UCE-11 (결함C, 2026-09-05): partial coverage used to be a flat ×0.5
    // regardless of how many parts were packed into the label, so a single
    // matched fragment out of a 3-part label ("내솥/패킹/트레이" matching only
    // "트레이") scored the same as 1-of-2 ("아로마방향제/디퓨저" matching only
    // "디퓨저") — letting a generic 물건종류 word like "트레이" accidentally
    // borrow a whole unrelated leaf's confidence (실측: "얼음트레이" landed on
    // 전기밥솥>내솥/패킹/트레이 at exactly 20.00, tied to
    // DETERMINISTIC_MIN_CONFIDENT_SCORE's `<` boundary — see
    // isDeterministicLowConfidence in category-ai-suggest.ts). Scale the
    // penalty by actual coverage instead: 1-of-3 is a weaker signal than
    // 1-of-2, and should score weaker.
    return { score: full ? len : len * (matched.length / parts.length), partial: !full };
  }
  if (label.length < MIN_TERM_LEN) return { score: 0, partial: false };
  if (haystacks.some((h) => h.includes(label))) return { score: label.length, partial: false };

  // UCE-10 (결함B): retry with "용" stripped from both sides, discounted.
  const normLabel = stripYong(label);
  if (normLabel.length >= MIN_TERM_LEN && normLabel !== label) {
    if (haystacks.some((h) => stripYong(h).includes(normLabel))) {
      return { score: label.length * YONG_NORM_PENALTY, partial: false };
    }
  }
  return { score: 0, partial: false };
}

/** UCE-7: does `label` textually overlap the head noun / a modifier noun?
 *  Slash-packed labels are checked part-by-part so "매트/발판" still counts
 *  as a head-noun hit when the product's head noun is "매트". Returns a
 *  score multiplier: boost when the head noun is involved, penalty when
 *  only a modifier noun is, neutral (1) when neither can be determined
 *  (e.g. product name didn't tokenize into 2+ nouns). */
function headNounWeight(
  label: string,
  headNoun: string,
  modifierNouns: readonly string[],
  partialMatch: boolean,
): number {
  if (!headNoun) return 1;
  const parts = label.includes('/') ? splitSynonyms(label) : [label];
  // UCE-11 (결함D, 2026-09-05): the reverse-containment direction
  // (`term.includes(p)` — label is a fragment embedded inside headNoun) used
  // to boost regardless of WHERE in headNoun the fragment sat. When the
  // tokenizer fails to split a compound at all ("실리콘트레이" -> one opaque
  // noun instead of 실리콘+트레이, i.e. modifierNouns is empty because there
  // was nothing left to split off), that blob becomes headNoun whole, and
  // any short leaf that's merely a substring somewhere inside it (e.g.
  // "실리콘" from 공구>접착용품>실리콘) got the full HEAD_NOUN_BOOST — a
  // coincidental hit, not a real identity match (실측: "실리콘트레이"/
  // "미니트레이"/"큐브트레이" all landed on unrelated categories at
  // confident scores, lowConf=false, never reaching AI/개입큐). Korean noun
  // phrases put the real identity noun LAST, so in that single-noun-blob
  // case a fragment is only trustworthy at the head-final position
  // (`term.endsWith(p)`).
  //
  // This restriction is scoped to modifierNouns.length===0 ONLY — when the
  // tokenizer DID split off a modifier ("차량용 신발장" -> headNoun="신발장",
  // modifier="차량용"), headNoun is a genuine, independently-isolated
  // identity noun and the unrestricted reverse-containment check must stay:
  // it's what lets a coincidentally-embedded competitor ("신발" inside
  // "신발장") keep enough score to trip the d1-conflict-gap safety net in
  // category-id-resolver.ts/route.ts instead of being silently crushed to
  // where the (still debatable) "신발장" top pick looks artificially
  // uncontested. Only the untokenized-blob case is unambiguous enough to
  // tighten.
  const singleNounProduct = modifierNouns.length === 0;
  // UCE-11 (결함F, 2026-09-06, task_b37526ed): a STRONG head match — the
  // label (or one of its slash-packed synonym parts) fully CONTAINS/EQUALS
  // headNoun (`p.includes(term)`) — is trustworthy regardless of whether the
  // underlying leaf match was a partial slash coverage: the whole product
  // identity noun genuinely equals one specific synonym in the packed group
  // ("컵받침" the product == "컵받침" the synonym inside "컵받침/홀더"), so
  // which OTHER synonyms in that group didn't also appear is irrelevant.
  const strongHeadMatch = parts.some((p) => p.includes(headNoun));
  if (strongHeadMatch) return HEAD_NOUN_BOOST;
  // A WEAK head match is the reverse direction — only a FRAGMENT of headNoun
  // (shorter than it) lines up with the label, either because headNoun is an
  // untokenized blob and the fragment sits at its tail (singleNounProduct;
  // 결함D), or because headNoun is a real noun that happens to textually
  // contain a shorter, unrelated label (non-singleNounProduct; kept
  // unrestricted for the 신발장 competing-candidate reason above).
  const weakHeadMatch = singleNounProduct
    ? parts.some((p) => headNoun.length > p.length && headNoun.endsWith(p))
    : parts.some((p) => headNoun.includes(p));
  if (weakHeadMatch) {
    // UCE-11 (결함F): stacking the full HEAD_NOUN_BOOST on top of a match
    // that was ALREADY discounted for partial slash coverage double-counts
    // uncertainty in the wrong direction — a partial match only tells us one
    // GENERIC synonym fragment ("받침") turned up somewhere, and a weak
    // (non-exact) head-noun overlap adds no real corroboration on top of
    // that (실측: "미니/우드/스텐받침" all landed on 생활/건강>욕실용품>
    // 욕실용기/홀더>비눗갑/홀더/받침 at a confident 35점 — "받침" is 1-of-3
    // matched fragments AND only reaches headNoun via the untokenized-blob
    // tail-suffix branch, never as a full self-equal identity hit). Refuse
    // the boost there; a full/plain match (partialMatch=false) keeps it.
    return partialMatch ? 1 : HEAD_NOUN_BOOST;
  }
  const overlapsPlain = (term: string) => parts.some((p) => p.includes(term) || term.includes(p));
  if (modifierNouns.some((m) => overlapsPlain(m))) return MODIFIER_NOUN_PENALTY;
  // UCE-11 (결함D): in the single-noun-blob case, a fragment that appeared
  // inside headNoun but NOT at the head-final position is the same weak
  // "modifier position" signal as matching a modifier noun above — penalize
  // it the same way rather than falling through to neutral (which would
  // still let the raw leaf-length score alone clear the confidence
  // threshold unchecked).
  if (singleNounProduct) {
    const inModifierPosition = (term: string) =>
      parts.some((p) => term.length > p.length && term.includes(p) && !term.endsWith(p));
    if (inModifierPosition(headNoun)) return MODIFIER_NOUN_PENALTY;
  }
  return 1;
}

/**
 * PURE. Deterministically match a Korean product name against every leaf in
 * the Naver category master. Returns candidates sorted by score desc,
 * deduplicated by (d1,d2,d3), capped to `limit`. Empty array = genuinely no
 * lexical overlap found (caller should fall through to AI).
 */
export function matchDeterministicCategories(
  productName: string,
  limit = 3,
): DeterministicMatch[] {
  const name = productName.trim();
  if (!name) return [];

  const { nouns } = extractNouns(name);
  // UCE-7: tail noun = head noun (핵심/말단명사 — what the product actually
  // IS, per Korean noun-phrase order); everything before it is a modifier
  // (material/usage/brand). `nounsCompact` recovers compound leaf names that
  // the wholesale title wrote with a space ("실리콘 주걱" -> can still match
  // a leaf like "칫솔살균기" style compact spelling once nouns are re-joined).
  //
  // UCE-9 (2026-09-02, category_id 백필 전수검증): a small set of trailing
  // words are near-universal SEO/category-stuffing suffixes in Korean
  // wholesale titles ("...달항아리 인테리어", "...가습기 인테리어") rather
  // than the product's actual identity — treating them as the headNoun makes
  // HEAD_NOUN_BOOST reward the wrong signal (실측: 도서>가정/요리>인테리어/
  // 살림>인테리어로 오분류). Skip them when picking headNoun, falling back to
  // the nearest real identity noun before it.
  const HEAD_NOUN_EXCLUDE = new Set(['인테리어']);
  let headIdx = nouns.length - 1;
  while (headIdx > 0 && HEAD_NOUN_EXCLUDE.has(nouns[headIdx])) headIdx--;
  const headNoun = nouns.length > 0 ? nouns[headIdx] : '';
  const modifierNouns = nouns.filter((_, i) => i !== headIdx);
  const nounsCompact = nouns.join('');
  const haystacks = [name, nounsCompact].filter((h, i, arr) => h && arr.indexOf(h) === i);

  const byKey = new Map<string, DeterministicMatch>();

  const consider = (key: string, match: DeterministicMatch) => {
    const existing = byKey.get(key);
    if (!existing || existing.score < match.score) byKey.set(key, match);
  };

  for (const c of NAVER_CATEGORIES_FULL) {
    // UCE-7c: service/lesson categories are never a physical-product match.
    if (EXCLUDED_SERVICE_D2.has(c.d2)) continue;

    // UCE-9 (2026-09-02, UCE7_EDGECASE_QUEUE §3-1/§3-2 근본수정): the head
    // noun EXACTLY equals a d2/d3 BRANCH name — the product is describing
    // that structural node, not merely sharing a word with some unrelated
    // leaf elsewhere. This must always outrank a coincidental partial/
    // substring match (실측: "무선청소기"→생활/건강>공구>전동공구>청소기
    // (leaf 부분매칭, 105점)가 진짜 정답인 디지털/가전>청소기>무선청소기(d3
    // 완전일치, 구 tier2 120점)를 근소하게 이겨야 정상인데 근소해서 위험했고,
    // "물티슈"→생활/건강>반려동물>...>물티슈/크리너(부분매칭)가 정답
    // 출산/육아>물티슈(d2 완전일치)를 아예 이겨버렸음). 완전일치이므로 어떤
    // leaf의 우연한 부분매칭보다도 신뢰도가 높다 — 큰 고정 보너스로 확정.
    if (headNoun && headNoun.length >= MIN_TERM_LEN) {
      // Tie-break when the SAME branch name exists under two different
      // parents (e.g. "소파" is a d3 under both 거실가구 (as an ancestor of
      // qualified leaves like "가죽소파") and 아동/주니어가구 (where "소파"
      // IS itself the sellable leaf, d4 empty) — prefer the one that's an
      // actual leaf over one that's merely an ancestor label, so a bare
      // head-noun match resolves to a real product node, not just a branch.
      if (c.d3 && c.d3 === headNoun) {
        consider(`${c.d1}|${c.d2}|${c.d3}`, {
          d1: c.d1, d2: c.d2, d3: c.d3, d4: undefined, matchedTerm: c.d3, tier: 1,
          score: c.d3.length * EXACT_BRANCH_SCORE_PER_CHAR + branchBreadthBonus(c.d1, c.d2, c.d3),
        });
      }
      if (c.d2 === headNoun) {
        consider(`${c.d1}|${c.d2}|`, {
          d1: c.d1, d2: c.d2, d3: '', d4: undefined, matchedTerm: c.d2, tier: 1,
          score: c.d2.length * EXACT_BRANCH_SCORE_PER_CHAR,
        });
      }
    }

    const leaf = c.d4 || c.d3; // deepest non-empty level
    if (!leaf) continue;
    const key = `${c.d1}|${c.d2}|${c.d3}`;
    let match: DeterministicMatch | null = null;

    // Tier 1 (strongest): the deepest leaf name matches — plain substring or
    // every synonym part of a slash-packed label ("아로마방향제/디퓨저").
    // Korean has no word-boundary requirement, so this alone catches
    // "우산꽂이"(exact), "수세미"(exact), "달항아리"→"항아리"(substring).
    const leafMatch = termMatchScore(leaf, haystacks);
    if (leafMatch.score > 0) {
      match = {
        d1: c.d1, d2: c.d2, d3: c.d3, d4: c.d4 || undefined, matchedTerm: leaf, tier: 1,
        score: (leafMatch.score * 10 + (c.d4 ? 5 : 0)) * headNounWeight(leaf, headNoun, modifierNouns, leafMatch.partial),
      };
    }
    // Tier 2: d3 itself (when it differs from the leaf, i.e. d4 exists but
    // didn't match) — broader but still a real tree node. Don't guess which
    // specific d4 subtype applies (several rows can share this d3).
    else if (c.d3) {
      const d3Match = termMatchScore(c.d3, haystacks);
      if (d3Match.score > 0) {
        match = {
          d1: c.d1, d2: c.d2, d3: c.d3, d4: undefined, matchedTerm: c.d3, tier: 2,
          score: d3Match.score * 8 * headNounWeight(c.d3, headNoun, modifierNouns, d3Match.partial),
        };
      }
    }
    // Tier 3 (reverse-containment fallback): no forward match at all, but the
    // head noun alone is CONTAINED INSIDE the leaf name (e.g. "빨대" inside
    // "일회용빨대"). No modifier corroboration is possible here, so this is
    // always weaker than a real forward tier — it exists purely so a product
    // whose head noun isn't itself a bare leaf still resolves to something
    // instead of falling through empty-handed.
    if (!match && headNoun && headNoun.length >= MIN_TERM_LEN && !isGenericTerm(headNoun) && leaf.includes(headNoun)) {
      match = { d1: c.d1, d2: c.d2, d3: c.d3, d4: c.d4 || undefined, matchedTerm: leaf, tier: 3, score: headNoun.length * REVERSE_HEAD_WEIGHT };
    }
    // Tier 4: the d2 bucket itself matches (packed or plain) — trusted only
    // down to d1+d2 (d3 left blank, per selfValidateSuggestions convention).
    if (!match && c.d2) {
      const d2Match = termMatchScore(c.d2, haystacks);
      if (d2Match.score > 0) {
        consider(`${c.d1}|${c.d2}|`, {
          d1: c.d1, d2: c.d2, d3: '', d4: undefined, matchedTerm: c.d2, tier: 4,
          score: d2Match.score * 4 * headNounWeight(c.d2, headNoun, modifierNouns, d2Match.partial),
        });
      }
      continue;
    }
    if (!match) continue;

    // Corroboration bonus: an extracted noun token also textually aligns
    // with d2 (the broader bucket) — small nudge, not a requirement.
    if (nouns.some((t) => c.d2 && t.length >= MIN_TERM_LEN && c.d2.includes(t))) {
      match.score += 1;
    }
    consider(key, match);
  }

  // UCE-11 (결함B, 2026-09-06 재점검) — 동음이의 리프 충돌: "우산"이 스포츠/
  // 레저>골프>골프필드용품>우산(진짜 d4 리프, 75점)과 패션잡화>패션소품>
  // 우산(더 범용적인 d3 브랜치, 자식 3개, 61점)에 동시 존재해 d4 완전일치가
  // 이겨버린다. isDeterministicLowConfidence의 d1-conflict 게이트는
  // CONFLICT_CEILING(40) 때문에 top이 75점이면 검사 자체를 건너뛰어 확신
  // 오답이 난다(docs/design/UCE11_TOKENIZER_LONGNAME_CANDIDATES_2026-09-04.md
  // §결함B 재점검).
  //
  // 단순 "top-2nd 점수차 ≤N" 임계는 넥타이 회귀(정답 91점이 오답 90점과 1점차
  // 라 함께 걸림, Desktop 시뮬로 사전확인·금지)를 낸다 — 점수차만으론 "우산"
  // (top이 오답 d1)과 "넥타이"(top이 이미 정답 d1)를 구분 못 한다.
  //
  // 실제 구조적 차이: "우산"의 top(골프)은 d4가 실재하는 **진짜 말단 리프**라
  // breadth(자식 수)가 정의상 0이고, 진짜 정답(패션)은 **d3 브랜치**(자식
  // 3개)다. "넥타이"는 반대로 top(패션) 자체가 이미 d3 브랜치(자식 3개)라서
  // (branchBreadthBonus가 91 vs 90으로 이미 정답을 이기게 해뒀다) 이 검사
  // 대상에서 아예 제외된다(m.d4 없음 → continue). 즉 "top이 말단 리프인데
  // 더 넓은 동명 브랜치가 다른 d1에 있다"는 구조만 겨냥 — 하드코딩 사전 없이
  // 마스터에서 매 호출 시 계산(#55/#62 전상품범용).
  //
  // "골프우산"은 top의 matchedTerm이 여전히 "우산"이라 위 rival(패션, breadth
  // 3)이 그대로 걸리지만, 상품명 자체에 top의 d2("골프")가 문맥으로 등장하면
  // corroborated로 보고 플래그를 걸지 않는다 — 우연한 동음이의가 아니라
  // 진짜 그 카테고리를 가리킨다는 증거다(L433의 기존 d2-corroboration
  // 보너스와 같은 결의 신호를 재사용, 새 사전 없음). "자동우산"은 matchedTerm
  // 자체가 "자동우산"이라 애초에 같은 이름의 rival이 없어 이 체크와 무관하게
  // 안전(135점 그대로 압도).
  const allCandidates = Array.from(byKey.values());
  const nodeBreadth = (m: DeterministicMatch): number =>
    m.d4 ? 0 : (D3_CHILD_COUNT.get(`${m.d1}|${m.d2}|${m.d3}`) ?? 0);
  for (const m of allCandidates) {
    if (!m.d4) continue; // 말단 리프만 "우연한 이름충돌"의 대상 — 브랜치 매치는 제외
    const rival = allCandidates.find((o) =>
      o !== m && o.d1 !== m.d1 && o.matchedTerm === m.matchedTerm && nodeBreadth(o) > 0,
    );
    if (!rival) continue;
    const corroborated = m.d2.length >= MIN_TERM_LEN && haystacks.some((h) => h.includes(m.d2));
    if (!corroborated) m.homonymUnconfirmed = true;
  }

  return Array.from(byKey.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
