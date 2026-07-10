// src/components/brand/KkottiMascot.tsx
// ============================================================================
// 꼬띠 PLACEHOLDER mascot (v1 round tulip-bud, #228/#229).
//
// ★ STATUS: PLACEHOLDER. This is a hand-coded temporary SVG standing in for the
//   real Adobe vector. When the real asset arrives, swap ONLY the SVG body inside
//   this component — every call site stays unchanged (KKOTTI_PLACEHOLDER_SPEC §3,
//   reversible #229). Identity SSOT = KKOTTI_DESIGN_PLAN v3.0.
//
// ★ VERSION: v1 (round face, no cowboy hat). The v2 hat variant was discarded by
//   operator rollback; geometry here is derived from public/mascot/kkotti-happy.svg
//   (viewBox 200x260), NOT the (now-stale) v2 coordinates in the spec doc §2.
//
// Colors are FIXED brand values (theme-independent, #3-1: no emoji, inline SVG).
// mood swaps ONLY the eyes/mouth (+ sweat/stars); the body is constant.
// Static per mood (prefers-reduced-motion safe — no animation, spec §4).
// ============================================================================

export type KkottiMood = 'happy' | 'excited' | 'thinking' | 'worried' | 'celebrate';

export interface KkottiMascotProps {
  mood?: KkottiMood; // default 'happy'
  size?: number;     // px width; height keeps the 200x260 viewBox ratio. default 120
  className?: string;
  title?: string;    // accessible label override
}

// Constant body (halo, arms, boots, green trunk, leaf arms, red tulip head,
// petal lines, cheeks) — identical across every mood.
function Body() {
  return (
    <>
      {/* white halo outline */}
      <g stroke="#fff" strokeWidth={9} strokeLinejoin="round" fill="none" opacity={0.9}>
        <path d="M100 44 C70 44 55 66 58 92 C60 112 78 126 100 126 C122 126 140 112 142 92 C145 66 130 44 100 44 Z" />
        <rect x={72} y={120} width={56} height={70} rx={26} />
        <path d="M78 196 h18 v34 a9 9 0 0 1 -18 0 Z" />
        <path d="M104 196 h18 v34 a9 9 0 0 1 -18 0 Z" />
      </g>
      {/* pink boots + brown soles */}
      <g stroke="#5A3D2A" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d="M78 150 h18 v70 a9 9 0 0 1 -18 0 Z" fill="#FFA0C0" />
        <ellipse cx={82} cy={170} rx={3} ry={7} fill="#fff" opacity={0.35} stroke="none" />
        <path d="M74 220 h26 v10 a4 4 0 0 1 -4 4 H78 a4 4 0 0 1 -4 -4 Z" fill="#A87752" />
        <path d="M104 150 h18 v70 a9 9 0 0 1 -18 0 Z" fill="#FFA0C0" />
        <ellipse cx={108} cy={170} rx={3} ry={7} fill="#fff" opacity={0.35} stroke="none" />
        <path d="M100 220 h26 v10 a4 4 0 0 1 -4 4 h-18 a4 4 0 0 1 -4 -4 Z" fill="#A87752" />
      </g>
      {/* green trunk + shade + leaf arms */}
      <rect x={72} y={120} width={56} height={74} rx={26} fill="#88D466" stroke="#5A3D2A" strokeWidth={3} strokeLinejoin="round" />
      <path d="M84 130 q-4 30 4 56" stroke="#6BB048" strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.5} />
      <path d="M72 150 q-20 -6 -26 10 q18 6 26 -2 Z" fill="#B5DB87" stroke="#5A3D2A" strokeWidth={3} strokeLinejoin="round" />
      <path d="M128 150 q20 -6 26 10 q-18 6 -26 -2 Z" fill="#B5DB87" stroke="#5A3D2A" strokeWidth={3} strokeLinejoin="round" />
      {/* red tulip-bud head + petal seams */}
      <path d="M100 44 C70 44 55 66 58 92 C60 112 78 126 100 126 C122 126 140 112 142 92 C145 66 130 44 100 44 Z" fill="#FF5C70" stroke="#5A3D2A" strokeWidth={3} strokeLinejoin="round" />
      <path d="M100 46 V118" stroke="#E63960" strokeWidth={2.5} fill="none" opacity={0.55} />
      <path d="M78 52 Q88 84 92 120" stroke="#E63960" strokeWidth={2.5} fill="none" opacity={0.45} />
      <path d="M122 52 Q112 84 108 120" stroke="#E63960" strokeWidth={2.5} fill="none" opacity={0.45} />
      <ellipse cx={78} cy={68} rx={9} ry={6} fill="#FF8A9B" opacity={0.7} />
      {/* cheeks */}
      <ellipse cx={76} cy={98} rx={9} ry={6} fill="#FFC8D6" />
      <ellipse cx={124} cy={98} rx={9} ry={6} fill="#FFC8D6" />
    </>
  );
}

