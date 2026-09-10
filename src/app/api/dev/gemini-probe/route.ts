// src/app/api/dev/gemini-probe/route.ts
// ============================================================================
// TEMP DIAGNOSTIC — verifies GEMINI_API_KEY(s) are present and gemini-3.6-flash
// is actually live in production, per #324 (model survival must be checked).
// Read-only: one small generateContent call. No side effects. Delete after use.
// ============================================================================
import { NextResponse } from 'next/server';
import { callGemini, hasGeminiKey, GEMINI_MODEL } from '@/lib/ai/gemini';

export const dynamic = 'force-dynamic';

export async function GET() {
  const keysPresent = {
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    GEMINI_API_KEY_2: !!process.env.GEMINI_API_KEY_2,
    GEMINI_API_KEY_3: !!process.env.GEMINI_API_KEY_3,
  };

  let callResult: { ok: boolean; content?: string; error?: string } = { ok: false };
  try {
    const content = await callGemini('테스트', '한 단어로만 답하세요: 정상');
    callResult = { ok: true, content: content.slice(0, 200) };
  } catch (e) {
    callResult = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json({ hasKey: hasGeminiKey(), keysPresent, configuredModel: GEMINI_MODEL, callResult });
}
