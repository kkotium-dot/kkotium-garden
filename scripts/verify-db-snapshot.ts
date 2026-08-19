// scripts/verify-db-snapshot.ts — P1-A 실행 검증용 (2026-08-20)
//
// weekly 크론 라우트 전체를 호출하면 Discord 실발송(OPS_REPORT)·Domeggook
// 가격 조회까지 딸려온다(둘 다 금지 대상). 이 스크립트는 src/lib/backup/
// db-snapshot.ts의 백업 로직만 단독 호출해 Storage에 실제 파일이 생기는지
// 확인한다 — additive라 안전(기존 데이터 조회+업로드만, DELETE는 4주 초과분만).
//
// Usage: npx tsx scripts/verify-db-snapshot.ts
// 필요 env: DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { dumpAndUploadWeeklySnapshot } from '../src/lib/backup/db-snapshot';

async function main() {
  console.log('[verify-db-snapshot] running dumpAndUploadWeeklySnapshot()...');
  const result = await dumpAndUploadWeeklySnapshot();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    console.error('[verify-db-snapshot] FAILED');
    process.exit(1);
  }
  console.log(`[verify-db-snapshot] OK — uploaded ${result.path} (${result.sizeBytes} bytes)`);
  console.log('[verify-db-snapshot] counts:', result.counts);
  if (result.deletedOld?.length) {
    console.log('[verify-db-snapshot] pruned old snapshots:', result.deletedOld);
  }
}

main().catch((e) => {
  console.error('[verify-db-snapshot] error:', e);
  process.exit(1);
});
