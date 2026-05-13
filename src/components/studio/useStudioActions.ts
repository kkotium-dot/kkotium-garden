// src/components/studio/useStudioActions.ts
//
// Sprint 7-M2 Phase 3-C-1 — Studio action state + fetch handlers extracted
// from src/app/studio/page.tsx as a reusable hook.
//
// PLANT (Phase 3-C-2) will mount the same studio cards inside its 7th tab
// and call this hook with the saved product id, getting identical behavior.
//
// Returns 11 state fields + 5 async handlers + 2 derived booleans. The
// hook resets all state when `productId` changes so switching products
// doesn't leak stale results.
//
// Notes:
//   - `canPublish` is *not* returned because it depends on the caller's
//     view of `hasNaverId`. The caller computes:
//       canPublish = hooks.hasSavedAsset && hasNaverId && !hooks.publishBusy
//   - Handlers are no-op when productId is null (defensive against
//     mid-render product changes).

import { useEffect, useState } from 'react';
import type {
  DiagnosisResult,
  ThumbnailResult,
  DetailResult,
  SaveResult,
  PublishResult,
  ThumbVariant,
  SkeletonIdLiteral,
} from './types';

export interface UseStudioActionsResult {
  // Diagnosis
  diagnosis: DiagnosisResult | null;
  diagBusy: boolean;
  diagError: string | null;
  // Thumbnail
  thumbnails: ThumbnailResult | null;
  thumbBusy: boolean;
  thumbError: string | null;
  mainVariant: ThumbVariant;
  setMainVariant: (v: ThumbVariant) => void;
  // Detail
  detail: DetailResult | null;
  detailBusy: boolean;
  detailError: string | null;
  overrideSkeletonId: SkeletonIdLiteral | '';
  setOverrideSkeletonId: (s: SkeletonIdLiteral | '') => void;
  // Save
  save: SaveResult | null;
  saveBusy: boolean;
  saveError: string | null;
  // Publish
  publish: PublishResult | null;
  publishBusy: boolean;
  publishError: string | null;
  // Derived
  canSave: boolean;
  hasSavedAsset: boolean;
  // Handlers
  runDiagnose: () => Promise<void>;
  runThumbnail: () => Promise<void>;
  runDetail: () => Promise<void>;
  runSave: () => Promise<void>;
  runPublish: () => Promise<void>;
}

export function useStudioActions(productId: string | null): UseStudioActionsResult {
  // ── Diagnosis ──────────────────────────────────────────────────────────
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [diagBusy, setDiagBusy] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);

  // ── Thumbnail ──────────────────────────────────────────────────────────
  const [thumbnails, setThumbnails] = useState<ThumbnailResult | null>(null);
  const [thumbBusy, setThumbBusy] = useState(false);
  const [thumbError, setThumbError] = useState<string | null>(null);
  const [mainVariant, setMainVariant] = useState<ThumbVariant>('clean');

  // ── Detail page ────────────────────────────────────────────────────────
  const [detail, setDetail] = useState<DetailResult | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [overrideSkeletonId, setOverrideSkeletonId] = useState<SkeletonIdLiteral | ''>('');

  // ── Save (Supabase Storage) ────────────────────────────────────────────
  const [save, setSave] = useState<SaveResult | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Publish (Naver Commerce API patch) ─────────────────────────────────
  const [publish, setPublish] = useState<PublishResult | null>(null);
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // ── Reset all state when productId changes ─────────────────────────────
  useEffect(() => {
    setDiagnosis(null);
    setDiagError(null);
    setThumbnails(null);
    setThumbError(null);
    setDetail(null);
    setDetailError(null);
    setOverrideSkeletonId('');
    setSave(null);
    setSaveError(null);
    setPublish(null);
    setPublishError(null);
  }, [productId]);

  // ── Handlers ───────────────────────────────────────────────────────────

  async function runDiagnose() {
    if (!productId) return;
    setDiagBusy(true);
    setDiagError(null);
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, persist: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setDiagnosis(json as DiagnosisResult);
    } catch (err) {
      setDiagError(err instanceof Error ? err.message : String(err));
    } finally {
      setDiagBusy(false);
    }
  }

  async function runThumbnail() {
    if (!productId) return;
    setThumbBusy(true);
    setThumbError(null);
    try {
      const res = await fetch(`/api/thumbnail/${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setThumbnails(json as ThumbnailResult);
    } catch (err) {
      setThumbError(err instanceof Error ? err.message : String(err));
    } finally {
      setThumbBusy(false);
    }
  }

  async function runDetail() {
    if (!productId) return;
    setDetailBusy(true);
    setDetailError(null);
    try {
      const body: Record<string, string> = {};
      if (overrideSkeletonId) body.overrideSkeletonId = overrideSkeletonId;
      const res = await fetch(`/api/products/${productId}/generate-detail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setDetail(json as DetailResult);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetailBusy(false);
    }
  }

  async function runSave() {
    if (!productId) return;
    setSaveBusy(true);
    setSaveError(null);
    try {
      const body: Record<string, string> = {};
      if (thumbnails) {
        const mainOutput = thumbnails.outputs.find((o) => o.variant === mainVariant);
        if (mainOutput) {
          body.thumbBase64 = mainOutput.base64;
          body.thumbVariant = mainVariant;
        }
      }
      if (detail) {
        body.detailBase64 = detail.detailBase64;
        body.skeletonId = detail.skeletonId;
      }
      const res = await fetch(`/api/products/${productId}/save-assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setSave(json as SaveResult);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaveBusy(false);
    }
  }

  async function runPublish() {
    if (!productId || !save) return;
    setPublishBusy(true);
    setPublishError(null);
    try {
      const body: Record<string, string> = {};
      if (save.thumbUrl) body.thumbUrl = save.thumbUrl;
      if (save.detailUrl) body.detailUrl = save.detailUrl;
      const res = await fetch(`/api/products/${productId}/publish-assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setPublish(json as PublishResult);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : String(err));
    } finally {
      setPublishBusy(false);
    }
  }

  // ── Derived state ──────────────────────────────────────────────────────
  const canSave = (thumbnails != null || detail != null) && !saveBusy;
  const hasSavedAsset = !!(save && (save.thumbUrl || save.detailUrl));

  return {
    diagnosis, diagBusy, diagError,
    thumbnails, thumbBusy, thumbError, mainVariant, setMainVariant,
    detail, detailBusy, detailError, overrideSkeletonId, setOverrideSkeletonId,
    save, saveBusy, saveError,
    publish, publishBusy, publishError,
    canSave, hasSavedAsset,
    runDiagnose, runThumbnail, runDetail, runSave, runPublish,
  };
}
