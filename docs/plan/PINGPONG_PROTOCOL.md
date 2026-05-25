# 핑퐁 운영 매뉴얼 — Claude Code ↔ Claude Web 유기적 협업

> 작성: 2026-05-22 / Co-Founder(시니어)
> 대상: 대표님(전령/중계자) — 복사-붙여넣기용 입력문 + 결과 회수 양식
> 원칙: 작업원칙 #41 (2-track). 코드/git/터미널 = Code, 설계/문서/MCP/검증 = Web
> 핵심: 대표님은 두 AI 사이를 오가는 전령. 정형 메시지만 복사하면 충돌 0.

---

## 0. 핑퐁의 황금률 (절대 규칙)

1. **한 번에 한 STEP.** Code에 STEP 전체를 한꺼번에 주지 말 것. 1개 STEP → 결과 회수 → 다음.
2. **결과는 반드시 Web으로 되돌린다.** Code가 끝내면 "핸드백 블록"을 복사해 Web에 붙여넣기.
   Web이 검증/다음 설계 → 다시 Code로. 이 왕복이 핑퐁.
3. **충돌 신호 = 즉시 정지.** Code가 "merge conflict" "이미 존재" "타입 에러 N개" 보고 시,
   진행 말고 그 메시지 그대로 Web에 가져올 것. Web이 진단.
4. **거짓 보고 금지 양쪽 모두.** "아마 됐을 것" 금지. Code는 실제 터미널 출력,
   Web은 실제 도구 결과만 신뢰. (작업원칙: 테스트 결과 날조 금지)

---

## 1. 핑퐁 흐름도 (전체 그림)

```
[Web] 설계·DB·문서 완성 (← 지금 여기까지 끝남)
   │  대표님이 START_HERE 입력문 복사
   ▼
[Code] STEP 1 (db pull 동기화) 실행
   │  대표님이 핸드백 블록 복사
   ▼
[Web] STEP 1 결과 검증 → STEP 2 GO/수정 판단
   │  대표님이 다음 입력문 복사
   ▼
[Code] STEP 2 (어댑터) 실행
   │  ... 반복 ...
   ▼
[Code] STEP 5 (CTR/CVR) — 네이버 API 검증 결과를 Web에
   │
   ▼
[Web] 최종 검증 + 게이트3 UI 다음 설계
```

---

## 2. Code에 줄 입력문 (STEP별 복사용)

### ▶ STEP 1 입력문 (지금 첫 메시지 — 이것부터 복사)
```
docs/plan/START_HERE_PROMPT_ASSET_ENGINE.md 를 읽고 STEP 0(사전점검)과
STEP 1(prisma db pull 동기화)만 진행해줘.

중요:
- DB는 이미 시니어가 art_director_prompts에 14컬럼 추가 적용함.
  너는 새 migration 만들지 말고 db pull로 schema.prisma에 역동기화만.
- self-relation은 PromptLineage 이름으로 교정.
- 기존 @map/@@map 깨지면 수동 복원.
- 완료되면 아래를 보고해줘:
  1) npx prisma db pull 의 변경 요약 (어떤 필드가 추가됐는지)
  2) npx tsc --noEmit 결과 (에러 0인지)
  3) git status --short

STEP 2 이후는 아직 진행하지 마. STEP 1 결과만 보고.
```

### ▶ STEP 2 입력문 (Web이 STEP1 OK 판정 후)
```
START_HERE STEP 2 (모델 어댑터 레이어)를 진행해줘.
- src/lib/art-director/model-adapters/ 신규
- docs/plan/SEED_PROMPTS_DESIGN.md 의 15 템플릿(5 intent x 3 model) 기반
- model-adapter.types.ts: ImageIntent, ImageModel, AdapterInput, AdapterOutput
- 모델별 작성규칙 준수 (Firefly 짧게+UI / NanoBananaPro 멀티턴+유지요소 / GPTImage2 제약서술)
- English comments only, 한글 리터럴 금지 (작업원칙)
- 완료 후 npx tsc --noEmit 결과와 생성 파일 목록 보고.
STEP 3 이후는 멈춰.
```

