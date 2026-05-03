'use client';
// DailyPlanWidget — "오늘 할 일" Slot A/B/C
// Early-stage mode: shows DRAFT products with action buttons when no ACTIVE products exist
// Normal mode: Kkotti recommended / user-picked / reactivation candidates
//
// Option D (2026-05-03): migrated self-fetch path to useProductsList() shared SWR hook.
// - Conditional fetching: parent-provided products bypass SWR entirely (key=null)
// - 60s polling + revalidateOnFocus when running in standalone mode

import { useMemo } from 'react';
import {
  Sparkles, User, RefreshCw, CheckCircle,
  XCircle, AlertTriangle, ChevronRight, ExternalLink,
  Tag, LayoutGrid, Download, Search, Rocket,
} from 'lucide-react';
import { buildDailyPlan, DAILY_SLOT_CONFIG, type DailyPlan, type SlotItem } from '@/lib/daily-slots';
import { getSeasonContext } from '@/lib/discord';
import { useProductsList } from '@/lib/hooks/useDashboardData';
import type { DashboardProduct } from '@/app/dashboard/page';

const GRADE_STYLE: Record<string, { bg: string; text: string }> = {
  S: { bg: '#f3e8ff', text: '#7e22ce' },
  A: { bg: '#dcfce7', text: '#15803d' },
  B: { bg: '#dbeafe', text: '#1d4ed8' },
  C: { bg: '#fef9c3', text: '#a16207' },
  D: { bg: '#fee2e2', text: '#b91c1c' },
};

