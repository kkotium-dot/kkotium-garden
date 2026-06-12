# HANDOFF — /assets composite=0 근본원인 PROBE + 항구 하드닝

- Target Session: code-cli (build/commit/deploy lane, #41)
- Branch: main (또는 feat/storage-probe → 즉시 main 병합)
- 작성: Desktop, 2026-06-12 · production HEAD = aca3400 (READY)
- 비가역도: 0 (additive · debug-gated · 네이버 무접촉)

---

## 0. 한 줄 요약

`/api/products/{id}/assets` 가 production 에서 **composite=0** (실제 9건), cutout=3 (정상) 으로 표시됨.
Desktop 이 전 계층을 실측해 **DB·RLS·역할·SQL함수 3종·storage-api REST·배포소스·storage-js 2.91.1 클라이언트·요청바디 8종·캐시(force-dynamic+POST)** 를 **모두 무혐의로 증명**.
로컬 service key 로 배포본 코드를 글자그대로 실행하면 composite=9. **production 런타임만 0.**
남은 단 하나의 미통제 변수 = **Vercel production 런타임의 실제 동작/키**. 외부 추론은 소진됨 → **계측(probe)로 ground truth 확보 후 확정 수정.**

---

## 1. 이번 세션에서 확정된 사실 (재실측 불필요)

| 계층 | 방법 | 결과 |
|---|---|---|
| storage.objects 데이터 | SQL 전컬럼 비교 | composite 9건·cutout 3건 구조 동일(차이=mime png/jpeg) |
| storage.search (V1) | service_role 직접 | composite/ = 9 · cutout/ = 3 |
| storage.search_v2 | service_role 직접 | 9 · 3 |
| storage.list_objects_with_delimiter | service_role 직접 | 9 · 3 |
| RLS | pg_class / pg_policies | RLS on · **정책 0개** → 역할 비대칭 불가능 |
| grants | role_table_grants | anon/authenticated/service_role 모두 SELECT |
| storage-api REST | sb_secret_ 키 · body 8종 변형 | 전부 composite=9·cutout=3 (id 전부 set) |
| storage-api REST | anon 키 (sb_publishable_) | composite=0·cutout=0 (RLS 차단) |
| 배포 소스 | GitHub raw @aca3400 diff | automation-storage.ts·asset-taxonomy.ts·route.ts = 로컬 동일 |
| 배포 클라이언트 | storage-js@2.91.1 설치 후 collect() 정확 복제 | **composite=9(id set)·cutout=3** |
| route 캐시 | 배포 route.ts | `export const dynamic='force-dynamic'` 존재 → 캐시 불가 |
| .list() HTTP method | storage-js 2.91.1 소스 | **POST** → Next.js Data Cache 대상 아님 |
| production 실측 | alias 2회 (x-vercel-cache MISS · age 0) | **composite=0**·cutout=3 (fresh) |
| Vercel 런타임 로그 | listProductAssets 30m | 에러 로그 없음 → 빈 배열 반환(에러 아님) |

핵심 모순: cutout=3 / composite=0 "혼합" 은 **단일 키·단일 fresh 호출로는 이론상 불가능**.
anon=0/0, service=9/3 뿐. 혼합을 만들 수 있는 건 (a) production 키가 로컬과 다름 + 키별 storage-api 특수동작, 또는 (b) 외부에서 관측 불가한 런타임 차이. → 계측 필요.

로컬 키 정보(마스킹): `SUPABASE_SERVICE_ROLE_KEY` = `sb_secret_…` (len 41), `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_…` (len 46). 둘 다 신형 포맷.

---

## 2. 적용 1 — PROBE 라우트 (additive · debug-gated · 진단 후 삭제)

신규 파일. **CRON_SECRET 토큰 게이트**(env 존재) → 외부 비공개. production 런타임이 실제로 무엇을 보는지 1회 호출로 전부 노출.

### 파일: `src/app/api/_debug/storage-probe/[id]/route.ts`

```ts
// /api/_debug/storage-probe/[id]?token=<CRON_SECRET>
// ============================================================================
// TEMPORARY diagnostic. Reveals exactly what the PRODUCTION runtime sees when
// listing a product's storage stages, to root-cause the /assets composite=0
// discrepancy. Token-gated by CRON_SECRET so it is not publicly reachable.
// DELETE this file once the root cause is confirmed.
// ============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BUCKET = 'product-assets';

interface ListProbe {
  label: string;
  rows: number;
  idsSet: number;
  names: string[];
  error: string | null;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const pid = params.id;

  const env = {
    url: supaUrl,
    keyPrefix: key.slice(0, 9),
    keyLen: key.length,
    keyPresent: key.length > 0,
  };

  const supabase = createClient(supaUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const probeList = async (label: string, prefix: string): Promise<ListProbe> => {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(prefix, { limit: 100, sortBy: { column: 'name', order: 'asc' } });
      if (error) return { label, rows: -1, idsSet: -1, names: [], error: error.message };
      const rows = data ?? [];
      return {
        label,
        rows: rows.length,
        idsSet: rows.filter((f) => f.id).length,
        names: rows.map((f) => f.name),
        error: null,
      };
    } catch (e: unknown) {
      return { label, rows: -2, idsSet: -2, names: [], error: e instanceof Error ? e.message : 'throw' };
    }
  };

  // Direct REST call (bypasses storage-js) with the same env key, to isolate
  // whether any discrepancy is in storage-js or in the storage-api/key path.
  const probeRest = async (label: string, prefix: string) => {
    try {
      const res = await fetch(`${supaUrl}/storage/v1/object/list/${BUCKET}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prefix,
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
          search: '',
        }),
        cache: 'no-store',
      });
      const json: unknown = await res.json().catch(() => null);
      const count = Array.isArray(json) ? json.length : -1;
      return { label, httpStatus: res.status, count, isArray: Array.isArray(json) };
    } catch (e: unknown) {
      return { label, httpStatus: -1, count: -2, error: e instanceof Error ? e.message : 'throw' };
    }
  };

  const [cNo, cSlash, cutNo, rest] = await Promise.all([
    probeList('composite_noSlash', `${pid}/composite`),
    probeList('composite_slash', `${pid}/composite/`),
    probeList('cutout_noSlash', `${pid}/cutout`),
    probeRest('rest_composite_noSlash', `${pid}/composite`),
  ]);

  return NextResponse.json({
    ok: true,
    pid,
    env,
    storageJsProbes: [cNo, cSlash, cutNo],
    restProbe: rest,
  });
}
```

규약 준수: 이모지 0 · 주석 영어 · 한글 리터럴 0 · Lucide 무관(서버라우트) · `new PrismaClient()` 미사용. `tsc --noEmit` 0 확인 후 빌드.

---

## 3. 적용 2 — listProductAssets 항구 하드닝 (근본원인 무관·무해·전상품)

`src/lib/storage/automation-storage.ts` 의 `collect()` 를 교체. no-slash 결과가 0행이면 trailing-slash 로 1회 재시도(SQL상 trailing-slash 가 신뢰형으로 증명됨). 무해(0행일 때만 동작) · 자가치유 · 구조적 경고 로깅. **이게 list 류 버그면 영구 자동복구**되고, 만약 근본원인이 env 키면 probe 가 분리 판정.

### 교체 대상: `collect` 함수 본문 (listProductAssets 내부)

```ts
  const collect = async (prefix: string, stage: string) => {
    const listOnce = (p: string) =>
      supabase.storage
        .from(BUCKET_NAME)
        .list(p, { limit: 100, sortBy: { column: 'name', order: 'asc' } });

    const first = await listOnce(prefix);
    if (first.error) {
      console.error(
        `[listProductAssets] list('${prefix}') failed: ${first.error.message}`,
      );
      return;
    }
    let rows = (first.data ?? []).filter((f) => f.id);

    // Defensive retry: some storage-api/client/key combinations return only a
    // folder placeholder (or an empty page) for a NON-empty nested prefix when
    // the prefix lacks a trailing slash. The trailing-slash form is the proven-
    // reliable shape (verified against storage.search / search_v2 /
    // list_objects_with_delimiter). Only fires when the first pass found 0 real
    // files, so it never changes correct results — it just heals silent drops.
    if (rows.length === 0) {
      const retry = await listOnce(`${prefix}/`);
      if (!retry.error && retry.data) {
        const retryRows = retry.data.filter((f) => f.id);
        if (retryRows.length > 0) {
          console.warn(
            `[listProductAssets] '${prefix}' returned 0 but '${prefix}/' returned ${retryRows.length}; using trailing-slash result`,
          );
          rows = retryRows;
        }
      }
    }

    for (const f of rows) {
      const path = `${prefix}/${f.name}`;
      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
      out.push({
        path,
        publicUrl: urlData.publicUrl,
        createdAt: f.created_at ?? new Date(0).toISOString(),
        size: f.metadata?.size ?? 0,
        stage,
      });
    }
  };
