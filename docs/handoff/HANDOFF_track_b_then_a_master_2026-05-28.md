# MASTER HANDOFF — Track B (검증) → Track A (발행) 순차 진행 마스터 계획

> **작성**: 2026-05-27 PM Desktop turn 마무리 (B-13/B-13a 두 commit 완주 직후)
> **상태**: OPEN — 새 Desktop 채팅 진입 대기
> **베이스라인**: HEAD `016631c` (origin/main, Vercel READY) — B-13 + B-13a 완주 정합
> **권고 진행**: Track B (씨앗심기·엑셀 검증) → 통과 시 Track A (명화송풍구 B-12 발행)

---

## 0. 왜 B → A 순서인가 (의사결정 근거)

| 항목 | 즉시 A 진입 시 위험 | B 선행 시 효과 |
|---|---|---|
| 검증 | API 200 + DB 행만 본 상태 (실 파이프라인 미확인) | 크롤링→마진→SEO→엑셀 88칸 *눈으로* 검증 |
| 비가역성 | 명화송풍구 발행 = 스마트스토어 노출 + 광고비 발생 | 발행 전 모든 결함을 잡음 |
| 회귀 발견 | 발행 후 발견 시 *광고비 출혈 진행 중* | 발행 전 차단 → 광고비 0 |
| 셀러 성장 | 첫 발행이 "운"에 의존 | "검증된 파이프라인"에 의존 → 자신감 100% |

**핵심 단정**: 명화송풍구는 *오늘 살릴 수 있는데 안 살려도 내일 살아있다*. 그러나 *검증 안 한 채로 발행한 첫 상품이 잘못 노출되면 7일 골든윈도우 + 광고비 손실은 회복 불가*. 비가역 작업의 비용 비대칭이 명확하므로 검증 선행이 정답.

---

## 1. Track B — 씨앗심기 전과정 + 엑셀 88칸 실무 검증

### 1-A. 도구·환경 요구

- **Desktop 환경 필수** (Chrome MCP + Filesystem + Supabase MCP)
- 브라우저: Browser 1 (기존 production 탭 재활용 가능)
- 작업 대상: production `https://kkotium-garden.vercel.app`
- DB cross-check 채널: Supabase MCP `execute_sql`

### 1-B. 씨앗심기(PLANT) 전과정 체크리스트

