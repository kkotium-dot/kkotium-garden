# 현재 인계 (CURRENT) — 2026-08-10 세션 (운영자 실사용 오류 8건 수정 완료, 아침 소싱 크론 조사는 이번 세션 미착수)

> 다음 세션은 이 파일 → 해당 트랙 설계문서 → `PRINCIPLES_LEARNED.md` 순으로 읽고 시작.

- **status**: **✅ 운영자 실사용 발견 오류 8건 전부 수정 완료(#1~#7, #5+#6 묶음)** — 상세는 `docs/handoff/CODE_UX_FIXES_RESULT_2026-08-10.md`. `npx tsc --noEmit` 0 · `npm run build` 0 · 브라우저 실사용 시나리오 검증 완료(문서 §검증 요약 표). **아침 소싱 알림 크론 미실행 이슈(아래 긴급 섹션)는 이번 세션에서 브리핑만 하고 착수하지 못함** — 사용자가 UX 8건으로 작업을 전환했기 때문. 다음 세션 최우선 후보.
- **branch**: `main` (이번 세션 커밋 예정, 아직 미커밋 — 아래 §커밋 대기 참조)
- **배포 상태**: 이번 세션 변경분 아직 push 전. **다음 세션 STEP0에서 반드시 확인**: ① 이번 세션 커밋들이 push됐는지, ② prod deploy SHA==HEAD, ③ 아래 "다음 세션 시작 순서" 1번(크론 조사) 재확인.

---

## ★★ 이번 세션 완료 — 운영자 실사용 발견 오류 8건 (2026-08-10)

원본 지시: `docs/handoff/CODE_UX_FIXES_HANDOFF_2026-08-10.md` · 결과 상세: `docs/handoff/CODE_UX_FIXES_RESULT_2026-08-10.md`

| # | 항목 | 근본 원인 | write set |
|---|---|---|---|
| 1(최우선) | 씨앗심기 카테고리 "가구/인테리어" 대량 오분류 | AI 프롬프트의 강제 폴백 지시(`For unknown items: use 가구/인테리어...`) | `api/category/suggest/route.ts` |
| 2 | 네이버 상품 가져오기 작동 안 함 | 클라이언트가 import API 응답을 안 읽고 무조건 성공 취급 | `products/page.tsx`(`NaverImportModal`) |
| 3 | 페이지네이션 숫자 버튼 없음 | UX 개선 요청 | `products/page.tsx`(동일 모달) |
| 4 | 마진 계산이 즉시할인 미반영 | import 시 `instant_discount` 컬럼을 전혀 안 채움(profitability API가 이 필드로 실판매가 계산) | `api/products/import/route.ts` |
| 5+6 | 씨앗심기 이동 시 정보/이미지 리셋 | hydrate 로직은 정상 — import가 애초에 name/salePrice/mainImage 4개만 저장하고 카테고리·설명·이미지·태그를 버림 | `api/products/import/route.ts` |
| 7 | 목표 마진율 "0" 접두 버그 | `<input value={local.targetMargin}>`만 다른 필드와 달리 `\|\| ''` 패턴 누락 → 필드 비우면 "0" 리터럴 표시 → 뒤에 이어붙음 | `components/products/MarginCalculator.tsx` |

**⚠️ 다음 세션 확인 필요(운영자 판단 대기)**:
- #1 캐시 오염: `dome_category_cache`(name_hash/dome_code)에 수정 전 프롬프트로 저장된 "가구/인테리어" 오답이 남아있음 — 캐시가 AI 호출보다 먼저 조회되므로 이미 스캔된 상품명은 프롬프트 수정과 무관하게 계속 오답 서빙. DB 정리 범위·방식은 운영자 결정 필요(이번 세션 DB는 건드리지 않음).
- #4는 실제 즉시할인 걸린 네이버 상품으로 가져오기 재현 테스트 권장(로컬에 그런 테스트 상품이 없어 코드 레벨 검증만 완료 — 필드 매핑은 Naver 공식 Discussion #241 스키마로 확인).

**★ 커밋 대기**: 이번 세션 변경 4개 파일(위 표 write set) 아직 미커밋 — 다음 액션으로 항목별 커밋 후 push 예정.

---

## ★★ 긴급 이슈 (이번 세션 미착수) — 아침 소싱 알림 정규 스케줄 미실행

2026-08-10 세션 시작 시 사용자가 이 조사를 지시했으나, 곧바로 UX 8건 수정으로 전환되어 **이번 세션에서 실제 조사는 하지 못함**(환경점검·핸드오프 정독까지만 완료).

**직전 세션(2026-08-08~08-10)까지 확정된 사실** — 상세는 `docs/handoff/CODE_DAILY_CRON_FIX_HANDOFF_2026-08-08.md` 최하단 "★★★★★★ 2026-08-10 최신 상태" 참조:
- 함수 코드·환경변수·웹훅·신규 크론(`sourcing-daily`) 전부 수동 호출 시 100% 정상.
- **정규 스케줄(08:00 KST) 자동 실행만 8/9·8/10 이틀 연속 실패** — 신규 크론 분리(maxDuration+독립크론) 이후에도 재발.
- 문제 범위 = Vercel 크론 스케줄러 자체(또는 그 앞단), 개별 라우트 코드 아님.

**다음 세션 조사 방향(미착수, 그대로 유효)**:
1. Vercel Cron Jobs 탭 각 크론 이름 클릭 시 별도 상세페이지(Recent Invocations) 존재 여부 재확인.
2. Vercel 공식 문서에서 Hobby 크론이 스킵되는 조건 재검색.
3. 대안: GitHub Actions scheduled workflow로 `sourcing-daily`를 매일 정시 curl 호출하는 우회 안전망 검토(`.github/workflows/`).

**절대 금지**: 실제 Discord 발송 테스트 임의 실행 금지(운영자/Desktop 승인 필요) — 이번 세션도 준수, 발송 테스트 없음.

---

## 다음 세션 시작 순서
```
1. [최우선] 이번 세션 UX 8건 수정분 커밋·push 확인 (아직 안 됐다면 먼저 처리)
2. [최우선 후보] 아침 소싱 알림 정규 스케줄 미실행 조사 재착수
   → docs/handoff/CODE_DAILY_CRON_FIX_HANDOFF_2026-08-08.md 최신 섹션부터
3. [운영자 판단 대기 2건] #1 카테고리 캐시 오염 정리 방침 / #4 실제 할인 상품 재현 테스트
4. push된 미merge 브랜치 존재(가장 최근 feature/preview-copy-then-redesign, 6일 전 기준) — 저녁 세션 때 우선 검토·merge(#320)
```

## 절대 금지 + 교훈 (누적, 변경 없음)
- 네이버 PUT/POST → 운영자 GO 없이 금지 · 자동발행 영구금지(#307)
- 디스코드 실발송 → 승인 없이 금지
- 신규 파일은 Desktop Commander:write_file만(#330) · 대용량MD 추가는 edit_block 앵커
- 테스트 데이터 방치 금지
- **UI 설정 화면 문구보다 curl/실측이 항상 우선**(#310)
- git stash `z3c-misdirected-changes-needs-redo` 처리 방향 — 여전히 운영자 결정 대기(손대지 않음)
