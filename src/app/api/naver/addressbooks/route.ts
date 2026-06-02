// src/app/api/naver/addressbooks/route.ts
// A-3 (2026-06-02 P0): Naver SmartStore addressbook sync — dedicated columns.
// Endpoint: GET /external/v1/seller/addressbooks-for-page
// Fetches RELEASE (출고지) + REFUND_OR_EXCHANGE (반품·교환지), caches addressBookNo
// into StoreSettings.releaseAddressId / returnAddressId. Per RESEARCH §1 the
// dropship seller pattern is a single representative pair — no per-product addresses.
//
// Diagnostic-first design (작업원칙 #46):
//   • On naverRequest failure, surface NaverApiError.diagnostic verbatim so the
//     operator can read GW.IP_NOT_ALLOWED / ECONNRESET / 429 directly without
//     re-parsing Vercel logs.
//   • Sync columns only when at least one default address resolves — never
//     silently overwrite with nulls.

import { NextResponse } from 'next/server';
import { naverRequest, NaverApiError } from '@/lib/naver/api-client';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface AddressEntry {
  addressBookNo?: number;
  addressNo?: number;          // legacy field name fallback
  addressName?: string;
  addressType?: string;
  name?: string;
  tel?: string;
  baseAddress?: string;
  address?: string;            // legacy
  detailAddress?: string;
  zipCode?: string;
  isDefault?: boolean;
}

interface AddressbookPage {
  content?: AddressEntry[];
  addressBooks?: AddressEntry[];   // RESEARCH §3 documented response shape
  totalCount?: number;
}

function pickAddressNo(a: AddressEntry): string | null {
  const v = a.addressBookNo ?? a.addressNo;
  return v ? String(v) : null;
}

function pickContent(page: AddressbookPage): AddressEntry[] {
  return page.addressBooks ?? page.content ?? [];
}

function diagnosticFromError(e: unknown) {
  if (e instanceof NaverApiError) return e.diagnostic;
  return { kind: 'UNKNOWN' as const, bodyHead: e instanceof Error ? e.message : String(e) };
}

/** GET /api/naver/addressbooks — fetch pickup + return addresses, cache addressBookNo */
export async function GET() {
  try {
    const [releaseResult, returnResult] = await Promise.allSettled([
      naverRequest<AddressbookPage>('GET', '/v1/seller/addressbooks-for-page?addressType=RELEASE&size=20'),
      naverRequest<AddressbookPage>('GET', '/v1/seller/addressbooks-for-page?addressType=REFUND_OR_EXCHANGE&size=20'),
    ]);

    const releaseAddresses: AddressEntry[] =
      releaseResult.status === 'fulfilled' ? pickContent(releaseResult.value) : [];
    const returnAddresses: AddressEntry[] =
      returnResult.status === 'fulfilled' ? pickContent(returnResult.value) : [];

    const releaseDiag = releaseResult.status === 'rejected' ? diagnosticFromError(releaseResult.reason) : null;
    const returnDiag  = returnResult.status  === 'rejected' ? diagnosticFromError(returnResult.reason)  : null;

    // 2026-06-02 hotfix — production 호출 결과 정정:
    //   네이버가 ?addressType= query를 무시하고 RELEASE/REFUND_OR_EXCHANGE/GENERAL을
    //   섞어 반환 + 응답에 isDefault 필드 부재 → 기존 `find(a => a.isDefault) ?? [0]`
    //   로직이 항상 첫 항목(RELEASE)을 픽 → 반품지가 출고지 No로 잘못 캐시되는 사고
    //   발생. 반드시 addressType 정확 매칭으로 후처리 필터 적용 (RESEARCH §3).
    const pickRelease = (list: AddressEntry[]) =>
      list.find(a => a.addressType === 'RELEASE' && a.isDefault) ??
      list.find(a => a.addressType === 'RELEASE') ?? null;
    const pickReturn = (list: AddressEntry[]) =>
      list.find(a => a.addressType === 'REFUND_OR_EXCHANGE' && a.isDefault) ??
      list.find(a => a.addressType === 'REFUND_OR_EXCHANGE') ?? null;

    const defaultRelease = pickRelease(releaseAddresses);
    const defaultReturn  = pickReturn(returnAddresses);

    const releaseAddressId = defaultRelease ? pickAddressNo(defaultRelease) : null;
    const returnAddressId  = defaultReturn  ? pickAddressNo(defaultReturn)  : null;

    // Persist to dedicated columns. Skip entirely if both calls failed — never
    // wipe a previously good cache when the gateway is temporarily down.
    if (releaseAddressId || returnAddressId) {
      try {
        const settings = await prisma.storeSettings.findFirst();
        const data = {
          // Only overwrite columns we actually resolved — preserve the other
          // side if only one call succeeded.
          ...(releaseAddressId ? { releaseAddressId } : {}),
          ...(returnAddressId  ? { returnAddressId  } : {}),
          addressbookSyncedAt: new Date(),
        };
        if (settings) {
          await prisma.storeSettings.update({
            where: { id: settings.id },
            data,
          });
        } else {
          await prisma.storeSettings.create({
            data: { id: 'default', ...data },
          });
        }
      } catch (persistErr) {
        console.error('[addressbooks] persist failed:', persistErr instanceof Error ? persistErr.message : persistErr);
        // Non-fatal — return resolved IDs anyway so the caller can retry.
      }
    }

    const allFailed = !releaseAddressId && !returnAddressId && (releaseDiag || returnDiag);

    return NextResponse.json({
      success: !allFailed,
      releaseAddresses,
      returnAddresses,
      defaults: { release: defaultRelease, return: defaultReturn },
      synced: { releaseAddressId, returnAddressId },
      diagnostics: {
        release: releaseDiag,
        return:  returnDiag,
      },
    }, { status: allFailed ? 502 : 200 });
  } catch (error: unknown) {
    const diag = diagnosticFromError(error);
    const msg  = error instanceof Error ? error.message : 'Unknown error';
    console.error('[addressbooks] fatal:', msg);
    return NextResponse.json({ success: false, error: msg, diagnostic: diag }, { status: 500 });
  }
}
