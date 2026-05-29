// adobe-tool-router.ts
// Maps a thumbnail variant + ToneDirective to an Adobe tool/model plan.
//
// Authority:
//   - docs/research/KKOTIUM_ADOBE_WORKFLOW_RESEARCH_2026-05-29.md
//       (§6-E tool matrix, §2-D model rules)
//   - docs/handoff/HANDOFF_g8_engine_q4_2026-05-29.md (§2-A)
//
// Division of labor (research §1, §6): cutout = Express, background
// generation / composite = Firefly, precision composite = Photoshop. The
// system decides the per-variant tool and model deterministically.
//
// Hard rule (handoff §4-A): clean/badge final commercial output must use a
// Firefly-native model (Image 4/5) under Adobe IP indemnity. Partner models
// (Gemini/Nano Banana) are only allowed for lifestyle intermediate assets.
//
// Pure module: no IO, no network.

import type { ThumbnailVariant } from './thumbnail-generator';
import type { ToneDirective, BaseTone } from './category-tone-mapper';

// Adobe surface that owns the step.
export type AdobeTool = 'express' | 'firefly-generate' | 'firefly-edit' | 'photoshop-fill';

// Image model. Firefly-native models are commercially indemnified by Adobe;
// partner models (Gemini Nano Banana / Imagen / GPT) leave the creator liable.
export type FireflyModel =
  | 'firefly-image-5'
  | 'firefly-image-4-ultra'
  | 'firefly-image-4'
  | 'gemini-3-nano-banana-pro'
  | 'gemini-3-1-nano-banana-2'
  | 'gemini-2-5-nano-banana'
  | 'imagen'
  | 'gpt-image-2';

export interface AdobeToolPlan {
  variant: ThumbnailVariant;
  primaryTool: AdobeTool;
  model?: FireflyModel;
  fallbackTool?: AdobeTool;
  commercialSafety: 'adobe-indemnified' | 'creator-liable';
  rationale: string;
}

// Lifestyle model selection keyed off baseTone (research §2-D / handoff §2-A).
// Returns the model, its commercial-safety posture, and a short rationale.
function pickLifestyleModel(
  baseTone: BaseTone,
): { model: FireflyModel; commercialSafety: AdobeToolPlan['commercialSafety']; rationale: string } {
  switch (baseTone) {
    case 'korean-traditional':
      // Korean aesthetic edge; Firefly mistranslates hanbok toward kimono, so a
      // partner model leads the draft. Final commercial cut needs a
      // Firefly-native re-render for indemnity.
      return {
        model: 'gemini-3-1-nano-banana-2',
        commercialSafety: 'creator-liable',
        rationale:
          'Partner model leads for Korean aesthetic accuracy (Firefly hanbok-to-kimono weakness); final commercial cut requires a Firefly-native re-render.',
      };
    case 'foreign-cinematic':
    case 'foreign-cinematic-sunlit':
    case 'modern-minimal':
      return {
        model: 'firefly-image-5',
        commercialSafety: 'adobe-indemnified',
        rationale: 'Firefly Image 5 background generation under Adobe IP indemnity.',
      };
    case 'kinfolk':
    case 'pastel-friendly':
      return {
        model: 'gemini-2-5-nano-banana',
        commercialSafety: 'creator-liable',
        rationale: 'Nano Banana 2.5 chosen for compositing and editing strength on soft kinfolk scenes.',
      };
    default:
      return {
        model: 'firefly-image-5',
        commercialSafety: 'adobe-indemnified',
        rationale: 'Default to Firefly Image 5 for commercial safety.',
      };
  }
}

// Resolve the Adobe tool/model plan for a thumbnail variant given its tone.
export function planAdobeWorkflow(
  variant: ThumbnailVariant,
  toneDirective: ToneDirective,
): AdobeToolPlan {
  switch (variant) {
    case 'clean':
      return {
        variant,
        primaryTool: 'express',
        model: 'firefly-image-5',
        fallbackTool: 'photoshop-fill',
        commercialSafety: 'adobe-indemnified',
        rationale:
          'Express background-removal cutout (no credits, fast), then a textless Firefly Image 5 re-render for an indemnified commercial cut.',
      };
    case 'price':
      return {
        variant,
        primaryTool: 'express',
        commercialSafety: 'adobe-indemnified',
        rationale: 'Express handles text and Brand Kit layout; no generative model needed.',
      };
    case 'badge':
      return {
        variant,
        primaryTool: 'express',
        model: 'firefly-image-5',
        fallbackTool: 'firefly-generate',
        commercialSafety: 'adobe-indemnified',
        rationale:
          'Express composites text and badge; Firefly Image 5 supplies an indemnified base when re-rendering is required.',
      };
    case 'lifestyle': {
      const lifestyle = pickLifestyleModel(toneDirective.baseTone);
      return {
        variant,
        primaryTool: 'firefly-generate',
        model: lifestyle.model,
        fallbackTool: 'photoshop-fill',
        commercialSafety: lifestyle.commercialSafety,
        rationale: `Firefly generates the AI background with Photoshop non-destructive product composite as fallback. ${lifestyle.rationale}`,
      };
    }
    default: {
      // Exhaustiveness guard: every ThumbnailVariant is handled above.
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}
