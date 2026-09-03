'use client';
// src/components/dashboard/cards/PublishCompletionNudgeCard.tsx
// F-1 — "완주 임박" 카드 (docs/design/F_PUBLISH_COMPLETION_NUDGE_2026-08-27.md)
//
// 완성축(손 안의 것 마무리) — 소싱봇의 발굴축과 분리해 대시보드 더보기
// 섹션에만 노출한다(§2 축 분리 원칙). 재발명 금지: 준비도 판정은
// calcUploadReadiness(upload-readiness.ts) 그대로 재사용하고, "부족 항목→
// 씨앗심기 탭 포커스" 매핑도 UploadReadinessWidget의 ITEM_TO_TAB을 그대로
// 재사용한다(#295 단일권위) — 이 파일은 그 결과를 "완주 임박"(준비도 내림차순)
// 프레이밍으로 노출하고 CTA를 연결하는 surfacing만 한다.
//
// §8-2 테스트잔재 배제: source='NATIVE' AND salePrice=0 AND mainImage 없음인
// 상품은 UCE 검증용 빈껍데기로 보고 넛지 대상에서 제외한다(전 상품 공통 판별,
// 특정 상품명 하드코딩 아님).

import { useMemo } from 'react';
import Link from 'next/link';
import { Sprout, ArrowRight, PartyPopper } from 'lucide-react';
import {
  calcUploadReadiness,
  getReadinessColor,
  type ReadinessItemId,
} from '@/lib/upload-readiness';
import { ITEM_TO_TAB } from '@/components/dashboard/UploadReadinessWidget';
import type { DashboardProduct } from '@/lib/dashboard-product';

const MAX_CARDS = 4;

function isTestResidue(p: DashboardProduct): boolean {
  // §8-2 판별식 그대로: source=NATIVE AND salePrice=0 AND mainImage 없음.
  return (p.source ?? 'NATIVE') === 'NATIVE' && (p.salePrice ?? 0) === 0 && !p.mainImage?.trim();
}

interface RankedItem {
  product: DashboardProduct;
  score: number;
  missing: { id: ReadinessItemId; short: string }[];
}

function rankForCompletion(products: DashboardProduct[]): RankedItem[] {
  const unpublished = products.filter((p) => !p.naverProductId && !isTestResidue(p));
  return unpublished
    .map((p) => {
      const readiness = calcUploadReadiness({
        naverCategoryCode: p.naverCategoryCode,
        categoryDbConfirmNeeded: !!p.name && !p.category_id,
        keywords: p.keywords,
        tags: p.tags,
        name: p.name,
        mainImage: p.mainImage,
        images: p.images ?? [],
        shippingTemplateId: p.shippingTemplateId,
        salePrice: p.salePrice,
        supplierPrice: p.supplierPrice,
        shippingFee: p.shippingFee ?? 3000,
      });
      return {
        product: p,
        score: readiness.score,
        missing: readiness.failed.slice(0, 3).map((f) => ({ id: f.id, short: ITEM_TO_TAB[f.id]?.short ?? f.label })),
      };
    })
    // 완주 임박 = 준비도 내림차순(§3 F-1) — 가장 적은 손질로 발행 가능한 것이 최상단.
    .sort((a, b) => b.score - a.score);
}

export default function PublishCompletionNudgeCard({
  products,
  loading,
}: {
  products: DashboardProduct[];
  loading?: boolean;
}) {
  const ranked = useMemo(() => rankForCompletion(products), [products]);
  const visible = ranked.slice(0, MAX_CARDS);

  // 완주 후보가 없으면(전부 발행됐거나 전부 테스트잔재) 조용히 숨는다 —
  // NaverHealthBanner와 같은 "정상 시 self-hide" 관례.
  if (!loading && visible.length === 0) return null;

  return (
    <div className="kk-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid #F8DCE5', display: 'flex', alignItems: 'center', gap: 8 }}>
        <PartyPopper size={14} style={{ color: '#F63B28' }} />
        <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>완주 임박</p>
        <p style={{ fontSize: 11, color: '#B0A0A8', margin: 0 }}>조금만 더 채우면 바로 발행할 수 있어요</p>
      </div>

      <div style={{ padding: 16 }}>
        {loading ? (
          <p style={{ fontSize: 12, color: '#B0A0A8', margin: 0, textAlign: 'center', padding: '12px 0' }}>
            불러오는 중…
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {visible.map(({ product, score, missing }) => {
              const topMissing = missing[0];
              const href = topMissing
                ? `/products/new?edit=${product.id}&focus=${ITEM_TO_TAB[topMissing.id]?.tab ?? 'basic'}`
                : `/products/new?edit=${product.id}`;
              const color = getReadinessColor(score);
              return (
                <Link key={product.id} href={href} style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '12px 14px', borderRadius: 12, background: '#fff', border: '1px solid #F0E0E5', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: '#F5F5F5', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {product.mainImage
                          ? <img src={product.mainImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <Sprout size={14} style={{ color: '#B0A0A8' }} />}
                      </div>
                      <p style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700, color: '#1A1A1A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.name || '(상품명 없음)'}
                      </p>
                      <span style={{ fontSize: 13, fontWeight: 900, color, flexShrink: 0 }}>{score}%</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 99, background: '#F8DCE5', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 99 }} />
                    </div>
                    {missing.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {missing.map((m) => (
                          <span key={m.id} style={{ fontSize: 10, fontWeight: 700, color: '#737373', background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: 7, padding: '2px 7px' }}>
                            {m.short} 부족
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#15803d' }}>발행 준비 완료!</span>
                    )}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#F63B28' }}>
                      이어서 씨앗심기 <ArrowRight size={11} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
