'use client';
// UploadReadinessWidget — Phase E+ Sprint 4 / E-14 + Sprint 6 / E-15 Block C
// Surfaces DRAFT products with their 11-point readiness score on the dashboard,
// turning the existing upload-readiness library into an actionable command center.
// - Lists top 5 unregistered products sorted by readiness score
// - Each card shows missing items as clickable chips (deep-link to seed-planting tabs)
// - Items at 90+ get a "register now" CTA that takes user to garden warehouse with the product preselected
// - E-15: Each card under 90 also has an "AI auto-fill" button that opens AutoFillModal

import { useMemo, useState } from 'react';
import {
  CheckCircle2, AlertCircle, ChevronRight, Sparkles,
  TrendingUp, Package, Image as ImageIcon, Tag, Truck,
  DollarSign, Type, Hash,
} from 'lucide-react';
import Link from 'next/link';
import {
  calcUploadReadiness,
  READINESS_GRADE_STYLE,
  getReadinessColor,
  type ReadinessItemId,
  type ReadinessResult,
} from '@/lib/upload-readiness';
import type { DashboardProduct } from '@/app/dashboard/page';
import AutoFillModal from './AutoFillModal';

// ── Mapping: readiness item -> seed-planting tab + icon ──────────────────────
// Each problem chip deep-links into the right tab on the seed-planting page.
const ITEM_TO_TAB: Record<ReadinessItemId, { tab: string; Icon: React.ElementType; short: string }> = {
  category:          { tab: 'basic',    Icon: Hash,        short: '카테고리' },
  keywords_count:    { tab: 'seo',      Icon: Sparkles,    short: '키워드' },
  tags_count:        { tab: 'seo',      Icon: Tag,         short: '태그' },
  keyword_in_front:  { tab: 'basic',    Icon: Type,        short: '앞15자' },
  name_length:       { tab: 'basic',    Icon: Type,        short: '상품명' },
  no_abuse:          { tab: 'basic',    Icon: AlertCircle, short: '어뷰징' },
  no_repeat:         { tab: 'basic',    Icon: AlertCircle, short: '반복' },
  main_image:        { tab: 'image',    Icon: ImageIcon,   short: '대표' },
  extra_images:      { tab: 'image',    Icon: ImageIcon,   short: '추가' },
  shipping_template: { tab: 'shipping', Icon: Truck,       short: '배송' },
  net_margin:        { tab: 'basic',    Icon: DollarSign,  short: '마진' },
};

// Helper: detect if a product has any AI-fillable failed item (used to show/hide auto-fill button)
const AUTOFILLABLE_SET = new Set<ReadinessItemId>([
  'name_length', 'no_abuse', 'no_repeat', 'keyword_in_front',
  'keywords_count', 'tags_count', 'category',
]);

function hasAnyAutofillable(readiness: ReadinessResult): boolean {
  return readiness.failed.some((f) => AUTOFILLABLE_SET.has(f.id));
}

