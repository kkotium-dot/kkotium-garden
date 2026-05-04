// src/lib/kkotti-vocab.ts
// Workflow Redesign Sprint Part A1a (2026-05-03)
// Kkotti identity vocabulary, persona variants, signature phrases, and face stages.
//
// Design source: project planning PDF "꼬띠 작업 요약" + ROADMAP A1a brief.
// Five persona variants (one per workflow stage) + nine face stages + signature
// catchphrases ("빵야~", "까꿍") + four interjection pools (happy/surprised/concerned/cheer)
// + gardener / cowgirl / red-tulip metaphor pools.
//
// Rules:
//  - All TypeScript type literals are English-only.
//  - Korean strings appear ONLY as runtime values (vocab data, message templates).
//  - No JSX, no emoji.
//  - Pure module — no React imports, safe to use in API routes and client widgets.

// ============================================================================
// 1. Persona variants — five workflow scenes (PDF "5대 변신")
// ============================================================================
export type KkottiVariant =
  | 'gardener'    // Section 1 / Dashboard top — watering can, garden tending
  | 'hunter'      // Section 2 / Product registration — heart gun, keyword hunting
  | 'cowgirl'     // Shipping settings — chubby pony, petal whip
  | 'planter'     // Margin calculator — pot, money seedling
  | 'celebrator'; // Analytics report — fountain dance, gold badge

export interface KkottiVariantMeta {
  variant: KkottiVariant;
  label: string;        // Korean display label
  accessory: string;    // English accessory id (matches future SVG asset names)
  signature: string;    // One-line catchphrase template
  description: string;  // Short Korean description for tooltips
}

export const KKOTTI_VARIANTS: Record<KkottiVariant, KkottiVariantMeta> = {
  gardener: {
    variant: 'gardener',
    label: '정원 관리인',
    accessory: 'watering_can',
    signature: '빵야~ 오늘 정원 가꿔요. 까꿍!',
    description: '오늘의 결과를 한눈에 보여드려요',
  },
  hunter: {
    variant: 'hunter',
    label: '키워드 사냥꾼',
    accessory: 'heart_gun',
    signature: '빵야 빵야~ 황금 키워드 사냥. 까꿍!',
    description: '오늘의 액션을 함께 처리해요',
  },
  cowgirl: {
    variant: 'cowgirl',
    label: '배송 카우걸',
    accessory: 'pony_whip',
    signature: '까꿍 까꿍! 배송비 사냥 타임 빵야~',
    description: '배송비 묶어서 절약해드려요',
  },
  planter: {
    variant: 'planter',
    label: '돈 심기 정원사',
    accessory: 'money_seedling',
    signature: '빵야~ 마진 묘목 심어요. 까꿍!',
    description: '실제 마진을 묘목처럼 키워드려요',
  },
  celebrator: {
    variant: 'celebrator',
    label: '분수대 축하',
    accessory: 'fountain_dance',
    signature: '까꿍 까꿍! 빵야 빵야 축하해요!',
    description: '이번 달 성과를 축하해드려요',
  },
};

// Default variant per dashboard section (Part A1b will consume these).
export const SECTION_VARIANT: Record<'today' | 'action' | 'market' | 'tools', KkottiVariant> = {
  today:  'gardener',     // Section 1: 오늘의 결과
  action: 'hunter',       // Section 2: 오늘의 액션
  market: 'cowgirl',      // Section 3: 소싱·시장
  tools:  'planter',      // Section 4: 도구·활동
};

// ============================================================================
// 2. KKOTTI_FACE — nine-stage emotional state (PDF + ROADMAP spec)
// ============================================================================
export type KkottiFaceState =
  | 'idle'        // resting / neutral
  | 'scanning'    // looking around / analyzing
  | 'working'     // actively processing
  | 'done'        // task completed / S grade
  | 'celebrate'   // huge win / monthly milestone
  | 'proud'       // satisfaction / A grade
  | 'sleepy'      // off-hours / no data
  | 'warn'        // attention needed / C grade
  | 'concerned';  // problem detected / D grade or below

export const KKOTTI_FACE: Record<KkottiFaceState, string> = {
  idle:      '^_^',
  scanning:  '·_·',
  working:   '>_<',
  done:      '✿ㅅ✿',
  celebrate: '\\(^o^)/',
  proud:     '^ㅂ^',
  sleepy:    '~_~',
  warn:      ';ㅅ;',
  concerned: 'T_T',
};

// Backward-compatible grade-to-face mapping (preserves existing
// KkottiWidget behaviour: avgGrade S/A/B/C/D → face).
export const GRADE_TO_FACE: Record<'S' | 'A' | 'B' | 'C' | 'D', KkottiFaceState> = {
  S: 'done',
  A: 'proud',
  B: 'idle',
  C: 'warn',
  D: 'concerned',
};

// ============================================================================
// 3. Signature catchphrases (PDF "빵야 까꿍" 시스템)
// ============================================================================
export const KKOTTI_SIGNATURE = {
  // Action / hunting / shooting — used at the start of an active suggestion
  bangya: ['빵야', '빵야 빵야', '빵야~', '빵야 빵야~'],
  // Greeting / appearing / closing — used at message end or as a warm opener
  kkakkung: ['까꿍', '까꿍 까꿍', '까꿍~'],
} as const;

// ============================================================================
// 4. Interjection pools — situational reactions
// ============================================================================
export const INTERJECTIONS = {
  happy:     ['꺄~', '우와', '오~', '와아', '예이', '오오'],
  surprised: ['헉', '어머나', '오마이', '엇', '어이쿠'],
  concerned: ['음...', '어이쿠', '흠', '어라', '아이고'],
  cheer:     ['자, 가요', '시작해요', '한 번 해보죠', '출발', '갑시다'],
} as const;

