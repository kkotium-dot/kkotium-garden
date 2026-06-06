# HANDOFF — Phase 1 누락 방지 골격 (asset_jobs 상태머신 + 관제탑 매트릭스)

> **FROM**: 🖥 Desktop (하이브리드 파이프라인 전체 시스템 연구 완료 + Phase 1 설계 확정, 2026-06-06)
> **TO**: 💻 Code
> **권위 문서**: docs/research/KKOTIUM_HYBRID_PIPELINE_SYSTEM_DESIGN_2026-06-06.md (본 핸드오프의 모든 근거)
> **Target Session**: phase1-asset-jobs-tracking
> **Branch**: main

---

## STEP 0 — 점검 (Code 자동 실행)

```
cd /Users/jyekkot/Desktop/kkotium-garden && \
git rev-parse HEAD origin/main && \
git status --short && \
curl -s -o /dev/null -w "production_http=%{http_code}\n" https://kkotium-garden.vercel.app/
```

선행 정독: docs/research/KKOTIUM_HYBRID_PIPELINE_SYSTEM_DESIGN_2026-06-06.md §4(스키마)·§7(누락방지)·§8(로드맵).

---

## 배경 (왜 이 작업인가)

대표 지시: "병행 작업이 어느 순간 계속 누락된다 → 그런 일이 없도록." 연구 결론: 도구 고도화 전에 **단일 진실 원천(asset_jobs 상태머신) + 신호등 관제탑 매트릭스 + docs 핸드오프** 3중 골격부터. Phase 1은 이 골격 구축.

기존 발행 관제탑(PublishControlTowerWidget)은 단건 신호등만 있음 → 상품 x 트랙 매트릭스로 확장 필요.

---

## SCOPE — Phase 1 (단계별 commit 권장)

### 작업 1 — Prisma 스키마: asset_jobs + asset_job_transitions + published_assets

