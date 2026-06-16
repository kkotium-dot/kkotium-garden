// useEngineStrategy — fetch the Stage 1 engine strategy for one product.
// One call feeds all three engine panels (DNA / slot funnel / publish gate).
// Reverse-deploy-safe: a 503 degraded response surfaces as `degraded` (the
// panels show a "preparing" state instead of an error).

'use client';

import { useEffect, useState } from 'react';

export interface EngineSlotView {
  slotType: string;
  required: boolean;
  modelRoute: string;
  aspect: string;
  grounding: boolean;
  mood: string;
  realismLane: string;
  conversionJob: string;
  contentType: string;
  textPolicy: string;
  sectionIds: string[];
  promptPreview: string;
  cameraKey: string;
}

export interface EngineDnaView {
  categoryCode: string;
  categoryName: string;
  version: number;
  status: string;
  confidence: number;
  demographics: { ageCore?: string[]; ageLead?: string; ageNote?: string; genderNote?: string };
  seasonality: { peakMonths?: string[]; troughMonth?: string; recoveryMonth?: string; shape?: string; implication?: string };
  priceTiers: { budget?: string; midPremium?: string; premiumElectronic?: string; note?: string };
  titleConventions: { structure?: string; highFreqTokens?: string[]; scentInTitle?: string[]; implication?: string };
  trustSignals: string[];
  toneManner: { palette?: string; mood?: string; casting?: string };
  mandatorySlots: string[];
  thumbnailConventions: { rule?: string; source?: string };
  limitations: string[];
}

export interface EngineGateView {
  publishReady: boolean;
  hardComplete: boolean;
  seoComplete: boolean;
  hardFieldsMissing: string[];
  seoFieldsMissing: string[];
  authentic: boolean;
  authenticityViolations: Array<{ field?: string; reason?: string } & Record<string, unknown>>;
  naverPayloadComplete: boolean;
  naverPayloadMissing: string[];
  thumbnailAssessed: boolean;
  thumbnailPass: boolean;
  thumbnailViolations: Array<{ code?: string; reason?: string } & Record<string, unknown>>;
  status: string;
  naverProductId: string | null;
}

export interface EngineStrategyResponse {
  productId: string;
  categoryCode: string;
  dnaSource: 'db' | 'seed' | 'none';
  dna: EngineDnaView;
  slots: EngineSlotView[];
  gate: EngineGateView | null;
}

export interface UseEngineStrategy {
  data: EngineStrategyResponse | null;
  loading: boolean;
  degraded: boolean;
  error: string | null;
}

export function useEngineStrategy(productId: string | null): UseEngineStrategy {
  const [data, setData] = useState<EngineStrategyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) {
      setData(null);
      setError(null);
      setDegraded(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDegraded(false);
    fetch(`/api/engine/strategy?productId=${encodeURIComponent(productId)}`, { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.status === 503 || json?.degraded) {
          setDegraded(true);
          setData(null);
          return;
        }
        if (!res.ok) {
          setError(json?.error ?? `HTTP ${res.status}`);
          setData(null);
          return;
        }
        setData(json as EngineStrategyResponse);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  return { data, loading, degraded, error };
}
