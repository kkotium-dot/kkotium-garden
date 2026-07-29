'use client';
// src/app/products/[id]/preview/page.tsx
//
// Pre-publish review screen (handoff #4). Renders the representative + detail
// images with quality/OCR warnings, the exact Naver payload summary, and the
// readiness verdict. The publish button is enabled ONLY when canPublish
// (readiness A/S + zero image warnings + canRegister) and requires an explicit
// two-step confirm before the irreversible PUT.
//
// No emoji (Lucide icons). No Korean literals (publish-preview-strings.ko.json).

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import {
  CheckCircle2, AlertTriangle, XCircle, ArrowLeft, Loader2, ShieldCheck, ImageOff, ShieldAlert, Undo2,
} from 'lucide-react';
import strings from '@/lib/i18n/publish-preview-strings.ko.json';
import readinessStrings from '@/lib/i18n/publish-readiness-strings.ko.json';
import CropStudioPanel from '@/components/products/CropStudioPanel';
import { translateGateMessage } from '@/lib/naver/gate-message-i18n';
import { categoryFullPath } from '@/lib/naver/naver-categories-full';
import { originCodeLabel } from '@/lib/naver/naver-origin-codes';

const t = strings;
const NAVER_STATUS = readinessStrings.naverStatus as Record<string, string>;
const fetcher = (url: string) => fetch(url).then(r => r.json());

type CheckKey = 'resolutionOk' | 'uniformBg' | 'textFree' | 'singleSubject';

interface ReviewChecklistView { approved?: boolean; approvedAt?: string; note?: string }
interface ReviewData {
  success: boolean;
  review: { approved: boolean; reasons: string[] };
  reviewChecklist: ReviewChecklistView | null;
  readinessScore: number;
  blockingImageWarningCount: number;
}

interface EtcNotice { qualityAssuranceStandard?: string; itemName?: string; manufacturer?: string }
interface PreviewData {
  success: boolean;
  error?: string;
  productId: string;
  registered: boolean;
  naverProductId: string | null;
  readiness: {
    readinessGrade: string; readinessScore: number;
    attributeGrade: string; attributeScore: number;
    canRegister: boolean; missingRequired: string[]; errors: string[]; warnings: string[];
  };
  representative: {
    url: string | null; score: number | null;
    checks: Record<CheckKey, boolean> | null; ocrText: string | null;
    meta: { width: number; height: number } | null;
  };
  detail: { url: string | null; score: number | null; occupancy: number | null; meta: { width: number; height: number } | null };
  repWarnings: string[];
  detailWarnings: string[];
  imageWarnings: string[];
  summary: {
    name: string; leafCategoryId: string; salePrice: number; statusType: string;
    representativeImage: string; optionalImageCount: number;
    originAreaInfo?: { originAreaCode: string; content?: string } | null;
    sellerTags: string[]; optionCombinationValues: string[];
    productInfoProvidedNotice?: { etc?: EtcNotice } | null;
  };
  canPublish: boolean;
  gateReasons: { readinessOk: boolean; canRegister: boolean; imageWarningCount: number };
}

function gradeColor(grade: string) {
  if (grade === 'S' || grade === 'A') return { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D' };
  if (grade === 'B') return { bg: '#FEFCE8', border: '#FDE68A', text: '#A16207' };
  return { bg: '#FFF0EF', border: '#FFD6D3', text: '#C2410C' };
}

function WarnList({ keys }: { keys: string[] }) {
  if (keys.length === 0) {
    return (
      <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-green-700">
        <CheckCircle2 size={13} /> {t.ok}
      </p>
    );
  }
  return (
    <ul className="mt-2 space-y-1">
      {keys.map(k => (
        <li key={k} className="flex items-start gap-1.5 text-xs text-orange-700">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>{(t.warning as Record<string, string>)[k] ?? k}</span>
        </li>
      ))}
    </ul>
  );
}

function CheckChip({ label, ok }: { label: string; ok: boolean }) {
  const c = ok
    ? { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D' }
    : { bg: '#FFF0EF', border: '#FFD6D3', text: '#C2410C' };
  const Icon = ok ? CheckCircle2 : XCircle;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: c.bg, border: `1px solid ${c.border}`, color: c.text }}
    >
      <Icon size={11} /> {label}
    </span>
  );
}