> 한 흐름의 *모든 게이트*를 차례로 통과해야 정합. 각 게이트는 *API 200이 아니라 실제 데이터*를 봐야 함 (작업원칙 #45).

- [ ] **G1 도매매 URL 크롤링** — 상품 데이터 수집 (name / price / options / images / supplier 자동 식별)
- [ ] **G2 카테고리 자동 추천** — `naverCategoryCode` 채워지는지 (의류 둔갑 없는지 = B-12 fallback 폐기 효과)
- [ ] **G3 SKU 자동생성** — `DMM-XXXX` 형식, DB 중복 체크 통과
- [ ] **G4 꼬띠 점수(꿀통지수)** — 계산값 표시 + 등급 표시
- [ ] **G5 마진 계산** — 판매가 / 공급가 / 배송비 → margin 정확값 (B-7 50.69 같은 깨진 값 0건)
- [ ] **G6 배송 템플릿 연결** — 공급사 자동 매칭 (P17 검증)
- [ ] **G7 88필드 자동완성** — DRAFT 저장 → DB 행 생성 확인 (Supabase 3중 검증)
- [ ] **G8 이미지 파이프라인** — studio 진단 → 썸네일 → 상세 → save-assets → Product URL 컬럼 기록 (B-11 효과)

### 1-C. 네이버 엑셀 88칸 생성 체크리스트

- [ ] **E1 엑셀 생성** — 실제 상품으로 `POST /api/naver/excel` → `.xlsx` 다운로드
- [ ] **E2 88칸 검증** — xlsx 열어 다음 필드 *눈으로* 확인:
  - 판매자 상품코드 / 카테고리코드 / 상품명 / 옵션 / 대표이미지 / 추가이미지 / 배송 / A/S / 할인 / 포인트
  - 필수칸 공백 0 / 카테고리코드 정확 / 가격 단위 정확
- [ ] **E3 매핑 정합** — `naverExcelJS.ts buildDataRow` 1~88 매핑이 시트 column 순서와 일치
- [ ] **E4 (선택, 대표 승인 시)** — `sell.smartstore.naver.com` 상품일괄등록 수동 업로드 시도
  - 판매자센터는 보안상 브라우저 자동화 불가, 수동 진행
  - 업로드 실패 시 에러 메시지로 칸 단위 정밀 디버깅

### 1-D. Track B 통과 단정 조건

- G1~G8 + E1~E3 모두 ✅
- DB 3중 검증: API 응답 / Supabase Product 행 / Storage 객체 일치
- 88칸 xlsx 시각 검증: 카테고리/상품명/옵션/이미지/배송/가격 필수칸 0 공백

### 1-E. Track B에서 Code 인계 발생 가능 시나리오

| 발견 | Code 인계 |
|---|---|
| crawler 측 catD2 정규화 오류 (P21) | PC-D 분리 진입 |
| productNo 만료 stale 404 (P22) | PC-D 분리 진입 |
| 88칸 매핑 오류 (특정 column null) | 본 채팅 Desktop 진단 후 새 Code 채팅 인계 |
| margin/grading 회귀 | 본 채팅 Desktop 진단 후 새 Code 채팅 인계 |

발견 즉시 본 마스터 핸드오프에 `§ X 발견` 섹션 추가 + Code paste-ready 작성.

---

## 2. Track A — 명화송풍구(`cmpnooli40001f0gveaxr8iim`) B-12 라우트 발행

### 2-A. 선행 검증 완료 상태 (재작업 금지)

- 진단 L2 영속화 (Diagnosis 테이블, skeletonId S6, margin 2.03)
- 대표이미지: 화보 4종컷 1000x1000 (Cloudinary, 선명도 351.8 ok)
- Product `main_image_url` + `detail_image_url` DB 기록 완료 (B-11 우회 + Code 영구 수정)
- B-12 register 라우트 근본 재작성 적용 (categoryMap 폐기 / naverRequest OAuth2 / 거짓 라벨 0)

### 2-B. 발행 흐름 (비가역)

1. `/products?id=cmpnooli40001f0gveaxr8iim` 진입
2. (선택) 썸네일/상세 보강 — main/detail 모두 살아있어 skip 가능
3. **"네이버 직접 등록"** 클릭 → B-12 새 라우트 호출
4. 응답 `success: true` + `naverProductId` 실제 값 검증
   - PENDING_/ERROR_/MOCK_ 패턴 0건 (작업원칙 #46)
5. 스마트스토어 실 노출 + 카테고리 `50003356` + 상세페이지 표시 시각 검증
6. DB row cross-check: `naverProductId IS NOT NULL`, status = 'registered', registeredAt 정확

### 2-C. 완주 후 후속

- 하트클립(도매꾹 `65322570`) 동일 흐름
- MD 5종(SESSION_LOG / PROGRESS / ROADMAP / TASK_BRIDGE / HANDOFF) 누락 없이 갱신
- 본 마스터 핸드오프 `[CLOSED]` 처리 + B-12/B-11 핸드오프 §7 ARCHIVED

---

## 3. 새 Desktop 채팅 진입 메시지 (paste-ready)

> **사용법**: 새 Desktop 채팅 첫 입력으로 아래 회색 블록 전체를 복붙. STEP 0 정독부터 자동 진입.

```
꽃틔움 가든 Desktop. Track B (씨앗심기 전과정 + 엑셀 88칸 실무 검증) turn.

[STEP 0 — 사전 정독 의무]
docs/handoff/HANDOFF_track_b_then_a_master_2026-05-28.md 정독 →
docs/plan/PROGRESS.md → ROADMAP.md → TASK_BRIDGE.md(§3 ACTIVE) 순.
브라우저는 Browser 1 사용. HEAD 016631c (Vercel production READY).

[선행 상태 — 검증 완료]
- B-13 (b6ce4bb): PLANT 하단 체크박스+버튼 visual 탭 정합 ✅
- B-13a (016631c): PLANT 상단 헤더 dup 등록 버튼 14줄 제거 ✅
- Desktop 7탭 순회 재검증 통과: 6탭 등록 버튼 0 / visual 탭만 노출 ✅
- 명화송풍구 cmpnooli40001f0gveaxr8iim: 이미지·margin·상세PNG·DB 모두 정합
- B-12 register 라우트: categoryMap 폐기 + OAuth2 위임 + 거짓 라벨 0
- B-11 save-assets DB UPDATE: 코드 영구 수정 완료

[이번 turn 목표 — Track B (검증 only, 비가역 작업 0)]
1. 씨앗심기(PLANT) 전과정 G1~G8 게이트 통과 점검
   (도매매 URL 크롤링 → 카테고리 자동추천 → SKU → 꼬띠점수 → 마진계산
    → 배송 템플릿 → 88필드 자동완성 DRAFT 저장 → 이미지 파이프라인)
2. 네이버 엑셀 88칸 E1~E3 검증
   (POST /api/naver/excel → xlsx 다운로드 → 88칸 시각 검증 → 매핑 정합)
3. DB 3중 검증 (Supabase Product 행 / Storage 객체 / API 응답 일치)
4. 검증 통과 시 → Track A (명화송풍구 B-12 발행) 별도 채팅 진입 권고

[Track B 검증 대상 상품 후보]
- 명화송풍구는 *발행 후보*이므로 검증 대상 부적합 (재작업 위험)
- 신규 도매매 URL 1건 또는 DRAFT 상태 다른 상품 (대표 결정 필요)

[필수 기법]
- API 200 + 응답구조 + DB cross-check 3-tier (#45)
- studio 버튼은 pointerdown~mouseup~click 풀 이벤트 시퀀스
- 네트워크 가로채기로 API 결과 포착
- 상세는 Sharp 5000~7000px 무거운 합성 → #26 행 위험 시 즉시 보고
- React state 직접 조회는 보안 차단 → DOM/네트워크 경유

[Track A는 본 turn 범위 외 — 비가역, 별도 채팅 권장]
Track B 통과 보고 + 대표 승인 후 새 Desktop 채팅에서 진입.

[절대준수] #45 production smoke 정답 / #46 거짓 라벨 금지 / #41 두 환경 핑퐁 /
SD-01 아랍어 footer 영구 보존(조사·수정 0).

[마무리] Track B 검증 완료 후 본 마스터 핸드오프 §4에 결과 prepend +
Code 인계 사항 발견 시 paste-ready 작성.
```

---

## 4. 작업유의사항 (대표가 늘 강조하시는 사항) — 상시 체크리스트

### 4-A. 거짓 진행 보고 금지 (작업원칙 #46) — 최상위

- API 200만 보고 "성공" 단정 금지 → 응답구조 + DB cross-check 의무
- registry 등재 = 실 가동 후만 → 미구현 작업 사전 라벨 금지
- 라벨은 fetch 결과 기반만 → hardcoded 정상 금지
- "준비/대기/보류" 사용자 UI 노출 금지 (관리자 영역 `/admin/*` 한정)
- production 실측이 코드 정독을 *항상* 이긴다 (B-13a 헤더 dup 발견 사례)

### 4-B. 두 환경 핑퐁 (작업원칙 #41)

- Desktop: planning + verify (Chrome / Supabase / Vercel / Filesystem read)
- Code: build + ship (Filesystem write / Bash / Git / TSC)
- 못 하는 작업 우회 시도 금지 → 다른 환경에 hand-off
- §3 TASK_BRIDGE ACTIVE 매 hand-off 갱신
- HANDOFF MD는 항상 `docs/handoff/` 폴더에 정착

### 4-C. Production = Source of Truth (작업원칙 #28)

- `npm run dev` 가정 production 아키텍처 절대 제안 금지
- 검증은 `https://kkotium-garden.vercel.app` 기준
- push 후 `scripts/verify-vercel-deploy.sh --wait` exit 0 의무 (#36)

### 4-D. 한글 처리 (작업원칙 #29)

- JSX 한글 inline 금지 → `src/lib/i18n/*.ko.json` 분리 (#35)
- 코드 주석 영어만
- 타입 리터럴 한글 금지
- 커밋 메시지 한글 다량 시 `.commit-msg.tmp` 경유 → `git commit -F` → 즉시 삭제 (#17)
- MD 한글 패치는 `Write`(전체 덮어쓰기) 또는 Python 안전 삽입 (#29 b)
- 닉네임 prose 사용 절대 금지 — 사용자 메시지 인용 / 코드 변수 / write_file MD 한정 (#29 e++)

### 4-E. 검증 (작업원칙 #32)

- TSC 통과 ≠ Production 빌드 통과 → `npm run build` 추가 실행
- 한글 sentinel grep 0 hits 의무: `혁섭|쿠드|식타|릴고|헌서|위젝|스칵|쿠두`

### 4-F. iterm-mcp 행 패턴 (작업원칙 #26)

- 4분 무응답 발생 시 즉시 Filesystem MCP로 fallback
- heredoc(`<< 'EOF'`) 절대 금지 → 단일 라인 명령 또는 Python 스크립트
- 동일 세션에서 이미 행 발생한 명령은 재시도 금지

### 4-G. AI fallback chain (Standing Decision SD-03)

- 1순위: Groq (3 키 round-robin, llama-3.3-70b-versatile)
- 2순위: Gemini (deprecated, 신규 코드 금지)
- 3순위: Anthropic (last-resort + Vision diagnosis 한정)
- Perplexity / xAI 완전 deprecated

### 4-H. 영구 보존 사항 (Standing Decisions)

- **SD-01**: `/studio` footer 아랍어 텍스트 영구 보존 — 조사 / 수정 / 삭제 / 문서화 / source 추적 금지 (사용자 의도적 개인 감사 메시지)
- **SD-02~SD-07**: TASK_BRIDGE.md §4 STANDING 참조

---

## 5. 두 환경 핑퐁 프로세스 — Recovery Drill

### 5-A. 새 세션 진입 시 4-step 정독 (필수)

```
1. PROGRESS.md 헤더 (직전 commit + 다음 작업)
2. ROADMAP.md "다음 새 채팅 시작 메시지" ⭐ ACTIVE
3. SESSION_LOG.md 최근 entry
4. TASK_BRIDGE.md §3 ACTIVE + §4 STANDING + §6 PENDING
```

### 5-B. 본 마스터 핸드오프 위치

- 경로: `/Users/jyekkot/Desktop/kkotium-garden/docs/handoff/HANDOFF_track_b_then_a_master_2026-05-28.md`
- 새 Desktop 채팅 STEP 0에서 본 파일 정독 의무

### 5-C. 컨텍스트 한계 대비

- Track B 진행 중 컨텍스트 임계 도달 시: §4에 진행 상태 prepend + 새 채팅으로 분할
- Track A는 *Track B 완전 통과 후* 새 채팅 진입 (오염 방지)

---

## 6. 오늘(2026-05-27) 완주 결산

| 작업 | Commit | 검증 |
|---|---|---|
| B-13 PLANT 비주얼탭 액션블록 스코프 정합 | `b6ce4bb` | Desktop 7탭 실측 통과 |
| B-13a PLANT 헤더 중복 등록 버튼 제거 | `016631c` | Desktop 7탭 실측 통과 |
| HANDOFF_atelier_routing_plant_checkbox | — | [CLOSED 2026-05-27 PM] |
| HANDOFF_plant_header_duplicate_buttons | — | [CLOSED + Desktop VERIFIED] |

### 두 환경 핑퐁 사이클 통과 사례
```
Desktop 진단 → Code build (b6ce4bb) → verify-vercel-deploy
→ Desktop 재검증 → 잔존 회귀 1건 신규 발견 (헤더 dup)
→ Code build (016631c) → verify-vercel-deploy
→ Desktop 재검증 → 7탭 전수 통과 → 영구 CLOSED
```

작업원칙 #41 + #45 직접 실전 사례. production 실측이 코드 정독만으로 못 잡는 회귀(헤더 dup)를 잡아낸 표본 케이스로 영구 보존.

---

## 7. Code 측 인계 사항

### 7-1. [PROCESSED] 크롤러 desc.contents 빈 객체 TypeError 근본 수정 (2026-05-28, commit d2f5d6e)

Track B G1 정주행 중 36904429(아이스트레이) 크롤링 HTTP 500 (`e.replace is not a function`) 발견 -> Code 1-commit 근본 수정 완료. 도매꾹이 상세 본문 없을 때 `desc.contents`를 빈 객체 `{}`로 직렬화 -> nullish 가드 통과 -> `stripHtmlToText({}).replace` TypeError. `src/lib/sources/domemae-adapter.ts` Fix A(추출 타입가드)+B(헬퍼 가드)+C(title String 강제). TSC 0 / build 0 / verify-vercel exit 0. 상세: `docs/handoff/HANDOFF_crawler_desc_contents_type_2026-05-28.md` (OPEN — Desktop 재검증 후 CLOSED). Desktop은 동일 36904429로 G1부터 재개.

Track B 진행 중 추가 Code 인계 발견 시 본 섹션에 paste-ready 작성.
