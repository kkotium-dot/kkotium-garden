# START HERE — 프롬프트 자산화 엔진 (Claude Code 시작 가이드)

> 작성: 2026-05-22 / 시니어(Claude Web) → Claude Code 세션 시작용
> 이 문서 하나만 읽고 순서대로 진행하면 됨. 상세는 각 핸드오프 참조.
> Target Session: claude-code (CLI) / Branch: feature/prompt-asset-engine

---

## 한 줄 요약

DB는 시니어가 이미 확장 적용함(art_director_prompts +14컬럼).
Code는 (1) 코드 동기화 → (2) 어댑터 작성 → (3) seed 적재 → (4) 피드백 파이프라인 순서.

---

## STEP 0 — 사전 점검 (작업원칙 #21)

```bash
git rev-parse HEAD origin/main && git status --short && git stash list
git checkout -b feature/prompt-asset-engine   # 신규 브랜치
npx prisma db pull --print                     # DB 차이 미리보기 (적용 X)
```

---

## STEP 1 — DB → 코드 동기화 (최우선, 충돌 방지)

상세: docs/plan/HANDOFF_PROMPT_ASSET_ENGINE.md 섹션 0~1

```bash
npx prisma db pull        # 시니어가 추가한 14컬럼을 schema.prisma에 반영
npx prisma generate       # Prisma Client 재생성
npx tsc --noEmit          # 0 에러 확인
```

확인 포인트:
- art_director_prompts 모델에 신규 필드 14개 들어왔는지
  (model, modelVersion, intentTag, modelSpecificPrompt, seed, resolution,
   referenceImageIds, legalFlags, businessMetrics, metricsRefreshedAt,
   parentPromptId, deprecated, deprecationReason, updatedAt)
- self-relation 이름 의미있게 교정 (PromptLineage)
- 기존 @map/@@map 깨지면 수동 복원

> ⚠️ db pull 전에 다른 migration 돌리지 말 것. DB가 코드보다 앞서 있음.

---

## STEP 2 — 모델 어댑터 레이어

상세: docs/plan/HANDOFF_PROMPT_ASSET_ENGINE.md 섹션 2
       docs/plan/SEED_PROMPTS_DESIGN.md (15 템플릿 원문)

- src/lib/art-director/model-adapters/ (신규 or prompt-translator.ts 확장)
- model-adapter.types.ts: ImageIntent(5) x ImageModel(4) 타입
- 5 intent x 3 model = 15 어댑터 함수
- 모델별 작성규칙: Firefly(짧게+UI) / NanoBananaPro(멀티턴+유지요소명시) / GPTImage2(제약서술)

```bash
npx tsc --noEmit   # 0 에러
```

---

## STEP 3 — 시드 템플릿 적재

파일: prisma/seed-prompt-templates.sql (시니어 작성, 검증된 28컬럼 맞춤)

```bash
# Supabase SQL Editor 또는 psql로 실행
# 멱등성 보장 (재실행 안전), 트랜잭션 처리됨
# 실행 후 검증:
#   SELECT count(*) FROM art_director_prompts WHERE status='template';  -- 15 반환
```

> 주의: STEP 1(db pull) 완료 후 실행. 안 그러면 Prisma Client가 신규컬럼 모름.

---

## STEP 4 — legal-lint 검수 모듈

상세: docs/plan/HANDOFF_PROMPT_ASSET_ENGINE.md 섹션 3

- src/lib/automation/legal-lint.ts (신규)
- 기존 dark_pattern_lint_logs 테이블 + copy-writer.ts 연동
- 표시광고법 금지표현 사전 + 조건부 허용 로직

---

## STEP 5 — CTR/CVR 피드백 파이프라인

상세: docs/plan/HANDOFF_CTR_CVR_PIPELINE.md (전체)

- ★ 첫 작업: 네이버 통계 API 가용성 검증 (CTR 받아올 수 있나?)
  - 못 받으면 CVR만 자동화 + CTR 폴백 (정직하게)
- metrics-collector.ts + /api/cron/metrics-sync route
- prompt-curator.ts (상위20% 승격 / 하위20% deprecate)

---

## 커밋 (작업원칙 #17 — 한글 .commit-msg.tmp 경유)

각 STEP 완료마다 분리 커밋 권장:
- STEP1: "chore(prisma): art_director_prompts db pull 동기화"
- STEP2: "feat(art-director): 모델 어댑터 5x3 레이어"
- STEP3: "chore(seed): 프롬프트 템플릿 15종 적재"
- STEP4: "feat(automation): legal-lint 표시광고법 검수"
- STEP5: "feat(metrics): CTR/CVR 회수 파이프라인"

---

## 완료 후 시니어에게 핸드백 (Target Session: claude-web)

- STEP1 db pull diff 결과 + tsc 0에러
- STEP3 seed 15건 확인
- STEP5 네이버 통계 API 가용성 결과 (CTR 자동화 가능 여부)

---

## 별건 — 나중에 (오늘 작업과 분리)

- RLS 보안: 27개 테이블 RLS 비활성화 (HANDOFF_PROMPT_ASSET_ENGINE.md 섹션 6)
  1인 셀러 단일사용자라 우선순위 중간. service_role 정책 설계 후 일괄.
- 클로드 디자인 프리셋 폰트 교체 (대표님 슬로건 필기체 확정 시)

---

(끝 — 이 문서가 단일 진입점. STEP 순서대로.)
