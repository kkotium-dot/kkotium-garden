// src/app/api/dev/groq-probe/route.ts
// ============================================================================
// TEMP DIAGNOSTIC — verifies GROQ_API_KEY(s) are present and the configured
// model (openai/gpt-oss-120b) is actually live, per #324 (model survival must
// be checked, not assumed). Read-only: one small completions call + one
// models-list call. No side effects, no writes. Delete after use.
// ============================================================================
import { NextResponse } from 'next/server';
import { callGroq, GROQ_MODEL } from '@/lib/ai/groq';

export const dynamic = 'force-dynamic';

export async function GET() {
  const keysPresent = {
    GROQ_API_KEY: !!process.env.GROQ_API_KEY,
    GROQ_API_KEY_2: !!process.env.GROQ_API_KEY_2,
    GROQ_API_KEY_3: !!process.env.GROQ_API_KEY_3,
  };

  let callResult: { ok: boolean; content?: string; error?: string } = { ok: false };
  try {
    const content = await callGroq('테스트', '한 단어로만 답하세요: 정상');
    callResult = { ok: true, content: content.slice(0, 200) };
  } catch (e) {
    callResult = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // Also check the models catalog to see if GROQ_MODEL is still listed.
  let modelsCheck: { ok: boolean; hasModel?: boolean; error?: string } = { ok: false };
  const key = process.env.GROQ_API_KEY;
  if (key) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        const data = await res.json();
        const ids: string[] = (data.data ?? []).map((m: { id: string }) => m.id);
        modelsCheck = { ok: true, hasModel: ids.includes(GROQ_MODEL) };
      } else {
        modelsCheck = { ok: false, error: `HTTP ${res.status}` };
      }
    } catch (e) {
      modelsCheck = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  return NextResponse.json({ keysPresent, configuredModel: GROQ_MODEL, callResult, modelsCheck });
}
