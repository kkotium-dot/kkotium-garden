# HANDOFF — 진단 API 504 타임아웃 (B-4) : autoRunVisual 정상품질 상품 진단 불가

> **이 문서의 역할**: Desktop(검증)이 진단을 완결하여 Code(수정)에 넘기는 상세 인계장.
>
> **상태**: OPEN — Code 수정 대기 (최우선 blocker)
> **작성**: 2026-05-27 Desktop 세션 (Chrome + Supabase + Vercel MCP 교차검증)
> **방향**: Desktop -> Code
> **재구성**: 2026-05-27 (직전 세션 진단 내용 + 코드 흐름 정밀 분석 병합)

---

## 1. Code 새 채팅 진입 메시지 (paste-ready)

```
꽃틔움 가든 — 진단 API 504 버그 hand-off (Desktop -> Code).
docs/handoff/HANDOFF_diagnose_timeout.md 정독 후 진행.

[세션 시작 절차]
1. CLAUDE.md 4-step 부트스트랩 수행
2. git rev-parse HEAD origin/main && git status --short && git stash list
3. SESSION_LOG.md 라인수 확인 (1500 초과 시 archive 분할 선행 — 작업원칙 #31)

[작업 목표]
autoRunVisual 핵심 엔진(/api/diagnose)이 "정상 품질 상품(L4 아님)"에서
504 타임아웃 + Uncaught Exception으로 죽음. 첫 정상품질 상품 등록을 막는 최우선 blocker.
로컬 재현 -> 스택 확정 -> 수정 -> tsc 0 -> build 0 -> 커밋 -> 푸시 -> Desktop 재검증.

[대상 상품]
명화송풍구 id=cmpnooli40001f0gveaxr8iim (DRAFT, 판매가29000,
카테고리50003356=아로마방향제/디퓨저, 원산지200037=중국)

수정 후 push hash 를 Desktop 채팅에 보고하면 Desktop이 Chrome MCP로 진단 재검증함.
부수버그 B-5~B-8 도 같은 세션에서 정리 (아래 섹션 6).
```

---

## 2. 현상 (재현 100%)

- 명화송풍구를 `/studio`에서 "AI 진단 실행" 클릭 시 45초+ pending 후 멈춤.
- 화면 무한 "진단 중…", 결과(골격/등급/신뢰도/품질) 안 뜸.
- 새로고침 / 이미지 교체 / 재실행 모두 동일 재현.

---

## 3. 근본 원인 — 확정 (추측 아님, 데이터 근거)

### 3-1. 서버 로그 확정
Vercel 런타임 로그 (prj_H5HamuDSG0Na6j5dwDlYe9A6FfC4 / team_uwIkDWZsS2gogA04mZIVDuPF):
```
POST /api/diagnose -> 504 + "Uncaught Exception: Error: ..." 4회 반복 (2026-05-27 06:30~06:39)
```
→ 서버 함수가 예외를 던지며 타임아웃. Exception 전문은 로그에서 잘림 → 로컬 un-minified 스택 필요.

### 3-2. 이미지 변수 완전 배제 (검증 완료)
| 테스트 | 결과 | 결론 |
|---|---|---|
| 도매꾹 PNG(_stt_330) | 멈춤 | 포맷 무관 |
| 도매꾹 JPG(_img_760) | 멈춤 | 포맷 무관 |
| 외부 picsum.photos/400/400 직접 호출 | HTTP 000 / 50초 타임아웃 | **이미지 범인 아님** |
| curl 이미지 직접 다운로드 | HTTP 200 / 1초 | CDN 접근 정상 |

→ 진단 API 내부 파이프라인 자체가 멈춤. 이미지는 처음부터 범인이 아니었음.

### 3-3. 왜 달항아리(L4)는 됐고 명화송풍구는 안 되나 — 코드 흐름
`src/app/api/diagnose/route.ts` 흐름:
```
1. runPFilter(imageUrl)              // P-Filter 이미지 품질 분석 (Sharp)
2. if (pFilter.grade === 'L4') { early return }   // 달항아리는 여기서 조기 종료 -> 성공
3. inferConceptTone(...)             // CTI 8축 추론
4. gradeProduct(...)                 // 등급 판정 + skeleton 매칭
5. persistDiagnosis(...)             // DB upsert
```
- 달항아리 = L4 → 2번에서 조기 종료 → 무거운 3~5단계 안 탐 → 성공(과거 검증됨)
- 명화송풍구 = 이미지 양호(L4 아님) → 3~5단계 끝까지 진행 → 예외/타임아웃
- **역설적 버그: "품질 좋은 상품"에서만 터짐.** autoRunVisual 핵심 결함.

---

## 4. 범인 후보 — 로컬에서 이 순서로 확인 (의심도 순)

