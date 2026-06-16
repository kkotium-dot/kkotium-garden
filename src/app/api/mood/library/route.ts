// GET / POST /api/mood/library
// ============================================================================
// Mood-Camera Spec System — accumulating learning library (authority §5).
//   GET  — best-rated / favorite entries grouped per mood code, so the picker
//          surfaces the top (mood, category) combination (learning reflection).
//   POST — capture a generated result into the library with a manual rating /
//          favorite (the only learning signal; UX stays 3 steps). The prompt is
//          re-assembled server-side from the mood spec so what is stored is
//          authoritative and product-agnostic (#55).
// Tables are additive — if the migration hasn't reached this environment yet the
// route degrades to empty / 503 instead of 500 (reverse-deploy-safe).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assemblePrompt } from '@/lib/mood/prompt-assembler';
import { MOOD_CODES } from '@/lib/mood/spec-data';
import type { MoodCode } from '@/lib/mood/types';

export const dynamic = 'force-dynamic';

function isMissingTable(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  const msg = e instanceof Error ? e.message : String(e);
  return code === 'P2021' || code === 'P2022' || /does not exist|relation .* does not exist|column/i.test(msg);
}

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category')?.trim() || null;
  try {
    const where: Prisma.PromptLibraryEntryWhereInput = category
      ? { productCategoryTags: { has: category } }
      : {};
    const entries = await prisma.promptLibraryEntry.findMany({
      where,
      include: { moodAxis: { select: { code: true, nameKo: true } } },
      orderBy: [{ isFavorite: 'desc' }, { rating: 'desc' }, { updatedAt: 'desc' }],
      take: 60,
    });
    const slim = entries.map((e) => ({
      id: e.id,
      moodCode: e.moodAxis.code,
      moodNameKo: e.moodAxis.nameKo,
      assembledPrompt: e.assembledPrompt,
      productCategoryTags: e.productCategoryTags,
      exampleOutputUrl: e.exampleOutputUrl,
      rating: e.rating,
      isFavorite: e.isFavorite,
      version: e.version,
      updatedAt: e.updatedAt,
    }));
    // First entry per mood code after the sort = the recommended default.
    const bestByMood: Record<string, (typeof slim)[number]> = {};
    for (const e of slim) {
      if (!bestByMood[e.moodCode]) bestByMood[e.moodCode] = e;
    }
    return NextResponse.json({ success: true, entries: slim, bestByMood });
  } catch (e) {
    if (isMissingTable(e)) return NextResponse.json({ success: true, entries: [], bestByMood: {} });
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> | null = null;
  try { body = await req.json(); } catch { body = null; }

  const moodCode = body?.moodCode as MoodCode | undefined;
  if (!moodCode || !MOOD_CODES.includes(moodCode)) {
    return NextResponse.json({ success: false, error: 'invalid moodCode' }, { status: 400 });
  }
  const product = String(body?.product ?? '').trim();
  const palette = body?.palette ? String(body.palette) : undefined;
  const categoryTags = Array.isArray(body?.productCategoryTags)
    ? (body!.productCategoryTags as unknown[]).map(String).filter(Boolean)
    : [];
  const rating =
    typeof body?.rating === 'number' && body.rating >= 1 && body.rating <= 5
      ? Math.round(body.rating)
      : null;
  const isFavorite = body?.isFavorite === true;

  // Authoritative server-side assembly (the stored prompt is never trusted from
  // the client — it is rebuilt from the mood spec).
  const assembled = assemblePrompt({ moodCode, product, palette, categoryTags });

  try {
    const axis = await prisma.moodAxis.findUnique({
      where: { code: moodCode },
      select: { id: true, benchmarkDna: true },
    });
    const camera = await prisma.cameraSpec.findFirst({
      where: { moodAxis: { code: moodCode } },
      select: { id: true },
    });
    if (!axis || !camera) {
      return NextResponse.json({ success: false, error: 'mood spec not seeded' }, { status: 503 });
    }

    const entry = await prisma.promptLibraryEntry.create({
      data: {
        moodAxisId: axis.id,
        cameraSpecId: camera.id,
        benchmarkDna: axis.benchmarkDna.join(', '),
        assembledPrompt: assembled.prompt,
        productCategoryTags: categoryTags,
        exampleOutputUrl: body?.exampleOutputUrl ? String(body.exampleOutputUrl) : null,
        rating,
        isFavorite,
      },
      select: { id: true },
    });

    // Optional generation provenance record.
    if (body?.outputUrl || body?.productName) {
      await prisma.generation.create({
        data: {
          entryId: entry.id,
          productName: String(body?.productName ?? product ?? 'product'),
          outputUrl: body?.outputUrl ? String(body.outputUrl) : null,
          model: String(body?.model ?? 'Nano Banana Pro'),
          rating,
        },
      });
    }

    return NextResponse.json({ success: true, id: entry.id, assembledPrompt: assembled.prompt });
  } catch (e) {
    if (isMissingTable(e)) {
      return NextResponse.json({ success: false, error: 'library not migrated' }, { status: 503 });
    }
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
