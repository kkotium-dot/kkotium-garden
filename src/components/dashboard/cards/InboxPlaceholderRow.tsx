// src/components/dashboard/cards/InboxPlaceholderRow.tsx
// Session E-2 Phase 2 (2026-05-12)
// Disabled-state row for future Inbox alert feeds that aren't built yet.
// Mirrors the AutomationRow visual language so the dashboard reads as
// consistent with /automation. Each pending feed is registered in
// src/lib/automation-registry.ts; this component is the dashboard surface
// for that registry's pending entries.

'use client';

import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface InboxPlaceholderRowProps {
  Icon: LucideIcon;
  title: string;
  description: string;
  sprintLabel: string;
}

export default function InboxPlaceholderRow({
  Icon,
  title,
  description,
  sprintLabel,
}: InboxPlaceholderRowProps) {
  return (
    <Link
      href="/automation"
      style={{
        textDecoration: 'none',
        display: 'block',
      }}
      title="자동화 관제에서 진행 상태 확인"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 14px',
          borderRadius: 10,
          background: '#FAFAFA',
          border: '1px dashed #E5E5E5',
          opacity: 0.85,
          transition: 'background 0.15s ease',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#F5F5F5';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#FAFAFA';
        }}
      >
        <div
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: 8,
            background: '#FFFFFF',
            border: '1px solid #E5E5E5',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#A3A3A3',
          }}
          aria-hidden="true"
        >
          <Icon size={16} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 700,
              color: '#525252',
              lineHeight: 1.3,
            }}
          >
            {title}
          </p>
          <p
            style={{
              margin: '2px 0 0',
              fontSize: 11,
              color: '#A3A3A3',
              lineHeight: 1.4,
            }}
          >
            {description}
          </p>
        </div>
        <span
          style={{
            flexShrink: 0,
            fontSize: 10,
            fontWeight: 700,
            color: '#A3A3A3',
            background: '#FFFFFF',
            padding: '3px 8px',
            borderRadius: 999,
            border: '1px solid #E5E5E5',
            whiteSpace: 'nowrap',
          }}
        >
          {sprintLabel}
        </span>
      </div>
    </Link>
  );
}