```

(같은 패턴을 `findCachedAsset` 의 `searchDir` 에도 선택 적용 가능 — 우선순위 낮음, 동일 버그 클래스 방어.)

---

## 4. 빌드·배포

```bash
cd /Users/jyekkot/Desktop/kkotium-garden
npx tsc --noEmit            # 0 errors
npm run build               # 신규 _debug 라우트 + storage lib 빌드 확인
git add -A
git commit -m "feat(diag): /assets composite=0 production probe + listProductAssets trailing-slash 자가치유 (additive·debug-gated·전상품)"
git push origin main
```

Vercel 자동 배포 READY 대기 → Desktop 재검증으로 인계.

---

## 5. 판정 트리 (probe 출력 → 다음 액션, 결정론)

probe 호출: `GET https://kkotium-garden.vercel.app/api/_debug/storage-probe/cmpnooli40001f0gveaxr8iim?token=<CRON_SECRET>`
(CRON_SECRET = env 값. Desktop 이 호출·해석)

| probe 신호 | 근본원인 | 다음 액션 |
|---|---|---|
| `env.keyPrefix` != `sb_secret` **또는** keyLen != 41 | **production env 키 drift** (Vercel 키 ≠ 로컬) | 운영자: Vercel `SUPABASE_SERVICE_ROLE_KEY` 를 로컬 `.env.local` 정상 sb_secret_ 값으로 재설정 → redeploy → 재검증 |
| `composite_noSlash.rows==0` **AND** `composite_slash.rows==9` | **no-slash list 류 버그(런타임 특이)** | §3 하드닝이 이미 영구 복구. 배포 후 /assets composite=9 확인이면 종결 |
| `composite_noSlash.rows==9` (probe는 9) **그러나 /assets 는 0** | probe경로 vs /assets경로 divergence | /assets route 배포본·엣지 재점검(이미 force-dynamic 확인 → 추가로 route 실제 응답 헤더·리전 비교) |
| `restProbe.count==9` **그러나 storageJsProbes 0** | storage-js/런타임 이슈 | storage-js 버전 핀 또는 REST 직접 호출로 listProductAssets 우회 |
| `composite_noSlash.error` != null | 권한/네트워크 에러 | error 메시지로 분기(42501→키역할, network→리전) |

