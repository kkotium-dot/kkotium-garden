// src/components/studio/ActionsCard.tsx
//
// Sprint 7-M2 Phase 3-C-1 — Save + Publish actions (step 4) card extracted
// from src/app/studio/page.tsx. Markup byte-identical to the original.
//
// Two-row layout:
//   Row 1: Save button (Supabase Storage upload) + saveHint when disabled.
//   Row 2: Publish button (Naver Commerce API patch) + 2 disabled hints
//          (no asset / no naverId).
// Status panels below: save error, save success (with URLs), publish error,
// publish success (with naverProductId + patched flags).

import { Save, Send, CheckCircle2 } from 'lucide-react';
import strings from '@/lib/i18n/studio-strings.ko.json';
import { Card, PrimaryButton } from './StudioCardShell';
import type { SaveResult, PublishResult } from './types';

export function ActionsCard({
  canSave, saveBusy, save, saveError, onSave,
  canPublish, publishBusy, publish, publishError, onPublish,
  hasSavedAsset, hasNaverId,
}: {
  canSave: boolean;
  saveBusy: boolean;
  save: SaveResult | null;
  saveError: string | null;
  onSave: () => void;
  canPublish: boolean;
  publishBusy: boolean;
  publish: PublishResult | null;
  publishError: string | null;
  onPublish: () => void;
  hasSavedAsset: boolean;
  hasNaverId: boolean;
}) {
  const showSaveHint = !canSave && !saveBusy && save == null;
  const showPublishNeedSaveHint = !hasSavedAsset && !publishBusy && publish == null;
  const showPublishNeedNaverHint = hasSavedAsset && !hasNaverId && !publishBusy && publish == null;

  return (
    <Card
      title={strings.actions.title}
      accent="#1F2937"
      step={4}
      totalSteps={4}
      done={save != null || publish != null}
    >
      {/* ── Save row ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <PrimaryButton
          onClick={onSave}
          disabled={!canSave}
          busy={saveBusy}
          icon={<Save size={16} />}
        >
          {saveBusy ? strings.actions.saving : strings.actions.saveButton}
        </PrimaryButton>
        {showSaveHint && (
          <span style={{
            fontSize: 12, color: '#a16207', fontWeight: 600,
            background: '#fefce8', border: '1px solid #fde68a',
            borderRadius: 6, padding: '6px 10px',
          }}>
            ⓘ {strings.actions.saveHint}
          </span>
        )}
      </div>

      {/* ── Publish row ───────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <PrimaryButton
          onClick={onPublish}
          disabled={!canPublish}
          busy={publishBusy}
          icon={<Send size={16} />}
        >
          {publishBusy ? strings.actions.publishing : strings.actions.publishButton}
        </PrimaryButton>
        {showPublishNeedSaveHint && (
          <span style={{
            fontSize: 12, color: '#7A6873', fontWeight: 600,
            background: '#F5F0F2', border: '1px solid #FFE0EC',
            borderRadius: 6, padding: '6px 10px',
          }}>
            ⓘ {strings.actions.publishHintNeedSave}
          </span>
        )}
        {showPublishNeedNaverHint && (
          <span style={{
            fontSize: 12, color: '#a16207', fontWeight: 600,
            background: '#fefce8', border: '1px solid #fde68a',
            borderRadius: 6, padding: '6px 10px',
          }}>
            ⚠ {strings.actions.publishHintNeedNaverId}
          </span>
        )}
      </div>

      {/* ── Save error ───────────────────────────────────────── */}
      {saveError && (
        <div style={{
          padding: 10, background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 8, color: '#b91c1c', fontSize: 12, fontWeight: 600,
          marginBottom: 8,
        }}>
          {strings.actions.saveError} {saveError}
        </div>
      )}

      {/* ── Save success ─────────────────────────────────────── */}
      {save && (
        <div style={{
          padding: 12, background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 8, fontSize: 12, fontWeight: 500, color: '#15803d',
          marginBottom: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 700 }}>
            <CheckCircle2 size={14} /> {strings.actions.saved}
          </div>
          {save.thumbUrl && (
            <p style={{ margin: '4px 0', wordBreak: 'break-all' }}>
              <b>{strings.actions.savedThumb}</b>{' '}
              <a href={save.thumbUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#15803d' }}>{save.thumbUrl}</a>
            </p>
          )}
          {save.detailUrl && (
            <p style={{ margin: '4px 0', wordBreak: 'break-all' }}>
              <b>{strings.actions.savedDetail}</b>{' '}
              <a href={save.detailUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#15803d' }}>{save.detailUrl}</a>
            </p>
          )}
        </div>
      )}

      {/* ── Publish error ────────────────────────────────────── */}
      {publishError && (
        <div style={{
          padding: 10, background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 8, color: '#b91c1c', fontSize: 12, fontWeight: 600,
          marginBottom: 8,
        }}>
          {strings.actions.publishError} {publishError}
        </div>
      )}

      {/* ── Publish success ─────────────────────────────────── */}
      {publish && (
        <div style={{
          padding: 12, background: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: 8, fontSize: 12, fontWeight: 500, color: '#1d4ed8',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
            <CheckCircle2 size={14} /> {strings.actions.publishSuccess}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 11 }}>
            naverProductId: <code style={{ background: '#dbeafe', padding: '1px 6px', borderRadius: 4 }}>{publish.naverProductId}</code>
            {' · '}patched: {publish.patched.thumbnail ? strings.actions.publishPatchedThumb : ''}{publish.patched.thumbnail && publish.patched.detail ? strings.actions.publishPatchedSep : ''}{publish.patched.detail ? strings.actions.publishPatchedDetail : ''}
          </p>
        </div>
      )}
    </Card>
  );
}
