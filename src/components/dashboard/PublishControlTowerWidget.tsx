'use client';
// src/components/dashboard/PublishControlTowerWidget.tsx
//
// 2026-06-04 — Publish Control Tower. Traffic-light view of which DRAFT products
// are ready to publish to Naver. Reads the batch endpoint
// (/api/products/publish-readiness) and maps each product's engine verdict to a
// green/yellow/red signal. Read-only — never publishes.
//
// Signal rule (HANDOFF §2 STEP B):
//   green  = publishReady === true
//   yellow = hardComplete === true && publishReady === false
//   red    = hardComplete === false
//
// No emoji (Lucide icons). No Korean literals (control-tower-strings.ko.json, #35).

import { useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import {
  CheckCircle2, AlertTriangle, XCircle, ArrowRight, ListChecks, Wand2,
} from 'lucide-react';
import strings from '@/lib/i18n/control-tower-strings.ko.json';

const MARGIN_WARN_THRESHOLD = 25;

type Signal = 'green' | 'yellow' | 'red';

interface TowerItem {
  productId: string;
  name: string;
  mainImage: string | null;
  publishReady: boolean;
  hardComplete: boolean;
  seoComplete: boolean;
  authentic: boolean;
  naverPayloadComplete: boolean;
  hardFieldsMissing: string[];
  seoFieldsMissing: string[];
  authenticityViolations: Array<{ type: string; field: string; evidence: string }>;
  naverPayloadMissing: string[];
  margin: number | null;
  salePrice: number | null;
  supplierPrice: number | null;
}

interface BatchResponse {
  ok: boolean;
  items?: TowerItem[];
}

const SIGNAL_STYLE: Record<Signal, {
  chipBg: string; chipBorder: string; chipText: string; icon: React.ElementType;
}> = {
  green:  { chipBg: '#F0FDF4', chipBorder: '#86EFAC', chipText: '#15803D', icon: CheckCircle2 },
  yellow: { chipBg: '#FEFCE8', chipBorder: '#FDE68A', chipText: '#A16207', icon: AlertTriangle },
  red:    { chipBg: '#FFF0EF', chipBorder: '#FFD6D3', chipText: '#C2410C', icon: XCircle },
};

function resolveSignal(item: TowerItem): Signal {
  if (item.publishReady) return 'green';
  if (item.hardComplete) return 'yellow';
  return 'red';
}

// Map an engine field key to a human Korean label, de-duplicated. Code keys are
// NEVER rendered raw (HANDOFF §4).
function fieldLabel(key: string): string {
  const dict = strings.field as Record<string, string>;
  return dict[key] ?? key;
}
function violationLabel(type: string): string {
  const dict = strings.violation as Record<string, string>;
  return dict[type] ?? type;
}

// Build the de-duplicated, human-readable "what's missing" list for a card.
function buildChecklist(item: TowerItem): string[] {
  const labels = new Set<string>();
  for (const k of item.hardFieldsMissing) labels.add(fieldLabel(k));
  for (const k of item.seoFieldsMissing) labels.add(fieldLabel(k));
  for (const k of item.naverPayloadMissing) labels.add(fieldLabel(k));
  for (const v of item.authenticityViolations) labels.add(violationLabel(v.type));
  return Array.from(labels);
}

const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<BatchResponse>);

function SummaryPill({ signal, count }: { signal: Signal; count: number }) {
  const s = SIGNAL_STYLE[signal];
  const Icon = s.icon;
  const label = (strings.summary as Record<string, string>)[signal];
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 999,
      background: s.chipBg, border: `1px solid ${s.chipBorder}`,
    }}>
      <Icon size={13} style={{ color: s.chipText }} />
      <span style={{ fontSize: 12, fontWeight: 800, color: s.chipText }}>{count}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: s.chipText }}>{label}</span>
    </div>
  );
}

