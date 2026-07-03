// src/lib/studio/section-copy.ts
// ============================================================================
// SF-3a (#55 / #155 / #181) — PURE, zero-cost per-section copy SUGGESTIONS for
// the 7 detail-page sections (detail-sections.ts). Read-only drafts the operator
// can copy to the clipboard; NO persistence (SF-1 pattern, safe MVP).
//
// Free-first (#155): template / rule / data-direct only — no AI call. It NEVER
// fabricates data it does not have (#82): a section with no usable source is
// marked `available: false`, and the board renders "생성 필요" for it.
//
// Authority: SF3_SECTION_COPY_SPEC_2026-07-03.md §2 (section→source mapping).
// Korean copy literals are isolated in this constants module (#3-1), matching the
// existing copy-template.ts pattern. English comments only.
// ============================================================================

import { buildTemplateCopy, type TemplateCopy } from '@/lib/seo/copy-template';

export interface SectionCopyStore {
  asPhone?: string | null;
  asGuide?: string | null;
  returnFee?: number | null;
  exchangeFee?: number | null;
  freeShippingThreshold?: number | null;
  noticeTopText?: string | null;
  noticeBottomText?: string | null;
}

export interface SectionCopyInput {
  name: string;
  hookPhrase?: string | null;      // Product.hookPhrase (SEO hook)
  seoHookText?: string | null;     // Product.seo_hook_text (alt hook)
  keywords?: string[];             // parsed Product.keywords
  goldenKeywords?: string[];       // parsed Product.targetKeywords
  categoryWord?: string | null;    // leaf category label
  categoryPath?: string | null;
  price?: number | null;
  origin?: string | null;          // Product.naver_origin
  freeShippingThreshold?: number | null;
  giftWrapping?: boolean;
  store?: SectionCopyStore;
}

