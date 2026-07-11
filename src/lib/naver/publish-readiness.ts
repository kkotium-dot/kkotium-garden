// src/lib/naver/publish-readiness.ts
// ============================================================================
// Publish-readiness SURFACE layer (spec: PUBLISH_READINESS_SURFACE_SPEC_2026-07-10,
// 원칙 #240). validateForRegistration (product-builder.ts) is the single GO-gate
// authority: it decides — via 8 HARD BLOCK checks — whether a product can be
// registered. But it only returns opaque error STRINGS, surfaced solely when a
// publish is attempted. Operators therefore cannot see, ahead of time, which
// requirements pass and which block.
//
// getPublishReadiness turns the SAME 8 checks into a STRUCTURED, per-item verdict
// (pass / fail / na + a "fix it" link) that the app can render as a checklist and
// aggregate on the control tower — so the operator judges publishability inside
// the app instead of relying on an external analysis.
//
// GATE INVARIANT (#46): the go/no-go decision is NOT re-derived here. `ready` is
// taken verbatim from validateForRegistration(...).canRegister. The per-check
// statuses are a faithful mirror of the same sub-logic (they must never diverge
// from the gate); if they ever did, `ready` still wins. This module reads only —
// no mutation, no Naver call. Labels/messages are English (stable, self-
// describing per #240 "자립 사용"); the Korean UI layer maps by `key`.
// ============================================================================

import {
  validateForRegistration,
  evaluateOriginTruth,
  type LocalProduct,
} from './product-builder';
import {
  classifyUnitPricePolicy,
  validateUnitPriceFields,
  type UnitPriceFields,
} from './unit-price-policy';
import { calcUploadReadiness, type ReadinessInput } from '../upload-readiness';

export type CheckStatus = 'pass' | 'fail' | 'na';

// Stable keys — the 8 HARD BLOCK checks of validateForRegistration, in
// operator-workflow order. The UI maps these to Korean labels/messages.
export type CheckKey =
  | 'name'
  | 'category'
  | 'mainImage'
  | 'salePrice'
  | 'address'
  | 'readiness'
  | 'unitPrice'
  | 'origin';

export interface ReadinessCheck {
  key: CheckKey;
  /** English label (stable, self-describing). UI prefers ko.json by key. */
  label: string;
  status: CheckStatus;
  /** English one-liner — the gate reason (fail) or a short confirmation. */
  message: string;
  /** Deep-link to the screen where the operator fixes this item. */
  fixHref: string;
  /** Non-translated dynamic value (code / score) — safe to show verbatim. */
  detail?: string;
  /** Optional ko.json sub-message selector (e.g. 'failMismatch') so a check can
   *  surface a specific reason variant instead of the generic pass/fail text. */
  messageKey?: string;
}

export interface PublishReadiness {
  /** GO-gate verdict — verbatim validateForRegistration(...).canRegister (#46). */
  ready: boolean;
  /** Checks that are pass OR na (na = 통과 취급, spec §2-A). */
  passed: number;
  /** Always the full check count (spec badge "발행 준비 X/8"). */
  total: number;
  checks: ReadinessCheck[];
  /** Live on Naver (naverProductId present). #240 강화 — 등록상태 한 줄. */
  naverRegistered: boolean;
  /** Cached Naver statusType (SALE / SUSPENSION / OUTOFSTOCK / ...), null when
   *  not registered or not yet synced. UI maps to a 미등록/판매중/판매중지 label. */
  naverStatusType: string | null;
}

/** Naver registration state for a product (from the DB, not re-fetched). */
export interface NaverRegistrationInfo {
  registered: boolean;
  statusType: string | null;
}

/**
 * Structured, per-item publish readiness for one product. Reuses the exact
 * validateForRegistration sub-logic so the checklist can never contradict the
 * gate; `ready` is the gate's own canRegister.
 *
 * @param hasShippingTemplate mirrors the register/update path (drives readiness).
 * @param hasAddresses        Naver release/return address ids synced (check #5).
 * @param naver               Naver registration state (registered + cached
 *                            statusType) — surfaced as the 등록상태 line (#240).
 *                            Defaults to not-registered when omitted.
 */
