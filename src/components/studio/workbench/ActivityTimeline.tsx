// src/components/studio/workbench/ActivityTimeline.tsx
// ============================================================================
// JOURNAL-2 / J2-1 (#55 / #3-1) — read-only per-product activity timeline. The
// 일지 tab's SECOND section (below JobLifecyclePanel), reusing the JOURNAL-1
// flex-column structure (no new layout). Aggregated by /api/products/{id}/
// activity from existing event sources (#191). Time-descending, latest 50.
//
// Korean labels come from studio-strings.ko.json (#3-1); the API returns stable
// kind keys + data tokens. Lucide only; English comments. Publish-independent.
// ============================================================================

'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { ShoppingCart, ImagePlus, Wrench, Flag, History, Loader2, ChevronDown } from 'lucide-react';
import strings from '@/lib/i18n/studio-strings.ko.json';

interface ActivityEvent {
  ts: string;
  kind: 'sourcing' | 'asset' | 'job' | 'status';
  label: string;
  target: string;
}
interface ActivityResponse { success: boolean; activity?: ActivityEvent[]; error?: string }

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const t = strings.atelier.journal.activity;

function kindIcon(kind: ActivityEvent['kind']): ReactNode {
  const c = 'var(--gp-red-500)';
  if (kind === 'sourcing') return <ShoppingCart size={13} color={c} />;
  if (kind === 'asset') return <ImagePlus size={13} color={c} />;
  if (kind === 'job') return <Wrench size={13} color={c} />;
  return <Flag size={13} color={c} />; // status
}
function kindLabel(kind: ActivityEvent['kind']): string {
  return t[kind] ?? kind;
}

// Relative time (Korean). Runtime UI — Date.now() is fine here (this is not a
// workflow script). Falls back to a locale date beyond a week.
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMin = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (diffMin < 1) return t.now;
  if (diffMin < 60) return `${diffMin}${t.minAgo}`;
  const hr = Math.floor(diffMin / 60);
  if (hr < 24) return `${hr}${t.hourAgo}`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}${t.dayAgo}`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

// J2-3 — initial page size + increment. Client-side (no extra fetch, #191).
const PAGE_SIZE = 20;
// J2-2 — filter chip order (kind keys the activity API emits).
type FilterKey = 'all' | ActivityEvent['kind'];
const KIND_ORDER: ActivityEvent['kind'][] = ['sourcing', 'job', 'asset', 'status'];

export default function ActivityTimeline({ productId }: { productId: string }) {
  // J2-3 — fetch the full available history once (API caps at 200) so filter +
  // pagination are pure client-side slices (additional fetch 0, #191).
  const { data, error, isLoading } = useSWR<ActivityResponse>(
    productId ? `/api/products/${productId}/activity?limit=200` : null,
    fetcher,
  );
  const events = useMemo(() => (data?.success ? (data.activity ?? []) : []), [data]);

  // J2-2 filter + J2-3 pagination state.
  const [filter, setFilter] = useState<FilterKey>('all');
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Per-kind counts drive the chip labels; 0-count kinds are hidden (spec §1.19).
  const countByKind = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of events) c[e.kind] = (c[e.kind] ?? 0) + 1;
    return c;
  }, [events]);

  const filtered = useMemo(
    () => (filter === 'all' ? events : events.filter((e) => e.kind === filter)),
    [events, filter],
  );

  // Changing the filter (or a data reload) restarts pagination at the first page.
  useEffect(() => { setVisible(PAGE_SIZE); }, [filter, events]);

  const shown = filtered.slice(0, visible);
  const remaining = filtered.length - shown.length;

  // Chips: 전체 + only the kinds that actually occur (0-count hidden, spec §1.19).
  const chips: Array<{ key: FilterKey; label: string; count: number }> = [
    { key: 'all', label: t.filter.all, count: events.length },
    ...KIND_ORDER
      .filter((k) => (countByKind[k] ?? 0) > 0)
      .map((k) => ({ key: k as FilterKey, label: t.filter[k], count: countByKind[k] ?? 0 })),
  ];

  return (
    <section style={shell}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <History size={14} color="var(--gp-red-500)" strokeWidth={2.4} />
        <h3 style={{ margin: 0, fontSize: 12.5, fontWeight: 900, color: 'var(--gp-ink-900)' }}>{t.title}</h3>
      </header>

      {/* J2-2 — kind filter chips (client-side, only rendered once events exist) */}
      {!isLoading && !error && events.length > 0 && (
        <div role="tablist" aria-label={t.title} style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 9 }}>
          {chips.map((chip) => {
            const active = filter === chip.key;
            return (
              <button
                key={chip.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(chip.key)}
                style={{
                  fontSize: 10.5, fontWeight: 800, lineHeight: 1,
                  color: active ? '#fff' : 'var(--gp-ink-700)',
                  background: active ? 'var(--gp-red-500)' : 'var(--gp-pink-50)',
                  border: `1px solid ${active ? 'var(--gp-red-500)' : 'var(--color-border)'}`,
                  borderRadius: 999, padding: '4px 9px', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {chip.label} {chip.count}
              </button>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <p style={muted}><Loader2 size={12} className="animate-spin" style={{ verticalAlign: 'middle', marginRight: 4 }} />{t.loading}</p>
      ) : error || (data && !data.success) ? (
        <p style={{ ...muted, color: 'var(--gp-red-500)' }}>{t.error}</p>
      ) : events.length === 0 ? (
        <p style={muted}>{t.empty}</p>
      ) : (
        <>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {shown.map((e, i) => (
              <li key={`${e.ts}-${i}`} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', minWidth: 0 }}>
                <span style={dot}>{kindIcon(e.kind)}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--gp-ink-900)' }}>{kindLabel(e.kind)}</strong>
                    <span style={{ fontSize: 10, color: 'var(--gp-ink-500)' }}>{relativeTime(e.ts)}</span>
                  </div>
                  <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--gp-ink-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${e.label} · ${e.target}`}>
                    <span style={{ color: 'var(--gp-ink-500)' }}>{e.label}</span>
                    {e.target ? <> · {e.target}</> : null}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {/* J2-3 — 더보기: reveal the next page (client slice, no fetch) */}
          {remaining > 0 && (
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              style={{
                marginTop: 9, width: '100%',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                fontSize: 11, fontWeight: 800, color: 'var(--gp-ink-700)',
                background: 'var(--gp-pink-50)', border: '1px solid var(--color-border)',
                borderRadius: 8, padding: '7px 12px', cursor: 'pointer',
              }}
            >
              <ChevronDown size={13} />
              {t.moreRemaining.replace('{n}', String(remaining))}
            </button>
          )}
        </>
      )}
    </section>
  );
}

const shell: React.CSSProperties = { padding: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', minWidth: 0 };
const muted: React.CSSProperties = { fontSize: 11, color: 'var(--gp-ink-500)', margin: 0, lineHeight: 1.6 };
const dot: React.CSSProperties = { flexShrink: 0, width: 22, height: 22, borderRadius: 999, background: 'var(--gp-pink-50)', border: '1px solid var(--color-border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 };
