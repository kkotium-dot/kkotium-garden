// src/lib/option-integrity.ts
// ============================================================================
// Sprint 7 P0-A (리서치 11번): Domeggook OpenAPI v4.5 option-integrity helpers
// ============================================================================
//
// Pure functions only — no DB, no fetch, no side effects. Callers (crawler
// route, /crawl UI, future re-crawl flows) decide policy (warn vs block).
//
// Three signals:
//   1. hashOptions(options)  — stable hash of selectOpt structure. Used to
//      detect "options changed between crawls" (text or qty/addPrice drift).
//   2. validateStatus(status) — true when seller is open for orders.
//      Domeggook returns non-'판매중' when seller is on vacation or has
//      paused listings. This is the most common silent failure for solo
//      sellers and the primary motivation for P0-A.
//   3. validateChannel(isOnSupply) — true when the product is on the
//      도매매 (supply) channel. Crawling from domeggook URLs that are NOT
//      on supply causes margin miscalculation because the price field
//      reflects 도매꾹 retail, not 도매매 wholesale.
//
// These functions return strongly-typed result objects so the consumer can
// surface specific user-facing messages without re-deriving the reason.
// ============================================================================

import { createHash } from 'crypto';
import type { CrawledOption } from '@/lib/sources';

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const STATUS_ACTIVE = '판매중'; // 판매중

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type IntegrityLevel = 'ok' | 'warning' | 'block';

export interface IntegrityFlag {
  /** Stable code for UI dispatch (e.g. translation lookup). */
  code: 'vacation' | 'channel_mismatch' | 'options_drift' | 'no_options_data';
  level: IntegrityLevel;
  /** Korean message intended for end-user banner. Kept short. */
  message: string;
}

export interface IntegritySnapshot {
  optionsHash: string;
  flags: IntegrityFlag[];
}

// ----------------------------------------------------------------------------
// Hash
// ----------------------------------------------------------------------------

/**
 * Stable hash of the option array. Two crawls of the same product return
 * the same hash IFF every option (name + qty + addPrice) is identical and
 * ordering is identical.
 *
 * Empty options returns a fixed sentinel hash so consumers can distinguish
 * "no options" from "different options".
 */
export function hashOptions(options: CrawledOption[]): string {
  if (!options || options.length === 0) {
    return 'no_options:0';
  }
  // Normalize: trim names, coerce numbers, preserve order (domeggook sends
  // selectOpt in their canonical order; preserving order matters because
  // user may rely on it).
  const canonical = options.map((o) => ({
    name: (o.name ?? '').trim().replace(/\s+/g, ' '),
    qty: Number.isFinite(o.qty) ? Math.floor(o.qty) : 0,
    addPrice: Number.isFinite(o.addPrice) ? Math.floor(o.addPrice) : 0,
  }));
  const json = JSON.stringify(canonical);
  return createHash('sha1').update(json).digest('hex').slice(0, 32);
}

/**
 * Compare two hashes. Returns true when they match. Convenience wrapper
 * over plain equality so callers don't need to import constants.
 */
export function hashesMatch(prevHash: string | null, currHash: string): boolean {
  if (!prevHash) return true; // no prior baseline = nothing to compare
  return prevHash === currHash;
}

// ----------------------------------------------------------------------------
// Status / channel checks
// ----------------------------------------------------------------------------

/**
 * Is the seller open for orders? Domeggook returns 판매중 when normal;
 * anything else (휴가, 잠시 중단, etc.) means the seller is not currently
 * fulfilling orders.
 */
export function validateStatus(status: string | null | undefined): IntegrityFlag | null {
  const s = (status ?? '').trim();
  if (!s || s === STATUS_ACTIVE) return null;
  return {
    code: 'vacation',
    level: 'block',
    // 공급사 휴가/일시중지 — 지금 등록하면 주문이 들어와도 발송 불가
    message: '공급사 휴가 또는 일시중지 — 지금 등록하면 주문이 들어와도 발송 불가',
  };
}

/**
 * Is the product on the 도매매 (supply) channel? When false, the price field
 * reflects domeggook retail rather than wholesale supply — margin will be
 * wrong by ~20-30% if the user registers without noticing.
 */
export function validateChannel(isOnSupply: boolean): IntegrityFlag | null {
  if (isOnSupply) return null;
  return {
    code: 'channel_mismatch',
    level: 'warning',
    // 도매매(supply) 채널 외 상품 — 마진 계산이 부정확할 수 있어요
    message: '도매매 채널 외 상품 — 마진 계산이 부정확할 수 있어요',
  };
}

/**
 * Check for option drift between two hashes. When prevHash is null this is
 * the first crawl — no drift signal is produced.
 */
export function detectOptionDrift(
  prevHash: string | null,
  currHash: string,
): IntegrityFlag | null {
  if (!prevHash) return null;
  if (prevHash === currHash) return null;
  // No-options sentinel transitions are interesting in their own right
  // (e.g. supplier removed all options) so we surface them too.
  return {
    code: 'options_drift',
    level: 'warning',
    // 지난 크롤 대비 옵션이 바뀌었어요 — 마진/재고 확인 권장
    message: '지난 크롤 대비 옵션이 바뀌었어요 — 마진/재고 확인 권장',
  };
}

// ----------------------------------------------------------------------------
// Top-level evaluator
// ----------------------------------------------------------------------------

/**
 * One-shot evaluator. Builds the integrity snapshot for a freshly-crawled
 * domeggook ItemDetail. Pass `prevHash` when re-crawling a known product.
 */
export function evaluateIntegrity(args: {
  options: CrawledOption[];
  status: string | null | undefined;
  isOnSupply: boolean;
  prevHash?: string | null;
}): IntegritySnapshot {
  const optionsHash = hashOptions(args.options ?? []);
  const flags: IntegrityFlag[] = [];

  const statusFlag = validateStatus(args.status);
  if (statusFlag) flags.push(statusFlag);

  const channelFlag = validateChannel(args.isOnSupply);
  if (channelFlag) flags.push(channelFlag);

  const driftFlag = detectOptionDrift(args.prevHash ?? null, optionsHash);
  if (driftFlag) flags.push(driftFlag);

  if (!args.options || args.options.length === 0) {
    // Not a defect per se, but worth surfacing for solo seller awareness.
    flags.push({
      code: 'no_options_data',
      level: 'ok',
      // 옵션 없는 단일 상품
      message: '옵션 없는 단일 상품',
    });
  }

  return { optionsHash, flags };
}

/**
 * Convenience aggregate level over multiple flags — picks the strictest level.
 * Used by the UI to decide overall banner color.
 */
export function aggregateLevel(flags: IntegrityFlag[]): IntegrityLevel {
  if (flags.some((f) => f.level === 'block')) return 'block';
  if (flags.some((f) => f.level === 'warning')) return 'warning';
  return 'ok';
}