schema.prisma에 3개 모델 추가. 컬럼 명세는 연구문서 §4 그대로. 핵심:
- asset_jobs: lane/job_type/tool enum, **ip_safe boolean**(면책 경로 검증), status enum(pending/ready/in_progress/blocked/awaiting_approval/done/failed/cancelled), version int(낙관적 잠금), retry_count/max_retries, input_refs/output_refs jsonb, blocked_reason, assigned_session, heartbeat_at, timestamps.
- asset_job_transitions: job_id FK, from_status/to_status, event, actor enum(system/ai_agent/human), note, created_at.
- published_assets: product_id, asset_urn, role enum(main/sub/detail), ip_provenance jsonb, naver_image_url, published_at.
- 모든 enum은 영어 상수(한글 리터럴 금지 #35). camelCase 컬럼은 SQL에서 따옴표.
- 기존 Product/product_options 등 미접촉(신규 테이블만, 회귀 0).

★ 순서 제약(#역순배포 방지): prisma/migrations는 gitignore → migration SQL을 본 핸드오프 하단 또는 별도 HANDOFF에 박제(단일 소스). **Code는 schema.prisma 작성 + prisma generate 후 commit 보류** → Desktop이 Supabase apply_migration 선행 → drift 0 확인 → Code push. 신규 테이블이라 기존 쿼리는 안 깨지나, Prisma 정합 위해 순서 준수.

### 작업 2 — 상태머신 전이 함수 (src/lib/jobs/asset-job-state.ts 신설)

- transitionJob(jobId, toStatus, {actor, event, note}) — 허용 전이만 통과(상태머신 가드), version 낙관적 잠금(UPDATE ... WHERE version=현재), 전이 시 asset_job_transitions 자동 insert.
- 허용 전이표: pending→ready→in_progress→(done|failed|blocked|awaiting_approval), blocked→ready, awaiting_approval→(in_progress|cancelled), failed→ready(retry_count<max).
- claimNextJob(lane, sessionId) — SELECT ... FOR UPDATE SKIP LOCKED로 1건 선점 + assigned_session/heartbeat 기록(다중 워커 중복 방지).
- detectZombies() — heartbeat_at이 임계(예: 10분) 초과한 in_progress를 blocked로(좀비 감지).
- 비가역 0(순수 DB 상태 함수, 네이버 미접촉).

### 작업 3 — 관제탑 매트릭스 위젯 확장

- 기존 PublishControlTowerWidget 보존하되, 신규 ControlTowerMatrix(상품 x 트랙) 추가 또는 확장.
- 트랙 컬럼: 이미지 / 발행 / 회선 / 운영정합 (asset_jobs lane·status 집계로 산출).
- 신호: done(녹)/in_progress(파)/pending(노)/blocked(빨)/미시작(회). **막힘 행 최상단 고정.** WIP 카운터(in_progress>3 경고). 누락 감지 룰(이미지 done인데 발행 미시작 → "다음 액션" 칩).
- 한글 문자열은 외부 JSON(control-tower-strings.ko.json 확장, #35). 이모지 0, Lucide 아이콘.
- API: /api/products/asset-jobs-matrix (asset_jobs 집계, 읽기전용).

### 작업 4 — docs 3계층 핸드오프 템플릿 정비

- PROGRESS.md에 "세션 핸드오프(에피소드)" 섹션 표준화: 한 것/결정/현재상태/다음 할 일.
- 연구문서 §7-(c) 3계층(에피소드/의미/절차) 반영.
- 5종 추적 MD(PROGRESS/ROADMAP/SESSION_LOG/TASK_BRIDGE/PRINCIPLES) Python full-overwrite 갱신(#29b 한글 깨짐 방지).

---

## 검증 (Code)

tsc 0 / build OK / 이모지 0 / 한글 리터럴 0 / 비가역 0(네이버 POST/PUT 0, DB는 신규 테이블 생성만) / 가짜 라벨 0(#46).

---

## VERIFICATION TRIGGER (Desktop 후속)

push hash 보고 → Desktop이: (1) git HEAD + Vercel deploy cross-check (2) Supabase apply_migration 선행했으면 drift 0 재확인 (3) Chrome MCP로 관제탑 매트릭스 실화면 실측(막힘 행 고정·WIP 카운터·누락 칩) (4) 결과 보고 → Phase 2 핸드오프.

---

## 작업 유의사항 (영구 + 본 트랙)

- 비가역 0(#46): 네이버 PUT/POST는 대표 명시 승인 없이 호출 0. 본 Phase는 네이버 미접촉.
- 명화 의도적 판매중지: 대표가 미완성 상품 노출 방지 위해 의도적으로 SUSPENSION 설정함. 결함 아님 → 시스템이 결함 drift로 오인 금지. NAVER_AUTOSUSPEND_ENABLED off 유지.
- IP 면책(#48): ip_safe 플래그로 최종 판매물 경로(Firefly→Adobe→Figma/Sharp) 강제. Nano Banana Pro/Canva/Claude Design은 시안 전용.
- 한글 대용량 MD는 edit_file 부분편집 금지 → Python full-overwrite(#29b).
- heredoc 금지 → write_file 후 python3 실행. 커밋 메시지는 .commit-msg.tmp 파일 → git commit -F.
- iterm/Filesystem 4분 행(#26) → 재시도 금지.
- `* 2.*` macOS 중복본은 대표 결정 대기(미접촉).

---

## 잔여 병행 트랙 (누락 방지 — 별도 추적)

- 명화 대표컷 하이브리드 재가공(Firefly 연출 + Adobe + Figma) — 대표 컨셉 방향 결정 후.
- 명화 mainImage 승격 → update dryRun → 대표 승인 → 네이버 반영 PUT(비가역).
- 채널상품 회선(/v1) ECONNRESET → 고정IP 이전(Cloudflare Tunnel 또는 유료 egress).
- 명화 앱 status 정합(네이버 의도적 SUSPENSION 반영).
