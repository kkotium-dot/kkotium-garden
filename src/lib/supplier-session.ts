// src/lib/supplier-session.ts
// Shared utility for retrieving supplier session cookies
// Used by: crawler/domemae, crawler/stock-check

import { prisma } from '@/lib/prisma';

/**
 * Get valid session cookies for a supplier platform (DMM or DMK).
 * Returns null if no valid session exists or session has expired.
 */
export async function getSessionCookies(platformCode: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<{ cookies: string; is_valid: boolean; expires_at: Date }[]>`
      SELECT cookies, is_valid, expires_at
      FROM supplier_sessions
      WHERE platform_code = ${platformCode}
        AND is_valid = true
        AND expires_at > NOW()
      LIMIT 1
    `;
    return rows[0]?.cookies ?? null;
  } catch {
    return null;
  }
}
