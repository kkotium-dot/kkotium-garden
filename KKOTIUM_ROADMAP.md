# KKOTIUM GARDEN — 전체 작업 로드맵
> 최종 업데이트: 2026-05-02 (Phase E+ Sprint 6 — E-15 Block D Part 2 잔여·4 — 이슈 #7 근본 해결: AI 자기모순 hallucination 도메인-무관 일반 검증 추가 ✅, 작업원칙 26번 신설)
> **Phase A ✅ | Phase B ✅ | Phase C ✅ | Phase D ✅ 전체 완료 | Phase E 진행 중 (E-7, E-1, E-3, E-8 완료) | Phase E+ Sprint 1·2·3·4·5 완료 + Sprint 6 진행 중 (E-15 Block A+B+C ✅ + Block D Part 1 ✅ + Part 2 단계 1·2·3 ✅ + 이슈 #4 ✅ + 이슈 #1 자연 해소 ✅ + 잔여·2 이슈 #2+#5 거부 로직 ✅ + 잔여·3 이슈 #6 부분 해결 ✅ + 잔여·4 이슈 #7 근본 해결 ✅, 이슈 #3 점검 + E-15 전체 완료 대기)**
> **다음 작업: E-15 Block D Part 2 잔여·5 (이슈 #3 ready90 점검 + E-15 전체 완료 처리 + 다음 Sprint 결정) — 본 문서 하단의 "다음 새 채팅 시작 메시지 (E-15 Block D Part 2 잔여·5용)" 섹션을 그대로 복붙해서 사용**
> **수수료 개편 (2025.06.02): 100% 완료** — 7 commits (Block 1·2·3·4 + redeploy + refactor + cleanup)
> 전략 참고문서:
> - `260413-꽃틔움 가든 개선안 검증과 2026년 전략 로드맵`
> - `스마트스토어 리뷰 관리와 반품안심케어, 무엇을 먼저 할 것인가` (Claude 리서치 2026-04-16)
> - `네이버 스마트스토어 파워셀러의 2025-2026 실전 무기 총정리` (Claude 리서치 2026-04-16)
> - `카카오 비즈니스 채널 2025-2026 완전 가이드` (Claude 리서치 2026-04-16)
> - `스마트스토어 셀러의 무료 알림톡, 정말 가능한가` (Claude 리서치 2026-04-16)

---

---

## 🎯 다음 새 채팅 시작 메시지 (E-15 Block D Part 2 잔여·5용 — 2026-05-02 마지막 갱신)

> **잔여·4 완료 ✅ (2026-05-02 마지막 세션, commit 64c4e43 + MD 마무리 commit)**:
> - **이슈 #7 근본 해결 (AI 자기모순 hallucination)**: src/lib/upload-readiness-filler.ts에 도메인-무관 일반 검증 3겹 추가
>   - 신규: AI reason의 한국어 명사 토큰과 매핑된 d2/d3/d4 substring 일치성 검증 (불일치 시 score 무관 하드 reject) — 4,993개 카테고리 전체 보호
>   - 강화: categoryHasBathroom에서 너무 느슨한 '생활용품' 매칭 제거 (CCTV·세제 등 잘못된 d3 차단)
>   - 강화: reasonHasCategoryHint에 GENERIC_D2 set 도입 ('생활용품', '주방용품', '식품', '디지털/가전', '가구' 일반 d2는 단독 hint 불가)
>   - 보강: BATHROOM_WORDS 오타 정정 (`'뚫어뻑'`→`'뚫어뻥'`) + 누락 키워드 추가 (`'펌프', '배수호스', '하수구', '파이프'`)
>   - 강화: 욕실 mismatch 패널티 -20 → -50 (sleepwear/car 분기와 동등)
> - 단위 시뮬레이션 6/6 통과 (Python으로 score() 재구현 검증) + 라이브 4/4 통과 (변기펌프 50002502 reason 일치 ACCEPT, 잠옷/홈웨어/차량용 회귀 정상)
> - **작업원칙 26번 신설**: "근본 원인 분석 — 한 케이스가 아닌 동일 패턴 일반화" (꽃졔님 직접 지시 반영, PROGRESS.md L0 작업원칙 섹션 참조)
> - 자세한 기록은 KKOTIUM_SESSION_LOG.md 최상단 참조
>
> **남은 미결 이슈**:
> - **이슈 #3 (선택, 코스메틱)**: ready90 카드 AI 버튼 일시 재표시 정황 — 데이터 손실 없음, 우선순위 낮음
>
> **E-15 전체 완료 처리 (잔여·5의 핵심)**: 이슈 #3 점검 후 E-15 마무리 + 다음 Sprint 결정 (Sprint 1 E-4 반품안심케어 마진 시뮬레이터 vs E-2C 리뷰 보상 최적 설정 가이드)
>
> 아래 코드 블록을 그대로 복붙해서 사용.

```
꽃틔움 가든 개발 이어서 진행합니다. KKOTIUM_PROGRESS.md, KKOTIUM_ROADMAP.md, KKOTIUM_SESSION_LOG.md를 읽고
E-15 Block D Part 2 잔여·5 (이슈 #3 ready90 점검 + E-15 전체 완료 처리 + 다음 Sprint 결정) 작업을 시작해주세요.

작업 시작 전 필수 (작업원칙 21+23+24+25+26 적용):
1. (a) git rev-parse HEAD origin/main → 두 값 같은지 확인 (기준 HEAD는 본 세션에서 push 한 최신 commit, 잔여·4 마무리 commit)
   (b) git --no-pager log --oneline -10 → 이번 메시지에 명시되지 않은 commit 있으면 읽고 대응
   (c) git status가 깨끗해야 함 (있으면 먼저 검토)
   (d) lsof -i :3000 → dev 서버 상태 확인 (죽었으면 npm run dev 재시작)
   (e) 이 메시지의 가정과 실제가 다르면 즉시 정직 보고 후 재분석
   (f) 본 세션 commit은 그 turn 안에서 push까지 한 줄로 완료
   (g) edit_file에서 한글 매칭 실패 시 절대 Python 수동 NFC 정규화 금지 → git restore + 한글 직접 입력 패턴 (작업원칙 25번)
   (h) 문제 분석은 항상 (a) 즉각 원인 (b) 일반화 원인 두 단계로 — 한 케이스가 아닌 동일 패턴 전체 보호 (작업원칙 26번)
2. KKOTIUM_PROGRESS.md "2026-05-02 세션 요약 — E-15 Block D Part 2 잔여·4" 섹션 정독 (이슈 #7 근본 해결 상세, 단위/라이브 검증 결과)
3. KKOTIUM_SESSION_LOG.md 최상단 세션 정독 (이슈 #7 도메인-무관 일반 검증 설계 의도 + 적용 결과)
4. 관련 코드 파일 관찰:
   - src/components/dashboard/UploadReadinessWidget.tsx + dashboard/page.tsx (이슈 #3 점검용)
   - src/lib/upload-readiness-filler.ts (이슈 #7 해결 후 현재 상태 — 추가 자동 채우기 항목 보호 갭 점검)
5. 작업 계획 브리핑 후 꽃졔님 승인 받고 시작

[단계 1] 이슈 #3 점검 (코스메틱):
  증상: 92점 S등급 카드에서 AI 채우기 버튼이 일시적으로 재표시되는 순간 포착
  점검 절차:
    1. UploadReadinessWidget.tsx ProductRow rendering condition 재검토
    2. handleAutoFillApplied → handleRefresh → loadProducts 흐름에서 stale prop 일시 사용 여부 console.log
    3. 필요 시 useMemo 의존 배열에 product.id+score+completedItems 추가
    4. 작업원칙 26번 적용: 같은 종류의 stale prop 트랩이 다른 위젯/페이지(주문 관리 / 정원 창고 / 검색 조련사 등)에서도 발생할 수 있는지 점검
  우선순위: 낮음 (데이터 손실 없음, 사용자 경험 미세 개선)

[단계 2] E-15 전체 완료 처리:
  완료 기준:
    - 이슈 #3 점검 결과 (수정 또는 의도적 보류 결정)
    - 잔여·4까지 모든 카테고리 자동 채우기 검증 회귀 안 일어난 것 재확인 (8개 DRAFT 카드 전체 회귀)
  마무리:
    - PROGRESS.md / ROADMAP.md / SESSION_LOG.md 세 파일 갱신
    - PROGRESS.md 상태 라인 "E-15 전체 완료"로 변경
    - 다음 작업 후보 결정:
      · 옵션 A: Sprint 1 E-4 반품안심케어 마진 시뮬레이터 (씨앗심기 배송탭) — return-care-fees.ts 이미 1단계 완료 상태, 2~7단계 진행 필요
      · 옵션 B: Sprint 1 E-2C 리뷰 보상 최적 설정 가이드 (혜택탭) — 미착수
    - 새 인계 메시지 작성 (다음 새 채팅 시작용)

작업 분할 권장 (컨텍스트 한계 회피):
  - 본 채팅: 단계 1 (이슈 #3 점검) + 단계 2 (E-15 완료 처리) + commit + push
  - 만약 컨텍스트 빡빡해지면 단계 2의 다음 작업 선정 + 새 인계 메시지 작성을 다음 채팅으로 이월

참고 (주의사항):
- AutoFillModal은 inline style (Tailwind 아님) — 셀렉터: getComputedStyle(d).position === 'fixed' && cs.zIndex === '1000'
- AI 호출 비용 0원 (Groq 3키 합산 43,200/일)
- 사용 모델 llama-3.1-8b-instant — 카테고리 검증 도메인-무관 일반 검증 적용 완료 (잔여·4)
- 코드 수정 후 반드시 `npx tsc --noEmit` 0 errors 확인
- 8개 DRAFT 전체 회귀 필요 시 curl "http://localhost:3000/api/products?status=DRAFT&limit=20" 사용 (zsh ? glob 회피 위해 따옴표 필수)
- 세션별 자세한 기록은 KKOTIUM_SESSION_LOG.md에 작성, PROGRESS.md/ROADMAP.md는 핵심 요약만 유지
```

---

## 📜 Part 2 잔여·4용 메시지 (참고용 보존 — deprecated, 위 "잔여·5용" 메시지를 대신 사용)

## 🎯 다음 새 채팅 시작 메시지 (E-15 Block D Part 2 잔여·4용 — 2026-05-02 마지막 갱신)

> **잔여·3 완료 ✅ (2026-05-02 마지막 세션)**:
> - **이슈 #6 부분 해결**: src/lib/upload-readiness-filler.ts autoFillCategory 프롬프트 강화 + score() 가중치 재조정으로 3개 카드 매핑 정확도 개선 라이브 검증 완료:
>   - 리본 포인트 홈웨어 잠옷세트 → 50000826 (여성의류>잠옷/홈웨어) high ✅
>   - 하트 리본 누빔 여성 파자마 세트 → 50000826 high ✅
>   - 차량용 햇빛가리개 → 50004092 (자동차용품>인테리어용품>차량용햇빛가리개) ✅
> - 자세한 기록은 KKOTIUM_SESSION_LOG.md 최상단 참조
>
> **남은 미결 이슈**:
> - **이슈 #7 (주 작업)**: 변기펌프 카드 재테스트 시 AI가 50002707(생활/건강>생활용품>보안용품>CCTV) 추천. AI reason 텍스트에는 "변기펌프는 욕실용품"이라고 적으면서 실제 코드는 CCTV를 출력한 **자기모순 hallucination**. 개선 방안: score()에 reason·실제코드 일치성 검증 + 욕실용품 키워드 패널티
> - **이슈 #3 (선택, 코스메틱)**: ready90 카드 AI 버튼 일시 재표시 정황
>
> 아래 코드 블록을 그대로 복붙해서 사용.

```
꽃틔움 가든 개발 이어서 진행합니다. KKOTIUM_PROGRESS.md, KKOTIUM_ROADMAP.md, KKOTIUM_SESSION_LOG.md를 읽고
E-15 Block D Part 2 잔여·4 (이슈 #7 변기펌프 AI 자기모순 매핑 거부 로직 + 이슈 #3 점검 + E-15 전체 완료 처리) 작업을 시작해주세요.

작업 시작 전 필수 (작업원칙 21+23+24+25 적용):
1. (a) git rev-parse HEAD origin/main → 두 값 같은지 확인 (기준 HEAD는 본 세션에서 push 한 최신 commit)
   (b) git --no-pager log --oneline -10 → 이번 메시지에 명시되지 않은 commit 있으면 읽고 대응
   (c) git status가 깨끗해야 함 (있으면 먼저 검토)
   (d) lsof -i :3000 → dev 서버 상태 확인 (죽었으면 npm run dev 재시작)
   (e) 이 메시지의 가정과 실제가 다르면 즉시 정직 보고 후 재분석
   (f) 본 세션 commit은 그 turn 안에서 push까지 한 줄로 완료
   (g) edit_file에서 한글 매칭 실패 시 절대 Python 수동 NFC 정규화 금지 → git restore + 한글 직접 입력 패턴 (작업원칙 25번)
2. KKOTIUM_PROGRESS.md "2026-05-02 세션 요약 — E-15 Block D Part 2 잔여·3" 섹션 정독
3. KKOTIUM_SESSION_LOG.md 최상단 세션 정독 (이슈 #7 세부 원인 분석 + 개선 방안 포함)
4. 관련 코드 파일 관찰:
   - src/lib/upload-readiness-filler.ts (autoFillCategory 프롬프트 + score 함수 — 이슈 #7 주대상)
   - src/components/dashboard/UploadReadinessWidget.tsx + dashboard/page.tsx (이슈 #3 점검용)
5. 작업 계획 브리핑 후 꽃졔님 승인 받고 시작

[단계 1] 이슈 #7 변기펌프 AI 자기모순 매핑 거부 로직 — score() 검증 구조 강화:
  A) src/lib/upload-readiness-filler.ts:
     - score()에 "reason 텍스트 vs 실제 매핑 d3/d4 일치성" 검증 추가:
       · AI가 reason에 적은 키워드(예: "욕실용품")와 실제 매핑된 d2/d3/d4(예: "보안용품>CCTV") substring 교집합 0 → 강한 패널티
     - 욕실용품/파이프 관련 키워드 리스트 추가 (변기/펌프/뚫어뻥/배수구/배수호스)
       · 이 중 하나라도 있으면 d2/d3 가 욕실/파이프/배수 근접 키워드 아니면 패널티 -40
     - 프롬프트에 "reason에 적은 카테고리명이 실제 매핑 코드의 d2/d3/d4 이름과 일치해야 함" 명시적 안내 강화
  B) 라이브 검증:
     - 변기펌프 카드(cmn7984ff0001130kjfj6mnas) 재테스트 → 50002707(CCTV) 거부되고 정확한 욕실용품 카테고리 추출 또는 default 유지
     - 회귀: 이전 검증된 3건 (홈웨어 잠옷세트/파자마/차량용햇빛가리개) 동일하게 정확한 매핑 유지 확인

[단계 2] 이슈 #3 점검 (선택적, 코스메틱):
  증상: 92점 S등급 카드에서 AI 채우기 버튼이 일시적으로 재표시되는 순간 포착
  점검:
    1. UploadReadinessWidget.tsx ProductRow rendering condition 재검토
    2. handleAutoFillApplied → handleRefresh → loadProducts 흐름에서 stale prop 일시 사용 여부 console.log
    3. 필요 시 useMemo 의존 배열에 product.id+score+completedItems 추가
  우선순위: 낮음 (데이터 손실 없음) — 이슈 #7 마무리 후 여유 있을 때

[단계 3] E-15 전체 완료 처리:
  완료 기준:
    - 이슈 #7 개선 후 변기펌프 포함 부적합 매핑 거부 확인
    - 기존 적용 카드 회귀 안 일어난 것 검증
  마무리:
    - PROGRESS.md / ROADMAP.md / SESSION_LOG.md 세 파일 갱신
    - PROGRESS.md 상태 라인 "E-15 전체 완료"로 변경
    - 다음 작업 후보 결정 (Sprint 1 E-4 반품안심케어 마진 시뮬레이터 vs E-2C 리뷰 보상 최적 설정 가이드)
    - 새 인계 메시지 작성 (다음 새 채팅 시작용)

작업 분할 권장 (컨텍스트 한계 회피):
  - 본 채팅: 단계 1 (이슈 #7 score 검증 강화 + 프롬프트 강화) + 라이브 검증 + 단계 3 (E-15 완료 처리)
  - 단계 2 (이슈 #3 점검)는 선택적이므로 여유 있을 때만 진행, 아닌 경우 다음 채팅으로 이월

참고 (주의사항):
- AutoFillModal은 inline style (Tailwind 아님) — 셀렉터: getComputedStyle(d).position === 'fixed' && cs.zIndex === '1000'
- AI 호출 비용 0원 (Groq 3키 합산 43,200/일)
- 사용 모델 llama-3.1-8b-instant — 자기모순 검증은 코드 레벨(score 함수)에서 처리 필수
- 코드 수정 후 반드시 `npx tsc --noEmit` 0 errors 확인
- 변기펌프 카드 ID: cmn7984ff0001130kjfj6mnas (전체 ID 필수, 축약형 안 됨)
- 8개 DRAFT 전체 회귀 필요 시 curl "http://localhost:3000/api/products?status=DRAFT&limit=20" 사용 (zsh ? glob 회피 위해 따옴표 필수)
- 세션별 자세한 기록은 KKOTIUM_SESSION_LOG.md에 작성, PROGRESS.md/ROADMAP.md는 핵심 요약만 유지
```

---

## 📜 Part 2 잔여·3용 메시지 (참고용 보존 — deprecated, 위 "잔여·4용" 메시지를 대신 사용)

## 🎯 다음 새 채팅 시작 메시지 (E-15 Block D Part 2 잔여·3용 — 2026-05-01 마지막 갱신)

> **잔여·2 완료 ✅ (2026-05-01 마지막 세션)**:
> - **이슈 #2 차단 성공**: autoFillCategory + PATCH 이중 방어선으로 동일 코드 추천 차단 (차량용 햇빛가리개 라이브 검증)
> - **이슈 #5 차단 성공**: d1 fallback 폐기 + token overlap 검증 (변기펌프→DVD/교양 부적합 매핑 차단)
> - 자세한 기록은 KKOTIUM_SESSION_LOG.md 최상단 참조
>
> **남은 미결 이슈**:
> - **이슈 #6 (주 작업)**: AI가 홈웨어 잠옷세트/파자마 카드에 50021261(여성의류>니트>베스트) 추천. 거부 로직은 통과했으나 잠옷을 조끼로 매핑한 부적합 결과. 개선 방안: 프롬프트 강화 + few-shot 3~5개 + d3 substring 가중치 투입
> - **이슈 #3 (선택, 코스메틱)**: ready90 카드 AI 버튼 일시 재표시 정황
>
> 아래 코드 블록을 그대로 복붙해서 사용.

```
꽃틔움 가든 개발 이어서 진행합니다. KKOTIUM_PROGRESS.md, KKOTIUM_ROADMAP.md, KKOTIUM_SESSION_LOG.md를 읽고
E-15 Block D Part 2 잔여·3 (이슈 #6 카테고리 추천 정확도 개선 + 이슈 #3 점검 + E-15 전체 완료 처리) 작업을 시작해주세요.

작업 시작 전 필수 (작업원칙 21+23+24+25 적용):
1. (a) git rev-parse HEAD origin/main → 두 값 같은지 확인 (기준 HEAD는 본 세션에서 push 한 최신 commit)
   (b) git --no-pager log --oneline -10 → 이번 메시지에 명시되지 않은 commit 있으면 읽고 대응
   (c) git status가 깨끗해야 함 (있으면 먼저 검토)
   (d) 이 메시지의 가정과 실제가 다르면 즉시 정직 보고 후 재분석
   (e) 본 세션 commit은 그 turn 안에서 push까지 한 줄로 완료
   (f) edit_file에서 한글 매칭 실패 시 절대 Python 수동 NFC 정규화 금지 → git restore + 한글 직접 입력 패턴 (작업원칙 25번)
2. KKOTIUM_PROGRESS.md "2026-05-01 세션 요약 — E-15 Block D Part 2 잔여·2" 섹션 정독
3. KKOTIUM_SESSION_LOG.md 최상단 세션 정독 (이슈 #6 세부 원인 분석 + 개선 방안 포함)
4. 관련 코드 파일 관찰:
   - src/lib/upload-readiness-filler.ts (autoFillCategory 프롬프트 + score 함수 — 이슈 #6 주대상)
   - src/lib/naver/naver-categories-full.ts (잠옷/홈웨어 카테고리 실제 코드 확인)
   - src/components/dashboard/UploadReadinessWidget.tsx + dashboard/page.tsx (이슈 #3 점검용)
5. 작업 계획 브리핑 후 꽃졔님 승인 받고 시작

[단계 1] 이슈 #6 카테고리 추천 정확도 개선 — 프롬프트 강화 + score 가중치 투입:
  A) src/lib/upload-readiness-filler.ts autoFillCategory:
     - 프롬프트에 명시적 카테고리 구분 안내 추가 (잠옷/홈웨어·파자마·속옷 → "여성의류 > 잠옷/홈웨어", 니트 텍스처 ≠ 잠옷)
     - few-shot 예시 3~5개 추가 (잠옷 세트/파자마 세트/홈웨어 쇼트 → 올바른 카테고리명)
     - score() 가중치 투입: d3 substring 일치 +20 → +35 (형태 특이적 단어 "잠옷·파자마·홈웨어·속옷" 명시 매칭 시 더 큰 가중치)
  B) 라이브 검증:
     - 홈웨어 잠옷세트 카드 + 파자마 세트 카드 재테스트 → 50021261(여성의류>니트>베스트) 대신 맞는 잠옷/홈웨어 카테고리 추천 확인
     - 기존 필터 통과 상품(가습기, 매직 등)은 이전 정확도 동일하게 나오는지 회귀 검증

[단계 2] 이슈 #3 점검 (선택적, 코스메틱):
  증상: 92점 S등급 카드에서 AI 채우기 버튼이 일시적으로 재표시되는 순간 포착
  점검:
    1. UploadReadinessWidget.tsx ProductRow rendering condition 재검토
    2. handleAutoFillApplied → handleRefresh → loadProducts 흐름에서 stale prop 일시 사용 여부 console.log
    3. 필요 시 useMemo 의존 배열에 product.id+score+completedItems 추가
  우선순위: 낮음 (데이터 손실 없음) — 이슈 #6 마무리 후 여유 있을 때

[단계 3] E-15 전체 완료 처리:
  완료 기준:
    - 이슈 #6 개선 후 홈웨어/파자마 대상 맞는 카테고리 추천 확인
    - 기존 적용 카드 회귀 안 일어난 것 검증
  마무리:
    - PROGRESS.md / ROADMAP.md / SESSION_LOG.md 세 파일 갱신
    - PROGRESS.md 상태 라인 "E-15 전체 완료"로 변경
    - 다음 작업 후보 결정 (E-1 빌더 AEO 강화 vs E-12 Discord 리뷰 알림 vs E-13B 알림톡 활성화)
    - 새 인계 메시지 작성 (다음 새 채팅 시작용)

작업 분할 권장 (컨텍스트 한계 회피):
  - 본 채팅: 단계 1 (이슈 #6 프롬프트 + score 강화) + 라이브 검증 + 단계 3 (E-15 완료 처리)
  - 단계 2 (이슈 #3 점검)는 선택적이므로 여유 있을 때만 진행, 아닌 경우 다음 채팅으로 이월

참고 (Chrome MCP 패턴 + 주의사항):
- AutoFillModal은 inline style (Tailwind 아님) — 셀렉터: getComputedStyle(d).position === 'fixed' && cs.zIndex === '1000'
- AI 호출 비용 0원 (Groq 3키 합산 43,200/일)
- 사용 모델 llama-3.1-8b-instant — 프롬프트에 명시적 안내 + few-shot 예시 필수
- 코드 수정 후 반드시 `npx tsc --noEmit` 0 errors 확인
- 세션별 자세한 기록은 KKOTIUM_SESSION_LOG.md에 작성, PROGRESS.md/ROADMAP.md는 핵심 요약만 유지
```

---

## 📜 Part 2 잔여·2용 메시지 (참고용 보존 — deprecated, 위 "잔여·3용" 메시지를 대신 사용)

---

## 📜 Part 2 잔여용 메시지 (참고용 보존 — deprecated, 위 "잔여·2용" 메시지를 대신 사용)

## 🎯 다음 새 채팅 시작 메시지 (E-15 Block D Part 2 잔여용 — 2026-05-01 후반 갱신)

> **Part 2 단계 2 메인 + 단계 3 Edge case ✅ 완료 (2026-05-01 후반 세션)**
> - 단계 2: 3개 DRAFT 카드 자동 채우기 라이브 검증 — 인테리어 미니 가습기(52→76), 모나미 펭수 유성매직(48→84), 차량용 햇빛가리개(48→60) — 총 +72점 증가
> - 단계 3: Edge case A·B·C·D 모두 PASS (코드 명시적 분기 확인 + 라이브)
> - 상세는 PROGRESS.md "2026-05-01 세션 요약 — E-15 Block D Part 2 후반" 섹션 참조
>
> **발견된 미결 이슈 (본 채팅 아이템)**:
> - 이슈 #1: 위젯 stat strip "평균 점수"가 51점으로 고정 표시 (실제 약 64점). avgScore 계산식은 정확하나 재계산/재렌더 지연 의심
> - 이슈 #2: 카테고리 AI가 동일 코드(50003307→50003307) 추천 시 자동 거부 로직 누락. 셀러 혼란 원인
> - 이슈 #3: 무타공 두꺼비집가리개(ready90, 92점) 카드에서 AI 채우기 버튼이 일시적으로 재표시되는 정황 포착 (코스메틱 이슈, 데이터 손실 없음). 타이밍 문제 의심 — 자세한 원인 추정은 PROGRESS.md 이슈 #3 섹션 참조
>
> **아래 코드 블록을 그대로 복붙해서 사용** — 잔여 = 3개 미적용 카드 + 이슈 #1·#2·#3 점검/수정 + E-15 전체 완료 처리.

```
꽃틔움 가든 개발 이어서 진행합니다. KKOTIUM_PROGRESS.md, KKOTIUM_ROADMAP.md를 읽고
E-15 Block D Part 2 잔여 (3개 미적용 DRAFT 카드 일괄 + 이슈 #1·#2 수정 + 이슈 #3 점검 + E-15 전체 완료 처리) 작업을 시작해주세요.

작업 시작 전 필수 (작업원칙 21+23+24 강화 적용):
1. (a) git rev-parse HEAD origin/main → 두 값 같은지 확인
   (b) git --no-pager log --oneline -10 → 이번 메시지에 명시되지 않은 commit 있으면 읽고 대응
   (c) git status가 깨끗해야 함 (있으면 먼저 검토)
   (d) 이 메시지의 가정과 실제가 다르면 즉시 정직 보고 후 재분석
   (e) 본 세션 commit은 그 turn 안에서 push까지 한 줄로 완료 (작업원칙 24번)
2. KKOTIUM_PROGRESS.md "2026-05-01 세션 요약 — E-15 Block D Part 2 후반" 섹션 정독 — 특히 [이슈 #1] [이슈 #2] [이슈 #3] 세부 내용
3. KKOTIUM_ROADMAP.md 본 섹션 재확인
4. 관련 코드 파일 관찰:
   - src/components/dashboard/UploadReadinessWidget.tsx (avgScore 계산 로직 확인, line ~830)
   - src/app/dashboard/page.tsx (handleAutoFillApplied → handleRefresh 흐름 확인)
   - src/app/api/upload-readiness/auto-fill/route.ts (POST/PATCH 둘 다 카테고리 동일 추천 거부 로직 추가 대상)
   - src/lib/upload-readiness-filler.ts (autoFillCategory 로직 관찰, 수정은 route.ts 쪽이 깔끔)
5. 작업 계획 브리핑 후 꽃졔님 승인 받고 시작

[단계 1] 잔여 3개 카드 일괄 자동 채우기 (라이브 검증):
  - 하트 리본 누빔 여성 파자마 세트 (38점 추정)
  - 초강력 스텐 파워 변기건 펌프 일체형 (38점 추정)
  - 리본 포인트 홈웨어 잠옷세트 (38점 추정)
  계획: AI 채우기 버튼 클릭 → suggestions 확인 → 적용 → 점수 갱신 확인
  목표: 8개 DRAFT 평균 점수 70+점 도달

[단계 2] 이슈 #1 수정 — 위젯 stat strip 평균 점수 재계산 트리거:
  증상: 3개 카드 적용 후에도 "평균 점수"가 51점으로 고정 표시
  조사 단계:
    1. dashboard/page.tsx의 handleAutoFillApplied → handleRefresh 흐름 추적
    2. UploadReadinessWidget의 useMemo 의존 배열 검증
    3. 필요 시 router.refresh() 또는 명시적 재계산 트리거 추가
  검증: 적용 전후 stat strip 실시간 갱신 확인

[단계 3] 이슈 #2 수정 — 카테고리 동일 추천 자동 거부:
  이중 방어선 구현:
    A) src/lib/upload-readiness-filler.ts autoFillCategory 안에서 suggestion.after === product.naverCategoryCode면 null 반환
    B) src/app/api/upload-readiness/auto-fill/route.ts PATCH 핸들러에서 update.naverCategoryCode === product.naverCategoryCode면 rejected에 push, reason="동일 코드 추천"
  검증: 차량용 카드 외에도 동일 입력 케이스로 null/rejected 나오는지 검증 (jest 없으면 라이브 API curl)

[단계 4] 이슈 #3 점검 — ready90 카드 재표시 점검 (선택적):
  증상: 92점 S등급 카드에서 AI 채우기 버튼이 일시적으로 재표시되는 순간 포착
  점검 절차:
    1. UploadReadinessWidget.tsx ProductRow rendering condition 재검토
    2. handleAutoFillApplied → handleRefresh → loadProducts 흐름에서 stale prop 일시사용 여부 console.log
    3. 필요 시 useMemo 의존 배열에 product.id+score+completedItems 추가해 재계산 강제
  우선순위: 낮음 (코스메틱, 데이터 손실 없음) — 이슈 #1·#2 수정 이후 여유 있을 때 점검

[단계 5] E-15 전체 완료 처리:
  완료 기준:
    - 평균 점수 70+ 도달
    - stat strip 실시간 갱신 정상
    - 카테고리 동일 추천 거부 동작
  마무리:
    - PROGRESS.md와 ROADMAP.md E-15 전체 "✅ 완료" 자리에 기록
    - 다음 작업 후보 결정 (E-1 빌더 AEO 강화 vs E-12 Discord 리뷰 알림)

작업 분할 권장 (컨텍스트 한계 회피):
  - 본 채팅: 단계 1 (3개 카드) + 단계 2 (이슈 #1 수정)까지
  - 다음 채팅: 단계 3 (이슈 #2) + 단계 4 (E-15 완료 처리) + 다음 작업 결정
  - 또는 단계별 종료 판단은 꽃졔님이 세션 중 지시

참고 (Chrome MCP 패턴):
- AutoFillModal은 inline style (Tailwind 아님) — 셀렉터: getComputedStyle(d).position === 'fixed' && cs.zIndex === '1000'
- AI 호출 비용 0원 (Groq 3키 합산 43,200/일)
- 사용 모델 llama-3.1-8b-instant — 짧은 상품명은 name_length 재작성 검증 실패 가능 (알려진 이슈, 정상)
- DB ID 참고 (3개 잔여 카드):
  · 하트 리본 누빔 파자마: cmn7984jx0005130klv0...
  · 초강력 스텐 파워 변기펌프: cmn7984ff0001130kjfj...
  · 리본 포인트 홈웨어: cmmvx028n0001jmv3vr8...
```

---

## 📜 Part 2 나머지용 메시지 (참고용 보존 — deprecated, 위 "Part 2 잔여용" 메시지를 대신 사용)
>
> **버그 원인 재해석**: ROADMAP에 적혀 있던 "PATCH가 shipping_template을 잘못 계산"은 잘못된 진단이었으며, 실제로는 반대로 PATCH가 정답이고 **위젯이 `DashboardProduct` 타입과 `loadProducts` 매핑에 `shippingTemplateId`/`images` 필드를 누락해서 잘못 계산**하고 있었음. 단일 파일 수정으로 해소 완료.
>
> **아래 코드 블록을 그대로 복붙해서 사용** — Part 2 나머지 = 단계 2 나머지 3개 카드 + 단계 3 Edge case 4개.

```
꽃틔움 가든 개발 이어서 진행합니다. KKOTIUM_PROGRESS.md, KKOTIUM_ROADMAP.md를 읽고
E-15 Block D Part 2 나머지 (3개 DRAFT 카드 일괄 자동 채우기 + Edge case 4개) 작업을 시작해주세요.

작업 시작 전 필수 (작업원칙 21+23+24 강화 적용):
1. (a) git rev-parse HEAD origin/main → 두 값 같은지 확인
   (b) git --no-pager log --oneline -10 → 이번 메시지의 명시되지 않은 commit 있으면 읽고 대응
   (c) git status가 깨끗해야 함 (있으면 먼저 검토)
   (d) 이 메시지의 가정과 실제가 다르면 즉시 정직 보고 후 재분석
   (e) 본 세션 commit은 그 turn 안에서 push까지 한 줄로 완료
2. KKOTIUM_PROGRESS.md "2026-05-01 세션 요약 — E-15 Block D Part 2" 섹션 정독 — 특히 [단계 1 완료] 세부 내용
3. KKOTIUM_ROADMAP.md 본 섹션 재확인
4. 관련 코드 파일 관찰:
   - src/app/dashboard/page.tsx (Part 2 단계 1에서 수정 완료 — 참고용)
   - src/components/dashboard/AutoFillModal.tsx (모달 UI)
   - src/components/dashboard/UploadReadinessWidget.tsx (위젯 구조)
   - src/app/api/upload-readiness/auto-fill/route.ts (POST/PATCH 핸들러 — 수정 불필요, 참고용)
5. 작업 계획 브리핑 후 꽃졔님 승인 받고 시작

Part 2 나머지 작업 범위 (2단계):

[단계 2 나머지] 3개 DRAFT 카드 일괄 검증 (코드 변경 없음, 라이브 검증만):
현재 상태 (2026-05-01 세션 종료 당시) 평균 점수 = 58점. 다음 3개 카드 처리 계획:
  - 인테리어 미니 가습기 사무실 탁상 가습기 (52점)
  - 모나미 펭수 유성매직 둥근닙 24색 세트 (48점)
  - 차량용 햇빛가리개 자동차 (48점)
  계획: AI 채우기 버튼 클릭 → SEO 태그/카테고리 매핑 제안 확인 → 적용 → 점수 갱신 확인
  목표: 평균 점수 70+점 도달

[단계 3] Edge case 4개 검증:
- A) AI 답변 모두 검증 실패 → "자동 채우기 가능 항목 없음" 안내만 + manual 카드만
- B) Manual-only만 남은 카드 → AI 채우기 버튼 숨김 (hasAnyAutofillable)
- C) 체크박스 모두 해제 → 적용 버튼 비활성화 (totalSelected === 0)
- D) 네트워크 오류 → phase=error 처리 + 닫기 가능

완료 기준:
- 평균 점수 70+점 도달 시 E-15 전체 완료 처리
- PROGRESS.md/ROADMAP.md 업데이트 + commit + push (작업원칙 24번)
- 다음 작업 후보 평가: E-1 빌더 AEO 강화 vs E-12 Discord 리뷰 알림 vs 다른 작업

참고 (Chrome MCP 패턴):
- AutoFillModal은 inline style (Tailwind 아님) — 셔렉터: getComputedStyle(d).position === 'fixed' && cs.zIndex === '1000'
- AI 호출 비용 0원 (Groq 3키 합산 43,200/일)
- 사용 모델 llama-3.1-8b-instant — 짧은 상품명은 name_length 재작성 검증 실패 가능 (알려진 이슈, 정상)
```

---

## 📜 Part 2 전체 메시지 (참고용 보존 — deprecated, 위 "Part 2 나머지용" 메시지를 대신 사용)

## 🎯 다음 새 채팅 시작 메시지 (E-15 Block D Part 2용 — 2026-04-30 갱신)

> **Part 1 ✅ 완료 (2026-04-30)**: 첫 DRAFT 카드(60점, 무타공 두꺼비집가리개)에서 시나리오 1~6 라이브 검증 통과. 1개 상품 60→82점 위젯 갱신. **발견된 버그**: PATCH newScore(92) ≠ 위젯 reload(82) 차이 10점 (shipping_template 일관성). 상세는 PROGRESS.md "Phase E+ Sprint 6 진행 중 (E-15 Block D Part 1)" 섹션 참조.
>
> **아래 코드 블록은 Part 2용 새 메시지** — Part 2 = 8개 DRAFT 일괄 검증 + Edge case 4개 + score 일관성 버그 수정. 아래 코드 블록을 그대로 복붙해서 사용.

```
꽃틔움 가든 개발 이어서 진행합니다. KKOTIUM_PROGRESS.md, KKOTIUM_ROADMAP.md를 읽고
E-15 Block D Part 2 (8개 DRAFT 일괄 검증 + Edge case 4개 + score 일관성 버그 수정) 작업을 시작해주세요.

작업 시작 전 필수 (작업원칙 21+23+24 강화 적용):
1. (a) git rev-parse HEAD origin/main → 두 값 같은지 확인 (단순 git log 라벨과 반드시 교차 확인)
   (b) git --no-pager log --oneline -10 → Part 1 commits (docs Part 1 + redeploy chore) 확인. 이 메시지에 명시되지 않은 commit 있으면 읽고 대응
   (c) git status에 "ahead of origin/main" 또는 "modified" 있으면 직전 채팅이 push 못한 잔재 → 절대 덮어쓰지 말고 먼저 검토
   (d) 이 메시지의 가정과 실제가 다르면 즉시 정직 보고 후 재분석 (작업원칙 23번)
   (e) 본 세션 commit은 그 turn 안에서 push까지 한 줄로 완료 (작업원칙 24번)
2. KKOTIUM_PROGRESS.md "Phase E+ Sprint 6 진행 중 (E-15 Block D Part 1)" 섹션 정독 — 특히 "발견된 마이크로 조정 후보 [Bug #1]"
3. KKOTIUM_ROADMAP.md 본 섹션 재확인 + "E-15 Block D" 표 행 재확인
4. 관련 코드 파일 read:
   - src/app/api/upload-readiness/auto-fill/route.ts (PATCH 핸들러 마지막 부분 — 수정 대상)
   - src/lib/upload-readiness.ts (calcUploadReadiness 로직)
   - src/components/dashboard/AutoFillModal.tsx (Part 1 정상 동작 확인, 참고용)
   - src/components/dashboard/UploadReadinessWidget.tsx (자동 갱신 로직)
5. 작업 계획 브리핑 후 꽃졔님 승인 받고 시작

Part 2 작업 범위 (3단계):

[단계 1] score 일관성 버그 수정 (최우선):
- 증상: PATCH newScore vs 위젯 reload 점수 차이 10점 (shipping_template weight)
- 수정 위치: src/app/api/upload-readiness/auto-fill/route.ts PATCH 핸들러
- 권장: prisma.product.update 후 다시 prisma.product.findUnique로 fresh fetch한 product로 calcUploadReadiness 호출
- 1상품 (이미 적용된 60→82점 상품)에서 재검증

[단계 2] 8개 DRAFT 일괄 검증:
- 각 카드 AI 채우기 순차 클릭 (Part 1에서 1개 완료, 7개 남음)
- 위젯 TOP 5만 표시 → 정원 창고에서 전체 보기 경로 고려
- 평균 점수 상승 측정 (목표: 42 → 70~80점)
- 각 적용 전후 applied/rejected 메트릭스 기록
- 다른 상품에서 상품명 재작성 radio (4모드) 렌더 검증

[단계 3] Edge case 4개:
- A) AI 답변 모두 검증 실패 → "자동 채우기 가능 항목 없음" 안내만 + manual 카드만
- B) Manual-only 만 남은 카드 → AI 채우기 버튼 숨김 (hasAnyAutofillable)
- C) 체크박스 모두 해제 → 적용 버튼 비활성화 (totalSelected === 0)
- D) 네트워크 오류 → phase=error 처리 + 닫기 가능

안전 장치 재확인 (절대 우회 금지):
- POST(미리보기) + PATCH(적용) 2단계 분리 구조 유지
- AutoFillModal이 manual-only 4개를 PATCH로 보내지 않는지
- 카테고리 PATCH NAVER_CATEGORIES_FULL 이중 방어선 동작

컨텍스트 관리:
- 본 세션은 Part 2 + score 버그 수정 + 8개 일괄 + Edge case 4개만 진행
- 완료 시 PROGRESS.md / ROADMAP.md 갱신 + git push (작업원칙 24번)
- 꽃졔님이 Block D 완료 후 별도로 웹 브라우저 전체 디자인 시각 검토 예정 — 코드 변경은 그 세션에서

참고:
- AutoFillModal.tsx는 inline style (Tailwind 아님) — Chrome MCP 셀렉터는 getComputedStyle(d).position === 'fixed' && cs.zIndex === '1000' 패턴
- AI 호출 비용 0원 (Groq 3키 합산 43,200/일)
- 사용 모델 llama-3.1-8b-instant — 짧은 상품명은 name_length 재작성 검증 실패 가능 (알려진 이슈, 정상)
```

---

## 📜 Part 1용 원본 메시지 (참고용 보존 — deprecated, 위 Part 2 메시지를 대신 사용)

## 🎯 다음 새 채팅 시작 메시지 (E-15 Block D 라이브 검증용 — 2026-04-30 작성)

다음 세션 시작 시 그대로 복붙해서 사용:

```
꽃틔움 가든 개발 이어서 진행합니다. KKOTIUM_PROGRESS.md, KKOTIUM_ROADMAP.md를 읽고
E-15 Block D (Chrome MCP 라이브 검증) 작업을 시작해주세요.

작업 시작 전 필수 체크 (작업 원칙 21+23+24 강화 적용):
1. **(a)** `git rev-parse HEAD origin/main` 두 값 비교 — 같은지 확인 (단순 git log 결과의 origin/main 라벨만 보고 동기화 판단 금지)
   **(b)** `git --no-pager log --oneline -10` 으로 이 시작 메시지에 명시되지 않은 commit이 있는지 확인. 기준 HEAD = b6e6da3 또는 그 이후 (이 안내 문서 다음에 조그 더 추가 commit이 있을 수 있음 — 있으면 읽고 대응)
   **(c)** `git status`에 "ahead of origin/main" 또는 "modified" 항목이 있으면 직전 채팅이 push 못 한 잔재 가능성 — 절대 덮어쓰지 말고 먼저 내용 검토
   **(d)** 이 시작 메시지에 "HEAD = X" 같은 명시적 가정이 있어도 (a)(b)(c) 결과와 다르면 즉시 정직 보고 후 재분석. 이미 완료된 작업을 다시 시도하지 않기 (작업원칙 23번)
   **(e)** 본 세션에서 commit 한 경우 그 turn 안에서 반드시 push까지 한 줄 명령으로 완료하기 (작업원칙 24번) — 다음 채팅이 본 작업을 볼 수 있으려면 push 필수
2. KKOTIUM_PROGRESS.md 정독 — 특히 "2026-04-30 Phase E+ Sprint 6 완료 세션 (E-15 Block A+B+C)" 부분의 동작 흐름 시퀀스 숙지
3. KKOTIUM_ROADMAP.md 정독 — "E-15 ITEM_TO_TAB 매트릭스" + "안전 장치 8개" + 본 시작 메시지 섹션 재확인
4. 관련 코드 파일 read — 시그니처만 확인 (라이브 검증 전이라 수정하지 말 것):
   - src/components/dashboard/AutoFillModal.tsx (Block C 신규)
   - src/components/dashboard/UploadReadinessWidget.tsx (Block C 통합)
   - src/app/api/upload-readiness/auto-fill/route.ts (Block B POST/PATCH)
   - src/lib/upload-readiness-filler.ts (Block A 7개 자동 함수)
5. 작업 계획 브리핑 후 꽃졔님 승인 받고 시작

Block D 라이브 검증 시나리오 (Chrome MCP):
- [시나리오 1] dev 서버 상태 확인 (npm run dev 이미 실행 중일 수 있음 — 먼저 확인하고 없으면 꽃졔님께 실행 요청)
- [시나리오 2] http://localhost:3000/dashboard 접속 → "등록 준비 명령탑" 위젯에서 8개 DRAFT 카드 확인
- [시나리오 3] 첫 카드의 "AI 채우기" 버튼 클릭 → 모달 열림 → loading state 스크린샷
- [시나리오 4] suggestions 도착 후 모달 ready phase 렌더 확인 (3 섹션):
  A) 상품명 재작성 라디오 (1개만 선택, 첫 항목 기본 선택)
  B) 키워드/태그/카테고리 독립 체크박스 (모두 체크됨)
  C) Manual-only 카드 (노란 테두리, 클릭하면 씨앗심기 탭으로 deep-link)
- [시나리오 5] "N개 적용" 클릭 → PATCH 응답 확인 → done 화면의 점수 상승 표시 (예: 42 → 70+점)
- [시나리오 6] 모달 자동 닫힌 후 위젯 카드 점수가 실제로 갱신되는지 확인 (Dashboard handleRefresh 연결 검증)
- [시나리오 7] 8개 DRAFT 모두 시도 → 평균 점수 상승 측정 (목표: 42 → 70~80점)
- [시나리오 8] Edge case A: AI 답변이 모두 검증 실패 → 모달이 "자동 채우기 가능한 항목이 없습니다" 안내만 표시
- [시나리오 9] Edge case B: Manual-only 4개만 남은 카드 → AI 채우기 버튼 숨겨지는지
- [시나리오 10] Edge case C: 체크박스 모두 해제 → 적용 버튼 비활성화
- [시나리오 11] Edge case D: 네트워크 오류 시 phase=error 정상 처리 + 닫기 가능

안전 장치 재확인 (절대 우회하지 말 것):
- AI 결과는 POST(미리보기) + PATCH(적용) 2단계로 이미 분리되어 있음 — 이 구조 절대 우회 금지
- AutoFillModal이 manual-only 4개를 PATCH로 보내지 않는지 검증 (Block A FILLABLE_ITEMS만 허용)
- 카테고리 코드는 PATCH에서도 NAVER_CATEGORIES_FULL.some(c.code === code) 이중 방어선 존재 — 동작 확인
- 라이브 결과에서 버그 발견 시 가능성 높은 원인: (1) 한국어 검증 실패 (2) 상품명 25~50자 범위 안 맞음 (3) 카테고리 매칭 실패. 해당 시 Block A/B의 해당 부분만 edit_file로 수정 (write_file 전체 교체 금지)

컨텍스트 관리:
- 본 세션은 Block D + 검증 결과 기반 마이크로 조정만 진행
- 꽃졔님이 Block D 완료 후 별도로 웹 브라우저 전체 디자인(위젯 배치, 색상 통일성 등) 시각 검토 예정
- 완료 후 PROGRESS.md / ROADMAP.md 갱신 + git push로 마무리
- 새 채팅에서도 이어갈 수 있도록 인계 메시지 항상 갱신

참고:
- AutoFillModal.tsx 동작 구조: mountEffect 자동 POST → 4 phase (loading→ready→applying→done|error) → onApplied()가 dashboard.handleRefresh()를 트리거
- AI 호출 비용 0원 (Groq 무료 14,400/key/일, 3키 합산 43,200/일)
- 사용 모델 llama-3.1-8b-instant — 한국어 출력 안정성 약점 있음. 라이브에서 "name_length" 재작성이 검증 실패로 처리될 가능성 있음 (디버그 대상)
```

---

## Phase A: 무료 기능 전부 적용 + 배포 ✅ 완료 (2026-04-10)

| Task | 상태 | 내용 |
|------|------|------|
| A-1 | ✅ | 엑셀 다운로드 전 검증 모달 |
| A-2 | ✅ | 검색 조련사 AI 상품명 역반영 |
| A-3 | ✅ | 주소록 API 연동 |
| A-4 | ✅ | deliveryInfo 역추출 |
| A-5 | ✅ | 카테고리별 필수 속성 가이드 |
| A-6 | ✅ | 꿀통지수 키워드 검색량 가중치 |
| A-7 | ✅ | 마진 위험 Discord 고도화 |
| A-8 | ✅ | 네이버 DataLab 트렌드 연동 (Perplexity → silent fallback) |
| A-9 | ✅ | 오늘 할 일 지능화 확장 |
| A-10 | ✅ | SEO 2026 AEO 업데이트 |
| A-11 | ✅ | Vercel 배포 설정 |
| A-12 | ✅ | 프로덕션 빌드 검증 + 배포 |

---

## Phase B: 매출 발생 후 운영 자동화 ✅ 완료 (2026-04-12)

| Task | 상태 | 내용 | 완료일 |
|------|------|------|--------|
| B-1 | ✅ | 주문 관리 v3 (상태필터/드로어/동기화) | 2026-04-11 |
| B-2 | ✅ | 발주확인 + 송장등록 반자동화 | 2026-04-12 |
| B-3 | ✅ | 정원 창고 네이버 실시간 동기화 버튼 + 불일치 뱃지 | 2026-04-12 |
| B-4 | ✅ | 상품 자동 품절 처리 (cron/daily) | 2026-04-12 |
| B-5 | ✅ | 주간 수익 보고서 자동 생성 → Discord | 2026-04-12 |

---

## Phase C: 성장기 확장 (진행 중 — 2026-04-14 전략 리서치 기반 재정렬)

> 원칙: 무재고 1인셀러 + 무료 기능 최대 활용 + 검색 노출 직결 순서
> 전략 근거: `260413-꽃틔움 가든 개선안 검증과 2026년 전략 로드맵`

### Sprint 1: 등록 품질 기반 (무료, 즉시 착수)

| Task | 상태 | 내용 | 상세 |
|------|------|------|------|
| C-6 | ✅ | 원산지코드 518건 자동완성 | `naver-origin-codes.ts` 로컬 상수, 씨앗심기 검색 UI, 복수원산지+수입자 지원, originAreaCode 매핑 |
| C-7 | ✅ | 카테고리 정합성 검증 + 속성 매핑 | 4,993건 대조 검증, 카테고리별 필수/선택 속성 매핑 테이블 구축 |
| C-8 | ✅ | 상품 속성 완성도 체커 | 카테고리별 필수 속성 점수화, 미입력 안내, 씨앗심기+정원창고+검색조련사 표시 |

### Sprint 2: API 전환 (무료, 핵심 업그레이드)

| Task | 상태 | 내용 | 상세 |
|------|------|------|------|
| C-1 | ✅ Step 1~3 | 커머스 API 직접 상품 등록 | product-builder.ts, register API, NaverRegisterModal, 플로팅바 버튼, C-8 체커 내장 |

### Sprint 3: AI 최적화 + 운영 모니터링 (무료)

| Task | 상태 | 내용 | 상세 |
|------|------|------|------|
| C-2 | ✅ | AEO 상세페이지 Q&A + FAQ 자동 생성 | Gemini/Groq Q&A 구조화, AI 쇼핑 에이전트 대응 |
| C-12 | ✅ | **네이버 오픈 API + Groq 실시간 트렌드 분석** | 네이버 쇼핑검색/DataLab API → Groq AI 컨텍스트 주입 → 실시간 경쟁/트렌드 분석 → 꼬띄 추천/검색 조련사 강화 |
| C-9 | ✅ | 굿서비스 점수 대시보드 | 3축 게이지 + 등급 시뮬레이터 + 개선팁 + API |

### Sprint 4: 수익 최적화 + 확장 (무료)

| Task | 상태 | 내용 | 상세 |
|------|------|------|------|
| C-4 | ✅ | 수익성 분석 대시보드 | 유입경로별 수수료(5.73% vs 3.91%) + 마진 분포 + 상품별 순위 |
| C-10 | ✅ | 배송 자동화 확장 | 자동 발주확인(cron 2h) + 클레임 API(취소/반품/교환 승인·거부) + 주문페이지 버튼 |
| C-3 | ✅ | 대량 등록 배치 파이프라인 | 배치 API(20개 제한, 2초 rate limit) + 기존 NaverRegisterModal 배치 UI 활용 |
| C-11 | ✅ | 씨앗 심기 UX 2-Panel Split | 좌측 6탭(기본/옵션/이미지/배송/SEO/혜택) + 우측 38% sticky 고정패널 |
| **C-5** | **✅** | **꼼띠 추천 v2** | **TOP5+소싱보관함+검색량 (2026-04-12 완료)** |

### Phase D: 중기 개선 (Phase C 완료 후 — 즉시 착수 가능)

> 원칙: 검색 노출 직결 + 운영 효율 + 무료 기능 우선

| Task | 상태 | 내용 | 상세 |
|------|------|------|------|
| D-1 | ✅ | 상품명 품질 체크 | 13개 검증룰 (50자 제한, 판매조건 금지어 25개, 수식어 17개, 참조문구, 특수문자, 단어반복, 셀러명, 브랜드위치, 키워드포함, 괄호짝, 앞15자 키워드, 조사과다), S~D 등급, 씨앗심기+검색조련사 적용, 스토어명 자동로딩 |
| D-2 | ✅ | 대시보드 위젯 레이아웃 정리 | GoodService+Profitability 2열 그리드, MarketTrend 전폭, 빠른 작업 바로가기 4개 (씨앗심기/검색조련사/주문관리/꿘통사낥터) |
| D-3 | ✅ | 경쟁 상품 모니터링 | competition-monitor.ts 스냅샷/변화감지, /api/competition GET+POST, CompetitionMonitorWidget 대시보드 위젯, 가격위치바+경쟁상품+변동률, daily cron 자동스캠, Discord PRICE_CHANGE 알림 |
| D-4 | ✅ | Naver DataLab API 직접 통합 | /api/datalab GET period=7/30/90, 10개 카테고리 3개씩 배치 호출, DataLabTrendWidget 스파크라인 차트+기간선택기+상승/하락 배지, Perplexity 대체 완료 |
| D-5 | ✅ | 씨앗 심기 탭 UX 추가 개선 | 6개 탭별 완성도 동적 판단 (basic: 카테고리+상품명+판매가, image: 대표이미지, option: 옵션없음=완료, shipping: 템플릿연결, seo: 키워드+원산지, benefit: 기본값=완료), 초록점/빨간점+연분홍배경 실시간 반응 |

### 장기 로드맵 (매출 성장 후)

| 항목 | 내용 | 트리거 시점 |
|------|------|----------|
| 알림톡 자동화 활성화 | E-13B 2단계: 솔라피 키 입력 → 구매확정/리뷰/한달리뷰 3단계 자동발송 | 월 주문 50건+ |
| 크리마/브이리뷰 검토 | 전문 리뷰 솔루션 도입 (AI 감정분석, 외부채널 연동) | 월 매출 500만원+ |
| N배송 + 반품안심케어 연계 | 네이버배송 가입 시 반품안심케어 수수료 네이버 지원 | 물류 안정화 후 |
| 5만개 상품 제한 관리 | 2025년부터 50만→5만개로 축소 | 상품 1,000개+ |
| 멀티채널 확장 | 쿠팡/11번가 연동 (현재 네이버 단일 채널 집중) | 월 매출 1,000만원+ |

### Phase E: 다음 단계 확장 (진행 중)

> 확정 순서: E-7 → E-1 → E-3 → E-8 → (Phase E+ Sprint 순서)

| Task | 상태 | 내용 | 상세 |
|------|------|------|------|
| **E-7** | **✅** | **꼬띠 소싱 추천봇 (1단계)** | DataLab 트렌드 → 키워드 검색량 → 경쟁분석 → BlueOcean 점수 → Groq AI → Discord 매일 발송 + 대시보드 위젯 + 도매꾹/도매매 바로검색 |
| **E-1** | **✅** | **상세페이지 템플릿 빌더** | 6종 블록 HTML 에디터(Hook/Image/Text/Q&A/Specs/Divider) + 실시간 미리보기 + AEO Q&A import + 씨앗심기 통합 + 저장 시 빌더 HTML 우선 |
| **E-3** | **✅** | **상품 수명 주기 대시보드** | 5단계 라이프사이클(NEW/GROWING/PEAK/DECLINING/ZOMBIE) + 좀비 리스크 바 + 판매속도 + 개선제안 + 대시보드 위젯 |
| **E-8** | **✅** | **도매 자동 매칭** | 도매꾹 OpenAPI 최소수량1 필터 + 도매매 검색 + 마진계산 + Discord/대시보드 통합 |
| E-5 | ⬜ 대기 | 실제 매출 데이터 기반 꼬띠 추천 고도화 | 판매 패턴 학습 (상품 20~30개 이상 후) |
| E-6 | ⬜ 대기 | 대시보드 위젯 드래그 정렬 + 카스터마이징 | 위젯 수 많아지면 의미 있음 |

---

### Phase E+: 리뷰·반품안심케어·카카오채널 전략 (2026-04-16 확정, 꽃졔님 승인 후 착수)

> 전략 근거: 4개 리서치 리포트 종합 (리뷰/반품안심케어/파워셀러 전술/카카오 비즈니스)
> 원칙: 무료 기능 우선 + 네이버 내장 기능 최대 활용 + 알림톡은 매출 성장 후 활성화
> 카카오 비즈니스 채널: 꽃틔움 KKOTIUM (`_xkfALG`) — 이미 개설 완료

#### Sprint 1: 즉시 효과 기반 구축 (비용 0원)

| Task | 상태 | 내용 | 상세 |
|------|------|------|------|
| **E-4** | **✅** | **반품안심케어 마진 시뮬레이터** | `return-care-fees.ts` 16개 카테고리별 수수료, DB `return_care_enabled`, Tab4 토글+배지, 마진계산기 건당비용, 꿀통지수 +15점 |
| **E-2C** | **✅** | **리뷰 적립금 최적 설정 가이드** | Tab6 적립금 권장값, 최적 설정 시 초록 변경, 마진계산기 건당비용, 꿀통지수 +10점 |

#### Sprint 2: 리뷰 성장 엔진 (비용 0원) — 2026-04-27 완료

| Task | 상태 | 내용 | 상세 |
|------|------|------|------|
| **E-2A** | **✅** | **리뷰 성장 트래커 + 운영 체크리스트** | `/api/review-growth` GET/PATCH, ReviewGrowthWidget 대시보드 위젯, 9항목 체크리스트 (자동감지: returnCare 30%↑/kakaoQrExposure), 단계 판정 (1: 0~10, 2: 11~50, 3: 51+), 작성률 목표 20~25%, 카카오 채널 칩 (single source of truth from `store_settings`), 친구 자산 안내 |
| **E-2B** | **✅** | **구매확정/리뷰 유도 타이밍** | orders/page.tsx 3단계 뱃지 — 배송완료D+1~3 (구매확정 유도/초록), 구매확정D+1~3 (리뷰 요청/파랑), 구매확정D+28~32 (한달 리뷰/보라). 알림톡 토스트 UI (E-13B 솔라피 미연동 안내). 7개 케이스 시뮬레이션 검증 완료 |

#### Sprint 3: 카카오 비즈니스 채널 통합 (비용 0원, 알림톡 발송 시만 건당 13원) — ✅ E-13A + E-13C 완료 (2026-04-29), E-13B는 월 50건+ 도달 시 활성화

| Task | 상태 | 내용 | 변경 파일 | 상세 |
|------|------|------|----------|------|
| **E-13A** | **✅** | **카카오 채널 설정 페이지** | `src/app/settings/kakao/page.tsx`, `src/components/kakao/KakaoChannelQR.tsx`, `src/app/api/kakao-settings/route.ts` | 채널 정보(꽃틔움 KKOTIUM / `_xkfALG` / pf.kakao.com URL) GET 자동 로드 + QR 미리보기(api.qrserver.com) + 4슬롯 컬러 팔레트 + 솔라피 4입력필드(API Key/Secret/PFID/발신번호 — E-13B 활성화 시 사용) + 7항목 가이드 체크리스트 + PATCH 저장. `store_settings` 5개 신규 필드(kakao_channel_id/kakao_channel_url/solapi_api_key/solapi_pf_id/sender_phone_number)가 single source of truth |
| **E-13B** | ⏳ 보류 | **알림톡 발송 API (2단계 접근)** | solapi-client.ts(신규), api/alimtalk(신규) | **1단계(현재)**: UI 진입점만 E-13A에 구현 — 솔라피 키 미입력 상태로 비활성. **2단계(트리거: 월 주문 50건+)**: 솔라피 가입→키 입력→즉시 활성화. 초기에는 네이버 내장 무료 리뷰 알림 + 인서트 카드로 충분 |
| **E-13C** | **✅** | **인서트 카드 생성기** | `src/app/ops/insert-card/page.tsx`, `src/lib/insert-card-colors.ts` | A6 105×148mm 실시간 미리보기 + 4슬롯 컬러 테마(E-13A 팔레트 상속) + HSL 헬퍼로 9가지 톤 자동 생성(`getCardColorScheme`: background/accentLight/accentMid/accentBorder/textOnLight/textOnDark/headerBg/shadow) + 카카오 QR(`store_settings.kakao_channel_id` 단일 소스) + 리뷰 적립금 3프리셋(텍스트 500/포토 1000/베스트 3000) + A4 4매 배치/A6 단일 + `window.print()` 기반 PDF 저장 |

#### Sprint 4: 등록 워크플로우 + 경쟁 정보 + AI 분석 강화 (비용 0원) — ✅ E-14 완료 (2026-04-29)

| Task | 상태 | 내용 | 변경 파일 | 상세 |
|------|------|------|----------|------|
| **E-14** | **✅** | **Upload Readiness Command Center (등록 준비 명령탑)** | `src/components/dashboard/UploadReadinessWidget.tsx` (신규), `src/app/dashboard/page.tsx`, `src/app/products/new/page.tsx`, `src/app/products/page.tsx` | DRAFT 상품 11점 키디니스 점수 정렬 TOP 5 + Stat strip(등록가능/작업필요/평균점수) + 부족 항목 칩 deep-link(`?focus={tab}` → 씨앗심기 5개 탭 자동 활성화) + 90+ "바로 등록" CTA(`?registerId=` → 정원창고 자동 체크 + NaverRegisterModal 자동 노출) + ITEM_TO_TAB 11개 매핑 + Loading skeleton + Empty state. 셀러 첫 등록 차단점 해소 = 매출 발생까지의 인지 부담 5단계 → 1클릭 |
| **E-10** | **✅** | **경쟁 진입장벽 모니터링 (옵션 A 간접 추정)** | `src/lib/competition-monitor.ts` (+135줄), `src/lib/sourcing-recommender.ts` (+79줄), `src/components/dashboard/CompetitionMonitorWidget.tsx` (+137줄), `src/components/dashboard/SourcingRecommendWidget.tsx` (+95줄), `src/app/api/competition/route.ts` (+9줄) | 원래 계획은 리뷰수/평점 직접 스크래핑이었으나, API 안정성 부족으로 **옵션 A 구현** — 4-factor proxy(topSellers 30%+priceSpread 30%+totalResults 25%+competitionLevel 15%) weighted score로 진입장벽 0~5점 추정. `estimateEntryBarrier()`가 single source of truth. BlueOcean breakdown 구조(`{ base, entryBarrierBonus, total }`)로 +15/+5/0 가산. CompetitionMonitorWidget에 5단계 막대+4-factor+Recommendation 패널, SourcingRecommendWidget에 Shield chip(LOW/MEDIUM/HIGH 3색)+BlueOcean breakdown+3 metrics. **라이브 검증 완료** — Block A+C 8개 상품 실제 데이터, Block B+D mock 주입로 3색 chip 모두 시각 확인. DB 스키마 변경 없음 |
| **E-11** | **✅** | **AI 리뷰 감정 분석 + SEO 재활용** | `src/lib/review-sentiment-analyzer.ts` (신규 348줄), `src/app/api/review-analysis/route.ts` (신규 78줄), `src/components/naver-seo/NaverSeoProductTable.tsx` (+368줄), 보강 커밋 `fb418bd` (+35줄) | `analyzeReviewSentiment()` Groq round-robin (3 keys) → Gemini (3 keys) → Anthropic fallback. SentimentResult: 감정 평판/비율 + topKeywords + suggestedTags + strengths/painPoints + aiSummary. ReviewAnalysisPanel이 SeoEditPanel 내부 SEO 태그 섹션 다음에 통합 — 보라색 점선 박스 + Textarea + AI 분석 시작 + 결과(AI 요약/감정분포/강점약점/키워드/추천태그 1클릭·일괄추가). **라이브 검증 완료**: 10개 mock 리뷰 “꽃 인테리어 소품”, 긍정 80% / 추천 태그 8개 (선물용·인테리어 등 구매자 언어 정확 추출). 보강: round-robin이 401/403/JSON 파싱 손상 fallback + max_tokens 1500→2500 + parseJsonSafe LLM JSON 정리. 비용: 0 KRW (Groq 무료 14400/키/하루 × 2키 = 28800/하루). |

#### Sprint 5: 알림 자동화 + 수수료 업데이트 (비용 0원)

| Task | 내용 | 변경 파일 | 상세 |
|------|------|----------|------|
| **E-12** | **Discord 리뷰 알림** | cron/daily, Discord 웹훅 | 자체 스토어 리뷰 페이지 폴링 → 신규 리뷰 감지 → Discord `#review-alert` 알림, 6번째 웹훅 채널 추가 |
| **기존개선** | **굿서비스+수수료 업데이트** | good-service.ts, 수익성 대시보드(C-4) | 톡톡 응답 기준 24h→12h **완료** (commit b5606c4), 2025.6.2 수수료 개편(유입수수료 2% 폐지→판매수수료 2.73%, 자체마케팅 유입 0.91%) **✅ 100% 완료** (Block 1·2·3·4 + redeploy + refactor + cleanup, 7 commits) |

#### Sprint 6: 등록 준비 AI 자동 채우기 (비용 0원) — 진행 중 (E-15 Block A+B+C 완료, Block D 대기)

| Task | 상태 | 내용 | 변경 파일 | 상세 |
|------|------|------|----------|------|
| **E-15 Block A** | ✅ | **AI 자동 채우기 라이브러리** | `src/lib/upload-readiness-filler.ts` (신규 622줄), `src/lib/upload-readiness.ts` (ABUSE_WORDS export) | 7개 자동 함수 (autoFillProductName 4모드 / autoFillKeywords / autoFillSeoTags / autoFillCategory) + autoFillAll 일괄 호출. Groq round-robin (3키) → Gemini fallback → Anthropic last-resort. parseJsonSafe (trailing comma + smart quotes + control chars 제거). 한국어·길이·어뷰징·반복 검증 다중 방어선. 카테고리는 NAVER_CATEGORIES_FULL 4,993건에서만 매칭 (AI 할루시네이션 거부). 커밋 527e381 |
| **E-15 Block B** | ✅ | **자동 채우기 API 엔드포인트** | `src/app/api/upload-readiness/auto-fill/route.ts` (신규 347줄) | POST = 미리보기 (DB 동기적 변경 없음) → suggestions[] + unfillable[]. PATCH = 셀러 승인 항목만 DB 적용 → newScore 응답. PATCH 시점에 이중 검증 재실행 (containsAbuse + hasRepeat3Plus + length 25~50 + 카테고리 NAVER_CATEGORIES_FULL.some 포함). AUTOFILLABLE_ITEMS 화이트리스트 밖의 항목 자동 거부. 커밋 fd31dd4 |
| **E-15 Block C** | ✅ | **AutoFillModal UI + 위젯 통합** | `src/components/dashboard/AutoFillModal.tsx` (신규), `src/components/dashboard/UploadReadinessWidget.tsx` (통합), `src/app/dashboard/page.tsx` (onRefresh 1줄) | 대시보드 위젯의 DRAFT 카드에 `Sparkles` 보라 버튼(`#7c3aed`) "AI 채우기" 추가. 클릭 → 모달 열림 → 4 phase (loading→ready→applying→done|error) 디스패치. ready phase 3섹션 (상품명 라디오 1개만 / 키워드·태그·카테고리 독립 체크박스 / Manual-only 도움 카드 deep-link). 적용 완료 시 점수 상승 표시 후 onApplied() → dashboard.handleRefresh() 트리거 → 위젯 자동 갱신. ready90 카드에는 AI 버튼 숨김, hasAnyAutofillable() 검사로 manual-only만 남은 카드도 숨김. 커밋 b2f9b4e |
| **E-15 Block D Part 1** | ✅ | **1상품 라이브 검증 완료** | (수정 없음 — 라이브 검증) | Chrome MCP로 첫 DRAFT(60점, 무타공 두꺼비집가리개)에서 시나리오 1~6 통과. POST/PATCH/위젯 갱신/모달 자동 닫힘 정상. **발견된 버그**: PATCH newScore(92) ≠ 위젯 reload(82) 차이 10점 = shipping_template weight (Part 2에서 수정) |
| **E-15 Block D Part 2 단계 1** | ✅ | **score 일관성 버그 수정** | src/app/dashboard/page.tsx | DashboardProduct 타입 + loadProducts 매핑에 shippingTemplateId/images/shippingFee 3개 필드 추가. 위젯의 calcUploadReadiness가 정확한 데이터로 계산 → PATCH=Widget 일치. 2026-05-01 세션에서 1개 카드(무타공 두꺼비집가리개) 92점 정상 표시 + 1개 카드(선물받은 특별한 일상) 62→86점 적용 확인 |
| **E-15 Block D Part 2 단계 2** | ✅ | **3개 카드 일괄 자동 채우기 라이브 검증** | (코드 변경 없음, 라이브 검증만) | 인테리어 미니 가습기 52→76 (+24) / 모나미 펭수 유성매직 48→84 (+36, 상품명 재작성도 검증) / 차량용 햇빛가리개 48→60 (+12). 총 +72점. AI 카테고리 추천 정확도 그라데이션: 완벽 > 수긍 > 실패 합리적. PATCH=위젯 점수 일치 ✅ — 단계 1 버그 수정 정상 반영 |
| **E-15 Block D Part 2 단계 3** | ✅ | **Edge case 4개 검증** | (코드 변경 없음, 코드 리뷰 + 라이브 검증) | A) AI 답변 모두 검증 실패 — AutoFillModal.tsx line 372–390 명시적 분기 ✅ PASS / B) Manual-only만 남은 카드 — hasAnyAutofillable + ready90 이중분기, 무타공 92점 행 라이브 검증 ✅ / C) 체크박스 모두 해제 — disabled + 회색 + cursor not-allowed ✅ / D) 네트워크 오류 — try-catch + setPhase('error'), Esc/배경/X로 종료 가능, INVALID_ID 라이브 검증 ✅ |
| **E-15 Block D Part 2 잔여 (1차)** | ✅ | **잔여 3개 카드 적용 투입 완료 + 이슈 #1 자연 해소 + 이슈 #4 위젯 노출 수정** | UploadReadinessWidget.tsx (정렬 ASC + slice 8) | 라이브 검증: 하트 리본(40→50), 초강력 스텐(48→70 상품명 재작성됨), 리본 포인트 홈웨어(48→80) — 8개 DRAFT 평균 67→**75점**. 이슈 #1 자연 해소 (실제 67점 시작 → 자동 갱신 정상). 이슈 #4 신규 발견: 위젯 정렬 점수 높은순(DESC) + slice(0,5)로 잔여 미적용 카드 노출 안 됨 → ASC + slice(0,8)로 수정. 상세는 PROGRESS.md "2026-05-01 세션 요약 — E-15 Block D Part 2 잔여" 참조 |
| **E-15 Block D Part 2 잔여·2** | ✅ | **이슈 #2+#5 카테고리 거부 로직 이중 방어선 구축 + 이슈 #6 신규 발견** | upload-readiness-filler.ts (+42/-8줄) · auto-fill/route.ts (+22줄) | autoFillCategory 거부 구조 3개 (#5 fallback 폐기, #2 동일 코드, #5 token overlap) + PATCH currentProduct fetch + 동일 코드 2차 방어선. 라이브 검증: 차량용 햇빛가리개(이슈 #2)와 변기펌프(이슈 #5) 차단 성공. 단 홈웨어 잠옷세트/파자마 카드에서 AI가 50021261(여성의류>니트>베스트) 추천 — 이슈 #6 신규 발견. 이슈 #6은 AI 추천 정확도 향상 영역 (주 작업 아닌 "틀린 추천 차단"은 완성). 자세한 기록은 KKOTIUM_SESSION_LOG.md 참조 |
| **E-15 Block D Part 2 잔여·3** | ✅ | **이슈 #6 부분 해결 (잠옷/홈웨어 + 차량용 카테고리 정확도 개선) + 이슈 #7 신규 발견 (변기펌프 AI 자기모순 매핑)** | upload-readiness-filler.ts (+83/-3 lines) | autoFillCategory 프롬프트 강화(잠옷/홈웨어/차량용 명시 가이드 + few-shot 5개) + score() 가중치 재조정(d4 서브스트링 매칭 +25→+60, 공백 제거 매칭 추가, 잠옷/욕실/차량 형태 특이적 보너스 +35 / 패널티 -30). 라이브 검증 3건 성공: 홈웨어 잠옷세트/파자마→50000826(여성의류>잠옷/홈웨어) high ✅, 차량용 햇빛가리개→50004092(자동차용품>인테리어용품>차량용햇빛가리개) ✅. 변기펌프는 50002707(CCTV) 매핑 — AI reason에 "욕실용품" 적고 실제는 CCTV 코드 잘못 출력한 자기모순 hallucination → 이슈 #7 인계. 자세한 기록은 KKOTIUM_SESSION_LOG.md 최상단 참조 |
| **E-15 Block D Part 2 잔여·4** | ⏳ | **이슈 #7 변기펌프 AI 자기모순 매핑 거부 로직 + 이슈 #3 점검 + E-15 전체 완료 처리** | upload-readiness-filler.ts score() 함수 (reason·실제코드 일치성 검증 추가) · UploadReadinessWidget.tsx + dashboard/page.tsx (이슈 #3 점검) | 이슈 #7: AI(groq-llama3) 가 reason에 적은 카테고리명과 실제 매핑 코드의 d2/d3/d4 이름 substring 교집합 0 일 때 강한 패널티 필요. 욕실용품 키워드(변기/펌프/뚫어뻥/배수구) + d2/d3 근접도 패널티 추가. 이슈 #3은 코스메틱 선택. 완료 시 Sprint 6 마무리 선언·다음 작업 후보 평가 (Sprint 1 E-4 반품안심케어 마진 시뮬레이터 vs E-2C 리뷰 보상 최적 설정 가이드). 자세한 인계 메시지는 상단 "다음 새 채팅 시작 메시지 (E-15 Block D Part 2 잔여·4용)" 섹션 참조 |

