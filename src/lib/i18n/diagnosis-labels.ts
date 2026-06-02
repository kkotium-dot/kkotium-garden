// Phase 2-NAMING — display-label mappings for diagnosis pills.
//
// Internal code values (SkeletonId, Grade, Persona, EmotionalTone) MUST stay
// unchanged: logic, DB, AI prompts, scoring all read the raw literals. These
// formatters ONLY translate the value into a Korean display string at the
// render layer. Unknown values fall back to the raw input (non-breaking).
//
// Glossary authority: docs/research/NAMING_GLOSSARY_2026-06.md

/** "S6" -> "6번". Skeleton ids are S1..S12. */
export function formatSkeletonId(id: string | null | undefined): string {
  if (!id) return '-';
  const m = /^S(\d{1,2})$/.exec(id);
  return m ? `${m[1]}번` : id;
}

/** "L2" -> "2단계 (보통)". Grades are L1..L4. */
export function formatGrade(grade: string | null | undefined): string {
  if (!grade) return '-';
  const map: Record<string, string> = {
    L1: '1단계 (자동)',
    L2: '2단계 (보통)',
    L3: '3단계 (검토)',
    L4: '4단계 (디자이너)',
  };
  return map[grade] ?? grade;
}

/** "30-40s" -> "30·40대". Personas: 20s | 30-40s | senior | kidsmom. */
export function formatPersona(persona: string | null | undefined): string {
  if (!persona) return '-';
  const map: Record<string, string> = {
    '20s': '20대',
    '30-40s': '30·40대',
    'senior': '시니어',
    'kidsmom': '아이맘',
  };
  return map[persona] ?? persona;
}

/** "friendly" -> "다정함". Tones: friendly | professional | sensory | trust. */
export function formatEmotionalTone(tone: string | null | undefined): string {
  if (!tone) return '-';
  const map: Record<string, string> = {
    'friendly': '다정함',
    'professional': '전문적',
    'sensory': '감각적',
    'trust': '신뢰감',
  };
  return map[tone] ?? tone;
}

/** Quality score 0..100 -> "56 / 100" (scale-explicit). */
export function formatScoreOutOf100(n: number | null | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '-';
  const clamped = Math.max(0, Math.min(100, n));
  return `${clamped.toFixed(0)} / 100`;
}