가장 유력: **2행(no-slash list 버그) → §3 하드닝으로 영구 종결**, 또는 **1행(env 키 drift) → 운영자 1액션.**

---

## 6. Desktop 재검증 절차 (배포 READY 후, 별도 세션)

1. probe 호출 → §5 판정.
2. `GET /api/products/cmpnooli40001f0gveaxr8iim/assets` → **composite count == 9** 확인 (x-vercel-cache MISS).
3. SQL 교차: storage.objects composite 9건 == /assets 9건 1:1.
4. 전상품 회귀: cutout=3·root=10 유지(누락0).
5. /studio 자산탭(에셋) 에서 composite 9 썸네일 LIVE 렌더 확인(Control Chrome).
6. 확인되면 probe 라우트(`src/app/api/_debug/storage-probe/`) **삭제 커밋**.

---

## 7. Code 가 함께 갱신할 대형 MD (Desktop edit_file 한글손상 위험 → Python 전체덮어쓰기, #41/#26)

아래 내용을 각 파일에 반영(append/정합):

### PRINCIPLES_LEARNED.md — 신규 원칙 추가
- **#66 (스토리지 list 진단 표준):** `/assets` 등 스토리지 표시 이상 시 — (a) storage.objects 데이터, (b) storage.search/search_v2/list_objects_with_delimiter 를 service_role 로 직접, (c) storage-api REST 를 실제 키·body변형으로, (d) 배포소스 GitHub raw diff, (e) **배포 클라이언트(storage-js) 정확버전 설치 후 collect() 복제** — 5단을 거쳐 계층을 격리한다. 추측으로 production env/키를 먼저 건드리지 않는다(#45·#63).
- **#67 (storage list trailing-slash 자가치유):** nested prefix `.list()` 가 비-빈 폴더에 0행을 반환할 수 있음(클라이언트/키/런타임 조합 특이). no-slash 0행 → trailing-slash 1회 재시도 = 전상품 표준 방어(자산 무음 누락 0).
- **#68 (production env 정합 게이트):** 로컬 .env 와 Vercel env 의 키 drift 가 "코드·DB는 정상인데 production만 이상" 의 원인이 될 수 있음. 신형 sb_secret_ 키 마이그레이션 시 Vercel env 동기화 필수.
- **#69 (인계 in-chat 박제 · 누락0 연속성):** 모든 작업 종료 시 인계 메시지를 **채팅 응답 본문에 누락 없이 정리**한다(파일에만 두지 않음). 포함: Target Session·Branch·다음 1액션·검증절차·코드패치 위치·세션요약. 운영자=paste-mediator → 채팅에서 바로 복사·착수 가능해야 함. **CLAUDE.md 작업원칙 섹션 + PRINCIPLES_LEARNED 양쪽 박제.**

### PROGRESS.md / SESSION_LOG.md
- 2026-06-12 세션: /assets composite=0 근본원인 5단 격리 진단 완료(전 계층 무혐의 증명·로컬키 9 / prod 0). PROBE 라우트 + trailing-slash 하드닝 배포 준비. 캐시·RLS·역할·배포소스 전부 배제. 다음=probe 판정→확정수정.

### TASK_BRIDGE.md / ROADMAP.md
- P0: probe 배포 → Desktop 판정 → (env키 drift면 운영자 1액션 / list버그면 §3 하드닝으로 종결) → /assets composite=9 LIVE 확인.
- 이후 순서 불변: P1 실사용 E2E → P2 Firefly clip-fit → P3 달항아리·아이스트레이.

### PARALLEL_WORK_TRACKER.md (rev++)
- 적재(자산표시) 행: "C composite 표시 = probe+하드닝 배포대기 / DB 9건 정상 / production 0 (런타임 격리완료)" 로 갱신. 앱적용 3계층: DB LIVE / code 배포대기 / 실사용검증 대기.

---

## 8. 비고
- 명화 publish(이미지셋+fidelity+GO) 는 이 P0 종결 후. 비가역 게이트(#46) 유지.
- route 2.ts 중복파일 삭제는 운영자 GO 대기(별건).
- probe·하드닝 모두 네이버 무접촉·DB 무변경·가역.