**E-15 동작 흐름 (레퍼런스)**:
```
[셀러] 대시보드 위젯의 DRAFT 카드(예: 42점) → "AI 채우기" 클릭
  → [모달] phase=loading, Loader2 회전
  → [API] POST /api/upload-readiness/auto-fill { productId } → suggestions[] + unfillable[]
  → [모달] phase=ready — 세 섹션 렌더:
      A) 상품명 재작성 라디오 (1개만 선택, 첫 항목 자동 선택)
      B) 키워드/태그/카테고리 독립 체크박스 (기본 모두 체크)
      C) Manual-only 카드 (노란 테두리, 클릭 시 씨앗심기 탭으로 deep-link)
  → [셀러] 검토 후 "N개 적용" 클릭
  → [API] PATCH /api/upload-readiness/auto-fill { productId, accepted } → newScore
  → [모달] phase=done — CheckCircle2 + "42점 → 75점 (+33)" 표시
  → onApplied() → dashboard 재로드 → 모달 닫기 → 위젯 카드 최신 점수로 갱신됨
```

**안전 장치 8개 (절대 우회 금지 — Block A·B·C가 이미 구현)**:
1. AI 결과는 POST(미리보기) + PATCH(적용) 2단계로 완전 분리 — DB 직접 적용 절대 금지
2. Manual-only 4개 항목(main_image, extra_images, shipping_template, net_margin) PATCH 보내지 않음
3. 카테고리 추천은 NAVER_CATEGORIES_FULL 4,993건 로컬 검색만 — PATCH에서도 이중 방어선
4. 어뷰징 단어 17개 ABUSE_WORDS 자동 검증 (Block A 생성 단계 + Block B PATCH 단계 이중)
5. 상품명 길이 25~50자 강제 (범위 밖 AI 응답 거부)
6. parseJsonSafe 안전망 (trailing comma + smart quotes + control chars 제거)
7. round-robin 401/403/JSON 파싱 실패 시 다음 키로 자동 fallback (E-11 패턴)
8. 셀러가 모달에서 항목별 체크 해제 가능 — 강제 적용 없음

