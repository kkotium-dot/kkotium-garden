# 현재 인계 (CURRENT)

> 이 파일 1개만 활성 인계. 매 세션 종료 시 덮어쓴다.
> **작업 우선순위는 `docs/plan/WORK_SCHEDULE_BOARD.md`가 단일 권위.**

- **status**: P1+P1-E 구현·커밋 완료 + 빌드위험 복구 완료. **★그러나 쇼핑검색 API(SE05) 장애로 경쟁분석 전량 실패 → 후보 여전히 0건. 운영자 조치 필요(코드 문제 아님).**
- **branch**: `feature/preview-copy-then-redesign` (HEAD `72e20a4`, 미push — Code의 f88f5cf + Desktop의 policy 복구커밋)
- **next-action**: **운영자가 네이버 개발자센터에서 쇼핑검색 API 권한 등록** → 그 후 dry-run 재검증 → 후보 생성 확인 → 커밋 push → 승인 → 실발송

---

## 1. ★★ 이번 세션 최중요 발견 — 왜 아직도 후보가 0건인가

### 1-1. P1-E는 근본원인 하나를 해결했다 (검증 완료)
- **시드 키워드 사전**(`expandCategoryToKeywords`)이 비어 3.5개월 무력화됐던 문제 → Code가 8개 D1 카테고리 × 상품어 15~20개로 채움. **해결 확인**: 프로덕션 실측으로 시드 키워드가 검색량 임계 통과 — 수납장 43,000 / 청소기 89,000 / 요가매트 45,660 / 크로스백 61,550 (이전 카테고리명은 10건대였음).

### 1-2. ★ 그런데 두 번째 병목이 드러났다 — 쇼핑검색 API SE05
- 소싱 파이프라인: 시드확장 → **검색량 조회(OK)** → **경쟁분석(실패)** → 도매매칭 → 후보.
- **경쟁분석이 8건 전량 실패**한다(dry-run `competitionAnalysisFailures: 8`). Code가 추가한 실패 카운터 덕에 드러남(#270 수정 효과 — 이전엔 무음이라 안 보였음).
- **직접 원인 확정**: 경쟁분석은 `searchShopping()`으로 상품 개수(productCount)를 얻는데, 네이버 쇼핑검색 API가 **HTTP 404 / errorCode SE05 ("존재하지 않는 검색 api")**를 반환.
- **로컬·프로덕션 양쪽 다 실패 확인**: 프로덕션 `/api/naver/keyword-competition?name=수납장` → `searchVolume: 43000` 오지만 `productCount: null`.

### 1-3. 이건 코드 문제가 아니다 — 운영자 조치 필요 ★
- SE05는 **네이버 개발자센터(developers.naver.com) 앱에 "검색" API가 등록/권한 부여되지 않았을 때** 나는 에러다.
- 현재 DataLab(트렌드)·검색광고(검색량)는 정상 → 그 API들은 등록됨. **오직 "검색(쇼핑)" API만 미등록**.
- **운영자 조치**: developers.naver.com → 해당 애플리케이션 → "API 설정" → **"검색" API 사용 추가** (무료). 이미 쓰는 DataLab 앱에 체크 하나 추가하면 될 가능성이 높다.
- Desktop은 이 설정을 대신 못 한다(운영자 계정 로그인 필요). **정직하게 보고 — 지어내지 않음(#310).**

---

## 2. 이번 세션 검증·복구 내역 (Desktop 실측)

| 항목 | 결과 |
|---|---|
| ★ **빌드 위험 복구** | `src/lib/policy/exclusion-rules.ts`가 **untracked라 커밋 누락**된 것 발견. P1-E의 `sourcing-recommender.ts`가 이걸 import하므로 push 시 프로덕션 빌드 실패했을 것. → Desktop이 `72e20a4`로 커밋 복구 |
| `npm run build` | ✅ 0 errors (policy 커밋 후 git 기준 빌드 성공 확인) |
| tsc | ✅ 0 errors |
| P1-E 시드 사전 | ✅ 8개 카테고리 실물 확인, 식품·화장품 제외 준수 |
| dry-run 게이트 | ✅ fail-safe, `discordSent: false` |
| 실패 카운터(#270) | ✅ embed에 "⚠️ 조회 실패: 경쟁 분석 실패 8건" 정상 노출 |
| 취급제외 엔진 내용 | ✅ PRD §5-2 스펙 일치 |

## 3. Cowork P2 산출물 (미커밋, 검증 완료)
- `SEASON_CALENDAR_DATA_2026.md`(274줄, 이벤트 24건) + `SEASON_CALENDAR_DESIGN.md`(106줄) + `SEASON_KEYWORD_AUDIT.md`(121줄)
- **키워드 감사 핵심**: 시즌 keywords 109개 중 **42%(46개)가 카테고리명·추상어라 시드 부적합**(이번 3.5개월 사고와 동일 유형). Cowork가 정확히 잡아냄. → P2 시즌 키워드를 P1-E 시드에 합류시키기 전 이 46개를 구체 상품어로 교체해야 함.
- sentinel 0건 확인. 아직 커밋 안 함(Cowork 소유).

## 4. 다음 작업 순서 (의존성)

```
[운영자] 쇼핑검색 API 권한 등록 (SE05 해소)   ← ★ 이게 안 되면 아래 전부 막힘
   └─▶ [Desktop] dry-run 재검증 → 후보 1건+ 생성 확인
          └─▶ [정리] Code f88f5cf + policy + P2 문서 전체 커밋 push
                 └─▶ [운영자] dry-run 결과 검토 → 승인
                        └─▶ [설정] SOURCING_RECOMMEND_LIVE=true → 실발송
[병렬 가능] P2 시즌 키워드 46개 교체(SEASON_KEYWORD_AUDIT 반영) — 쇼핑API와 무관, 지금 가능
```

## 5. 절대 금지 (매 세션 확인)
- 네이버 스토어 PUT/POST → 운영자 "GO" 없이 금지
- **디스코드 실발송 → 운영자 승인 없이 금지.** `SOURCING_RECOMMEND_LIVE` 미설정 = 안전
- 자동 발행 → 영구 금지(#307)
- 테스트 데이터 방치 → 같은 세션에 원복
- 허위 완료 보고 → 미실측은 "미검증" 명시(#310). **SE05는 운영자 조치 필요를 정직히 보고**
- 부재 증명은 전수 검색으로(#323)
- 무음 실패 금지 — 삼킨 오류는 카운트·표시(#270). keyword-competition:91 등 잔여 silent catch도 향후 정리 대상
- 병렬 작업 시 write set 밖 파일 되돌리기 금지(#322)

## 6. AI·멀티플랫폼 확장 염두 (운영자 방향, 2026-08-01)
- 현재는 네이버 스마트스토어 단일. **수익 성장 시 타 플랫폼·해외 플랫폼 확장 가능성**.
- 함의: 소싱·SEO·제외정책 로직을 **플랫폼 종속으로 하드코딩하지 말 것.** `judgeExclusion()`처럼 순수 함수로 분리해두면 플랫폼 어댑터만 갈아끼우면 된다.
- 이미 `/settings/platforms` 라우트 존재 — 멀티플랫폼 기반 일부 있음. 확장 시 이 지점 활용.
- 새 기능 설계 시 "네이버 전용 상수"와 "플랫폼 공통 로직"을 파일 단위로 분리하는 것을 기본 원칙으로.
