// src/components/common/NumberInput.tsx
// B1 (OPERATOR_FEEDBACK_TRIAGE) — common numeric-entry component so backspace
// and mid-string edits work correctly everywhere (margin %, sale price,
// supplier price, stock, discount, etc). ★전상품공통·단건수습금지.
//
// Root cause of the old bug: plain `<input type="number" value={n}
// onChange={e => onChange(parseFloat(e.target.value) || 0)} />` round-trips
// through a parsed number on every keystroke. That collapses in-progress
// states an editor legitimately passes through — "" while backspacing to
// clear, "10." while typing a decimal, "-" while typing a negative — back to
// a formatted number, which both fights the value the user is mid-typing and
// can reset the caret to the end of the field. This component keeps the raw
// text the user is typing as its own state (`draft`) and only normalizes it
// back to the canonical numeric string on blur, so editing never gets
// clobbered while the field is focused.

'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

export interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Round the committed value to a multiple of `step` on blur (e.g. 10 for 10원 단위). Does not restrict typing. */
  step?: number;
  allowDecimal?: boolean;
  allowNegative?: boolean;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  style?: CSSProperties;
  id?: string;
  name?: string;
  'aria-label'?: string;
  onBlur?: () => void;
}

function toDraft(value: number): string {
  return value === 0 || Number.isNaN(value) ? '' : String(value);
}

function sanitize(raw: string, allowDecimal: boolean, allowNegative: boolean): string {
  let s = raw.replace(/[^\d.\-]/g, '');
  const neg = allowNegative && s.startsWith('-');
  s = s.replace(/-/g, '');
  if (!allowDecimal) s = s.replace(/\./g, '');
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
  }
  return neg ? `-${s}` : s;
}

/** Controlled numeric text input that tolerates in-progress edit states. */
export function NumberInput({
  value, onChange, min, max, step, allowDecimal = true, allowNegative = false,
  placeholder = '0', disabled, autoFocus, className, style, id, name,
  onBlur, ...rest
}: NumberInputProps) {
  const [draft, setDraft] = useState<string>(() => toDraft(value));
  const focusedRef = useRef(false);

  // Sync external value changes in (e.g. "적용" button, form reset) — but
  // never while the user has the field focused, or their in-progress
  // keystrokes would get overwritten out from under them.
  useEffect(() => {
    if (focusedRef.current) return;
    setDraft(toDraft(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      id={id}
      name={name}
      className={className}
      style={style}
      value={draft}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      onFocus={() => { focusedRef.current = true; }}
      onChange={(e) => {
        const clean = sanitize(e.target.value, allowDecimal, allowNegative);
        setDraft(clean);
        if (clean === '' || clean === '-' || clean === '.' || clean === '-.') {
          onChange(0);
          return;
        }
        const n = parseFloat(clean);
        if (!Number.isNaN(n)) onChange(n);
      }}
      onBlur={() => {
        focusedRef.current = false;
        let n = parseFloat(draft) || 0;
        if (min !== undefined && n < min) n = min;
        if (max !== undefined && n > max) n = max;
        if (step && step > 0) n = Math.round(n / step) * step;
        if (n !== value) onChange(n);
        setDraft(toDraft(n));
        onBlur?.();
      }}
      {...rest}
    />
  );
}

export default NumberInput;
