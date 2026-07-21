// src/components/common/BadgeRail.tsx
// ============================================================================
// BadgeRail — 폭에 맞춰 스스로 접히는 배지 레일 (작업원칙 #274, #233).
//
// 여러 배지를 세로로 쌓는 대신 한 줄에 싣고, **실제로 들어가는 만큼만** 보여준 뒤
// 나머지는 "+N" 칩 뒤로 접는다. 정보는 하나도 버리지 않는다 — 칩을 누르면 접힌
// 배지가 그대로 나온다(#233 해법: 삭제가 아니라 순서 + 접기).
//
// ── 왜 "고정 개수"가 아니라 "실측"인가 ──────────────────────────────────────
// 처음엔 상위 3개 고정 노출로 만들었으나, 이름 칸이 좁아지는 화면에서 3개가 안
// 들어가 배지가 잘려 나갔다(브라우저 실측으로 확인). 배지 폭은 내용에 따라 제각각
// ("좀비 발견 · 순마진 0.0% — 마진 위기"는 200px, "연동"은 34px)이라 개수로는
// 절대 맞출 수 없다. 그래서 컨테이너 폭과 각 배지의 실제 폭을 재서 들어가는
// 만큼만 노출한다 — 화면폭·컬럼구성·배지문구가 어떻게 바뀌어도 스스로 맞는다.
//
// 측정은 화면 밖 미러(visibility:hidden·absolute)에서 하므로 레이아웃에 영향이
// 없고, ResizeObserver로 컨테이너 폭 변화에만 반응한다(무한 루프 없음).
//
// ── 팝오버 관례는 OverflowMenu를 그대로 따른다(#62) ──────────────────────────
//   - document.body 포털 + position:fixed → 조상의 overflow:hidden에 잘리거나
//     다음 행 배경 뒤에 깔리지 않는다
//   - 트리거 rect 측정 후 뷰포트 clamp, scroll/resize에 재측정
//   - 바깥 클릭 · Escape로 닫힘
//
// 행 전체가 클릭 가능한 목록(상품 목록 → 사이드패널)에서 쓰이므로 트리거와
// 팝오버는 클릭을 반드시 stopPropagation한다 — 배지를 보려다 패널이 열리면 안 된다.
//
// 제품 로직 없음(#55) — 무엇이 중요한지는 badge-priority.ts가 정한다.
// ============================================================================

'use client';

import { ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface BadgeRailItem {
  key: string;
  /** 낮을수록 먼저 보인다. badge-priority.ts의 BADGE_PRIORITY를 쓸 것. */
  priority: number;
  node: ReactNode;
}

export interface BadgeRailProps {
  items: Array<BadgeRailItem | null | false | undefined>;
  /**
   * 상시 노출 상한. 폭이 남아도 이 개수를 넘기지 않는다. 기본은 제한 없음 —
   * 폭이 곧 제한이기 때문. 시각적으로 과하다고 느끼면 낮춰서 쓴다.
   */
  max?: number;
  /** 레일 앞에 붙일 고정 요소(예: SKU). 접기 대상이 아니며 폭 계산에서 제외된다. */
  lead?: ReactNode;
  /** 레일 앞 고정 요소가 차지할 최대 폭(px). 나머지를 배지가 쓴다. */
  leadMaxWidth?: number;
}

const POPOVER_WIDTH = 240;
const GAP = 4;
const CHIP_RESERVE = 34; // "+N" 칩 + gap 예상 폭

export default function BadgeRail({ items, max, lead, leadMaxWidth = 128 }: BadgeRailProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [visibleCount, setVisibleCount] = useState<number>(0);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const mirrorRef = useRef<HTMLDivElement | null>(null);

  const sorted = useMemo(
    () => (items.filter(Boolean) as BadgeRailItem[]).slice().sort((a, b) => a.priority - b.priority),
    [items],
  );

  useEffect(() => setMounted(true), []);

  // ── 실측: 컨테이너에 들어가는 배지 개수를 센다 ────────────────────────────
  const measure = useCallback(() => {
    const rail = railRef.current;
    const mirror = mirrorRef.current;
    if (!rail || !mirror) return;

    const total = sorted.length;
    if (total === 0) { setVisibleCount(0); return; }

    // 레일 가용폭 = 전체폭 - lead가 실제로 쓰는 폭
    const leadEl = rail.querySelector('[data-rail-lead]') as HTMLElement | null;
    const leadW = leadEl ? Math.min(leadEl.getBoundingClientRect().width, leadMaxWidth) + GAP : 0;
    const available = rail.clientWidth - leadW;
    if (available <= 0) { setVisibleCount(0); return; }

    const widths = Array.from(mirror.children).map((c) => (c as HTMLElement).getBoundingClientRect().width);

    // 1) 전부 들어가나?
    const allWidth = widths.reduce((a, w) => a + w, 0) + GAP * Math.max(0, total - 1);
    if (allWidth <= available) {
      setVisibleCount(max ? Math.min(total, max) : total);
      return;
    }
    // 2) 안 들어가면 "+N" 칩 자리를 빼고 다시 센다
    let used = 0;
    let fit = 0;
    for (let i = 0; i < total; i++) {
      const next = used + widths[i] + (i > 0 ? GAP : 0);
      if (next + CHIP_RESERVE > available) break;
      used = next;
      fit++;
    }
    // 하나도 안 들어가도 최우선 배지 1개는 보여준다 — 가장 중요한 신호가
    // 통째로 숨는 것이 폭 초과보다 나쁘다.
    const capped = max ? Math.min(fit, max) : fit;
    setVisibleCount(Math.max(1, capped));
  }, [sorted, max, leadMaxWidth]);

  useLayoutEffect(() => { measure(); }, [measure]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(rail);
    return () => ro.disconnect();
  }, [measure]);

  const visible = sorted.slice(0, visibleCount);
  const hidden = sorted.slice(visibleCount);

  useEffect(() => {
    if (hidden.length === 0 && open) setOpen(false);
  }, [hidden.length, open]);

  const reposition = () => {
    const t = triggerRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left, window.innerWidth - POPOVER_WIDTH - 8));
    const top = Math.min(r.bottom + 4, window.innerHeight - 8);
    setPos({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const tgt = e.target as Node;
      if (triggerRef.current?.contains(tgt)) return;
      if (popRef.current?.contains(tgt)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onScrollResize = () => reposition();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScrollResize, true);
    window.addEventListener('resize', onScrollResize);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScrollResize, true);
      window.removeEventListener('resize', onScrollResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (sorted.length === 0 && !lead) return null;

  return (
    <div
      ref={railRef}
      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: GAP, minWidth: 0, flexWrap: 'nowrap', overflow: 'hidden' }}
    >
      {lead && (
        <span data-rail-lead style={{ display: 'inline-flex', minWidth: 0, maxWidth: leadMaxWidth, flexShrink: 1 }}>
          {lead}
        </span>
      )}

      {visible.map((it) => (
        <span key={it.key} style={{ flexShrink: 0, display: 'inline-flex' }}>{it.node}</span>
      ))}

      {hidden.length > 0 && (
        <>
          <button
            ref={triggerRef}
            type="button"
            aria-label={`배지 ${hidden.length}개 더보기`}
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
            style={{
              flexShrink: 0, display: 'inline-flex', alignItems: 'center',
              fontSize: 10, fontWeight: 700, lineHeight: 1,
              color: open ? '#4A3B42' : '#8a7680',
              background: open ? '#FFF5F8' : '#F7F5F6',
              border: '1px solid #E6DDE1', borderRadius: 6,
              padding: '2px 6px', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            +{hidden.length}
          </button>
          {open && mounted && createPortal(
            <div
              ref={popRef}
              role="dialog"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed', top: pos.top, left: pos.left, width: POPOVER_WIDTH,
                background: '#fff', border: '1px solid #E6DDE1', borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.16)', padding: 8, zIndex: 9999,
                display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 5,
              }}
            >
              {hidden.map((it) => (
                <span key={it.key} style={{ display: 'inline-flex' }}>{it.node}</span>
              ))}
            </div>,
            document.body,
          )}
        </>
      )}

      {/* 측정용 미러 — 화면에 영향 없이 각 배지의 실제 폭을 잰다. */}
      <div
        ref={mirrorRef}
        aria-hidden
        style={{
          position: 'absolute', top: 0, left: 0, visibility: 'hidden', pointerEvents: 'none',
          display: 'flex', gap: GAP, flexWrap: 'nowrap', whiteSpace: 'nowrap', zIndex: -1, height: 0, overflow: 'hidden',
        }}
      >
        {sorted.map((it) => (
          <span key={it.key} style={{ flexShrink: 0, display: 'inline-flex' }}>{it.node}</span>
        ))}
      </div>
    </div>
  );
}
