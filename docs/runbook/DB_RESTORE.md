# DB 복구 절차 (DB_RESTORE)

**작성 배경(2026-08-19 사고)**: schema.prisma가 프로덕션 DB보다 9테이블·21컬럼
뒤처져 있는 상태에서 맨손 `npx prisma db push`를 실행할 뻔했다. 실행됐다면
`asset_library`·`building_blocks`·`category_metadata_cache`·`designer_jam_queue`
·`diagnosis_results`·`seller_overrides`·`seo_penetration_logs`·
`skeleton_templates`·`stock_lifestyle_cache` 9개 테이블이 DROP됐을 것이고,
그 시점에 **복구 수단이 전혀 없었다**. 이 문서 + 주간 스냅샷 백업(P1-A)이
그 재발 방지책이다.

## 무엇이 백업되는가

`src/app/api/cron/weekly/route.ts`가 매주 월요일 08:00 KST에
`src/lib/backup/db-snapshot.ts`의 `dumpAndUploadWeeklySnapshot()`을 호출한다.

- **대상**: `Product`(prisma) · `Order`(prisma) · `InventorySnapshot`(prisma)
  · `seller_overrides`(raw SQL — schema.prisma에 모델이 없는 드리프트 테이블,
  2026-08-19 사고에서 DROP 대상으로 발견됨).
- **저장 위치**: Supabase Storage 버킷 `db-backups`(비공개 — 고객명·전화·주소가
  들어있는 `Order`를 공개 버킷 `product-assets`와 절대 같이 두지 않는다).
- **파일명**: `snapshot-YYYY-MM-DD.json` — **날짜는 KST 기준**(`kstToday()`,
  [src/lib/date/kst.ts](../../src/lib/date/kst.ts)). 2026-08-20부로 UTC 기준에서
  KST 기준으로 수정(P1 KST 공통 유틸 도입) — 그 이전 스냅샷(`snapshot-2026-08-19.json`
  등)은 구버전 로직(`toISOString().slice(0,10)`, UTC 자정 기준)으로 찍힌 것이라
  KST로 찾으면 하루 어긋날 수 있으니 주의.
- **보관 주기**: 최근 4주(28일)치만 유지, 초과분은 같은 크론 실행에서 자동 삭제.
- **백업되지 않는 것**: 위 4개 외 나머지 테이블 전체(`asset_library` 등 드리프트
  테이블 나머지 8개 포함) — 이번 P1-A는 "복구 불가 데이터 우선순위"만 커버한다.
  전체 테이블 백업은 별도 과제로 남아있다.

## 복구 절차

### 1. 스냅샷 내려받기

Supabase 대시보드 → Storage → `db-backups` 버킷 → 복구하려는 날짜의
`snapshot-YYYY-MM-DD.json` 다운로드. 또는 서버 코드에서:

```ts
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const { data } = await supabase.storage.from('db-backups').download('snapshot-2026-08-17.json');
const json = JSON.parse(await data!.text());
// json.product / json.order / json.inventorySnapshot / json.sellerOverrides
```

### 2. 복구 대상 판단

전체 테이블을 되돌리지 말 것 — 사고로 사라진/깨진 **행 단위**만 복구하는 게
원칙이다(#341과 같은 계열: 전체 롤백은 그 사이의 정상 변경분까지 지운다).

```ts
// 예: 특정 상품 하나만 스냅샷 시점 상태로 복구
const snapshotProduct = json.product.find((p: any) => p.id === 'cmXXXXXXX');
await prisma.product.update({ where: { id: snapshotProduct.id }, data: snapshotProduct });
```

`seller_overrides`처럼 schema.prisma에 모델이 없는 테이블은 `prisma.$executeRawUnsafe`로
직접 INSERT/UPDATE해야 한다 — 컬럼 목록은 스냅샷 JSON의 키를 그대로 쓰면 된다.

### 3. 검증 후 커밋

복구는 되돌릴 수 없는 쓰기 작업이다 — 반드시 dry-run(콘솔에 diff만 출력)으로
먼저 확인하고, 운영자 승인 후에만 실제 UPDATE/INSERT를 실행한다(네이버 PUT과
동일한 승인 원칙, `docs/CORE_PRINCIPLES.md` 참조).

## 백업이 실패하고 있는지 확인하는 법

주간 리포트 크론 응답(`/api/cron/weekly` 수동 curl 또는 `cron_invocation_log`)의
`dbSnapshot` 필드를 본다:

```json
{ "dbSnapshot": { "ok": true, "path": "snapshot-2026-08-17.json", "sizeBytes": 12345, "counts": { "product": 6, "order": 42, "inventorySnapshot": 6, "sellerOverrides": 0 } } }
```

`ok: false`면 `error` 필드에 원인이 남는다 — 백업 실패가 주간 리포트 발송 자체를
막지는 않으므로(additive, non-fatal), 별도로 이 필드를 확인해야만 알 수 있다.

## 수동 검증

Discord 실발송·Domeggook API 호출 없이 백업 로직만 단독 실행하려면:

```bash
npx tsx scripts/verify-db-snapshot.ts
```
