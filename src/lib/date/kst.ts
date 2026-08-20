const KST_TIME_ZONE = 'Asia/Seoul';

/** "YYYY-MM-DD" for the given instant (default now), read in KST — for filenames, DB date keys. */
export function kstToday(d: Date = new Date()): string {
  return d.toLocaleDateString('sv-SE', { timeZone: KST_TIME_ZONE });
}

/** Korean long date label ("2026년 8월 20일 목"), read in KST — for titles and alert copy. */
export function kstLabel(d: Date = new Date()): string {
  return d.toLocaleDateString('ko-KR', {
    timeZone: KST_TIME_ZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

/** Short Korean date label ("8. 20."), read in KST. */
export function kstShortLabel(d: Date = new Date()): string {
  return d.toLocaleDateString('ko-KR', { timeZone: KST_TIME_ZONE });
}

/** Korean date label with custom Intl options, always pinned to KST regardless of runtime TZ. */
export function kstDateLabel(d: Date, options: Intl.DateTimeFormatOptions): string {
  return d.toLocaleDateString('ko-KR', { ...options, timeZone: KST_TIME_ZONE });
}