export default function PublishPreviewPage({ params }: { params: { id: string } }) {
  const productId = params.id;
  const { data, error, isLoading, mutate } = useSWR<PreviewData>(
    `/api/products/${productId}/publish-preview`,
    fetcher,
  );
  const { data: reviewData, mutate: mutateReview } = useSWR<ReviewData>(
    `/api/products/${productId}/review-approve`,
    fetcher,
  );

  const [confirming, setConfirming] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [reviewActing, setReviewActing] = useState(false);
  const [reviewResult, setReviewResult] = useState<{ ok: boolean; message: string } | null>(null);

  // 2026-07-30 (#317 방향, Desktop 실측 — 프로덕션 무한로딩 체감) — 이 화면의
  // publish-preview 응답은 대표·상세 이미지 OCR·품질검사를 포함해 정상 상태에서도
  // 수 초가 걸린다(근본 원인은 next.config.js의 tesseract 워커 번들 누락 수정으로
  // 별도 처리 — 여기는 그와 무관하게 남는 체감 문제: 몇 초가 걸리는지 안내가 없어
  // "멈췄나?"로 보인다). 2.5초 넘으면 무엇을 하고 있는지 구체적으로 알려준다.
  const [showAnalyzing, setShowAnalyzing] = useState(false);
  useEffect(() => {
    if (!isLoading) { setShowAnalyzing(false); return; }
    const t = setTimeout(() => setShowAnalyzing(true), 2500);
    return () => clearTimeout(t);
  }, [isLoading]);

  async function doReviewAction(action: 'approve' | 'revoke') {
    setReviewActing(true);
    setReviewResult(null);
    try {
      const res = await fetch(`/api/products/${productId}/review-approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const j = await res.json();
      if (res.ok && j.success) {
        mutateReview();
      } else {
        setReviewResult({ ok: false, message: `${action === 'approve' ? t.review.approveFail : t.review.revokeFail}: ${j.error ?? res.status}` });
      }
    } catch (e) {
      setReviewResult({ ok: false, message: `${action === 'approve' ? t.review.approveFail : t.review.revokeFail}: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setReviewActing(false);
    }
  }

  async function doPublish() {
    setPublishing(true);
    setResult(null);
    try {
      const res = await fetch('/api/naver/products/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, confirm: true }),
      });
      const j = await res.json();
      if (res.ok && j.success) {
        setResult({ ok: true, message: t.publish.success });
        mutate();
      } else {
        setResult({ ok: false, message: `${t.publish.fail}: ${j.error ?? res.status}` });
      }
    } catch (e) {
      setResult({ ok: false, message: `${t.publish.fail}: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setPublishing(false);
      setConfirming(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <a href={`/products/${productId}`} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> {productId}
      </a>
      <h1 className="text-lg font-semibold text-slate-800">{t.title}</h1>
      <p className="mb-4 text-sm text-slate-500">{t.subtitle}</p>

      {isLoading && (
        <p className="flex items-center gap-1.5 text-sm text-slate-400">
          <Loader2 size={14} className="animate-spin" />
          {showAnalyzing ? t.loadingAnalyzing : t.loading}
        </p>
      )}
      {(error || (data && !data.success)) && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">{t.error.title}{data?.error ? ` — ${data.error}` : ''}</p>
          <button onClick={() => mutate()} className="mt-2 text-xs font-medium text-blue-600 hover:underline">{t.error.retry}</button>
        </div>
      )}

      {data && data.success && (
        <div className="space-y-4">
          {/* Readiness */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">{t.section.readiness}</h2>
            <div className="flex flex-wrap items-center gap-2">
              {(() => {
                const c = gradeColor(data.readiness.readinessGrade);
                return (
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: c.bg, border: `1px solid ${c.border}`, color: c.text }}
                  >
                    {t.readiness.grade} {data.readiness.readinessGrade}/{data.readiness.readinessScore}
                  </span>
                );
              })()}
              <span className="text-xs text-slate-500">
                {t.readiness.attribute} {data.readiness.attributeGrade}/{data.readiness.attributeScore}
              </span>
            </div>
            {data.readiness.missingRequired.length > 0 && (
              <p className="mt-2 text-xs text-orange-700">{t.readiness.missing}: {data.readiness.missingRequired.join(', ')}</p>
            )}
            {data.readiness.errors.length > 0 && (
              <p className="mt-1 text-xs text-red-700">{t.readiness.errors}: {data.readiness.errors.map(translateGateMessage).join('; ')}</p>
            )}
          </section>

          {/* Representative image */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">{t.section.representative}</h2>
            <div className="flex gap-4">
              <div className="h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                {data.representative.url
                  ? <img src={data.representative.url} alt="representative" className="h-full w-full object-contain" />
                  : <div className="flex h-full w-full items-center justify-center text-slate-300"><ImageOff size={28} /></div>}
              </div>
              <div className="min-w-0 flex-1">
                {data.representative.meta && (
                  <p className="text-xs text-slate-400">
                    {data.representative.meta.width}x{data.representative.meta.height}
                    {data.representative.score != null ? ` · ${data.representative.score}` : ''}
                  </p>
                )}
                {data.representative.checks && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {(['resolutionOk', 'uniformBg', 'textFree', 'singleSubject'] as CheckKey[]).map(k => (
                      <CheckChip key={k} label={t.checks[k]} ok={data.representative.checks![k]} />
                    ))}
                  </div>
                )}
                {data.representative.ocrText && (
                  <p className="mt-1 text-[11px] text-orange-600">OCR: {data.representative.ocrText}</p>
                )}
                <WarnList keys={data.repWarnings} />
              </div>
            </div>
          </section>

          {/* Crop studio (T1) — fix the representative right where it is reviewed */}
          <CropStudioPanel
            productId={productId}
            repUrl={data.representative.url}
            detailUrl={data.detail.url}
            onApplied={() => mutate()}
          />

          {/* Detail image */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">{t.section.detail}</h2>
            <div className="flex gap-4">
              <div className="h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                {data.detail.url
                  ? <img src={data.detail.url} alt="detail" className="h-full w-full object-cover object-top" />
                  : <div className="flex h-full w-full items-center justify-center text-slate-300"><ImageOff size={28} /></div>}
              </div>
              <div className="min-w-0 flex-1">
                {data.detail.meta && (
                  <p className="text-xs text-slate-400">
                    {data.detail.meta.width}x{data.detail.meta.height}
                    {data.detail.score != null ? ` · ${data.detail.score}` : ''}
                    {data.detail.occupancy != null ? ` · ${Math.round(data.detail.occupancy * 100)}%` : ''}
                  </p>
                )}
                <WarnList keys={data.detailWarnings} />
              </div>
            </div>
          </section>

          {/* Payload summary */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">{t.section.payload}</h2>
            <dl className="space-y-1.5 text-xs">
              <Row label={t.payload.name} value={data.summary.name} />
              <Row label={t.payload.category} value={categoryFullPath(data.summary.leafCategoryId)} />
              <Row label={t.payload.price} value={`${data.summary.salePrice.toLocaleString('ko-KR')}원`} />
              <Row label={t.payload.statusType} value={NAVER_STATUS[data.summary.statusType] ?? data.summary.statusType} />
              <Row label={t.payload.tags} value={data.summary.sellerTags.join(', ') || '-'} />
              <Row label={t.payload.options} value={data.summary.optionCombinationValues.join(' / ') || '-'} />
              <Row
                label={t.payload.origin}
                value={(() => {
                  const o = data.summary.originAreaInfo;
                  if (!o) return '-';
                  const label = originCodeLabel(o.originAreaCode);
                  return o.content && o.content !== label ? `${label} (${o.content})` : label;
                })()}
              />
              <Row
                label={t.payload.notice}
                value={data.summary.productInfoProvidedNotice?.etc?.qualityAssuranceStandard ?? t.payload.noticeNone}
              />
            </dl>
          </section>

          {/* Review approval (ADR-0003) */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">{t.review.title}</h2>
            {!reviewData ? (
              <p className="text-xs text-slate-400">{t.loading}</p>
            ) : (
              <>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {reviewData.review.approved ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: '#F0FDF4', border: '1px solid #86EFAC', color: '#15803D' }}>
                      <ShieldCheck size={13} /> {t.review.approved}
                    </span>
                  ) : reviewData.reviewChecklist?.approved === false && reviewData.review.reasons.includes('REVIEW_STALE') ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: '#FEFCE8', border: '1px solid #FDE68A', color: '#A16207' }}>
                      <ShieldAlert size={13} /> {t.review.stale}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', color: '#475569' }}>
                      {t.review.notReviewed}
                    </span>
                  )}
                  {reviewData.reviewChecklist?.approvedAt && (
                    <span className="text-[11px] text-slate-400">
                      {t.review.approvedAt}: {new Date(reviewData.reviewChecklist.approvedAt).toLocaleString('ko-KR')}
                    </span>
                  )}
                </div>

                {reviewResult && (
                  <p className={`mb-2 text-xs font-medium ${reviewResult.ok ? 'text-green-700' : 'text-red-700'}`}>{reviewResult.message}</p>
                )}

                {reviewData.review.approved ? (
                  <button
                    type="button"
                    disabled={reviewActing}
                    onClick={() => doReviewAction('revoke')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-60"
                  >
                    {reviewActing ? <Loader2 size={13} className="animate-spin" /> : <Undo2 size={13} />}
                    {reviewActing ? t.review.revoking : t.review.revokeBtn}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={reviewActing || reviewData.readinessScore < 100 || reviewData.blockingImageWarningCount > 0}
                    onClick={() => doReviewAction('approve')}
                    title={reviewData.readinessScore < 100 || reviewData.blockingImageWarningCount > 0 ? t.review.approveDisabledHint : ''}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    {reviewActing ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                    {reviewActing ? t.review.approving : t.review.approveBtn}
                  </button>
                )}
                {(reviewData.readinessScore < 100 || reviewData.blockingImageWarningCount > 0) && !reviewData.review.approved && (
                  <p className="mt-2 text-xs text-slate-400">{t.review.approveDisabledHint}</p>
                )}
              </>
            )}
          </section>

          {/* Publish gate */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex flex-wrap gap-1.5">
              <CheckChip label={t.gate.readinessOk} ok={data.gateReasons.readinessOk} />
              <CheckChip label={t.gate.canRegister} ok={data.gateReasons.canRegister} />
              <CheckChip label={t.gate.imageClean} ok={data.gateReasons.imageWarningCount === 0} />
            </div>

            {!data.registered && (
              <p className="mb-2 text-xs text-amber-700">{t.publish.notRegisteredHint}</p>
            )}

            {result && (
              <p className={`mb-2 text-sm font-medium ${result.ok ? 'text-green-700' : 'text-red-700'}`}>{result.message}</p>
            )}

            {!confirming ? (
              <button
                type="button"
                disabled={!data.canPublish || !data.registered || publishing}
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                title={data.canPublish ? '' : t.publish.disabledHint}
              >
                <ShieldCheck size={15} /> {t.publish.ready}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-red-700">{t.publish.confirm}</span>
                <button
                  type="button"
                  disabled={publishing}
                  onClick={doPublish}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {publishing ? <Loader2 size={14} className="animate-spin" /> : null}
                  {t.publish.confirmYes}
                </button>
                <button
                  type="button"
                  disabled={publishing}
                  onClick={() => setConfirming(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600"
                >
                  {t.publish.cancel}
                </button>
              </div>
            )}
            {!data.canPublish && <p className="mt-2 text-xs text-slate-400">{t.publish.disabledHint}</p>}
          </section>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-slate-400">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-slate-700">{value}</dd>
    </div>
  );
}
