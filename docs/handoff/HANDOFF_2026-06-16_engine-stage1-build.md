# HANDOFF 2026-06-16 — 이미지+SEO/ROI 엔진 Stage 1 빌드

- Target Session: Claude Code CLI
- Branch: 권장 = main (6축+엔진 머지 후) / 미머지 시 feat/mood-camera-system 계속
- 선행: ENG-0 독립검증 PASS (아래 §0). Stage 1 진입 가능.
- 권위 문서: docs/design/IMAGE_SEO_STRATEGY_ENGINE.md (엔진), docs/design/MOOD_CAMERA_SPEC_SYSTEM.md (6축), docs/research/CATEGORY_DNA_SEED_50014980_2026-06-16.md (첫 DNA 시드)
- 원칙: 전상품 범용(#55) · 자연 개입점 비모달(#56) · 오류는 프로젝트 전체 적용(#62) · 기존 시스템 재사용(중복신설 금지) · additive · 비가역0 · 네이버 무접촉

---

## §0. 선행 검증 (ENG-0 PASS · Desktop 독립검증 2026-06-16)

| 계층 | 결과 |
|---|---|
| Supabase 6 엔진 테이블 | category_dna / slot_plan / prompt_version / slot_generation / rating / performance_metric 전부 존재 |
| additive | 6축 generation 테이블 무손상(별도) |
| slot_generation 컬럼 | product_id·slot_type·prompt_version_id·resolved_prompt·model·model_version·grounding·seed·aspect·refs(jsonb)·settings(jsonb)·output_url·created_at = 엔진 스펙 1:1 |
| Vercel | preview 349b9db READY(target null) / prod c3962b6 불변 |
| runtime smoke | preview 루트 HTTP 200·앱 셸 정상·회귀0 |

발견(전체 적용 #62): rating / performance_metric 의 FK 컬럼이 generation_id — 모델은 slot_generation. DB FK 0건이라 버그는 아니나 6축 generation 과 혼동 위험. Stage 1에서 정렬(§3a).

---

## §1. Stage 1 범위 (우선순위 순)

1. 3a 명명 정렬 slotGenerationId (#62)
2. 3b CategoryDna 로드 + 첫 시드(50014980) seed
3. 3c 9슬롯 결정 테이블
4. 3d 전략 조립기 (기존 시스템 연결 — 신설 금지)
5. 3f 개입 #1 dna_confirm + #2 variant_select (control-tower-engine + intervention.ts, firefly_auto 추가 방식 그대로)
6. 3g 썸네일 정책 게이트 -> publish-readiness 배선
7. 3i UI: 분석 DNA 카드 / 이미지 9슬롯 퍼널 보드 / 발행 게이트 패널
8. 3e 모델 라우팅 (firefly-generate / thumbnail-generator 연결)
9. 3h 캡처 방식 B 하이브리드 (운영자 승인)

---

## §2. 화면 설계 (UI/UX) — 기존 온실 3탭 + 개입 대기열 위에 얹음

### 2.1 분석(analyze) 탭 — "이 상품의 시장 DNA" (L0 + 개입 #1)
- 등록 시 자동 생성(#64 충실도 카드 동형). DataLab -> category_dna 에서 1장 압축.
- 블록: 시즌 곡선(피크/저점 + 준비 타이밍 배지) / 핵심 구매층 / 제목 관례 칩(복사) / 가격대 / 필수 슬롯 / 소재 신호.
- 50014980 예: 6~7월 피크·11월 저점 -> "4~5월 준비 = ROI 타이밍" 배지 / 40대 주도·30·50 동반 / 명품·고급·디퓨저·송풍구+향 +기프트/번들 / mid-premium 27.9~39.9k / 필수 scent_note·use_install·trust.
- category-tone-mapper 를 데이터 기반으로 업그레이드(정적 매핑 대체). 카드가 톤·카피 타깃·슬롯 플랜을 구동.
- 개입 #1: "DNA 확정 / 수정". 미개입 = 자동 DNA 확정(AUTO). 시드가 stale 이거나 신규 카테고리 미확정일 때만 대기열에 dna_confirm.

### 2.2 이미지(image) 탭 — "9슬롯 퍼널 보드" (L1~L4 + 개입 #2)
- 현 무드카메라->대표->상세->자산 스택을 9슬롯 퍼널로 재구성.
- 9슬롯 순서: hero / problem / solution_usp / scent_note / use_install / size_duration / trust / gift / cta.
- 레이아웃(운영자 승인 방향): 상단 가로 퍼널 진행률 바 + 슬롯 칩 가로 스트립(상태색: 없음/생성중/후보N/확정). 칩 클릭 -> 해당 슬롯 카드 확장.
- 슬롯 카드: 상태 / 조립된 전략 프롬프트 미리보기 / 모델 라우팅(Firefly·NB Pro 자동) / 생성 버튼 / 후보 갤러리 / 평점 1클릭.
- 무드카메라 6축 = 각 슬롯의 무드축 조립기(L2 흡수). skeleton-matcher + section-composer = 퍼널 척추(L1) — 9슬롯은 그 위의 뷰. 재구현 금지.
- 대표(hero) 슬롯: 썸네일 정책 사전경고(텍스트0) 인라인 배지.
- 개입 #2: 슬롯 후보 중 승자 1클릭(MoodCameraPanel 평점·즐겨찾기 패턴 확장). 후보가 차면 대기열에 variant_select.

### 2.3 발행(publish) 탭 — "정책 게이트 + 검수" (개입 #3, 기존 카드 확장)
| 게이트 | 동작 | 연결 |
|---|---|---|
| 썸네일 정책(하드) | 텍스트/단일제품/오버레이 위반 시 차단(미노출 위험) | thumbnail-policy.ts -> publish-readiness |
| 충실도 대조 | 확정 이미지 vs 공급자 원본 | 기존 fidelity_check |
| 9슬롯 충족도 | 필수 슬롯 채움 표시 | 신뢰도(완성도) 레버 |
| 발행 준비도 | 등급/점수 | 기존 publish-readiness |
- 개입 #3: GO_PENDING 카드에서 최종 검수 후 비가역 PUT GO(#46). 기존 publish / verify_publish 사용.

### 2.4 개입 대기열(Action Queue) — 전상품 단일 관제탑(#87)
- 신규 stage 2종만 추가(additive, control-tower-engine + intervention.ts):
  - dna_confirm -> INPUT_DECISION -> deepLink 분석 탭
  - variant_select -> INPUT_DECISION -> deepLink 이미지 탭 슬롯
- 발행 전(개입 #3)은 기존 fidelity_check + publish(GO_PENDING) 재사용.

---

## §3. 빌드 작업 항목 (Code)

### 3a. 명명 정렬 slotGenerationId (#62)
- schema.prisma: Rating / PerformanceMetric 의 generationId 필드 -> slotGenerationId. @relation 대상이 SlotGeneration 인지 확인(앱레벨 관계).
- migration: 컬럼 generation_id -> slot_generation_id (rating, performance_metric). Supabase MCP apply_migration. additive 정렬(데이터 보존).
- 엔진 doc IMAGE_SEO_STRATEGY_ENGINE.md §2 동기화.

### 3b. CategoryDna 로드 + 첫 시드
- datalab-client 결과를 category_dna 행으로 적재하는 로더. 버전드(versioned) 카드.
- 첫 시드 = docs/research/CATEGORY_DNA_SEED_50014980_2026-06-16.md 의 50014980(차량용방향제) 값을 seed. (시즌/연령/제목관례/가격대/필수슬롯/소재)
- top-500 인기검색어 별도경로는 Stage 1 TODO 유지 가능(데이터원 확보 시).

### 3c. 9슬롯 결정 테이블
- slot_plan 적재: 9슬롯 시퀀스 + 슬롯별 realism_lane(authentic_art|photoreal) + 필수/선택 + 비율(썸네일1:1·합성4:5).
- DNA 의 필수 슬롯(scent_note·use_install·trust)을 슬롯 플랜에 반영.

### 3d. 전략 조립기 (기존 시스템 연결 — 신설 금지)
- 입력: CategoryDna + product + slot_plan.
- 무드축 = src/lib/mood (6축 decision-table + prompt-assembler) 재사용.
- 퍼널/섹션 = skeleton-matcher + section-composer + section-renderers 재사용(9슬롯 <-> 섹션 매핑).
- 출력: 슬롯별 resolved prompt + model + aspect + grounding -> prompt_version 저장 -> slot_generation 기록.
- 긍정형 제외(#86): negativePrompt 미전송. realism lane 가드(#71) 준수.

### 3e. 모델 라우팅
- 슬롯별 모델 선택: scent_note/lifestyle = Firefly 또는 NB Pro(합성), hero cutout = 기존 cutout-strategy/sharp-composite. firefly-generate / thumbnail-generator 연결.

### 3f. 개입 #1/#2 (additive)
- intervention.ts: INTERVENTION_DNA_CONFIRM, INTERVENTION_VARIANT_SELECT + payload 빌더(firefly_auto 패턴 그대로).
- control-tower-engine.ts: computeActionQueueItem 에 dna_confirm / variant_select 분기 추가(INPUT_DECISION). 멱등 카드 시드.
- ko.json 문구 + 위젯 라벨.

### 3g. 썸네일 정책 게이트 배선
- publish-readiness 가 assertThumbnailPolicy(thumbnail-policy.ts) 호출. 위반 시 발행 차단 사유 노출. OCR 텍스트 신호는 호출자 주입(파이프라인에서 산출).

### 3h. 캡처 방식 B 하이브리드 (승인)
- 데이터 백본 = DataLab + search_shop API(분석 전용). 운영자 1클릭 브라우저 캡처는 분석 보조만(절대 재게시 금지).
- category_dna 갱신 경로에 통합.

### 3i. UI
- 분석: DNA 카드 컴포넌트(workbench analyze 탭).
- 이미지: SlotFunnelBoard(가로 진행률 + 칩 스트립 + 슬롯 카드). 기존 imageMood/imageMain/imageDetail/imageAssets sub-area 와 정합(회귀0, 패널 상시 마운트).
- 발행: PrePublishGatePanel(정책/충실도/슬롯충족/준비도).
- Lucide 아이콘만 · 이모지0 · 한글 표면 라벨 · 영어 주석.

---

## §4. 기존 시스템 재사용 매트릭스 (#62 중복 금지)

| 엔진 레이어 | 신규 | 업그레이드/연결 대상(기존) |
|---|---|---|
| L0 카테고리 | datalab-client·category_dna | category-leaf·category-tone-mapper |
| L1 슬롯/퍼널 | slot_plan 적재만 | layout-skeletons s1~s12·skeleton-matcher·section-composer·section-renderers |
| L2 전략조립 | 없음 | src/lib/mood 6축 |
| L3 생성/라우팅 | 라우팅 로직 | firefly-generate·thumbnail-generator·cutout-strategy·sharp-composite |
| L4 채점/학습 | rating·performance_metric 사용 | MoodCameraPanel 평점 1클릭 확장 |
| L5 개입점 | stage 2종 | control-tower-engine·intervention.ts |
| 정책게이트 | 배선 | publish-readiness·thumbnail-policy |

---

## §5. 게이트 / 검증 (Code 커밋 전)
- tsc 0 · build 0 · 이모지 0 · 신규 한글 리터럴 0 · prisma 싱글톤 · 외부 image API 0(Sharp만) · 네이버 PUT 무접촉 · additive · 비가역 0 · sentinel(꽃 닉네임 변형) clean.
- 단위 테스트: 전략 조립기 순수 함수, 슬롯 결정 테이블, 개입 파생.

---

## §6. 트래커 델타 (Code Python 전체덮어쓰기 — 한글 손상방지 #41)
- PARALLEL_WORK_TRACKER LIVE BOARD: ENG-0 -> 검증완료 / +ENG-L0-PROOF 완료 / +DNA-SEED-50014980 완료 / +ENG-1 ACTIVE(본 핸드오프) / +ENG-1-FIX-NAMING(slotGenerationId).
- PROGRESS / ROADMAP / TASK_BRIDGE / SESSION_LOG: 세션8 — ENG-0 검증완료, Stage 1 진입.
- PRINCIPLES_LEARNED: slotGenerationId 정렬을 #62(전체적용)의 실사례로 비고 추가(신규 원칙 불요).

---

## §7. 검증 절차 (Desktop, Stage 1 빌드 후 — #88)
1. Vercel: 신규 커밋 preview READY + SHA 대조 + runtime smoke(루트 200).
2. Supabase: category_dna 시드 행 존재 / rating·performance_metric 컬럼 slot_generation_id 로 정렬됨 / 6축 generation 무손상.
3. 브라우저 실측: /studio 3탭 — 분석 DNA 카드 렌더 / 이미지 9슬롯 보드(칩·진행률) 조작 / 발행 정책게이트 동작 / 개입 대기열 dna_confirm·variant_select 카드 노출. 실무 사용 흐름에서 깨짐/오류 없는지 확인 후 다음 작업 진행.
   - 주의: preview 보호(#63) — Control Chrome 직접접근 곤란 시 머지-후-프로덕션 검증으로 대체(롤백 가능).

---

## §8. 병행 트랙 스케줄 (꼬임 방지)

| 트랙 | 레인 | 상태 | 의존성 |
|---|---|---|---|
| MERGE 6축+엔진 -> main | Code git | 운영자 GO 대기(paste=GO) | 독립. 권장 = Stage 1 전. 머지 시 prod 배포(롤백 가능) |
| ENG-1 빌드 | Code | 본 핸드오프 | 머지 후 main 권장 / 미머지 시 feat 계속 |
| ENG-1 검증 | Desktop | 빌드 후 | ENG-1 빌드 의존 |
| 명화 발행 사전확인 | Desktop(Supabase) | 대기 | 독립. 원산지(live 중국산 0200037 vs payload)·옵션(live 3 vs 4) 확인 -> PUT은 명시 GO(#46) |
| IMG-INGEST cut-1~4 | Desktop(브라우저) | 대기 | 독립. ingest-firefly x4 -> scent_note 슬롯 |

권장 실행 순서: (1) MERGE -> (2) ENG-1 빌드 -> (3) ENG-1 검증. 명화 발행·IMG-INGEST 는 독립 병행.

---

## §9. 상품별 앱 적용 현황
- 명화: cut-1~4 무드플레이트 생성·평가완 -> scent_note 슬롯 확정. ingest 대기. 발행 SUSPENSION(원인 실측 대기·readiness A/84·GO 비가역). 검증 케이스.
- 달항아리 / 아이스트레이: 명화 완료 후 확장(#55).
