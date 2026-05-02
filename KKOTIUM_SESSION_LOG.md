# KKOTIUM GARDEN — 세션별 작업 로그

> **이 파일의 역할**: 세션별 자세한 작업 이력을 누적 기록합니다.
> - **KKOTIUM_PROGRESS.md**: 핵심 현재 상태 + 작업 원칙 + 환경/도구 정보 (헤더만 갱신, 짧은 요약)
> - **KKOTIUM_ROADMAP.md**: 미래 작업 계획 + Phase별 상태 표 + 다음 새 채팅 시작 메시지
> - **KKOTIUM_SESSION_LOG.md (이 파일)**: 세션별 자세한 작업 이력 (시간 역순, 최신이 위)

> 새 채팅 시작 시 읽는 순서: PROGRESS.md → ROADMAP.md → SESSION_LOG.md (최근 1~2개 세션만)

---

## 2026-05-02 세션 — E-15 Block D Part 2 잔여·3 (이슈 #6 부분 해결: 잠옷/홈웨어 + 차량용 카테고리 정확도 개선 + 이슈 #7 신규 발견)

### 세션 개요
- 이전 채팅(2회)에서 완료한 작업: src/lib/upload-readiness-filler.ts 수정 (working tree dirty, +83/-3 lines) + 라이브 검증 3건 (홈웨어 잠옷세트/파자마 → 50000826, 차량용 햇빛가리개 → 50004092)
- 본 세션 완료: 변기펌프 카드 회귀 검증 + MD 3개 파일 갱신 + commit·push
- 본 세션 인계 (잔여·4): 이슈 #7 (변기펌프 AI 자기모순 매핑 거부 로직) + 이슈 #3 점검 + E-15 전체 완료 처리
- 작업원칙 21·23·24·25 적용: HEAD e1acbf0 == origin/main 교차 확인 ✅, working tree dirty 정확 일치 ✅, dev 서버 실행 중 확인 ✅, 시작 메시지 가정과 실제 일치 ✅

### [단계 1] 사전 점검 + 8개 DRAFT 재확인
- HEAD/origin sync, working tree, MD 줄 수(1075/1026/154), dev 서버(PID 10835 포트 3000) 모두 정상
- 8개 DRAFT ID 재확인 — 이전 메시지의 축약 ID(14자)는 API에서는 이용 불가 — 전체 ID(24자) 필요:
  - cmnh8vx0m0001r7mnxbgrvkzi | 선물받은 특별한 일상 (cat=매직)
  - cmn7984ko0007130kkyrnjnfe | 모나미 펭수 매직 (cat=매직)
  - cmn7984jx0005130klv0mgh4f | 하트 리본 누빔 여성 파자마 세트 (cat=잠옷/홈웨어) ✅ 검증됨
  - cmn7984j10003130k08hj3505 | 차량용 햇빛가리개 (cat=차량용햇빛가리개) ✅ 검증됨
  - **cmn7984ff0001130kjfj6mnas | 스텐 파워 변기건 펌프 일체형 변기펌프 뚫어뻥 (cat=난방텐트) ⚠️ 회귀 대상**
  - cmn4i94yu0005k8hs5a5p6zaa | 인테리어 미니 가습기 (cat=uncategorized)
  - cmmwgn3t30003k8hs0ujaw6eh | 무타공 두꺼비집가리개 (cat=인테리어소품>인터폰박스)
  - cmmvx028n0001jmv3vr806y6m | 리본 포인트 홈웨어 잠옷세트 (cat=uncategorized) ✅ 검증됨

### [단계 2] 변기펌프 카드 회귀 검증 — 이슈 #7 발견

POST /api/upload-readiness/auto-fill { productId: cmn7984ff0001130kjfj6mnas, fields:["category"], dryRun:true } →

```json
{
  "success": true,
  "suggestions": [{
    "itemId": "category",
    "before": "50003307",
    "after": "50002707",
    "reason": "변기펌프/뚫어뻥/배수구 도구는 생활용품의 욕실용품에 해당합니다. → 생활/건강 > 생활용품 > 보안용품 > CCTV (코드 50002707)",
    "confidence": "high",
    "provider": "groq-llama3"
  }]
}
```

