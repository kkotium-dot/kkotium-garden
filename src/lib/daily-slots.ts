// src/lib/daily-slots.ts
// Daily upload slot system — Kkotti AI + honey score integration
// Slot A: Kkotti recommended (2-3 items, score >= 70)
// Slot B: User-picked (1-2 items, Kkotti gate check required)
// Slot C: Reactivation candidates (1-2 items)
// A-9: Enhanced with selling mode priorities — SEO improvement, price adjustment, stock alert

import { calcHoneyScore, type HoneyScoreInput } from '@/lib/honey-score';

export const DAILY_SLOT_CONFIG = {
  A: { min: 2, max: 3, minScore: 70,  label: '꼬띠 추천',     color: 'purple' },
  B: { min: 1, max: 2, minScore: 50,  label: '직접 선택',     color: 'blue'   },
  C: { min: 1, max: 2, minScore: 0,   label: '재활성화 후보', color: 'orange' },
} as const;

export type SlotType = keyof typeof DAILY_SLOT_CONFIG;

export type ReactivationReason =
  | 'out_of_stock'
  | 'long_inactive'
  | 'score_drop'
  | 'draft_incomplete';

export interface DailySlotProduct {
  id: string;
  name: string;
  sku: string;
  status: string;
  salePrice: number;
  supplierPrice: number;
  naverCategoryCode?: string;
  keywords?: string[];
  tags?: string[];
  mainImage?: string;
  aiScore?: number;
  createdAt?: Date;
  updatedAt?: Date;
  lastSaleDate?: Date;
  supplierId?: string;
  supplierName?: string;
  // A-9: selling mode fields
  seoScore?: number;       // last computed SEO score
  naverProductId?: string; // set if live on Naver
}

export interface SlotItem {
  slot: SlotType;
  product: DailySlotProduct;
  honeyScore: ReturnType<typeof calcHoneyScore>;
  reactivationReason?: ReactivationReason;
  reactivationLabel?: string;
  kkottiGate?: {
    passed: boolean;
    blockers: string[];
    suggestions: string[];
  };
}

export interface DailyPlan {
  date: string;
  slotA: SlotItem[];
  slotB: SlotItem[];
  slotC: SlotItem[];
  totalCount: number;
  readyCount: number;
  seasonContext?: { label: string; daysLeft: number };
  // A-9: selling mode priority tasks
  sellingModeTasks?: SellingModeTask[];
}

// A-9: Selling mode task — actionable items when products are live on Naver
export type SellingModeTaskType =
  | 'seo_improvement'    // SEO score < 60, needs improvement
  | 'price_adjustment'   // 7+ days no sales on Naver
  | 'stock_warning';     // stock is low or out

export interface SellingModeTask {
  type: SellingModeTaskType;
  productId: string;
  productName: string;
  detail: string;
  priority: 'high' | 'medium' | 'low';
}

// ── A-9: Derive selling mode tasks from live products ─────────────────────────
export function buildSellingModeTasks(products: DailySlotProduct[]): SellingModeTask[] {
  const tasks: SellingModeTask[] = [];
  const now = Date.now();

  for (const p of products) {
    // Only for products live on Naver
    if (p.status !== 'ACTIVE' || !p.naverProductId) continue;

    // SEO improvement: score < 60
    if (p.seoScore !== undefined && p.seoScore < 60) {
      tasks.push({
        type: 'seo_improvement',
        productId: p.id,
        productName: p.name,
        detail: `SEO ${p.seoScore}점 — 검색 조련사에서 키워드/속성 보완 권장`,
        priority: p.seoScore < 30 ? 'high' : 'medium',
      });
    }

    // Price adjustment: 7+ days no sales
    if (p.lastSaleDate) {
      const daysSince = Math.floor((now - new Date(p.lastSaleDate).getTime()) / 86_400_000);
      if (daysSince >= 7) {
        tasks.push({
          type: 'price_adjustment',
          productId: p.id,
          productName: p.name,
          detail: `${daysSince}일째 판매 없음 — 가격 조정 또는 이미지 교체 검토`,
          priority: daysSince >= 14 ? 'high' : 'low',
        });
      }
    } else if (p.createdAt) {
      // Never sold, check if active 7+ days
      const daysActive = Math.floor((now - new Date(p.createdAt).getTime()) / 86_400_000);
      if (daysActive >= 7) {
        tasks.push({
          type: 'price_adjustment',
          productId: p.id,
          productName: p.name,
          detail: `등록 ${daysActive}일 경과, 판매 0건 — 가격/키워드 재검토 필요`,
          priority: daysActive >= 21 ? 'high' : 'medium',
        });
      }
    }
  }

  // Sort by priority: high > medium > low
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 5);
}

