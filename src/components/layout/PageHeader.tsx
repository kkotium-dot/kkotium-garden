// src/components/layout/PageHeader.tsx
// Unified page header component — consistent across all pages
// Rule:
//   - One thick pink line (2.5px) immediately below the title
//   - Thin lines (1px #F8DCE5) for internal section dividers
// Usage: <PageHeader icon={<Truck />} title="배송 템플릿 관리" subtitle="..." action={<button>} />

import React from 'react';

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ icon, title, subtitle, action }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ flex: 1 }}>
          {/* Title row with icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 38, height: 38,
                background: '#e62310',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: '#1A1A1A',
                margin: 0,
                letterSpacing: '-0.3px',
              }}
            >
              {title}
            </h1>
          </div>
          {/* Single thick pink line under title */}
          <div
            style={{
              height: 2.5,
              background: '#FFB3CE',
              borderRadius: 99,
              marginBottom: subtitle ? 8 : 0,
            }}
          />
          {/* Subtitle below the line */}
          {subtitle && (
            <p style={{ fontSize: 13, color: '#888', margin: 0 }}>{subtitle}</p>
          )}
        </div>
        {/* Action button on the right */}
        {action && (
          <div style={{ flexShrink: 0, marginTop: 2 }}>{action}</div>
        )}
      </div>
    </div>
  );
}

// Thin internal divider — use between list items or card sections
export function ThinDivider({ margin = '0' }: { margin?: string }) {
  return (
    <div style={{ height: 1, background: '#F8DCE5', borderRadius: 99, margin }} />
  );
}

// Standard action button (red)
export function KkBtn({
  children, onClick, disabled, style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '10px 18px',
        background: disabled ? '#F8DCE5' : '#e62310',
        color: disabled ? '#B0A0A8' : '#fff',
        borderRadius: 12,
        fontWeight: 700,
        fontSize: 13,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.12s',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