**현실적 목표 (공식 확정)**:
- 자동 채우기로 도달 가능 = 최대 72점 (8+10+8+10+12+10+14, 7개 자동 항목 weight 합계)
- 나머지 28점 = 이미지 20점 + 배송 10점 + 마진 8점 = 셀러 수동 영역
- 42점 → 70~80점이 현실적 목표. 90+ 도달은 셀러가 이미지 2장 + 배송 매핑 추가 필요

**커밋 이력 (Sprint 6)**:
- 527e381 feat(E-15 Block A): upload-readiness-filler library + 7 auto-fill functions
- fd31dd4 feat(E-15 Block B): auto-fill API endpoint (POST preview + PATCH apply)
- c4cf6f1 docs(E-15): preserve handoff notes from prior session - principles 21-22 + HEAD-vs-origin issue
- b2f9b4e feat(E-15 Block C): AutoFillModal + widget integration with auto-fill button
- 113aee9 docs(E-15 Block C): mark Block A+B+C complete + handoff for Block D
- (현 커밋) docs(E-15 Sprint 6): clean Block C completion record + Block D handoff in ROADMAP

**구조 결정 (이후 세션 참고)**:
- AutoFillModal은 완전 자기완결 (props: productId, productName, currentScore, onClose, onApplied) — 향후 씨앗심기·정원창고·검색조련사 등 다른 페이지에서도 동일 패턴으로 재사용 가능
- 상품명 재작성 4모드(name_length·no_abuse·no_repeat·keyword_in_front)는 모두 product.name 단일 필드를 덮어쓰므로 충돌 발생 — 따라서 **라디오 그룹으로 1개만 적용 가능하게 함**. PATCH switch case도 update.name = v로 겹치고 마지막이 이기는 구조 — 이 라디오 제약이 명시적 방어선
- onApplied()가 dashboard.handleRefresh()를 호출하면 loadStats + loadProducts 둘 다 재로드 — 위젯 점수 + 파이프라인 카운트 + KPI 모두 신선해짐
- DB 변경 없이 런타임만으로 완전 조달 — Product 테이블 스키마 그대로 유지
- AI 답변이 모두 검증 실패해서 suggestions가 비었을 때 — 모달은 "AI 자동 채우기 가능 항목이 없습니다" 안내바 + manual 카드만 렌더 — 셀러 혼란 없음
- **Block D 라이브 검증 대기 중** — Chrome MCP로 8개 DRAFT 시도 + 점수 상승 검증, 응답시간 측정, edge case 확인 필요