// ── Reactivation reason detector ─────────────────────────────────────────────
export function getReactivationReason(
  product: DailySlotProduct
): { reason: ReactivationReason; label: string } | null {
  const now = Date.now();

  if (product.status === 'OUT_OF_STOCK') {
    return { reason: 'out_of_stock', label: '품절 상품 — 대체상품 등록 후 재등록 권장' };
  }

  if (product.lastSaleDate) {
    const daysSince = Math.floor((now - new Date(product.lastSaleDate).getTime()) / 86_400_000);
    if (daysSince >= 30) {
      return { reason: 'long_inactive', label: `${daysSince}일째 판매 없음 — 전환 튜닝 필요` };
    }
  }

  if (product.createdAt && !product.lastSaleDate) {
    const daysSinceCreated = Math.floor((now - new Date(product.createdAt).getTime()) / 86_400_000);
    if (daysSinceCreated >= 30 && product.status === 'ACTIVE') {
      return { reason: 'long_inactive', label: `등록 ${daysSinceCreated}일 경과, 판매 0건 — 좀비 상품 감지` };
    }
  }

  if (product.status === 'DRAFT') {
    return { reason: 'draft_incomplete', label: '등록 미완료 상품 — 네이버 업로드 대기 중' };
  }

  if (product.aiScore !== null && product.aiScore !== undefined) {
    const currentScore = calcHoneyScore({
      salePrice: product.salePrice,
      supplierPrice: product.supplierPrice,
      categoryId: product.naverCategoryCode ?? '',
      productName: product.name,
      keywords: product.keywords ?? [],
      tags: product.tags ?? [],
      hasMainImage: !!product.mainImage,
    }).total;
    const drop = (product.aiScore) - currentScore;
    if (drop >= 20) {
      return { reason: 'score_drop', label: `꿀통지수 ${drop}점 하락 — SEO 리셋 필요` };
    }
  }

  return null;
}

// ── Kkotti gate ───────────────────────────────────────────────────────────────
export function kkottiGateCheck(score: ReturnType<typeof calcHoneyScore>): {
  passed: boolean;
  blockers: string[];
  suggestions: string[];
} {
  const blockers: string[] = [];
  const suggestions: string[] = [];

  if (score.total < DAILY_SLOT_CONFIG.B.minScore) {
    blockers.push(`꿀통지수 ${score.total}점 — B슬롯 기준 50점 미달`);
  }
  if (score.netMarginRate < 20) {
    blockers.push(`순마진 ${score.netMarginRate.toFixed(1)}% — 20% 미달은 손해 위험`);
  }
  if (!score.warnings.some(w => w.includes('카테고리'))) {
    // category is set, good
  } else {
    blockers.push('카테고리 미선택 — 네이버 노출 불가');
  }

  score.warnings.forEach(w => suggestions.push(w));
  return { passed: blockers.length === 0, blockers, suggestions };
}

// ── Early-stage mode ──────────────────────────────────────────────────────────
export function buildEarlyStageSlotA(products: DailySlotProduct[]): SlotItem[] {
  const ranked = products
    .filter(p => p.status === 'DRAFT' && p.salePrice > 0 && p.supplierPrice > 0)
    .map(p => {
      const score = calcHoneyScore({
        salePrice:     p.salePrice,
        supplierPrice: p.supplierPrice,
        categoryId:    p.naverCategoryCode ?? '',
        productName:   p.name,
        keywords:      p.keywords ?? [],
        tags:          p.tags ?? [],
        hasMainImage:  !!p.mainImage,
      });
      const readinessBonus =
        (p.mainImage ? 30 : 0) +
        (p.naverCategoryCode && p.naverCategoryCode !== '50003307' ? 25 : 0) +
        ((p.keywords?.length ?? 0) >= 3 ? 20 : (p.keywords?.length ?? 0) > 0 ? 10 : 0) +
        ((p.tags?.length ?? 0) >= 3 ? 15 : 0);
      return { product: p, honeyScore: score, readinessBonus, combined: score.total + readinessBonus };
    })
    .sort((a, b) => b.combined - a.combined)
    .slice(0, DAILY_SLOT_CONFIG.A.max);

  return ranked.map(({ product, honeyScore }) => ({
    slot: 'A' as SlotType,
    product,
    honeyScore,
    reactivationReason: 'draft_incomplete' as ReactivationReason,
    reactivationLabel: '등록 대기 중 — 업로드 후 첫 판매를 시작하세요',
  }));
}

