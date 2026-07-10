// src/components/brand/useKkottiAppearance.ts
// ============================================================================
// 꼬띠 appearance guard (#228 · Clippy-화 방지·코드 강제).
//
// Rules enforced here:
//   - 해제 가능: every appearance can be dismissed.
//   - 재등장 금지: once dismissed in a given context, it never returns for that
//     context (persisted in localStorage, keyed by contextKey).
//   - SSR-safe: renders nothing until mounted (no hydration mismatch, no flash
//     for already-dismissed users).
//
// Appearance itself (WHERE 꼬띠 shows — empty state / success / onboarding /
// error only) is the caller's responsibility per spec §4; this hook only owns
// the dismiss + never-return contract.
// ============================================================================

import { useCallback, useEffect, useState } from 'react';

const STORAGE_PREFIX = 'kkotti:dismissed:';

export function useKkottiAppearance(contextKey: string): {
  visible: boolean;
  dismiss: () => void;
} {
  const storageKey = `${STORAGE_PREFIX}${contextKey}`;
  // Start hidden so the server render and the first client render agree (both
  // emit nothing); reveal only after the mount effect confirms not-dismissed.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(storageKey) === '1';
    } catch {
      // localStorage unavailable (private mode / SSR) → allow appearance.
      dismissed = false;
    }
    setVisible(!dismissed);
  }, [storageKey]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      // Non-persistent fallback: at least hide it for this mount.
    }
    setVisible(false);
  }, [storageKey]);

  return { visible, dismiss };
}
