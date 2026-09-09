// GET /api/naver/orders — sync Naver orders into DB
// Naver API response: { data: { contents: [ { productOrderId, content: { order, productOrder, currentClaim, ... } } ] } }

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getChangedOrderIds,
  getOrderDetails,
  isNaverAppStatusInvalid,
  isNaverClientSecretInvalid,
  NAVER_APP_STATUS_USER_MESSAGE,
  NAVER_CLIENT_SECRET_USER_MESSAGE,
} from '@/lib/naver/api-client';
import { readSubstituteInfo, matchByOptionValue } from '@/lib/product-link';
import { sendDiscord } from '@/lib/discord';

// ── B13 (docs/plan/B11_B13_B15_HANDOFF_SPEC_2026-09-09.md) — 옵션별 대체상품
// 주문 알림 ──────────────────────────────────────────────────────────────
// "화이트 주문 시 이 상품으로 발주" 케이스. ⚠️ Naver productOrder의 정확한
// 옵션텍스트/상품번호 필드명은 이 세션에서 실측하지 못했다(라이브 Naver API
// 호출 불가 환경) — 아래 후보 필드명은 Naver Commerce API v1 공개 문서상
// 표준 이름을 근거로 한 추정이며, #357(근거없는 기본값 신뢰금지) 원칙에 따라
// 검증 전까지 절대 신뢰하지 않는다(docs/playbook/RISKY_IDIOMS.md IDIOM-5와
// 동일 위험군 — REST긴 하지만 "요청/매핑이 조용히 실패해도 200이 온다"는
// 본질이 같다). 그래서 ORDER_OPTION_ALERT_ENABLED가 꺼져
// 있는 한(기본값) Discord 실발송은 절대 없고, 매칭 결과만 이 route의 JSON
// 응답(orderOptionAlerts)에 실어 dry-run 검증에 쓴다(#46 — 비가역 발송 위험).
// Desktop 검증 방법: 실 주문 1건에서 console.log(JSON.stringify(productOrder))
// 로 실제 필드명 확인 → 다르면 CANDIDATE_OPTION_FIELDS/CANDIDATE_PRODUCT_NO_FIELDS
// 수정 → orderOptionAlerts가 기대대로 뜨는지 확인 → 그제서야 플래그를 켤 것.
const CANDIDATE_OPTION_FIELDS = ['productOption', 'optionInfo', 'optionName', 'optionText'];
const CANDIDATE_PRODUCT_NO_FIELDS = ['originProductNo', 'productId', 'productNo'];

function firstNonEmptyString(o: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return null;
}

interface OrderOptionAlert {
  naverOrderId: string;
  productId: string;
  productName: string;
  optionValue: string;
  substituteName: string;
}

/**
 * productOrder에서 옵션 텍스트 + Naver 상품번호를 뽑아, 앱 Product(naverProductId
 * 매칭) → optionValues 중 옵션 텍스트에 포함된 값 → substitute_info.optionMatches
 * 순으로 매칭한다. 매칭 안 되면(필드명이 틀렸거나, 매칭 미설정이거나) 조용히
 * null — 이 함수는 절대 throw하지 않는다(주문 동기화 자체를 막으면 안 됨, #82).
 */
async function matchOrderOptionSubstitute(
  naverOrderId: string,
  productOrder: Record<string, unknown>,
): Promise<OrderOptionAlert | null> {
  try {
    const optionText = firstNonEmptyString(productOrder, CANDIDATE_OPTION_FIELDS);
    const naverProductNo = firstNonEmptyString(productOrder, CANDIDATE_PRODUCT_NO_FIELDS);
    if (!optionText || !naverProductNo) return null;

    const product = await prisma.product.findFirst({
      where: { naverProductId: naverProductNo },
      select: { id: true, name: true, optionValues: true },
    });
    if (!product) return null;

    const values = Array.isArray(product.optionValues)
      ? (product.optionValues as unknown[]).filter((v): v is string => typeof v === 'string')
      : [];
    const matchedValue = values.find((v) => optionText.includes(v));
    if (!matchedValue) return null;

    const subMap = await readSubstituteInfo([product.id]);
    const match = matchByOptionValue(subMap.get(product.id), matchedValue);
    if (!match) return null;

    return {
      naverOrderId,
      productId: product.id,
      productName: product.name,
      optionValue: matchedValue,
      substituteName: match.substituteName,
    };
  } catch {
    return null;
  }
}

export const dynamic = 'force-dynamic';