// ── Card row (single DRAFT product) ──────────────────────────────────────────
function ProductRow({
  product,
  readiness,
  onAutoFill,
}: {
  product: DashboardProduct;
  readiness: ReadinessResult;
  onAutoFill: (productId: string, productName: string, score: number) => void;
}) {
  const grade   = readiness.grade;
  const gStyle  = READINESS_GRADE_STYLE[grade];
  const barCol  = getReadinessColor(readiness.score);
  const ready90 = readiness.score >= 90;
  const failed  = readiness.failed.slice(0, 4);
  const showAutoFill = !ready90 && hasAnyAutofillable(readiness);

  // Pick highest-impact missing item for "fix this first" deep-link
  const topProblem = failed[0];
  const fixHref = topProblem
    ? `/products/new?edit=${product.id}&focus=${ITEM_TO_TAB[topProblem.id].tab}`
    : `/products/new?edit=${product.id}`;

  // Register-now CTA: take user to garden warehouse with this product preselected
  const registerHref = `/products?registerId=${product.id}`;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 12,
        background: ready90 ? '#f0fdf4' : '#fff',
        border: `1px solid ${ready90 ? '#bbf7d0' : '#F8DCE5'}`,
      }}
    >
      {/* Left — score column */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 56 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: 99,
            background: gStyle.bg,
            color: gStyle.color,
            border: `1px solid ${gStyle.border}`,
          }}
        >
          {grade}
        </span>
        <span style={{ fontSize: 18, fontWeight: 900, color: barCol, lineHeight: 1 }}>
          {readiness.score}
        </span>
        <span style={{ fontSize: 9, color: '#B0A0A8' }}>점</span>
      </div>

      {/* Middle — name + missing chips */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#1A1A1A',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {product.name || '(상품명 없음)'}
        </p>

        {/* Progress bar */}
        <div style={{ height: 4, borderRadius: 99, background: '#F8DCE5', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${readiness.score}%`,
              background: barCol,
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {/* Missing-item chips (deep-link) */}
        {failed.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={11} style={{ color: '#16a34a' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d' }}>
              모든 항목 통과 — 등록 준비 완료
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {failed.map((item) => {
              const meta = ITEM_TO_TAB[item.id];
              const ChipIcon = meta.Icon;
              return (
                <Link
                  key={item.id}
                  href={`/products/new?edit=${product.id}&focus=${meta.tab}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    padding: '2px 6px',
                    borderRadius: 6,
                    background: '#fff0ef',
                    border: '1px solid #ffd6d3',
                    color: '#b91c1c',
                    fontSize: 10,
                    fontWeight: 700,
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                  title={item.message}
                >
                  <ChipIcon size={9} />
                  {meta.short}
                </Link>
              );
            })}
            {readiness.failed.length > 4 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#B0A0A8',
                  padding: '2px 6px',
                }}
              >
                외 {readiness.failed.length - 4}건
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right — action buttons (E-15: stack auto-fill + manual fix) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          alignItems: 'stretch',
          justifyContent: 'center',
          minWidth: 110,
        }}
      >
        {ready90 ? (
          <Link
            href={registerHref}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '6px 8px',
              borderRadius: 8,
              background: '#16a34a',
              color: '#fff',
              fontSize: 11,
              fontWeight: 800,
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <TrendingUp size={11} />
            바로 등록
          </Link>
        ) : (
          <>
            {/* E-15: AI auto-fill button (top, primary CTA for sub-90 cards) */}
            {showAutoFill && (
              <button
                onClick={() => onAutoFill(product.id, product.name || '', readiness.score)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: '6px 8px',
                  borderRadius: 8,
                  background: '#7c3aed',
                  color: '#fff',
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
                title="AI가 부족한 항목을 자동으로 채웁니다"
              >
                <Sparkles size={11} />
                AI 채우기
              </button>
            )}
            <Link
              href={fixHref}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '6px 8px',
                borderRadius: 8,
                background: '#fff',
                color: '#e62310',
                fontSize: 11,
                fontWeight: 700,
                textDecoration: 'none',
                cursor: 'pointer',
                border: '1px solid #FFB3CE',
              }}
            >
              직접 수정
              <ChevronRight size={11} />
            </Link>
          </>
        )}
        <span style={{ fontSize: 9, color: '#B0A0A8', textAlign: 'center' }}>
          {ready90 ? '90점 이상' : `+${100 - readiness.score}점 필요`}
        </span>
      </div>
    </div>
  );
}

// ── Main widget ──────────────────────────────────────────────────────────────
interface UploadReadinessWidgetProps {
  products?: DashboardProduct[];
  productsLoading?: boolean;
  /** Called after a successful AI auto-fill apply, so the dashboard can reload product data. */
  onRefresh?: () => void;
}

