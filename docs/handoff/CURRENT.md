# 현재 인계 (CURRENT) — 2026-08-04 세션 종료

> 이 파일 1개만 활성 인계. 다음 세션은 이 파일 → `WORK_SCHEDULE_BOARD.md` → `PRINCIPLES_LEARNED.md` #295~#324 순으로 읽고 시작.

- **status**: ★도매꾹 API 404 규명·수정·검증 + 음수마진 근본원인 규명·수정·검증까지 전부 완료·커밋·push 완료. dry-run 재실행으로 5/5 후보 전부 정직한 공급가 범위(마진% 0개 지어냄) 노출 확정.
- **branch**: `feature/preview-copy-then-redesign` (HEAD `b39f2d7`, **push 완료**)
- **next-action(최우선)**: ①Vercel 프리뷰 배포 완료 확인 ②운영자 main merge 결정 ③merge 후 프로덕션 브라우저 검증(검수재설계·페르소나·도매꾹수정·음수마진수정 전부 미검증 상태로 대기 중) ④발견된 4-Mode 추천 시스템 미정리 이슈(§3) 별도 확인

---

## 1. ★ 도매꾹 API 404 — 규명·수정·검증 완결 (커밋 `3365f8c`, push 완료)

**Desktop 근본원인 규명**(`docs/research/DOMEGGOOK_API_404_ROOT_CAUSE_2026-08-04.md`): 도매꾹 API는 폐기되지 않음. `ver=4.5`가 `getItemList`엔 존재하지 않는 버전(v4.0에서 구조 전면개편, 현재 권장 4.1)이라 `UNKNOWN_SERVICE`가 난 것. 실제 키로 라이브 차등검증 완료(구버전=404 재현, 신버전=200+실상품).

**Code 수정**: `wholesale-matcher.ts` 전면 재작성 — `ver=4.1`+`market`파라미터화+평면스키마 파싱. `searchDomemae`(HTML스크래핑) 폐기 → 동일 API `market=supply` 호출로 대체. 호출순서 supply(도매매)1차→dome(도매꾹)2차로 DOMAIN_FACTS 정합.

**Desktop 재검증**: tsc 0·dry-run 재실행 → 5/5 후보 전부 도매매칭 성공(`wholesaleMatchFailures: 0`).

---

## 2. ★★ 음수마진 근본원인 — 규명·수정·검증 완결 (커밋 `b39f2d7`, push 완료)

**근본원인**(`docs/research/SOURCING_NEGATIVE_MARGIN_ROOT_CAUSE_2026-08-04.md`): 도매매칭은 키워드 전문검색이라 같은 검색어에도 이종 상품이 섞인다(예: "텐트" 검색에 캠핑 소품 "샌드팩" 1,100원이 걸림). `sourcing-recommender.ts`가 그중 최저가 1건을 "이 키워드의 대표 판매가"로 역산(`supplyPrice/0.35`)해 전체 마진을 계산하던 로직이, 실제 텐트 상품(14,500원)에 적용되며 마이너스 수백%(-367%)를 만들어냈다. 도매매칭이 이전엔 0건이라 이 로직 자체가 미실행 상태였다가, 이번 세션 API 수정으로 처음 실행되며 드러난 잠복 결함.

**운영자 결정**: 3안(A/B/C) 중 **C안(공급가 범위만 표시, 마진% 완전 폐기)** 채택.

**수정 내용**(커밋 `b39f2d7`):
- `wholesale-matcher.ts`: `estimatedMargin` 필드·`avgNaverPrice` 파라미터·역산 로직 전량 제거. 정렬 기준 마진→공급가 오름차순 전환. Discord embed 헬퍼도 공급가만 표시.
- `sourcing-recommender.ts`: Step6 avgPrice 역산 블록 → `supplyPriceRange`(min/max 실측값)로 교체. Discord embed 문구 "도매 공급가 X원~Y원 확인됨 — 판매가는 직접 책정해주세요"로 정직화. 부수: `totalResults:0`인데 `competitionLevel` 채워지는 라벨링 혼선도 표시에서 제거(계산 로직 자체는 처음부터 정상이었음 — 버그 아님으로 재확인, 검색광고 competition에서 옴).
- `recommendation-runner.ts`: 옛 시그니처(`matchWholesaleProducts(kw,avgPrice)`) 호출부(SEASONAL_AHEAD 모드) 발견·수정. `estimatedMargin`이 항상 0이 되며 무의미해진 `runCurrentHot`·`runNicheBlue`의 마진 기반 정렬/필터를 `blueOceanScore`·경쟁도 기준으로 안전 전환(최소 조치 — 근본 재설계는 §3 참조).

