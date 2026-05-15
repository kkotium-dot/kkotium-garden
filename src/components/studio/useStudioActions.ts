// src/components/studio/useStudioActions.ts
//
// Sprint 7-M2 Phase 3-C-1 — Studio action state + fetch handlers extracted
// from src/app/studio/page.tsx as a reusable hook.
//
// Sprint 7-M2 Phase 3-C-3 — handlers now return their result objects
// (or null on failure) so runFullSequence can chain them by passing fresh
// data through optional override parameters, sidestepping the React
// closure problem (state updates aren't visible until the next render).
//
// PLANT (Phase 3-C-2/3) mounts the same studio cards inside its 7th tab
// and calls this hook with the saved product id, getting identical
// behavior. PLANT also calls runFullSequence on mount when the user opted
// into "register-then-autorun".
//
// Notes:
//   - `canPublish` is *not* returned because it depends on the caller's
//     view of `hasNaverId`. The caller computes:
//       canPublish = hooks.hasSavedAsset && hasNaverId && !hooks.publishBusy
//   - Handlers are no-op when productId is null (defensive against
//     mid-render product changes).
//   - Existing `onRun: () => void` props in the cards still accept the
//     handlers since `() => Promise<X>` is assignable to `() => void`
//     (the caller ignores the return).

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

export interface RunSaveOverrides {
  thumbnails?: ThumbnailResult | null;
  mainVariant?: ThumbVariant;
  detail?: DetailResult | null;
}

export interface RunFullSequenceOptions {
  hasNaverId?: boolean;
  withDetail?: boolean;
}

export interface RunFullSequenceResult {
  stages: string[];
  error?: string;
}

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
  // Sequence
  sequenceBusy: boolean;
  sequenceStages: string[];
  sequenceError: string | null;
  // Handlers — return their result so callers can chain (Phase 3-C-3)
  runDiagnose: () => Promise<DiagnosisResult | null>;
  runThumbnail: () => Promise<ThumbnailResult | null>;
  runDetail: () => Promise<DetailResult | null>;
  runSave: (overrides?: RunSaveOverrides) => Promise<SaveResult | null>;
  runPublish: (saveOverride?: SaveResult | null) => Promise<PublishResult | null>;
  runFullSequence: (opts?: RunFullSequenceOptions) => Promise<RunFullSequenceResult>;
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

  // ── Sequence (Phase 3-C-3 autorun) ─────────────────────────────────────
  const [sequenceBusy, setSequenceBusy] = useState(false);
  const [sequenceStages, setSequenceStages] = useState<string[]>([]);
  const [sequenceError, setSequenceError] = useState<string | null>(null);

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
    setSequenceStages([]);
    setSequenceError(null);
  }, [productId]);

  // ── Handlers ───────────────────────────────────────────────────────────

  async function runDiagnose(): Promise<DiagnosisResult | null> {
    if (!productId) return null;
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
      const result = json as DiagnosisResult;
      setDiagnosis(result);
      return result;
    } catch (err) {
      setDiagError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setDiagBusy(false);
    }
  }

  async function runThumbnail(): Promise<ThumbnailResult | null> {
    if (!productId) return null;
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
      const result = json as ThumbnailResult;
      setThumbnails(result);
      return result;
    } catch (err) {
      setThumbError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setThumbBusy(false);
    }
  }

  async function runDetail(): Promise<DetailResult | null> {
    if (!productId) return null;
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
      const result = json as DetailResult;
      setDetail(result);
      return result;
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setDetailBusy(false);
    }
  }

  async function runSave(overrides?: RunSaveOverrides): Promise<SaveResult | null> {
    if (!productId) return null;
    setSaveBusy(true);
    setSaveError(null);
    try {
      // Phase 3-C-3: prefer overrides (fresh data from sequence) over state
      // to avoid the React closure stale-read problem.
      const thumbsToUse = overrides?.thumbnails !== undefined ? overrides.thumbnails : thumbnails;
      const detailToUse = overrides?.detail !== undefined ? overrides.detail : detail;
      const variantToUse = overrides?.mainVariant ?? mainVariant;

      const body: Record<string, string> = {};
      if (thumbsToUse) {
        const mainOutput = thumbsToUse.outputs.find((o) => o.variant === variantToUse);
        if (mainOutput) {
          body.thumbBase64 = mainOutput.base64;
          body.thumbVariant = variantToUse;
        }
      }
      if (detailToUse) {
        body.detailBase64 = detailToUse.detailBase64;
        body.skeletonId = detailToUse.skeletonId;
      }
      const res = await fetch(`/api/products/${productId}/save-assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      const result = json as SaveResult;
      setSave(result);
      return result;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setSaveBusy(false);
    }
  }

  async function runPublish(saveOverride?: SaveResult | null): Promise<PublishResult | null> {
    if (!productId) return null;
    const saveToUse = saveOverride !== undefined ? saveOverride : save;
    if (!saveToUse) return null;
    setPublishBusy(true);
    setPublishError(null);
    try {
      const body: Record<string, string> = {};
      if (saveToUse.thumbUrl) body.thumbUrl = saveToUse.thumbUrl;
      if (saveToUse.detailUrl) body.detailUrl = saveToUse.detailUrl;
      const res = await fetch(`/api/products/${productId}/publish-assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      const result = json as PublishResult;
      setPublish(result);
      return result;
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setPublishBusy(false);
    }
  }

  // ── Sequence (Phase 3-C-3 autorun) ─────────────────────────────────────
  // Chains diagnose → thumbnail → save → publish using returned values
  // (not state reads, which would be stale due to React closure capture).
  // detail is opt-in (heavy + customizable) — default off to keep autorun fast.
  async function runFullSequence(opts?: RunFullSequenceOptions): Promise<RunFullSequenceResult> {
    if (!productId) return { stages: [], error: 'no productId' };
    setSequenceBusy(true);
    setSequenceStages([]);
    setSequenceError(null);
    const stages: string[] = [];
    const finish = (error?: string): RunFullSequenceResult => {
      setSequenceStages(stages);
      if (error) setSequenceError(error);
      setSequenceBusy(false);
      return { stages, error };
    };
    try {
      // Stage 1: Diagnose
      const diag = await runDiagnose();
      if (!diag) return finish('diagnose failed');
      stages.push('diagnose');
      setSequenceStages([...stages]);

      // Stage 2: Thumbnail
      const thumb = await runThumbnail();
      if (!thumb) return finish('thumbnail failed');
      stages.push('thumbnail');
      setSequenceStages([...stages]);

      // Stage 3 (optional): Detail
      let detailResult: DetailResult | null = null;
      if (opts?.withDetail) {
        detailResult = await runDetail();
        if (!detailResult) return finish('detail failed');
        stages.push('detail');
        setSequenceStages([...stages]);
      }

      // Stage 4: Save (uses fresh thumb + optional detail via overrides)
      const saved = await runSave({ thumbnails: thumb, detail: detailResult });
      if (!saved) return finish('save failed');
      stages.push('save');
      setSequenceStages([...stages]);

      // Stage 5 (conditional): Publish — only when caller confirms naver id
      if (opts?.hasNaverId) {
        const pub = await runPublish(saved);
        if (!pub) return finish('publish failed');
        stages.push('publish');
        setSequenceStages([...stages]);
      }

      return finish();
    } catch (err) {
      return finish(err instanceof Error ? err.message : String(err));
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
    sequenceBusy, sequenceStages, sequenceError,
    runDiagnose, runThumbnail, runDetail, runSave, runPublish, runFullSequence,
  };
}