export function getPublishReadiness(
  product: LocalProduct,
  hasShippingTemplate: boolean,
  hasAddresses: boolean,
  naver?: NaverRegistrationInfo,
): PublishReadiness {
  // Authoritative gate — the single source of truth for the GO decision.
  const gate = validateForRegistration(product, hasShippingTemplate, hasAddresses);

  const editHref = `/products/${product.id}/edit`;
  const settingsHref = '/settings';

  const checks: ReadinessCheck[] = [];

  // 1 — product name (min 5 chars)
  {
    const ok = !!product.name && product.name.trim().length >= 5;
    checks.push({
      key: 'name',
      label: 'Product name',
      status: ok ? 'pass' : 'fail',
      message: ok ? 'Product name is set' : 'Product name is required (min 5 chars)',
      fixHref: editHref,
    });
  }

  // 2 — Naver leaf category (8-digit numeric code)
  const naverCat = (product.naverCategoryCode ?? '').trim();
  {
    const ok = /^\d{6,10}$/.test(naverCat);
    checks.push({
      key: 'category',
      label: 'Naver category',
      status: ok ? 'pass' : 'fail',
      message: ok
        ? 'Valid Naver leaf category code'
        : 'Valid Naver leaf category code required (8-digit numeric)',
      fixHref: editHref,
      detail: naverCat || undefined,
    });
  }

  // 3 — representative image
  {
    const ok = !!product.mainImage;
    checks.push({
      key: 'mainImage',
      label: 'Representative image',
      status: ok ? 'pass' : 'fail',
      message: ok ? 'Representative image is set' : 'Representative image is required',
      fixHref: editHref,
    });
  }

  // 4 — sale price
  {
    const ok = product.salePrice > 0;
    checks.push({
      key: 'salePrice',
      label: 'Sale price',
      status: ok ? 'pass' : 'fail',
      message: ok ? 'Sale price is set' : 'Sale price must be greater than 0',
      fixHref: editHref,
      detail: product.salePrice > 0 ? String(product.salePrice) : undefined,
    });
  }

  // 5 — Naver address ids synced (store-level, not per-product)
  {
    checks.push({
      key: 'address',
      label: 'Address sync',
      status: hasAddresses ? 'pass' : 'fail',
      message: hasAddresses
        ? 'Naver release/return addresses synced'
        : 'Naver address IDs not synced (run addressbook sync first)',
      fixHref: settingsHref,
    });
  }

  // 6 — upload readiness (only grade D blocks; C is a warning, not a gate error)
  {
    const readinessInput: ReadinessInput = {
      naverCategoryCode: naverCat || product.category || undefined,
      keywords: Array.isArray(product.keywords) ? (product.keywords as string[]) : [],
      tags: Array.isArray(product.tags) ? (product.tags as string[]) : [],
      name: product.name,
      mainImage: product.mainImage,
      images: Array.isArray(product.additionalImages) ? (product.additionalImages as string[]) : [],
      shippingTemplateId: hasShippingTemplate ? 'yes' : undefined,
      salePrice: product.salePrice,
      supplierPrice: product.supplierPrice,
      shippingFee: product.shippingFee ?? 3000,
    };
    const readiness = calcUploadReadiness(readinessInput);
    const ok = readiness.grade !== 'D';
    checks.push({
      key: 'readiness',
      label: 'Upload readiness',
      status: ok ? 'pass' : 'fail',
      message: ok
        ? `Upload readiness ${readiness.score}% (${readiness.grade})`
        : `Upload readiness too low: ${readiness.score}% (${readiness.grade}) — ${readiness.failed
            .map((f) => f.label)
            .join(', ')}`,
      fixHref: editHref,
      detail: `${readiness.score}% (${readiness.grade})`,
    });
  }

  // 7 — unit price (§4-A). Non-target category → na (통과 취급, gray).
  {
    const policy = classifyUnitPricePolicy(naverCat);
    if (policy.eligibility === 'mandatory') {
      const fields: UnitPriceFields = {
        unitPriceYn: product.unit_price_yn === true,
        unitTotalCapacity: product.unit_total_capacity ?? null,
        unitCapacity: product.unit_capacity ?? null,
        unitIndicationUnit: product.unit_indication_unit ?? null,
      };
      const verdict = validateUnitPriceFields(policy, fields);
      const ok = verdict.errors.length === 0;
      checks.push({
        key: 'unitPrice',
        label: 'Unit price',
        status: ok ? 'pass' : 'fail',
        message: ok ? 'Unit price fields complete' : verdict.errors[0],
        fixHref: editHref,
        detail: `${policy.d1}${policy.d2 ? ' > ' + policy.d2 : ''}`.trim() || undefined,
      });
    } else {
      // optional / unknown — not a target category, never blocks (na).
      checks.push({
        key: 'unitPrice',
        label: 'Unit price',
        status: 'na',
        message: 'Not a unit-price target category',
        fixHref: editHref,
      });
    }
  }

  // 8 — origin truth (#95 / #242). block(missing/invalid) = fail; mismatch
  // (code<->naver_origin label contradiction) = fail with a distinct reason;
  // heal/pass = pass (heal only warns).
  {
    const origin = evaluateOriginTruth(product.originCode, product.naver_origin);
    const isMismatch = origin.state === 'mismatch';
    const ok = origin.state === 'pass' || origin.state === 'heal';
    checks.push({
      key: 'origin',
      label: 'Origin',
      status: ok ? 'pass' : 'fail',
      message: ok
        ? 'Origin is set'
        : origin.message ?? 'Origin code is required',
      fixHref: editHref,
      // On a mismatch show "code ↔ label" so the operator sees the contradiction;
      // otherwise show the resolved code.
      detail: isMismatch
        ? `${origin.code ?? product.originCode ?? '?'} ↔ ${(product.naver_origin ?? '').trim()}`
        : origin.code ?? undefined,
      ...(isMismatch ? { messageKey: 'failMismatch' } : {}),
    });
  }

  const passed = checks.filter((c) => c.status === 'pass' || c.status === 'na').length;

  const naverRegistered = naver?.registered ?? false;
  return {
    ready: gate.canRegister,
    passed,
    total: checks.length,
    checks,
    naverRegistered,
    naverStatusType: naverRegistered ? (naver?.statusType ?? null) : null,
  };
}

// Convenience aggregate over many products — drives the control-tower summary
// ("발행 대기 N · 준비완료 M"). registered products are excluded from both counts.
export interface ReadinessAggregate {
  /** Ready to publish now (canRegister, not yet registered). */
  ready: number;
  /** Still being prepared (has blocking checks, not yet registered). */
  blocked: number;
}

export function aggregateReadiness(
  items: Array<{ registered: boolean; ready: boolean }>,
): ReadinessAggregate {
  let ready = 0;
  let blocked = 0;
  for (const it of items) {
    if (it.registered) continue;
    if (it.ready) ready += 1;
    else blocked += 1;
  }
  return { ready, blocked };
}
