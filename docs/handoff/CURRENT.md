# 현재 인계 (CURRENT) — 2026-08-10 세션 (운영자 실사용 오류 8건 + Desktop 교차검증 후속 3건 전부 완료, 아침 소싱 크론 조사는 이번 세션 미착수)

> 다음 세션은 이 파일 → 해당 트랙 설계문서 → `PRINCIPLES_LEARNED.md` 순으로 읽고 시작.

- **status**: **✅ 운영자 실사용 발견 오류 8건 + Desktop 교차검증 후속 3건(A/B/C) 전부 완료·push.** 상세는 `docs/handoff/CODE_UX_FIXES_RESULT_2026-08-10.md`(원본 8건 + 후속 A/B/C 이어서 기록). `npx tsc --noEmit` 0 · `npm run build` 0 · 브라우저 실사용 시나리오 + 실제 상품 import end-to-end 검증 완료. **아침 소싱 알림 크론 미실행 이슈(아래 긴급 섹션)는 이번 세션에서 착수하지 못함** — 사용자가 UX 작업으로 전환했기 때문. 다음 세션 최우선 후보.
- **branch**: `main`, 전부 push 완료.
- **배포 상태**: 다음 세션 STEP0에서 prod deploy SHA==HEAD 확인 필요.

---

## ★★ 이번 세션 완료 — 운영자 실사용 발견 오류 8건 + Desktop 교차검증 후속 3건 (2026-08-10)

원본 지시: `docs/handoff/CODE_UX_FIXES_HANDOFF_2026-08-10.md` + `docs/handoff/CODE_UX_FIXES_FOLLOWUP_2026-08-10.md` · 결과 상세: `docs/handoff/CODE_UX_FIXES_RESULT_2026-08-10.md`

### 원본 8건

| # | 항목 | 근본 원인 | write set |
|---|---|---|---|
| 1(최우선) | 씨앗심기 카테고리 "가구/인테리어" 대량 오분류 | AI 프롬프트의 강제 폴백 지시 | `api/category/suggest/route.ts` |
| 2 | 네이버 상품 가져오기 작동 안 함 | 클라이언트가 import API 응답을 안 읽고 무조건 성공 취급 | `products/page.tsx`(`NaverImportModal`) |
| 3 | 페이지네이션 숫자 버튼 없음 | UX 개선 요청 | `products/page.tsx`(동일 모달) |
| 4 | 마진 계산이 즉시할인 미반영 | import 시 `instant_discount` 컬럼을 전혀 안 채움 | `api/products/import/route.ts` |
| 5+6 | 씨앗심기 이동 시 정보/이미지 리셋 | import가 name/salePrice/mainImage 4개만 저장하고 나머지를 버림(hydrate 자체는 정상) | `api/products/import/route.ts` |
| 7 | 목표 마진율 "0" 접두 버그 | targetMargin input만 `value={x \|\| ''}` 패턴 누락 | `components/products/MarginCalculator.tsx` |

### Desktop 교차검증 후속 A/B/C (같은 날 이어서)

| # | 항목 | 결과 |
|---|---|---|
| A | 반려동물 자동급식기 → 가구/인테리어 잔여 오분류 | 원인은 fuzzy 매칭이 아니라 `FALLBACK_RULES`가 존재하지 않는 카테고리 축(`d1:'반려동물'`)을 가리키고 있어 안전망이 무력화된 것 — 실제 축(`생활/건강>반려동물`)으로 정정 + AI 프롬프트에 힌트 1줄 추가 |
| B | `dome_category_cache` 오염 | 규모 파악(Supabase 직접 조회) → 9건(프롬프트 수정 전 7건 + 조사 중 테스트로 생성된 2건)만 정밀 id 지정 삭제, 무관한 정상 fallback 캐시 3건은 보존 |
| C | 씨앗심기 프리필 end-to-end 미검증 | 실제 네이버 상품(원상품번호 13564133057) 실제 import → `?edit=`로 카테고리 4단계·판매가·대표이미지·태그(3개) 프리필 브라우저 확인 → 테스트 상품 DELETE로 정리 완료 |

**잔여(급하지 않음)**: #4(즉시할인 반영)는 이번 C의 테스트 상품이 할인 0원이라 "실제 할인 있는 상품" 시나리오는 여전히 미검증 — 코드 로직 자체는 Naver 공식 스키마로 이미 검증됨, 다음에 할인 걸린 상품 가져올 기회 있으면 재확인 권장.

**커밋**: 원본 8건 5개 커밋(`8541d04`~`666ac87`) + 후속 A/B/C는 다음 커밋으로 push 예정(아래 참조). 전부 push 완료.

---

## ★★ 긴급 이슈 (이번 세션 미착수) — 아침 소싱 알림 정규 스케줄 미실행

2026-08-10 세션에 사용자가 이 조사를 지시했으나, 곧바로 UX 8건 수정 → 후속 A/B/C로 전환되어 **이번 세션에서 실제 조사는 하지 못함**.

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
1. [최우선] 아침 소싱 알림 정규 스케줄 미실행 조사 착수
   → docs/handoff/CODE_DAILY_CRON_FIX_HANDOFF_2026-08-08.md 최신 섹션부터
2. push된 미merge 브랜치 존재(가장 최근 feature/preview-copy-then-redesign, 기준일로부터 며칠째) — 저녁 세션 때 우선 검토·merge(#320)
```

## 절대 금지 + 교훈 (누적, 변경 없음)
- 네이버 PUT/POST → 운영자 GO 없이 금지 · 자동발행 영구금지(#307)
- 디스코드 실발송 → 승인 없이 금지
- 신규 파일은 Desktop Commander:write_file만(#330) · 대용량MD 추가는 edit_block 앵커
- 테스트 데이터 방치 금지 — 이번 세션도 import 테스트 상품 DELETE로 정리 완료
- **UI 설정 화면 문구보다 curl/실측이 항상 우선**(#310)
- DB 캐시 정리는 규모 파악 후 id 지정 삭제만(전체 삭제 금지, #334 관련) — 이번 세션 B에서 그대로 적용
- git stash `z3c-misdirected-changes-needs-redo` 처리 방향 — 여전히 운영자 결정 대기(손대지 않음)
