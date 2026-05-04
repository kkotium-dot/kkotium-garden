// src/components/dashboard/layout/SectionHeader.tsx
// Workflow Redesign Sprint Part A1a (2026-05-03)
// Section header for the four-section dashboard layout.
//
// Each dashboard section gets one of these as its top row.
// Variants map 1:1 to KkottiVariant so future Part A1b can render the
// matching mascot face / accessory next to the header.
//
// Style decisions:
//  - No JSX emoji — Lucide React icons only (work principle)
//  - English type literals only
//  - Inline styles to match existing dashboard / KKOT brand red #E8001F
//  - No external state — fully presentational

'use client';

import {
  Sparkles,
  Target,
  Sprout,
  Wrench,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from 'lucide-react';
import type { KkottiVariant } from '@/lib/kkotti-vocab';

// Section identifiers — match SECTION_VARIANT keys in kkotti-vocab.ts
export type SectionId = 'today' | 'action' | 'market' | 'tools';

interface SectionHeaderProps {
  /** Section identifier — drives icon + default copy. */
  section: SectionId;
  /** Override the default title (Korean text). */
  title?: string;
  /** Optional one-line description (Korean text). */
  subtitle?: string;
  /** Persona variant for future mascot integration (Part A1b). */
  variant?: KkottiVariant;
  /** Currently collapsed? Drives chevron direction (caller-managed state). */
  collapsed?: boolean;
  /** Click handler — usually `() => setCollapsed(!collapsed)`. */
  onToggle?: () => void;
  /** Optional right-aligned content (e.g. a count badge or a refresh button). */
  rightSlot?: React.ReactNode;
}

// Per-section default copy + icon assignment.
// All Korean text is source-of-truth here so the dashboard page does not
// have to repeat it.
const SECTION_PRESETS: Record<SectionId, { title: string; subtitle: string; Icon: LucideIcon }> = {
  today: {
    title: '오늘의 결과',
    subtitle: '실시간 매출 / 마진 / 굿서비스 한눈에',
    Icon: Sparkles,
  },
  action: {
    title: '오늘의 액션',
    subtitle: '지금 바로 처리할 등록·리뷰·혜택',
    Icon: Target,
  },
  market: {
    title: '소싱 · 시장',
    subtitle: '꿀통 사냥 / 트렌드 / 경쟁 분석',
    Icon: Sprout,
  },
  tools: {
    title: '도구 · 활동',
    subtitle: '빠른 작업 / 이벤트 타임라인',
    Icon: Wrench,
  },
};

export default function SectionHeader({
  section,
  title,
  subtitle,
  variant: _variant,  // reserved for Part A1b mascot integration
  collapsed = false,
  onToggle,
  rightSlot,
}: SectionHeaderProps) {
  const preset = SECTION_PRESETS[section];
  const displayTitle    = title    ?? preset.title;
  const displaySubtitle = subtitle ?? preset.subtitle;
  const Icon = preset.Icon;
  const Chevron = collapsed ? ChevronDown : ChevronUp;

  // Suppress unused warning for the reserved variant prop
  void _variant;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '14px 4px 10px',
        borderBottom: '2px solid #FEF0F3',
        marginBottom: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
        {/* Icon badge — KKOT brand red on a soft pink wash */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 10,
            background: '#FEF0F3',
            color: '#E8001F',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <Icon size={20} strokeWidth={2.2} />
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: '#171717',
              lineHeight: 1.2,
            }}
          >
            {displayTitle}
          </h2>
          {displaySubtitle && (
            <p
              style={{
                margin: '2px 0 0',
                fontSize: 12,
                color: '#737373',
                lineHeight: 1.4,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {displaySubtitle}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {rightSlot}
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? '섹션 펼치기' : '섹션 접기'}
            aria-expanded={!collapsed}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              padding: 0,
              border: '1px solid #F0E0E5',
              background: '#FFFFFF',
              borderRadius: 8,
              cursor: 'pointer',
              color: '#525252',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#FEF0F3'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
          >
            <Chevron size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}