const STATUS_MAP: Record<string, string> = {
  PAYMENT_WAITING:  'PENDING',
  PAYED:            'PAID',
  DELIVERING:       'SHIPPING',
  DELIVERED:        'DELIVERED',
  PURCHASE_DECIDED: 'COMPLETED',
  EXCHANGED:        'EXCHANGED',
  CANCELED:         'CANCELLED',
  CANCEL_DONE:      'CANCELLED',
  CANCEL_REQUEST:   'CANCEL_REQUESTED',
  RETURNED:         'RETURNED',
  RETURN_DONE:      'RETURNED',
  RETURN_REQUEST:   'RETURN_REQUESTED',
};

// Korean labels for cancel/return reasons
const CLAIM_REASON_MAP: Record<string, string> = {
  INTENT_CHANGED:        '단순 변심',
  WRONG_ITEM_DELIVERED:  '상품 오배송',
  DEFECTIVE_PRODUCT:     '상품 불량',
  DIFFERENT_PRODUCT:     '상품 정보 상이',
  OUT_OF_STOCK:          '재고 부족',
  DELAYED_DELIVERY:      '배송 지연',
  WRONG_ORDER:           '주문 실수',
  PRICE_CHANGE:          '가격 변동',
  UNAUTHORIZED_ORDER:    '미성년자 결제',
  OTHER:                 '기타',
};

const toKST = (d: Date) => d.toISOString().replace('Z', '+09:00');

// §4-B — 창(window) 사이 겹침(overlap)로 상태 전이 경계 유실 방지.
// last-changed-statuses 는 창의 시작·끝 시각에 정확히 걸친 이벤트를 하나의 창에서만
// 잡음. 창 사이가 무겹침이면 경계 시각의 배송완료/구매확정 등이 한쪽 창에서 안잡히고
// 다음 창은 이미 지나 있어 완전 유실 가능. 5분 겹침으로 완충(dedup은 changedIds Set에서
// 자연 처리). 24h 최대 창(104140 회피) - 5min ≈ 82500000ms.
const NAVER_LAST_CHANGED_MAX_MS = 23 * 60 * 60 * 1000; // 23h (Naver 24h 하드리밋 보수)
const NAVER_WINDOW_OVERLAP_MS   = 5 * 60 * 1000;       // 5분 overlap

function splitWindows(from: Date, to: Date) {
  const windows: { from: Date; to: Date }[] = [];
  let cursor = new Date(from);
  while (cursor < to) {
    const end = new Date(Math.min(cursor.getTime() + NAVER_LAST_CHANGED_MAX_MS, to.getTime()));
    windows.push({ from: new Date(cursor), to: end });
    // 요청 끝(to)까지 커버했으면 종료 — cursor 반복 뒤로 밀기(무한루프) 방지.
    if (end.getTime() >= to.getTime()) break;
    // 다음 창을 5분 앞당겨서 겹침 확보. overlap이 window 폭 이상이면 방어 종료.
    const nextStart = end.getTime() - NAVER_WINDOW_OVERLAP_MS;
    if (nextStart <= cursor.getTime()) break;
    cursor = new Date(nextStart);
  }
  return windows;
}

