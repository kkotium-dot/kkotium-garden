// src/app/api/platforms/[id]/credentials/route.ts
// ============================================================================
// OWNERCLAN_INTEGRATION_2026-09-09 — save/check/clear login credentials for a
// sourcing platform that needs password-based auto re-auth (currently: OWC).
// NOTE: despite the folder being [id] (shared with the existing platforms/[id]
// route which takes a cuid), this route's :id is actually the platform CODE
// (e.g. "OWC") — Next.js requires one slug name per path segment across
// sibling routes, so this reuses [id] rather than colliding with [code].
// POST body { username, password } encrypts+stores; the plaintext password
// is NEVER returned by GET, NEVER logged, and NEVER visible to Claude's own
// tool calls (this route runs on the deployed server, not in an assistant
// context — the operator types directly into the browser form).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encryptCredential } from '@/lib/security/credential-crypto';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const platformCode = params.id;
  const platform = await prisma.platform.findUnique({
    where: { code: platformCode },
    select: { loginUsername: true, credentialsUpdatedAt: true, encryptedPassword: true },
  });
  return NextResponse.json({
    success: true,
    configured: !!(platform?.loginUsername && platform.encryptedPassword),
    loginUsername: platform?.loginUsername ?? null,
    updatedAt: platform?.credentialsUpdatedAt ?? null,
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const platformCode = params.id;
  try {
    const body = await req.json().catch(() => ({}));
    const username = typeof body?.username === 'string' ? body.username.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!username || !password) {
      return NextResponse.json({ success: false, error: '아이디와 비밀번호를 모두 입력해주세요.' }, { status: 400 });
    }

    const platform = await prisma.platform.findUnique({ where: { code: platformCode } });
    if (!platform) {
      return NextResponse.json({ success: false, error: `등록되지 않은 플랫폼 코드입니다: ${platformCode}` }, { status: 404 });
    }

    let encryptedPassword: string;
    try {
      encryptedPassword = encryptCredential(password);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ success: false, error: `암호화 실패 — ${msg}` }, { status: 500 });
    }

    await prisma.platform.update({
      where: { code: platformCode },
      data: { loginUsername: username, encryptedPassword, credentialsUpdatedAt: new Date() },
    });

    return NextResponse.json({ success: true, message: '저장되었습니다.' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const platformCode = params.id;
  await prisma.platform.update({
    where: { code: platformCode },
    data: { loginUsername: null, encryptedPassword: null, credentialsUpdatedAt: null },
  });
  return NextResponse.json({ success: true });
}