---

## 다음 채팅에서 시작할 작업 후보 (수수료 개편 완료 이후 — 2026-04-30 갱신)

> 2026-04-30 수수료 개편 마무리 세션에서 다음 작업 우선순위 재평가. **E-15 (등록 준비 AI 자동 채우기) → E-1 빌더 AEO 강화 → E-12 → E-13B** 순서 권장. Phase E+ Sprint 5 종결 상태.

### 1순위 확정: E-15 등록 준비 AI 자동 채우기 (신규 작업, 2026-04-30 강화)

**문제 정의**: 8개 상품 모두 DRAFT, 평균 등록 준비도 42점. E-14가 부족 항목 시각화 + deep-link까지 했으나, 실제 채우기는 셀러 수동 작업으로 남아 매출 발생까지의 마지막 병목.

**해결책**: 위젯에 "AI로 자동 채우기" 버튼 → AI가 가능한 항목 채우기 → 미리보기 모달(항목별 before/after) → 셀러 항목별 체크박스로 선택 적용 → 점수 상승.

#### ⚠️ 중요: 11개 항목 중 AI 자동 채우기 가능 매트릭스 (반드시 다음 채팅이 먼저 읽을 것)

현재 `upload-readiness.ts`의 11개 항목을 실제 코드로 검증한 결과, **자동 채우기 가능 7개 + 셀러 수동 4개**로 나뉜다:

| ItemId | 통과 조건 | weight | AI 가능? | 자동 채우기 방법 |
|--------|----------|--------|---------|---------------|
| `name_length` | 25~50자 | 8 | ✅ | 현재 상품명을 25~50자로 재작성 |
| `no_abuse` | ABUSE_WORDS(17개) 미포함 | 10 | ✅ | 어뷰징 단어 제거하고 자연스럽게 재작성 |
| `no_repeat` | 동일 단어 3회+ 반복 없음 | 8 | ✅ | 반복 단어 제거하고 다양화 |
| `keyword_in_front` | 앞 15자에 키워드 1개+ 포함 | 10 | ✅ | 키워드를 상품명 앞 15자로 재배치 |
| `keywords_count` | keywords ≥ 5개 | 12 | ✅ | 카테고리+상품명에서 5~10개 키워드 생성 |
| `tags_count` | tags ≥ 10개 | 10 | ✅ | E-11 패턴 재사용, 구매자 언어 10~12개 |
| `category` | naverCategoryCode ≠ 50003307 | 14 | ⚠️ 부분 | 상품명에서 d1/d2 추천 → 셀러 확인 후 NAVER_CATEGORIES_FULL 매핑 |
| `main_image` | mainImage 존재 | 12 | ❌ | 셀러 직접 업로드 (씨앗 심기 이미지 탭) |
| `extra_images` | extra ≥ 3장 | 8 | ❌ | 셀러 직접 업로드 |
| `shipping_template` | shippingTemplateId 존재 | 10 | ❌ | 셀러가 도구 탭에서 매핑 |
| `net_margin` | 순마진 ≥ 30% | 8 | ❌ | 가격 결정권은 셀러 (AI 자동 변경 시 적자 위험) |

