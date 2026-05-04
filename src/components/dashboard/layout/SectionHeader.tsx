// src/components/dashboard/layout/SectionHeader.tsx
// Workflow Redesign Sprint Part A1a (2026-05-03)
// Updated by Part A2 (2026-05-04) — mascot face + accessory label integration.
//
// Each dashboard section gets one of these as its top row.
// Variants map 1:1 to KkottiVariant; Part A2 surfaces the matching face
// expression and accessory label next to the icon badge so each section
// gets a visible Kkotti persona signal at a glance.
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
import {
  KKOTTI_FACE,
  KKOTTI_VARIANTS,
  SECTION_VARIANT,
  type KkottiFaceState,
  type KkottiVariant,
} from '@/lib/kkotti-vocab';

// Section identifiers — match SECTION_VARIANT keys in kkotti-vocab.ts
export type SectionId = 'today' | 'action' | 'market' | 'tools';

interface SectionHeaderProps {
  /** Section identifier — drives icon + default copy. */
  section: SectionId;
  /** Override the default title (Korean text). */
  title?: string;
  /** Optional one-line description (Korean text). */
  subtitle?: string;
  /** Persona variant override — defaults to SECTION_VARIANT[section]. */
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

// Part A2 (2026-05-04): Per-variant face expression and accessory label.
// Section-default face conveys persona mood at the head of each section.
// Accessory labels mirror KKOTTI_VARIANTS[v].accessory but in Korean for UI.
// SVG icon assets will replace the text labels in a future sprint.
const VARIANT_FACE_DEFAULT: Record<KkottiVariant, KkottiFaceState> = {
  gardener:   'idle',     // resting / neutral garden tending
  hunter:     'proud',    // satisfied keyword hunting / action
  cowgirl:    'proud',    // confident shipping action
  planter:    'idle',     // calm money seeding
  celebrator: 'done',     // celebrating completed harvests
};

const ACCESSORY_LABEL: Record<KkottiVariant, string> = {
  gardener:   '물조리개',        // watering can
  hunter:     '하트총',          // heart gun
  cowgirl:    '꽃잎 채찍',       // petal whip
  planter:    '돈 묘목',         // money seedling
  celebrator: '분수대 댄스',     // fountain dance
};

export default function SectionHeader({
  section,
  title,
  subtitle,
  variant,
  collapsed = false,
  onToggle,
  rightSlot,
}: SectionHeaderProps) {
  const preset = SECTION_PRESETS[section];
  const displayTitle    = title    ?? preset.title;
  const displaySubtitle = subtitle ?? preset.subtitle;
  const Icon = preset.Icon;
  const Chevron = collapsed ? ChevronDown : ChevronUp;

  // Part A2 (2026-05-04): Resolve persona variant.
  // Caller-supplied prop wins, otherwise fall back to the section default
  // (SECTION_VARIANT). This way the four dashboard sections each get a
  // consistent mascot signal even when callers omit `variant`.
  const resolvedVariant: KkottiVariant = variant ?? SECTION_VARIANT[section];
  const variantMeta = KKOTTI_VARIANTS[resolvedVariant];
  const faceState   = VARIANT_FACE_DEFAULT[resolvedVariant];
  const faceText    = KKOTTI_FACE[faceState];
  const accessoryLabel = ACCESSORY_LABEL[resolvedVariant];

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
            {/* Part A2: Mascot persona pill — face expression + accessory label.
                Sits inline with the title so it scales naturally with screen width. */}
            <span
              title={`${variantMeta.label} · ${variantMeta.signature}`}
              aria-label={`${variantMeta.label} 모드, ${accessoryLabel}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginLeft: 10,
                padding: '3px 9px',
                fontSize: 11,
                fontWeight: 700,
                color: '#E8001F',
                background: '#FEF0F3',
                border: '1px solid #F8DCE5',
                borderRadius: 999,
                verticalAlign: 'middle',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: 11,
                  color: '#E8001F',
                  letterSpacing: '-0.5px',
                }}
              >
                {faceText}
              </span>
              <span style={{ color: '#525252', fontWeight: 600 }}>
                {accessoryLabel}
              </span>
            </span>
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
