# 꽃틔움 가든 하이브리드 이미지 파이프라인 + 도구 오케스트레이션 + 누락 방지 트래킹 체계 — 전체 시스템 설계

> **작성**: 2026-06-06 (Desktop turn, 연구 산출물 #49 직접 저장)
> **목적**: 상품 한 건이 아닌 전체 시스템 설계. 기존 IMAGE_PIPELINE_IMPROVEMENT_MASTER_PLAN.md(T1~T5) 위에 "모든 컨셉 하이브리드 활용 + 병행작업 누락 방지"를 통합 강화.
> **대표 지시 원문 요지**: 앱 내장 + 상황에 따라 Claude Desktop·Figma·Canva MCP·Adobe Express·Firefly·Claude Design을 융통적 자동 호출 + 대표 개입 지점 자연스럽게 + 살아있는 체크리스트·앱 UI·docs 3중 누락방지.

---

## 0. TL;DR (핵심 3줄)

1. **상태머신 기반 `asset_jobs` 큐 + 상품별 컨셉 조합 엔진 + 3중 누락 방지 체계**가 정답. 컨셉을 매번 다르게 조합하는 로직을 데이터(컨셉 토큰 가중치)로 박제하고, 모든 작업을 단일 상태머신 큐로 추적하며, 비가역 작업(네이버 발행)은 인간 승인 게이트 뒤에 둔다.
2. **도구 라우팅의 1차 분기는 IP 면책 경계**다. 최종 판매 이미지 = Firefly-native 생성 → Adobe(누끼·색보정) → Figma/Sharp 합성만 통과(`ip_safe=true`). Nano Banana Pro·Claude Design·Canva는 시안/내부 단계 한정(`ip_safe=false`).
3. **누락 방지 = SQL 상태머신(진실원천) → 앱 신호등 관제탑 → docs 핸드오프 3계층.** 1인 셀러에는 GTD(수집)+칸반(WIP 제한)+상태머신(자동 전이) 하이브리드가 최적.

---

## 1. 핵심 발견 (근거 기반)

### 1-1. 네이버 정책이 파이프라인 출력 규격을 결정 (2024-10-28 강화)
- 대표이미지: 최소 300x300, 권장 1000x1000, 최대 4000x4000, 4MB 이하, JPG, 정방형 1:1.
- 2024-10-28부터 대표이미지에 가격/배송/홍보성 텍스트, 외곽라인, 도형, 워터마크, 과도한 보정 금지. 위반 시 상품 제재 + 클린 프로그램.
- 권장: 흰색/단색 배경의 정면 단품컷 최소 1장.
- 상세페이지: 가로 860px 표준(고해상도 1000~1200px), 세로 5000px 이하 권장.
- **시사점**: 출력 자산 규격을 코드 검증 항목으로 강제(해상도/포맷/용량/텍스트 유무).

### 1-2. 하이브리드 컨셉 = 전환율 핵심 (단품 + 라이프스타일 둘 다)
- 라이프스타일 + 스튜디오 병행 시 평균 약 30% 전환율 상승(eMarketer 인용).
- 병행 브랜드 반품 최대 약 50% 감소(기대치 명확화 효과).
- 전문 품질 사진 평균 33% 높은 전환(Shopify 인용).
- **시사점**: "한 방향 금지, 매번 다른 조합" 원칙은 데이터로도 정당. 단, **네이버 대표이미지는 깔끔한 단품(정책 안전), 하이브리드 무드는 추가이미지/상세페이지**에 배치.

### 1-3. Firefly가 유일한 IP 면책 생성 경로
- Adobe: 자격 플랜은 생성 콘텐츠에 IP 면책 제공. 학습 데이터 = Adobe Stock 라이선스 + 만료 퍼블릭 도메인.
- **면책 제외**: 비-Adobe 파트너 모델(Nano Banana Pro/Gemini 3, FLUX 등), 베타 기능, 사용자 업로드 참조 투입 후 합성.
- **시사점**: 작업원칙 #48("최종 판매 이미지 = Firefly-native만")은 법적으로 정확. Nano Banana Pro는 라이프스타일/자연광에 강하나 **시안 단계만**.

### 1-4. 비가역 작업 = 네이버 발행, 승인 게이트 필수
- 신규 등록: POST /v2/products (v1 폐기). 수정: PUT /v2/products/channel-products/{no} 또는 origin-products/{no}.
- **상품 수정 = 전체 교체(full replace)**. 요청에 없는 정보는 제거됨 → 진짜 비가역.
- **안전장치**: 등록 시 statusType=WAIT + channelProductDisplayStatusType=SUSPENSION이면 노출 0으로 등록 가능 → 2단계 발행(WAIT→SALE)으로 비가역을 사실상 가역화.
- 이미지: 외부 URL 첨부 불가. POST /v1/product-images/upload(multipart, 필드 imageFiles)로 선업로드 → 네이버 호스팅 URL만 사용. MIME: JPEG/GIF/PNG/BMP.
- 레이트리밋: 토큰버킷, 초과 시 HTTP 429 → 1~2초 딜레이 후 재호출. 토큰 수명 3시간, 국내 IP 사전 등록. 멱등성 키 없음 → 앱이 중복 방지 책임.

### 1-5. 1인 셀러 + AI 협업 누락 방지 검증 패턴
- HITL 승인 게이트는 **부작용 발생 전**에, "제안(propose)과 실행(commit)의 하드 분리".
- 모든 단계 게이트 = 승인 피로 → 우회. **중대/비가역 작업에만** 게이트.
- 세션 단절 연속성: progress 파일을 매 세션 시작 시 읽는 narrative bridge 패턴("DB는 사실을 저장, 핸드오프는 이야기를 전한다").
- 멀티태스킹 손실 최대 40%(APA) → WIP 제한(동시 3개 이하).

---

## 2. 전체 시스템 아키텍처

```
[0] 소싱 인입       도매매(DMM) 원본 → products 레코드
       |
[1] 컨셉 조합 엔진   product_concept_plan 생성 (컨셉 토큰 가중치로 "매번 다른 조합")
       |
[2] asset_jobs 큐    상품 x 컨셉 x 레인별 작업 분해 (상태머신)
       |
   레인A 생성(Firefly) / 레인B 가공(Adobe MCP) / 레인C 합성(Figma·Sharp) / HITL 게이트
       |
[3] 검수 대시보드     신호등 관제탑 + 진행상태 + 누락 감지
       |
[4] 발행 게이트       인간 승인(GO) → 네이버 커머스 API (POST /v2/products)
       |
[5] 발행 자산화       published_assets + IP 출처 메타데이터 박제

[횡단] 누락방지 3중(SQL 상태머신 → 앱 신호등 → docs 핸드오프)
       IP 면책 가드레일(모든 job ip_safe 플래그, 발행 경로 검증 강제)
       도구 오케스트레이션(MCP 호스트=Claude Desktop이 라우팅 규칙 적용)
```

**설계 사상**: MCP는 표준 연결만 제공(무엇을 언제 호출할지 결정 안 함). 따라서 라우팅 규칙은 앱 로직(컨셉 엔진 + job 디스패처)에 명시적으로 코딩하고, MCP는 Figma/Canva/Adobe를 잇는 배관 역할.

---

## 3. 하이브리드 조합 엔진 데이터 모델

"매번 다른 조합"을 사람 직관에 맡기면 같은 조합으로 수렴 → 데이터로 박제.

```
ConceptToken (컨셉 토큰 사전)
  id, key(lifestyle|woodtone|minimal|emotional|retro_pop|...),
  display_name, prompt_fragment(Firefly 프롬프트 조각),
  bg_type(white|wood|gradient|scene), default_weight

ProductConceptPlan (상품별 조합 계획 - 매번 다르게)
  id, product_id,
  primary_concept_id, secondary_concept_id, accent_concept_id,
  combination_seed(난수 시드 - 재현성),
  ratio_json({lifestyle:0.5, woodtone:0.3, minimal:0.2}),
  rationale(왜 이 조합인지 한 줄), status(draft|approved|locked)
```

조합 로직: (1) 카테고리/색감/소재에서 후보 가중치 산출 → (2) 직전 N개 상품 조합 회피 **다양성 페널티**("한 방향 금지" 강제) → (3) 시드 고정 재현. 디자인 시스템(Retro Pop Garden Fantasy, #E62310, 크림 #FAF8F3, Pretendard, 꼬띠)은 prompt_fragment + Figma 변수로 고정.

---

## 4. asset_jobs 범용 스키마

```sql
asset_jobs
  id uuid PK
  product_id uuid FK
  concept_plan_id uuid FK (nullable)
  lane enum('generate','process','compose','review','publish')
  job_type enum('firefly_generate','remove_bg','color_correct','resize',
                'vectorize','figma_compose','sharp_composite','mockup',
                'naver_image_upload','naver_publish')
  tool enum('firefly','adobe_express','figma','canva','claude_design','sharp','naver_api')
  ip_safe boolean              -- 최종 판매 자산 경로 검증용 (핵심)
  status enum('pending','ready','in_progress','blocked','awaiting_approval','done','failed','cancelled')
  priority int
  version int                  -- 낙관적 잠금
  retry_count int default 0
  max_retries int default 3
  input_refs jsonb             -- 원본/누끼/마스크 자산 URN
  output_refs jsonb            -- 결과 자산 URN
  blocked_reason text
  assigned_session text        -- 어느 AI 세션/채팅이 잡았는지
  heartbeat_at timestamptz     -- 좀비 작업 감지
  created_at, updated_at, last_attempted_at

asset_job_transitions
  id, job_id FK, from_status, to_status, event,
  actor enum('system','ai_agent','human'), note, created_at

published_assets
  id, product_id, asset_urn, role enum('main','sub','detail'),
  ip_provenance jsonb,  -- {generator:'firefly', model:'image5', processed_by:['adobe_remove_bg'], indemnified:true}
  naver_image_url text, published_at
```

근거: DB-as-queue 표준(status+retry_count+heartbeat로 크래시 생존). 상태 7~9개 초과 시 서브머신 분할 → 레인으로 분리. ip_safe = 발행 직전 "이 체인이 면책 경로만 거쳤는가" 강제. 낙관적 잠금(version) + SELECT ... FOR UPDATE SKIP LOCKED로 다중 워커 중복 방지.

---

## 5. 도구 라우팅 Decision Matrix

| 작업 유형 | 1차 도구 | 대안/보조 | IP 면책 | 인간 개입 | 최종판매물 |
|---|---|---|---|---|---|
| 신규 생성(판매용) | Firefly(Image 5) | - | 있음(유료) | 1-click 트리거 | 가능 |
| 라이프스타일 시안 | Nano Banana Pro | FLUX/GPT Image | 없음 | 시안 검토 | 시안 한정 |
| 누끼(배경 제거) | Adobe Express MCP | - | 안전 | 자동 | 가능 |
| 색보정/노출 | Adobe for creativity MCP | - | 안전 | 자동 | 가능 |
| 리사이즈/포맷(네이버 규격) | Sharp(서버) | Adobe | 안전 | 자동 | 가능 |
| 벡터화 | Adobe(vectorize) | - | 안전 | 자동 | 가능 |
| 합성/레이아웃/양산 | Figma MCP | Sharp composite | 안전 | 템플릿 승인 | 가능 |
| 템플릿 디자인 | Canva MCP | - | 불명확 | 검토 | 시안/내부 |
| 내부 시안/GO카드/배너 | Claude Design/Visualizer | - | 없음 | 의사결정 | 내부 한정 |
| 네이버 발행 | 네이버 커머스 API | - | N/A | 필수 게이트 | (발행 행위) |

**1차 분기 = "이 자산이 최종 판매물로 가는가?"** 예 → 면책 경로(Firefly→Adobe→Figma/Sharp)만, ip_safe=true. 시안 → 자유롭게, ip_safe=false, 발행 게이트에서 혼입 차단. Sharp는 resize+composite로 네이버 규격화+합성을 동시 처리(libvips, ImageMagick 대비 4~5배).

---

## 6. 인간 개입 지점 (HITL) 워크플로우 맵

"자연스러운" HITL = 결정 가치 높은 소수 지점에만 배치. 4개 게이트:

1. **컨셉 조합 승인(가벼움)** — ratio_json 카드 1-click 승인/재생성. 자동 진행 기본.
2. **Firefly 1-click 생성(능동 트리거)** — 크레딧 드는 생성은 사람이 버튼. 제안→실행 분리 지점.
3. **메인컷 선택(판단)** — 후보 중 대표이미지 선택. 전환율+정책 판단 = 인간 고유.
4. **발행 직전 승인(차단형, 비가역)** — 가장 강한 게이트. PUT 전체교체 비가역.

**발행 GO 카드 UX**: ① 최종 이미지 미리보기 ② IP 출처 배지(전부 indemnified?) ③ 네이버 규격 자동체크(1000px+/JPG/4MB↓/텍스트·외곽라인 없음) ④ 누락 체크리스트 상태(모든 트랙 done?) ⑤ "WAIT으로 먼저 등록" 옵션. **모두 녹색일 때만 발행 버튼 활성화.** 상태 직렬화 보존(awaiting_approval) → 몇 시간 뒤 승인해도 중단점 재개.

**2단계 발행**: statusType=WAIT + SUSPENSION 등록(노출 0) → 스토어 확인 → SALE/ON 전환. 비가역을 가역으로.

---

## 7. 병행 작업 누락 방지 3중 체계 (가장 중요)

### (a) 살아있는 체크리스트 — 상태머신 기반
- 상태머신을 기반으로, 칸반으로 시각화, GTD로 수집하는 하이브리드.
- 순수 체크리스트는 자동 전이/재시도/블록 사유 못 담음. 순수 칸반은 AI 자동화와 안 맞음.
- asset_jobs.status 전이를 누구든 트리거하면 asset_job_transitions에 자동 기록("누가 무엇을 언제").
- WIP 제한(동시 in_progress <= 3)으로 멀티태스킹 손실 차단.

### (b) 앱 내장 트래킹 UI — 신호등 관제탑 매트릭스
기존 발행 관제탑(신호등) 확장 → 상품 x 트랙 매트릭스:

```
관제탑 대시보드
| 상품 | 이미지 | 발행 | 회선 | 운영정합 | 종합 |
| 튤립세트 | 완료 | 대기 | 완료 | 완료 | 주의 |
| 장미박스 | 진행 | 미시작 | 완료 | 막힘 | 위험 |
신호: 완료 / 진행중 / 대기 / 막힘 / 미시작
```
핵심: ① 막힘 행 최상단 고정 ② heartbeat 오래된 in_progress 자동 막힘 표시(좀비 감지) ③ 누락 감지 룰(이미지 done인데 발행 미시작 → "다음 액션" 자동 제안) ④ WIP 카운터(3 초과 경고). asset_jobs 직접 읽음(별도 동기화 불요).

### (c) docs 핸드오프 — 세션 연속성 3계층
- Layer 1 세션 핸드오프(에피소드): 매 세션 끝 PROGRESS.md에 "한 것/결정/현재상태/다음 할 일".
- Layer 2 안정 사실(의미): 작업원칙 #48, 디자인 시스템, 네이버 규격 등 불변 사실 영속.
- Layer 3 절차 지식: 파이프라인 단계별 실행법/템플릿.
- 원칙: asset_jobs(DB)=상태 보존, PROGRESS.md(핸드오프)=맥락/의도. 둘은 보완재.

---

## 8. 구현 로드맵 (우선순위)

**Phase 1 — 누락 방지 골격 (가장 시급)**
- asset_jobs + asset_job_transitions 스키마(Prisma) + Supabase 마이그레이션
- 상태머신 전이 함수 + 낙관적 잠금 + heartbeat
- 신호등 관제탑에 상품 x 트랙 매트릭스 보드 추가
- PROGRESS.md/TASK_BRIDGE.md 3계층 템플릿 정비
- 근거: 누락 방지가 1인 운영 최대 리스크. 도구 고도화 전에 추적 골격부터.

**Phase 2 — IP 가드레일 + 발행 게이트**
- ip_safe 플래그 + 발행 전 자산 체인 출처 검증
- "발행 GO 카드" UX + 네이버 규격 자동 체크(Sharp)
- 2단계 발행(WAIT→SALE) + awaiting_approval 영속
- 네이버 이미지 업로드(POST /v1/product-images/upload) 파이프라인

**Phase 3 — 컨셉 조합 엔진 + 도구 오케스트레이션**
- ConceptToken 사전 + ProductConceptPlan + 다양성 페널티
- 도구 라우팅 matrix를 job 디스패처에 구현
- MCP 호스트(Figma/Canva/Adobe) + Firefly 1-click 트리거

**Phase 4 — 배치 처리 + 검수 자동화**
- 수백 상품 배치 인입 + WIP 제한 스케줄러(429 대응 큐+1~2초 딜레이)
- 검수 대시보드 고도화, 좀비/누락 자동 알림

---

## 9. 작업 유의사항 (영구 준수 — 본 트랙 한정 강조)

- **IP 면책을 코드로 강제**: ip_safe 플래그 + 발행 전 검증으로 Nano Banana Pro/Canva/Claude Design 산출물의 최종 판매물 혼입을 시스템이 차단. 사람 기억 의존 금지.
- **발행은 반드시 2단계**: WAIT/SUSPENSION 선등록 → 확인 → SALE 전환. 멱등성 키 없으므로 발행 job에 중복 방지 키(product_id+해시) 직접 부여.
- **WIP 3 제한**: 동시 진행 작업 3개 이하. 트랙별 병목 시 해당 트랙 WIP 1로 조여 노출.
- **컨셉 다양성 데이터 박제**: 직전 N개 조합 회피 페널티로 "한 방향 금지" 코드 보장.
- **대표이미지=정책(흰/단색 단품), 하이브리드=추가/상세**: 정책 리스크 0 + 전환율 동시 충족.
- **비가역 0 원칙(#46)**: 네이버 PUT/POST는 대표 명시 승인 없이 호출 0. dryRun GREEN != 발행 완료.

---

## 10. 한계 / 재확인 필요

- 네이버 API 세부 enum/레이트리밋 정확 수치는 로그인 게이트된 apicenter.commerce.naver.com 재확인 필요.
- 전환율 수치(30%/50%/33%)는 업계 벤더/사례 인용 → 꽃틔움 카테고리 자체 A/B 검증 권장.
- IP 면책은 저작권 방어 한정(상표/퍼블리시티권 범위 밖). 외부 참조 투입 시 책임 이전 주의.
- 파트너 모델(Nano Banana Pro 등) 정책 변동 잦음 → ip_safe 차단 규칙 유지 + 시안 정책 주기 재확인.
- 기준일: 2026-06. 네이버 이미지 SEO 페널티 추가 강화 가능 → 분기별 재점검.