**모순 포착**: AI(groq-llama3)가 reason 텍스트에는 "변기펌프는 욕실용품"이라고 적으면서 실제 코드 "50002707"은 "생활/건강>생활용품>보안용품>CCTV"를 출력. 두 개가 **논리적으로 분리**되어 출력된 **자기모순 hallucination**.

**score() 거부 로직이 이 이슈를 잡지 못한 원인**:
- 이번 세션의 형태 특이적 보너스(+35)/패널티(-30)는 d4 이름에 "잠옷/파자마/홈웨어/차량용·햇빛/욕실·배수·파이프" substring 일치 있을 때만 적용
- d4 = "CCTV"이므로 상품명 "변기/펌프/뚫어뻥" substring 매칭 0으로 계산되어 보너스 미적용
- d4 = "CCTV"에서 "욕실·배수·파이프" 키워드 substring 매칭 없으므로 패널티 미적용
- AI reason 텍스트의 "욕실용품" 키워드와 실제 매핑 d4 "CCTV" 간 substring 교집합 검증 없음 → 거부 안 됨

### [단계 3] 추가 회귀 진행 여부 결정

결정자: 꽃졔님 (옵션 B 선택) — 검증된 3건만 commit, 변기펌프 이슈 #7은 새 채팅 인계. 우선순위: 컨텍스트 안전·권장.
- 이유: (a) 이슈 #7은 본질적으로 다른 종류의 문제 (AI hallucination + 상품명에 직접 카테고리 키워드 없는 케이스); (b) 해결에는 score() 명확한 reason·실제코드 일치성 검증 필요; (c) 지금 채팅에서 추가 수정 + 검증 자체가 계속 지속될 시 이미 검증된 3건 또한 있으면 잃을 위험이 있음

### [이슈 #7 세부 분석 다음 세션용]

**증상**: 변기펌프·파이프·배수 관련 상품 + AI가 reason·실제코드 분리 출력 + score 검증 포착 안 됨

**개선 방안 (다음 세션)**:

1. **score() 명확한 reason·실제코드 일치성 검증 추가** (핵심):
   - AI가 reason에 적은 키워드(예: "욕실용품")와 실제 매핑 코드의 d2/d3/d4 이름(예: "보안용품>CCTV") substring 교집합 0 → 강한 패널티 (예: -50)
   - 프롬프트에 "reason에 적은 카테고리명이 실제 매핑 코드의 d2/d3/d4 이름과 일치해야 함" 명시적 안내 강화

2. **욕실용품/파이프 관련 키워드 리스트 추가**:
   - BATHROOM_KEYWORDS = ['변기', '펌프', '뚫어뻥', '배수구', '배수호스', '메인파이프']
   - 해당 키워드 있으면 d2/d3 에 "욕실·파이프·배수·파이·클리닝·하수" 근접도 키워드 없으면 자동 패널티 -40

3. **AI fallback 계층 재편성 검토**:
   - groq-llama3 hallucination 임계 도달 시 제2 fallback (Gemini Pro) 호출
   - 일치성 검증 없는 AI 제1답 대신 계산형 추세도에 의존 검토

**우선순위**: 다음 세션 주 작업 적합. AI 자체 구조적 결함 대응을 위한 score() 검증 구조 조건 추가

### [이슈 #3 미검] ready90 카드 AI 버튼 일시 재표시 정황

시간 부족 + 이슈 #7이 주 주제여서 점검 미실시. 다음 세션에서 이슈 #7 이후에 여유 있을 때 적시 처리. 점검 절차는 ROADMAP.md "잔여·4 시작 메시지" 참조.

### 이번 세션 변경 파일 요약
- src/lib/upload-readiness-filler.ts (+83/-3 lines) — autoFillCategory 프롬프트 강화 + score() 가중치 재조정 (직전 채팅에서 수정, 본 세션에서 commit)
- KKOTIUM_PROGRESS.md (헤더 + 세션 요약 추가)
- KKOTIUM_ROADMAP.md (헤더 + 잔여·4용 인계 메시지 + 표 행 갱신)
- KKOTIUM_SESSION_LOG.md (본 세션 자세한 기록 추가)

### 이번 세션의 commit 계획 (작업원칙 24번: commit + push 한 묶음)

