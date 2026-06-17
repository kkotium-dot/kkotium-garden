// Mood-Camera Spec System — canonical seed data (2026-06-16, session8).
// 1:1 mirror of docs/design/MOOD_CAMERA_SPEC_SYSTEM.md §1 (axes) / §2 (camera
// decision table) / §3 (subject templates + fixed blocks). This module is the
// single source of truth: the DB seed writes these rows, and the assembler /
// decision-table read them directly so prompt assembly works without a DB round
// trip and stays unit-testable (reverse-deploy-safe). No per-product values here
// (#55) — only mood-level specs.

import type { MoodAxisData, MoodCode } from './types';

// Fixed common grade — appended to every prompt so a mixed-camera set still
// reads as one shoot (authority §3 "통일 그레이드").
export const FIXED_GRADE_BLOCK =
  'unified collection grade: filmic tone, fine film grain, matte finish, ' +
  'soft highlight roll-off, photorealistic commercial product photography, ' +
  'professional accurate color';

// Positive exclusion block — Nano Banana / Gemini have no negativePrompt field,
// so exclusions are phrased positively (authority §3, #86). The marker phrase
// "realistic photograph only" is what the exclusionsPresent guard checks for.
export const EXCLUSION_BLOCK =
  'clean composition containing only the product and its soft shadow, ' +
  'plain uncluttered background, realistic photograph only. ' +
  'no on-image text, no logos, no human figures, no illustration or painting.';

// Product-margin reservation (#62 defect B). For BACKDROP / scent-scene slots
// that composite the real product in LATER: the previous phrasing "breathing
// room ... for a small bottle" made the model DRAW a bottle (Path C violation,
// confirmed in a 2026-06-17 generation), erasing the compositing space. This is
// the canonical safe phrasing — positive exclusion only, NO negativePrompt field
// (#86). Use it for backdrop/scent paths; NOT for hero/thumbnail where the
// product IS the subject.
export const PRODUCT_MARGIN_BLOCK =
  'clean empty negative space in the upper area reserved for later product ' +
  'compositing, no bottle, no container, no product, no diffuser in frame';

// Backdrop-scene exclusion (#62 E5). Like EXCLUSION_BLOCK but WITHOUT the
// "containing only the product" clause — a scent backdrop has no product in
// frame (it is composited in later). Keeps the "realistic photograph only"
// marker the exclusionsPresent guard checks. Positive only (#86).
export const BACKDROP_EXCLUSION_BLOCK =
  'clean composition, plain uncluttered background, realistic photograph only. ' +
  'no on-image text, no logos, no human figures, no illustration or painting.';