// ── Build daily plan ──────────────────────────────────────────────────────────
export function buildDailyPlan(
  products: DailySlotProduct[],
  seasonContext?: DailyPlan['seasonContext']
): DailyPlan {
  const activeCount = products.filter(p => p.status === 'ACTIVE').length;
  const isEarlyStage = activeCount === 0;

  const scored = products.map(p => ({
    product: p,
    honeyScore: calcHoneyScore({
      salePrice:     p.salePrice,
      supplierPrice: p.supplierPrice,
      categoryId:    p.naverCategoryCode ?? '',
      productName:   p.name,
      keywords:      p.keywords ?? [],
      tags:          p.tags ?? [],
      hasMainImage:  !!p.mainImage,
    }),
  }));

  const slotCCandidates = scored
    .map(({ product, honeyScore }) => {
      const reason = getReactivationReason(product);
      if (!reason) return null;
      return { slot: 'C' as SlotType, product, honeyScore, reactivationReason: reason.reason, reactivationLabel: reason.label };
    })
    .filter(Boolean) as SlotItem[];

  const slotC = slotCCandidates
    .sort((a, b) => b.honeyScore.total - a.honeyScore.total)
    .slice(0, DAILY_SLOT_CONFIG.C.max);

  const usedIds = new Set(slotC.map(i => i.product.id));

  let slotA: SlotItem[];
  if (isEarlyStage) {
    slotA = buildEarlyStageSlotA(products.filter(p => !usedIds.has(p.id)));
  } else {
    const slotACandidates = scored
      .filter(({ product, honeyScore }) =>
        !usedIds.has(product.id) &&
        product.status === 'ACTIVE' &&
        honeyScore.total >= DAILY_SLOT_CONFIG.A.minScore
      )
      .sort((a, b) => {
        if (seasonContext) {
          const aMatch = a.product.name.includes(seasonContext.label);
          const bMatch = b.product.name.includes(seasonContext.label);
          if (aMatch && !bMatch) return -1;
          if (!aMatch && bMatch) return 1;
        }
        return b.honeyScore.total - a.honeyScore.total;
      })
      .slice(0, DAILY_SLOT_CONFIG.A.max);
    slotA = slotACandidates.map(({ product, honeyScore }) => ({
      slot: 'A' as SlotType, product, honeyScore,
    }));
  }

  const usedIds2 = new Set([...slotA.map(i => i.product.id), ...slotC.map(i => i.product.id)]);
  const slotBCandidates = scored
    .filter(({ product, honeyScore }) =>
      !usedIds2.has(product.id) &&
      honeyScore.total >= DAILY_SLOT_CONFIG.B.minScore
    )
    .sort((a, b) => b.honeyScore.total - a.honeyScore.total)
    .slice(0, DAILY_SLOT_CONFIG.B.max);

  const slotB: SlotItem[] = slotBCandidates.map(({ product, honeyScore }) => ({
    slot: 'B', product, honeyScore, kkottiGate: kkottiGateCheck(honeyScore),
  }));

  const allItems = [...slotA, ...slotB, ...slotC];

  // A-9: Build selling mode tasks for live products
  const sellingModeTasks = buildSellingModeTasks(products);

  return {
    date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }),
    slotA,
    slotB,
    slotC,
    totalCount: allItems.length,
    readyCount: [...slotA, ...slotB.filter(i => i.kkottiGate?.passed)].length,
    seasonContext,
    sellingModeTasks: sellingModeTasks.length > 0 ? sellingModeTasks : undefined,
  };
}
