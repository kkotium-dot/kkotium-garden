// src/components/studio/assembly/DetailAssemblyBoard.tsx
// ============================================================================
// SLOT FUNNEL BOARD — SF-1 (read-only). Renders the 7 fixed detail-page sections
// (DETAIL_SECTIONS) alongside a per-product asset tray grouped by storage stage
// (GET /api/products/{id}/assets — storage-direct, the same source AssetBrowser
// uses). NO drag-and-drop, NO persistence, NO mutation — SF-1 visualizes what is
// available to assemble. Empty stages show a "생성 필요" hint + a studio deeplink
// (#56 intervention). Distinct from the engine's image-generation SlotFunnelBoard
// (components/studio/engine) — this lays generated assets INTO sections.
// Authority: SLOT_FUNNEL_BOARD_SPEC_2026-06-30.md. Lucide only; English comments.
// ============================================================================

'use client';

import { useCallback, useEffect, useState } from 'react';
import { LayoutGrid, ImageOff, Sparkles, Pin, ArrowRight } from 'lucide-react';
import { DETAIL_SECTIONS, STAGE_LABELS } from '@/lib/studio/detail-sections';

interface StageFile { name: string; path: string; publicUrl: string }
interface StageGroup { stage: string; count: number; files: StageFile[]; storagePath: string }
interface AssetsResponse { success: boolean; stages?: StageGroup[]; total?: number; error?: string }

export interface DetailAssemblyBoardProps {
  productId: string | null;
  /** #56 — jump to the studio image-generation step for an empty stage. */
  onNavigateToGenerate?: () => void;
}

