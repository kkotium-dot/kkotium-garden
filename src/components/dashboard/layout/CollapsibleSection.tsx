// src/components/dashboard/layout/CollapsibleSection.tsx
// Workflow Redesign Sprint Part A1a (2026-05-03)
// Collapsible section wrapper that pairs with SectionHeader.
//
// Manages its own collapsed state via useState (NOT localStorage —
// follows Option D pattern intentionally to keep server/client state pure
// and avoid hydration mismatch). Default-collapsed sections can be
// expressed via the `defaultCollapsed` prop.

'use client';

import { useState, useCallback, type ReactNode } from 'react';
import SectionHeader, { type SectionId } from './SectionHeader';
import type { KkottiVariant } from '@/lib/kkotti-vocab';

interface CollapsibleSectionProps {
  /** Section identifier — drives header icon + default copy. */
  section: SectionId;
  /** Persona variant for header (reserved for Part A1b). */
  variant?: KkottiVariant;
  /** Override the default title. */
  title?: string;
  /** Optional one-line subtitle. */
  subtitle?: string;
  /** Optional right-aligned slot (e.g. badge or refresh button). */
  rightSlot?: ReactNode;
  /** Initial collapsed state. */
  defaultCollapsed?: boolean;
  /** Section content. */
  children: ReactNode;
}

export default function CollapsibleSection({
  section,
  variant,
  title,
  subtitle,
  rightSlot,
  defaultCollapsed = false,
  children,
}: CollapsibleSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const handleToggle = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  return (
    <section
      style={{
        marginBottom: 28,
      }}
      aria-label={title ?? section}
    >
      <SectionHeader
        section={section}
        title={title}
        subtitle={subtitle}
        variant={variant}
        collapsed={collapsed}
        onToggle={handleToggle}
        rightSlot={rightSlot}
      />

      {/* Content area — display:none keeps DOM mounted so SWR caches stay warm */}
      <div
        style={{
          display: collapsed ? 'none' : 'block',
        }}
      >
        {children}
      </div>
    </section>
  );
}
