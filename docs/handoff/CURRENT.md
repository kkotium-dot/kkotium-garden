# 현재 인계 (CURRENT) — 2026-08-03 세션 종료

> 이 파일 1개만 활성 인계. 다음 세션은 이 파일 → `WORK_SCHEDULE_BOARD.md` → `PRINCIPLES_LEARNED.md` #295~#324 순으로 읽고 시작.

- **status**: ★소싱 추천 3.5개월 만에 회생 확인(dry-run 후보 5건). 단, 도매매칭은 도매꾹 API death로 별도 이슈. **미커밋 코드 3파일 + 문서 3건 존재 — 다음 세션에서 push.**
- **branch**: `feature/preview-copy-then-redesign` (HEAD `71de270`, 미push)
- **next-action(최우선)**: ①도매꾹 API 404 원인 규명 → ②3-A 코드+P2 문서 전체 커밋 push → ③운영자 승인 후 실발송

---

## 1. ★ 이번 세션 최대 성과 — 소싱 추천 회생 확인

**3-A 구현(Code) + 검증(Desktop) 완료.** SE05(네이버 쇼핑검색 API 종료)로 죽었던 경쟁분석을 검색광고 경쟁지수로 대체.

**dry-run 실측 결과** (로컬, `POST /api/sourcing-recommend?dryRun=true`, 9.4초):
| 후보 | 검색량 | 경쟁 | 블루오션 | 도매매칭 |
|---|---|---|---|---|
| 무선충전기 | 22,100 | mid | 70 | 0건 |
| 모자 | 52,200 | mid | 65 | 0건 |
| 파우치 | 29,770 | high | 55 | 0건 |
| 선글라스 | 76,200 | high | 50 | 0건 |
| 크로스백 | 61,680 | high | 50 | 0건 |

- `opportunityCount: 5` · `competitionAnalysisFailures: 0` · `discordSent: false`
- 이전엔 SE05로 즉시 실패(1.7초·0건) → 이제 정상 완주(9.4초·5건). **근본 회생 확인.**
- tsc 0.

---

## 2. ★★ 이번 세션 새 발견 — 도매꾹 API도 죽어있음 (SE05와 별개)

**증상**: 후보 5건 전부 `도매매칭 0건`. 실패 카운터는 0(=실패가 아니라 결과 없음).

**실측 추적**:
- DB `daily_recommendations` 2026-07-09 소싱 기록도 `supplier_id` 전부 null → **도매매칭은 원래부터 0건**(SE05 이전부터의 기존 이슈).
- 도매꾹 키는 DB `store_settings.domeggook_api_key`에 SET(32자, 정상 존재).
- **직접 curl 테스트**(node --env-file로 DB 키 추출 후 호출): `https://domeggook.com/ssl/api/?ver=4.5&mode=getItemList&aid=<KEY>&keyword=무선충전기&om=json` → **HTTP 404 `{"dcode":"UNKNOWN_SERVICE","dmessage":"해당 오픈 API 서비스가 없습니다"}`**

**해석**: 도매꾹 getItemList OpenAPI도 SE05와 유사하게 폐기/변경된 것으로 추정. **아직 원인 미확정** — #324 원칙대로 단정하지 않음.

**다음 세션 할 일**: 도매꾹 공식 공지·API 문서를 실측(web_fetch 차단 시 `curl -A "Mozilla/5.0"`). 엔드포인트/버전 변경인지, 완전 종료인지 확인. `wholesale-matcher.ts`(37행 `DOMEGGOOK_API = 'https://domeggook.com/ssl/api/'`)가 대상.

**의미**: 후보 발굴(검색량+경쟁도)은 정상 회생했으나, 후보에 붙는 **실제 도매 공급처·공급가·마진**은 도매꾹 API death로 못 채운다. 두 기능은 독립 — 후보는 지금도 유효, 도매 매칭만 별도 복구 필요.

---

## 3. 미커밋 현황 (다음 세션에서 push)

**코드 3파일 (Code 3-A 작업, tsc 0 검증됨)**:
- `src/lib/sourcing-recommender.ts` — analyzeCompetition 의존 제거, competition만으로 블루오션 산출
- `src/app/api/naver/keyword-competition/route.ts` — silent catch 정리(#270)
- `src/lib/wholesale-matcher.ts` — 가격대 보완

**문서 3건 (Cowork P2, sentinel 0 검증됨)**:
- `docs/design/SEASON_CALENDAR_DATA_2026.md` (24이벤트, 키워드 실상품어 교체 완료)
- `docs/design/SEASON_CALENDAR_DESIGN.md`
- `docs/design/SEASON_KEYWORD_AUDIT.md`

**push 전 확인**: 3-A 코드가 `build` 통과하는지 최종 확인 후 push 권장(이번 세션은 tsc만 확인, build 미실행).

---

## 4. 전체 소싱 파이프라인 상태 (한눈에)

```
시드확장(P1-E) ✅  →  검색량(검색광고) ✅  →  경쟁분석(검색광고 대체, 3-A) ✅
   →  블루오션 점수 ✅  →  취급제외 필터 ✅  →  도매매칭(도매꾹 API) ❌ 404
   →  디스코드 embed(한글화) ✅  →  dry-run 게이트 ✅
```
**살아있음**: 후보 발굴 전 과정. **죽어있음**: 도매 실물 매칭만.

---

## 5. 다음 작업 순서 (의존성)

```
[최우선] 도매꾹 API 404 원인 규명(공식 공지 실측, #324)
   └─▶ 엔드포인트/버전 변경이면 → wholesale-matcher.ts 수정
   └─▶ 완전 종료면 → 대체 소싱처 검토(도매매 등)

[정리·독립] 3-A 코드 + P2 문서 전체 커밋 push  ← 도매꾹과 무관, 지금 가능
   └─▶ build 확인 → 운영자 저녁 검토 → merge

[BLOCKED→push후] 운영자 승인 → SOURCING_RECOMMEND_LIVE=true → 실발송

[BLOCKED→3-A push후] 3-B 공통 competition-provider (나머지 10개 파일 이관)
```

**병렬 가능**: "도매꾹 원인 규명"(Desktop MCP/curl)과 "3-A push 준비"(Code build)는 독립 — 동시 진행 안전.

---

## 6. 절대 금지 (매 세션 확인)
- 네이버 PUT/POST → 운영자 "GO" 없이 금지
- 디스코드 실발송 → 승인 없이 금지. `SOURCING_RECOMMEND_LIVE` 미설정=안전(현재 안전)
- 자동 발행 → 영구 금지(#307)
- 테스트 데이터 방치 → 같은 세션 원복 (이번 세션: DB 조회만, 쓰기 없음)
- 외부 API 실패는 설정 의심 전 공급자 공지 실측(#324) — 도매꾹도 이 원칙 적용
- 미실측 단정 금지(#310) · 부재증명 전수검색(#323) · 무음실패 금지(#270)
- 병렬 시 write set 밖 되돌리기 금지(#322)
- **dev 서버 정리**: 이번 세션 pid 31099 kill 완료. 다음 세션 시작 시 `lsof -ti:3000` 확인

## 7. 멀티플랫폼·AI 확장 방향 (운영자, 유지)
네이버 단일 → 수익 성장 시 타/해외 플랫폼 가능성. 로직을 플랫폼 종속 하드코딩 금지, 순수함수 분리(judgeExclusion·competition-provider 패턴). 도매꾹 대체 검토 시에도 "도매처 provider" 추상화로 설계하면 향후 다른 도매처 추가가 쉬움. `/settings/platforms` 라우트 존재.
