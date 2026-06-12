// src/components/studio/index.ts
//
// Sprint 7-M2 Phase 3-C-1 — barrel export for Studio shared components.
// Consumers (src/app/studio/page.tsx + future PLANT 7th tab) import from
// this single entry instead of touching individual files.

export type {
  SkeletonIdLiteral,
  ThumbVariant,
  ProductRow,
  DiagnosisResult,
  ThumbnailOutput,
  ThumbnailResult,
  DetailResult,
  SaveResult,
  PublishResult,
} from './types';
export { SKELETON_IDS, THUMB_VARIANTS } from './types';

export {
  Card,
  Pill,
  PrimaryButton,
  SecondaryButton,
  pickGradePalette,
  fmtPrice,
} from './StudioCardShell';

export { useStudioActions, type UseStudioActionsResult } from './useStudioActions';

export { DiagnosisCard } from './DiagnosisCard';
export { ThumbnailCard } from './ThumbnailCard';
export { DetailPageCard } from './DetailPageCard';
export { ActionsCard } from './ActionsCard';
export { ProductListPane } from './ProductListPane';
export { default as AssetBrowser, type AssetBrowserProps } from './AssetBrowser';
