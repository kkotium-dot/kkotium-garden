# HANDOFF — 이미지+SEO/ROI 전략 엔진 codify + 작업 관제탑 체계 (2026-06-16 세션8)

Target Session: Claude Code CLI (main 또는 신규 feat 브랜치)
Branch: feat/image-seo-engine (Stage 0 신규 권장) · 트래커/원칙 갱신은 main
선행 권위: docs/design/IMAGE_SEO_STRATEGY_ENGINE.md (엔진 스펙) · docs/research/IMAGE_SEO_STRATEGY_ENGINE_RESEARCH_2026-06-16.md (근거)

---

## A. 이번 세션 요약 (Desktop)

1. 전상품 공통 이미지+SEO/ROI 전략 엔진 심층 리서치 완료 → 한글 박제(research doc).
2. 엔진 권위문서 codify: docs/design/IMAGE_SEO_STRATEGY_ENGINE.md (L0~L5 + 정책 게이트 + Prisma 7모델 + 단계 빌드).
3. 병행작업 꼬임 방지용 **작업 관제탑 체계** 설계 + 신규 원칙 #87~#89 정의 (본 핸드오프 C·D).
4. 실측 정정 발견: 트래커의 IMG-컷34/IMG-앱 상태가 세션8 실측과 불일치 → 본 핸드오프로 정정.

