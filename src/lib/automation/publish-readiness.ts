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
import {
  evaluateThumbnailPolicy,
  type ThumbnailCandidateSignals,
  type PolicyViolation,
} from '@/lib/naver/thumbnail-policy';

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
  // 2026-06-03 — 배송 설정 (템플릿 OR product 배송필드). 발행 로직은 템플릿이
  // 없으면 buildDeliveryInfoFromProduct(courierCode + shippingFee)로 발행하므로
  // 게이트도 정합. 기존 shipping_template_id 단독 필수를 대체.
  shipping: boolean;
  carrier_code: boolean;
  sku: boolean;
  brand: boolean;
  naverCategoryCode: boolean;
  originCode: boolean;
  margin: boolean;
}

// 2026-06-03 — 2계층 분리. HARD = 실제 네이버 발행 성공의 최소 조건. 나머지는
// SEO 권장(미충족이어도 발행 자체는 가능하나 첫 발행 전 채움 권장). publishReady는
// 작업5 단정("SEO 채운 뒤 publishReady=true")을 위해 두 계층 모두 요구한다.
const HARD_FIELD_KEYS: ReadonlyArray<keyof FieldChecks> = [
  'main_image_url',
  'detail_image_url',
  'naverCategoryCode',
  'originCode',
  'carrier_code',
  'shipping',
  'optionName',
  'options',
  'hasOptions',
];

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
  // 2026-06-03 — 발행 로직(buildDeliveryInfoFromProduct)이 쓰는 배송 필드.
  // 게이트-발행 로직 정합용. courierCode 는 기본값 'CJGLS' 가 있어 항상 존재.
  courierCode: string | null;
  shippingFee: number | null;
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
  // Representative-thumbnail policy signals (engine §8 hard gate / handoff §3g).
  // OCR text-region count + product count + detected overlays. Optional: when
  // null/undefined the thumbnail gate is skipped (regression 0 for callers that
  // do not yet compute these). The detection is injected by the pipeline.
  thumbnailSignals?: ThumbnailCandidateSignals | null;
}

export interface PublishReadinessResult {
  productId: string;
  status: string;
  naverProductId: string | null;
  fields: FieldChecks;
  fieldsAllSet: boolean;
  // 2026-06-03 — 2계층 진단 (작업4). hardComplete = 발행 필수 최소 조건 충족,
  // seoComplete = SEO 권장 필드 충족. publishReady 는 둘 다 요구(작업5 정합).
  hardComplete: boolean;
  seoComplete: boolean;
  hardFieldsMissing: string[];
  seoFieldsMissing: string[];
  authentic: boolean;
  authenticityViolations: AuthenticityViolation[];
  naverPayload: NaverPayloadChecks;
  naverPayloadComplete: boolean;
  naverPayloadMissing: string[];
  // Representative-thumbnail policy gate (engine §8). thumbnailAssessed=false
  // means no signals were supplied (gate not yet run) — pass defaults true so
  // existing callers are unaffected.
  thumbnailAssessed: boolean;
  thumbnailPass: boolean;
  thumbnailViolations: PolicyViolation[];
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
  // 작업1 — 배송사: 레거시 carrier_code 또는 발행 로직이 쓰는 courierCode 중
  // 하나만 있으면 통과 (필드 매핑 불일치 정정).
  const carrierOk = isNonEmptyString(input.carrier_code) || isNonEmptyString(input.courierCode);

  // 작업2 — 배송 설정: 템플릿이 있거나, 배송사 + 배송비가 설정되어 있으면 통과.
  // shippingFee >= 0 이면 무료배송(0)·유료배송(>0) 모두 발행 가능한 상태.
  const shippingOk =
    isNonEmptyString(input.shipping_template_id) ||
    (carrierOk && typeof input.shippingFee === 'number' && input.shippingFee >= 0);

  // 작업3 — 옵션: 단일 상품(hasOptions !== true)은 옵션 검사 면제. 옵션 상품만
  // optionName/options 실값 요구.
  const hasOpts = input.hasOptions === true;

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
    optionName: hasOpts ? isNonEmptyString(input.optionName) : true,
    options: hasOpts ? isNonEmptyArray(input.options) : true,
    // 옵션 사용 여부 자체는 게이트 대상 아님(단일·옵션 모두 정상). 항상 통과.
    hasOptions: true,
    shipping: shippingOk,
    carrier_code: carrierOk,
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

  // 작업4 — 2계층 진단. HARD = 발행 필수 최소 조건, SEO = 나머지 권장 필드.
  const hardSet = new Set<string>(HARD_FIELD_KEYS as ReadonlyArray<string>);
  const hardFieldsMissing = (Object.entries(fields) as [keyof FieldChecks, boolean][])
    .filter(([k, v]) => hardSet.has(k) && !v)
    .map(([k]) => k);
  const seoFieldsMissing = (Object.entries(fields) as [keyof FieldChecks, boolean][])
    .filter(([k, v]) => !hardSet.has(k) && !v)
    .map(([k]) => k);
  const hardComplete = hardFieldsMissing.length === 0;
  const seoComplete = seoFieldsMissing.length === 0;

  const authenticityViolations = checkAuthenticity(input);
  const authentic = authenticityViolations.length === 0;
  const naverPayload = evaluateNaverPayload(input);
  const naverPayloadMissing = Object.entries(naverPayload)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const naverPayloadComplete = naverPayloadMissing.length === 0;
  // Representative-thumbnail HARD gate (engine §8 / #3-6). Only assessed when the
  // pipeline supplies signals; otherwise pass=true (regression 0). A violation
  // (on-image text / not single product / forbidden overlay) blocks publish.
  const thumbnailAssessed = input.thumbnailSignals != null;
  const thumbnailResult = thumbnailAssessed
    ? evaluateThumbnailPolicy(input.thumbnailSignals as ThumbnailCandidateSignals)
    : null;
  const thumbnailViolations = thumbnailResult?.violations ?? [];
  const thumbnailPass = thumbnailResult ? thumbnailResult.pass : true;
  // publishReady 는 HARD + SEO 모두 요구(= fieldsAllSet). 작업5 단정 정합:
  // SEO 채운 뒤에 비로소 true. hardComplete 는 진단용으로 별도 노출(발행 가능
  // 최소 조건 충족 여부)하되 publishReady 차단 기준은 fieldsAllSet 유지.
  // 썸네일 정책 위반 시 발행 차단(미노출 리스크).
  const publishReady =
    fieldsAllSet &&
    authentic &&
    naverPayloadComplete &&
    thumbnailPass &&
    input.status === 'DRAFT' &&
    input.naverProductId === null;

  return {
    productId: input.productId,
    status: input.status,
    naverProductId: input.naverProductId,
    fields,
    fieldsAllSet,
    hardComplete,
    seoComplete,
    hardFieldsMissing,
    seoFieldsMissing,
    authentic,
    authenticityViolations,
    naverPayload,
    naverPayloadComplete,
    naverPayloadMissing,
    thumbnailAssessed,
    thumbnailPass,
    thumbnailViolations,
    publishReady,
  };
}
