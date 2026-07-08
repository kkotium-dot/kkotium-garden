// src/components/ui/PanelTabs.tsx
// ============================================================================
// PanelTabs (#212, ZONE3_TAB_REFACTOR_SPEC) — reusable underline tab bar for
// splitting a dense panel's concerns into one-task-at-a-time views (#55). Premium
// SaaS styling: brand-red underline + bold text on the active tab, neutral gray
// otherwise, optional per-tab badge (count / dot / "!"). Layout only, no domain
// logic — reuse anywhere a panel stacks 3+ concerns (#212). Lucide-free, no emoji.
// ============================================================================

'use client';

export interface PanelTabBadge {
  /** short text (e.g. "2필드", "!"); omit for a plain dot. */
  text?: string;
  /** render a small dot instead of a text pill. */
  dot?: boolean;
  tone?: 'amber' | 'red' | 'blue';
}
export interface PanelTabDef {
  key: string;
  label: string;
  badge?: PanelTabBadge | null;
}

const TONE: Record<string, { color: string; bg: string; border: string }> = {
  amber: { color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  red:   { color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  blue:  { color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
};

function Badge({ badge }: { badge: PanelTabBadge }) {
  const tone = TONE[badge.tone ?? 'amber'] ?? TONE.amber;
  if (badge.dot && !badge.text) {
    return <span style={{ width: 6, height: 6, borderRadius: 999, background: tone.color, flexShrink: 0 }} />;
  }
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, lineHeight: 1, color: tone.color,
      background: tone.bg, border: `1px solid ${tone.border}`,
      borderRadius: 999, padding: '2px 6px', whiteSpace: 'nowrap',
    }}>
      {badge.text}
    </span>
  );
}

export default function PanelTabs({
  tabs, active, onChange, ariaLabel,
}: {
  tabs: PanelTabDef[];
  active: string;
  onChange: (key: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={{
        display: 'flex', alignItems: 'stretch', height: 44,
        padding: '0 16px', borderBottom: '1px solid #F0EAEC',
        overflowX: 'auto', flexShrink: 0,
      }}
    >
      {tabs.map((tab) => {
        const on = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(tab.key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '0 14px', marginBottom: -1,
              background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              borderBottom: on ? '2px solid #E62310' : '2px solid transparent',
              fontSize: 13, fontWeight: on ? 800 : 600,
              color: on ? '#E62310' : '#737373',
            }}
          >
            {tab.label}
            {tab.badge ? <Badge badge={tab.badge} /> : null}
          </button>
        );
      })}
    </div>
  );
}