```
feat(E-15 Part 2 잔여 3차): 이슈 #6 부분 해결 (잠옷/홈웨어 + 차량용 카테고리 정확도 개선) + 이슈 #7 인계

- src/lib/upload-readiness-filler.ts: autoFillCategory 프롬프트 강화 (잠옷/홈웨어/차량용 명시 가이드 + few-shot 5개) + score() 가중치 재조정 (d4 서브스트링 매칭 +25→+60, 공백 제거 매칭, 잠옷/욕실/차량 형태 특이적 보너스 ±35)
- KKOTIUM_PROGRESS.md: 헤더 + 세션 요약 추가
- KKOTIUM_ROADMAP.md: 잔여·4용 인계 메시지 + 표 행 갱신
- KKOTIUM_SESSION_LOG.md: 본 세션 자세한 기록 추가

라이브 검증 3건 성공: 홈웨어 잠옷세트/파자마 → 50000826 (여성의류>잠옷/홈웨어) high, 차량용 햇빛가리개 → 50004092 (자동차용품>인테리어용품>차량용햇빛가리개)

이슈 #7 신규 발견: 변기펌프 카드 회귀 테스트 시 AI(groq-llama3) 가 reason에 "욕실용품" 적고 실제 은 50002707(CCTV) 출력한 자기모순 hallucination. score()가 d4="CCTV"와 "변기/펌프/뚫어뻥" substring 매칭 없어 보너스/패널티 미적용. 다음 세션 주 작업으로 인계 — score()에 reason·실제코드 일치성 검증 추가 필요
```

---

## 2026-05-01 세션 — E-15 Block D Part 2 잔여·2 (이슈 #2+#5 카테고리 거부 로직 이중 방어선 + 이슈 #6 신규 발견)

### 세션 개요
- 이전 채팅 잔여: 이슈 #2 (동일 코드 추천) + 이슈 #5 (d1 fallback 부적합 매칭) + 이슈 #3 (ready90 점검) + E-15 전체 완료
- 본 세션 완료: 이슈 #2+#5 고침 + 라이브 검증 + 이슈 #6 신규 발견 인계
- 본 세션 인계 (잔여·3): 이슈 #3 점검 + 이슈 #6 카테고리 추천 정확도 개선 + E-15 전체 완료 처리
- 작업원칙 21·23·24 적용: HEAD a5d7b37 == origin/main 교차 확인 ✅, working tree clean ✅, 시작 메시지 가정과 실제 일치 ✅
- 작업원칙 18번 보강: NFC/NFD 정규화 차이로 매칭 실패 발생 → git restore로 복구 → 한글 직접 입력 패턴으로 재작성

### [단계 1A] src/lib/upload-readiness-filler.ts autoFillCategory 거부 로직 추가

**3가지 거부 케이스 추가** (line 521~559):

1. **이슈 #5 본질 수정** — score < 50 시 무차별 fallback 폐기:
   - 기존: `candidates.find(c => c.d3) ?? candidates[0]` → 마구 첫 카테고리 반환
   - 수정: `return null` — 셀러가 수동으로 고르도록 안전하게 비움

2. **이슈 #2 수정** — 동일 코드 추천 거부:
   ```typescript
   if (input.naverCategoryCode && best.entry.code === input.naverCategoryCode) {
     return null;
   }
   ```

3. **이슈 #5 추가 방어** — token overlap 검증:
   - 조건: best.s >= 50이더라도, 카테고리명(d2/d3/d4)과 상품명 토큰 중 substring 일치가 전혀 없고,
     AI reasoning에도 카테고리 힌트 단어가 없으면 거부
   - 예외: best.s >= 90 이상은 신뢰 (높은 신뢰도 매칭은 통과)

### [단계 1B] src/app/api/upload-readiness/auto-fill/route.ts PATCH 거부 로직 추가

**2가지 변경**:

1. PATCH 핸들러 시작 (line 173~186): currentProduct fetch 추가
   ```typescript
   const currentProduct = await prisma.product.findUnique({
     where: { id: productId },
     select: { naverCategoryCode: true },
   });
   ```

2. category case (line 287~295): 동일 코드 2차 방어선
   ```typescript
   if (code === currentProduct.naverCategoryCode) {
     rejected.push({ itemId: a.itemId, reason: '현재 카테고리와 동일한 코드 거부' });
     break;
   }
   ```

**이유**: 라이브러리가 1차 방어선이지만, PATCH는 세션 간 시간 차이와 다른 탭 편집 race condition으로 stale payload를 받을 수 있으므로 2차 방어선 필수 (작업원칙 19번 강화).