**자동 채우기로 도달 가능 점수 = 최대 72점** (8+10+8+10+12+10+14, 완벽 시나리오)
**나머지 28점 = 이미지 20점 + 배송 10점 + 마진 8점 = 셀러 수동 영역**

→ **"42점 → 90+" 약속은 비현실적**. 정직한 목표 = **"42점 → 70~80점"**으로 끌어올리고, 잔여 28점에 대해 셀러가 수동으로 채워야 할 항목을 명확히 표시. 이미지 작업이 가장 큰 항목이므로 셀러가 등록 전에 이미지 2장 추가 + 배송 매핑까지 마치면 90+.

**작업 범위 (예상 1.5~2일, Block 별 commit 필수)**:

#### Block A — 라이브러리 (`src/lib/upload-readiness-filler.ts` 신규)

**핵심 함수 시그니처** (다음 채팅이 그대로 사용 가능):
```typescript
export interface AutoFillInput {
  productId: string;
  productName?: string | null;
  productDescription?: string | null;
  naverCategoryCode?: string | null;
  naverCategoryName?: string | null;  // d1>d2>d3 path
  currentKeywords?: string[];
  currentTags?: string[];
}

export interface AutoFillSuggestion {
  itemId: ReadinessItemId;
  before: string | string[];
  after: string | string[];
  reason: string;        // why this fix matters
  confidence: 'high' | 'medium' | 'low';
}

// 7개 자동 채우기 함수 (각각 1개 itemId 담당)
export async function autoFillProductName(input, mode: 'length'|'abuse'|'repeat'|'frontKeyword'): Promise<AutoFillSuggestion | null>
export async function autoFillKeywords(input): Promise<AutoFillSuggestion | null>
export async function autoFillSeoTags(input): Promise<AutoFillSuggestion | null>
export async function autoFillCategory(input): Promise<AutoFillSuggestion | null>  // 추천만, 매핑은 별도 단계

// 일괄 호출 (UI에서 사용)
export async function autoFillAll(input, items: ReadinessItemId[]): Promise<AutoFillSuggestion[]>
```

**Provider/패턴 재사용**:
- `src/lib/review-sentiment-analyzer.ts`의 `analyzeReviewSentiment` 함수 구조를 그대로 모방 (Groq round-robin → Gemini → Anthropic fallback, parseJsonSafe, 결과 정규화)
- `src/app/api/naver-seo/ai-generate/route.ts`의 `callGroq` / `callGemini` 함수도 그대로 활용 가능 (이미 검증됨)
- 카테고리 매핑은 `src/lib/naver/naver-categories-full.ts`의 `NAVER_CATEGORIES_FULL` 로컬 검색 (API 호출 금지)

#### Block B — API endpoint (`src/app/api/upload-readiness/auto-fill/route.ts` 신규)
```typescript
// POST: 미리보기 (DB 미적용)
// body: { productId, items: ReadinessItemId[] }
// resp: { suggestions: AutoFillSuggestion[], unfillable: ReadinessItemId[] }

// PATCH: 셀러 승인된 결과만 DB 적용
// body: { productId, accepted: { itemId, value: string|string[] }[] }
// resp: { success, newScore, newReadiness, applied: ReadinessItemId[] }

export const dynamic = 'force-dynamic';
```
- PATCH 적용 시 `Product` 테이블의 `name`, `keywords`, `tags`, `naverCategoryCode` 등 해당 필드만 업데이트
- DB 적용 후 `calcUploadReadiness`로 새 점수 계산해서 응답

#### Block C — UI (`UploadReadinessWidget.tsx` 보강)
- 각 ProductRow에 `Sparkles` 아이콘 + "AI로 자동 채우기" 버튼 추가 (등록 가능 90+ 카드는 이미 "바로 등록" CTA가 있으니 보조 위치)
- 클릭 시 모달 오픈 → API POST 호출 → 결과 도착 시 항목별 before/after 카드 + 체크박스 (기본 모두 체크)
- 셀러가 체크박스 선택 후 "적용" 버튼 → API PATCH 호출 → 새 점수 표시 → 모달 닫기 + 위젯 자동 새로고침
- **자동 채우기 불가 4개 항목**은 모달 하단에 별도 안내: "이미지 2장 + 배송 매핑은 직접 입력 필요" + 해당 탭으로 deep-link
- 모달 컴포넌트: `src/components/dashboard/AutoFillModal.tsx` (신규)

