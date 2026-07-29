// src/lib/products/publish-review-gate.ts
// 검수 승인 판정. 공급 가능성은 publish-gate.ts
// ============================================================================
// ADR-0003 (docs/decisions/ADR-0003-publish-review-gate-decisions.md).
//
// "팔아도 되는 상태인가?" — 준비도·이미지경고·운영자 검수승인을 본다.
// "팔 수 있는 물건인가?"(공급처단절·공급사품절)는 별개 파일 `publish-gate.ts`가
// 맡는다. 이름이 비슷하다는 이유로 합치면 판정 축 2개가 뒤섞인다(#300 연장).
//
// 발행 허용 = 공급가능(checkPublishGate) AND 검수승인(decidePublishGate).
// 두 게이트는 AND 결합하되, 셀러에게 보여줄 사유는 분리한다(#316) — 진단도
// 처방도 각각. assertPublishable()이 최종 결합점이다.
//
// PURE (decidePublishGate) — 서버·클라이언트 양쪽에서 같은 규칙(#32).
// assertPublishable은 fail-closed(#82 반대편): 조회 실패는 "통과"가 아니라
// "차단"으로 degrade한다 — 우회 방지가 검수 게이트의 존재 이유(#311)다.
// ============================================================================

import { prisma } from '@/lib/prisma';
import { calcUploadReadiness, type ReadinessInput } from '@/lib/upload-readiness';
import { computeImageGateWarnings } from './image-gate-warnings';
import { checkPublishGate, type PublishGateVerdict as SupplyGateVerdict } from './publish-gate';
import { loadSourceGoneFlags } from './source-gone';

export type PublishReviewBlockReason =
  | 'READINESS_INCOMPLETE'  // calcUploadReadiness < 100
  | 'IMAGE_WARNING'         // blocking image warnings remain (publish-preview logic)
  | 'NOT_REVIEWED'          // 운영자 검수 미승인
  | 'REVIEW_STALE';         // 승인 후 검수대상 필드가 바뀜(#316-A)

export interface ReviewChecklist {
  approved?: boolean;
  approvedAt?: string;
  gateSnapshot?: {
    readiness: number;
    imageWarnings: number;
    fields?: Partial<ReviewWhitelistSnapshot>;
  };
  note?: string;
}

// 검수 신선도 화이트리스트(#316-A) — 검수에서 실제로 보는 필드만. 재고 스냅샷·
// 좀비점수·마진재계산·동기화 타임스탬프·조회수는 여기 없다 — 넣으면 재고
// 폴러가 6시간마다 돌 때마다 승인이 풀려 셀러가 매번 재검수를 강요당하고
// 결국 게이트를 꺼버린다(ADR-0003 결정4). 지킬 수 있는 규칙이라야 지켜진다.
const REVIEW_WHITELIST_FIELDS = [
  'name', 'naverCategoryCode', 'mainImage', 'detailImageUrl', 'salePrice', 'optionsHash',
] as const;

export interface ReviewWhitelistSnapshot {
  name: string | null;
  naverCategoryCode: string | null;
  mainImage: string | null;
  detailImageUrl: string | null;
  salePrice: number | null;
  optionsHash: string | null;
}

export function buildReviewWhitelistSnapshot(input: {
  name: string | null;
  naverCategoryCode: string | null;
  mainImage: string | null;
  detailImageUrl: string | null;
  salePrice: number | null;
  optionNames: unknown;
  optionRows: unknown;
}): ReviewWhitelistSnapshot {
  const hasOptions = input.optionNames != null || input.optionRows != null;
  return {
    name: input.name ?? null,
    naverCategoryCode: input.naverCategoryCode ?? null,
    mainImage: input.mainImage ?? null,
    detailImageUrl: input.detailImageUrl ?? null,
    salePrice: input.salePrice ?? null,
    optionsHash: hasOptions ? JSON.stringify([input.optionNames, input.optionRows]) : null,
  };
}

function snapshotsDiffer(
  approved: Partial<ReviewWhitelistSnapshot> | undefined,
  current: ReviewWhitelistSnapshot,
): boolean {
  if (!approved) return true; // no snapshot recorded at approval time — treat as stale
  return REVIEW_WHITELIST_FIELDS.some((k) => approved[k] !== current[k]);
}

export interface PublishReviewGateInput {
  readinessScore: number; // calcUploadReadiness(...).score, 0-100
  blockingImageWarningCount: number;
  reviewChecklist: ReviewChecklist | null;
  currentSnapshot: ReviewWhitelistSnapshot;
}

export interface PublishReviewGateVerdict {
  approved: boolean;
  reasons: PublishReviewBlockReason[];
}

/** PURE 판정 — 원자만 받는다. I/O 없음(테스트·클라이언트 재사용, #32). */
export function decidePublishGate(input: PublishReviewGateInput): PublishReviewGateVerdict {
  const reasons: PublishReviewBlockReason[] = [];

  if (input.readinessScore < 100) reasons.push('READINESS_INCOMPLETE');
  if (input.blockingImageWarningCount > 0) reasons.push('IMAGE_WARNING');

  const cl = input.reviewChecklist;
  if (!cl?.approved) {
    reasons.push('NOT_REVIEWED');
  } else if (snapshotsDiffer(cl.gateSnapshot?.fields, input.currentSnapshot)) {
    reasons.push('REVIEW_STALE');
  }

  return { approved: reasons.length === 0, reasons };
}

