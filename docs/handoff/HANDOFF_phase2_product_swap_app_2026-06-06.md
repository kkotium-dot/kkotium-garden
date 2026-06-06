# HANDOFF — Phase 2/3 제품교체(B안) 루프 앱 내장 + 반자동 브라우저 연결

> **FROM**: 🖥 Desktop (제품교체 루프 연구 완료 + B안 확정 + asset_jobs 큐 B안 보정, 2026-06-06)
> **TO**: 💻 Code
> **권위 문서**: docs/research/KKOTIUM_PRODUCT_SWAP_LOOP_DESIGN_2026-06-06.md (모든 근거)
>            + docs/research/KKOTIUM_HYBRID_PIPELINE_SYSTEM_DESIGN_2026-06-06.md (상위 체계)
> **Target Session**: phase2-product-swap-app
> **Branch**: main

---

## STEP 0 — 점검 (Code 자동 실행)

```
cd /Users/jyekkot/Desktop/kkotium-garden && \
git rev-parse HEAD origin/main && git status --short && \
curl -s -o /dev/null -w "prod=%{http_code}\n" https://kkotium-garden.vercel.app/
```

선행 정독: KKOTIUM_PRODUCT_SWAP_LOOP_DESIGN_2026-06-06.md §1(B안)·§6(스키마확장)·§7(UI)·§8(로드맵).

---

## 배경 — 방향 전환 (중요)

기존 시도(A안: Firefly가 제품까지 생성→실제 제품으로 교체)는 **라벨 왜곡 위험으로 폐기**. 확정 방식 = **B안: 실제 제품 누끼 고정 + 배경만 AI 생성 + 레이어 합성 + 빛 정합**. 근거: Adobe/Google 공식 문서가 재생성 시 라벨·텍스트 보존 미보장 + 전자상거래 AI사진 업계(Claid 등) 일치 + 소비자 71% "실물 불일치" 반품(Salsify).

Desktop이 asset_jobs 큐를 이미 B안 6단계로 보정 완료(기존 A안 job은 cancelled 처리, 감사기록 보존). 명화 product_id=cmpnooli40001f0gveaxr8iim에 B안 jobs 등록됨(aj_mh_b_cut/bg/cmp/harm/norm/pub).

---

## SCOPE — Phase 2 (단계별 commit)

### 작업 1 — asset_jobs 스키마 확장: reference 자산 추적 + awaiting_human 상태

- 신규 job_type 값 추가(CHECK 제약 확장): `product_cutout`, `mood_bg_generate`, `product_composite`, `harmonize`, `express_finalize`, `naver_normalize`. (기존 enum과 공존, 마이그레이션 SQL 박제 → Desktop apply_migration 선행.)
- 신규 status 값 추가: `awaiting_human`(브라우저 핸드오프 트리거), `review`, `rejected`, `human_done`. (또는 기존 awaiting_approval 재사용 + sub-state 컬럼 검토 — 연구 §6 참조. Code 판단.)
- 신규 테이블 `asset_references`(조인): id, job_id FK, asset_kind enum('product_cutout','mood_bg','brand_kit','generated_candidate'), asset_urn, created_at.
- AssetJob에 source_product_id(기존 product_id 활용)·concept_combo_id(nullable) 정합.
- ★ 순서: schema.prisma 작성 + generate + commit 보류 → migration SQL을 docs/handoff/MIGRATION_phase2_*.sql 박제 → Desktop apply_migration → push. 신규 컬럼/값이라 기존 쿼리 회귀 0(BackdropJob 선례).

### 작업 2 — 상태머신 전이표 확장 (asset-job-state.ts)

- awaiting_human ← (in_progress) → human_done → in_progress 전이 추가.
- review → approved(done)/rejected 전이. rejected → ready(재시도 루프).
- 기존 transitionJob 가드/낙관적잠금/전이로그 패턴 그대로 확장. 비가역 0.

### 작업 3 — 제품교체 워크플로우 API + UI