#### Block D — 라이브 검증 (Chrome MCP)
1. 8개 DRAFT 상품 모두 자동 채우기 시도
2. 자동 채우기 후 평균 점수 측정 (예상: 42점 → 60~75점, 카테고리 매핑 반영 시 70~80점)
3. 생성된 키워드/태그 품질 확인 (구매자 언어 반영, 어뷰징 단어 미포함, 한국어 자연스러움)
4. 카테고리 추천 정확도 (NAVER_CATEGORIES_FULL 4,993건 중 합리적 d2/d3 매칭)
5. "수동 영역 4개" 안내가 명확하게 셀러에게 전달되는지 확인

**비용**: 0원 (Groq round-robin 28,800회/일 capacity, 8 상품 × 7 항목 = 56 호출 × 1회 = 1회 실험에 0.2% 사용)

#### 안전 장치 (절대 어기지 말 것)
1. **AI 결과는 절대 DB 직접 적용 금지** → POST(미리보기)와 PATCH(승인 적용) 2단계 분리
2. **자동 채우기 불가 4개 항목은 절대 시도 금지** → 이미지 자동 생성/배송 자동 매핑/가격 자동 변경은 설계상 제외
3. **카테고리 추천은 4,993건 로컬 검색만** → AI가 새 카테고리명 만들면 무시
4. **AI 응답 JSON 파싱 실패 시** → review-sentiment-analyzer.ts의 `parseJsonSafe` 그대로 재사용 (trailing comma + smart quotes + control chars 제거)
5. **어뷰징 단어 화이트리스트 검증** → AI 응답에 ABUSE_WORDS 17개 들어가 있으면 자동 거부 + 재요청
6. **결과는 한국어만** → AI가 영어 섞으면 거부
7. **상품명 길이 25~50자 강제** → 25자 미만/50자 초과 시 거부 + 재요청
8. **셀러가 모달에서 항목별 체크 해제 가능** → 모든 결과를 강제 적용하지 않음

**최종 commit 순서 (Block 별 progressive)**:
```
1. feat(E-15 Block A): upload-readiness-filler library + 7 auto-fill functions
2. feat(E-15 Block B): auto-fill API endpoint (POST preview + PATCH apply)
3. feat(E-15 Block C): AI auto-fill button + AutoFillModal in UploadReadinessWidget
4. feat(E-15 Block D): live verification + edge-case handling
5. docs(E-15): mark complete in PROGRESS.md + ROADMAP.md
```

### 2순위: E-1 상세페이지 빌더 AEO 강화

**문제 정의**: E-1로 6종 블록 빌더는 완성되어 있지만, 2026.2 쇼핑 AI 에이전트가 리뷰를 실시간 분석하여 상품 추천에 사용하기 시작. 즉 상세페이지의 Q&A/FAQ 구조화가 매출에 직접 영향.

**해결책**: 빌더에 "AI Q&A 자동 생성" 버튼 추가 (이미 C-2에 일부 있음) + AEO 친화적 헤딩 구조 자동 검증 + Q&A 블록 → JSON-LD schema.org/FAQPage 자동 변환 등.

**임팩트**: 등록된 상품에만 의미. **E-15 완료 후 등록 상품 발생 시점**에 진행하는 것이 합리적.

### 후순위: E-12, E-13B (트리거 미도달)

| 후보 | 상태 | 트리거 조건 |
|------|------|--------|
| E-12 Discord 리뷰 알림 | 트리거 미도달 (자체 리뷰 0개) | 자체 리뷰 1건+ 발생 시 |
| E-13B 알림톡 활성화 | 트리거 미도달 (월 50건 미달) | 월 주문 50건+ 도달 시 |

---

### 다음 채팅 시작 메시지 템플릿 (E-15 시작용 — 그대로 복붙)

```
꽃틔움 가든 개발 이어서 진행합니다. KKOTIUM_PROGRESS.md, KKOTIUM_ROADMAP.md를 읽고
E-15 (등록 준비 AI 자동 채우기) 작업을 시작해주세요.

작업 시작 전 필수:
1. git log -5로 직전 작업 잔재 없는지 먼저 확인 (HEAD = 2a1b4dd, 수수료 개편 7 commits + cleanup + docs finalize 9 commits이 origin/main 동기화 상태여야 함)
2. KKOTIUM_PROGRESS.md / KKOTIUM_ROADMAP.md 정독, 특히 ROADMAP의 "E-15 ITEM_TO_TAB 매트릭스" 섹션 (11개 중 7개만 AI 가능, 4개는 셀러 수동) 반드시 확인
3. 관련 코드 파일 4개 read_text_file:
   - src/lib/upload-readiness.ts (11개 항목 정의 + calcUploadReadiness)
   - src/components/dashboard/UploadReadinessWidget.tsx (E-14 위젯 + ITEM_TO_TAB 매핑)
   - src/lib/review-sentiment-analyzer.ts (E-11 패턴 — Groq round-robin + parseJsonSafe + 결과 정규화)
   - src/app/api/naver-seo/ai-generate/route.ts (callGroq/callGemini 함수)
4. 작업 계획 브리핑 후 제 승인 받고 시작
5. Block 별로 commit (Block A→B→C→D 4 commits)해서 컨텍스트 한계 시에도 손실 없도록

중요한 안전 장치 (반드시 지킬 것):
- AI 결과는 POST(미리보기)와 PATCH(승인 적용) 2단계 분리, DB 직접 적용 절대 금지
- 자동 채우기 불가 4개 항목(main_image, extra_images, shipping_template, net_margin)은 시도 금지, 셀러 수동 안내만
- 카테고리 추천은 NAVER_CATEGORIES_FULL 로컬 검색만, AI가 새 카테고리명 만들면 무시
- 어뷰징 단어 17개 ABUSE_WORDS 자동 검증, 발견 시 AI 응답 거부 + 재요청
- 상품명 길이 25~50자 강제, 한국어만 허용

현실적 목표: 42점 → 70~80점 (자동 가능 7개 항목 max 72점). 90+ 도달은 셀러가 이미지 2장 추가 + 배송 매핑하면 가능.

브라우저 테스트는 Chrome MCP로 dashboard에서 8개 DRAFT 모두 자동 채우기 시도 → 모달의 항목별 before/after 확인 → 평균 점수 상승 검증.
완료 후 PROGRESS.md/ROADMAP.md 업데이트 + git push로 마무리.
```


---

### 이전 평가 기록 (E-11 완료 시점)

### E-11 완료 요약 (2026-04-29)

**구현 결과**: 1인 셀러의 자체 리뷰 0개 상태에서도 즉시 작동하는 "경쟁사/도매 텍스트 붙여넣기 → Groq AI 감정분석 → SEO 태그 자동추천" 워크플로우. 검색조련사 인라인 패널에 통합 — 소싱→등록 파이프라인의 마지막 단계에서 구명자 언어 기반 정확한 태그 확정.

**변경 파일** (총 3개, +831줄, 3 commits):
- `src/lib/review-sentiment-analyzer.ts` (신규 348줄) — `analyzeReviewSentiment()` + 3-tier provider fallback
- `src/app/api/review-analysis/route.ts` (신규 78줄) — POST endpoint with input validation
- `src/components/naver-seo/NaverSeoProductTable.tsx` (+368줄) — ReviewAnalysisPanel + SeoEditPanel 통합
- 보강: 위 라이브러리 (+30/-8줄) + ai-generate (+5/-2줄) — round-robin 401/403/JSON 손서닫 fallback + max_tokens 2500 + parseJsonSafe LLM JSON 정리

**커밋 이력**: 00272f7 (Block A) → c870707 (Block B) → fb418bd (Block A 보강) → (현 docs)

**Groq 키 회전 이벤트 기록**:
- 세션 중 GROQ_API_KEY 첨 번좌가 401 Invalid로 확인되어 round-robin이 다음 키로 넘어가지 않은 버그 발견 — 코드 보강 추가
- 꽃졔님께서 GROQ_API_KEY (`lrltQb`), GROQ_API_KEY_2 (`CAVylw`), GROQ_API_KEY_3 (`3IGN7i`) 3개 모두 신규 발급·등록 완료 (이전 3pEakT 폐기 키는 Vercel에서 회전 처리됨)
- 최종 정상 키: GROQ × 3개 (lrltQb + CAVylw + 3IGN7i = 43,200회/일 capacity) — 1인 셀러 일 사용량 대비 무한대
- **키 무효화 근본 원인**: `.env.backup.*`, `.env.back`, `.env.complete.backup` 등 9개 백업 파일이 git에 추적되어 GitHub에 키 노출 → Groq 자동 폐기 시스템 발동. 2026-04-29 마지막 세션에서 모두 `git rm --cached` + `.gitignore` 강화 (.env.* 와일드카드, !.env.example 예외)로 완전 차단. 향후 동일 사고 방지
- Vercel 존재하는 "Needs Attention" 알림 6개 (GROQ_API_KEY_2 폐기, GEMINI_API_KEY/_2/_3 quota 소진, 기타 보안 권고): 현 작업과 무관, 독립적으로 정리 권장

**라이브 검증 결과** (Chrome MCP, 10개 mock 리뷰):
- API HTTP 200, provider: groq-llama3, GROQ_API_KEY=lrltQb
- 감정 분포: 긍정 80% / 중립 10% / 부정 10% — 정확한 렌더링
- 추천 SEO 태그 8개 (색이예쁘다/품질좋다/포장이꼼꼼하다/가격대비좋다/고급스럽다/가성비최고/선물용/인테리어) — 특히 "선물용·인테리어" 같은 구매자 언어 정확 추출이 핵심 가치

---

### 다음 작업 후보 — 우선순위 평가 (10년차 파워셀러 + UI/UX 디자이너 관점)

| 후보 | 매출 임팩트 | 트리거 적합성 | 종합 |
|------|------------|---------------|------|
| **수수료 개편 미반영분 적용** | 높음 — 2025.6.2 개편 미반영 (유입수수료 2% 폐지 → 판매수수료 2.73%, 자체마케팅 0.91%) | C-4 수익성 대시보드 + good-service.ts 미반영분 지금 수정 가능 | **★ 1순위** — 소규모(0.5일 이내) + 수익성 정확도 직결 |
| **E-12 Discord 리뷰 알림** | 중간 — 운영 알림 강화 | 자체 리뷰 발생 후 의미 (현재 0개) | ★ 2순위 — 자체 리뷰 1건 발생 시점 추천 |
| **E-13B 알림톡 발송 API** | 높음 — 리뷰 재구매 유도 | 월 50건+ 시점 (현재 미도달) | 장기 — 도달 시 즉시 활성화 가능한 UI 세팅 완료 상태 |

#### 추천 순서 — 수수료 개편 → E-12 → E-13B

**수수료 개편 1순위 이유**:
1. 2025.6.2 시행된 개편이 현재 수익성 표시/good-service.ts/마진계산기 3곳에 미반영 — 수익성 표시 신뢰도 직접 영향
2. 독립 작업 + 소규모 (약 0.5일 이내)
3. C-4 수익성 대시보드(유입경로별 수수료 5.73% vs 3.91%)와 관련되어 양쪽 동시 업데이트 필요
4. 마진계산기 동기화 필요 — 마진 렌더링 정확도 단소

**구체 작업 항목 (수수료 개편)**:
- `src/lib/profitability.ts` (또는 유사 라이브러리): 자체마케팅 유입 경로의 수수료 0.91% 도입
- 기본 유입 수수료 2.73% 적용 (기존 유입수수료 2% 제거)
- C-4 수익성 위젯에서 유입 경로별 구분 강화
- `MarginCalculator.tsx`에 구조 적용
- `good-service.ts`와 연동 (2026-04 커밋 `b5606c4`에서 톡톡 12h 적용 완료, 수수료 부분만 추가 필요)

**E-12 2순위 이유**:
- 자체 리뷰 발생 후(50건+ 시) 의미 있음 — 현재 자체 리뷰 0개
- 대시보드 알림 이미 충분 — 운영 경고는 ReviewGrowthWidget(E-2A)이 보완

**E-13B 장기 이유**:
- 월 주문 50건+ 도달 시점에 활성화 — 현재 소라피 키 입력만 하면 즉시 작동하는 UI 세팅 완료 상태 (E-13A)
- 1단계: 네이버 내장 무료 리뷰 알림 + 인서트 카드(E-13C)로 충분

---

### 다음 채팅 시작 메시지 템플릿

다음 새 채팅을 시작할 때 그대로 복붙해서 사용:

```
꽃틔움 가든 개발 이어서 진행합니다. KKOTIUM_PROGRESS.md, KKOTIUM_ROADMAP.md를 읽고
현재 상태 파악 후 수수료 개편 미반영분 적용 작업을 시작해주세요.
(2025.6.2 개편: 유입수수료 2% 폐지 → 판매수수료 2.73%, 자체마케팅 유입 0.91%)

작업 시작 전 필수:
1. git log -5로 직전 작업 잔재 없는지 먼저 확인 (E-11 4개 commit이 origin/main에 push 완료 상태여야 함)
2. KKOTIUM_PROGRESS.md / KKOTIUM_ROADMAP.md 정독
3. 관련 코드 파일 (good-service.ts, profitability.ts, MarginCalculator.tsx, C-4 수익성 대시보드) 현재 상태 파악
4. 작업 계획 브리핑 후 제 승인 받고 시작
5. 작업 완료 후 PROGRESS.md/ROADMAP.md 업데이트 + git push

추가로 Vercel "Needs Attention" 표시는 GEMINI 키 quota 초과 경고 — GROQ 정상이라 fallback 거치지 않으므로 앱 사용에는 무관. 작업 직접 영향 없음.
```

### E-10 완료 요약 (2026-04-29)

**구현 방식 결정 — 원래 계획 vs 실제 적용** (이후 세션이 혼동하지 않도록 명시):

| 항목 | 원래 ROADMAP 계획 | 실제 구현 (옵션 A) |
|------|---------------------|---------------------|
| 데이터 소스 | 네이버 쇼핑검색 API의 reviewCount/productRating 직접 수집 | 기존 수집 데이터 4-factor proxy(topSellers/priceSpread/totalResults/competitionLevel) |
| DB 스키마 | `CompetitorSnapshot`에 reviewCount, avgRating 컬럼 추가 예정 | **스키마 변경 없음** — 런타임 계산으로 완전히 대체 |
| 진입장벽 판단 | 리뷰수 100+ = 높음 / 30~99 = 중간 / 0~29 = 낮음 | 4-factor weighted score 0~5점으로 자체 임계값 |
| 장점 | 리뷰 = 직접 경쟁 지표로 직관적 | API 의존 없음, 즉시 작동, DB 마이그레이션 불필요 |
| 단점 | API 응답에 reviewCount가 누락될 때 취약 | 간접 추정이라 일부 도메인(소수 판매자만 있는 틈새 카테고리)에서 과대/과소 가능성 |

