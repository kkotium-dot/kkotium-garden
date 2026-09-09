// src/lib/products/substitute-types.ts
// ============================================================================
// SUBSTITUTE v2 (#210 후속, B11/B13 통합설계 — docs/plan/B11_B13_B15_HANDOFF_SPEC
// _2026-09-09.md) — Product.substitute_info(jsonb) 공용 타입 + 정규화. 프론트
// (SubstituteEditor) · API route(substitute/route.ts) · 크론(cron/daily 등)이
// 전부 여기서 import해 쓴다 (#62 단일 권위, 타입 중복 금지).
//
// v1(레거시, version 필드 없음)은 대체상품 1개만 저장 가능했다. v2는:
//   - substitutes[]  — 우선순위(priority) 있는 다중 대체상품 (B11). 오름차순이
//     폴백 순서(1번 품절 시 2번 자동 안내).
//   - optionMatches[] — Product.optionValues의 각 값별 매칭 대체상품 (B13).
// 기존 v1 단건 데이터는 절대 유실하지 않는다 — normalizeSubstituteInfo가 읽을
// 때 즉시 v2로 변환하고(lazy migration), 저장 시 v2로 다시 쓴다.
// ============================================================================

export interface SubstituteEntry {
  priority: number;
  substituteProductId?: string | null;
  substituteName: string;
  substituteNote?: string | null;
  sourcingUrl?: string | null;
  sourcingCode?: string | null;
}

export interface OptionMatchEntry {
  optionValue: string;
  substituteProductId?: string | null;
  substituteName: string;
  substituteNote?: string | null;
}

export interface SubstituteInfoV2 {
  version: 2;
  substitutes: SubstituteEntry[];
  optionMatches?: OptionMatchEntry[];
  lowStockThreshold?: number | null;
}

/** 레거시 v1 shape (version 필드 없음) — 참고용, 새로 쓰지 않는다. */
export interface SubstituteInfoV1Legacy {
  hasSubstitute: boolean;
  substituteProductId?: string | null;
  substituteName?: string | null;
  substituteNote?: string | null;
  sourcingUrl?: string | null;
  sourcingCode?: string | null;
  lowStockThreshold?: number | null;
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const int = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : fallback;

function normalizeSubstituteEntry(raw: unknown, fallbackPriority: number): SubstituteEntry | null {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const substituteName = str(o.substituteName);
  const substituteProductId = str(o.substituteProductId);
  const substituteNote = str(o.substituteNote);
  const sourcingUrl = str(o.sourcingUrl);
  const sourcingCode = str(o.sourcingCode);
  // 내용 없는 행(전부 빈값)은 버린다 — UI에서 빈 행을 추가만 하고 저장한 경우.
  if (!substituteName && !substituteProductId && !substituteNote && !sourcingUrl && !sourcingCode) {
    return null;
  }
  return {
    priority: int(o.priority, fallbackPriority),
    substituteProductId,
    substituteName: substituteName ?? '',
    substituteNote,
    sourcingUrl,
    sourcingCode,
  };
}

function normalizeOptionMatchEntry(raw: unknown): OptionMatchEntry | null {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const optionValue = str(o.optionValue);
  const substituteName = str(o.substituteName);
  const substituteProductId = str(o.substituteProductId);
  if (!optionValue) return null;
  if (!substituteName && !substituteProductId) return null;
  return {
    optionValue,
    substituteProductId,
    substituteName: substituteName ?? '',
    substituteNote: str(o.substituteNote),
  };
}

/**
 * 임의의 jsonb 값(v1 레거시 / v2 / null)을 SubstituteInfoV2로 정규화한다.
 * SubstituteEditor 로드 시, substitute API route 응답 시, 크론 조회 시 전부
 * 이 함수 하나만 재사용(#62) — v1→v2 변환 로직이 여러 곳에 흩어지지 않게 한다.
 */
export function normalizeSubstituteInfo(raw: unknown): SubstituteInfoV2 {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  if (o.version === 2) {
    const rawSubs = Array.isArray(o.substitutes) ? o.substitutes : [];
    const substitutes = rawSubs
      .map((s, i) => normalizeSubstituteEntry(s, i + 1))
      .filter((s): s is SubstituteEntry => s !== null)
      .sort((a, b) => a.priority - b.priority);

    const rawMatches = Array.isArray(o.optionMatches) ? o.optionMatches : [];
    const optionMatches = rawMatches
      .map(normalizeOptionMatchEntry)
      .filter((m): m is OptionMatchEntry => m !== null);

    return {
      version: 2,
      substitutes,
      optionMatches,
      lowStockThreshold: num(o.lowStockThreshold),
    };
  }

  // v1 레거시(또는 빈 값) — hasSubstitute 여부와 무관하게 실제 내용이 있으면
  // priority 1 짜리 단건 배열로 변환해 유실 없이 승계한다.
  const legacyEntry = normalizeSubstituteEntry(
    {
      priority: 1,
      substituteProductId: o.substituteProductId,
      substituteName: o.substituteName,
      substituteNote: o.substituteNote,
      sourcingUrl: o.sourcingUrl,
      sourcingCode: o.sourcingCode,
    },
    1,
  );

  return {
    version: 2,
    substitutes: legacyEntry ? [legacyEntry] : [],
    optionMatches: [],
    lowStockThreshold: num(o.lowStockThreshold),
  };
}

/** 대체상품(우선순위) 또는 옵션별 매칭 중 하나라도 실제 내용이 있으면 true. */
export function hasSubstitutePlan(info: SubstituteInfoV2 | null | undefined): boolean {
  if (!info) return false;
  return info.substitutes.length > 0 || (info.optionMatches?.length ?? 0) > 0;
}

/** 우선순위 1위(폴백 순서상 가장 먼저 안내할) 대체상품. 없으면 null. */
export function primarySubstitute(info: SubstituteInfoV2 | null | undefined): SubstituteEntry | null {
  if (!info || info.substitutes.length === 0) return null;
  return info.substitutes[0];
}

/** optionValue(Product.optionValues의 원소)에 매칭되는 대체상품. 없으면 null. */
export function matchByOptionValue(
  info: SubstituteInfoV2 | null | undefined,
  optionValue: string,
): OptionMatchEntry | null {
  if (!info?.optionMatches) return null;
  const needle = optionValue.trim();
  return info.optionMatches.find((m) => m.optionValue === needle) ?? null;
}