원칙 준수: additive·전상품 공통(#55)·자연 개입점(#56)·비가역0·네이버 무접촉. 본 세션 브라우저 미사용(#26 분리).

---

## B. Code 빌드 스펙 — Stage 0 (엔진 기반)

목표: 엔진 데이터 레이어 + DataLab 연결 + 정책 게이트. additive only. 기존 테이블 무변경.

B-1. Prisma 7모델 추가 (스펙 = IMAGE_SEO_STRATEGY_ENGINE.md §2 그대로):
- CategoryDna · SlotPlan · PromptVersion · Generation · Rating · PerformanceMetric (Product는 기존).
- 영문 식별자·한글 리터럴 0. `src/lib/prisma.ts` 싱글톤. 마이그레이션 additive·reverse-safe. Supabase MCP로 적용 확인.

B-2. DataLab 쇼핑인사이트 클라이언트:
- `src/lib/naver/datalab-client.ts` — 8 엔드포인트(`/v1/datalab/shopping/` categories·category/{device,gender,age}·category/keywords·category/keyword/{device,gender,age}).
- 헤더 X-Naver-Client-Id/Secret. 연령코드 6구간(10~60) 주의(검색트렌드 1~11과 다름). 응답 results[].data[] {period,ratio,group}.
- 쿼터 보호: 카테고리 트렌드 캐시(주간 갱신). top-500 인기검색어는 API 미반환 → 별도 경로 TODO 주석.

B-3. 정책 게이트(발행전 하드):
- `src/lib/naver/thumbnail-policy.ts` — 대표 후보 검사: OCR 텍스트 0 · 단일제품 · 금지 오버레이 0(가격/프로모/배송/인증/테두리). config화(정책 변동 대응). 발행 페이로드 직전 게이트로 배선(차단·정직 사유 #46).

B-4. 게이트(필수): tsc --noEmit 0 · build 0 · 이모지 0(Lucide만) · 한글 리터럴 0 · prisma 싱글톤 · 외부 image API 0(Sharp만) · 네이버 PUT 무접촉. 커밋은 `.commit-msg.tmp` Write → `git commit -F`.

B-5. Stage 0 완료 후: Desktop 검증(Supabase 테이블 6개 존재·정책 게이트 단위테스트·Vercel READY+SHA) → 통과 시에만 Stage 1.

후속(Stage 1~3): IMAGE_SEO_STRATEGY_ENGINE.md §10. 6축 시스템(feat/mood-camera-system)이 L2 룩업으로 흡수되므로 **6축 main 머지가 엔진의 토대** — Stage 1 전 머지 권장.

---

## C. 작업 관제탑 체계 (신규 — 병행작업 꼬임 방지)

설계 의도: 동시다발 병행작업이 헷갈리거나 누락되지 않게, 우선순위·상황 변경에도 흐름이 꼬이지 않게, 대표가 재언급하지 않아도 되게.

핵심 = PARALLEL_WORK_TRACKER 상단에 **라이브 관제 보드** 1개 신설(기존 rev 히스토리는 아래 감사로그로 유지). 단일 파일·단일 권위·sprawl 0.

보드 구조(컬럼): ID · 우선순위(P0~P3) · 레인(Desktop/Code/결정/브라우저) · 상태(TODO/진행/차단/검증대기/완료) · 의존성 · 다음 1액션 · 검증기준.
파생 큐 3개(보드에서 자동 도출): ① 지금 큐(차단 없는 최우선) ② 결정 대기(대표 결정 필요) ③ 검증 대기(완료됐으나 브라우저/실측 검증 전).
변경로그: 우선순위/스케줄 변경 시 1줄(날짜·항목·사유) → 왜 바뀌었는지 추적.

### Code 적용 지시 (PARALLEL_WORK_TRACKER.md 상단 삽입 · Python read→insert→write)

파일 제목(`# 꽃틔움 가든 — 병행작업 트래커 ...`) 바로 다음 줄에 아래 블록을 삽입(기존 본문 전부 보존). edit_file 금지 — Python으로 read·insert·write.

```
---

## ★ 작업 관제탑 (LIVE BOARD · 단일 권위 · 세션 시작 필독·종료 필수 갱신)

| ID | 우선순위 | 레인 | 상태 | 의존성 | 다음 1액션 | 검증기준 |
|---|---|---|---|---|---|---|
| ENG-0 | P1 | Code | TODO | 6축 머지 권장 | Prisma 7모델+DataLab+정책게이트 빌드 | tsc0·build0·테이블6·게이트 단위테스트 |
| 6AXIS-MERGE | P1 | 결정 | 결정대기 | preview UI 육안 | feat/mood-camera-system main 머지 GO | production 테이블 활성·UI 정상 |
| CAPTURE-METHOD | P2 | 결정 | 결정대기 | — | 경쟁 캡처 방식 확정(권고 B 하이브리드) | 대표 확정 |
| IMG-INGEST | P2 | Desktop | TODO | — | cut-1~4 → ingest-firefly ×4(향노트 슬롯) | #80 라이브·#81 정합·composite +4 |
| PUBLISH-명화 | P1 | 결정 | 결정대기 | 원산지·옵션 확인 | SUSPENSION 원인 실측→안전기준 payload | dryRun·readiness·대표 GO(비가역#46) |
| CUT34-EVAL | — | Desktop | 검증대기 | — | cut-3/4 = 향노트 섹션 슬롯 재배치(썸네일 아님) | 슬롯 매핑 확정 |

### 파생 큐
- 지금 큐: ENG-0(6축 머지 후) · IMG-INGEST
- 결정 대기(대표): 6AXIS-MERGE · CAPTURE-METHOD · PUBLISH-명화 3건 확인
- 검증 대기: CUT34-EVAL(슬롯 재배치)

### 변경로그
- 2026-06-16: 엔진 codify. IMG-앱→완료(preview), IMG-컷34→cut-3/4 생성·평가완(향노트 슬롯 판정). 관제탑 체계 신설(#87~#89).

---
```

### IMG 섹션 상태 정정 (Python 정확 치환)

PARALLEL_WORK_TRACKER.md "## 이미지 생성 시스템 개선 — 무드-카메라 6축" 표에서:
- `| IMG-컷34 | ... | ⏸ 보류(개선 후) | ... |` 행 → 상태 `✅ DONE(생성·평가완)` · 비고 `cut-3(April/Canon)·cut-4(Black Cherry/Leica) 생성·운영자 평가완. 판정=기술적 우수하나 무드플레이트 → 향노트 섹션 배경 슬롯 적합·썸네일/히어로 부적합(cut-4 200px 묻힘). 전략엔진으로 재배치.`
- `| IMG-앱 | ... | ☐ Code | ... |` 행 → 상태 `✅ DONE(preview)` · 비고 `feat/mood-camera-system c1e2bd3 preview READY·Desktop 검증완(테이블5·시드 1:1)·prod DB 마이그레이션 적용완. main 머지 대기(=엔진 L2 토대).`

---

## D. 신규 원칙 #87~#89 (PRINCIPLES_LEARNED.md 삽입 · Python)

#86 다음에 삽입(영문 식별자 불필요·서술형). 동일 블록을 CLAUDE.md 원칙 섹션에도 1~2줄 요약 반영.

```
### #87 단일 관제탑 (Single Control Tower)
모든 병행 트랙은 PARALLEL_WORK_TRACKER 상단 라이브 보드 한 곳에만 산다. 보드에 없으면 존재하지 않는 작업(누락 방지). 세션 시작 = 보드 필독 → 지금 큐 top 실행. 세션 종료 = 보드 갱신(상태·다음 1액션) + 변경로그 1줄 + 핸드오프. 우선순위/스케줄 변경은 변경로그에 기록. 파생 큐(지금/결정대기/검증대기)는 보드에서 자동 도출.

### #88 완료=검증 (Done Means Verified)
코드/기능 작업은 실제 브라우저/실측 검증을 통과하기 전 "검증 대기" 상태로 둔다. 검증 없이 "완료" 라벨 금지, 검증 없이 다음 본작업 진행 금지. Code 보고만으로 완료 처리 금지(#45 결합). 실측 불가 시 거짓 보고 대신 대표에게 요청.

### #89 변경 흡수 (Change Absorption)
세션 도중 추가 요청·개선·변경은 즉시 관제탑 보드에 등재 + 우선순위 재산정 후 진행한다. 흐름 보존이 목적 — 대표가 같은 사항을 재언급하지 않아도 누락 없이 이어지게.
```

---

## E. 기타 트래커 갱신 (Python 오버라이트 · 누락 0)

- PROGRESS.md: 세션8 블록 추가 — 엔진 리서치·codify 완료, 관제탑 체계 신설, cut-3/4 생성·평가, 6축 preview READY.
- ROADMAP.md: 엔진 Stage 0~3 항목 추가(이미지+SEO/ROI 전략 엔진).
- TASK_BRIDGE.md: §3 신규 엔트리 — 엔진 codify + 관제탑.
- SESSION_LOG.md: 세션8 1줄.
- 전부 한글 무결성(sentinel 0)·Python full-file overwrite.

---

## F. 검증 절차 (Stage 0 완료 시 Desktop)

1. Supabase execute_sql: 신규 6테이블 존재 확인(CategoryDna·SlotPlan·PromptVersion·Generation·Rating·PerformanceMetric).
2. 정책 게이트 단위테스트 PASS(텍스트 검출·금지 오버레이).
3. Vercel list_deployments: target·SHA·state READY 교차검증(#45).
4. 통과 시에만 관제탑 ENG-0 → 검증대기→완료, Stage 1 진입.

---

## G. 다음 액션 큐 (관제탑 동기)

1. [Code] ENG-0 빌드(B) → Desktop 검증(F)
2. [결정·대표] 6AXIS-MERGE(preview UI 육안 후) · CAPTURE-METHOD(권고 B) · PUBLISH-명화 확인 2건
3. [Desktop] IMG-INGEST(cut-1~4 향노트 슬롯) · CUT34-EVAL 슬롯 재배치
4. [Code] 트래커/원칙 갱신(C·D·E) Python 오버라이트