### ▶ STEP 3 입력문 (Web이 STEP2 OK 후)
```
START_HERE STEP 3 (시드 템플릿 적재)를 진행해줘.
- 파일: prisma/seed-prompt-templates.sql (시니어가 작성, 멱등성·트랜잭션 처리됨)
- Supabase SQL Editor 또는 psql로 실행
- 실행 후: SELECT count(*) FROM art_director_prompts WHERE status='template';
  결과가 15인지 확인해서 보고.
STEP 4 이후는 멈춰.
```

### ▶ STEP 4 입력문 (Web이 STEP3 OK 후)
```
START_HERE STEP 4 (legal-lint 검수 모듈)을 진행해줘.
- src/lib/automation/legal-lint.ts 신규
- 기존 dark_pattern_lint_logs 테이블 + copy-writer.ts 연동
- 표시광고법 금지표현 사전 + 조건부 허용 로직 (HANDOFF 섹션3 참조)
- English comments only
- 완료 후 npx tsc --noEmit 결과 보고.
STEP 5 이후는 멈춰.
```

### ▶ STEP 5 입력문 (Web이 STEP4 OK 후 — 가장 중요)
```
START_HERE STEP 5 (CTR/CVR 파이프라인)를 진행하되, 먼저 검증만 해줘.
docs/plan/HANDOFF_CTR_CVR_PIPELINE.md 섹션 1 기준:
- 네이버 커머스 API에 "상품 노출수/클릭수(CTR)" 통계 엔드포인트가 있는지
  src/lib/naver/api-client.ts 로 실제 확인.
- 있으면: 회수 가능한 필드 목록 보고.
- 없으면: 솔직히 "CTR 불가, CVR만 가능" 보고. 헛코드 만들지 마.
이 검증 결과만 먼저 보고하고, 실제 파이프라인 코드는 멈춰.
(Web이 검증 결과 보고 CVR-only vs full 설계 분기 결정)
```

---

## 3. Code → Web 핸드백 양식 (대표님이 Code 답변을 이 틀로 Web에 전달)

Code가 끝낼 때마다, 대표님은 Code의 답변을 아래 틀에 담아 Web에 붙여넣으세요.
(Code가 이 틀로 답하도록 STEP 입력문에 "아래를 보고해줘"가 들어있음)

```
[CODE 핸드백 / STEP N]
- 실행 결과: (성공/실패/부분)
- tsc --noEmit: (에러 0 / 에러 N개 — 내용)
- 변경 파일: (목록)
- 특이사항/막힌점: (없음 or 내용)
- git status: (출력)
```

→ 이걸 Web에 그대로 붙이면, Web이 "검증 완료, STEP N+1 GO" 또는
   "이 부분 수정 필요" 판단 후 다음 입력문을 다시 만들어 드림.

---

## 4. 충돌·오류 시 비상 양식 (막히면 이걸 Web에)

```
[충돌 발생 / STEP N]
Code가 보고한 에러 원문:
"""
(터미널 출력 그대로 복사)
"""
무엇을 하던 중이었는지: (간단히)
```
→ Web이 근본원인 진단 + 복구 입력문 제공. 임의로 재시도하지 말 것.

---

## 5. 역할 경계 (헷갈릴 때 참조)

| 작업 | Code(CLI) | Web(여기) |
|---|---|---|
| schema.prisma 편집 | ✅ | ❌ |
| git commit/push | ✅ | ❌ |
| npx/터미널 실행 | ✅ | ❌ |
| 코드 파일 작성 | ✅ | ❌ |
| Supabase DDL(MCP) | △ 가능하나 Web이 함 | ✅ |
| 설계·문서(MD) | ❌ | ✅ |
| 브라우저 검증 | ❌ | ✅ |
| 다음 STEP 판단 | ❌ | ✅ |

> 회색지대(Supabase DDL): 이미 Web이 DB 적용함. Code는 db pull로 받기만.

---

## 6. 세션 식별 (작업원칙 #41 핸드오프 규칙)

Code 입력문 맨 위에 항상:
```
Target Session: claude-code
Branch: feature/prompt-asset-engine
```
Web 복귀 메시지 맨 위에 항상:
```
Target Session: claude-web
(STEP N 핸드백)
```

---

(끝 — 대표님은 복사만. 판단은 Web, 실행은 Code.)