// Full eyes with configurable highlight size (happy/excited/worried/celebrate).
function Eyes({ hl, hl2 }: { hl: number; hl2: number }) {
  return (
    <>
      <ellipse cx={84} cy={88} rx={7.5} ry={9.5} fill="#2A2A2A" />
      <ellipse cx={116} cy={88} rx={7.5} ry={9.5} fill="#2A2A2A" />
      <circle cx={81.5} cy={84.5} r={hl} fill="#fff" />
      <circle cx={86.5} cy={91} r={hl2} fill="#fff" />
      <circle cx={113.5} cy={84.5} r={hl} fill="#fff" />
      <circle cx={118.5} cy={91} r={hl2} fill="#fff" />
    </>
  );
}

const MOUTH_STROKE = { stroke: '#5A3D2A', strokeWidth: 3, fill: 'none', strokeLinecap: 'round' as const };

// mood → eyes + mouth (+ extras). Only these swap; Body() is constant.
function Face({ mood }: { mood: KkottiMood }) {
  switch (mood) {
    case 'excited':
      return (
        <>
          <Eyes hl={3.4} hl2={1.8} />
          <path d="M90 103 Q100 116 110 103" {...MOUTH_STROKE} />
        </>
      );
    case 'thinking':
      return (
        <>
          <circle cx={84} cy={89} r={4} fill="#2A2A2A" />
          <circle cx={116} cy={89} r={4} fill="#2A2A2A" />
          <circle cx={82.5} cy={87} r={1.4} fill="#fff" />
          <circle cx={114.5} cy={87} r={1.4} fill="#fff" />
          <path d="M95 106 h10" {...MOUTH_STROKE} />
        </>
      );
    case 'worried':
      return (
        <>
          <Eyes hl={2.6} hl2={1.3} />
          <path d="M92 108 Q100 102 108 108" {...MOUTH_STROKE} />
          {/* sweat drop */}
          <path d="M133 80 q4 8 0 12 q-4 -4 0 -12 Z" fill="#7FB8E8" stroke="#5A9BD4" strokeWidth={1} strokeLinejoin="round" />
        </>
      );
    case 'celebrate':
      return (
        <>
          {/* stars + confetti */}
          <path d="M50 42 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill="#FFD24C" />
          <path d="M150 46 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6 Z" fill="#FF8A9B" />
          <circle cx={46} cy={118} r={3} fill="#88D466" />
          <circle cx={156} cy={126} r={3} fill="#7FB8E8" />
          <Eyes hl={3.4} hl2={1.8} />
          {/* open happy mouth */}
          <path d="M91 103 Q100 118 109 103 Z" fill="#C25566" stroke="#5A3D2A" strokeWidth={3} strokeLinejoin="round" />
        </>
      );
    case 'happy':
    default:
      return (
        <>
          <Eyes hl={2.6} hl2={1.3} />
          <path d="M92 104 Q100 112 108 104" {...MOUTH_STROKE} />
        </>
      );
  }
}

export default function KkottiMascot({
  mood = 'happy',
  size = 120,
  className,
  title = '꼬띠 마스코트',
}: KkottiMascotProps) {
  const height = Math.round((size * 260) / 200);
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 200 260"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={className}
      data-placeholder="kkotti-v1"
    >
      <Body />
      <Face mood={mood} />
    </svg>
  );
}
