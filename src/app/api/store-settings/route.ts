import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isSellerGrade } from '@/lib/naver-fee-rates-2026';


export const dynamic = 'force-dynamic';
const SETTINGS_ID = 'default';

// #250: normalize a seller-entered template list to {code,name}[] — codes are
// operator-typed digits, names are labels. Drops rows without a code, caps at 50.
function sanitizeTemplates(v: unknown): { code: string; name: string }[] {
  if (!Array.isArray(v)) return [];
  const out: { code: string; name: string }[] = [];
  const seen = new Set<string>();
  for (const raw of v) {
    if (!raw || typeof raw !== 'object') continue;
    const code = String((raw as { code?: unknown }).code ?? '').trim();
    const name = String((raw as { name?: unknown }).name ?? '').trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push({ code, name });
    if (out.length >= 50) break;
  }
  return out;
}

// P0-4 (2026-08-20): 운영자가 등록한 소싱 씨앗 키워드(string[]). 빈 문자열·
// 2자 미만·중복은 걸러내고 최대 20개로 제한한다.
function sanitizeSeedKeywords(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of v) {
    if (typeof raw !== 'string') continue;
    const t = raw.trim();
    if (t.length < 2 || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 20) break;
  }
  return out;
}

export async function GET() {
  try {
    // Use raw query to include domeggook_api_key which is not in Prisma schema yet
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT *, domeggook_api_key FROM store_settings WHERE id = 'default' LIMIT 1
    `;
    const settings = rows[0] ?? {
      id: SETTINGS_ID,
      free_shipping_threshold: 30000,
      store_name: '',
      as_phone: '',
      as_guide: '',
      default_courier_code: 'CJGLS',
      default_return_fee: 6000,
      default_exchange_fee: 6000,
      domeggook_api_key: '',
      seller_grade: '영세',
    };
    // Mask API key — only show if set (first 6 chars + ***)
    const rawKey = String(settings.domeggook_api_key ?? '');
    const maskedKey = rawKey.length > 6 ? rawKey.slice(0, 6) + '***' : (rawKey ? '***' : '');
    // Normalize to camelCase for frontend consistency
    const normalized = {
      ...settings,
      domeggookApiKey: rawKey,              // camelCase alias
      domeggook_api_key_masked: maskedKey,
      domeggook_api_key_set: rawKey.length > 0,
      sellerGrade: String(settings.seller_grade ?? '영세'), // camelCase alias
      // sourcing_seed_keywords 컬럼이 아직 배포 전이면 undefined — 빈 배열로
      // 정상 처리한다(값 없음). 조회 자체의 실패(컬럼 부재로 인한 쿼리 에러)는
      // 이 raw SELECT * 에서는 발생하지 않는다(존재하지 않는 컬럼은 그냥
      // 결과에서 빠진다) — seed-keywords.ts의 findUnique 경로와 달리 여기선
      // 조용한 실패가 아니라 정상적인 "값 없음"이다.
      sourcingSeedKeywords: Array.isArray(settings.sourcing_seed_keywords) ? settings.sourcing_seed_keywords : [],
    };
    return NextResponse.json({ success: true, settings: normalized });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.freeShippingThreshold !== undefined)
      data.freeShippingThreshold = Number(body.freeShippingThreshold);
    if (body.storeName !== undefined)
      data.storeName = String(body.storeName).trim();
    if (body.asPhone !== undefined)
      data.asPhone = String(body.asPhone).trim();
    if (body.asGuide !== undefined)
      data.asGuide = String(body.asGuide).trim();
    if (body.defaultCourierCode !== undefined)
      data.defaultCourierCode = String(body.defaultCourierCode).trim();
    if (body.defaultReturnFee !== undefined)
      data.defaultReturnFee = Number(body.defaultReturnFee);
    if (body.defaultExchangeFee !== undefined)
      data.defaultExchangeFee = Number(body.defaultExchangeFee);
    if (body.sellerGrade !== undefined && isSellerGrade(body.sellerGrade))
      data.sellerGrade = body.sellerGrade;
    // #250: seller-managed template-code lists (제공고시/AS).
    if (body.noticeTemplates !== undefined)
      data.noticeTemplates = sanitizeTemplates(body.noticeTemplates);
    if (body.asTemplates !== undefined)
      data.asTemplates = sanitizeTemplates(body.asTemplates);
    if (body.sourcingSeedKeywords !== undefined)
      data.sourcingSeedKeywords = sanitizeSeedKeywords(body.sourcingSeedKeywords);
    // Domeggook OpenAPI Key
    if (body.domeggookApiKey !== undefined) {
      const key = String(body.domeggookApiKey).trim();
      await prisma.$executeRaw`UPDATE store_settings SET domeggook_api_key = ${key} WHERE id = 'default'`;
      if (!Object.keys(data).length) return NextResponse.json({ success: true });
    }

    data.updatedAt = new Date();

    const settings = await (prisma as any).storeSettings.upsert({
      where: { id: SETTINGS_ID },
      update: data,
      create: { id: SETTINGS_ID, ...data },
    });

    return NextResponse.json({ success: true, settings });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

// POST is an alias for PATCH — naver-settings page calls POST
export const POST = PATCH;
