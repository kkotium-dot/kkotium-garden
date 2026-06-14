// src/lib/storage/download-naming.ts
// ============================================================================
// Desktop download filename convention (authority §4.1):
//
//   {YYYYMMDD-HHmm}__{slug}__{stage}__{variant}.{ext}
//
// A flat Downloads folder stays date-sortable AND grep-able by product/stage
// even with no folder infrastructure. Pure string helpers — no IO. English code,
// product-agnostic (#55). The ZIP export (§4.2) reuses this for entry names.
// ============================================================================

const SEP = '__';

/** Sanitize a free-form (possibly non-ASCII) label into a path-safe slug. */
export function slugify(label: string | null | undefined, fallback: string): string {
  const slug = (label ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug || fallback;
}

/** Pad to 2 digits. */
function p2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** {YYYYMMDD-HHmm} timestamp token (local time). */
export function stampToken(d: Date): string {
  return (
    `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}` +
    `-${p2(d.getHours())}${p2(d.getMinutes())}`
  );
}

export interface DownloadNameParts {
  date: Date;
  /** Product slug (already sanitized) or a pid-8 fallback. */
  slug: string;
  /** Stage / kind folder name (source / cutout / composite / ...). */
  stage: string;
  /** Variant token slug. */
  variant: string;
  /** File extension WITHOUT the leading dot. */
  ext: string;
}

/** Build the convention filename. */
export function buildDownloadName(parts: DownloadNameParts): string {
  const slug = slugify(parts.slug, 'product');
  const stage = slugify(parts.stage, 'asset');
  const variant = slugify(parts.variant, 'v');
  const ext = (parts.ext || 'png').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'png';
  return `${stampToken(parts.date)}${SEP}${slug}${SEP}${stage}${SEP}${variant}.${ext}`;
}

/**
 * Derive the {variant, ext} from a stored object filename `{variant}-{ts}.{ext}`
 * (the uploadAutomationAsset convention). Falls back gracefully for legacy flat
 * names that do not carry a trailing -{ts}.
 */
export function parseStoredFileName(fileName: string): { variant: string; ext: string } {
  const dot = fileName.lastIndexOf('.');
  const ext = dot > 0 ? fileName.slice(dot + 1) : 'png';
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  // Strip a trailing -{digits} timestamp if present.
  const variant = base.replace(/-\d{8,}$/, '') || base;
  return { variant, ext };
}
