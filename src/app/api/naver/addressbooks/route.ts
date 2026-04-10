// src/app/api/naver/addressbooks/route.ts
// A-3: Naver SmartStore addressbook sync
// Endpoint: GET /external/v1/seller/addressbooks-for-page
// Fetches RELEASE (pickup) and REFUND_OR_EXCHANGE (return) addresses
// Note: releaseAddressId / returnAddressId stored as JSON in StoreSettings memo field
// until schema migration adds dedicated columns

import { NextResponse } from 'next/server';
import { naverRequest } from '@/lib/naver/api-client';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface AddressEntry {
  addressNo: number;
  addressName: string;
  addressType: string;
  name: string;
  tel: string;
  address: string;
  detailAddress?: string;
  zipCode: string;
  isDefault: boolean;
}

interface AddressbookPage {
  content: AddressEntry[];
  totalCount: number;
}

/** GET /api/naver/addressbooks — fetch and return pickup + return addresses */
export async function GET() {
  try {
    // Fetch both address types in parallel
    const [releaseResult, returnResult] = await Promise.allSettled([
      naverRequest<AddressbookPage>('GET', '/v1/seller/addressbooks-for-page?addressType=RELEASE&size=20'),
      naverRequest<AddressbookPage>('GET', '/v1/seller/addressbooks-for-page?addressType=REFUND_OR_EXCHANGE&size=20'),
    ]);

    const releaseAddresses: AddressEntry[] = releaseResult.status === 'fulfilled'
      ? (releaseResult.value?.content ?? [])
      : [];
    const returnAddresses: AddressEntry[] = returnResult.status === 'fulfilled'
      ? (returnResult.value?.content ?? [])
      : [];

    const releaseError = releaseResult.status === 'rejected' ? String(releaseResult.reason) : null;
    const returnError  = returnResult.status  === 'rejected' ? String(returnResult.reason)  : null;

    // Pick defaults (isDefault flag or first entry)
    const defaultRelease = releaseAddresses.find(a => a.isDefault) ?? releaseAddresses[0] ?? null;
    const defaultReturn  = returnAddresses.find(a => a.isDefault)  ?? returnAddresses[0]  ?? null;

    // Store address IDs in StoreSettings using Prisma's known fields
    // We use asGuide field to cache address IDs as JSON until schema migration
    if (defaultRelease || defaultReturn) {
      try {
        const settings = await prisma.storeSettings.findFirst();
        const addressCache = JSON.stringify({
          releaseAddressId: defaultRelease ? String(defaultRelease.addressNo) : null,
          returnAddressId:  defaultReturn  ? String(defaultReturn.addressNo)  : null,
          syncedAt: new Date().toISOString(),
        });
        if (settings) {
          // Append to memo — use asGuide to store address cache JSON
          await prisma.storeSettings.update({
            where: { id: settings.id },
            data:  { asGuide: addressCache },
          });
        } else {
          await prisma.storeSettings.create({
            data: { id: 'default', asGuide: addressCache },
          });
        }
      } catch {
        // Non-critical — continue even if settings update fails
      }
    }

    return NextResponse.json({
      success: true,
      releaseAddresses,
      returnAddresses,
      defaults: {
        release: defaultRelease,
        return:  defaultReturn,
      },
      synced: {
        releaseAddressId: defaultRelease ? String(defaultRelease.addressNo) : null,
        returnAddressId:  defaultReturn  ? String(defaultReturn.addressNo)  : null,
      },
      errors: {
        release: releaseError,
        return:  returnError,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Addressbook sync error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