**Desktop 재검증(dry-run 재실행)**: 5/5 후보 전부 음수마진 완전 소멸, 공급가 범위 정직 노출 확인(텐트 440원~6,000원, 아이스박스 1,280원~5,000원 등). `estimatedMargin: 0`(고정, 기만 없음) 확인.

---

## 3. ★ 새로 발견 — 4-Mode 추천 시스템(`recommendation-runner.ts`) SE05 이후 미정리 (미착수, 다음 세션 확인 필요)

이번 세션 tsc 에러 추적 중 발견. 단건 수습만 하고 넘어감 — **범위 확인 필요**:
- `runSeasonalAhead`(SEASONAL_AHEAD 모드)가 `analyzeCompetition()`을 호출하는데, 이 함수는 SE05(네이버 쇼핑검색 API 영구종료)로 **항상 실패**하는 것으로 이전 세션(rev96 이전)에 확정됨. 즉 SEASONAL_AHEAD 모드는 현재 사실상 죽어있을 가능성.
- `runCurrentHot`·`runNicheBlue`가 `estimatedMargin` 기반이었던 걸 이번에 `blueOceanScore`로 임시 전환했으나, 이게 이 4-Mode 시스템의 원래 설계 의도(마진 좋은 상품 우선)와 맞는 대체인지는 검토 필요.
- **다음 세션 확인 사항**: 이 `runFourModes()`가 실제로 어디서 호출되는지(크론 연결 여부), 죽어있다면 방치해도 되는지 운영자 확인, 살아있다면 SEASONAL_AHEAD 전체를 sourcing-recommender.ts와 동일한 패턴(검색광고 기반)으로 재설계 필요.

---

## 4. 병렬작업 전체 상태 (누락 0)

| 작업 | 상태 | 검증 수준 | 갭 |
|---|---|---|---|
| 도매꾹 API 404 수정 | ✅ 완료·push | tsc 0·build 0·dry-run 라이브 재현 | 없음 |
| 음수마진 근본수정 | ✅ 완료·push | tsc 0·build 0·dry-run 재검증(5/5 정직화 확인) | 없음 |
| 3-A 소싱 회생 | ✅ 완료·push | dry-run 5/5 성공 | 없음 |
| 발행검수 UI 재설계 | ✅ 완료·push | 로컬 브라우저만(rev93) | **프로덕션 미검증**(merge 필요) |
| 페르소나 판단표면 분리 | ✅ 완료·push | git diff+로컬 4/6곳 | **프로덕션 미검증**, 2곳 미검증(#310) |
| P2 시즌캘린더 문서 3건 | ✅ 완료·push | sentinel 0 | 없음 |
| 4-Mode 추천시스템 SE05 정리 | ⛔ 미착수 | — | §3 참조, 범위 확인 필요 |

**핵심 병목 전환**: push는 완료됨(브랜치 최신화). 이제 병목은 **`main` merge 여부**(운영자 결정) — merge 전까지 프로덕션은 여전히 구버전.

---

## 5. 다음 세션 최우선 순서

```
[확인] Vercel 프리뷰 배포(b39f2d7 기준) READY 상태 확인
[운영자 결정] main merge 여부
   └─▶ merge 시 → 검수재설계·페르소나·도매꾹수정·음수마진수정 전부 프로덕션 브라우저 검증 가능해짐
[운영자 결정] 4-Mode 추천시스템(§3) 확인 필요 여부 — 크론 연결 여부부터
[merge+검증 후] 디스코드 실발송 승인 여부 검토
```

## 6. 절대 금지 (매 세션 확인)
- 네이버 PUT/POST → 운영자 GO 없이 금지
- 디스코드 실발송 → 승인 없이 금지. `SOURCING_RECOMMEND_LIVE` 미설정=안전(현재 안전)
- 자동 발행 → 영구 금지(#307)
- 테스트 데이터 방치 → 이번 세션 임시파일(.tmp_dryrun2.json, .commit-msg.tmp) 전량 삭제 확인됨(git status에 코드/문서 변경 외 잔여물 없음)
- 외부 API 실패는 설정 의심 전 공급자 공지 실측(#324)
- 미실측 단정 금지(#310) · 부재증명 전수검색(#323) · 무음실패 금지(#270)
- dev 서버: 이번 세션 PID 37942·38742 kill 완료. 다음 세션 시작 시 `lsof -ti:3000` 확인
