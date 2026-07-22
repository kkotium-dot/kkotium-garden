# 🖥 Claude Desktop 인계 — 처분 판정 시스템 실데이터 검증 (2026-07-22)

> **FROM** 🌸 Cowork · **TO** 🖥 Claude Desktop
> **BASELINE**: main `88a588d` (== origin/main == prod, Vercel 200)
> ※ 이 인계는 위 SHA 시점 기준(#291). 착수 전 보드(`TASK_BRIDGE §3-A`)에서 상태 재확인.

---

## 왜 Desktop인가 — Cowork가 못 한 일이 있습니다

이번 사이클에서 **처분 판정 시스템**을 전 채널에 정합시켰습니다(#273→#294). 그런데 **검증에 공백이 하나 있습니다.**

| 환경 | Supabase 쓰기 | 결과 |
|---|---|---|
| 🌸 Cowork | **정책상 차단** | 테스트 데이터를 못 넣어 **fetch 스텁·합성 데이터로만** 검증 |
| 🖥 **Desktop** | **가능** | **실데이터로 전 채널 동시 검증 가능** |

즉 "공급처가 끊긴 상품이 실제로 존재할 때, 7개 채널이 모두 같은 수를 말하는가"를 **아직 아무도 실측하지 못했습니다.** 이게 Desktop의 고유 가치입니다.

---

## PRIMARY TASK — 처분 판정 전 채널 실데이터 검증

### 배경: 지금까지 고친 것

같은 결함(`status`로 세면 공급처 단절 상품이 빠짐)이 **5곳에서 연속 발견**됐습니다.

| 순서 | 위치 | 원칙 | 커밋 |
|---|---|---|---|
| 1 | 처분 결정 대기함 화면 | `#278` | `9c3e1dd` |
| 2 | 대시보드 카운트(KpiStrip·TodayQueue) | `#290` | `d1067ab` |
| 3 | 대시보드 위젯(KkottiWidget) | `#292` | `8fa392c` |
| 4 | 디스코드 일일 알림 | `#293` | `4fc37c6` |
| 5 | 앱 종 알림 · 주간 리포트 | `#294` | `88a588d` |

### 검증 절차

**STEP 0 — 사전 상태 기록**

```sql
-- 현재 스냅샷 상태 (되돌리기 위해 반드시 먼저 기록)
SELECT product_id, product_no, qty, status, polled_at
FROM inventory_snapshots ORDER BY polled_at DESC LIMIT 10;

SELECT id, name, status, "naverProductId", naver_status_type, "salesCount"
FROM "Product" ORDER BY "createdAt";
```

**STEP 1 — 공급처 단절 상황 주입**

`sourceGone` 판정 조건은 **qty=-1이 최근 연속 3회 이상**(`SOURCE_GONE_MIN_CONSECUTIVE=3`, `src/lib/products/source-gone.ts`).

```sql
-- 아이스틀(cmpp62yje00015xup5h8pgwx0, productNo 36904429)에 -1 연속 3회 주입
INSERT INTO inventory_snapshots (id, product_id, product_no, qty, status, minq, polled_at) VALUES
  ('TESTDISP-1','cmpp62yje00015xup5h8pgwx0','36904429',-1,'unknown',1, now()),
  ('TESTDISP-2','cmpp62yje00015xup5h8pgwx0','36904429',-1,'unknown',1, now() - interval '1 day'),
  ('TESTDISP-3','cmpp62yje00015xup5h8pgwx0','36904429',-1,'unknown',1, now() - interval '2 day');

-- 발행 상태로 만들어야 처분 판정 대상이 된다(미발행은 NONE)
UPDATE "Product"
SET "naverProductId" = 'TEST-NAVER-1', naver_status_type = 'SALE'
WHERE id = 'cmpp62yje00015xup5h8pgwx0';
```

> ⚠️ **id를 `TESTDISP-*`로 고정**하세요. STEP 3 원복에서 정확히 지울 수 있습니다.

**STEP 2 — 7개 채널이 같은 수를 말하는지 확인**

| # | 채널 | 확인 방법 | 기대 |
|---|---|---|---|
| 1 | 처분 결정 대기함 | `/products/out-of-stock` | "대체 소싱 필요" 또는 "삭제 안전" 그룹에 1건 |
| 2 | 상품 목록 배지 | `/products?tab=draft` | 행에 "공급처 단절" 배지 |
| 3 | 대시보드 KPI | `/dashboard` | **"처분 대기 1건"** |
| 4 | 대시보드 오늘 할 일 | `/dashboard` | "처분 결정 대기" 항목 노출 |
| 5 | 앱 종 알림 | `/api/notifications` | `"처분 필요 1개"` 포함 |
| 6 | 부활소 | `/products/reactivation` | 해당 상품에 "공급처 단절" 배지 |
| 7 | 발행 게이트 | 정원 창고 → "준비된 것 일괄 발행" | **"발행 보류 권장"에 포함** |

> **핵심 판정**: 7개가 **전부 1건**을 말하면 정합 완료. 하나라도 0건이면 그 채널이 아직 status 기준입니다 — 즉시 보고해 주세요.

**STEP 3 — 원복 (필수)**

```sql
DELETE FROM inventory_snapshots WHERE id LIKE 'TESTDISP-%';
UPDATE "Product" SET "naverProductId" = NULL, naver_status_type = NULL
WHERE id = 'cmpp62yje00015xup5h8pgwx0';
```

**STEP 4 — 원복 확인**

```sql
SELECT count(*) FROM inventory_snapshots WHERE id LIKE 'TESTDISP-%';  -- 0이어야 함
SELECT id, "naverProductId", naver_status_type FROM "Product" WHERE id='cmpp62yje00015xup5h8pgwx0';
```
화면에서 "처분 대기 0건"으로 복귀했는지도 확인.

---

## 🚫 절대 하지 말 것

- **디스코드 실발송 금지** — 크론(`/api/cron/daily`)을 수동 실행하면 운영자에게 실알림이 갑니다. 디스코드 채널(#4)은 **코드 검토로만** 확인하세요(이미 `4fc37c6`에서 합성 데이터로 검증 완료).
- **네이버 스토어 PUT/POST 금지**(#46) — 발행 게이트 확인은 **모달을 여는 것까지만**. "GO — 실제 반영" 버튼은 절대 누르지 마세요.
- **테스트 데이터 방치 금지** — STEP 3 원복은 필수. 방치하면 대시보드가 계속 거짓 경보를 냅니다.

---

## Desktop 환경 요약 (TASK_BRIDGE §2-B 참조)

| 능력 | 가능 여부 |
|---|---|
| Supabase SQL 읽기/쓰기 | ✅ **가능** (Cowork는 쓰기 차단) |
| Chrome 브라우저 검증 | ✅ 가능 |
| Vercel 배포 조회 | ✅ 가능 |
| 코드 파일 **읽기** | ✅ 가능 |
| 코드 파일 **쓰기** | ❌ 불가 → 수정이 필요하면 💻 Code나 🌸 Cowork에 인계 |
| git commit/push | ❌ 불가 |
| 핸드오프 MD 작성 | ✅ 가능 (#49 — `docs/handoff/`에 직접 write_file 허용) |

**즉 Desktop은 "검증·진단 전문"입니다.** 결함을 찾으면 고치지 말고 **정확한 위치와 재현 절차를 문서화**해서 넘겨주세요.

---

## 완료 시 인계

1. `docs/plan/TASK_BRIDGE.md` §3 ACTIVE에 5-step 엔트리 추가 (**커밋 SHA 포함** — 순번은 충돌하므로 SHA가 정본 #289)
2. 7개 채널 각각 **실제 관측값**을 표로 기록 (기대값과 다른 항목은 굵게)
3. 원복 완료 여부 명시
4. 결함 발견 시 → 수정하지 말고 위치·재현절차·기대동작을 인계 문서에 기록

---

## 참고 문서

- `docs/plan/TASK_BRIDGE.md` §2-B(3환경 능력표) · §3-A(작업 큐 보드)
- `docs/plan/PARALLEL_WORK_TRACKER.md` rev79
- `docs/plan/PRINCIPLES_LEARNED.md` #273~#294
  ※ 옛 원칙은 `archive/PRINCIPLES_LEARNED_archived-2026-07-22.md` — **두 파일 함께 grep**
- 판정 엔진: `src/lib/products/disposition.ts`(PURE) · `disposition-load.ts`(서버 로더)
- 발행 게이트: `src/lib/products/publish-gate.ts`
