// src/components/common/ErrorBoundary.tsx
// ============================================================================
// #62 hardening — a render-time error in one panel must NOT silently blank a
// whole pane (the SF-1 risk: a throw inside the 배양실 cultivationSlot would take
// the entire step canvas down with no operator-visible reason). This boundary
// isolates its child: on a render/runtime error it shows a compact diagnostic
// fallback (with the message) and lets siblings render normally. Class component
// because only class lifecycles (getDerivedStateFromError / componentDidCatch)
// can catch render errors. Lucide only; English comments.
// ============================================================================

'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Short label naming the panel, shown in the fallback. */
  label?: string;
  /** Optional custom fallback; receives the error. */
  fallback?: (error: Error) => ReactNode;
}
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Surface in the console so the cause is never invisible (#82).
    console.error(`[ErrorBoundary${this.props.label ? ` · ${this.props.label}` : ''}]`, error);
  }

  render() {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) return this.props.fallback(error);
      return (
        <section style={{
          padding: 12, background: '#FFF7F7', border: '1px solid #FECACA',
          borderRadius: 'var(--radius-card, 12px)', color: '#B91C1C',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 12.5 }}>
            <AlertTriangle size={14} />
            {this.props.label ? `${this.props.label} — 표시 중 오류` : '표시 중 오류'}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 11, lineHeight: 1.5, color: '#9B2C2C', wordBreak: 'break-word' }}>
            {error.message || String(error)}
          </p>
        </section>
      );
    }
    return this.props.children;
  }
}
