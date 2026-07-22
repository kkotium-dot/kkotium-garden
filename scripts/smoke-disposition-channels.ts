// scripts/smoke-disposition-channels.ts
// ============================================================================
// 처분(disposition) 7채널 정합 스모크 테스트 — 2026-07-23 수동검증 재현판.
//
// 목적: sourceGone=true를 유발하는 재고 스냅샷 3건(qty=-1 연속)을 실제 DB에
// 주입해, 서버 판정 단일 소스(loadDispositionVerdicts/countDispositionPending,
// disposition-load.ts)와 sourceGone 단일 소스(loadSourceGoneFlags,
// source-gone.ts)가 **동시에** count를 +1 반영하는지 확인하고, 원복까지
// 자동으로 수행한다. 네이버 PUT/POST·디스코드 발송 없음 — DB read/write only.
//
// 실행: npx tsx scripts/smoke-disposition-channels.ts [productId]
//   productId 생략 시 "안전한" 후보(재고 스냅샷 이력이 전혀 없는 등록 상품)를
//   자동 탐색한다. 명시적으로 지정하면 그 상품을 대상으로 한다 — 단, §1
//   안전조건을 통과하지 못하면 즉시 중단한다(실 운영 이력 오염 방지).
//
// 원복 안전조건(#69 인계 원칙과 동일 사상 — 검증 후 상태 원복 의무):
//   1) 주입 전, 대상 상품의 InventorySnapshot 행이 정확히 0건이어야 한다.
//      기존 이력이 하나라도 있으면 teardown이 "전체 삭제" 방식이라 실 폴링
//      이력을 지워버릴 수 있으므로 즉시 중단(assert, no destructive fallback).
//   2) 주입 스냅샷 3건은 polledAt = now / now-1h / now-2h로 서로 떨어뜨려
//      찍는다 — 운영 폴러(6시간 주기, /api/cron/inventory-sync)가 테스트
//      실행 중 끼어들어 순서를 섞는 사고를 피하기 위함(같은 타임스탬프나
//      "정각" 근처를 피한다).
//   3) teardown은 "주입한 3건을 정확히 지운다"가 아니라 "그 상품의 스냅샷을
//      전부 지운다"로 구현한다 — 안전한 이유는 조건 1)이 사전에 0건임을
//      보장했기 때문(그 사이 실 폴러가 끼어들지 않았는지는 사후검증 §4에서
//      재확인).
//
// 종료 코드: 0 = 전 채널 정합 확인 + 원복 성공. 1 = 사전조건 실패 또는 채널
// 불일치 또는 원복 실패(운영자 수동 확인 필요 — 스크립트가 남긴 로그의
// productId로 InventorySnapshot을 직접 점검할 것).
// ============================================================================

import { prisma } from '../src/lib/prisma';
import { loadDispositionVerdicts, countDispositionPending } from '../src/lib/products/disposition-load';
import { loadSourceGoneFlags, SOURCE_GONE_MIN_CONSECUTIVE } from '../src/lib/products/source-gone';

let stepNo = 0;
function step(msg: string) {
  stepNo += 1;
  console.log(`[${stepNo}] ${msg}`);
}
function ok(msg: string) {
  console.log(`    ok — ${msg}`);
}
function fail(msg: string): never {
  console.error(`    FAIL — ${msg}`);
  process.exit(1);
}

async function pickSafeCandidate(): Promise<string> {
  // 등록된(naverProductId 존재) 상품 중 스냅샷 이력이 전혀 없는 것을 하나 고른다.
  // 미등록 상품을 고르면 disposition.ts 2번 분기(!naverProductId → NONE)에
  // 걸려 sourceGone 주입이 판정에 아예 반영되지 않으므로 반드시 등록 상품이어야 함.
  const candidates = await prisma.product.findMany({
    where: { naverProductId: { not: null } },
    select: { id: true, name: true },
    take: 200,
  });
  for (const c of candidates) {
    const existing = await prisma.inventorySnapshot.count({ where: { productId: c.id } });
    if (existing === 0) return c.id;
  }
  fail('스냅샷 이력이 없는 등록 상품을 찾지 못함 — productId를 인자로 직접 지정할 것');
}