const SLOT_META = {
  A: {
    Icon: Sparkles,
    label: '꼬띠 추천',
    hint: '꿀통지수 70점↑ 자동 선별',
    accentColor: '#e62310',
    accentBg: '#FFF0F5',
    borderColor: '#FFB3CE',
  },
  B: {
    Icon: User,
    label: '직접 선택',
    hint: '꼬띠 게이트 통과 필요',
    accentColor: '#2563eb',
    accentBg: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  C: {
    Icon: AlertTriangle,
    label: '재활성화',
    hint: '품절 · 장기미노출 · 점수급락',
    accentColor: '#ea580c',
    accentBg: '#fff7ed',
    borderColor: '#fed7aa',
  },
} as const;

// Determine the best action button for a DRAFT product based on what's missing
function getDraftAction(item: SlotItem): { label: string; href: string; Icon: React.ElementType; color: string } {
  const p = item.product;
  const hasCategory = p.naverCategoryCode && p.naverCategoryCode !== '50003307';
  const hasKeywords  = (p.keywords?.length ?? 0) >= 3;
  const hasTags      = (p.tags?.length ?? 0) >= 1;
  const hasImage     = !!p.mainImage;

  // Priority: category > keywords/SEO > tags > excel download
  if (!hasCategory) {
    return { label: '카테고리 설정', href: `/products/new?edit=${p.id}`, Icon: LayoutGrid, color: '#7c3aed' };
  }
  if (!hasKeywords || !hasTags) {
    return { label: 'SEO 최적화', href: `/naver-seo?product=${p.id}`, Icon: Search, color: '#0891b2' };
  }
  if (!hasImage) {
    return { label: '이미지 추가', href: `/products/new?edit=${p.id}`, Icon: Tag, color: '#ea580c' };
  }
  // All good — ready for export
  return { label: '엑셀 다운로드', href: `/products?export=${p.id}`, Icon: Download, color: '#16a34a' };
}

// Onboarding guide card shown only in early-stage mode
function OnboardingGuide() {
  const steps = [
    { num: 1, label: '상품 크롤링',     hint: '꿀통 사냥터에서 도매꾹 상품 수집',     href: '/crawl',    done: false },
    { num: 2, label: 'SEO 최적화',      hint: '검색 조련사에서 AI 상품명·태그 생성',  href: '/naver-seo', done: false },
    { num: 3, label: '네이버 엑셀 등록', hint: '정원 창고 → 엑셀 다운로드 → 스마트스토어 업로드', href: '/products', done: false },
    { num: 4, label: '첫 판매 달성',    hint: '판매 시작 후 데이터 기반 운영 모드 전환', href: '/dashboard', done: false },
  ];

  return (
    <div style={{
      margin: '0 0 14px',
      padding: '14px 16px',
      borderRadius: 12,
      background: 'linear-gradient(135deg, #FFF0F5 0%, #f0f9ff 100%)',
      border: '1.5px solid #FFB3CE',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Rocket size={13} style={{ color: '#e62310' }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: '#1A1A1A' }}>첫 판매까지 4단계</span>
        <span style={{
          fontSize: 10, padding: '2px 7px', borderRadius: 99,
          background: '#e62310', color: '#fff', fontWeight: 700,
        }}>
          초기 운영 모드
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {steps.map((step) => (
          <a
            key={step.num}
            href={step.href}
            style={{
              flex: 1, textDecoration: 'none',
              padding: '8px 6px', borderRadius: 8, textAlign: 'center',
              background: step.done ? '#dcfce7' : '#fff',
              border: `1px solid ${step.done ? '#86efac' : '#F8DCE5'}`,
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: '50%', margin: '0 auto 4px',
              background: step.done ? '#16a34a' : '#e62310',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 10, fontWeight: 900, color: '#fff' }}>{step.num}</span>
            </div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#1A1A1A', margin: '0 0 2px', lineHeight: 1.2 }}>
              {step.label}
            </p>
            <p style={{ fontSize: 9, color: '#B0A0A8', margin: 0, lineHeight: 1.3 }}>
              {step.hint}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}

function SlotCard({ item, isEarlyStage }: { item: SlotItem; isEarlyStage: boolean }) {
  const { product, honeyScore, kkottiGate, reactivationLabel } = item;
  const passed = item.slot === 'A' ? true : (kkottiGate?.passed ?? true);
  const gs = GRADE_STYLE[honeyScore.grade] ?? GRADE_STYLE['D'];

  // In early-stage mode, slot A shows DRAFT products with action buttons
  const draftAction = (isEarlyStage && item.slot === 'A') ? getDraftAction(item) : null;
  const { Icon: ActionIcon, label: actionLabel, href: actionHref, color: actionColor } = draftAction ?? {};

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 12px', borderRadius: 10,
      background: passed ? '#fff' : '#fef2f2',
      border: `1px solid ${passed ? '#F8DCE5' : '#fecaca'}`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <p style={{
            fontSize: 12, fontWeight: 700, color: '#1A1A1A', margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180,
          }}>
            {product.name}
          </p>
          <span style={{
            fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 99,
            background: gs.bg, color: gs.text, flexShrink: 0,
          }}>
            {honeyScore.total}점 {honeyScore.grade}
          </span>
        </div>

        {/* Reactivation / draft label */}
        {reactivationLabel && (
          <p style={{ fontSize: 11, color: '#ea580c', margin: '2px 0 0', fontWeight: 600 }}>
            {reactivationLabel}
          </p>
        )}

        {/* Kkotti gate blockers */}
        {!passed && kkottiGate?.blockers.map((b, i) => (
          <p key={i} style={{ fontSize: 11, color: '#dc2626', margin: '2px 0 0' }}>{b}</p>
        ))}

        {/* Suggestions (normal mode) */}
        {passed && !draftAction && kkottiGate?.suggestions.slice(0, 1).map((s, i) => (
          <p key={i} style={{
            fontSize: 11, color: '#B0A0A8', margin: '2px 0 0',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {s}
          </p>
        ))}

        {/* Dynamic action button for DRAFT in early-stage mode */}
        {draftAction && ActionIcon && (
          <a
            href={actionHref}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginTop: 5, padding: '3px 8px', borderRadius: 6,
              background: actionColor + '15',
              border: `1px solid ${actionColor}40`,
              textDecoration: 'none', cursor: 'pointer',
            }}
          >
            <ActionIcon size={10} style={{ color: actionColor }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: actionColor }}>{actionLabel}</span>
          </a>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {passed
          ? <CheckCircle size={14} style={{ color: '#16a34a' }} />
          : <XCircle size={14} style={{ color: '#dc2626' }} />
        }
        <a href={draftAction?.href ?? '/products/new'} style={{ color: '#FFB3CE' }}>
          <ChevronRight size={14} />
        </a>
      </div>
    </div>
  );
}

interface DailyPlanWidgetProps {
  products?: DashboardProduct[];
  productsLoading?: boolean;
}

// Normalize a raw API product object into the DashboardProduct shape used by buildDailyPlan.
// Kept identical to the legacy v9 inline normalizer to avoid behavioral drift.
function normalizeRawProduct(p: any): DashboardProduct {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    status: p.status,
    salePrice: p.salePrice ?? 0,
    supplierPrice: p.supplierPrice ?? 0,
    naverCategoryCode: p.naverCategoryCode ?? p.category_id ?? '',
    keywords:  Array.isArray(p.keywords) ? p.keywords : [],
    tags:      Array.isArray(p.tags) ? p.tags : [],
    mainImage: p.mainImage ?? p.main_image_url,
    aiScore:   p.aiScore ?? null,
    lastSaleDate: p.lastSaleDate ? new Date(p.lastSaleDate) : undefined,
    createdAt:    p.createdAt ? new Date(p.createdAt) : undefined,
    updatedAt:    p.updatedAt ? new Date(p.updatedAt) : new Date(),
    supplierName: p.supplier?.name ?? p.supplierName,
  };
}

export default function DailyPlanWidget({ products: propProducts, productsLoading: propLoading }: DailyPlanWidgetProps = {}) {
  // Conditional SWR fetch: when parent passes products via props, skip the network call entirely.
  // This preserves the legacy "if propProducts is defined, do not fetch" guard.
  const usingProps = propProducts !== undefined;
  const { rawProducts, isLoading: swrLoading, refresh } = useProductsList({ enabled: !usingProps });

  // Resolve the actual product list to use (parent-provided takes precedence).
  // Memoized so buildDailyPlan only re-runs when the underlying source array changes.
  const products: DashboardProduct[] | null = useMemo(() => {
    if (usingProps) return propProducts ?? [];
    if (rawProducts == null) return null;
    return (rawProducts as any[]).map(normalizeRawProduct);
  }, [usingProps, propProducts, rawProducts]);

  // Build the plan whenever the resolved products list changes.
  const plan: DailyPlan | null = useMemo(() => {
    if (products == null) return null;
    const season = getSeasonContext();
    return buildDailyPlan(products, season ?? undefined);
  }, [products]);

  const isEarlyStage = useMemo(() => {
    if (products == null) return false;
    return products.filter((p) => p.status === 'ACTIVE').length === 0;
  }, [products]);

  const loading = usingProps ? (propLoading ?? false) : swrLoading;

  if (loading && !plan) {
    return (
      <div className="kk-card" style={{ padding: 20 }}>
        <div style={{ height: 14, background: '#F8DCE5', borderRadius: 8, width: '35%', marginBottom: 12 }} />
        {[1,2,3].map(i => (
          <div key={i} style={{ height: 52, background: '#FFF0F5', borderRadius: 10, marginBottom: 8 }} />
        ))}
      </div>
    );
  }
  if (!plan) return null;

  const totalSlots = DAILY_SLOT_CONFIG.A.max + DAILY_SLOT_CONFIG.B.max + DAILY_SLOT_CONFIG.C.max;

  return (
    <div className="kk-card" style={{ overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        padding: '14px 20px 12px',
        borderBottom: '1px solid #F8DCE5',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={14} style={{ color: '#e62310' }} />
            <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
              오늘 할 일
            </p>
            <span style={{ fontSize: 11, color: '#B0A0A8' }}>{plan.date}</span>
          </div>
          <p style={{ fontSize: 11, color: '#B0A0A8', margin: '2px 0 0' }}>
            {plan.totalCount}/{totalSlots}개 슬롯 · 등록 준비 {plan.readyCount}개
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {plan.seasonContext && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
              background: '#fff8e1', color: '#b45309', border: '1px solid #fde68a',
            }}>
              {plan.seasonContext.label} D-{plan.seasonContext.daysLeft}
            </span>
          )}
          <button
            onClick={refresh}
            style={{
              padding: 6, borderRadius: 8, background: 'transparent',
              border: 'none', cursor: 'pointer', color: '#B0A0A8',
            }}
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Onboarding guide — early-stage only */}
      {isEarlyStage && (
        <div style={{ padding: '14px 20px 0' }}>
          <OnboardingGuide />
        </div>
      )}

      {/* Slot A / B / C */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {(['A', 'B', 'C'] as const).map(slot => {
          const meta  = SLOT_META[slot];
          const items = slot === 'A' ? plan.slotA : slot === 'B' ? plan.slotB : plan.slotC;
          const conf  = DAILY_SLOT_CONFIG[slot];
          const { Icon } = meta;
          const filled = items.length >= conf.min;

          // Early-stage: slot A label changes
          const slotLabel = (isEarlyStage && slot === 'A') ? '등록 우선순위' : meta.label;
          const slotHint  = (isEarlyStage && slot === 'A') ? 'DRAFT 상품 업로드 준비도 순' : meta.hint;

          // Empty messages per slot + mode
          const emptyMsg = slot === 'A'
            ? (isEarlyStage ? '등록 가능한 DRAFT 상품이 없습니다. 상품을 먼저 추가해주세요.' : '꿀통지수 70점↑ 상품이 없습니다. SEO를 최적화해주세요.')
            : slot === 'B' ? '직접 선택할 상품을 상품 목록에서 골라주세요.'
            : '품절 · 장기미노출 상품이 없어요!';

          return (
            <div
              key={slot}
              style={{
                borderRadius: 12, overflow: 'hidden',
                border: `1.5px solid ${meta.borderColor}`,
              }}
            >
              {/* Slot header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', background: meta.accentBg,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon size={13} style={{ color: meta.accentColor }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#1A1A1A' }}>
                    슬롯 {slot}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                    background: meta.accentColor, color: '#fff',
                  }}>
                    {slotLabel}
                  </span>
                  <span style={{ fontSize: 10, color: '#B0A0A8' }}>
                    {conf.min}~{conf.max}개
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 800,
                    color: filled ? '#16a34a' : '#B0A0A8',
                  }}>
                    {items.length}/{conf.max}
                  </span>
                  {slot === 'C' && (
                    <a
                      href="/products/reactivation"
                      style={{
                        fontSize: 11, fontWeight: 600, color: meta.accentColor,
                        display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none',
                      }}
                    >
                      전체 <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>

              {/* Slot items */}
              <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6, background: '#fff' }}>
                {items.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#B0A0A8', textAlign: 'center', padding: '12px 0', margin: 0 }}>
                    {emptyMsg}
                  </p>
                ) : (
                  items.map((item, i) => (
                    <SlotCard key={i} item={item} isEarlyStage={isEarlyStage} />
                  ))
                )}
              </div>

              {/* Slot footer hint */}
              <div style={{
                padding: '6px 12px',
                borderTop: `1px solid ${meta.borderColor}`,
                background: meta.accentBg,
              }}>
                <p style={{ fontSize: 10, color: '#B0A0A8', margin: 0 }}>{slotHint}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
