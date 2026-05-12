// src/lib/naver/tag-dictionary.ts
// ============================================================================
// Sprint 7 P1-C (리서치 7번): Naver tag-dictionary verification
// ============================================================================
//
// Naver Shopping treats product tags as SEO signals ONLY when the tag is
// registered in their internal tag dictionary. User-invented words (creative
// branding terms, casual phrases) don't get indexed and produce zero SEO
// lift.
//
// Naver does not expose the tag dictionary directly. However, the Search Ad
// API's keywordstool endpoint returns monthly search volume for any keyword
// — if a tag has non-zero monthly volume, it is *implicitly* in Naver's
// indexed vocabulary (the same dictionary that drives shopping SEO matches).
//
// This is a proxy, not a perfect oracle: very-niche dictionary tags with
// near-zero search volume will be flagged as "unregistered" even when
// they technically exist. The trade-off is acceptable because tags with no
// search volume produce no measurable SEO lift anyway.
//
// Verification rules:
//   verified  — keyword volume > 0 (PC + Mobile combined)
//   weak      — keyword volume == 0 but Naver returned the row (acknowledged)
//   missing   — keyword not found in Naver response (probably user-invented)
//   error     — API failure / credential missing
// ============================================================================

import { fetchKeywordStats } from '@/lib/naver/keyword-api';

// Naver Search Ad caps batch size at 5 per request
const BATCH_SIZE = 5;

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type TagStatus = 'verified' | 'weak' | 'missing' | 'error';

export interface TagVerification {
  tag: string;
  status: TagStatus;
  monthlyVolume: number;
  /** Human-readable hint for UI. */
  hint: string;
}

export interface TagVerificationResult {
  tags: TagVerification[];
  totalVerified: number;
  totalWeak: number;
  totalMissing: number;
  totalError: number;
  error?: string;
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/**
 * Verify a list of tags against the Naver tag-dictionary proxy. Returns a
 * per-tag verification + counts.
 *
 * Best-effort: when the API fails entirely, each tag is marked 'error' and
 * the top-level `error` field carries the reason.
 */
export async function verifyTags(tags: string[]): Promise<TagVerificationResult> {
  const cleaned = tags
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (cleaned.length === 0) {
    return { tags: [], totalVerified: 0, totalWeak: 0, totalMissing: 0, totalError: 0 };
  }

  // Batch into groups of 5 (Search Ad limit)
  const batches: string[][] = [];
  for (let i = 0; i < cleaned.length; i += BATCH_SIZE) {
    batches.push(cleaned.slice(i, i + BATCH_SIZE));
  }

  const allResults: Array<{ tag: string; volume: number; found: boolean; error?: string }> = [];

  for (const batch of batches) {
    try {
      const stats = await fetchKeywordStats(batch);
      // Build a map of returned keywords (normalized) for lookup
      const returned = new Map<string, number>();
      for (const s of stats) {
        const key = s.keyword.trim().toLowerCase();
        returned.set(key, s.totalMonthly);
      }
      for (const tag of batch) {
        const key = tag.toLowerCase();
        if (returned.has(key)) {
          allResults.push({ tag, volume: returned.get(key) ?? 0, found: true });
        } else {
          allResults.push({ tag, volume: 0, found: false });
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message.slice(0, 200) : 'tag_verify_error';
      for (const tag of batch) {
        allResults.push({ tag, volume: 0, found: false, error: msg });
      }
    }
  }

  // Threshold tuning (functional test discovery 2026-05-12):
  // Naver Search Ad parser returns 5-10 for "< 10" responses, which means
  // even random garbage strings (e.g. 'asdfqwerty') get monthlyVolume=10
  // and pass naive "volume > 0" verified check. Real SEO impact requires
  // sustained search volume; we use 30/month as practical threshold.
  const VERIFIED_MIN = 30;   // monthly volume >= 30 → meaningful SEO signal
  const WEAK_MIN = 10;       // 10..29 → low but real; Naver dictionary has it

  const verifications: TagVerification[] = allResults.map((r) => {
    if (r.error) {
      return { tag: r.tag, status: 'error', monthlyVolume: 0, hint: 'API 조회 실패' };
    }
    if (r.found && r.volume >= VERIFIED_MIN) {
      return {
        tag: r.tag,
        status: 'verified',
        monthlyVolume: r.volume,
        hint: `월 ${r.volume.toLocaleString()}회 검색 — SEO 유효`,
      };
    }
    if (r.found && r.volume >= WEAK_MIN) {
      return {
        tag: r.tag,
        status: 'weak',
        monthlyVolume: r.volume,
        hint: `월 ${r.volume}회 — 검색량 낮음, 사전 등재만 확인`,
      };
    }
    // r.volume < 10 OR not found in Search Ad response → treat as missing
    return {
      tag: r.tag,
      status: 'missing',
      monthlyVolume: r.volume,
      hint: 'Naver 사전 미등재 또는 검색량 0 — 등재 키워드로 교체 권장',
    };
  });

  const totalVerified = verifications.filter((v) => v.status === 'verified').length;
  const totalWeak     = verifications.filter((v) => v.status === 'weak').length;
  const totalMissing  = verifications.filter((v) => v.status === 'missing').length;
  const totalError    = verifications.filter((v) => v.status === 'error').length;

  return {
    tags: verifications,
    totalVerified,
    totalWeak,
    totalMissing,
    totalError,
    error: totalError === verifications.length && verifications.length > 0
      ? verifications[0].hint
      : undefined,
  };
}
