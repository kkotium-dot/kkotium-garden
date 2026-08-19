// P1-A 주간 DB 스냅샷 백업 (2026-08-20, Desktop 지시 — 재발 방지책).
//
// 배경: 2026-08-19 db push 파괴 사고(schema.prisma 드리프트로 DROP TABLE 9건이
// 나올 뻔함, Desktop이 migrate diff로 사전 차단) 시점에 복구 수단이 전혀 없었다.
// 이 모듈은 핵심 테이블을 주 1회 JSON으로 덤프해 Supabase Storage(무료 1GB)에
// 저장한다 — 백업은 순수 읽기(additive)라 그 자체로는 위험이 없다.
//
// 대상: Product · Order · InventorySnapshot(Prisma 모델) + seller_overrides
// (schema.prisma에 없는 드리프트 테이블 — raw SQL로만 접근 가능. 어제 db push가
// 지울 뻔했던 9테이블 중 하나이자 "복구 불가 데이터" 우선순위 1번).
//
// 버킷은 기존 `product-assets`(공개 버킷, getPublicUrl로 이미지 서빙용)와
// 분리한 전용 비공개 버킷(`db-backups`)을 쓴다 — 주문자 개인정보(고객명·전화
// ·주소)가 들어있는 덤프를 공개 버킷에 두면 안 된다.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

const BUCKET = 'db-backups';
const RETENTION_WEEKS = 4;
const FILENAME_RE = /^snapshot-(\d{4}-\d{2}-\d{2})\.json$/;

let _client: SupabaseClient | null = null;

function getServerClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('db-snapshot: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are required');
  }
  _client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return _client;
}

/** 버킷이 없으면 비공개(public:false)로 생성. 이미 있으면 그대로 통과. */
async function ensureBackupBucket(supabase: SupabaseClient): Promise<void> {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((b) => b.name === BUCKET)) return;
  const { error } = await supabase.storage.createBucket(BUCKET, { public: false });
  // 동시 실행 등으로 이미 생성된 경우의 레이스는 무시.
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`ensureBackupBucket failed: ${error.message}`);
  }
}

/** seller_overrides는 schema.prisma에 모델이 없는 드리프트 테이블(2026-08-19
 *  발견) — Prisma Client로는 접근 불가, raw SQL로만 덤프한다. 테이블이 없는
 *  환경(로컬 dev 등)에서도 백업 전체가 죽지 않도록 best-effort. */
async function dumpSellerOverrides(): Promise<unknown[]> {
  try {
    return await prisma.$queryRawUnsafe('SELECT * FROM seller_overrides');
  } catch (e) {
    console.warn('[db-snapshot] seller_overrides dump skipped:', e instanceof Error ? e.message : String(e));
    return [];
  }
}

export interface SnapshotResult {
  ok: boolean;
  path?: string;
  sizeBytes?: number;
  counts?: Record<string, number>;
  deletedOld?: string[];
  error?: string;
}

export async function dumpAndUploadWeeklySnapshot(): Promise<SnapshotResult> {
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const [product, order, inventorySnapshot, sellerOverrides] = await Promise.all([
    prisma.product.findMany().catch((e) => { console.warn('[db-snapshot] product dump failed:', e); return []; }),
    prisma.order.findMany().catch((e) => { console.warn('[db-snapshot] order dump failed:', e); return []; }),
    prisma.inventorySnapshot.findMany().catch((e) => { console.warn('[db-snapshot] inventorySnapshot dump failed:', e); return []; }),
    dumpSellerOverrides(),
  ]);

  const payload = {
    snapshotDate: dateStr,
    generatedAt: new Date().toISOString(),
    product,
    order,
    inventorySnapshot,
    sellerOverrides,
  };
  const json = JSON.stringify(payload);
  const path = `snapshot-${dateStr}.json`;

  const supabase = getServerClient();
  await ensureBackupBucket(supabase);

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, json, { contentType: 'application/json', upsert: true });
  if (uploadErr) {
    return { ok: false, error: `upload failed: ${uploadErr.message}` };
  }

  const deletedOld = await pruneOldSnapshots(supabase, dateStr);

  return {
    ok: true,
    path,
    sizeBytes: json.length,
    counts: {
      product: product.length,
      order: order.length,
      inventorySnapshot: inventorySnapshot.length,
      sellerOverrides: sellerOverrides.length,
    },
    deletedOld,
  };
}

/** 최근 4주(28일)치를 넘는 snapshot-*.json을 삭제. 파일명의 날짜만 신뢰
 *  (Storage 메타데이터의 생성시각 대신 — 재업로드/upsert로 흔들릴 수 있어서). */
async function pruneOldSnapshots(supabase: SupabaseClient, todayStr: string): Promise<string[]> {
  const { data: files, error } = await supabase.storage.from(BUCKET).list('', { limit: 100 });
  if (error || !files) return [];

  const today = new Date(`${todayStr}T00:00:00Z`).getTime();
  const cutoffMs = today - RETENTION_WEEKS * 7 * 24 * 60 * 60 * 1000;

  const toDelete = files
    .map((f) => f.name)
    .filter((name) => {
      const m = name.match(FILENAME_RE);
      if (!m) return false;
      const fileMs = new Date(`${m[1]}T00:00:00Z`).getTime();
      return fileMs < cutoffMs;
    });

  if (toDelete.length === 0) return [];
  const { error: rmErr } = await supabase.storage.from(BUCKET).remove(toDelete);
  if (rmErr) {
    console.warn('[db-snapshot] prune failed:', rmErr.message);
    return [];
  }
  return toDelete;
}