- API: /api/products/[id]/swap-pipeline (읽기: 단계별 job 상태 / 쓰기: 단계 전이, mutate는 DB만·네이버 미접촉).
- UI: 상품 선택 → 컨셉 조합 카드(우드/화이트/차량) → 단계 타임라인(누끼→배경→합성→정합→규격화→발행) 상태 배지.
- awaiting_human 상태 → "지금 Firefly/Express에서 이 작업 하세요" CTA + 브라우저 딥링크 + 업로드 체크리스트.
- 합성 결과 before/after 비교 슬라이더 + 라벨 가독성/경계 체크 항목. 거부→rejected→재시도.
- 한글 외부 JSON(#35), 이모지 0, Lucide.
- Supabase Realtime로 job 상태 실시간 구독(가능 시).

### 작업 4 — 관제탑 매트릭스에 product_swap 트랙 반영

- 기존 ControlTowerMatrixWidget에 "이미지" 트랙이 product_swap 6단계를 집계하도록 보정.
- 막힘/awaiting_human 행 최상단 고정 유지.

### 작업 5 — Sharp 네이버 규격화 모듈 (naver_normalize)

- src/lib/images/naver-normalize.ts: 대표(1:1, 1300px, sRGB, JPEG q80, withoutEnlargement, mozjpeg) / 상세(가로 860px, 세로 ≤5000px 분할) / 추가컷.
- ★ 대표이미지는 흰배경 누끼만(네이버 정책). 라이프스타일 합성컷은 상세/추가 전용 — 코드에 가드.

### 작업 6 — docs 5종 추적 MD 갱신 (#29b Python full-overwrite)

- TASK_BRIDGE §3 ACTIVE 갱신 + PROGRESS 세션 핸드오프 + 작업원칙 신설(B안 제품교체 원칙 / 브라우저 반자동 핸드오프 / 도구 적재적소).

---

## 검증 (Code)

tsc 0 / build OK / 이모지 0 / 한글 리터럴 0 / 비가역 0(네이버 미접촉, DB만) / 가짜 라벨 0(#46) / 대표이미지 흰배경 가드 동작.

---

## VERIFICATION TRIGGER (Desktop 후속)

push hash 보고 → Desktop: (1) git+Vercel cross-check (2) Supabase apply_migration + drift 0 (3) Chrome으로 swap 워크플로우 UI 실측(타임라인·awaiting_human CTA·before/after 슬라이더) (4) 명화 실전으로 B안 end-to-end 검증.

---

## 작업 유의사항 (영구 + 본 트랙)

- **B안 절대 원칙**: 실제 제품 누끼 고정, AI는 배경만. 라벨·형태 왜곡 0. 제품 재생성(채우기 swap) 금지.
- **대표이미지 = 흰배경 누끼만**(네이버 2024-10-28 정책). 라이프스타일 합성컷은 상세/추가만. 텍스트·외곽라인·워터마크 금지.
- **이미지 생성 = 최고 품질 모델**(면책/크레딧 불문, 대표 확정). 단 판매물 상업 사용권 발행 전 확인.
- **브라우저 반자동(대표 표준)**: 대표가 로그인 Chrome 환경 열어두면 AI(Claude in Chrome) 이어받기. 업로드/CAPTCHA/비가역 클릭=사람, 프롬프트·생성·선택·폴링=AI. detect→deliver(앱 알림)→resume 패턴.
- **각 프로그램 장점 최대 활용**(대표 확정): Firefly=생성 / Photoshop=정밀합성·빛정합 / Express=마감·Bulk Create 대량 / Claude Design=시안·관제탑 / Sharp=규격화.
- **비가역 0(#46)**: 네이버 PUT/POST 대표 명시 승인 없이 0.
- **명화 의도적 SUSPENSION**: 대표가 미완성 노출 방지로 설정. 결함 아님. AUTOSUSPEND off 유지.
- 한글 대용량 MD는 Python full-overwrite(#29b). heredoc 금지. 커밋메시지 .commit-msg.tmp.
- Filesystem/iterm 4분 행(#26) 재시도 금지.

---

## 잔여 병행 트랙 (누락 방지 — 관제탑/docs 추적 중)

- 트랙 A 명화 실전: 고해상 제품 누끼 확보(대표 Express 제작 또는 도매매 고해상 원본) → Firefly 배경만 재생성 → 합성 → 검수. (기존 cutout 253x776 저해상 = 테스트용만)
- 채널상품 회선(/v1) ECONNRESET → 고정IP 이전.
- 명화 mainImage 승격 → 네이버 반영 PUT(비가역, 승인).
- 명화 SALE 전환(대표 의도적 보류).
