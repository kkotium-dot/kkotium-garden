// src/lib/automation/publish-readiness.ts
//
// 2026-05-31 — Publish-readiness gate with CONTENT authenticity verification.
//
// The previous "publish_ready_19_of_19" snapshot tested only field non-NULL
// and was a #46 violation: AI-fabricated values (e.g. "세계적인 인테리어 브랜드",
// "세계 표준 인증", or fragrance vocabulary on a doorbell) still flipped the
// flag true. This module adds STRUCTURAL authenticity verification:
//
//   1. Field-level NON-NULL pass (necessary, not sufficient).
//   2. Authenticity checks on title/description/brand against well-known
//      hallucination patterns (superlatives, scent-vocab in non-fragrance
//      categories, certification claims without operator approval, fabricated
//      brand authority claims).
//   3. publishReady = fieldsAllSet AND authentic AND status='DRAFT'.
//
// Pure module: no IO, no external API. Caller passes the Product row + the
// derived ToneDirective (or this can be derived inline by a route wrapper).

import type { ToneDirective } from './category-tone-mapper';

export type AuthenticityViolationType =
  | 'superlative-claim'
  | 'scent-mismatch'
  | 'fabricated-brand'
  | 'unverified-cert'
  | 'unverified-material'
  | 'placeholder-missing';

export interface AuthenticityViolation {
  type: AuthenticityViolationType;
  field: string;
  evidence: string;
}

export interface FieldChecks {
  seoTitle: boolean;
  naver_title: boolean;
  naver_keywords: boolean;
  naver_description: boolean;
  keywords: boolean;
  targetKeywords: boolean;
  golden_keyword_score: boolean;
  detail_image_url: boolean;
  main_image_url: boolean;
  optionName: boolean;
  hasOptions: boolean;
  options: boolean;
  shipping_template_id: boolean;
  carrier_code: boolean;
  sku: boolean;
  brand: boolean;
  naverCategoryCode: boolean;
  originCode: boolean;
  margin: boolean;
}

/** 상품정보제공고시 (Naver Smart Store legal disclosure) required payload.
 *  Non-NULL check ONLY — content authenticity is checked elsewhere.
 *
 *  Two tiers (2026-06-03 design 정정):
 *   - HARD legal requirements: naver_origin / naver_manufacturer / naver_as_info
 *     / naver_tax_type. These are the actual values the commerce API enforces
 *     per-product and they must carry real content.
 *   - delivery / exchange / refund guidance: now handled as fixed detail-page
 *     images (상세페이지 상단/하단 공통 이미지 슬롯), NOT as standalone text
 *     fields. The DB columns hold the standard 위탁 문구 "상품상세참조", which is
 *     a legitimate, non-placeholder value here — so a non-NULL pass is correct
 *     and intended (it points the buyer to the detail page imagery). */
export interface NaverPayloadChecks {
  // ── HARD legal requirements (must be real values) ──
  naver_origin: boolean;
  naver_manufacturer: boolean;
  naver_as_info: boolean;
  naver_tax_type: boolean;
  // ── detail-page-image-backed (satisfied by "상품상세참조") ──
  naver_delivery_info: boolean;
  naver_exchange_info: boolean;
  naver_refund_info: boolean;
}

export interface PublishReadinessInput {
  productId: string;
  status: string;
  naverProductId: string | null;
  seoTitle: string | null;
  naver_title: string | null;
  naver_keywords: string | null;
  naver_description: string | null;
  keywords: unknown;
  targetKeywords: unknown;
  golden_keyword_score: number | null;
  detail_image_url: string | null;
  main_image_url: string | null;
  optionName: string | null;
  hasOptions: boolean;
  options: unknown;
  shipping_template_id: string | null;
  carrier_code: string | null;
  sku: string | null;
  brand: string | null;
  naverCategoryCode: string | null;
  originCode: string | null;
  margin: number | null;
  legalApproval: string | null;
  toneDirective: ToneDirective;
  // ── Naver disclosure payload (commerce API required, 상품정보제공고시) ──
  naver_origin: string | null;
  naver_manufacturer: string | null;
  naver_as_info: string | null;
  naver_tax_type: string | null;
  naver_delivery_info: string | null;
  naver_exchange_info: string | null;
  naver_refund_info: string | null;
}