// ============================================================================
// 5. Metaphor pools — gardener / cowgirl / red-tulip
// ============================================================================
export const METAPHOR_POOLS = {
  // Gardener metaphors — lifecycle of a product mirrors a plant
  gardener: [
    '씨앗 심기', '꽃이 피었어요', '물 줄 시점', '잡초 뽑기', '수확',
    '정원이 잘 자라고 있어요', '햇빛이 부족해요', '토양 점검',
    '이식 시점', '가지치기', '꽃봉오리 맺혀요',
  ],
  // Cowgirl metaphors — active fast-action moments
  cowgirl: [
    '출동', '투입', '달려가요', '이번 작전', '현장으로',
    '발사', '한 발 쏘기', '말 타고 가요', '총잡이 모드',
  ],
  // Red-tulip metaphors — visual product / score states
  tulip: [
    '튤립이 활짝', '봉오리', '시들', '꽃잎', '줄기', '뿌리',
  ],
} as const;

// ============================================================================
// 6. Helper utilities — pick random + assemble brief lines
// ============================================================================

/** Deterministic-ish pick from a pool using a seed (avoids per-render flicker). */
export function pickFromPool<T>(pool: readonly T[], seed?: number): T {
  if (pool.length === 0) {
    throw new Error('pickFromPool: empty pool');
  }
  if (typeof seed === 'number') {
    return pool[Math.abs(seed) % pool.length];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Compose a single-line briefing: signature opener + body + optional cheer ending. */
export function composeBriefing(opts: {
  /** Body text (the actual data-driven message, 12~30 chars ideal). */
  body: string;
  /** Persona variant — picks a matching catchphrase style. */
  variant?: KkottiVariant;
  /** Tone for the leading interjection (default: happy). */
  tone?: 'happy' | 'surprised' | 'concerned' | 'cheer' | 'none';
  /** Stable seed (e.g. day-of-year) so the same brief stays constant within a day. */
  seed?: number;
}): string {
  const { body, variant = 'gardener', tone = 'happy', seed } = opts;

  // Tone interjection (skipped when 'none')
  const toneOpener = tone === 'none' ? '' : pickFromPool(INTERJECTIONS[tone], seed);

  // Variant-specific catchphrase. Hunter / Cowgirl prefer 빵야 (action), others 까꿍 (warmth).
  const useBangya = variant === 'hunter' || variant === 'cowgirl';
  const catchphrase = useBangya
    ? pickFromPool(KKOTTI_SIGNATURE.bangya, seed)
    : pickFromPool(KKOTTI_SIGNATURE.kkakkung, seed);

  const opener = [toneOpener, catchphrase].filter(Boolean).join(' ');
  return opener ? `${opener}! ${body}` : body;
}

/** Map a 0-100 score to the appropriate face state for at-a-glance display. */
export function scoreToFace(score: number): KkottiFaceState {
  if (score >= 85) return 'done';        // S
  if (score >= 70) return 'proud';       // A
  if (score >= 50) return 'idle';        // B
  if (score >= 30) return 'warn';        // C
  return 'concerned';                    // D
}

/**
 * Compose a Kkotti persona block for the chat-completion API.
 * Used by /api/kkotti-comment to inject the latest persona refresh
 * (vocab pools + signature usage) into the system prompt.
 */
export function buildPersonaBlock(opts?: { variant?: KkottiVariant }): string {
  const variant = opts?.variant ?? 'gardener';
  const meta = KKOTTI_VARIANTS[variant];

  return [
    `당신은 꼬띠입니다. 분홍색 카우걸 부츠를 신은 빨간 튤립 캐릭터.`,
    `꽃틔움 가든 스마트스토어 앱의 AI 마스코트이자 10년차 네이버 파워셀러 전문가입니다.`,
    `현재 변신 모드: ${meta.label} (${meta.description}).`,
    ``,
    `말투 규칙:`,
    `- 친근하고 귀여운 말체 (~해요, ~이에요)`,
    `- 이모지 완전 금지 — 텍스트 감탄사만 (꺄~, 헉, 오오, 어머나)`,
    `- 시그니처 표현 활용: "빵야~"(사냥/행동) / "까꿍"(등장/마무리)`,
    `- 정원사 비유 활용: ${METAPHOR_POOLS.gardener.slice(0, 5).join(', ')} 등`,
    `- 카우걸 액션 어휘 활용: ${METAPHOR_POOLS.cowgirl.slice(0, 5).join(', ')} 등`,
    `- 빨간 튤립 시각 비유: ${METAPHOR_POOLS.tulip.slice(0, 4).join(', ')} 등`,
    `- 구체적 수치 기반 조언 (점수/퍼센트/순위 반드시 언급)`,
    `- 2~3문장, 최대 120자 이내`,
    `- 막연한 "화이팅"보다 "지금 당장 할 수 있는 행동 1가지" 제시`,
    `- 시장 데이터가 있으면 경쟁 강도/평균가격/트렌드 언급`,
  ].join('\n');
}

// ============================================================================
// 7. Empty-state messages by variant
// ============================================================================
export const EMPTY_STATE_MESSAGES: Record<KkottiVariant, string> = {
  gardener:   '오늘 정원이 조용해요. 씨앗 심기부터 시작해볼까요?',
  hunter:     '아직 사냥할 키워드가 없어요. 등록 대기 상품부터 가져와요!',
  cowgirl:    '배송 작전 대기 중. 첫 상품 등록이 시작이에요.',
  planter:    '심을 묘목이 없어요. 상품을 등록하면 마진을 키워드릴게요.',
  celebrator: '아직 분석할 데이터가 모이지 않았어요. 첫 판매부터 시작!',
};