| # | 파일 / 함수 | 의심도 | 확인 포인트 |
|---|---|---|---|
| 1 | `src/lib/diagnosis/concept-tone-inference.ts` (inferConceptTone) | 높음 | 외부 AI(Groq) 호출 시 timeout/abort 가드 없는지. 응답 무한대기 / await 누락 / Promise 미해결 |
| 2 | `src/lib/diagnosis/grading.ts` (gradeProduct) | 중간 | roi 계산 0 나눗셈 -> NaN, skeleton 매칭 무한 루프, 미정의 접근 예외 |
| 3 | `src/lib/diagnosis/p-filter.ts` (runPFilter) Sharp 연산 | 중간 | L4 미해당 경로에서 추가 Sharp 처리가 Vercel nodejs 런타임에서 행 |
| 4 | `src/app/api/diagnose/route.ts` maxDuration 미설정 | 높음 | route에 `export const maxDuration` 없음 -> 기본 타임아웃 + 무거운 동기연산 충돌 |

### 4-1. 가장 유력한 가설 (수정 시간 단축용)
**CTI 추론(inferConceptTone)의 외부 AI 호출에 timeout/abort 가드가 없을 가능성이 가장 높음.**
근거: (a) L4 조기종료는 AI 호출 전이라 안전, (b) 504는 "응답이 안 오는" 전형적 외부호출 행 패턴,
(c) Sharp 단독 연산은 보통 예외를 즉시 던지지 504까지 안 감.
→ Code는 inferConceptTone 부터 열어, fetch에 AbortController(예: 15s) + try/catch graceful fail 확인.

---

## 5. 수정 검증 절차 (Code)

```bash
# 1. 상태 확인
git rev-parse HEAD origin/main && git status --short

# 2. 로컬 재현 (un-minified 스택 확보)
npm run dev
# 새 터미널:
curl -X POST localhost:3000/api/diagnose -H 'content-type: application/json' \
  -d '{"productName":"테스트","imageUrl":"https://picsum.photos/400/400","category":"아로마방향제/디퓨저","salePrice":29000,"supplierPrice":14300,"persist":false}'
# -> Exception 정확한 라인/스택 확인
```

3. 범인 함수 수정 — 핵심 가드 3종 적용:
   - 모든 외부 호출(AI)에 `AbortController` timeout (권장 15s) + try/catch graceful fail
   - `gradeProduct` 수치 계산에 0-division / NaN 가드
   - `export const maxDuration = 60` 을 diagnose route 에 추가 (Vercel 함수 타임아웃 상향)
4. 명화송풍구로 실제 진단 → 골격/등급/신뢰도/품질 정상 반환 확인
5. `npx tsc --noEmit` 0 + `npm run build` 0 → 커밋 → 푸시 → verify-vercel-deploy
6. push hash 보고 → Desktop이 Chrome MCP로 /studio 명화송풍구 진단 재검증

### 5-1. 커밋 메시지 (Korean — .commit-msg.tmp 패턴, 작업원칙 #17)
```
fix(diagnose): B-4 정상품질 상품 진단 504 타임아웃 근본 복구

- inferConceptTone 외부 호출에 AbortController timeout + graceful fail 가드 추가
- gradeProduct 수치계산 NaN/0-division 가드
- /api/diagnose maxDuration=60 설정
- L4 미해당 경로 전체 파이프라인 정상 통과 확인 (명화송풍구 재현 해소)
```

---

## 6. B-4 외 — 같은 세션에서 정리할 부수 버그

| ID | 내용 | 수정 방향 | 우선순위 |
|---|---|---|---|
| B-5 | `PUT /api/products`가 stock 필드 포함 시 Prisma 500. route.ts PUT에서 `stock: parseInt(updateData.stock)` 무조건 적용 -> 스키마 불일치 | stock 조건부 처리 / 스키마 정합성 확인. (임시우회: Desktop이 Supabase 직접 UPDATE로 이미지 교정 완료) | 중 |
| B-6 | `/api/naver/categories`가 count:0 반환. 4,993개 카테고리 데이터(naver-categories-full.ts) 연결 끊김 | route가 로컬 데이터 로드하는지 점검. 카테고리 검색 UI 직결 이슈 | 중 |
| B-7 | 상품 생성 POST 기본값 오류 — originCode 기본 `'0200037'`(앞 0 오타, 정답 `'200037'`), naverCategoryCode 기본 `'50003307'`(임의값). 미입력 시 잘못된 값 박힘 | 기본값 제거 또는 정답값 교정 + 미입력 시 validation 차단 | 중 |
| B-8 | 소싱 시 원본 이미지 330px만 저장 (760px original 미사용). 단 760 JPG는 진단과 무관(B-4가 진짜 원인) | 소싱 수집 시 original 우선 수집 (이미지 품질 향상용 별건) | 낮 |

> 주의: B-5~B-8은 B-4 수정/푸시 완료 후 별도 커밋으로 분리. B-4 한 건만으로 명화송풍구 등록 흐름이 풀리므로, B-4 우선 푸시 -> Desktop 재검증 -> 그 다음 부수버그 정리 순서 권장.

---

## 7. 완료 조건 (Definition of Done)

- [ ] 로컬에서 명화송풍구(또는 picsum 테스트) 진단이 504 없이 정상 결과 반환
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run build` 성공
- [ ] 커밋 + 푸시 + Vercel READY
- [ ] push hash Desktop 보고 (Desktop 재검증 트리거)
- [ ] (B-4 완료 후) B-5~B-8 별도 커밋 정리