export interface SectionCopy {
  headline: string | null;
  body: string | null;
  sourceLabel: string;   // operator-facing origin of the draft
  available: boolean;    // false -> board renders "생성 필요"
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const joinDot = (parts: (string | null | undefined)[]) =>
  parts.map((p) => (p ?? '').toString().trim()).filter(Boolean).join(' · ');
const won = (n?: number | null): string | null =>
  typeof n === 'number' && n > 0 ? `${n.toLocaleString()}원` : null;

function pickKeyword(i: SectionCopyInput): string {
  return (i.goldenKeywords?.[0]?.trim()) || (i.keywords?.[0]?.trim()) || i.name.trim();
}

// 후킹 — golden-keyword hook line (explicit SEO hook wins, else template draft).
function hookCopy(i: SectionCopyInput, tc: TemplateCopy): SectionCopy {
  const kw = pickKeyword(i);
  const explicit = (i.hookPhrase?.trim()) || (i.seoHookText?.trim());
  const rec = tc.detail.find((d) => d.tone === tc.recommendedTone) ?? tc.detail[0];
  const draft = tc.eventField || (rec ? clean([rec.headline, rec.sub].filter(Boolean).join(' — ')) : '');
  const body = explicit || draft;
  return {
    headline: kw || null,
    body: body || null,
    sourceLabel: explicit ? '골든 키워드 훅' : '템플릿 초안',
    available: Boolean(body),
  };
}

// 가치 제안 — keyword-driven benefits (up to 3), else benefit-tone template.
function valueCopy(i: SectionCopyInput, tc: TemplateCopy): SectionCopy {
  const kws = (i.keywords ?? []).map((k) => k.trim()).filter(Boolean).slice(0, 3);
  const rec = tc.detail.find((d) => d.tone === 'benefit') ?? tc.detail[0];
  const headline = rec?.headline ?? pickKeyword(i);
  const body = kws.length ? kws.join(' · ') : (rec?.sub ?? null);
  return {
    headline: headline || null,
    body: body || null,
    sourceLabel: kws.length ? '키워드 베네핏' : '템플릿 초안',
    available: Boolean(kws.length || rec?.sub),
  };
}

// 상세 스펙 — data-direct from product attributes (category · origin · price).
function specCopy(i: SectionCopyInput): SectionCopy {
  const parts = joinDot([
    i.categoryWord?.trim() || null,
    i.origin?.trim() ? `원산지 ${i.origin.trim()}` : null,
    won(i.price) ? `판매가 ${won(i.price)}` : null,
  ]);
  return {
    headline: `${i.name.trim()} 상세 정보`,
    body: parts || null,
    sourceLabel: '상품 데이터',
    available: Boolean(parts),
  };
}

// 사용법·활용 — category template (always producible from name/category).
function usageCopy(i: SectionCopyInput): SectionCopy {
  const cat = i.categoryWord?.trim();
  const kw = pickKeyword(i);
  const body = cat
    ? `${cat}이(가) 필요한 다양한 공간과 상황에 활용해 보세요.`
    : `${kw}을(를) 일상 속 다양한 상황에 활용해 보세요.`;
  return {
    headline: `${kw} 활용법`,
    body: clean(body),
    sourceLabel: '카테고리 템플릿',
    available: true,
  };
}

// 신뢰 요소 — store_settings (A/S · 문의 · 반품/교환비).
function trustCopy(i: SectionCopyInput): SectionCopy {
  const s = i.store ?? {};
  const parts = joinDot([
    s.asGuide?.trim() ? `A/S ${s.asGuide.trim()}` : null,
    s.asPhone?.trim() ? `문의 ${s.asPhone.trim()}` : null,
    won(s.returnFee) ? `반품비 ${won(s.returnFee)}` : null,
    won(s.exchangeFee) ? `교환비 ${won(s.exchangeFee)}` : null,
  ]);
  return {
    headline: '안심 구매 · 사후 관리',
    body: parts || null,
    sourceLabel: '스토어 설정',
    available: Boolean(parts),
  };
}

// 구매 유도 — CTA template + concrete benefits when available.
function ctaCopy(i: SectionCopyInput): SectionCopy {
  const kw = pickKeyword(i);
  const fst = i.freeShippingThreshold ?? i.store?.freeShippingThreshold ?? null;
  const parts = joinDot([
    won(fst) ? `${won(fst)} 이상 무료배송` : null,
    i.giftWrapping ? '선물포장 가능' : null,
  ]);
  const body = parts ? `${parts} · 지금 만나보세요` : '지금 만나보세요';
  return {
    headline: `${kw}, 지금 담아보세요`,
    body: clean(body),
    sourceLabel: '구매 유도 템플릿',
    available: true,
  };
}

// 공통 안내 — store_settings notice pin (read-only, SF-1 existing).
function noticeCopy(i: SectionCopyInput): SectionCopy {
  const s = i.store ?? {};
  const parts = joinDot([s.noticeTopText?.trim() || null, s.noticeBottomText?.trim() || null]);
  return {
    headline: '스토어 공통 안내',
    body: parts || '스토어 상/하단 고정 안내(설정에서 관리)',
    sourceLabel: '스토어 설정(고정)',
    available: Boolean(parts),
  };
}

/** PURE — per-section read-only copy suggestions keyed by DETAIL_SECTIONS.key. */
export function buildSectionCopies(input: SectionCopyInput): Record<string, SectionCopy> {
  const tc = buildTemplateCopy({
    name: input.name,
    keyword: input.goldenKeywords?.[0] ?? input.keywords?.[0],
    categoryWord: input.categoryWord ?? undefined,
    categoryPath: input.categoryPath ?? undefined,
    price: input.price ?? undefined,
    origin: input.origin ?? undefined,
    freeShippingThreshold: input.freeShippingThreshold ?? input.store?.freeShippingThreshold ?? undefined,
  });
  return {
    hook: hookCopy(input, tc),
    value: valueCopy(input, tc),
    spec: specCopy(input),
    usage: usageCopy(input),
    trust: trustCopy(input),
    cta: ctaCopy(input),
    notice: noticeCopy(input),
  };
}