// The six axes with their camera specs and subject templates. Korean only in
// nameKo / conversionJob / benchmarkDna (display); all prompt fragments English.
export const MOOD_AXES: Record<MoodCode, MoodAxisData> = {
  M1: {
    code: 'M1',
    nameKo: '신뢰·안심',
    conversionJob: '안전·청결·순함',
    benchmarkDna: ['무인양품', '이솝'],
    referenceAesthetic: 'the clean, minimal, trustworthy premium-retail aesthetic',
    palette: 'soft neutral whites and cool greys',
    subjectTemplate:
      'A [product] in soft [palette] tones on a smooth white seamless surface, ' +
      'lit by a single large softbox creating near-shadowless even light',
    camera: {
      cameraArchetype: 'medium-format camera',
      lens: '100mm macro lens',
      aperture: 'f/8',
      lighting: 'single large softbox, near-shadowless high-key',
      colorGrade: 'clean neutral-cool, true white',
      realismCues: 'crisp fine surface detail, clean and calm',
      resolution: '4K',
      aspectRatio: '1:1',
    },
  },
  M2: {
    code: 'M2',
    nameKo: '욕망·동경',
    conversionJob: '우리 집이 이렇게',
    benchmarkDna: ['오늘의집', '29CM'],
    referenceAesthetic: 'an aspirational, editorial, design-forward lifestyle aesthetic',
    palette: 'warm sunlit neutrals and soft wood tones',
    subjectTemplate:
      'A [product] styled in a sunlit modern home corner with subtle props, ' +
      'soft window daylight from camera left with warm ambient glow, editorial lifestyle mood',
    camera: {
      cameraArchetype: 'full-frame cinema camera',
      lens: '50mm lens',
      aperture: 'f/2.8',
      lighting: 'window light with warm ambient',
      colorGrade: 'warm, light filmic',
      realismCues: 'gentle background bokeh',
      resolution: '4K',
      aspectRatio: '4:5',
    },
  },
  M3: {
    code: 'M3',
    nameKo: '명료·효율',
    conversionJob: '정확히 보임·빠름',
    benchmarkDna: ['컬리', '쿠팡'],
    referenceAesthetic: 'a crisp, accurate, information-first commerce aesthetic',
    palette: 'clean true whites and crisp neutrals',
    subjectTemplate:
      'A [product] in [palette] centered on a pure white background, ' +
      'even multi-source shadowless lighting, true accurate color, e-commerce catalog clarity',
    camera: {
      cameraArchetype: 'clean full-frame camera',
      lens: '50mm lens',
      aperture: 'f/8',
      lighting: 'even multi-source shadowless',
      colorGrade: 'neutral, accurate',
      realismCues: 'edge-to-edge sharp focus',
      resolution: '2K',
      aspectRatio: '1:1',
    },
  },
  M4: {
    code: 'M4',
    nameKo: '따뜻·코지',
    conversionJob: '포근·위안·사람냄새',
    benchmarkDna: ['29CM', '오늘의집'],
    referenceAesthetic: 'a warm, cozy, homely curated-living aesthetic',
    palette: 'warm amber, caramel and soft wood tones',
    subjectTemplate:
      'A [product] in [palette] tones on a warm wooden surface in cozy domestic light, ' +
      'warm side window light with long soft shadows, amber matte tone',
    camera: {
      cameraArchetype: 'full-frame camera',
      lens: '50mm lens',
      aperture: 'f/2.0',
      lighting: 'warm side window light',
      colorGrade: 'warm amber, matte',
      realismCues: 'soft falloff',
      resolution: '4K',
      aspectRatio: '4:5',
    },
  },
  M5: {
    code: 'M5',
    nameKo: '발랄·재미',
    conversionJob: '명랑·선물하기 좋음',
    benchmarkDna: ['밝은 라이프스타일'],
    referenceAesthetic: 'a bright, playful, vibrant gift-ready lifestyle aesthetic',
    palette: 'bright cheerful pastels',
    subjectTemplate:
      'A [product] in cheerful [palette] on a bright pastel surface, cheerful even daylight',
    camera: {
      cameraArchetype: 'crisp full-frame camera',
      lens: '35mm lens',
      aperture: 'f/4',
      lighting: 'bright even daylight',
      colorGrade: 'saturated, cheerful',
      realismCues: 'light cheerful pop',
      resolution: '2K',
      aspectRatio: '1:1',
    },
  },
  M6: {
    code: 'M6',
    nameKo: '프리미엄·감각',
    conversionJob: '고급·값어치',
    benchmarkDna: ['이솝', '29CM'],
    referenceAesthetic: 'a refined, luxurious, premium-boutique craft aesthetic',
    palette: 'deep muted tones with refined contrast',
    subjectTemplate:
      'A [product] in [palette] on a deep muted backdrop, ' +
      'directional chiaroscuro lighting with controlled contrast, premium craft mood',
    camera: {
      cameraArchetype: 'medium-format / Phase One camera',
      lens: '90mm lens',
      aperture: 'f/5.6',
      lighting: 'directional chiaroscuro',
      colorGrade: 'deep, muted',
      realismCues: 'controlled specular highlights',
      resolution: '4K',
      aspectRatio: '4:5',
    },
  },
};

// Ordered list (M1..M6) for UI iteration and seed determinism.
export const MOOD_CODES: MoodCode[] = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'];