### [단계 2] TSC + 라이브 검증 ✅

`npx tsc --noEmit` → 0 errors. dev 서버에서 POST API 호출로 거부 로직 작동 확인:

| # | 카드 | 현재 카테고리 | POST 결과 | 거부 로직 작동? | 이슈 매핑 |
|---|---|---|---|---|---|
| 1 | 차량용 햇빛가리개 | 50003307 (default) | category **거부** (suggestions 제외) | ✅ | 이슈 #2 (동일 코드 차단) |
| 2 | 초강력 스텐 변기펌프 | 50003307 | category **거부** | ✅ | 이슈 #5 (DVD/교양 d1 fallback 차단) |
| 3 | 리본 포인트 홈웨어 잠옷세트 | 50003307 | category **통과** → 50021261 (여성의류>니트>베스트) | ⚠️ | **이슈 #6 신규** |
| 4 | 하트 리본 누빔 여성 파자마 세트 | 50003307 | category **통과** → 50021261 (동일) | ⚠️ | 이슈 #6 동일 |

**이슈 #2와 이슈 #5 모두 차단 성공** (카드 1, 2). POST 응답에서 category 항목이 `autofillableSucceeded` 배열에서 제외되고 `suggestions[]`에도 포함되지 않아 셀러가 잘못 적용할 수 없는 상태 확보.

### [이슈 #6 신규 발견 — 다음 세션 인계]

**증상**: 카드 3, 4(홈웨어 잠옷세트, 파자마 세트)에서 AI가 `50021261` ("여성의류 > 니트 > 베스트")를 추천. 잠옷/홈웨어 상품을 "니트 베스트"(여성 조끼)로 매핑한 공이적으로 부적합한 결과.

**거부 로직이 통과시킨 이유**:
- best.s가 50 이상이라 1차 fallback 차단 통과
- 매칭된 d2 "니트" + 상품명 "파자마"/"홈웨어" 간 substring 일치는 없으나, AI reasoning에 "니트" 관련 힌트가 있어 token-overlap 검증을 통과

**원인 추정**: AI 프롬프트의 카테고리 설명 부족. 특히 "잠옷/홈웨어"는 "도 니트 재질 가능"하지만 "여성의류 > 니트 > 베스트"가 아닌 "여성의류 > 잠옷/홈웨어" 카테고리로 가야 함. 아래 개선 방안 제안:

1. **프롬프트 강화** (우선 1순위):
   - prompt에 "잠옷/홈웨어·속옷·파자마·내의/내복 상품은 반드시 여성의류 > 잠옷/홈웨어 카테고리" 명시적 안내
   - "니트·스웨터 텍스처 ≠ 잠옷/홈웨어" 구분 명시
   - few-shot 예시 3~5개 추가 (잠옷/파자마 → 여성의류>잠옷/홈웨어>잠옷, 니트 명시 상품 → 여성의류>니트 등)

2. **NAVER_CATEGORIES_FULL 검색 가중치 투입** (우선 2순위):
   - 상품명 token 중 카테고리 d3에 substring으로 자명하게 포함되는 경우 score 더 높게 (현재 +20)
   - 특히 "잠옷", "파자마", "홈웨어" 같은 형태 특이적 단어는 명시 매칭 시 더 큰 가중치 부여

3. **세밀한 거부 구조** (우선 3순위):
   - "의류" 상품이 d2 "니트" / "스웨터" 으로 가면 d3에 "잠옷"·"홈웨어" 그른다는 파키트 조건 추가

**우선순위**: 이 이슈는 정상 통과가 아닌 "AI 추천 정확도 향상" 영역. 이슈 #2/#5는 "틀린 추천 차단"이 목적이었고, 이슈 #6은 "더 좋은 추천"을 위한 작업이라서 다음 세션 주 작업으로 적합.

### [이슈 #3 미검] ready90 카드 AI 버튼 일시 재표시 정황

시간 부족으로 이번 세션에서 점검 미실시. 코스메틱·데이터 손실 없음으로 우선순위 낮음. 잔여·3 세션에서 처리 예정. 점검 절차는 ROADMAP.md "잔여·3 시작 메시지" 참조.

### 이번 세션의 핵심 학습 — 작업원칙 25번 신설 (NFC/NFD 정규화 대응)

