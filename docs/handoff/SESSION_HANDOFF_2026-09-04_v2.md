# SESSION_HANDOFF_2026-09-04_v2 — 새 채팅 시작 시 필독

> v1(카테고리개편+Gemini+F넛지+딥링크+1군)의 후속. 이 대화의 모든 작업이
> 여기 요약됨. 새 세션은 이 문서 + CLAUDE.md 필독목록부터 읽는다.

---

## 1. 이번 세션 완료 사항 (프로덕션 실측 검증됨, origin/main = b3efe2f)

### 카테고리 개편 전상품 재체크(§3) 착수 → UCE-10 신규 결함 발견
- 소싱 라벨("식품(카테고리 미확정)") 오염 조사 중 마스터(4,999건) 자체는
  정상이나 **매처의 기존 결함 3건**을 실측(로그+전수스캔+시뮬레이션)으로 확정
- 문서: `docs/design/UCE10_TIE_BREAK_AND_SOURCING_PARITY_2026-09-04.md`(c2a7d59)

### 1군 5개(B1/B2/B3/B8/B10) main 병합 + 브라우저 검증 완료
- 병합 전 브랜치가 main보다 8커밋 뒤처짐 발견(카테고리마스터 포함) →
  `git merge main`으로 선최신화 → tsc0 → push(`6ed0ee6`) → 배포확인
- B1·B2·B10 완전 브라우저 검증. B8 부분검증(코드확인). B3 코드확인만
  (실사용 데이터 없어 UI검증 보류, 정직 기록)

### 워크트리 위생 정리
- 6개→2개(이미 병합된 3개 안전 제거). 남은 2개: 1군(정리대상)·
  발행게이트 정합성검사(미병합, 유지 필요)

### 신규 원칙 #360
- `resize_window`가 OS창만 바꾸고 실제 뷰포트 미반영 가능 → innerWidth/
  matchMedia로 반영확인 후 재검증하는 표준절차

---

## 2. 🔴 미완 — 새 세션 우선순위 (의존성 순서대로)

| # | 항목 | 상태 | 의존성 |
|---|---|---|---|
| 1 | **결함C 수정**(isLeafItself 동점보너스→형제d4개수기반) | 설계+시뮬레이션 완료, 코드수정 대기 | 없음, 최우선 |
| 2 | **결함B 수정**("~용~" 삽입정규화 haystack 추가) | 설계+시뮬레이션 완료 | C와 병행가능 |
| 3 | test:category-match에 16건 동점쌍+실내방향제류 회귀 고정 | 대기 | C·B 이후 |
| 4 | 캐시버전(#351 CATEGORY_MATCH_LOGIC_VERSION) 증가 | 대기 | C·B와 함께 |
| 5 | **결함A 배선**(소싱-API 검증경로 통일) | 설계 완료 | C·B 이후 |
| 6 | 발행게이트 정합성검사(b077cbe) 리뷰·병합 | 구현완료·미병합 | C·B 반영 후가 안전 |
| 7 | 원래 체크리스트 §3-3~5(naver-settings 잔존·회귀테스트 최종) | 대기 | 6 이후 |
| 8 | B3(꽃 한 송이 담기) 실사용 브라우저 검증 | 코드확인만 | 실 도매매 URL 필요 |

---

## 3. 핵심 인계 메시지 (다음 Code 세션용)

```
Target Session: Claude Code CLI
Branch: main (신규 feature 브랜치로 시작 권장 — 예: fix/uce10-tie-break)

[선행 확정] origin/main=b3efe2f. 1군5개(B1/B2/B3/B8/B10) 병합·검증완료.
 카테고리마스터4,999건 그대로 유지. 워크트리 6→2개 정리완료.

[최우선] docs/design/UCE10_TIE_BREAK_AND_SOURCING_PARITY_2026-09-04.md 정독 후:
 1. 결함C: src/lib/naver/category-deterministic-matcher.ts L228-232
    isLeafItself(+1) 보너스를 형제(d4) 개수 기반 가산으로 교체.
    문서 §C에 시뮬레이션 코드 스니펫 있음(11/11 정답전환 확인된 로직).
 2. 결함B: termMatchScore에 "용" 제거 정규화 haystack 추가(원본과 함께
    시도, 정규화매칭 시 완전일치보다 소폭 감점).
 3. 카탈로그밖 임의 30종 + 문서 §C의 16건 동점충돌쌍 전수 dryRun,
    회귀0 확인 후에만 적용(#352 절차 엄수).
 4. test:category-match에 회귀 테스트로 고정.
 5. CATEGORY_MATCH_LOGIC_VERSION 상수 증가(#351 캐시무효화 필수).
 6. 결함A: sourcing-recommender.ts의 matchDeterministicCategories()
    단독호출을 /api/category/suggest와 동등한 검증경로로 배선(방식은
    Code 판단, 최소 AI교차확인 게이트).

[순서] C→B→검증→테스트고정→캐시버전→A. 이 순서 지켜야 재작업 없음.

[그 다음] 발행게이트 정합성검사(claude/publish-category-guard-48e1ad,
 커밋b077cbe) 리뷰 후 병합 — C·B 반영 후에 하는 게 안전(카테고리 값
 자체가 정확해야 게이트 검증이 의미있음).

[완료조건] COMPLETION_GATE 5게이트 + 문서 §완료조건 체크리스트.
[미해결·별건] B3(담기 네비게이션) 실사용 브라우저 검증 — 실제 도매매
 상품 URL 필요, 다음 Desktop 세션에서 Chrome으로 시도 가능.
```

---

## 4. 절대 잊지 말 것
- 착수 전 DOMAIN_FACTS·CLAUDE.md·PARALLEL_WORK_TRACKER(rev129까지)·
  PRINCIPLES_LEARNED(#360까지) 필독
- 비가역 쓰기(DB apply·발행·디스코드실발송) 운영자 명시 GO 필수
- 카테고리 매처 수정은 반드시 #352(카탈로그밖 임의표본 전수 dryRun)
  통과 후 적용 — "완벽한 자동화"가 아니라 "오분류 0%"가 목표(#353)
- 모바일 UI 검증 시 원칙#360 절차(innerWidth 실측 우선) 적용