export interface PublishReadinessResult {
  productId: string;
  status: string;
  naverProductId: string | null;
  fields: FieldChecks;
  fieldsAllSet: boolean;
  authentic: boolean;
  authenticityViolations: AuthenticityViolation[];
  naverPayload: NaverPayloadChecks;
  naverPayloadComplete: boolean;
  naverPayloadMissing: string[];
  publishReady: boolean;
}

// ---------------------------------------------------------------------------
// Authenticity patterns
// ---------------------------------------------------------------------------

// Superlative / unsubstantiated authority claims. Korean fair-trade guidance
// (KFTC 2025) flags these as "기만/과장" risk; we block at the gate.
const SUPERLATIVE_RE = /(세계적|세계\s*표준|세계\s*[1-9]\s*위|국내\s*[1-9]\s*위|업계\s*[1-9]\s*위|최\s*고|최\s*저|유일한?|독점|공식\s*인증|국제\s*인증|표준\s*인증|글로벌\s*표준|world\s*standard|world[-\s]*class)/i;

// Scent / fragrance vocabulary — only valid in automotive-fragrance category.
const SCENT_RE = /(향기|향수|디퓨저|아로마|시그니처\s*향|향\b)/;
// Strong scent words that pass even tolerant categories (kitchen tea OK, but
// not a doorbell). We use scent vocab specifically against tradition-gift,
// kitchen, kids, digital, fashion (excluding ambiguous beauty/food).
const SCENT_BANNED_GROUPS = new Set(['tradition-gift', 'kitchen', 'kids', 'digital', 'fashion', 'homeliving']);

// Material claim patterns that must be corroborated by ground-truth crawl
// data. Without a verified source, we treat them as fabricated.
const MATERIAL_RE = /(유리|금속|스테인리스|실리콘|순\s*가죽|천연\s*가죽|크리스탈)/;

// Certification claim patterns require legalApproval flag on the product.
const CERT_RE = /(인증|certif(ied|icate)|\bISO\s*\d+|FDA|KS|GS\s*인증)/i;

const FABRICATED_BRAND_RE = /(세계적인|글로벌|독보적|업계\s*최고|premium\s*global|world[-\s]*class)/i;

// ---------------------------------------------------------------------------
// Field checks
// ---------------------------------------------------------------------------

function isNonEmptyArray(v: unknown): boolean {
  return Array.isArray(v) && v.length > 0;
}
function isNonEmptyString(v: unknown): boolean {
  return typeof v === 'string' && v.trim().length > 0;
}

function evaluateFields(input: PublishReadinessInput): FieldChecks {
  return {
    seoTitle: isNonEmptyString(input.seoTitle),
    naver_title: isNonEmptyString(input.naver_title),
    naver_keywords: isNonEmptyString(input.naver_keywords),
    naver_description: isNonEmptyString(input.naver_description),
    keywords: isNonEmptyArray(input.keywords),
    targetKeywords: isNonEmptyArray(input.targetKeywords),
    golden_keyword_score: typeof input.golden_keyword_score === 'number',
    detail_image_url: isNonEmptyString(input.detail_image_url),
    main_image_url: isNonEmptyString(input.main_image_url),
    optionName: isNonEmptyString(input.optionName),
    hasOptions: input.hasOptions === true,
    options: isNonEmptyArray(input.options),
    shipping_template_id: isNonEmptyString(input.shipping_template_id),
    carrier_code: isNonEmptyString(input.carrier_code),
    sku: isNonEmptyString(input.sku),
    brand: isNonEmptyString(input.brand),
    naverCategoryCode: isNonEmptyString(input.naverCategoryCode),
    originCode: isNonEmptyString(input.originCode),
    margin: typeof input.margin === 'number' && input.margin > 0,
  };
}

// ---------------------------------------------------------------------------
// Authenticity checks
// ---------------------------------------------------------------------------

