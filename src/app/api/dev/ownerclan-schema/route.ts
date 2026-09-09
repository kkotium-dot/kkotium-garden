// src/app/api/dev/ownerclan-schema/route.ts
// ============================================================================
// TEMP DIAGNOSTIC — one-time GraphQL introspection dump for OwnerClan's API.
// Not part of the app's product surface; exists purely so the operator's
// own manual PDF can be cross-checked against the LIVE schema (types can
// drift from documentation over time — #367). Delete after use once the
// schema snapshot is saved to docs/research/.
// ============================================================================
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decryptCredential } from '@/lib/security/credential-crypto';

export const dynamic = 'force-dynamic';

const INTROSPECTION_QUERY = `
query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    types {
      kind
      name
      fields(includeDeprecated: true) {
        name
        args { name type { name kind ofType { name kind } } }
        type { name kind ofType { name kind ofType { name kind } } }
      }
    }
  }
}`.trim();

export async function GET() {
  const platform = await prisma.platform.findUnique({
    where: { code: 'OWC' },
    select: { loginUsername: true, encryptedPassword: true },
  });
  if (!platform?.loginUsername || !platform.encryptedPassword) {
    return NextResponse.json({ success: false, error: 'OWC credentials not configured' }, { status: 400 });
  }
  const password = decryptCredential(platform.encryptedPassword);

  const authRes = await fetch('https://auth.ownerclan.com/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service: 'ownerclan', userType: 'seller', username: platform.loginUsername, password }),
  });
  if (!authRes.ok) {
    return NextResponse.json({ success: false, error: `auth failed: ${authRes.status}` }, { status: 502 });
  }
  const token = (await authRes.text()).trim();

  const url = new URL('https://api.ownerclan.com/v1/graphql');
  url.searchParams.set('query', INTROSPECTION_QUERY);
  const gqlRes = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await gqlRes.json();
  return NextResponse.json(json);
}