**구현 결과 변경 파일** (총 5개, +445/-10 lines, 4 commits):
- `src/lib/competition-monitor.ts` (+135줄) — `estimateEntryBarrier()` + 4-factor weighted score
- `src/lib/sourcing-recommender.ts` (+79줄) — BlueOcean 가산 로직 + breakdown 구조
- `src/components/dashboard/CompetitionMonitorWidget.tsx` (+137줄) — 5단계 막대+4-factor+Recommendation 패널
- `src/components/dashboard/SourcingRecommendWidget.tsx` (+95줄) — Shield chip+BlueOcean breakdown+3 metrics
- `src/app/api/competition/route.ts` (+9줄) — entryBarrier 세분 응답 삽입

**커밋 이력**: d1d6202 (Block A) → 0d216fb (Block B) → 9a81b87 (Block C) → 6c6de96 (Block D) → (현 docs 커밋)

**장기적 권고**: 쇼핑검색 API의 reviewCount 안정성이 추후 확인되면, 자체 스토어 웹 크롤링으로 경쟁사 리뷰 수집 경로 확보 후 옵션 A + 원래 계획 하이브리드로 업그레이드 권장.

---

### 다음 작업 후보 — 우선순위 평가 (10년차 파워셀러 + UI/UX 디자이너 관점)

| 후보 | 매출 임팩트 | 트리거 적합성 | 종합 |
|------|------------|---------------|------|
| **E-11 AI 리뷰 감정 분석 + SEO 재활용** | 중간~높음 — 경쟁사 리뷰 붙여넣기 대응 + 실제 SEO 태그 추천 정확도 향상 | 자체 리뷰 0개여도 경쟁사 리뷰 텍스트로 즉시 작동 가능 | **★ 1순위** |
| **수수료 개편 미반영분 적용** | 높음 — 2025.6.2 개편 미반영 (유입수수료 2% 폐지 → 판매수수료 2.73%, 자체마케팅 0.91%) | 수익성 대시보드(C-4) + good-service.ts 미반영분 지금 수정 가능 | ★ 2순위 — 수익성 정확도 직결 |
| **E-12 Discord 리뷰 알림** | 중간 — 운영 알림 강화 | 자체 리뷰 발생 후 의미 (현재 0개) | E-11 다음 자연스러운 후속 |

#### 추천 순서 — E-11 → 수수료 개편 → E-12

**E-11 1순위 이유**:
1. E-10으로 진입장벽 추정 모듈 완성 → 다음 가치 = "경쟁사 리뷰의 질적 인사이트"
2. 자체 리뷰 0개 상태에서도 즉시 작동 (경쟁사 리뷰 텍스트 붙여넣기 → Groq 분석)
3. 기존 Groq 인프라 활용 (추가비용 0원)
4. SEO 태그 자동추천 → 검색조련사 정확도 향상 → 등록 품질 ↑ → 매출 흐름 강화
5. E-10 BlueOcean breakdown에 "AI 감정분석 가산" 항목 추가 자연스러움

**수수료 개편 2순위 이유**:
- 2025.6.2 시행된 유입수수료 2% 폐지 → 판매수수료 2.73%(자체마케팅 등 0.91%)가 현재 수익성 대시보드(C-4)에 미반영
- 마진 계산기/수익성 표시와 동기화 필요
- 독립 작업이며 소규모 (약 0.5일 이내)

**E-12 후순위 이유**:
- 자체 리뷰 발생 후(50건+ 시) 의미 있음 — 현재 자체 리뷰 0개
- 대시보드 알림 이미 충분 — 운영 경고는 ReviewGrowthWidget(E-2A)이 보완

---

### 다음 채팅 시작 메시지 템플릿

다음 새 채팅을 시작할 때 그대로 복붙해서 사용:

```
꽃틔움 가든 개발 이어서 진행합니다. KKOTIUM_PROGRESS.md, KKOTIUM_ROADMAP.md를 읽고
현재 상태 파악 후 E-11 (AI 리뷰 감정 분석 + SEO 재활용) 작업을 시작해주세요.

작업 시작 전 필수:
1. git log -5로 직전 작업 잔재 없는지 먼저 확인 (E-10 5개 commit이 origin/main에 push 완료 상태여야 함)
2. KKOTIUM_PROGRESS.md / KKOTIUM_ROADMAP.md 정독
3. 관련 코드 파일 (sourcing-recommender.ts, naver-seo 페이지, ai-generate API 등) 현재 상태 파악
4. 작업 계획 브리핑 후 제 승인 받고 시작
5. Block 별로 commit해서 컨텍스트 한계로 인한 작업 손실 방지

브라우저 테스트는 Chrome MCP로 경쟁사 리뷰 텍스트 붙여넣기 →
감정분석 결과 + SEO 태그 추천 결과 정상 작동하는지 확인해주세요.
완료 후 PROGRESS.md/ROADMAP.md 업데이트 + git push로 마무리.
```

---
## 2026-04-13 완료 작업 (이번 세션)

### UI 원칙 확립 및 전면 적용
- **이모지 완전 제거**: JSX 내 모든 이모지 → Lucide React SVG 아이콘 교체
  - `products/new/page.tsx`: lucide-react import 추가, DSection icon prop `React.ReactNode`
  - `ProductFilters`, `ProductSort`, `ProductStats`, `ProductTable`, `SourcedProductManager`
  - `QuickActions`, `SearchFilter`, `ViewToggle`, `ProductForm` 등 전체
  - `workflow/page.tsx` 완전 재작성 (5단계 운영 가이드, Lucide 아이콘)
  - `crawl/page.tsx`, `naver-seo/page.tsx`, `settings/platforms/page.tsx` 등

- **상태 라벨 통일**:
  - `초안` → `임시저장`
  - `ACTIVE` 변경 메뉴 라벨 → `판매 중`
  - `pending` 탭 → `네이버 등록 대기`
  - `ProductSort.tsx`: `icon` prop optional로 변경

### AI API 체계 개선
- **cron Perplexity 분리**: `trend-analyzer.ts` fallback → `{ trendKeywords: [], trendCategories: [], source: 'fallback' }` (silent)
- **Groq 무료 fallback 추가**: `llama-3.1-8b-instant`, 하루 14,400회 무료
  - `ai-generate/route.ts`: Gemini → Groq → Perplexity 순서
  - Vercel 환경변수 `GROQ_API_KEY` 등록 완료
  - 브라우저 테스트 완료: `ok: true, provider: groq-llama3`

### 검색 조련사 SEO 인라인 편집 패널 v3
- `NaverSeoProductTable.tsx` 전면 재작성
- 행 클릭 시 열리는 인라인 패널:
  - 꼬띠 AI 최적화 버튼 3개 (정석SEO / 감성타겟 / 틈새키워드)
  - SEO 검색최적화 필드 전체 직접 편집 가능:
    네이버 상품명 / 키워드 / 상품설명 / 브랜드 / 원산지 / 소재 / 색상 / 사이즈 / 세탁방법
  - SEO 태그 인라인 추가/삭제 (최대 10개)
  - **전체 저장 버튼** → `PATCH /api/products/{id}` 한 번에 저장
  - 저장 완료 시 초록색 체크 표시 (2초 후 자동 복원)
  - 글자수 실시간 표시 (상품명 25~40자, 설명 80~200자 가이드)
  - 키워드 입력 시 칩 미리보기 자동 업데이트
- 브라우저 테스트 완료: 21개 입력 필드, 전체 저장 버튼, AI 버튼 모두 정상

---

## 미분류 개선 항목

| 항목 | 내용 | 우선순위 |
|------|------|---------|
| detail_image_url 입력 | 기존 8개 상품 씨앗 심기 편집 모드에서 직접 입력 (꽃졔님 직접) | 낮음 |
| API 키 교체 | 노출된 Gemini 3개 + Groq 키 교체 권장 | 보안 |
| 사이드바 배지 실시간화 | 소싱/등록대기/품절 숫자 실시간 업데이트 | 낮음 |
| 대시보드 파이프라인 배지 | 병목 구간 숫자 표시 | 낮음 |
| 엑셀 다운로드 이미지 경고 | 상세이미지 없는 상품 다운로드 시 강화 경고 | 낮음 |

---

## 비용 로드맵

| 시점 | 비용 |
|------|------|
| **지금 (Phase A+B+C+D+E+ Sprint 1~5)** | **0원** (E-13B 알림톡 UI만 구현, 발송 비활성) |
| 월 주문 50건+ | 솔라피 알림톡 건당 13원 (월 ~650원~1,950원) |
| 월 매출 50만+ | Gemini 유료 ~$20/월 |
| 월 매출 100만+ | Supabase Pro $25/월 |
| 월 매출 200만+ | Vercel Pro $20/월 |
| 월 매출 500만+ | 크리마/브이리뷰 전문 리뷰 솔루션 검토 |

---

## 새 채팅 시작 체크리스트

1. `KKOTIUM_PROGRESS.md` 전체 읽기
2. `KKOTIUM_ROADMAP.md` 전체 읽기
3. 해당 TASK 관련 코드 파일 확인
4. 꽃졔님 승인 후 작업 시작
5. 완료 후 **두 파일 모두** 업데이트

## 중요 체크포인트

- 코드 수정 후: `npx tsc --noEmit` → **0 errors** 확인 필수
- push 전: 이모지 없는지 확인 (`grep -rn "이모지" src/`)
- Vercel 환경변수 변경 후: 반드시 `git commit --allow-empty && push`
- 브라우저 테스트: API 성공만으로 완료 처리 금지, 반드시 Chrome MCP로 확인
- E-13B 알림톡: 2단계 접근 — 1단계 UI만 구현(키 미입력 시 안내), 2단계 매출 성장 후 솔라피 키 입력→즉시 활성화
- 반품안심케어 수수료: 2025.8.1 개편 기준 사용 (식품50/생활90/가구160/패션의류650원), 보상금 상한 8,000원
- 리뷰 API: 네이버 커머스 API 미지원 (GitHub Discussion #1582 공식 확인) — 수동 입력 + 크롤링만 가능
- 카카오 채널: 꽃틔움 KKOTIUM, Public ID `_xkfALG`, URL `pf.kakao.com/_xkfALG` (하드코딩 금지, store_settings에서 읽기)
- 네이버 내장 무료 리뷰 알림: 배송완료 3일 후 구매확정 요청 + 구매확정 시 리뷰 작성 알림 + 기본 적립금(텍스트50원/포토150원) — 이미 자동 작동 중
- 톡톡 소식알림: 월 1회 무료, 추가 건당 10원. 쇼핑챗봇과 외부 챗봇 API는 동시 사용 불가
- 알림톡 완전 무료 지속 발송은 불가: 솔라피 무료 플랜 = 플랫폼 0원 + 건당 13원 종량제, 가입 시 300포인트(약 23건분)
- 카카오 프로젝트 단골: 연 매출 10억 이하 소상공인 → 비즈월렛 30만원 지원 (톡채널 메시지용)
- 2025.12.31 친구톡 종료 → 브랜드 메시지 전환 (단가 2.5~3배 인상). 알림톡 중심 CRM 전략이 합리적
- 카나나 상담매니저: 카카오 AI 자동 CS, 모든 톡채널 무료 제공 (2025.9 정식 출시)
- 카카오 챗봇 빌더: 일반 기능 무료, Event API만 건당 15원
- 쉬운광고(우리 매장 알리기): 일일 100원부터, 신규 6만원 무료 쿠폰
- AiTEMS 추천 ON: 스토어관리에서 활성화 → 횟수 제한 없이 개인화 노출, 전체 클릭 약 10% 차지
- 2026.1.1부터 알림톡 쿠폰/마일리지 사용유도 메시지 제한 강화 — 템플릿 내 "네이버 포인트" 등 구체 혜택 금액 언급 시 카카오 심사 반려

### 코드 작성 원칙 (strictly enforced)
- JSX 이모지 완전 금지 — Lucide React 아이콘만 사용
- 주석 영어로만
- 한글 리터럴 타입 정의 금지 (예: '조합형' → 영어 상수로 분리)
- `new PrismaClient()` 금지 → `src/lib/prisma.ts` 싱글톤
- 카테고리 검색: `NAVER_CATEGORIES_FULL` 로컬 데이터 사용 (API 호출 금지)
- 수정 후 `npx tsc --noEmit` 필수 → 0 에러 확인 후 진행
- 파일 수정 전 `read_file`로 현재 상태 확인
- 수정할 수 없는 작업은 거짓말 없이 즉시 상황 설명 후 요청

### 작업 흐름 원칙
- 모든 작업 시작 전 `KKOTIUM_PROGRESS.md` + `KKOTIUM_ROADMAP.md` 확인 필수
- 작업 시작은 꽃졔님 승인 후에만 진행
- "진행해줘요" = end-to-end 완료 후 통합 브리핑 (중간 보고 없이)
- 작업 완료 후 반드시 테스트 실행 → 실제 앱 사용 시 문제없는지 확인
- 완료 후 KKOTIUM_PROGRESS.md + KKOTIUM_ROADMAP.md 업데이트

### 도구 사용 패턴
- **iTerm MCP**: `list_all_sessions` → 세션 확인 후 사용. heredoc(`<< 'EOF'`) 절대 금지 → Python 스크립트 작성 후 실행
- **Filesystem MCP** (`edit_file`): byte-perfect `oldText` 필수 — 수정 전 `read_text_file`로 정확한 내용 확인
- **대형 TSX 파일 (600줄+)**: `write_file`로 전체 교체 또는 Python 패치 스크립트 사용. `edit_file` byte 매칭 실패 방지
- **도매꾹 OpenAPI**: `https://domeggook.com/ssl/api/?ver=4.5&mode=getItemView&aid={KEY}&no={productNo}&om=json`

### 도매매/도매꾹 플랫폼 이해
- **도매매(DMM)** = 플랫폼 (Platform 테이블)
- **도매꾹(DMK)** = 플랫폼 (Platform 테이블) — 도매매 계열사
- 플랫폼 안의 **개별 판매자** = 공급사 (Supplier 테이블)
- 공급사의 `domeggookSellerId` = 도매꾹/도매매에서의 판매자 고유 ID

### 수수료 구조 (2026 확정)
- 카테고리별 차등 없음 (2025-06-02 개편 이후)
- 판매자 등급 기반: 중소3 = 3.003% + 2.73% = **5.733%**
- 예외: 디지털/가전 4.8%, 도서 4.5%