function checkAuthenticity(input: PublishReadinessInput): AuthenticityViolation[] {
  const v: AuthenticityViolation[] = [];
  const group = input.toneDirective.categoryGroup;

  // ── superlative / authority claims ──────────────────────────────────────
  for (const [field, value] of [
    ['naver_title', input.naver_title],
    ['seoTitle', input.seoTitle],
    ['naver_description', input.naver_description],
    ['brand', input.brand],
  ] as const) {
    if (typeof value === 'string' && SUPERLATIVE_RE.test(value)) {
      v.push({
        type: 'superlative-claim',
        field,
        evidence: value.match(SUPERLATIVE_RE)?.[0] ?? '',
      });
    }
  }

  // ── fabricated brand authority ──────────────────────────────────────────
  if (typeof input.brand === 'string' && FABRICATED_BRAND_RE.test(input.brand)) {
    v.push({
      type: 'fabricated-brand',
      field: 'brand',
      evidence: input.brand.match(FABRICATED_BRAND_RE)?.[0] ?? input.brand,
    });
  }

  // ── scent vocabulary mismatch ───────────────────────────────────────────
  if (group && SCENT_BANNED_GROUPS.has(group)) {
    for (const [field, value] of [
      ['naver_description', input.naver_description],
      ['naver_title', input.naver_title],
    ] as const) {
      if (typeof value === 'string' && SCENT_RE.test(value)) {
        v.push({
          type: 'scent-mismatch',
          field,
          evidence: value.match(SCENT_RE)?.[0] ?? '',
        });
      }
    }
  }

  // ── unverified material claims in description ───────────────────────────
  // Material claims need corroboration. Without a known ground-truth source,
  // treat any specific material assertion as unverified. (Crawl-level material
  // detection is a future enhancement; until then this is fail-closed.)
  if (typeof input.naver_description === 'string' && MATERIAL_RE.test(input.naver_description)) {
    v.push({
      type: 'unverified-material',
      field: 'naver_description',
      evidence: input.naver_description.match(MATERIAL_RE)?.[0] ?? '',
    });
  }

  // ── certification claims without legalApproval ──────────────────────────
  if (
    typeof input.naver_description === 'string' &&
    CERT_RE.test(input.naver_description) &&
    !input.legalApproval
  ) {
    v.push({
      type: 'unverified-cert',
      field: 'naver_description',
      evidence: input.naver_description.match(CERT_RE)?.[0] ?? '',
    });
  }

  // ── placeholder leak (detail_image_url empty) ──────────────────────────
  if (!input.detail_image_url || !input.detail_image_url.startsWith('https://')) {
    v.push({
      type: 'placeholder-missing',
      field: 'detail_image_url',
      evidence: input.detail_image_url ?? 'null',
    });
  }

  return v;
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

function evaluateNaverPayload(input: PublishReadinessInput): NaverPayloadChecks {
  return {
    // HARD legal requirements — real values enforced per-product by the API.
    naver_origin: isNonEmptyString(input.naver_origin),
    naver_manufacturer: isNonEmptyString(input.naver_manufacturer),
    naver_as_info: isNonEmptyString(input.naver_as_info),
    naver_tax_type: isNonEmptyString(input.naver_tax_type),
    // Detail-page-image-backed: "상품상세참조" is the intended, accepted value
    // (the actual 배송/교환/반품 안내 lives in the 상단/하단 공통 이미지 슬롯).
    naver_delivery_info: isNonEmptyString(input.naver_delivery_info),
    naver_exchange_info: isNonEmptyString(input.naver_exchange_info),
    naver_refund_info: isNonEmptyString(input.naver_refund_info),
  };
}

export function evaluatePublishReadiness(input: PublishReadinessInput): PublishReadinessResult {
  const fields = evaluateFields(input);
  const fieldsAllSet = Object.values(fields).every(Boolean);
  const authenticityViolations = checkAuthenticity(input);
  const authentic = authenticityViolations.length === 0;
  const naverPayload = evaluateNaverPayload(input);
  const naverPayloadMissing = Object.entries(naverPayload)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const naverPayloadComplete = naverPayloadMissing.length === 0;
  const publishReady =
    fieldsAllSet &&
    authentic &&
    naverPayloadComplete &&
    input.status === 'DRAFT' &&
    input.naverProductId === null;

  return {
    productId: input.productId,
    status: input.status,
    naverProductId: input.naverProductId,
    fields,
    fieldsAllSet,
    authentic,
    authenticityViolations,
    naverPayload,
    naverPayloadComplete,
    naverPayloadMissing,
    publishReady,
  };
}
