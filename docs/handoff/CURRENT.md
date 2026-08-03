# 현재 인계 (CURRENT)

> 이 파일 1개만 활성 인계. 매 세션 종료 시 덮어쓴다.
> **작업 우선순위는 `docs/plan/WORK_SCHEDULE_BOARD.md`가 단일 권위.**

- **status**: P1+P1-E 구현 완료. **★SE05 근본원인 최종 확정 = 네이버 쇼핑검색 API 영구 종료(2026-07-31). 운영자 조치 불필요 — 코드 재설계 필요.**
- **branch**: `feature/preview-copy-then-redesign` (HEAD 이 커밋, 미push — Code f88f5cf + Desktop policy복구 72e20a4 + SE05기록 f655ef9 + 이번 대응설계)
- **next-action**: 3-A(경쟁분석을 검색광고 경쟁지수로 대체) 구현 → dry-run 후보 생성 확인 → 커밋 push → 승인 → 실발송

---

## 1. ★★ SE05 최종 확정 — 제 이전 진단이 틀렸음 (정정)

### 무슨 일이었나
- 이전 세션 Desktop이 "운영자가 개발자센터에서 쇼핑검색 API 권한 등록 필요"로 기록 → **틀렸다.**
- 운영자가 "개발자센터 문제 없어 보인다"고 지적 + 공식 공지 링크 제공.
- **공식 공지 실측 확정**(curl로 확인, web_fetch는 SITE_BLOCKED):
  - `article/32564`: 네이버 검색 '쇼핑/책/전문자료' API **2026-07-31 서비스 종료**
  - `article/32530`: **API HUB 이관 대상에서도 제외** — 유예기간·대체경로 없음
- **결론**: 네이버가 어제(7/31) 쇼핑검색 API를 영구 폐기. 오늘이 8/1이라 SE05가 나온 것. **운영자 설정 문제 전혀 아님.**
- 원칙 #324 신설(외부 API 실패는 설정 의심 전에 공급자 공지 실측) + #310 재확인.

### 살아있는 것 / 죽은 것
| API | 상태 |
|---|---|
| 쇼핑검색(shop.json) | ❌ **영구 종료** |
| DataLab 트렌드·검색어 트렌드 | ✅ API HUB 이관, 사용 가능 |
| 검색광고(keywordstool, 검색량+경쟁지수) | ✅ 정상 |
| 커머스 API | ✅ 정상 |

---

## 2. ★ 영향 범위 — 11개 파일 (전 상품 공통, 단건 아님)

`searchShopping()`/`analyzeCompetition()`(폐기 API 사용) 소비처 11개: `sourcing-recommender` · `recommendation-runner` · `keyword-competition` · `market-analysis` · `naver-seo/ai-generate` · `kkotti-comment` · `datalab` · `competition-monitor` · `strategy/identity-extractor` · `strategy/signal-collector` · `strategy/identity-dictionary`.

→ **하나씩 땜질 금지.** 공통 추상화 계층 하나로(#62). 상세 설계: `docs/design/NAVER_SHOPPING_API_SUNSET_RESPONSE.md`.

---

## 3. 재설계 방향 (의존성 순서) — Code 착수 지점

### 3-A [최우선] 경쟁분석을 검색광고 경쟁지수로 대체
- `keyword-stats`(살아있음)가 이미 `competition: low/mid/high` 반환(실측: 수납장 mid·청소기 high).
- 소싱의 `calcBlueOceanScore()`는 이미 이 값을 쓴다 → **productCount 없이 점수 산출 가능**.
- **최소 수정**: 소싱에서 `analyzeCompetition()` 의존 제거 또는 null 허용(파이프라인이 안 죽게). 가격대는 도매매칭 도매가로 보완.
- 이러면 **소싱 후보 즉시 생성** → dry-run으로 검증(로컬 검색광고 키 있음).

### 3-B [단기] 공통 경쟁분석 provider 신설
- `src/lib/market/competition-provider.ts`(신규) — 경쟁도·가격대 인터페이스. 11개 파일 점진 이관.
- **멀티플랫폼 대비**: provider를 플랫폼 중립으로 설계(운영자 방향 — 향후 타 플랫폼·해외 확장).

### 3-C [중기] 쇼핑인사이트(API HUB) 도입 검토 — 후순위

---

## 4. 이번 세션 검증·복구 내역 (유지)

| 항목 | 결과 |
|---|---|
| 빌드위험 복구 `72e20a4` | policy 커밋 누락 → 복구, build 0 확인 |
| P1-E 시드 사전 | ✅ 검색량 임계 통과(수납장 43000 등) — 첫 병목 해결 확인 |
| dry-run 게이트 | ✅ fail-safe, discordSent false |
| 실패 카운터(#270) | ✅ competitionAnalysisFailures:8 노출 → SE05 발견의 단서 |

## 5. Cowork P2 (미커밋, 검증됨)
- 시즌 데이터 24건 + 설계 + 키워드감사(109개 중 46개 시드부적합 식별).
- **P2 키워드 46개 교체는 쇼핑API와 무관 → 지금 병렬 가능.**

## 6. 다음 작업 순서

```
[Code 3-A] 경쟁분석 검색광고 대체 → dry-run 후보 생성 확인   ← 최우선, 지금 가능
   └─▶ [정리] 전체 커밋 push (f88f5cf+72e20a4+f655ef9+대응설계)
          └─▶ [운영자] dry-run 결과 검토 → 승인 → SOURCING_RECOMMEND_LIVE=true
[Cowork P2] 시즌 키워드 46개 교체 — 병렬 가능, 지금
[Code 3-B] 공통 provider — 3-A 후
```

## 7. 절대 금지 (매 세션 확인)
- 네이버 PUT/POST → 운영자 "GO" 없이 금지
- 디스코드 실발송 → 승인 없이 금지. `SOURCING_RECOMMEND_LIVE` 미설정=안전
- 자동 발행 → 영구 금지(#307)
- 테스트 데이터 방치 → 같은 세션 원복
- **외부 API 실패는 설정 의심 전에 공급자 공지 실측(#324). 미실측 단정 금지(#310)**
- productCount 등 못 얻는 값을 가짜로 채우지 말 것("never fabricate")
- 부재 증명은 전수 검색(#323), 무음 실패 금지(#270), write set 밖 되돌리기 금지(#322)

## 8. 멀티플랫폼·AI 확장 방향 (운영자, 유지)
현재 네이버 단일, 수익 성장 시 타/해외 플랫폼 가능성. 로직을 플랫폼 종속 하드코딩 금지, 순수함수 분리(judgeExclusion·competition-provider 패턴). `/settings/platforms` 라우트 존재.