function ProductCard({ item }: { item: TowerItem }) {
  const signal = resolveSignal(item);
  const s = SIGNAL_STYLE[signal];
  const Icon = s.icon;
  const checklist = buildChecklist(item);
  const marginPct = typeof item.margin === 'number' ? Math.round(item.margin) : null;
  const showMarginWarn = marginPct !== null && marginPct < MARGIN_WARN_THRESHOLD;

  return (
    <div className="kk-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* thumbnail */}
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: '#F5F5F5', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {item.mainImage
            ? <img src={item.mainImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <ListChecks size={18} style={{ color: '#B0A0A8' }} />}
        </div>
        {/* name + signal */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 13, fontWeight: 800, color: '#1A1A1A', margin: 0,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {item.name}
          </p>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 9px', borderRadius: 999,
              background: s.chipBg, border: `1px solid ${s.chipBorder}`,
            }}>
              <Icon size={12} style={{ color: s.chipText }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: s.chipText }}>
                {(strings.signal as Record<string, string>)[signal]}
              </span>
            </span>
            {showMarginWarn && (
              <span style={{
                padding: '3px 8px', borderRadius: 999,
                background: '#FEFCE8', border: '1px solid #FDE68A',
                fontSize: 10, fontWeight: 700, color: '#A16207',
              }}>
                {strings.checklist.marginWarn.replace('{pct}', String(marginPct))}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* checklist */}
      {checklist.length > 0 ? (
        <div style={{
          background: '#FAFAFA', border: '1px solid #F0F0F0', borderRadius: 10, padding: '8px 10px',
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#A3A3A3', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {strings.checklist.missingTitle}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {checklist.map((label) => (
              <span key={label} style={{
                fontSize: 11, fontWeight: 600, color: '#737373',
                background: '#fff', border: '1px solid #E5E5E5', borderRadius: 7, padding: '2px 7px',
              }}>
                {label}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '8px 10px',
        }}>
          <CheckCircle2 size={13} style={{ color: '#15803D' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#15803D' }}>{strings.checklist.okTitle}</span>
        </div>
      )}

      {/* CTAs — yellow/red route to where the fix happens */}
      <div style={{ display: 'flex', gap: 8 }}>
        {signal !== 'green' && (
          <Link href="/naver-seo" style={{ textDecoration: 'none', flex: 1 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '7px 0', borderRadius: 8,
              background: '#EFF6FF', border: '1px solid #BFDBFE',
              fontSize: 11, fontWeight: 700, color: '#2563EB', cursor: 'pointer',
            }}>
              <Wand2 size={12} /> {strings.cta.fixSeo}
            </div>
          </Link>
        )}
        <Link href={`/studio?product=${item.productId}`} style={{ textDecoration: 'none', flex: 1 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            padding: '7px 0', borderRadius: 8,
            background: '#FFF0F5', border: '1px solid #FFB3CE',
            fontSize: 11, fontWeight: 700, color: '#e62310', cursor: 'pointer',
          }}>
            {strings.cta.openStudio} <ArrowRight size={12} />
          </div>
        </Link>
      </div>
    </div>
  );
}

export default function PublishControlTowerWidget() {
  const { data, error, isLoading } = useSWR<BatchResponse>(
    '/api/products/publish-readiness?status=DRAFT&limit=50',
    fetcher,
    { revalidateOnFocus: true },
  );

  const items = useMemo<TowerItem[]>(() => data?.items ?? [], [data]);

  const counts = useMemo(() => {
    const c = { green: 0, yellow: 0, red: 0 };
    for (const it of items) c[resolveSignal(it)] += 1;
    return c;
  }, [items]);

  return (
    <div className="kk-card" style={{ overflow: 'hidden' }}>
      {/* header */}
      <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid #F8DCE5', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <ListChecks size={15} style={{ color: '#e62310' }} />
        <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>{strings.title}</p>
        <p style={{ fontSize: 11, color: '#B0A0A8', margin: 0, flex: 1 }}>{strings.subtitle}</p>
        {!isLoading && !error && items.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <SummaryPill signal="green" count={counts.green} />
            <SummaryPill signal="yellow" count={counts.yellow} />
            <SummaryPill signal="red" count={counts.red} />
          </div>
        )}
      </div>

      {/* body */}
      <div style={{ padding: 16 }}>
        {isLoading && (
          <p style={{ fontSize: 12, color: '#B0A0A8', margin: 0, textAlign: 'center', padding: '20px 0' }}>
            {strings.loading}
          </p>
        )}

        {!isLoading && error && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <AlertTriangle size={18} style={{ color: '#C2410C', margin: '0 auto 8px' }} />
            <p style={{ fontSize: 12, fontWeight: 700, color: '#C2410C', margin: 0 }}>{strings.error.title}</p>
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <ListChecks size={20} style={{ color: '#D4D4D4', margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: '#737373', margin: '0 0 4px' }}>{strings.empty.title}</p>
            <p style={{ fontSize: 11, color: '#B0A0A8', margin: 0 }}>{strings.empty.hint}</p>
          </div>
        )}

        {!isLoading && !error && items.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          }}>
            {items.map((it) => <ProductCard key={it.productId} item={it} />)}
          </div>
        )}
      </div>
    </div>
  );
}