export default function UploadReadinessWidget({
  products,
  productsLoading,
  onRefresh,
}: UploadReadinessWidgetProps) {
  // E-15: AutoFill modal state (one product at a time)
  const [modalTarget, setModalTarget] = useState<{
    productId: string;
    productName: string;
    score: number;
  } | null>(null);

  function handleOpenAutoFill(productId: string, productName: string, score: number) {
    setModalTarget({ productId, productName, score });
  }

  function handleModalClose() {
    setModalTarget(null);
  }

  function handleAutoFillApplied() {
    // Tell the dashboard to reload products so the score updates immediately
    if (onRefresh) onRefresh();
  }

  // Compute readiness for all unregistered products (DRAFT or no naverProductId)
  const ranked = useMemo(() => {
    if (!products) return [];
    const unregistered = products.filter(
      (p) => p.status === 'DRAFT' || !(p as any).naverProductId
    );
    return unregistered
      .map((p) => ({
        product: p,
        readiness: calcUploadReadiness({
          naverCategoryCode: p.naverCategoryCode,
          keywords: p.keywords,
          tags: p.tags,
          name: p.name,
          mainImage: p.mainImage,
          images: (p as any).images ?? [],
          shippingTemplateId: (p as any).shippingTemplateId ?? (p as any).shipping_template_id,
          salePrice: p.salePrice,
          supplierPrice: p.supplierPrice,
          shippingFee: (p as any).shippingFee ?? 3000,
        }),
      }))
      .sort((a, b) => b.readiness.score - a.readiness.score);
  }, [products]);

  const top5         = ranked.slice(0, 5);
  const readyCount   = ranked.filter((r) => r.readiness.score >= 90).length;
  const workCount    = ranked.length - readyCount;
  const avgScore     = ranked.length === 0
    ? 0
    : Math.round(ranked.reduce((acc, r) => acc + r.readiness.score, 0) / ranked.length);

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (productsLoading) {
    return (
      <div className="kk-card" style={{ padding: 20 }}>
        <div style={{ height: 14, background: '#F8DCE5', borderRadius: 8, width: '40%', marginBottom: 12 }} />
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ height: 56, background: '#FFF0F5', borderRadius: 10, marginBottom: 8 }} />
        ))}
      </div>
    );
  }

  // ── Empty state — no DRAFT products to register ────────────────────────────
  if (ranked.length === 0) {
    return (
      <div className="kk-card" style={{ overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 20px 12px',
            borderBottom: '1px solid #F8DCE5',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Package size={14} style={{ color: '#16a34a' }} />
          <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
            등록 준비 명령탑
          </p>
          <span
            style={{
              fontSize: 10,
              padding: '2px 7px',
              borderRadius: 99,
              background: '#dcfce7',
              color: '#15803d',
              fontWeight: 700,
            }}
          >
            모두 등록 완료
          </span>
        </div>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <CheckCircle2 size={28} style={{ color: '#16a34a', marginBottom: 8 }} />
          <p style={{ fontSize: 12, color: '#1A1A1A', margin: '0 0 4px', fontWeight: 700 }}>
            모든 상품이 네이버에 등록되어 있어요
          </p>
          <p style={{ fontSize: 11, color: '#B0A0A8', margin: 0 }}>
            새 상품을 추가하려면 꿀통 사냥터에서 도매 상품을 가져오세요
          </p>
          <Link
            href="/crawl"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 10,
              padding: '6px 12px',
              borderRadius: 8,
              background: '#7c3aed',
              color: '#fff',
              fontSize: 11,
              fontWeight: 800,
              textDecoration: 'none',
            }}
          >
            <Sparkles size={11} />
            꿀통 사냥터로 이동
          </Link>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <>
      <div className="kk-card" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div
          style={{
            padding: '14px 20px 12px',
            borderBottom: '1px solid #F8DCE5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={14} style={{ color: '#e62310' }} />
            <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
              등록 준비 명령탑
            </p>
            <span style={{ fontSize: 11, color: '#B0A0A8' }}>
              DRAFT 상품을 네이버에 올릴 준비도 점수
            </span>
          </div>
          <Link
            href="/products"
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#e62310',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            전체 보기 <ChevronRight size={11} />
          </Link>
        </div>

        {/* Stat strip */}
        <div
          style={{
            padding: '10px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            background: '#FFF0F5',
            borderBottom: '1px solid #F8DCE5',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 900, color: '#16a34a', margin: 0, lineHeight: 1 }}>
              {readyCount}
            </p>
            <p style={{ fontSize: 10, color: '#15803d', fontWeight: 700, margin: '3px 0 0' }}>
              지금 등록 가능
            </p>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid #FFB3CE', borderRight: '1px solid #FFB3CE' }}>
            <p style={{ fontSize: 18, fontWeight: 900, color: '#e62310', margin: 0, lineHeight: 1 }}>
              {workCount}
            </p>
            <p style={{ fontSize: 10, color: '#b91c1c', fontWeight: 700, margin: '3px 0 0' }}>
              작업 필요
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 900, color: '#1A1A1A', margin: 0, lineHeight: 1 }}>
              {avgScore}
            </p>
            <p style={{ fontSize: 10, color: '#B0A0A8', fontWeight: 700, margin: '3px 0 0' }}>
              평균 점수
            </p>
          </div>
        </div>

        {/* Top 5 product rows */}
        <div
          style={{
            padding: '12px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {top5.map(({ product, readiness }) => (
            <ProductRow
              key={product.id}
              product={product}
              readiness={readiness}
              onAutoFill={handleOpenAutoFill}
            />
          ))}
        </div>

        {/* Footer hint — only when there are more than 5 */}
        {ranked.length > 5 && (
          <div
            style={{
              padding: '10px 20px',
              borderTop: '1px solid #F8DCE5',
              background: '#FFF0F5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <p style={{ fontSize: 11, color: '#B0A0A8', margin: 0 }}>
              DRAFT 상품 {ranked.length}개 중 상위 5개 표시 중
            </p>
            <Link
              href="/products"
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#e62310',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              정원 창고에서 전체 보기 <ChevronRight size={11} />
            </Link>
          </div>
        )}
      </div>

      {/* E-15 Block C: AutoFill modal (one at a time) */}
      {modalTarget && (
        <AutoFillModal
          productId={modalTarget.productId}
          productName={modalTarget.productName}
          currentScore={modalTarget.score}
          onClose={handleModalClose}
          onApplied={handleAutoFillApplied}
        />
      )}
    </>
  );
}
