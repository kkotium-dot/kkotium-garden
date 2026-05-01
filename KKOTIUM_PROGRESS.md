# KKOTIUM GARDEN — 프로젝트 진행 현황
> 최종 업데이트: 2026-05-01 (Phase E+ Sprint 6 — E-15 Block D Part 2 단계 2(3개 카드 일괄) + 단계 3(Edge case 4개) 모두 완료 + 이슈 #3 문서화)
> TSC: 0 errors | 배포: https://kkotium-garden.vercel.app | 직전 commit: 41b2811 (docs E-15 Block D Part 2 후반) + (본 마무리 commit으로 갱신)
> **Phase A ✅ | Phase B ✅ | Phase C ✅ | Phase D ✅ 전체 완료 | Phase E 진행 중 (E-7, E-1, E-3, E-8 완료) | Phase E+ Sprint 1·2·3·4·5 완료 + Sprint 6 진행 중 (E-15 Block A+B+C ✅ + Block D Part 1 ✅ + Part 2 단계 1·2(누적 5개 카드)·3 ✅, 잔여 3개 카드 일괄 + 이슈 #1·#2·#3 수정/점검 + E-15 전체 완료 처리 대기)**
> **다음 작업: E-15 Block D Part 2 잔여 (3개 미적용 DRAFT 카드 일괄 + 이슈 #1·#2·#3 + E-15 전체 완료 처리)** — 상세는 `KKOTIUM_ROADMAP.md` "다음 새 채팅 시작 메시지 (E-15 Block D Part 2 잔여용)" 섹션 참조
> **수수료 개편 (2025.06.02): 100% 완료** (Block 1~4 + redeploy + refactor + cleanup, 7 commits)
> 전략 참고문서: `260413-꽃틔움 가든 개선안 검증과 2026년 전략 로드맵` (프로젝트 파일)
> 리서치 참고문서 (2026-04-16 세션):
>   1. `스마트스토어 리뷰 관리와 반품안심케어, 무엇을 먼저 할 것인가`
>   2. `네이버 스마트스토어 파워셀러의 2025-2026 실전 무기 총정리`
>   3. `카카오 비즈니스 채널 2025-2026 완전 가이드`
>   4. `스마트스토어 셀러의 무료 알림톡, 정말 가능한가`
## 이 파일의 역할

> **KKOTIUM_PROGRESS.md** = 현재 상태 + 작업 원칙 + 완료 이력 + 기술 레퍼런스

---

## 2026-05-01 세션 요약 — E-15 Block D Part 2 후반 (단계 2 메인 + 단계 3 Edge case)

### 세션 개요
- 컨텍스트 안전 분할: 옵션 B (3개 카드 자동 채우기 + Edge case 4개 → 인계) 선택
- 작업원칙 23번 적용: 시작 메시지의 가정("3개 카드 52/48/48점")과 실제 DB 상태(이미 적용 2개 + 미적용 6개) 차이 확인 후 정직 보고. 위젯 TOP 5 노출 기준의 3개 카드를 우선 처리하는 방향으로 합의
- TSC 0 errors 유지, 코드 변경 없이 라이브 검증 + 코드 리뷰만 진행

### [단계 2 메인] 3개 카드 일괄 자동 채우기 라이브 검증 ✅

| # | 카드 | 적용 전 | 적용 후 | 증가 | 핵심 |
|---|---|---|---|---|---|
| 1 | 인테리어 미니 가습기 | 52 | **76** | +24 | 태그 12개 + 카테고리 50002542(디지털/가전 > 계절가전 > 가습기 > 가습기필터) 정확 매칭 ✅ |
| 2 | 모나미 펭수 유성매직 둥근닙 24색 세트 | 48 | **84** | +36 | 상품명 재작성("매직"을 앞 15자로 재배치) + 키워드 8개 + 태그 12개 + 카테고리 50007329(여가/생활편의 > 예체능레슨 > 미술) — 정확도는 "주의" 등급, 셀러 검토 권장 |
| 3 | 차량용 햇빛가리개 유리창 가림막 | 48 | **60** | +12 | 상품명 단축 + 키워드 8개. 카테고리는 50003307 → 50003307 동일 추천이라 점수 변동 없음(이슈 #2 참조) |

**적용 합계**: 3개 카드, 총 점수 증가 +72점

**핵심 관찰**:
- AI 카테고리 추천 정확도 그라데이션: 가습기(완벽) > 모나미(수긍 가능) > 차량용(실패) — 합리적 분포
- AI 태그가 "구매자 언어"를 정확히 추출(사무실용 / 탁상용 / 선물용 / 감각적 등)
- PATCH=위젯 점수 일치 ✅ — Part 2 단계 1의 score 일관성 버그 수정이 정상 반영됨

### [단계 3] Edge case 4개 검증 ✅

| Case | 검증 방법 | 결과 | 상세 |
|---|---|---|---|
| **A** AI 답변 모두 검증 실패 | AutoFillModal.tsx line 372–390 명시적 분기 | ✅ PASS | `nameRelated.length===0 && otherSuggestions.length===0 && unfillable.length>0` 코드 존재. "AI 자동 채우기 가능 항목이 없습니다" 노란 바 + manual 카드만 렌더 |
| **B** Manual-only만 남은 카드 | UploadReadinessWidget.tsx line 49–68 + 라이브 무타공 92점 행 검증 | ✅ PASS | `hasAnyAutofillable()` + `ready90` 이중 분기. 92점 카드에서 hasAI=false, hasDirect=false, hasRegister=true 실측 확인 |
| **C** 체크박스 모두 해제 | AutoFillModal.tsx line 244, 547–568 코드 검증 | ✅ PASS | `disabled={totalSelected===0}` HTML 속성 + 회색 배경(#E5E7EB) + cursor not-allowed + 텍스트 "적용할 항목 선택"으로 변경 |
| **D** 네트워크 오류 | line 197–225, 297–320 코드 + INVALID_ID API 호출 라이브 검증 | ✅ PASS | POST/PATCH 둘 다 try-catch → `setPhase('error')` + errorMsg 표시. Esc/배경 클릭/X 버튼으로 종료 가능. 라이브 응답: `{success:false, error:"상품을 찾을 수 없습니다."}` |

### 발견된 미결 이슈 (다음 채팅 인계)

**[이슈 #1] 위젯 stat strip 평균 점수 표시 지연**
- 증상: 3개 카드 적용 후에도 stat strip의 "평균 점수"가 51점으로 고정 표시 (실제 8개 DRAFT 전체 평균은 약 64점이어야 함)
- 원인 추정: UploadReadinessWidget.tsx의 `avgScore` 계산식(line ~830) 자체는 `unregistered.length` 기준으로 정확. 다만 `useMemo` 의존 배열 또는 dashboard handleRefresh → loadProducts → DashboardProduct 재구성 흐름에서 stat strip 재계산이 누락되거나 지연되는 것으로 보임
- 영향: 셀러에게 "평균이 안 움직인다"로 보이는 코스메틱 이슈, 데이터 손실은 없음
- 다음 채팅 점검 항목: (a) handleAutoFillApplied 이후 router.refresh() 또는 명시적 재계산 트리거 추가 검토 (b) DashboardProduct 객체의 변경 후 값을 console.log로 실측해 원인 파악

**[이슈 #2] 카테고리 동일 추천 자동 거부 누락**
- 증상: 차량용 햇빛가리개 케이스에서 AI가 `50003307 → 50003307`(현재값과 동일) 추천. PATCH는 수행되지만 점수 변동 없음 (셀러 입장에서 "적용했는데 카테고리 점수가 안 오른다"로 보임)
- 원인 추정: AI가 적합한 다른 카테고리를 못 찾을 때 가장 일반적인 d1 코드를 반환 → 우연히 기본값과 일치
- 개선 제안 1: POST 단계에서 `suggestion.after === product.naverCategoryCode`이면 suggestions에서 제외 (가장 깔끔)
- 개선 제안 2: PATCH 단계에서 `update.naverCategoryCode === product.naverCategoryCode`이면 rejected에 push + reason="동일 코드 추천"
- 권장: 두 단계 모두 적용 (이중 방어선)

**[이슈 #3] 무타공 두꺼비집가리개(ready90, 92점) 카드에서 AI 채우기 버튼이 일시적으로 재표시되는 정황**
- 증상: 라이브 검증 중 92점 S등급 카드에서 일시적으로 "AI 채우기" 버튼이 보이는 순간이 포착됨. 평소에는 hasAnyAutofillable=false + ready90=true 조건으로 정상 숨김 처리되지만, 특정 타이밍에서 재표시됨
- 원인 추정 (3가지 시나리오):
  - (a) handleAutoFillApplied 직후 위젯 재로드 사이의 race condition — newScore 92 적용은 됐지만 loadProducts가 fresh 데이터로 갱신되기 전에 stale 점수로 잠깐 렌더
  - (b) `hasAnyAutofillable()`이 product.failedItems 같은 동적 데이터에 의존 → 스냅샷 타이밍 문제
  - (c) optimistic update와 server-side recalc 사이 reconciliation 깜빡임
- 영향: 코스메틱 (셀러가 클릭해도 모달이 "자동 채우기 가능 항목 없음" 안내로 안전하게 종료) — 데이터 손실 없음
- 다음 채팅 점검 항목:
  - UploadReadinessWidget.tsx의 ProductRow rendering condition 재검토 — `hasAnyAutofillable && !ready90` 조건의 평가 시점 확인
  - handleAutoFillApplied → handleRefresh → loadProducts 흐름에서 위젯 재렌더 전에 stale prop 사용하는지 console.log
  - 필요 시 ProductRow에 `useMemo` 의존 배열에 product.id + product.score + product.completedItems 추가해 재계산 강제

### 작업원칙 23·24 세션 내 실제 적용 기록
- (a) 세션 시작 시 `git rev-parse HEAD origin/main = afe9d88` 동일 확인 ✅
- (b) `git --no-pager log -10`에서 Part 1 후속 commit 확인 ✅
- (c) `git status` 깨끗함 확인 ✅
- (d) 시작 메시지 가정과 실제 DB 차이 정직 보고 → 옵션 선택 받고 진행 ✅
- (e) 이전 채팅이 PROGRESS.md 수정 후 push 못 한 채 끊겼던 사례 발견 → git checkout으로 원복 후 깨끗한 버전으로 재작성 + 한 묶음 commit + push (작업원칙 24번 준수)

### 다음 채팅에서 진행할 작업 (상세는 KKOTIUM_ROADMAP.md 참조)
1. **잔여 3개 카드 일괄 자동 채우기**: 하트 리본 누빔 파자마(38점 추정) / 초강력 스텐 변기펌프(38점) / 리본 포인트 홈웨어 잠옷세트(38점)
2. **위젯 stat strip 평균 점수 이슈 조사 및 수정** (이슈 #1)
3. **카테고리 동일 자동 추천 거부 로직 추가** (이슈 #2)
4. **ready90 카드 AI 버튼 재표시 점검** (이슈 #3, 선택적 — 코스메틱)
5. **E-15 전체 완료 처리** + 다음 작업 후보 평가 (E-1 빌더 AEO 강화 vs E-12 Discord 리뷰 알림)

---

## 2026-05-01 세션 요약 — E-15 Block D Part 2 (단계 1 + 단계 2 부분 검증)

### 환경변수 정리 (세션 초반, 일회성 조정)
- vercel CLI 설치 + login → production env 검증
- `vercel link --yes` 명령이 development env로 .env.local 덮어쓴 사고 발생 → production env 기준으로 즉시 재구성 (안전 복구)
- .env.local을 스크린샷 스타일로 재디자인 (10개 섹션 한글 주석)
- GROQ_API_KEY_2/_3에 Development 환경 추가 (꽃졔님 Vercel UI에서 수동 실행)
- 결과: GROQ 3개 키 모두 Production+Preview+Development에 단일 entry로 통합 ✅ "Needs Attention" 9개 모두 해소

### [단계 1 완료] score 일관성 버그 수정

**진짜 원인** (Part 1에서 "PATCH의 shipping_template 잘못 계산 가능성"으로 잠정 진단했으나 실제로는 반대):
- `DashboardProduct` 타입과 `loadProducts` 매핑에 `shippingTemplateId`/`images` 필드가 애초에 정의/매핑되지 않음
- 위젯의 `calcUploadReadiness({ shippingTemplateId: (p as any).shippingTemplateId ?? ... })`가 항상 `undefined` 결과로 shippingPassed=false (-10점)
- 반면 PATCH 핸들러는 prisma.product.update의 select에서 shipping_template_id를 정확히 가져와서 정상 점수 반영
- → PATCH 적용 당시에는 "newScore=92"로 정답이지만, 위젯 reload가 -10점 잘못 계산해서 82점만 표시되는 현상
- 차이 = shipping_template weight 10점 (Part 1 관찰결과와 일치)

**수정 파일** (1곳만):
- `src/app/dashboard/page.tsx` `DashboardProduct` interface에 `shippingTemplateId`/`images`/`shippingFee` 3개 필드 추가
- `loadProducts` 내 매핑에 동일한 3개 필드 이제 포함
- PATCH 핸들러 수정 불필요 (이미 정확했음)

### [단계 2 부분 검증] 1개 카드 라이브 일관성 재검증

수정 적용 후 대시보드 재로드 → 이전 Part 1에서 60→82점으로 갱신되었던 카드(무타공 두꺼비집가리개)가 **92점 (S등급)**으로 정상 표시 ✅. PATCH 응답의 newScore=92와 완벽 일치.

동시에 "선물받은 특별한 일상" 카드(62점)에서 AI 채우기 모달 호출 → SEO 태그 12개 + 카테고리 매핑 제안 확인 → "2개 적용" 클릭 → done phase → 모달 자동 닫힘 → 위젯 재로드 → **86점 (A등급)** 갱신 직접 확인. PATCH newScore = 위젯 reload 점수 일치 ✅.

평균 점수: 42 → 55 → **58** (두 카드 적용 이후)

### 다음 채팅에서 진행할 작업 (상세는 KKOTIUM_ROADMAP.md 시작 메시지 참조)
- 단계 2 나머지: 3개 DRAFT 카드 (52, 48, 48점)에서 자동 채우기 일괄 검증 → 평균 점수 최종 측정 (목표: 70+점)
- 단계 3: Edge case 4개 검증
- E-15 전체 완료 처리 + 다음 작업 후보 평가
> 새 채팅 시작 시 **가장 먼저 읽는 파일**
>
> **새 채팅 시작 순서:**
> 0. **git log -5로 직전 작업 잔재 확인** — Sprint 3·4에서 이미 완료된 작업을 다시 시작할 뻔했던 패턴 대비 (컨텍스트 한계로 이전 채팅이 끝난 경우)
> 1. `KKOTIUM_PROGRESS.md` 전체 읽기
> 2. `KKOTIUM_ROADMAP.md` 전체 읽기 (특히 "다음 채팅에서 시작할 작업" 섹션)
> 3. 해당 TASK 관련 코드 파일 read_file
> 4. 꽃졔님 승인 후 작업 시작
> 5. **작업 중 Block/단계별로 commit해서 progressive 저장** (컨텍스트 손실 방지)
> 6. 완료 후 두 파일 모두 업데이트 + git push
> 7. 임시 파일은 `.commit-msg-*.txt` 패턴으로 .gitignore 처리됨 (2026-04-29 적용)

---

## 현재 앱 상태 (2026-04-30)

| 항목 | 현황 |
|------|------|
| 전체 상품 | 8개 (모두 DRAFT — 평균 등록 준비도 42점, E-15 1순위 근거) |
| 네이버 Commerce API | ok=true ✅ |
| 네이버 검색광고 API | ✅ 키워드 검색량 실시간 |
| 네이버 DataLab API | ✅ ID: F7Hga62gDOYxZ3KRtLTL |
| Discord | 5채널 ✅ |
| TSC | 0 errors ✅ |
| Vercel 배포 | ✅ https://kkotium-garden.vercel.app |
| GitHub | https://github.com/kkotium-dot/kkotium-garden |
| Phase A~D | 전체 완료 ✅ |
| Phase E | 진행 중 (E-7, E-1, E-3, E-8 완료) |
| Phase E+ | Sprint 1·2·3·4·5 완료 (E-4, E-2C, E-2A, E-2B, E-13A, E-13C, E-14, E-10, E-11, 수수료 개편 7 commits) |
| .env 파일 (2026-04-30 정리) | `.env`, `.env.example`, `.env.local` 3개만 유지, .env.backup + FIX-11-check-env.sh 제거 |
| 카카오 비즈니스 채널 | 꽃틔움 KKOTIUM (Public ID: `_xkfALG`) ✅ |

---

## 카카오 비즈니스 채널 정보 (2026-04-16 확인)

```
채널명: 꽃틔움 KKOTIUM
검색용 ID: 꽃틔움
채널 Public ID: _xkfALG
채널 URL: http://pf.kakao.com/_xkfALG
채팅 URL: http://pf.kakao.com/_xkfALG/chat
카테고리: 쇼핑 > 생활용품
상태: 공개, 검색 허용
매장관리/톡스토어/톡체크아웃: 미연결
```

---

## AI API 키 현황 (2026-04-30 기준)

| 서비스 | 환경변수명 | 상태 | 비고 |
|--------|-----------|------|------|
| **Groq** | **GROQ_API_KEY** | **정상 작동 ✅** | **1순위, 무료 14,400회/일** |
| **Groq** | **GROQ_API_KEY_2** | **정상 작동 ✅** | **round-robin, 합계 28,800회/일** |
| **Groq** | **GROQ_API_KEY_3** | **정상 작동 ✅** | **3키 총 합 43,200회/일** |
| Gemini | GEMINI_API_KEY | 429 quota 초과 | **운영 실질 기여 0** — fallback 순위 하위 |
| Gemini | GEMINI_API_KEY_2 | 429 quota 초과 | **운영 실질 기여 0** — 차선 키 확보 시 정리 예정 |
| Gemini | GEMINI_API_KEY_3 | 429 quota 초과 | **운영 실질 기여 0** — 키 유효하지만 무료 quota 소진 |
| xAI Grok | XAI_API_KEY | 크레딧 미배정 | console.x.ai 크레딧 구매 완료 시 GROQ 다음 fallback 우선 차선 후보 |
| Perplexity | PERPLEXITY_API_KEY | Pro 만료 (401) | 비활성 |

**AI fallback 순서 (코드 실제)**: Groq round-robin (3키 + 401/403/JSON parse safety fallback) → Gemini round-robin (3키) → Anthropic last-resort

**운영 정책 (2026-04-30 확정)**:
- GROQ 단독 capacity 28,800~43,200회/일는 1인 셀러 일 사용량 대비 무한대 충분 — fallback이 Gemini까지 갈 일 없음
- **Gemini 3개 키는 실질 운영 기여 0** — 향후 차선 API(Grok 크레딧 구매 또는 새 무료 키) 확보 시 Gemini 정리 예정
- Vercel "Needs Attention" 표시의 GEMINI 경고는 운영 영향 없음 (fallback으로 갈 일 없음)
- xAI Grok 크레딧 구매 완료 시 XAI_API_KEY를 GROQ 다음 fallback으로 우선순위 재배치 권장

---

## Phase E+ 전략 리서치 요약 (2026-04-16 세션)

### 핵심 발견사항 (4개 리포트 종합)

**리뷰 관리:**
- 네이버 커머스 API에 리뷰 관련 API 없음 (GitHub Discussion #1582 공식 확인)
- 리뷰 0→10→50 단계별 성장 로드맵: 초기 10개는 알림톡 없이 확보 가능
- 리뷰 작성률 목표: 20~25% (구매확정 대비)
- 한달사용 리뷰로 동일 주문에서 리뷰 2건 확보 가능 (2단계 수집 구조)
- 네이버 자체 무료 리뷰 알림: 배송완료 3일 후 구매확정 요청 + 구매확정 시 리뷰 알림 자동 발송

**반품안심케어:**
- 건당 50~650원 투자 → 매출 평균 +13.6% (한양대 연구)
- 카테고리별 효과: 패션잡화 +58.3%, 가구/인테리어 +46.7%, 디지털/가전 +26.2%
- 2025.8.1 수수료 개편: 보상금 상한 7,000→8,000원, 카테고리별 이용료 인상
- N배송 연계 시 반품안심케어 수수료 네이버 지원

**카카오 비즈니스 채널:**
- 2025.12.31 친구톡 종료 → 브랜드 메시지 전환 (단가 2.5~3배 인상)
- 알림톡 건당 8원(카카오 공식) / 13원(솔라피)
- 카나나 상담매니저: 모든 톡채널에서 완전 무료 (2025.9 정식 출시)
- 챗봇 빌더: 일반 기능 무료, Event API만 건당 15원
- 쉬운광고: 일일 100원부터, 신규 6만원 무료 쿠폰
- 카카오 프로젝트 단골: 연 매출 10억 이하 소상공인 → 비즈월렛 30만원 지원

**알림톡 비용 결론:**
- 완전 무료 지속 발송 불가능: 모든 서비스가 건당 과금
- 솔라피 무료 플랜 = 플랫폼 0원 + 건당 13원 + 가입 시 300포인트(약 23건분)
- m8 무료 플랜 없음 (최저 월 4,800원)
- 네이버 내장 무료 기능으로 초기 리뷰 10개 확보 충분
- 알림톡 도입 시점: 월 주문 50건 이상

**파워셀러 전술:**
- 톡톡 자동응답 12시간 기준 강화 (2025.4)
- AiTEMS 추천 ON → 횟수 제한 없이 개인화 노출, 전체 클릭 약 10%
- 2026.2 쇼핑 AI 에이전트: 리뷰를 실시간 분석하여 상품 추천
- 수수료 개편: 유입수수료 2% 폐지 → 판매수수료 2.73%, 자체 마케팅 유입 시 0.91%

### E-13B 2단계 접근 전략 (확정)
```
1단계(지금 개발): UI만 구현
  - settings/kakao/page.tsx에 솔라피 API Key/Secret/PFID 입력 필드
  - 키 미입력 시 "솔라피 연동 후 사용 가능" 안내 표시
  - 주문 관리 페이지 알림톡 버튼도 UI만 배치
  - 실제 API 호출 코드는 키가 있을 때만 활성화

2단계(매출 성장 후 활성화): 솔라피 가입 → 키 입력 → 즉시 작동
  - 코드 추가 개발 없이 키만 넣으면 3단계 자동발송 가동
  - 월 주문 50건+ 시점에 검토
```

---

## 0. 절대 작업 원칙 (확약)

### 코드 작성 규칙
```
1. JSX 이모지 완전 금지 → Lucide React SVG 아이콘만 사용
2. 주석 영어만 작성, 한글 리터럴 타입 금지 ('조합형' 등)
3. new PrismaClient() 금지 → src/lib/prisma.ts 싱글톤만
4. 카테고리 → NAVER_CATEGORIES_FULL 로컬 상수만 (API 호출 금지)
5. 수정 후 반드시 npx tsc --noEmit → 0 errors 확인
6. 600줄+ TSX → write_file 전체 교체 (edit_file은 소규모만)
7. Python 패치: write_file → execute → rm (heredoc 절대 금지)
8. prisma migrate dev 금지 → db execute 또는 Supabase SQL Editor
9. framer-motion 사용 금지 (미설치) → CSS animations
10. bcrypt 사용 금지 → bcryptjs (Vercel Linux 호환)
11. API route에 반드시 export const dynamic = 'force-dynamic' 추가
12. useSearchParams() 사용 페이지 → 반드시 Suspense로 감싸기
13. Next.js route 파일: GET/POST/PUT/DELETE/dynamic 외 export 금지
14. PROGRESS.md + ROADMAP.md 항상 함께 업데이트
15. 카카오 채널 정보 하드코딩 금지 → store_settings에서 읽기
16. \uXXXX 유니코드 이스케이프 JSX에서 사용 금지 → 한글 리터럴 직접 사용 (렌더링 깨짐 방지)
17. **git commit 여러 줄 메시지 금지** → file로 쓰고 `-F` 옵션 사용 또는 한 줄로 압축 (shell dquote 모드 걸림 회피)
18. **Python `-c` 안 multi-line string 금지** → filesystem:edit_file 또는 file write 사용
19. **AI 자동 채우기 결과는 DB 직접 적용 절대 금지** → POST(미리보기)와 PATCH(셀러 승인 적용) 2단계 분리 (E-15 이후 표준). AI 생성 결과는 셀러 체크박스 승인 없이 절대 DB 변경 금지
20. **AI 추천 카테고리는 NAVER_CATEGORIES_FULL 로컬 검색만** → AI가 새 카테고리명 생성하면 무시, 4,993건 매칭에서만 선택
21. **새 채팅 시작 시 git HEAD ≠ origin/main 일 수 있음** — 직전 채팅이 컨텍스트 한계로 끝나는 순간 commit은 될 수 있지만 push는 못 하는 경우가 있음. **반드시 `git rev-parse HEAD origin/main`으로 교차 확인** + `git status`의 "ahead of origin/main by N commits" 메시지 체크. 단순 `git log -5` 결과만으로 잔재 없음을 판단하면 이미 만들어진 차이 있는 코드를 그대로 덮어쓰게 됨 (E-15 Block A+B 세션에서 실제 발생)
22. **AI 자동 채우기 라이브러리의 검증은 PATCH 검증과 일치시키기** — 라이브러리가 제안한 값이 PATCH에서 다시 거부되면 셀러 경험 나빨. 예: tags_count에 PATCH가 10개 이상 요구하면 라이브러리도 merged 10개 미만 시 null 반환
23. **새 채팅 메시지의 "현재 HEAD/commits 가정"을 의심하라** — user 메시지에 "HEAD = X, N commits 상태" 같은 가정이 적혀 있어도 그 정보는 직전 세션 작성 시점 기준이라 현재 origin/main 과 다를 수 있음. 새 채팅 시작 즉시 **(a) `git rev-parse HEAD origin/main`로 실제 HEAD 확인 → (b) `git --no-pager log --oneline -10`로 user 메시지에 명시되지 않은 commit이 있는지 확인 → (c) user 가정과 실제가 다르면 즉시 정직 보고하고 작업을 다시 분석한 후 진행**. (E-15 두 채팅 연속 발생: Block A+B 세션에서 첫 번째, Block C 시작 채팅에서도 두 번째 발생. 두 번째 채팅에서는 user가 "HEAD = 0694982, 10 commits"로 적었으나 실제는 b6e6da3 + Block A+B+C 완료된 16 commits 상태였음. 다행히 write_file이 중간에 끊어져 손실 없이 멈춤)
24. **Block 단위 작업 진행 시 매 commit + push를 한 묶음으로 끝내기** — 컨텍스트 한계 직전에 user에게 마무리 보고를 받아 새 채팅으로 인계되더라도, 마지막 commit이 push까지 완료되지 않으면 다음 채팅의 git log에서 보이지 않아 작업원칙 21·23 트랩에 빠짐. 따라서 **commit한 그 turn 안에서 반드시 push까지 한 줄 명령으로 끝낸다**: `git add ... && git commit -m "..." && git push origin main`. 절대 commit 후 "다음 turn에 push"로 미루지 않음
```

### UI 작성 원칙 (2026-04-13 확정)
```
- 이모지 금지: Lucide React SVG 아이콘으로 100% 교체
- 전문 용어: 한글 설명 + (영문) 병기
  예) 상품코드 (SKU), SEO 검색최적화, 투자수익률 (ROI)
- 기능 버튼: 순한글
  예) 한 번에 임시등록, 건너뜀, 전체 저장
- 상태 라벨 통일:
  DRAFT = 임시저장 (초안 금지)
  ACTIVE (naverProductId 있음) = 네이버 판매중
  ACTIVE (naverProductId 없음) = 네이버 등록 대기
  OUT_OF_STOCK = 품절
  INACTIVE/HIDDEN = 재활성화 필요
```

### 세션 관리
```
- iterm-mcp list_all_sessions → 세션 확인 후 사용
- Chrome MCP: tabs_context_mcp → navigate
- heredoc 절대 금지 (터미널 행 유발)
- dev 서버 재시작 필요 시 꽃졔님에게 요청
- 브라우저 테스트 필수: API 레벨 성공 ≠ 브라우저 완료
```

### 보고 원칙
```
- 직접 실행 불가 시 거짓말 금지, 즉시 상황 설명
- Filesystem:edit_file 실패 후엔 Python 패치로 대체
- API 테스트 성공 후 반드시 브라우저 테스트로 재확인
- Vercel 환경변수 변경 후 반드시 재배포 트리거 필요
  (git commit --allow-empty -m "chore: redeploy ..." && git push)
- "진행해줘요" = end-to-end 완료 후 통합 브리핑 (중간 보고 없이)
```

---

## 1. 환경 정보

```
앱 루트:    /Users/jyekkot/Desktop/kkotium-garden
Dev 서버:   http://localhost:3000
Dev 로그:   /tmp/dev.log
프로덕션:   https://kkotium-garden.vercel.app
DB:         Supabase PostgreSQL (doxfizicftgtqktmtftf)
스토어:     꽃틔움 KKOTIUM (smartstore.naver.com/kkotium)
GitHub:     https://github.com/kkotium-dot/kkotium-garden
Vercel:     vercel.com/kkotjyes-projects/kkotium-garden
카카오채널: 꽃틔움 KKOTIUM (pf.kakao.com/_xkfALG)
```

---

## 2. 앱 파이프라인

```
꿀통 사냥터 (크롤링) → 소싱 보관함 (SOURCED→PENDING→REGISTERED)
→ 씨앗 심기 (등록/편집) → 정원 창고 (목록/인라인 편집)
→ 검색 조련사 (SEO 점수 + AI 최적화 + 인라인 편집)
→ 엑셀 다운로드 → 네이버 스마트스토어 일괄등록
→ 대시보드 (실적/꼬띠추천/이벤트)
→ 주문 관리 (발주확인/송장등록)
→ 좀비 부활소 (재등록)
```

---

## 3. 메뉴 구조

```
GARDEN: 정원 일지 (/dashboard) ✅
HUNT:   꿀통 사냥터 (/crawl) ✅
PLANT:  씨앗 심기 (/products/new) ✅
TEND:   정원 창고 (/products) ✅
        검색 조련사 (/naver-seo) ✅ v3 인라인 편집
        좀비 부활소 ✅
ORDERS: 주문 관리 (/orders) ✅
TOOLS:  거래처 ✅ | 배송 레시피 ✅ | 네이버 기본값 ✅
        카카오 채널 설정 (/settings/kakao) → E-13A에서 신규 추가 예정
        인서트 카드 (/tools/insert-card) → E-13C에서 신규 추가 예정
```

---

## 4. 완료 이력

### 2026-04-27 Phase E+ Sprint 2 완료 세션

| 작업 | 내용 |
|------|------|
| **E-2A** | 리뷰 성장 트래커 + 운영 체크리스트: `/api/review-growth` GET/PATCH (manualReviewCount, reviewChecklist), `ReviewGrowthWidget` 대시보드 위젯, 9항목 체크리스트 (자동감지: returnCare, kakaoQrExposure), 단계 판정 (1: 0~10, 2: 11~50, 3: 51+), 작성률 목표 20~25%, 카카오 채널 칩 (single source of truth from store_settings) |
| **E-2B** | 주문 페이지 리뷰 유도 뱃지: DELIVERED+1~3일 (구매확정 유도/초록), COMPLETED+1~3일 (리뷰 요청/파랑), COMPLETED+28~32일 (한달 리뷰/보라), 알림톡 토스트 UI (E-13B 솔라피 연동 대기) |
| **DB 보정** | StoreSettings 스키마 `kakaoChannelUrl` 필드 추가, `kakaoChannelName` 디폴트 오타 (`꽃틄움` → `꽃틔움`) 수정 |
| **일괄 커밋** | `e09e63c` — 6 files changed, +602/-7 |

### 2026-04-16 Phase E+ Sprint 1 완료 세션

| 작업 | 내용 |
|------|------|
| **E-4** | 반품안심케어 마진 시뮬레이터: `return-care-fees.ts` 16개 카테고리별 수수료(2025.08.01), DB `return_care_enabled` 필드, 씨앗심기 Tab4 토글+수수료/효과 배지, 마진계산기 건당비용 반영, 꽀통지수 +15점 |
| **E-2C** | 리뷰 적립금 최적 설정 가이드: 혜택탭 적립금 권장값 안내(텍스트 500~1,000/포토 1,000~2,000/베스트 3,000~5,000), 최적 설정 시 초록 변경, 마진계산기 건당비용, 꽀통지수 +10점 |

### 2026-04-15~16 Phase E + Phase E+ 계획 수립 세션

| 작업 | 커밋 | 내용 |
|------|------|------|
| E-7 꼬띠 소싱 추천봇 | ca993ee | DataLab→키워드검색량→경쟁분석→BlueOcean→Groq AI→Discord+위젯 |
| E-1 상세페이지 빌더 | c920ab5 | 6종 블록 HTML 에디터 + 미리보기 + AEO import + 씨앗심기 통합 |
| E-3 수명 주기 대시보드 | a530ffb | 5단계 라이프사이클 + 좀비 리스크 + 판매속도 + 개선제안 |
| E-8 도매 자동 매칭 | 7f71937 | 도매꾹 OpenAPI 최소수량1 필터 + 도매매 검색 + 마진계산 |
| 한글화 | 93bd517, 52cd5a1 | E-7/E-1/E-3/E-8 위젯·빌더 영문→한글 전환 |
| Phase E+ 리서치 | - | 4개 리포트 작성 + 종합 개선안 확정 (코드 아닌 전략 수립) |

### 2026-04-14 Phase D 완료 세션

| 작업 | 커밋 | 내용 |
|------|------|------|
| C-9 굿서비스 점수 | d91e2cc | 3축 게이지 + 등급 시뮬레이터 + 개선팁 |
| C-2+C-12 AEO+트렌드 | cdf3157 | Groq Q&A 생성 + 경쟁 뱃지 + 시장 분석 |
| C-11 씨앗심기 2-Panel | - | 좌측 6탭 + 우측 38% sticky 고정패널 |
| D-1 상품명 품질 체크 | c8c05ba | 13개 검증룰, S~D 등급 |
| D-3 경쟁 모니터링 | f02ae2e | 스냅샷/변화감지/Discord 알림 |
| D-4 DataLab API | 5a3d0fe, f40c765 | 스파크라인 차트+기간 선택기 |
| D-2 대시보드 레이아웃 | 17480d0 | 2열 그리드 + 빠른 작업 바로가기 |
| D-5 탭 UX 개선 | 252337b | 6개 탭별 완성도 뱃지 |

### 2026-04-13 UI 원칙 + 검색조련사 v3 세션

| 작업 | 커밋 | 내용 |
|------|------|------|
| 이모지 전면 제거 | afc3144 | 전체 src/ JSX → Lucide React SVG |
| Groq AI fallback | 8a16fe3 | llama-3.1-8b-instant, 무료 14,400회/일 |
| 검색 조련사 v3 | df5874d | SEO 전체 필드 인라인 편집 + AI 버튼 3개 |
| C-1 커머스 API 등록 | 36d5d5f | product-builder.ts + register API + 모달 |
| C-12 시장 분석 | dd0758f~2a65bc2 | 네이버 쇼핑검색+Groq 실시간 분석 |

### Phase A~B (이전 세션)
| Task | 내용 | 완료일 |
|------|------|--------|
| A-1~A-12 | 엑셀 검증, SEO, DataLab, 배포 | 2026-04-10 |
| B-1~B-5 | 주문관리, 발주확인, 동기화, 품절처리, 주간보고 | 2026-04-12 |
| C-5 | 꼬띠 추천 v2 (TOP5+소싱보관함+검색량) | 2026-04-12 |

---

## 5. 핵심 파일 경로

| 역할 | 경로 |
|------|------|
| Prisma 싱글톤 | `src/lib/prisma.ts` |
| Naver API (bcryptjs) | `src/lib/naver/api-client.ts` |
| 카테고리 (4,993개) | `src/lib/naver/naver-categories-full.ts` |
| 카테고리 속성 | `src/lib/category-attributes.ts` |
| 꿀통지수 | `src/lib/honey-score.ts` |
| SEO 점수 | `src/lib/seo-calculator.ts` |
| 상품명 품질체커 | `src/lib/product-name-checker.ts` |
| 경쟁 모니터 | `src/lib/competition-monitor.ts` |
| 굿서비스 점수 | `src/lib/good-service.ts` |
| 소싱 추천 엔진 | `src/lib/sourcing-recommender.ts` |
| 트렌드 분석 | `src/lib/trend-analyzer.ts` |
| 업로드 준비도 | `src/lib/upload-readiness.ts` |
| Discord | `src/lib/discord.ts` |
| 마진 계산기 | `src/components/products/MarginCalculator.tsx` |
| 상세페이지 빌더 | `src/components/products/DetailPageBuilder.tsx` |
| 소싱 추천 위젯 | `src/components/dashboard/SourcingRecommendWidget.tsx` |
| 경쟁 모니터 위젯 | `src/components/dashboard/CompetitionMonitorWidget.tsx` |
| 굿서비스 위젯 | `src/components/dashboard/GoodServiceWidget.tsx` |
| DataLab 트렌드 위젯 | `src/components/dashboard/DataLabTrendWidget.tsx` |
| 리뷰 성장 트래커 위젯 (E-2A) | `src/components/dashboard/ReviewGrowthWidget.tsx` |
| 등록 준비 명령탑 위젯 (E-14) | `src/components/dashboard/UploadReadinessWidget.tsx` |
| 리뷰 성장 API (E-2A) | `src/app/api/review-growth/route.ts` |
| 반품안심케어 수수료 (E-4) | `src/lib/return-care-fees.ts` |
| **리뷰 감정분석 라이브러리 (E-11)** | **`src/lib/review-sentiment-analyzer.ts`** |
| **리뷰 감정분석 API (E-11)** | **`src/app/api/review-analysis/route.ts`** |
| **등록 준비 AI 자동 채우기 라이브러리 (E-15)** | **`src/lib/upload-readiness-filler.ts`** |
| **등록 준비 AI 자동 채우기 API (E-15)** | **`src/app/api/upload-readiness/auto-fill/route.ts`** |
| **등록 준비 AI 자동 채우기 모달 UI (E-15 Block C)** | **`src/components/dashboard/AutoFillModal.tsx`** |
| SEO 테이블 v3 | `src/components/naver-seo/NaverSeoProductTable.tsx` |
| 씨앗 심기 | `src/app/products/new/page.tsx` |
| 정원 창고 | `src/app/products/page.tsx` |
| 검색 조련사 | `src/app/naver-seo/page.tsx` |
| 주문 관리 | `src/app/orders/page.tsx` |
| 대시보드 | `src/app/dashboard/page.tsx` |
| cron daily | `src/app/api/cron/daily/route.ts` |
| cron weekly | `src/app/api/cron/weekly/route.ts` |
| Sidebar | `src/components/layout/Sidebar.tsx` |

---

## 6. 네이버 API 현황

| API | 상태 |
|-----|------|
| 토큰 발급 (bcryptjs) | ✅ |
| 채널 정보 | ✅ 꽃틔움 KKOTIUM |
| 주문 조회 | ✅ |
| 발주 확인 | ✅ |
| 송장 등록 | ✅ |
| 상품 실시간 동기화 | ✅ |
| 주소록 조회 | ✅ |
| DataLab 트렌드 | ✅ |
| 키워드 검색량 | ✅ |
| 리뷰 API | ❌ 미지원 (GitHub #1582 확인) |

---

## 7. Vercel 환경변수 (현재 등록 목록)

```
DB: DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
Naver: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, NAVER_PROXY_URL
Naver SearchAd: NAVER_SEARCHAD_API_KEY, NAVER_SEARCHAD_SECRET_KEY, NAVER_SEARCHAD_CUSTOMER_ID
Naver DataLab: NAVER_DATALAB_CLIENT_ID, NAVER_DATALAB_CLIENT_SECRET
Discord: DISCORD_WEBHOOK_ORDERS, DISCORD_WEBHOOK_STOCK, DISCORD_WEBHOOK_DAILY,
         DISCORD_WEBHOOK_WEEKLY, DISCORD_WEBHOOK_KKOTTI
AI: GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3, GROQ_API_KEY, GROQ_API_KEY_2, PERPLEXITY_API_KEY
Cloudinary: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
Etc: CRON_SECRET, NEXT_PUBLIC_APP_URL
향후 추가 예정 (E-13B 활성화 시): SOLAPI_API_KEY, SOLAPI_API_SECRET, KAKAO_PF_ID, SENDER_PHONE_NUMBER
향후 추가 예정 (E-12 구현 시): DISCORD_WEBHOOK_REVIEW
```

---

## 8. 알려진 이슈 및 주의사항

| 이슈 | 원인 | 대응 |
|------|------|------|
| prisma migrate dev 실패 | shadow DB 없음 | Supabase SQL Editor 사용 |
| framer-motion 미설치 | 설치 안 함 | CSS animations로 대체 |
| bcrypt 금지 | Vercel Linux 호환 안 됨 | bcryptjs 사용 |
| Gemini quota 소진 | 하루 1,500회/계정 | Groq fallback 자동 작동 |
| NAVER_CLIENT_SECRET $ 이스케이프 | dotenv-expand | 로컬 .env: `\$2a\$04\$...`, Vercel: `$` 그대로 |
| Vercel 환경변수 변경 후 미반영 | 자동 재배포 안 됨 | `git commit --allow-empty && push` 필요 |
| detail_image_url 8개 null | 직접 입력 안 함 | 씨앗 심기 편집 모드에서 직접 입력 |
| 네이버 리뷰 API 미지원 | 커머스 API 범위 밖 | 수동 입력 + 크롤링만 가능 |
| 알림톡 완전 무료 불가 | 카카오 딜러사 건당 과금 | 솔라피 건당 13원, 가입 시 300포인트(23건분) |
| **AI 자동 채우기 90점 도달 한계** | 11개 중 4개는 AI 영역 외 (이미지 2개/배송/마진) | 자동 채우기는 max 72점 + 셀러 수동 28점 = 100점. 이미지 2장 추가 + 배송 매핑까지 마치면 90+ |
| **새 채팅에서 HEAD ≠ origin/main 자각 실패** | 직전 채팅이 commit 했으나 push 안 한 상태로 끝난 경우 working tree clean이지만 HEAD가 origin보다 앞서있음 | 새 채팅 시작 체크리스트에 `git rev-parse HEAD origin/main` + `git status` ahead메시지 교차 확인. (E-15 Block A+B 세션에서 실제 발생: 우리가 처음 git log에서 origin/main 표시만 보고 "잔재 없음" 판단→ write_file로 좋은 직전 코드 덮엄. 다행히 git restore로 복구) |
| **user 메시지의 작업 가정과 실제 git 상태 불일치** | 직전 채팅이 컨텍스트 한계 직전에 더 진행됐지만 user 메시지는 자신의 메시지 작성 시점의 가정만 명시 | user 메시지에 "HEAD = X, N commits 상태" 같은 명시적 가정이 있어도 의심하고 실제 git 상태를 교차 확인. (E-15 Block C 시작 채팅에서 실제 발생: user는 "HEAD = 0694982, 10 commits"로 적었으나 실제는 b6e6da3 + Block A+B+C 완료된 16 commits 상태. 작업원칙 23번으로 명문화) |
| **터미널 multi-line commit 트랩** | `git commit -m "line1\nline2"` 시 shell의 dquote 모드에 갇혀 대기 상태 | 여러 줄 message도 file로 쓰고 `git commit -F .commit-msg.txt` 사용, 여러 줄 이상은 한 줄 message로 압축 |
| **Python `-c` 안 multiline string 트랩** | `python3 -c "open('f').write('''multi\nline''')"` 도 shell parser에서 dquote 멈춤 유발 | Python script를 직접 쓰기(`heredoc 금지`) 대신 filesystem:edit_file/write_file 이용

---

## 9. 2026 네이버 쇼핑 SEO + 리뷰 전략 인사이트 (04-14~16 리서치)

### 핵심 변화
```
1. 키워드 매칭 → 검색 의도 일치로 전환
   - 상품명 25~35자 최적, 속성+태그 상세 입력 → 상품명 외 키워드 노출
2. AI 추천이 검색 트래픽 20%+ 차지
   - AiTEMS ON 설정 필수 (전체 클릭 약 10%)
   - 2026.2 쇼핑 AI 에이전트: 리뷰 실시간 분석 → 상품 추천
3. 신뢰도(Trust) 지표 급부상
   - 굿서비스 점수 → 검색 랭킹 직접 반영
   - 톡톡 응답 기준 24h→12h 강화
4. 반품안심케어 = 즉시 스위치 (건당 50~650원 → 매출 +13.6%)
5. 리뷰 = 장기 엔진 (0→10 무료로 가능, 50+ 시 알림톡 도입 검토)
6. 수수료 개편: 유입수수료 2% 폐지 → 판매수수료 2.73%, 자체마케팅 0.91%
```

### 등급 체계 개편 (2025/12 시행)
```
- 평가 기간: 3개월 → 1개월
- 빅파워: 4,000만 → 1,000만원/월
- 파워: 800만 → 300만원/월
- 새싹: 200만 → 80만원/월
```

---

## 10. 기술 패턴 레퍼런스

```typescript
// Prisma 싱글톤
import { prisma } from '@/lib/prisma';

// Naver API (bcryptjs! Supabase proxy 경유)
import { naverRequest } from '@/lib/naver/api-client';

// 카테고리 (로컬 상수만, API 호출 금지)
import { NAVER_CATEGORIES_FULL } from '@/lib/naver/naver-categories-full';

// API route 필수 헤더
export const dynamic = 'force-dynamic';

// 로컬 .env.local: NAVER_CLIENT_SECRET=\$2a\$04\$...
// Vercel 환경변수: NAVER_CLIENT_SECRET=$2a$04$... ($ 그대로)

// Groq round-robin
// ai-generate/route.ts: callGemini() → callGroq() → callPerplexity()

// 이모지 금지 예시
// Bad:  <span>🚚</span>
// Good: <Truck size={14} style={{ color: '#e62310' }} />

// 카카오 채널 QR URL (인서트 카드용)
// https://pf.kakao.com/_xkfALG

// 솔라피 알림톡 API (E-13B 활성화 시)
// POST https://api.solapi.com/messages/v4/send
// 인증: HMAC-SHA256 (apiKey, date, salt, signature)
// npm: solapi 패키지 사용 가능
```

---

### 2026-04-29 Phase E+ Sprint 3 완료 세션 (E-13A + E-13C)

**범위**: 카카오 비즈니스 채널 통합의 1차 — 설정 페이지(E-13A) + 인서트 카드 생성기(E-13C). E-13B 알림톡 발송 API는 **2단계 접근 전략**에 따라 매출 50건+ 도달 시 활성화 예정 (현재 솔라피 키 미입력 상태에서 UI 진입만 지원).

| Task | 변경 사항 | 핵심 |
|------|----------|------|
| **DB 스키마** | `prisma/schema.prisma` `store_settings` 테이블에 5개 필드 추가 | `kakao_channel_id`, `kakao_channel_url`, `solapi_api_key`, `solapi_pf_id`, `sender_phone_number` (single source of truth — Sidebar/Insert Card/Order page가 모두 이 한 곳을 참조) |
| **Migration** | Supabase prod DB에 위 5개 컬럼 추가 적용 완료 | 채널 정보 입력 즉시 앱 전체에 즉시 반영되는 구조 확정 |
| **Sidebar** | `src/components/layout/Sidebar.tsx` OPS 그룹 신설 | 카카오 채널(/settings/kakao) + 인서트 카드(/ops/insert-card) 메뉴 항목 추가 |
| **API** | `src/app/api/kakao-settings/route.ts` 신규 GET/PATCH | `store_settings` 5개 필드 read/write, GET 응답 200 검증 완료 |
| **E-13A** | `src/app/settings/kakao/page.tsx` + `src/components/kakao/KakaoChannelQR.tsx` | 카카오 채널 정보(URL/검색ID/PFID) 표시 + QR 미리보기(api.qrserver.com) + 4슬롯 컬러 팔레트 + 솔라피 4입력필드(API Key/Secret/PFID/발신번호 — 현재 비활성, 향후 E-13B 활성화 시 사용) + 7항목 연동 가이드 체크리스트 + 전체 저장 |
| **HSL 헬퍼** | `src/lib/insert-card-colors.ts` `getCardColorScheme(hex)` | 단일 hex 입력으로 9가지 톤 자동 생성 (background/accentLight/accentMid/accentBorder/textOnLight/textOnDark/headerBg/shadow/headerText) — 인서트 카드 컬러 일관성 자동 보장 |
| **E-13C** | `src/app/ops/insert-card/page.tsx` | A6 105×148mm 실시간 미리보기 + 4슬롯 컬러 테마 즉시 반영 + 카카오 QR(store_settings.kakao_channel_id 단일 소스) + 리뷰 적립금 3프리셋(텍스트 500/포토 1000/베스트 3000) + A4 4매 배치/A6 단일 토글 + `window.print()` 기반 PDF 저장 |

**브라우저 라이브 테스트 결과 (둘 다 정상)**:

E-13A `/settings/kakao`:
- 채널 정보(꽃틔움 KKOTIUM, `_xkfALG`, http://pf.kakao.com/_xkfALG) 자동 로드 ✅
- QR 미리보기 정상 렌더 ✅
- 4슬롯 컬러 팔레트 입력/색상 피커 동작 ✅
- 솔라피 4입력 필드 (API Key/Secret/PFID/발신번호) ✅
- 7항목 가이드 체크리스트 ✅
- 전체 저장 → /api/kakao-settings PATCH 200 ✅

E-13C `/ops/insert-card`:
- 좌측 입력 패널 (스토어명/메시지/적립금 프리셋/컬러 테마) ✅
- 우측 A6 실시간 미리보기 ✅
- **컬러 테마 변경 시 9가지 톤 즉시 반영 (Pink → Red 검증 완료)** ✅
- A4 4매/A6 단일 토글 ✅
- 인쇄/PDF 저장 (`window.print()`) ✅

**TSC**: 0 errors

**구조 결정 (이후 세션 참고)**:
- 카카오 채널 정보는 `store_settings` 테이블이 single source of truth — 어떤 화면에서도 새로 입력받지 않고 GET /api/kakao-settings로 조회만 함
- 인서트 카드의 컬러 일관성은 `getCardColorScheme` 헬퍼가 보장 — 페이지 컴포넌트 안에서 색상을 직접 계산하지 않는다
- E-13B(알림톡 발송 API) 활성화 트리거는 **월 주문 50건+ 도달 시점**, 그 전까지는 네이버 내장 리뷰 알림 + 인서트 카드 조합으로 운영


### 2026-04-29 Phase E+ Sprint 4 완료 세션 (E-14 — Upload Readiness Command Center)

**범위**: 11점 키디니스 라이브러리(`src/lib/upload-readiness.ts`)를 대시보드 + 정원창고 + 씨앗심기 워크플로우에 deep-link로 통합한 "등록 준비 명령탑" 시스템. 매출 발생 직전의 마지막 마일(상품 등록 차단점)을 해소하기 위한 작업.

| Task | 변경 사항 | 핵심 |
|------|----------|------|
| **Block A — 위젯 신규** | `src/components/dashboard/UploadReadinessWidget.tsx` (419줄) | DRAFT 상품 11점 키디니스 점수 정렬 TOP 5 + Stat strip(등록가능/작업필요/평균점수) + 부족 항목 칩 deep-link(`?focus={tab}`) + 90+ "바로 등록" CTA(`?registerId=`) + Loading skeleton + Empty state + ITEM_TO_TAB 매핑(11개 항목 → basic/option/image/seo/shipping 5개 탭) |
| **Block B — 정원창고 deep-link** | `src/app/products/page.tsx` (+13줄, line 823~834) | `?registerId=` 쿼리 파라미터 → 해당 상품 자동 체크박스 선택 + 하단 액션 바 자동 노출 + NaverRegisterModal 자동 표시(셀러 단일 클릭으로 등록 시작 가능) |
| **Block C — 씨앗심기 deep-link** | `src/app/products/new/page.tsx` (+12줄, line 768~778) | `?focus=basic\|option\|image\|seo\|shipping` 쿼리 파라미터 → 해당 탭 자동 활성화. 6탭 중 5개 탭 매핑(혜택 탭은 readiness 항목과 무관) |
| **Block D — 대시보드 통합** | `src/app/dashboard/page.tsx` (+4줄) | UploadReadinessWidget import + DailyPlanWidget 다음 위치에 배치(매출 직결 위젯이라 상위 노출) |

**브라우저 라이브 테스트 결과 (Chrome MCP)**:

대시보드 위젯 (8개 DRAFT 상품 데이터 기준):
- Stat strip: 0 등록가능 / 8 작업필요 / 평균 42점 ✅
- 4개 상품 카드 정상 렌더링 (B등급 60점, C등급 52점, D등급 42점, D등급 38점) ✅
- 부족 항목 칩 8종 정상 표시 (카테고리/태그/키워드/상품명/앞15자/추가/어뷰징/반복/대표/배송/마진) ✅

Block C 검증 (`?focus=seo`):
- 클릭 → URL `/products/new?edit=cmmwgn3t30003k8hs0ujaw6eh&focus=seo` 정확히 이동 ✅
- 씨앗심기 진입 시 "SEO·원산지" 탭 자동 활성화(빨간 배경) ✅
- 우측 수정 준비도 패널 60% B등급 + 부족 항목 5종 인라인 표시 ✅

Block B 검증 (`?registerId=`):
- URL `/products?registerId=cmmwgn3t30003k8hs0ujaw6eh` 직접 진입 ✅
- 정원창고에서 해당 상품 체크박스 자동 선택 + "1개 선택" 하단 액션 바 자동 노출 ✅
- NaverRegisterModal "Naver Direct Registration" 자동 표시(취소 / 1개 네이버 등록 시작) ✅

**TSC**: 0 errors

**구조 결정 (이후 세션 참고)**:
- `upload-readiness.ts`는 **single source of truth** — 위젯/정원창고/씨앗심기/검색조련사/좀비부활소/cron daily가 모두 동일한 11점 체크 로직을 사용
- ITEM_TO_TAB 매핑 표는 위젯 내부에 격리 — 향후 readiness 항목 추가 시 매핑만 업데이트하면 deep-link 자동 작동
- 90점 임계값은 위젯에서만 적용 — 정원창고 NaverRegisterModal은 더 관대한(70%+) 기준 유지(기존 정책 유지)
- E-14는 "셀러의 첫 등록 차단점 해소"가 목적 — 매출 발생 후에는 의미가 줄어드는 작업이므로 우선순위가 가장 높았음


### 2026-04-29 Phase E+ Sprint 4 후속 완료 세션 (E-10 — 경쟁 진입장벽 모니터링, 옵션 A 간접 추정 방식)

**범위**: 원래 ROADMAP 계획은 "네이버 쇼핑검색 API로 리뷰수/평점 직접 스크래핑" 이었으나, 실제 API 응답에서 reviewCount/avgRating이 안정적으로 제공되지 않아 더 현실적인 **옵션 A — 진입장벽 간접 추정**으로 적응. 판매처 다양성(topSellers) + 가격 분산(priceSpread) + 총 검색 결과수(totalResults) + 경쟁 강도(competitionLevel) — 이 4개 proxy로 진입장벽을 5단계 추정하고 BlueOcean 점수에 가산.

| Block | 변경 사항 | 핵심 |
|-------|----------|------|
| **Block A — 진입장벽 추정 엔진** | `src/lib/competition-monitor.ts` (+135줄), `src/app/api/competition/route.ts` (+9줄) | `estimateEntryBarrier()` 함수 — 4-factor weighted score (topSellers 30% + priceSpread 30% + totalResults 25% + competitionLevel 15%), 0~5 점수 + low/medium/high label + recommendation 문구. POST /api/competition 응답에 entryBarrier 객체 삽입 |
| **Block B — BlueOcean 가산** | `src/lib/sourcing-recommender.ts` (+79줄) | 진입장벽 낮음 → +15점 / 보통 → +5점 / 높음 → 0점. 기존 BlueOcean 알고리즘에 합산하며 breakdown 구조 도입 — UI에서 "기본 70 +15 진입가산 = 85" 형태로 투명하게 노출 |
| **Block C — 경쟁 모니터 UI** | `src/components/dashboard/CompetitionMonitorWidget.tsx` (+137줄) | 카드 펼침 시 진입장벽 패널 노출 — 5단계 수평 막대(green→yellow→orange→red 그라데이션) + 4-factor 세분화(판매처 X개·가격분산 X%·검색결과 N건·경쟁강도 치열) + Recommendation 안내문구. **라이브 검증 완료** (8개 상품 데이터, 예: "선물받은 특별한 일상" → 4.5/5 높음 등) |
| **Block D — 소싱 추천 위젯 UI** | `src/components/dashboard/SourcingRecommendWidget.tsx` (+95줄) | 경쟁 상품 카드 헤더에 Shield 아이콘 + 진입장벽 chip(낮음 녹색/보통 노랑/높음 빨강 3색) + BlueOcean breakdown 표시(기본+진입가산=점수) + 3 metrics 신규 노출(진입장벽 점수 X/5·판매처 다양성·가격 분산). **라이브 검증 완료** (mock 주입으로 LOW/MEDIUM/HIGH 3색 모두 시각 확인) |

**구현 방식 결정 — 옵션 A vs 원래 계획 차이점** (이후 세션 주의):

| 항목 | 원래 ROADMAP 계획 | 실제 구현 (옵션 A) |
|------|---------------------|---------------------|
| 데이터 소스 | 네이버 쇼핑검색 API의 reviewCount/productRating 직접 수집 | 기존 수집 데이터 4-factor proxy(topSellers/priceSpread/totalResults/competitionLevel) |
| DB 스키마 | `CompetitorSnapshot`에 reviewCount, avgRating 컬럼 추가 예정 | **스키마 변경 없음** — 런타임 계산으로 완전히 대체 |
| 진입장벽 판단 기준 | 리뷰수 100+ = 높음 / 30~99 = 중간 / 0~29 = 낮음 | 4-factor weighted score 0~5점으로 자체 임계값 설정 |
| 장점 | 리뷰 = 직접 경쟁 지표로 직관적 | API 가용성 의존 없음, 즉시 작동, DB 마이그레이션 불필요 |
| 단점 | API 응답에 reviewCount가 누락될 때 취약 | 간접 추정이라 일부 도메인(예: 소수 판매자만 있는 틈새 카테고리)에서 과대/과소 추정 가능성 |

**장기적 권고**: E-11 완료 후 자체 리뷰 데이터가 50건+ 축적되면, 자체 스토어 웹 크롤링으로 경쟁사 리뷰 수집 추가 가능(API에 의존하지 않는 경로). 그 시점에서 옵션 A + 원래 계획의 하이브리드 도입이 가장 강력함.

**라이브 검증 결과**:
- Block A+C: 실제 8개 상품 데이터로 정상 작동 확인. 첫 카드 펼침 결과 — 진입장벽 분석 패널 정상: 5단계 막대(붉은색=높음, 4.5/5) + 4-factor (판매처 5개·가격분산 253%·검색결과 3,756,250·경쟁강도 치열) + Recommendation ("높음 — 포화 시장, 틈새/독특한 앵글이 필요")
- Block B+D: DataLab API가 fallback 모드(빈 결과)이라 라이브 데이터로 판단 불가, React fiber를 통한 **mock 주입**으로 UI 렌더링 검증. 결과 — Shield chip(LOW 녹색/MEDIUM 노랑/HIGH 빨강 3색 모두 정상) + BlueOcean breakdown(기본 70 +15 진입가산 = 85점) + 3 metrics(진입장벽 점수 1.5/5 · 판매처 다양성 2개 · 가격 분산 68%) 정상 렌더링

**TSC**: 0 errors

**커밋 이력**:
- d1d6202 feat(E-10 Block A): entry barrier estimation in competition-monitor
- 0d216fb feat(E-10 Block B): entry barrier bonus integrated into BlueOcean score
- 9a81b87 feat(E-10 Block C): entry barrier UI in CompetitionMonitorWidget
- 6c6de96 feat(E-10 Block D): entry barrier display in SourcingRecommendWidget
- (현 커밋: docs E-10 완료 반영 + ROADMAP 다음 작업 후보 교체)

**구조 결정 (이후 세션 참고)**:
- DB 마이그레이션 불필요 — 진입장벽 데이터는 완전히 런타임 계산으로 조달됨 (`competition_snapshots` 테이블 구조 변경 없음)
- `estimateEntryBarrier()`는 **single source of truth** — CompetitionMonitorWidget · SourcingRecommendWidget · sourcing-recommender 모두 이 한 함수를 공유. 임계값 변경 시 한 곳에서 일괄 반영됨
- BlueOcean breakdown 구조(`{ base, entryBarrierBonus, total }`)는 향후 다른 가산 항목(예: AI 리뷰 감정분석 가산)을 더하기 쉬운 확장 구조 — E-11 구현 시 자연스럽게 합산 가능
- 쇼핑검색 API의 reviewCount 안정성이 추후 확인되면 옵션 A + 원래 계획의 하이브리드로 업그레이드 가능 — 하지만 현재 구현으로 궁극적 관점의 "셀러가 주의해야 할 경쟁 강도"를 흔들림 없이 견고하게 표현 가능
- 라이브 검증 시 DataLab 빈 응답이 나오는 경우가 있으므로, mock 주입·시드 데이터 주입 패턴을 다른 E-시리즈 작업에서도 재사용 권장


### 2026-04-29 Phase E+ Sprint 4 최종 완료 세션 (E-11 — AI 리뷰 감정분석 + SEO 재활용)

**범위**: 자체 리뷰 0개 상태에서도 즉시 작동 가능한 "경쟁사 리뷰 / 도매 텍스트 붙여넣기 → Groq AI 감정분석 → SEO 태그 자동 추천" 워크플로우. 검색조련사 인라인 패널에 통합 — 1인 셀러가 소싱→등록 파이프라인 마지막 단계에서 정확한 실수요 키워드를 확정할 수 있는 구조.

| Block | 변경 사항 | 핵심 |
|-------|----------|------|
| **Block A — 라이브러리 + API** | `src/lib/review-sentiment-analyzer.ts` (신규 348줄), `src/app/api/review-analysis/route.ts` (신규 78줄) | `analyzeReviewSentiment()` — Groq round-robin (3 keys) → Gemini (3 keys) → Anthropic fallback. 입력 검증 (5~800자, 최대 50개, 30000자), 결과 정규화 (비율 합 100 보정, 키워드/태그 길이 필터, 중복 제거). `parseJsonSafe()` 공유 패턴. SentimentResult: overallSentiment + 3 ratios + topKeywords (완트 12개) + suggestedTags (최대 10개, 2~6자 한국어) + strengths/painPoints (각 최대 4개) + aiSummary (1~2문장)
| **Block B — 검색조련사 UI 통합** | `src/components/naver-seo/NaverSeoProductTable.tsx` (+368줄) | `ReviewAnalysisPanel` 신규 컴포넌트를 `SeoEditPanel` 내부 SEO 태그 섹션 다음에 통합. 보라색 점선 박스(`#7C3AED`)로 기존 핀크 테마와 시각 분리. Textarea 입력 → AI 분석 시작 버튼 → 결과 영역: AI 요약 박스 + 감정 분포 막대(긍정/중립/부정 3색) + 강점/약점 2열 + Top 키워드(감정별 색) + 추천 SEO 태그 (1클릭 추가 또는 일괄 추가, 남은 슬롯 고려). 상품 설명에 AI 요약 추가 버튼, 다시 분석 버튼.
| **Block A 보강** (commit `fb418bd`) | `src/lib/review-sentiment-analyzer.ts` (+30/-8줄), `src/app/api/naver-seo/ai-generate/route.ts` (+5/-2줄) | (1) Round-robin이 401/403 auth 에러에서도 다음 키로 fallback (기존에는 429/quota만 처리) (2) JSON 파싱 안전망: trailing comma + smart quotes + control chars 제거 (3) max_tokens 1500→2500 (한국어 토큰이 더 축적—truncation 방지). 이 보강은 GROQ_API_KEY 회전 후 1번 키가 무효가 되어도 round-robin이 자동으로 2·3번 키로 넘어가도록 보증.

**Groq 키 회전 관련 이벤트** (2026-04-29 세션중 발생):
- 기존 GROQ_API_KEY (`...qNKdYC`) 이 401 Invalid 로 제공되지 않아 round-robin이 멈추는 문제 발견 — 코드 보증 추가 적용
- 꽃졔님께서 GROQ_API_KEY → `lrltQb` (새 발급), GROQ_API_KEY_3 = `3IGN7i` (신규 추가) 로 교체. GROQ_API_KEY_2 = `3pEakT`는 회전 과정에서 폐기되어 현재 401 무효 상태 — **Vercel에서 해당 키 삭제 권장** (또는 새 키로 교체)
- Vercel "Needs Attention" 표시 이해: GROQ_API_KEY_2는 렌더링 시 점을 한 소식 없다면 NA로 표시되며, GEMINI_API_KEY/_2/_3은 quota 소진 상태(2026-04 메모리) — 종합 운영되었던 6개의 AI 키중 실제 정상 키는 GROQ × 2개 (lrltQb + 3IGN7i)

**라이브 검증 결과** (Chrome MCP, 10개 mock 리뷰 “꽃 인테리어 소품”):
- API 응답: HTTP 200 (provider: groq-llama3, GROQ_API_KEY=lrltQb)
- 전반적 감정: 긍정 80% / 중립 10% / 부정 10% — 명확한 렌더링
- AI 요약: "선물받은 특별한 일상은 색이 예쁘고 품질 좋으며, 포장이 꼼꼼하다. 고객들은 가성비 최고로 선물용으로 추천한다. 판매자는 사이즈와 배송 속도 개선에 집중할 수 있다."
- 강점 4개 (긍정 키워드): 품질 / 색 / 포장 / 디자인
- 약점 2개 (회피 포인트): 사이즈가 작다 / 배송이 느리다
- TOP 키워드 10개 감정별 정확 분류 (긍정 8 + 부정 2 + 중립 0)
- 추천 SEO 태그 8개: #색이 예쁘다 / #품질 좋다 / #포장이 꼼꼼하다 / #가격대비 좋다 / #고급스럽다 / #가성비 최고 / **#선물용** / **#인테리어**
  → 꽃졔님이 평소 알아차리기 어려운 "선물용", "인테리어" 같은 구매자 쪽 말투를 AI가 채택—이게 E-11 경쟁력

**TSC**: 0 errors

**커밋 이력**:
- 00272f7 feat(E-11 Block A): review sentiment analyzer library + API endpoint
- c870707 feat(E-11 Block B): integrate review analysis panel into Naver SEO table
- fb418bd feat(E-11 Block A hardening): robust AI key fallback + JSON safety + token cap
- (현 커밋: docs E-11 완료 반영 + ROADMAP 다음 작업 후보 교체)

**구조 결정** (이후 세션 참고):
- DB 마이그레이션 불필요 — 리뷰 분석 결과는 런타임 계산으로 조달, `Product` 테이블 스키마 변경 없음. 장기 필요 시 `Product.reviewSentiment` JSON 컴럼 추가로 영속화 가능 (재분석 비용 0원 보장)
- `analyzeReviewSentiment()`는 **single source of truth** — 미래에 씨앗 심기 탭5(SEO 탭5)에도 동일 패널 재사용 가능
- Provider 우선순위 (보증 포함): Groq round-robin (3 keys, 401/403/JSON 손상 fallback) → Gemini round-robin (3 keys) → Anthropic last resort
- 추천 태그가 currentTags에 이미 있으면 시각적으로 구분(취소선 + "이미 추가됨" 표시), 남은 슬롯이 0이면 자동으로 비활성화 — 사용자가 동의하지 않아도 안전
- E-11이 SEO 자동 추천에 구체 "구매자 언어"를 주입—꽃졔님이 평소 알아차릴 수 없는 구매자 심리를 대량 텍스트로부터 추출한다는 점이 핵심 가치


### 2026-04-29~30 Phase E+ Sprint 5 완료 세션 (2025.06.02 수수료 개편 + 보안/잔재 정리)

**범위**: 2025-06-02 시행된 네이버 수수료 개편 (유입수수료 2% 폐지 → 판매수수료 2.73% / 자체마케팅 0.91%)을 라이브러리 + API + 위젯 + 마진계산기 4곳에 일관 반영. 2026-04-30 추가 리팩토링으로 export 표준화 + 카테고리별 가중평균 + 월간 절감 UI 완성. 다음 근거: 수익성 정확도 직결 + 독립 작업량 0.5일 수준.

| Block | 커밋 | 내용 |
|-------|------|------|
| **Block 1** | `17a07e2` | `naver-fee-rates-2026.ts`: `FeeChannel` 타입 + `getNaverFeeRate(code, channel)` + `getNaverFeeBreakdown` 채널 인지 라이브러리화 |
| **Block 2** | `87f9943` | `profitability/route.ts`: 라이브러리 단일 소스 사용, 카테고리별 수수료 정확 반영 |
| **Block 3** | `687a9c9` | `ProfitabilityWidget.tsx`: 일반/마케팅 채널 비교 카드 + 마케팅 가이드 표시 |
| **Block 4** | `7e32364` | `MarginCalculator.tsx`: 자체마케팅 채널 토글 — 마진 실시간 재계산 |
| **Redeploy** | `e813b28` | Vercel 프로덕션 롤아웃 검증 |
| **Refactor** | `e73d098` | NAVER_ prefix 일관화 (`NAVER_FEE_REFORM_DATE`, `NAVER_FEE_REFORM_NOTE`, `NAVER_MARKETING_FEE_REDUCTION`) + per-category weighted avg + 월간 절감 UI + `EXCEPTION_D1S` 명시화 (디지털/가전·도서 마케팅 인하 미적용) + `SalesChannel = FeeChannel` alias |
| **Cleanup** | `71afc44` | `FIX-11-check-env.sh` (1월 7일자 디버그 스크립트) 제거 — `DATABASE_URL`을 stdout에 노출하는 보안 이슈 + 의존 `FIX-10-migrate.sh` 이미 삭제됨. `.env.backup` 잔재 정리 |

**라이브 검증 결과** (`curl http://localhost:3000/api/profitability`):
```json
{
  "normalRate": 5.73,
  "marketingRate": 3.91,
  "savedRate": 1.82,
  "salesFeeNormal": 2.73,
  "salesFeeMarketing": 0.91,
  "reformDate": "2025-06-02",
  "reformNote": "2025.6.2 개편: 유입수수료 2% 폐지 → 매출연동 판매수수료 통합 (일반 2.73% / 자체마케팅 0.91%)"
}
```
→ 둘 다 2025.06.02 개편 정확 반영 + 카테고리별 접근 완료

**환경 정리 결과**:
- `.env` 파일: `.env`, `.env.example`, `.env.local` 3개만 유지 (.env.backup, FIX-11-check-env.sh 제거)
- AI 키 정책: GROQ × 3개 (lrltQb + CAVylw + 3IGN7i = 43,200회/일 capacity) 단독 운영, GEMINI 3개는 실질 기여 0으로 확정
- `.gitignore` 이미 강화됨 (`.env.*` 와일드카드 + `*.env.backup` + `vercel_env_upload*.env` 명시) — 향후 자동 차단

**TSC**: 0 errors

**구조 결정 (이후 세션 참고)**:
- 수수료 계산 single source of truth = `naver-fee-rates-2026.ts`. profitability API · ProfitabilityWidget · MarginCalculator · 크롤러가 모두 이 라이브러리를 공유
- channel 인지 계산은 `FeeChannel = 'normal' | 'marketing'` 타입으로 명시 — 호출구에서 `getNaverFeeRate(code, 'marketing')` 도 바로 사용 가능
- 예외 카테고리 (`EXCEPTION_D1S` = 디지털/가전·도서)는 마케팅 인하 미적용 — 이미 축소된 수수료이므로
- profitability API는 이제 카테고리 가중평균 기반 (`avgRateNormal`, `avgRateMarketing`)으로 제공 — 실제 상품 구성에 맞는 정확도 향상
- 다음 작업 후보 1순위: **E-15 등록 준비 AI 자동 채우기** (8개 DRAFT 평균 42점을 90+로 끌어올려 매출 발생 트리거 — ROADMAP "다음 채팅에서 시작할 작업 후보" 세션 참조)


### 2026-04-30 Phase E+ Sprint 6 완료 세션 (E-15 Block A + B — 등록 준비 AI 자동 채우기 백엔드)

**범위**: 웅로드 준비도 11점 체크리스트의 7개는 AI가 자동 채우고, 4개는 셀러 수동으로 명시하는 라이브러리 + API. UI(Block C) + 라이브 검증(Block D)은 컨텍스트 분할로 다음 채팅에서 진행.

**⚠️ 세션 중 발생한 주요 이벤트 (이후 세션 참고 필수)**:
- 세션 시작 시 첫 git log에서 `0694982 (HEAD -> main, origin/main, origin/HEAD)`로 표시되어 동기화 된 줄 자각 → 실제는 직전 채팅이 Block A (`527e381`) + Block B (`fd31dd4`) commit 경로 push 못한 상태였음
- 우리가 그 사실을 모르고 `write_file`로 upload-readiness-filler.ts 새로 작성 → 직전 commit의 더 풍부한 코드(`NON_AUTOFILLABLE_ITEMS`, `NonAutoFillableItemId` 타입, 한국어 prompt 등) 덮어쓴
- TSC 에러(`partitionReadinessItems` 없음 등) 발생 → `git status`의 "ahead of origin/main by 2 commits" 메시지로 진짜 상황 발견
- `git restore`로 우리 변경 전수 취소 → 직전 commit이 이미 다 너무 잘 작성되어 있음을 재확인 (PATCH 검증과 일치, isKoreanText 검증, 카테고리 d1 강제 등 모두 포함)
- 그대로 push (`0694982..fd31dd4 main -> main`) — 우리 수정 필요 없음
- 교훈: **새 채팅 시작 체크리스트에 `git rev-parse HEAD origin/main` + `git status` ahead메시지 교차 확인 추가 필수** (작업 원칙 21/22번으로 명명)

| Block | 커밋 | 내용 | 핵심 |
|-------|------|------|------|
| **Block A** | `527e381` | `src/lib/upload-readiness-filler.ts` (622줄) | 7개 자동 채우기 함수: `autoFillProductName(mode: length\|abuse\|repeat\|frontKeyword)` + `autoFillKeywords` + `autoFillSeoTags` + `autoFillCategory` + `autoFillAll` + `partitionReadinessItems`. `AUTOFILLABLE_ITEMS`(7) + `NON_AUTOFILLABLE_ITEMS`(4) const tuple로 정의. Provider chain: Groq round-robin (3 keys, 401/403/JSON fallback) → Gemini (3 keys) → Anthropic. parseJsonSafe (trailing comma + smart quotes + control chars). 안전장치: isKoreanText (ASCII letters ≤30%), containsAbuse (17개 blacklist), hasRepeat3Plus, clampLen, 카테고리 NAVER_CATEGORIES_FULL d1 강제. tags는 cleaned >= 10 요구, keywords는 cleaned >= 5 요구 (PATCH 검증과 일치) |
| **Block B** | `fd31dd4` | `src/app/api/upload-readiness/auto-fill/route.ts` (347줄) | POST + PATCH 2단계. POST: 상품 fetch → calcUploadReadiness로 failed.id 계산 → partitionReadinessItems(autofillable + nonAutofillable) → autoFillAll() 실행 → `{ suggestions[], unfillable[], autofillableRequested[], autofillableSucceeded[] }`. PATCH: 각 itemId별 재검증 (이용자 tampered payload 방어) → update 구성 → prisma.product.update → calcUploadReadiness 재계산 → `{ applied[], rejected[], newScore, newGrade, newLabel }`. 카테고리는 PATCH 시점에서도 NAVER_CATEGORIES_FULL.some(c.code === code) 최종 방어선 추가 |

**라이브 API 검증** (curl POST `/api/upload-readiness/auto-fill` with productId `cmnh8vx0m0001r7mnxbgrvkzi` "선물받은 특별한 일상"):
```json
{
  "success": true,
  "suggestions": [
    {
      "itemId": "tags_count",
      "after": ["선물용", "일상용", "편안한", "여유로운", "감각적", "고급스러움", "리본포인트", "매직", "홈웨어", "일상룩", "선물세트", "편안한생활"],
      "confidence": "high", "provider": "groq-llama3"
    },
    { "itemId": "category", "after": "50005707", "confidence": "medium", "provider": "groq-llama3" }
  ],
  "unfillable": ["extra_images", "net_margin"],
  "autofillableRequested": ["category", "tags_count", "name_length"],
  "autofillableSucceeded": ["tags_count", "category"]
}
```
→ 다음 세션의 Block C(UI)에서 이 패턴을 그대로 활용 가능: `tags_count`(12개 제안), `category`(코드 매칭 추천), `unfillable`(셀러 수동 안내 영역)

**TSC**: 0 errors

**커밋 이력**:
- 527e381 feat(E-15 Block A): upload-readiness-filler library + 7 auto-fill functions
- fd31dd4 feat(E-15 Block B): auto-fill API endpoint (POST preview + PATCH apply)
- (현 커밋: docs E-15 Block A+B 완료 반영 + Block C+D 대기 설명 + 작업 원칙 21/22 추가)

**구조 결정 (이후 세션 참고)**:
- `upload-readiness-filler.ts`는 **single source of truth** — 7개 자동 채우기 함수 모두 독립 호출 가능 (`autoFillKeywords`, `autoFillSeoTags`, `autoFillCategory`, `autoFillProductName(mode)`). Block C UI 에서는 `autoFillAll`도 그대로 사용 가능
- POST 응답 타입 완전 확정: `{ success, suggestions: AutoFillSuggestion[], unfillable: ReadinessItemId[], autofillableRequested: AutoFillableItemId[], autofillableSucceeded: AutoFillableItemId[], message? }`
- PATCH 응답 타입 완전 확정: `{ success, applied: AutoFillableItemId[], rejected: { itemId, reason }[], newScore, newGrade, newLabel }`
- 카테고리는 "AI 추천 코드"를 PATCH가 다시 검증 (NAVER_CATEGORIES_FULL.some(c.code === code)) — 이중 방어선
- name fix는 4가지 mode 중 하나만 적용 (priority: length → abuse → repeat → frontKeyword) — length 재작성이 대개 다른 세 mode도 side-effect로 고침
- name_length 추천이 실패하는 경우도 있음 (라이브 검증에서 "선물받은 특별한 일상" 11자 → 25자로 늘리는 곳에서 isKoreanText 또는 repeat 검증 실패 듯) — Block C에서 "추천 실패" 안내 UI 필요
- Manual-only 4개 항목(`extra_images`, `main_image`, `shipping_template`, `net_margin`) 시도 절대 안 함 — unfillable 배열로 셀러에게 안내만


### 2026-04-30 Phase E+ Sprint 6 완료 세션 (E-15 Block C — AutoFillModal UI 통합)

**범위**: Block A+B가 만든 POST(미리보기) + PATCH(적용) 2단계 API를 셀러가 클릭 한 번에 이용할 수 있도록 AutoFillModal 신규 + UploadReadinessWidget 통합 + Dashboard onRefresh 연결. 이 모달이 자동 채우기 파이프라인의 "마지막 1클릭" 완성. 셀러 안전 장치는 그대로 유지 (POST/PATCH 검증 이중 방어선 그대로).

| 파일 | 종류 | 핵심 |
|------|------|------|
| `src/components/dashboard/AutoFillModal.tsx` (신규 510줄) | client component | (1) mount 즉시 API POST 호출 → loading state. (2) suggestions 도착 시 nameRelated 4모드 조합을 라디오 그룹(상품명은 하나의 string 필드이므로) + others(keywords/tags/category)는 독립 체크박스. (3) 자동 선택 기본값: 첫 년 nameRelated 1개 + 모든 others. (4) "적용" 클릭시 selected에만 PATCH 호출 → newScore 응답 → done 화면 1.8초 표시 → onApplied() 호출 → 모달 자동 닫기. (5) Esc 키 닫기 + 적용 중 사용자 조작 차단. (6) Empty/Error/Done/Loading 4개 디스패치 phase. (7) Manual-only 4개 항목은 ManualItemCard로 deep-link(`/products/new?edit=...&focus=...`) 노출 |
| `src/components/dashboard/UploadReadinessWidget.tsx` (+207/-124 줄) | server↔client | (1) `AutoFillModal` import 추가. (2) `modalTarget` state로 단일 모달 관리. (3) `ProductRow` props에 `onAutoFill` 추가. (4) ready90이 아닌 카드에 `Sparkles + AI 채우기` 버튼(보라 #7c3aed) 상단 추가. (5) 기존 `수정하기` 버튼은 `직접 수정`으로 이름 변경 + outline 스타일로 보조 CTA로 낮춤. (6) `hasAnyAutofillable()` 검사로 manual-only 4개만 남은 경우 AI 버튼 숨김. (7) `onRefresh` prop 신규 — 모달 적용 완료 시 dashboard의 handleRefresh를 호출해 위젯 자동 재로드 |
| `src/app/dashboard/page.tsx` (+1/-1 줄) | server | `<UploadReadinessWidget>`에 `onRefresh={handleRefresh}` prop 1줄 추가. handleRefresh는 이미 loadStats + loadProducts 둘 다 호출하도록 되어 있으며, 모달 적용 완료 시 위젯이 최신 점수로 다시 구성됨 |

**UI 동작 흐름 (시퀀스)**:
```
[셀러] 대시보드 위젯의 DRAFT 카드(예: 42점) → "AI 채우기" 버튼 클릭
  → [모달] phase=loading, Loader2 spin
  → [API] POST /api/upload-readiness/auto-fill { productId } → suggestions[] + unfillable[]
  → [모달] phase=ready — 세 섹션 렌더:
      A) 상품명 재작성 라디오 (1개만 선택, 첫 항목 자동 선택)
      B) 키워드/태그/카테고리 독립 체크박스 (기본 모두 체크)
      C) Manual-only 카드 (노란 테두리, 클릭시 씨앗심기 탭으로 deep-link)
  → [셀러] 검토 후 "N개 적용" 버튼 클릭
  → [API] PATCH /api/upload-readiness/auto-fill { productId, accepted } → newScore
  → [모달] phase=done — CheckCircle2 + "42점 → 75점 (+33)" 표시 — 1.8초
  → onApplied() → dashboard 재로드 → 모달 자동 닫기 → 위젯 카드 최신 점수로 갱신됨
```

**TSC**: 0 errors

**커밋**:
- b2f9b4e feat(E-15 Block C): AutoFillModal + widget integration with auto-fill button (3 files, +911 / -124)

**구조 결정 (이후 세션 참고)**:
- AutoFillModal은 **완전히 자기완결** (props: productId, productName, currentScore, onClose, onApplied) — 향후 씨앗심기/정원창고/검색조련사 페이지 등 다른 곳에서도 동일 패턴으로 재사용 가능
- 상품명 재작성 4모드(`name_length`, `no_abuse`, `no_repeat`, `keyword_in_front`)는 모두 `product.name` 단일 필드를 덮어쓰므로 충돌 발생 — 따라서 **라디오 그룹**으로 1개만 적용 가능하게 함. PATCH switch case도 `update.name = v`로 겹치고 마지막이 이기는 구조이므로 이 라디오 제약이 명시적 방어선
- onApplied()가 dashboard.handleRefresh()를 호출하면 loadStats + loadProducts 둘 다 재로드 — 위젯 점수 + 파이프라인 카운트 + KPI 모두 신선해짐
- 남은 7개 자동 항목 중 일부만 적용해도 완전 작동 — PATCH가 each itemId를 독립적으로 검증하고 거부된 것은 rejected로 반환함
- "직접 수정" 버튼은 항상 존재 — AI 채우기가 필요하지 않더라도 셀러가 수동 라우트로 진입 가능
- 모달 있는 동안 대시보드는 읽기 전용 — 이중 모달 방지를 위해 setModalTarget는 단일값
- AI 답변이 모두 검증 실패해서 suggestions가 비었을 때 — 모달은 "AI 자동 채우기 가능 항목이 없습니다" 노란 바 + manual 카드만 렌더 — 셀러가 혼란하지 않음
- **Block D 라이브 검증 대기 중** — Chrome MCP로 8개 DRAFT 시도 + 점수 상승 검증, 응답시간 측정, edge case 확인 필요

**⚠️ 본 Block C가 마무리된 후 시작된 다음 채팅에서 작업원칙 21번 사건이 두 번째로 발생**: user 메시지가 "HEAD = 0694982, 10 commits 동기화 상태"라는 작업 가정을 명시했지만 실제 origin/main = b6e6da3 + Block A+B+C 완료(16 commits) 상태였음. 새 채팅이 그 가정을 무비판으로 받아 AutoFillModal을 처음부터 새로 쓰려 했으나, write_file이 중간에 끊어져 working tree clean이 유지되어 손실 없이 멈춤. user가 "커밋 푸시 단계였습니다 상황을 확인하고 진행해주세요"로 즉시 잡아주심. 본 사건 학습으로 작업원칙 23·24번 신설 — **다음 채팅이 같은 사건을 또 만들지 않도록**


### 2026-04-30 Phase E+ Sprint 6 진행 중 (E-15 Block D Part 1 — 1상품 라이브 검증 완료)

**범위**: Chrome MCP로 첫 DRAFT 카드(60점, 무타공 두꺼비집가리개)에서 AI 채우기 모달 → POST 미리보기 → PATCH 적용 → 위젯 자동 갱신 전 과정을 라이브 검증. 시나리오 1~6 통과. 발견된 score 일관성 버그는 Part 2 새 채팅에서 수정 예정.

**검증 결과 — 시나리오 1~6 (모두 ✅)**:

| 시나리오 | 결과 | 검증 데이터 |
|---------|------|------------|
| 1. dev 서버 응답 | ✅ HTTP 200 / 0.13초 / 8 DRAFT 정상 fetch | `curl /dashboard` + `/api/products?status=DRAFT` |
| 2. 위젯 렌더링 | ✅ Stat strip(0/8/42) + 5개 카드 + AI 채우기 5개 + 직접 수정 5개 | DRAFT 8개 중 위젯 TOP 5 표시 |
| 3. 모달 열림 (loading→ready) | ✅ POST elapsed 약 4~5초 (Groq round-robin 정상) | 첫 클릭 = "무타공 두꺼비집가리개 대형 45x34cm WIFI 블라인드 분전함커버" (60점 카드) |
| 4. ready phase 3섹션 렌더 | ✅ 키워드 5개+ 체크박스 + SEO 태그 10개+ 체크박스 + extra_images 노란 카드 (radio 0개 = 이 상품에 상품명 재작성 추천 없음, 이미 통과) | suggestions 2 + unfillable 1 = 모달 정상 분리 |
| 5. 적용 → done | ✅ PATCH 6.0초 / `applied: [keywords_count, tags_count]` / `rejected: []` / `newScore: 92, newGrade: 'S'` | DB 즉시 적용 + 모달 자동 닫힘 (1.8초) |
| 6. 위젯 자동 갱신 | ✅ 첫 카드 60점 → 82점 (등급 B → A) / Stat 평균 42 → 45 / 부족칩 4개 → 3개 (앞15자/추가/배송) | onApplied → handleRefresh → loadStats + loadProducts 모두 정상 |

**라이브 데이터 (PATCH 응답 발췌)**:
```json
{
  "success": true,
  "applied": ["keywords_count", "tags_count"],
  "newScore": 92,
  "newGrade": "S",
  "newLabel": "92% — 앞15자 키워드, 추가이미지 (0장)",
  "rejected": []
}
```

**적용된 키워드** (구매자 언어 정확 반영):
- keywords_count: `인터폰박스, 가구인테리어, 인테리어소품, 무타공가리개, 대형블라인드, 분전함커버, 인터폰커버`
- tags_count: `선물용, 고급스러움, 감각적, 인테리어용, 모던, 고급, 디자인, 품질좋음, 인테리어소품, 인테리어박스, 고상함, 인테리어용품`

**⚠️ 발견된 마이크로 조정 후보 (Part 2 수정 대상)**:

**[Bug #1] PATCH newScore(92) ≠ 위젯 reload 점수(82) — 차이 10점**
- 분석: keywords_count(12) + tags_count(10) = 22점 → 위젯 60+22=82 (정상). PATCH 응답은 60+32=92로 계산.
- 차이 10점은 정확히 `shipping_template` weight 값. PATCH 시점에서 `calcUploadReadiness`가 shipping_template을 통과로 잘못 계산했을 가능성.
- 수정 위치: `src/app/api/upload-readiness/auto-fill/route.ts` PATCH 핸들러 마지막 부분 — `prisma.product.update` 후 `calcUploadReadiness` 호출 시 전달하는 product 객체의 shippingTemplateId 필드 검증
- 영향도: 모달 done 화면 표시 점수와 위젯 갱신 점수가 다름 → 셀러 혼란. 데이터 손실 없음.
- 우선순위: Part 2 첫 작업

**[Note] AutoFillModal은 inline style 사용 (Tailwind 아님)**:
- `position: fixed; zIndex: 1000` — Chrome MCP 셀렉터로 잡으려면 `getComputedStyle(d).position === 'fixed'` 패턴 사용 필요
- Tailwind class `[class*=fixed][class*=inset-0]` 패턴은 작동하지 않음
- Part 2 검증 시 동일 패턴 재사용 권장

**Vercel 환경변수 "Needs Attention"**: 키 회전 없음 확인. 단순 마지막 배포 이후 시간 경과 알림으로 추정. 빈 commit + push로 재배포 트리거하여 해소.

**TSC**: 0 errors (코드 변경 없음, 라이브 검증 + docs만 진행)

**커밋 이력 (Part 1)**:
- (현 commit) docs(E-15 Block D Part 1): 1-product live verification + score consistency bug + handoff for Part 2
- (현 commit + 1) chore: redeploy to refresh Vercel env var Needs Attention status

**구조 결정 (이후 세션 참고)**:
- AutoFillModal은 React Portal 없이 일반 React 트리 안에서 inline style position:fixed로 렌더 — z-index 1000으로 충분히 위에 뜸
- Chrome MCP에서 모달 셀렉터는 반드시 computed style 검사 (Tailwind class 패턴 안 통함)
- PATCH 응답의 newScore와 위젯 reload 점수가 다른 경우 calcUploadReadiness 호출 두 경로의 ItemId 집합 일관성 점검 필요
- Part 1과 Part 2를 분리한 이유: 컨텍스트 한계 회피 + Part 1에서 발견된 버그를 Part 2 시작 시점에 정확하게 파악하기 위함


