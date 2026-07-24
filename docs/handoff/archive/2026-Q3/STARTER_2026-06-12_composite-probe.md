# STARTER — 다음 세션 (composite=0 probe 판정 + 확정수정)

아래 블록을 **새 채팅 첫 메시지로 그대로 붙여넣기**.

---

## [Code CLI 세션용 — 붙여넣기]

너는 꽃틔움 가든(Next.js 14/TS/Prisma/Supabase/Vercel)의 시니어 풀스택이다. /expert-operator-style.
production HEAD = aca3400(READY). P0 = `/api/products/{id}/assets` 에서 명화(cmpnooli40001f0gveaxr8iim) composite=0 표시(실제 9건). Desktop 이 전 계층(DB·RLS·역할·SQL함수3·storage-api REST·배포소스·storage-js2.91.1·body8종·캐시) 을 무혐의 증명함. 로컬키로 배포본 실행=composite 9, production만 0.

작업(핸드오프 그대로 적용): `docs/handoff/HANDOFF_2026-06-12_composite-rootcause-probe.md`
1. §2 PROBE 라우트 신규 생성: `src/app/api/_debug/storage-probe/[id]/route.ts` (CRON_SECRET 게이트·additive·삭제예정).
2. §3 하드닝: `src/lib/storage/automation-storage.ts` 의 `collect()` 를 trailing-slash 자가치유 버전으로 교체(no-slash 0행→`prefix/` 1회 재시도·무해·전상품).
3. `npx tsc --noEmit`(0) → `npm run build` → commit `feat(diag): /assets composite=0 production probe + listProductAssets trailing-slash 자가치유` → push main.
4. §7 대형 MD 6종 갱신(Python 전체덮어쓰기, edit_file 한글손상 금지): PRINCIPLES_LEARNED(#66/#67/#68 추가)·PROGRESS·SESSION_LOG·TASK_BRIDGE·ROADMAP·PARALLEL_WORK_TRACKER(rev++). 정확 내용 핸드오프 §7에 있음.

규약: 이모지0·주석영어·한글리터럴0·prisma 싱글톤·heredoc 금지·iterm 행 패턴(#26) 주의(MD는 Python 파일 경유). 비가역(네이버) 무접촉.

배포 READY 되면 멈추고 보고. Desktop 이 probe 판정·검증 인계.

---

## [Desktop 세션용 — 배포 READY 후 붙여넣기]

너는 꽃틔움 가든 Desktop(MCP/검증/문서). /expert-operator-style.
Code 가 storage-probe 라우트 + collect() 하드닝을 배포 완료(aca3400 이후 신규 SHA). 핸드오프 = `docs/handoff/HANDOFF_2026-06-12_composite-rootcause-probe.md`.

1. probe 호출: `GET https://kkotium-garden.vercel.app/api/_debug/storage-probe/cmpnooli40001f0gveaxr8iim?token=<CRON_SECRET>` (CRON_SECRET=env값).
2. 핸드오프 §5 판정 트리 적용 → 근본원인 확정:
   - keyPrefix != sb_secret / keyLen != 41 → **env 키 drift** → 운영자 Vercel `SUPABASE_SERVICE_ROLE_KEY` 재설정.
   - composite_noSlash=0 & composite_slash=9 → **list버그** → §3 하드닝이 영구복구(확인만).
3. `/api/products/cmpnooli40001f0gveaxr8iim/assets` composite==9 확인(x-vercel-cache MISS).
4. SQL 교차(storage.objects composite 9 == /assets 9) · 회귀(cutout=3·root=10) · /studio 자산탭 LIVE 렌더(Control Chrome).
5. 확인되면 probe 라우트 삭제 커밋.
6. 종결 후 다음: 명화 publish(이미지셋+GO·비가역 #46) 또는 P1 실사용 E2E.

---

## 이번 세션(2026-06-12 세션5) 결과 요약

- **달성:** /assets composite=0 근본원인 5단 격리 진단 완료. 전 계층 무혐의 증명(로컬키 9 / prod 0). 캐시·RLS·역할·배포소스·클라이언트·body 전부 배제. 남은 변수 = production 런타임 단일.
- **산출:** 핸드오프(probe 라우트 + trailing-slash 하드닝 + 판정트리 + 검증절차 + 대형MD 갱신지시).
- **다음 결정점(운영자):** (A) probe 배포 후 확정수정[정도·권장] vs (B) Vercel env 키 즉시 재설정[최속, 단 미확증 prod 시크릿 변경 리스크]. probe 가 (A)·(B) 어느 쪽이 맞는지 1회 호출로 판정.
- **앱 적용 현황:** composite 표시 = DB 9건 LIVE / code(probe+하드닝) 배포대기 / 실사용검증 대기.