export async function GET(request: NextRequest) {
  try {
    const url    = new URL(request.url);
    const hours  = Number(url.searchParams.get('hours') ?? '24');
    const manual = url.searchParams.get('manual') === '1';
    // ORDER-SYNC-2: backfill re-fetches EVERY locally-stored order (not just the
    // last-changed delta) so field fixes (e.g. the address mapping) reach orders
    // that have not changed status recently. Read-only from Naver, upsert locally.
    const backfill = url.searchParams.get('backfill') === '1';

    const authHeader = request.headers.get('authorization');
    if (!manual && process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fromDate = new Date(Date.now() - hours * 3_600_000);
    const toDate   = new Date();
    const windows  = splitWindows(fromDate, toDate);

    // #192 — Step 1: collect CHANGED productOrderIds per <=23h window from the
    // last-changed-statuses endpoint (queries by change time, so it captures state
    // transitions — 구매확정/취소/반품 — of orders created outside the window). The
    // old `from`/`to` product-orders query is CREATE-date only and missed these.
    // #62/#82: track per-window failures so a TOTAL outage is surfaced honestly.
    const changedIds = new Set<string>();
    let windowErrors = 0;
    let lastError: unknown = null;

    for (const w of windows) {
      try {
        const ids = await getChangedOrderIds(toKST(w.from), toKST(w.to));
        for (const id of ids) changedIds.add(id);
      } catch (err: unknown) {
        windowErrors++;
        lastError = err;
        console.error('[naver/orders] last-changed window error:', err instanceof Error ? err.message : err);
      }
    }

    // #192 — Step 2: pull full order details in batches of 300 (POST query). Each
    // element is { order, productOrder, delivery, currentClaim? } (flat, not under
    // `content` like the old product-orders GET response).
    const ids = Array.from(changedIds);
    // Backfill: union in every locally-stored order id so their details (and thus
    // fixed fields like the shipping address) are re-pulled and re-upserted.
    if (backfill) {
      const existing = await prisma.order.findMany({ select: { id: true } });
      const seen = new Set(ids);
      for (const o of existing) if (!seen.has(o.id)) { ids.push(o.id); seen.add(o.id); }
    }
    const details: unknown[] = [];
    let detailErrors = 0;
    for (let k = 0; k < ids.length; k += 300) {
      try {
        const d = await getOrderDetails(ids.slice(k, k + 300));
        details.push(...d);
      } catch (err: unknown) {
        detailErrors++;
        lastError = err;
        console.error('[naver/orders] detail batch error:', err instanceof Error ? err.message : err);
      }
    }

    // Honest total-failure gate (#82): every last-changed window failed, OR there
    // were changed ids but every detail batch failed — a real outage, not "0 orders".
    const totalFailure =
      (windows.length > 0 && windowErrors === windows.length) ||
      (ids.length > 0 && details.length === 0 && detailErrors > 0);
    if (totalFailure) {
      const naverStatus = isNaverAppStatusInvalid(lastError)
        ? 'app_status_invalid'
        : isNaverClientSecretInvalid(lastError)
        ? 'client_secret_invalid'
        : 'unavailable';
      const message =
        naverStatus === 'app_status_invalid'
          ? NAVER_APP_STATUS_USER_MESSAGE
          : naverStatus === 'client_secret_invalid'
          ? NAVER_CLIENT_SECRET_USER_MESSAGE
          : '네이버 주문 API가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해 주세요.';
      console.error(`[naver/orders] total failure — naverStatus=${naverStatus} windowErrors=${windowErrors}/${windows.length} detailErrors=${detailErrors}`);
      return NextResponse.json(
        { success: false, naverStatus, error: message, synced: 0, skipped: 0, total: 0, windows: windows.length },
        { status: 200 },
      );
    }

    let synced = 0, skipped = 0;
    const orderOptionAlerts: OrderOptionAlert[] = [];

    for (const item of details) {
      const el      = item as Record<string, unknown>;
      const productOrder = (el.productOrder as Record<string, unknown>) ?? {};
      const order        = (el.order        as Record<string, unknown>) ?? {};
      // ORDER-SYNC-2 (#200): in the flat query response the address is nested
      // under `productOrder.shippingAddress` — NOT el.shippingAddress (absent). The
      // whole store showed blank addresses while customerName worked, because
      // order.ordererName was already the right path. (el.delivery carries the
      // tracking/courier fields — now mapped below, #230.)
      // Live-verified shape: { name, tel1, zipCode, baseAddress, detailedAddress }.
      const shipping     = (productOrder.shippingAddress as Record<string, unknown>) ?? {};
      const claim        = (el.currentClaim  as Record<string, unknown>) ?? {};
      const naverOrderId = String(productOrder.productOrderId ?? '');
      if (!naverOrderId) { skipped++; continue; }

      try {

        // Status: from productOrder
        const rawStatus = String(productOrder.productOrderStatus ?? '');
        const status    = STATUS_MAP[rawStatus] ?? 'PENDING';

        // Claim info (cancel / return)
        const claimData    = (claim.cancel ?? claim.return ?? claim.exchange ?? {}) as Record<string, unknown>;
        const claimReason  = CLAIM_REASON_MAP[String(claimData.cancelReason ?? claimData.returnReason ?? '')] ?? '';
        const claimDetail  = String(claimData.cancelDetailedReason ?? claimData.returnDetailedReason ?? '').slice(0, 500);
        const refundStatus = String(claimData.refundStandbyStatus ?? '');

        // Customer info
        const customerName  = String(order.ordererName  ?? shipping.name ?? '');
        const customerPhone = String(order.ordererTel   ?? shipping.tel1 ?? '');

        // Shipping address = baseAddress + detailedAddress (composed). Cancelled
        // orders may legitimately have neither → '' (no fabrication, #82).
        const baseAddress     = String((shipping.baseAddress     as string | undefined) ?? '');
        const detailedAddress = String((shipping.detailedAddress as string | undefined) ?? '');
        const shippingAddress = [baseAddress, detailedAddress].filter(Boolean).join(' ');
        const shippingZipcode = String((shipping.zipCode as string | undefined) ?? '');

        const totalAmount = Number(productOrder.totalPaymentAmount ?? order.generalPaymentAmount ?? 0);
        const productName = String(productOrder.productName ?? '');
        const quantity    = Number(productOrder.quantity    ?? 1);
        const paymentDate = order.paymentDate ? new Date(String(order.paymentDate)) : null;

        // ★ Delivery tracking (#230) — the flat query element carries a `delivery`
        // object (송장번호·택배사·발송/배송완료일). It was known but never mapped
        // (see the `el.delivery (tracking only)` note above), so EVERY order — even
        // DELIVERED — had null tracking. Naver product-order query shape:
        //   { deliveryMethod, deliveryCompany, trackingNumber, sendDate,
        //     deliveredDate, ... }. Any field absent (e.g. not yet shipped) → null
        //   (#82 no fabrication — null = unknown, never a fake value).
        const delivery       = (el.delivery as Record<string, unknown>) ?? {};
        const trackingNumber = String(delivery.trackingNumber ?? '') || null;
        const courierCompany = String(delivery.deliveryCompany ?? '') || null;
        const shippedAt      = delivery.sendDate      ? new Date(String(delivery.sendDate))      : null;
        const deliveredAt    = delivery.deliveredDate ? new Date(String(delivery.deliveredDate)) : null;

        // Payment / settlement (#230). paidAt mirrors the payment timestamp. Fee &
        // method only when Naver returns them → else null (#82: 0 would fake "free
        // shipping"; null = unknown).
        const paidAt         = paymentDate;
        const shippingFeeRaw = productOrder.deliveryFeeAmount ?? order.deliveryFeeAmount;
        const shippingFee    = shippingFeeRaw != null ? Number(shippingFeeRaw) : null;
        const paymentMethod  = String(order.paymentMeans ?? '') || null;

        await (prisma as any).order.upsert({
          where:  { id: naverOrderId },
          update: {
            status,
            totalAmount,
            customerName,
            customerPhone,
            shippingAddress,
            shippingZipcode,
            productName,
            quantity,
            claimReason:  claimReason  || null,
            claimDetail:  claimDetail  || null,
            refundStatus: refundStatus || null,
            paymentDate,
            // #230 — delivery + settlement completeness
            trackingNumber,
            courierCompany,
            shippedAt,
            deliveredAt,
            paidAt,
            shippingFee,
            paymentMethod,
            updatedAt: new Date(),
          },
          create: {
            id:             naverOrderId,
            orderNumber:    naverOrderId,
            status,
            totalAmount,
            totalPrice:     totalAmount,
            customerName,
            customerEmail:  '',
            customerPhone,
            shippingAddress,
            shippingZipcode,
            productName,
            quantity,
            claimReason:    claimReason  || null,
            claimDetail:    claimDetail  || null,
            refundStatus:   refundStatus || null,
            paymentDate,
            // #230 — delivery + settlement completeness
            trackingNumber,
            courierCompany,
            shippedAt,
            deliveredAt,
            paidAt,
            shippingFee,
            paymentMethod,
          },
        }).catch((e: unknown) => {
          console.error('[naver/orders] upsert error:', naverOrderId, e instanceof Error ? e.message : e);
        });

        synced++;

        // B13 — 옵션별 대체상품 주문 알림 (dry-run: 매칭만 계산, 아래 응답에서
        // orderOptionAlerts로 확인. ORDER_OPTION_ALERT_ENABLED=true일 때만 발송).
        // 신규 결제(PAID)로 막 전이된 주문만 대상 — 취소/반품/이미 알려진
        // 상태는 반복 알림을 만들지 않는다.
        if (status === 'PAID') {
          const alert = await matchOrderOptionSubstitute(naverOrderId, productOrder);
          if (alert) orderOptionAlerts.push(alert);
        }
      } catch (err: unknown) {
        console.error('[naver/orders] item error:', err instanceof Error ? err.message : err);
        skipped++;
      }
    }

    // B13 — dry-run 기본값(#46 비가역 발송 위험). ORDER_OPTION_ALERT_ENABLED가
    // 명시적으로 'true'일 때만 실제 디스코드 채널로 보낸다. Desktop이 실 주문
    // 필드명을 검증하고 매칭 결과(orderOptionAlerts)가 기대대로 나오는 것을
    // 확인하기 전까지는 절대 켜지 않는다.
    let orderOptionAlertsSent = false;
    if (orderOptionAlerts.length > 0 && process.env.ORDER_OPTION_ALERT_ENABLED === 'true') {
      for (const a of orderOptionAlerts) {
        await sendDiscord('STOCK_ALERT', '', [{
          title: `옵션별 대체상품 안내 — ${a.optionValue}`,
          description: `**${a.productName}** (${a.optionValue}) 주문 접수 → 대체상품 **${a.substituteName}**로 발주 확인이 필요해요.`,
          color: 0xf97316,
          timestamp: new Date().toISOString(),
        }]).catch(() => null);
      }
      orderOptionAlertsSent = true;
    }

    return NextResponse.json({
      success: true,
      synced,
      skipped,
      total:   details.length,
      changed: ids.length,
      windows: windows.length,
      period:  `${toKST(fromDate)} ~ ${toKST(toDate)}`,
      orderOptionAlerts,
      orderOptionAlertsSent,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[naver/orders] fatal:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