export default function DetailAssemblyBoard({ productId, onNavigateToGenerate }: DetailAssemblyBoardProps) {
  const [data, setData] = useState<AssetsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!productId) { setData(null); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/assets`, { cache: 'no-store' });
      const json: AssetsResponse = await res.json();
      if (json.success) setData(json);
      else setError(json.error || '자산을 불러오지 못했습니다');
    } catch (e) {
      setError(e instanceof Error ? e.message : '자산을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { void load(); }, [load]);

  if (!productId) {
    return <Shell><p style={muted}>상품을 선택하면 상세 조립 보드가 표시됩니다.</p></Shell>;
  }
  if (loading) {
    return <Shell><p style={muted}>자산을 불러오는 중…</p></Shell>;
  }
  if (error) {
    return <Shell><p style={{ ...muted, color: 'var(--gp-red-500)' }}>{error}</p></Shell>;
  }

  // Only stages that carry assets show in the tray; empty canonical stages are
  // surfaced as a single "생성 필요" hint so the tray stays focused.
  const stages = data?.stages ?? [];
  const nonEmpty = stages.filter((s) => s.count > 0);
  const emptyStages = stages.filter((s) => s.count === 0 && STAGE_LABELS[s.stage]);

  return (
    <Shell>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 900, color: 'var(--gp-ink-900)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <LayoutGrid size={15} color="var(--gp-red-500)" strokeWidth={2.4} /> 상세 조립 보드
        </h3>
        <span style={{ fontSize: 11, color: 'var(--gp-ink-500)' }}>읽기 전용 · 7섹션 860px</span>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(260px, 1.3fr)', gap: 14, alignItems: 'start' }}>
        {/* ── Asset tray (left) — grouped by storage stage ─────────────────── */}
        <div>
          <p style={trayHead}>자산 트레이 (총 {data?.total ?? 0})</p>
          {nonEmpty.length === 0 ? (
            <div style={emptyCard}>
              <ImageOff size={18} color="var(--gp-ink-500)" />
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--gp-ink-700)', fontWeight: 700 }}>가공 자산이 아직 없습니다</p>
              {onNavigateToGenerate && (
                <button type="button" onClick={onNavigateToGenerate} style={genBtn}>
                  <Sparkles size={12} /> 이미지 생성으로 이동
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {nonEmpty.map((g) => (
                <div key={g.stage}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--gp-ink-900)' }}>{STAGE_LABELS[g.stage] ?? g.stage}</span>
                    <span style={stageCount}>{g.count}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {g.files.map((f) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={f.path} src={f.publicUrl} alt={f.name} title={f.name}
                        style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--gp-pink-50)' }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {emptyStages.length > 0 && (
            <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--gp-pink-50)', border: '1px dashed var(--color-border)' }}>
              <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: 'var(--gp-ink-700)' }}>생성 필요 단계</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                {emptyStages.map((g) => (
                  <span key={g.stage} style={emptyStageChip}>{STAGE_LABELS[g.stage] ?? g.stage}</span>
                ))}
              </div>
              {onNavigateToGenerate && (
                <button type="button" onClick={onNavigateToGenerate} style={{ ...genBtn, marginTop: 6 }}>
                  <Sparkles size={12} /> 이미지 생성으로 이동
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Section board (right) — 7 fixed sections, read-only ───────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {DETAIL_SECTIONS.map((sec, i) => (
            <div key={sec.key} style={{
              border: `1px ${sec.pinned ? 'solid' : 'dashed'} var(--color-border)`,
              borderRadius: 10, padding: '10px 12px',
              background: sec.pinned ? 'var(--gp-pink-50)' : 'var(--color-surface)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={secNum}>{i + 1}</span>
                <strong style={{ fontSize: 12.5, color: 'var(--gp-ink-900)' }}>{sec.label}</strong>
                {sec.pinned && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: 'var(--gp-ink-500)' }}>
                    <Pin size={10} /> 고정
                  </span>
                )}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--gp-ink-500)', lineHeight: 1.45 }}>{sec.guide}</p>
              {sec.suggestedStages.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  <span style={{ fontSize: 9.5, color: 'var(--gp-ink-500)', alignSelf: 'center' }}>추천 자산</span>
                  {sec.suggestedStages.map((st) => {
                    const has = nonEmpty.some((g) => g.stage === st);
                    return (
                      <span key={st} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 7px', borderRadius: 999,
                        fontSize: 10, fontWeight: 700,
                        background: has ? '#DCFCE7' : 'var(--gp-pink-50)',
                        color: has ? '#15803D' : 'var(--gp-ink-500)',
                        border: `1px solid ${has ? '#86EFAC' : 'var(--color-border)'}`,
                      }}>
                        {has && <ArrowRight size={9} />}{STAGE_LABELS[st] ?? st}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--gp-ink-500)' }}>
            SF-1 읽기 전용 — 슬롯 배정·드래그·내보내기는 다음 단계(SF-2~4)에서 추가됩니다.
          </p>
        </div>
      </div>
    </Shell>
  );
}

const muted: React.CSSProperties = { fontSize: 12, color: 'var(--gp-ink-500)', margin: 0, padding: '8px 0' };
const trayHead: React.CSSProperties = { margin: '0 0 8px', fontSize: 11, fontWeight: 800, color: 'var(--gp-ink-700)' };
const stageCount: React.CSSProperties = { fontSize: 10, fontWeight: 800, padding: '0 6px', borderRadius: 999, background: 'var(--gp-pink-50)', color: 'var(--gp-red-500)', border: '1px solid var(--color-border)' };
const secNum: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 999, background: 'var(--gp-red-500)', color: '#fff', fontSize: 10, fontWeight: 800, flexShrink: 0 };
const emptyCard: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '18px 12px', borderRadius: 10, border: '1px dashed var(--color-border)', background: 'var(--gp-pink-50)' };
const emptyStageChip: React.CSSProperties = { padding: '1px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'var(--color-surface)', color: 'var(--gp-ink-500)', border: '1px solid var(--color-border)' };
const genBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--gp-red-500)', background: 'var(--color-surface)', color: 'var(--gp-red-500)', fontSize: 11, fontWeight: 800, cursor: 'pointer' };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section style={{ padding: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)' }}>
      {children}
    </section>
  );
}
