// src/app/api/debug/gemini-check/route.ts
// Temporary diagnostic - checks each Gemini key status
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  const keys = [
    { name: 'GEMINI_API_KEY',   val: process.env.GEMINI_API_KEY },
    { name: 'GEMINI_API_KEY_2', val: process.env.GEMINI_API_KEY_2 },
    { name: 'GEMINI_API_KEY_3', val: process.env.GEMINI_API_KEY_3 },
  ];

  const results = [];
  for (const { name, val } of keys) {
    if (!val) { results.push({ key: name, status: 'NOT_SET' }); continue; }
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${val}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say OK in one word' }] }],
            generationConfig: { maxOutputTokens: 10 },
          }),
          signal: AbortSignal.timeout(10000),
        }
      );
      const data = await res.json();
      if (res.ok) {
        results.push({ key: name, status: 'OK', masked: '...' + val.slice(-6) });
      } else {
        results.push({
          key: name,
          status: `FAIL_${res.status}`,
          error: data?.error?.message?.slice(0, 100),
          masked: '...' + val.slice(-6),
        });
      }
    } catch (e) {
      results.push({ key: name, status: 'TIMEOUT_OR_ERROR', error: e instanceof Error ? e.message.slice(0, 60) : String(e) });
    }
  }

  return NextResponse.json({ timestamp: new Date().toISOString(), results });
}
