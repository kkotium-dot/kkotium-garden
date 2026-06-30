// src/lib/studio/detail-sections.ts
// ============================================================================
// SLOT FUNNEL BOARD / SF-1 (#55) — the 7 fixed detail-page sections.
// Authority: SLOT_FUNNEL_BOARD_SPEC_2026-06-30.md §1 + DETAIL_PAGE_PLAYBOOK §2.
//
// These are the ASSEMBLY sections of the 860px 상세페이지 — distinct from the
// engine's 9-slot IMAGE-GENERATION funnel (components/studio/engine/
// SlotFunnelBoard.tsx, which plans WHICH images to generate). This board lays
// the already-generated stage assets INTO these sections. Order is fixed;
// content is variable. Section 7 (공통안내) is a read-only store_settings pin.
//
// `suggestedStages` are the asset-taxonomy.ts stages (code truth) whose assets
// typically fill each section — a read-only hint for the operator, not a rule.
// Korean labels are isolated here (separate constants module, #3-1).
// ============================================================================

import type { AssetKind } from '@/lib/storage/automation-storage';

export interface DetailSection {
  key: string;
  label: string;       // operator-facing Korean
  guide: string;       // placeholder/guidance copy for an empty slot
  suggestedStages: readonly AssetKind[];
  /** Section 7 is the store-wide common notice pin — read-only, not assembled. */
  pinned?: boolean;
}

export const DETAIL_SECTIONS: readonly DetailSection[] = [
  { key: 'hook',   label: '후킹',        guide: '첫 화면 후킹 — 대표 비주얼 + 핵심 한 줄',        suggestedStages: ['thumbnail', 'composite'] },
  { key: 'value',  label: '가치 제안',   guide: '핵심 가치·차별점 — 베네핏 중심 비주얼',          suggestedStages: ['composite', 'detail'] },
  { key: 'spec',   label: '상세 스펙',   guide: '상세 스펙·구성 — 치수·소재·구성품',              suggestedStages: ['detail'] },
  { key: 'usage',  label: '사용법·활용', guide: '사용 씬·활용법 — TPO·연출컷',                    suggestedStages: ['composite', 'detail'] },
  { key: 'trust',  label: '신뢰 요소',   guide: '신뢰 요소 — 후기·인증·보증',                      suggestedStages: ['detail'] },
  { key: 'cta',    label: '구매 유도',   guide: '구매 유도 — 혜택·배송·마무리 카피',              suggestedStages: ['detail'] },
  { key: 'notice', label: '공통 안내',   guide: '공통 안내 — 스토어 상/하단 고정(읽기 전용)',     suggestedStages: [], pinned: true },
] as const;

// Operator-facing Korean labels for the asset-tray stages (asset-taxonomy.ts is
// the code truth for the keys; these are display-only). 'thumb'/'root' are legacy
// buckets the assets API may still surface.
export const STAGE_LABELS: Record<string, string> = {
  source: '원본',
  cutout: '누끼',
  plate: '배경판',
  reference: '참조',
  composite: '합성',
  thumbnail: '썸네일',
  detail: '상세',
  archive: '아카이브',
  thumb: '썸네일(레거시)',
  root: '미분류',
};