**발생 상황**: 이전 채팅에서 filesystem:edit_file에 newText로 한글을 몇 번 입력하다 매칭 실패가 반복되자 Python으로 NFC 정규화를 시도했으나, 수정 과정에서 파일 대부분(~2,000줄)이 삭제되는 사고 발생. 다행히 commit 전이고 git restore로 복구 완료.

**원인 분석**:
- macOS 파일 시스템은 한글을 기본 NFD로 저장하는 경우가 많은데, edit_file은 NFC로 입력하면 byte가 달라져 매칭 실패
- Python의 unicodedata.normalize 처리 시 파일 내용을 split 후 재조립하는 과정에서 의도치 않은 손실 발생 가능함
- unicode escape (\uXXXX) 사용도 macOS의 NFD 저장과 일치 안 되면 매칭 실패

**해결책**:
1. 한글 byte 매칭 실패 시 절대 NFC 수동 정규화 금지 → git restore로 골 파일 원복 후 재시도
2. edit_file의 newText는 unicode escape 대신 한글 문자 직접 입력 (Claude의 내부 처리는 NFC로 안정)
3. 이미 수천 줄 파일을 다루는 경우 파일 전체 교체 대신 작은 단위로 분할 (50줄 이내)
4. 세션별 자세한 기록은 이 KKOTIUM_SESSION_LOG.md에 작성, PROGRESS.md/ROADMAP.md는 핵심 요약만 유지해 대형화 부담 경감

### 다음 세션에서 진행할 작업 (잔여·3)

1. **이슈 #6 카테고리 추천 정확도 개선** (주 작업):
   - src/lib/upload-readiness-filler.ts autoFillCategory 프롬프트 강화 (잠옷/홈웨어·속옷·파자마 명시 안내 + few-shot 3~5개)
   - score 계산 함수 가중치 투입 (d3 substring 일치 특히 "잠옷·파자마·홈웨어" 특이적 단어)
   - 라이브 검증: 카드 3, 4 재테스트 → 50021261 대신 올바른 잠옷/홈웨어 카테고리 추천 확인

2. **이슈 #3 ready90 카드 AI 버튼 점검** (선택적, 코스메틱):
   - UploadReadinessWidget.tsx ProductRow rendering condition 계산 시점 재검토
   - dashboard/page.tsx handleAutoFillApplied 흐름에서 stale prop console.log
   - 필요 시 useMemo 의존 배열에 product.id+score+completedItems 추가

3. **E-15 전체 완료 처리**:
   - 이슈 #6 개선 후 PROGRESS.md 상태 라인 변경 (“완료”)
   - ROADMAP.md 표와 변경, Sprint 6 마무리 선언
   - 다음 작업 후보 평가: E-1 빌더 AEO 강화 vs E-12 Discord 리뷰 알림 vs E-13B 알림톡 활성화 세팅 (트리거 도달 시)

### 이번 세션 변경 파일 요약
- src/lib/upload-readiness-filler.ts (+42/-8줄) — autoFillCategory 거부 로직 3추가
- src/app/api/upload-readiness/auto-fill/route.ts (+22줄) — PATCH currentProduct fetch + 동일 코드 2차 방어선
- KKOTIUM_PROGRESS.md (헤더 + 작업원칙 25번 + 짧은 세션 요약)
- KKOTIUM_ROADMAP.md (헤더 + 표 행 + 잔여·3 인계 메시지)
- KKOTIUM_SESSION_LOG.md (신규, 본 세션 자세한 기록)

### 이번 세션의 commit 계획 (작업원칙 24번: commit + push 한 묶음)

```
feat(E-15 Part 2 잔여 2차): 이슈 #2+#5 카테고리 거부 로직 이중 방어선 + 세션 로그 분리 + 이슈 #6 인계

- src/lib/upload-readiness-filler.ts: autoFillCategory 거부 3개 구조 (#5 fallback 폐기, #2 동일 코드, #5 token overlap)
- src/app/api/upload-readiness/auto-fill/route.ts: PATCH currentProduct fetch + 동일 코드 2차 방어선
- KKOTIUM_SESSION_LOG.md: 신규 파일 생성, 세션별 자세한 기록 누적
- KKOTIUM_PROGRESS.md: 헤더 갱신 + 작업원칙 25번 신설 (NFC/NFD 정규화 대응)
- KKOTIUM_ROADMAP.md: 잔여·3 인계 메시지 + 표 행 갱신
```