export interface AssertPublishableResult {
  /** 공급가능 AND 검수승인 — 둘 다 통과해야 발행 가능(ADR-0003 결정2). */
  canPublish: boolean;
  review: PublishReviewGateVerdict;
  supply: SupplyGateVerdict;
}

const FAIL_CLOSED_REVIEW: PublishReviewGateVerdict = { approved: false, reasons: ['NOT_REVIEWED'] };

/** loadReviewInputs()가 상품 없음/DB 조회 실패일 때 반환하는 판별 유니온 태그. */
export interface ReviewInputsUnavailable {
  ok: false;
}

export interface ReviewInputsLoaded {
  ok: true;
  readinessScore: number;
  blockingImageWarningCount: number;
  currentSnapshot: ReviewWhitelistSnapshot;
  reviewChecklist: ReviewChecklist | null;
}

/**
 * assertPublishable(등록 게이트)과 review-approve(승인 엔드포인트) 양쪽이
 * 공유하는 계산 — 두 곳이 각자 재구현하면 판정이 갈라질 위험(#62). I/O 포함
 * (product 조회 + 이미지 OCR/품질), PURE 아님. 실패 시 { ok:false }만 반환하고
 * fail-closed 여부 판단은 호출부 책임(등록 게이트는 차단, 승인 엔드포인트는
 * 에러 응답 — 같은 "모르면" 신호라도 문맥에 따라 다른 응답이 맞다).
 */
export async function loadReviewInputs(
  productId: string,
): Promise<ReviewInputsLoaded | ReviewInputsUnavailable> {
  let product;
  try {
    product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        name: true,
        naverCategoryCode: true,
        mainImage: true,
        detail_image_url: true,
        salePrice: true,
        supplierPrice: true,
        shippingFee: true,
        keywords: true,
        tags: true,
        images: true,
        shipping_template_id: true,
        reviewChecklist: true,
        reviewLastUpdated: true,
        product_options: { select: { option_names: true, option_rows: true } },
      },
    });
  } catch {
    // pre-migration window (review_checklist/review_last_updated columns not
    // yet applied) or transient DB issue — caller decides fail-open/closed.
    return { ok: false };
  }
  if (!product) return { ok: false };

  const readinessInput: ReadinessInput = {
    naverCategoryCode: product.naverCategoryCode,
    keywords: Array.isArray(product.keywords) ? (product.keywords as string[]) : [],
    tags: Array.isArray(product.tags) ? (product.tags as string[]) : [],
    name: product.name,
    mainImage: product.mainImage,
    images: Array.isArray(product.images) ? product.images : [],
    shippingTemplateId: product.shipping_template_id ?? undefined,
    salePrice: product.salePrice,
    supplierPrice: product.supplierPrice,
    shippingFee: product.shippingFee ?? 3000,
  };
  const readiness = calcUploadReadiness(readinessInput);

  const imageGate = await computeImageGateWarnings(productId);
  const blockingImageWarningCount = imageGate?.blockingImageWarnings.length ?? 1; // no data → treat as unresolved warning (fail-closed)

  const currentSnapshot = buildReviewWhitelistSnapshot({
    name: product.name,
    naverCategoryCode: product.naverCategoryCode,
    mainImage: product.mainImage,
    detailImageUrl: product.detail_image_url,
    salePrice: product.salePrice,
    optionNames: product.product_options?.option_names ?? null,
    optionRows: product.product_options?.option_rows ?? null,
  });

  return {
    ok: true,
    readinessScore: readiness.score,
    blockingImageWarningCount,
    currentSnapshot,
    reviewChecklist: (product.reviewChecklist as ReviewChecklist | null) ?? null,
  };
}

/**
 * 서버 진입점(P0~P3)이 발행 직전에 호출하는 강제 게이트(#311). throw 아님 —
 * 구조적 반환. DB 조회 실패(마이그레이션 전 P2021/P2022 포함)는 fail-closed로
 * degrade한다 — 게이트는 "모르면 통과"가 아니라 "모르면 차단"이어야 우회가
 * 안 생긴다(권고 판정의 fail-open과 반대, #82).
 */
export async function assertPublishable(productId: string): Promise<AssertPublishableResult> {
  const inputs = await loadReviewInputs(productId);
  if (!inputs.ok) {
    return { canPublish: false, review: FAIL_CLOSED_REVIEW, supply: { blocked: false, reason: null } };
  }

  const review = decidePublishGate({
    readinessScore: inputs.readinessScore,
    blockingImageWarningCount: inputs.blockingImageWarningCount,
    reviewChecklist: inputs.reviewChecklist,
    currentSnapshot: inputs.currentSnapshot,
  });

  // ── 공급 가능성 판정(기존, publish-gate.ts) ─────────────────────────────
  let supply: SupplyGateVerdict = { blocked: false, reason: null };
  try {
    const [sourceGoneMap, snapshot] = await Promise.all([
      loadSourceGoneFlags([productId]),
      prisma.inventorySnapshot.findFirst({
        where: { productId },
        orderBy: { polledAt: 'desc' },
        select: { qty: true, status: true },
      }),
    ]);
    supply = checkPublishGate({
      sourceGone: sourceGoneMap.get(productId) ?? false,
      qty: snapshot?.qty ?? null,
      supplierStatus: snapshot?.status ?? null,
    });
  } catch {
    // no inventory data yet (new product, not polled) — checkPublishGate(undefined)
    // already treats "no signal" as pass (see publish-gate.ts comment); mirror that.
    supply = { blocked: false, reason: null };
  }

  return { canPublish: review.approved && !supply.blocked, review, supply };
}
