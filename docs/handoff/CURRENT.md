# 현재 인계 (CURRENT) — 2026-08-10 세션 (거래처 "null" 텍스트 버그 근본수정 + 로드맵1b 완료 + 아침 소싱 크론 조사 착수·중복발송 가드 추가, GitHub Actions 안전망은 승인 대기)

> 다음 세션은 이 파일 → 해당 트랙 설계문서 → `PRINCIPLES_LEARNED.md` 순으로 읽고 시작.

- **status**: **✅ 거래처 명단 "null" 텍스트 노출 버그 근본수정·데이터정리·프로덕션 검증 완료(#334, 커밋 `10b8a7e`).** ✅ 꼬띠 소싱 v2 로드맵 1(공급사 축, `d50b45a`)+1b(다중 렌즈, `2a406d8`) 완료. **아침 소싱 크론: 이번 세션에 착수했으나 근본원인은 여전히 미확정** — Vercel Hobby 크론의 실행 이력을 조회할 API/로그 자체가 없어 사후 확인이 구조적으로 불가능함을 확인. 대신 중복발송 방지 가드를 코드에 추가(안전망 선행조건). GitHub Actions 외부 안전망은 설계만 하고 **운영자 승인 대기**(시크릿 등록 필요, 실발송 자동화이므로 임의 활성화 안 함).
- **branch**: `main` (HEAD 이번 세션 커밋 예정분 반영 전 `31038b1`, 전부 push)
- **배포 상태**: `31038b1`까지 배포·verify-vercel-deploy.sh OK

---

## ★★★ 이번 세션 — 아침 소싱 크론 조사 (2026-08-10, Code)

원본 지시: `docs/handoff/CODE_DAILY_CRON_FIX_HANDOFF_2026-08-08.md` · 결과 상세: `docs/handoff/CODE_DAILY_CRON_FIX_RESULT_2026-08-10.md`

**신규 확인 사실**:
1. Vercel 공식문서(Cron Jobs Usage & Pricing) 직접 재확인 — Hobby 크론 개수 상한은 **100개**(5개 아님, 우려 기각), 스케줄 정밀도는 **시간 단위(±59분)**. 스킵 조건에 대한 별도 공식 문서는 없음.
2. Vercel Runtime Logs/Errors API로 재확인 — 로그 보관 1시간 한계 재확인(Desktop 관찰과 일치). 단 **최근 7일간 두 크론 라우트 모두 에러 0건** — "불렸다면 항상 무결하게 끝났다"로 범위가 좁혀짐(원인 확정은 아님).
3. **DB 재검증에서 새 불일치 발견**: `sourcing_opportunity_records`·`daily_recommendations` 둘 다 8/8 이후 레코드가 전무함(최신은 8/7 13:14 낮 스캔). 인계문서의 "8/8 수동 curl 테스트로 `{sent:true}` + DB 레코드 확인"이라는 기존 서술과 배치됨 — **Desktop 재확인 필요**(상세는 결과문서 §3).
4. Code의 브라우저 세션은 Vercel에 로그인돼 있지 않아 크론 상세페이지(Recent Invocations)는 여전히 Code가 직접 확인 불가 — **Desktop/운영자 전용 작업으로 남음**.

**코드 변경(완료)**: `src/app/api/sourcing-recommend/route.ts` POST에 당일 중복발송 방지 가드 추가 — 같은 날 이미 레코드가 있으면 재실행을 스킵(`skipped:true`). 외부 안전망을 붙여도 Vercel 자체 크론과 겹쳐 하루 2번 발송될 위험을 원천 차단. `npx tsc --noEmit` 0 확인.

**미구현(운영자 승인 대기)**: GitHub Actions 외부 안전망(`.github/workflows/sourcing-daily-safety-net.yml`, 00:10 UTC=09:10 KST, Vercel 시간창 종료 후 실행). 활성화 시 매일 자동으로 실제 프로덕션에 발송 요청을 보내게 되므로, 그리고 프로덕션 `CRON_SECRET`을 GitHub repo secret으로 등록해야 하므로 임의로 구현·활성화하지 않았다. 설계 상세는 결과문서 §5.

---

## ★★★ 신규 완료 — 거래처 "null" 텍스트 버그 근본수정 (2026-08-10, 커밋 `10b8a7e`)

운영자 스크린샷 신고: 거래처 명단 화면 연락처 아래 "null" 텍스트 노출.

**근본원인**: `suppliers/[id]/route.ts` PATCH가 `String(body.x).trim() || null` 패턴 사용 — `String(null) === "null"`(JS 함정)이라, 필드가 이미 JS null인 채로 PATCH 요청에 실리면 문자열 "null"이 그대로 DB에 저장됨. POST(생성)는 `String(body?.x ?? '')`로 `??`가 먼저 빈 문자열로 바꿔서 안전했음 — PATCH만 취약.

**수정**: 4개 필드(contact/address/description/domeggookSellerId) 전부 `body.x == null` 체크 후 String() 우회하도록 한 번에 근본 수정(#55 전 상품 공통).

**데이터 정리**: 오염된 4건(이현마켓·gseller2022·보배몰·BanD반디)의 description/address를 NULLIF로 실제 null 원복. Product 테이블 유사 패턴 전수조사 — 0건, Supplier만의 문제로 확산 위험 없음 확인.

**검증(Desktop)**: tsc 0·build 0·프로덕션 브라우저 확인("null" 텍스트 완전 소멸, 스크린샷 확인)·회귀 검증(재저장 후에도 "null" 재발 안 함, DB 재조회로 확인).

**★ 운영자 후속 조치 확인됨**: 4개 공급사에 실제 도매매 셀러ID 등록 완료(jaemin9335·gseller2022·boubaemall·pazzemax, 스크린샷 확인).

**★★ 로드맵 1 실데이터 재검증 완료(2026-08-10 Desktop, 이 세션 마지막 작업)**: 로컬 스크립트로 `searchBySupplier()`를 5개 키워드(양말·청소기·가습기·아이스박스·캠핑)로 실측. **4개 공급사 전부 실제 도매매 상품이 정확히 매칭됨** 확인 — "이현마켓"은 5개 키워드 전부, 나머지도 다수 매칭. 설계 의도("이 키워드에 맞는 상품 중 내가 실제 거래하는 공급사가 취급하는 것")대로 정확히 작동. 검증 스크립트는 삭제(방치 0).

부수 관찰(급하지 않음, 로드맵 2에서 자연 해소 예정): "청소기" 검색에서 "귀이개" 계열이 매칭됨 — `searchBySupplier`는 아직 `categoryMismatch` 판별을 안 거치는 별도 경로(로드맵 2에서 통합 스코어러가 이걸 합칠 예정).

**로드맵 1·1b 전부 완료·실전 검증 끝 — 다음은 로드맵 2(렌즈×공급사 통합 스코어러) 착수 가능.**

---

## ★★ 꼬띠 소싱 v2 로드맵 1b (다중 발굴 렌즈, 2026-08-10)

원본 지시: `docs/handoff/CODE_SOURCING_V2_LENSES_HANDOFF_2026-08-10.md` · 결과 상세: `docs/handoff/CODE_SOURCING_V2_LENSES_RESULT_2026-08-10.md`

**핵심**: 설계 문서(`docs/design/KKOTTI_DAILY_SOURCING_V2_2026-08-07.md` §3-0)의 8개 렌즈(급상승📈·시즌선점🗓️·니치💎·블루오션🌊·꿀통🍯·황금🏆·스테디📚 + 레드오션⚠️경고)를 구현. 기존 `naver/recommendation-type.ts`(황금/니치/시즌 3렌즈)와 `naver/category-score.ts`·`naver-margin-advisor.ts`를 재사용하는 순수 분류 계층 — 신규 대발명 아님.

| 파일 | 작업 |
|---|---|
| `src/lib/sourcing-lenses.ts`(신규) | 8개 렌즈 판정 로직 + `LENS_DAILY_QUOTA`(상수화) + `allocateByLens()` |
| `src/lib/trend-analyzer.ts` | `computeRisingRate`/`computeVolatility`/`fetchCategoryTrendSignals` 추가 — 기존 7일 DataLab 시계열 재해석, **API 재호출 추가 없음** |

**수정 금지 확인**: `wholesale-matcher.ts`(로드맵1 완료분) · `cron/*` · `.github/workflows/*` 전부 미변경(git diff로 확인).

**검증**: `npx tsc --noEmit` 0 · `npm run build` 0. 로컬 임시 스크립트(tsx, 검증 후 삭제)로 순수함수 단위 검증 — 급상승/스테디/시즌선점/레드오션 각 렌즈가 알려진 샘플 데이터로 정확히 분류됨, 얇은 데이터(1포인트)는 근거 없이 판정 안 함(#231) 확인, 배분기 중복 배정 없음·미달 정직 표시(#325) 확인.

**다음 단계(이번 범위 밖)**: 실제 `sourcing-recommender.ts`(cron 소비)에 렌즈 분류기를 연결해 10개 추천에 배지를 붙이고 디스코드/앱에서 렌즈별로 그룹핑하는 실배선 작업(설계 §3-1·§3-4)은 `cron/*` 수정 금지 지시로 이번 범위에서 제외 — 별도 로드맵 단계로 이어감.

---

## 다음 세션 시작 순서
```
1. [운영자 결정 대기] 아침 소싱 크론 — GitHub Actions 외부 안전망 구현 승인 여부
   (docs/handoff/CODE_DAILY_CRON_FIX_RESULT_2026-08-10.md §5·§6)
   + Desktop 대시보드 Recent Invocations 확인 + §3 DB 불일치 재확인
2. [후속] 소싱 v2 로드맵 1b(렌즈 분류기)를 실제 파이프라인(sourcing-recommender.ts/cron)에 배선 — 운영자 우선순위 확인 후
3. push된 미merge 브랜치 존재(가장 최근 feature/preview-copy-then-redesign) — 저녁 세션 때 우선 검토·merge(#320)
```

## 절대 금지 + 교훈 (누적)
- 네이버 PUT/POST → 운영자 GO 없이 금지 · 자동발행 영구금지(#307)
- 디스코드 실발송 → 승인 없이 금지
- 신규 파일은 Desktop Commander:write_file만(#330) · 대용량MD 추가는 edit_block 앵커
- 테스트 데이터 방치 금지
- **UI 설정 화면 문구보다 curl/실측이 항상 우선**(#310)
- DB 캐시 정리는 규모 파악 후 id 지정 삭제만(전체 삭제 금지, #334)
- **낡은 인계문서의 "진행 중"·"대기 중" 표기를 실측 없이 믿지 말 것**(#318) — 이번에도 "크론 조사 Code 진행 중"이 실제로는 착수 전이었음
- **인계문서의 "확인됨" 서술도 재검증 대상**(#310 연장) — 8/8 수동 테스트 DB 레코드 "확인" 서술이 이번 재조회에서 배치됨(위 §참조)
- 매일 자동 실행되며 실제 외부 발송을 일으키는 CI 워크플로(GitHub Actions 등) 추가·활성화 = 디스코드 실발송과 동급 승인 대상
- git stash `z3c-misdirected-changes-needs-redo` 처리 방향 — 여전히 운영자 결정 대기(손대지 않음)