async function main() {
  const argPid = process.argv[2];

  step('대상 상품 선정');
  const productId = argPid ?? (await pickSafeCandidate());
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, naverProductId: true, salesCount: true, lastSaleDate: true, naver_status_type: true },
  });
  if (!product) fail(`상품을 찾을 수 없음: ${productId}`);
  if (!product!.naverProductId) fail(`미등록 상품(naverProductId=null)은 disposition 2번 분기에서 항상 NONE — 대상 부적합: ${productId}`);
  ok(`${product!.name} (${productId})`);

  step('안전조건 1) 사전 InventorySnapshot 0건 확인');
  const preCount = await prisma.inventorySnapshot.count({ where: { productId } });
  if (preCount !== 0) {
    fail(`대상 상품에 기존 스냅샷 ${preCount}건 존재 — teardown이 실 이력을 지울 위험, 중단. 다른 productId를 지정할 것.`);
  }
  ok('기존 스냅샷 0건 — teardown 시 전체삭제가 안전함을 확정');

  step('베이스라인 측정 (주입 전)');
  const baselinePending = await countDispositionPending();
  const baselineGone = (await loadSourceGoneFlags([productId])).get(productId) ?? false;
  ok(`처분 대기 카운트=${baselinePending}, sourceGone=${baselineGone}`);
  if (baselineGone) fail('주입 전인데 이미 sourceGone=true — 다른 프로세스가 끼어든 것으로 의심, 중단');

  step(`안전조건 2) qty=-1 스냅샷 ${SOURCE_GONE_MIN_CONSECUTIVE}건 주입 (now/-1h/-2h, 정각 회피)`);
  const now = new Date();
  const offsets = [0, 1, 2]; // hours back — SOURCE_GONE_MIN_CONSECUTIVE와 별개로 3건 고정(런 판정에 충분)
  const injected = offsets.map((h) => {
    const t = new Date(now.getTime() - h * 3_600_000);
    // 정각(HH:00:00) 근처를 피해 1~59분 사이로 흔든다 — 실 폴러 트리거 시각과 겹침 방지.
    t.setMinutes((t.getMinutes() % 55) + 3, 17, 0);
    return t;
  });
  await prisma.inventorySnapshot.createMany({
    data: injected.map((polledAt, i) => ({
      productId,
      productNo: 'SMOKE-TEST',
      qty: -1,
      status: 'lookup_failed',
      polledAt,
    })),
  });
  ok(`주입 완료: ${injected.map((d) => d.toISOString()).join(', ')}`);

  step('채널 정합 검증');
  const afterGoneMap = await loadSourceGoneFlags([productId]);
  const afterGone = afterGoneMap.get(productId) ?? false;
  if (afterGone !== true) fail(`sourceGone이 true가 되어야 함(연속 ${SOURCE_GONE_MIN_CONSECUTIVE}회 주입) — 실제: ${afterGone}. source-gone.ts 로직 회귀 의심.`);
  ok('source-gone.ts: sourceGone=true (채널 7 발행게이트가 참조하는 것과 동일 소스)');

  const verdicts = await loadDispositionVerdicts();
  const row = verdicts.find((v) => v.productId === productId);
  if (!row) fail('loadDispositionVerdicts 결과에 대상 상품이 없음');
  if (row!.verdict.action === 'NONE') fail(`disposition action이 NONE — sourceGone 주입이 중앙판정에 반영되지 않음. 실제: ${JSON.stringify(row!.verdict)}`);
  ok(`disposition.ts: action=${row!.verdict.action} (채널 1/2/3/4 배지·대기함이 참조하는 것과 동일 소스)`);

  const afterPending = await countDispositionPending();
  const delta = afterPending - baselinePending;
  if (delta !== 1) fail(`처분 대기 카운트 델타가 1이어야 함(대상 상품 1건만 신규 유입) — 실제: ${delta} (${baselinePending} → ${afterPending})`);
  ok(`countDispositionPending 델타=+1 (채널 3/4 대시보드, 채널 5 알림, 채널 8/9 크론이 참조하는 것과 동일 소스)`);

  step('원복 (teardown)');
  const del = await prisma.inventorySnapshot.deleteMany({ where: { productId } });
  ok(`InventorySnapshot ${del.count}건 삭제`);

  step('원복 검증');
  const restoredGone = (await loadSourceGoneFlags([productId])).get(productId) ?? false;
  const restoredPending = await countDispositionPending();
  if (restoredGone !== false || restoredPending !== baselinePending) {
    fail(
      `원복 후 상태 불일치 — sourceGone=${restoredGone}(기대 false), pending=${restoredPending}(기대 ${baselinePending}). ` +
      `실 폴러가 테스트 도중 끼어들었을 가능성 — productId=${productId}를 수동 확인할 것.`
    );
  }
  ok(`복원 확인: sourceGone=false, pending=${restoredPending} (베이스라인과 일치)`);

  console.log('\n전 채널 정합 확인 + 원복 완료. exit 0.');
  process.exit(0);
}

main()
  .catch((err) => {
    console.error('SMOKE_TEST_CRASHED', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
