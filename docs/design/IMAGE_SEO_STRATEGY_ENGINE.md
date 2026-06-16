# 적응형 이미지 + SEO/ROI 전략 엔진 (전상품 공통 권위문서)

작성일: 2026-06-16 (세션8)
권위: 본 문서가 전상품 이미지·SEO·ROI 엔진의 단일 권위. 변경은 버전 증가 + 변경로그.
범위: 전상품 공통(카테고리 무관). 명화 = 검증 케이스 (#55).
근거 리서치: docs/research/IMAGE_SEO_STRATEGY_ENGINE_RESEARCH_2026-06-16.md (심층 근거·수치·정책 원문)
관련 권위: MOOD_CAMERA_SPEC_SYSTEM.md(6축, 본 엔진 L2 흡수) · ADAPTIVE_COMPOSITE_ENGINE.md(합성) · ADAPTIVE_IMAGE_SEO_ENGINE.md(상세 카피) · REPRESENTATIVE_IMAGE_FINISHING_SYSTEM.md(대표 규격)

---

## 0. 한 줄 정의

카테고리별 지식을 *코드가 아닌 데이터(버전드 카테고리 DNA 카드)* 에 두어, 어떤 상품이든 동일 파이프라인으로 흐르게 한다:
**L0 카테고리 인텔리전스 → L1 슬롯/퍼널 맵 → L2 전략 조립 → L3 그라운디드 생성·모델 라우팅 → L4 채점/학습/자산화 → L5 자연 개입점** (+ 발행전 정책 게이트)

전상품 공통의 비결: 새 카테고리 = 새 DNA 카드. 알려진 카테고리의 새 상품 = 검증된 프롬프트에서 웜스타트. 상품별 분기 코드 0.

---

## 1. 아키텍처 (L0~L5 + 정책 게이트)

| 레이어 | 역할 | 입력 | 출력 | 자동화/개입 |
|---|---|---|---|---|
| **L0 카테고리 인텔리전스** | 정보수집 | 네이버 카테고리코드·DataLab·경쟁 캡처(분석전용) | 카테고리 DNA 카드(버전드) | 무인 풀 + 개입#1(DNA 리뷰) |
| **L1 슬롯/퍼널 맵** | 슬롯 결정 | 제품속성 + DNA 카드 | SlotPlan(순서·직무·콘텐츠유형·무드·카메라·구도·가독성·텍스트정책·합성플래그·그라운딩·모델·비율) | 무인 도출 + 개입#1 |
| **L2 전략 조립** | 프롬프트 생성 | SlotPlan + 변수 + 블록 + 결정테이블 (+ 6축 룩업) | 슬롯별 프롬프트 + API 파라미터 | 무인 조립 |
| **L3 그라운디드 생성·라우팅** | 생성 실행 | 조립 결과 + 참조이미지 | 슬롯별 후보 이미지 N개 | 무인 1차 배치 + 개입#2(선택/평점) |
| **L4 채점/학습/자산화** | 학습 루프 | 인간평점 + CTR/CVR | 승자 프롬프트 → 카테고리 디폴트 승격, 라이브러리 복리 | 무인 로깅·승격 |
| **L5 자연 개입점** | HITL | — | 컨셉/변주/발행 검토 | 비모달·편집가능 (#56) |
| **정책 게이트** | 발행 차단 | 대표 후보 이미지 | pass/fail | 발행전 하드 게이트 |

원칙: 카테고리 인텔리전스 = 입력 계약 / DNA 카드 = 재사용 인터페이스 / 하류 전부 = 전상품 공통 기계장치.

---

## 2. 데이터 모델 (Prisma · additive · 7 모델)

영문 식별자 고정(한글 리터럴 금지). 전부 신규 테이블(기존 무손상).

```
model CategoryDna {
  id                String   @id @default(cuid())
  categoryCode      String   // Naver category code (local NAVER_CATEGORIES_FULL)
  categoryName      String
  version           Int      @default(1)
  parentDnaId       String?  // inheritance (override pattern)
  thumbnailConventions Json   // background, angle, propsAllowed, palette, brightness
  slotSequence      Json     // ordered slot type list for this category
  mandatorySlots    Json     // slots forced for this category
  toneManner        Json
  compositionNorms  Json
  trustSignals      Json     // certification types that matter (e.g. HACCP, clinical)
  demographics      Json     // from DataLab: age/gender/device skew
  palette           Json
  provenance        Json     // sources + capturedAt
  confidence        Float    @default(0.5)
  status            String   @default("draft") // draft|active|retired
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model SlotPlan {
  id            String   @id @default(cuid())
  productId     String
  categoryDnaId String?
  slots         Json     // [{slotType, conversionJob, contentType, mood, cameraSpecId, composition, legibility, textPolicy, compositeFlag, groundingFlag, modelRoute, aspect}]
  version       Int      @default(1)
  createdAt     DateTime @default(now())
}

model PromptVersion {
  id              String   @id @default(cuid())
  scope           String   // global|category|slot
  categoryCode    String?
  slotType        String?
  templateText    String
  variables       Json     // declared variable slots
  model           String   // firefly_native|nano_banana_pro|nano_banana_2
  groundingDefault Boolean @default(false)
  seedPolicy      String   @default("free") // free|locked
  refs            Json?    // structureRef/styleRef descriptors
  version         Int      // immutable; new edit = new row
  parentVersionId String?
  status          String   @default("draft") // draft|candidate|default|retired
  authoredBy      String
  rationale       String?
  createdAt       DateTime @default(now())
}

model Generation {
  id              String   @id @default(cuid())
  productId       String
  slotType        String
  promptVersionId String
  resolvedPrompt  String
  model           String
  modelVersion    String?
  grounding       Boolean  @default(false)
  seed            String?
  aspect          String?
  refs            Json?
  settings        Json?
  outputUrl       String?
  createdAt       DateTime @default(now())
}

model Rating {
  id            String   @id @default(cuid())
  generationId  String
  score         Int      // 1..5 (or 0/1 thumb)
  ratedBy       String
  note          String?
  createdAt     DateTime @default(now())
}

model PerformanceMetric {
  id           String   @id @default(cuid())
  generationId String?
  productId    String?
  slotType     String?
  metricType   String   // thumbnail_ctr|detail_cvr|time_on_page
  value        Float
  windowStart  DateTime
  windowEnd    DateTime
  source       String   // naver_report|store_stats|search_ad_ab
  createdAt    DateTime @default(now())
}
```

마이그레이션: additive only. 기존 Product/asset 테이블 무변경. prisma/migrations gitignored → schema.prisma + Supabase MCP = SoT, 시드 canonical = spec-data 류.

---

## 3. 카테고리 DNA 카드 (재사용 인터페이스)

디자인 토큰 패턴: 상속·오버라이드·버전드. 한 번 캡처 → 그 카테고리 전 상품 재사용. 한 번 갱신 → 전파.

필수 필드(§2 CategoryDna): 썸네일 관례 · 슬롯 시퀀스 · 필수 슬롯 · 톤앤매너 · 구도 노름 · 신뢰신호 유형 · DataLab 인구통계 · 팔레트 · provenance · confidence · version.

생성 경로: ① DataLab(인구·트렌드) 자동 → ② 운영자 트리거 경쟁 캡처(분석전용·재게시 금지) → ③ 개입#1에서 운영자 확정. parentDnaId로 서브카테고리/브랜드 특화.

---

## 4. 슬롯/퍼널 맵 (보편 9슬롯 + 결정테이블)

보편 상세 시퀀스(카테고리 무관, 내용만 변동):
1 훅/히어로 · 2 문제/공감 · 3 해결/USP · 4 기능 클로즈업 · 5 사용/라이프스타일 · 6 크기/규격 · 7 신뢰/사회증거 · 8 기프트(선택) · 9 CTA/브랜드스토리.

대표 썸네일 = 별도 슬롯(텍스트 프리·단일제품·1:1·≥1000px·제품 85~95% 점유).

결정테이블(제품속성 × DNA → 필수 슬롯):
- 사이즈 불확실(의류·가구) → 크기 슬롯 강제
- 신뢰민감(식품·화장품·유아) → 인증+숫자 슬롯 강제
- 기프트 편향 → 기프트 슬롯 추가
- 저관여 commodity → 아크 단축

각 슬롯 = {전환직무, 콘텐츠유형(제품맥락/무드/설명/스펙), 무드, 카메라(6축), 구도, 가독성, 텍스트정책, 합성플래그, 그라운딩, 모델, 비율}. 모바일 퍼스트(~200px 가독성·세로·CTA 중간반복·본문 ≥14pt).

---

## 5. 전략 조립기 (예측가능·재현가능)

결정적 조립: **변수**(제품명·소재·색·치수·DNA 팔레트·인구) + **블록**(슬롯별 재사용 프롬프트 조각) + **결정테이블**(슬롯유형 × DNA × 그라운딩 × 모델 × 비율 × 시드정책) → 완전 조립 프롬프트 + API 파라미터.

- 기존 6축 무드-카메라 시스템 = 본 단계의 카메라/무드 룩업으로 흡수(대체 아님). M1~M6 카메라/렌즈/조리개/비율 매핑 그대로 사용.
- 긍정형 제외 강제(#86): Firefly 네이티브·Nano Banana 네거티브 미준수 → 제외를 긍정형으로 번역("no people"→"empty background").
- 재현성: 시드 + 구조참조(strength) + 스타일참조 명시 컬럼. 긴/복잡 프롬프트는 시드 결정성 저하 → 템플릿 타이트하게.

---

## 6. 모델 라우팅 + 그라운딩 전술

| 모델 | 용도 | 비고 |
|---|---|---|
| **Firefly 네이티브** | 상업 안전 베이스 사진 · 브랜드 커스텀 모델 | 구조/스타일 참조·시드·콘텐츠타입 슬라이더 |
| **Nano Banana Pro** | 히어로 · 이미지 내 텍스트(한글) · 사실 인포그래픽 | 최대 14참조 + 5인 일관성 → DNA 시각참조 일괄 로드·제품 슬롯 일관 |
| **Nano Banana 2** | 고볼륨 카탈로그/변주 | 이미지 검색 그라운딩 · 4K · 극단 비율 |

그라운딩 슬롯별:
- ON: 실제 제품 지오메트리·실제 장소·인포그래픽 사실 숫자·이미지 내 텍스트
- OFF: 추상 히어로 무드·예술 배경(이득 없이 지연/크레딧)
- 신규 SKU: 그라운딩이 제품을 못 가져옴 → 참조이미지 공급. Thinking Mode 기본 OFF.

---

## 7. 채점 · 학습 · 자산화 (복리 루프)

1. 모든 생성 = 불변 튜플 로깅(Generation): {프롬프트버전·해석변수·모델·버전·그라운딩·시드·참조·비율·결과URL·설정}.
2. 불변 버전관리(PromptVersion): 편집 = 새 row(author·시각·근거). 환경(draft/candidate/default) = 포인터.
3. 평가: 인간평점(Rating, 1차) + CTR/CVR(PerformanceMetric, ground-truth 보상, RLHF식).
4. 승격: 평점+성과로 인컴번트를 충분 샘플로 이기면 (카테고리×슬롯) 디폴트로 승격. DNA 카드가 현 승리 버전 참조.
5. 복리: 알려진 카테고리 새 상품 = 검증 프롬프트 웜스타트. 라이브러리가 해자.

참조 아키텍처(패턴): PromptLayer/Langfuse/MLflow Prompt Registry/Braintrust/Maxim → 필요 부분만 Prisma/Supabase로 복제.

---

## 8. 자연 개입점 (L5) + 발행전 정책 게이트

비모달·편집가능·강제순서 없음 (#56). 컨트롤타워 개입대기열(Operator Action Queue)에 자연 노출.

- 무인: DataLab 풀 · DNA 갱신 · 프롬프트 조립 · 1차 배치 생성(저해상 N) · 업스케일 · 익스포트 · 로깅.
- **개입#1 컨셉/DNA 리뷰**: 대량생성 전 슬롯플랜+톤 확정(가장 쌈).
- **개입#2 변주 선택**: 후보에서 선택/평점(선택=평점 한 클릭 → eval 신호).
- **개입#3 발행전 검토**: 정책 준수 + 그라운디드 사실/숫자 검토.
- HITL 로깅: 승인자·편집·전후·신뢰도·소요시간 → 학습 피드.

**발행전 정책 게이트(하드)**: 대표 후보 → OCR 텍스트 0 · 단일제품 · 금지 오버레이(가격/프로모/배송/인증/테두리) 0 검사 → fail 시 발행 차단(config화·정책 변동 대응).

---

## 9. 네이버 정책·랭킹 (한국 특이점)

- **대표썸네일(2024-10-28)**: 텍스트 프리·단일제품. 가격/할인/혜택/배송/설치/프로모션/인증/원산지 문구·무관 상품·인위 테두리 금지. 위반=미노출+클린 제재. 설득 텍스트는 전부 상세로.
- **랭킹 = 적합도+인기도+신뢰도(트리 ML)**: 이미지는 CTR(인기도·7일 클릭)·품질(신뢰도)로 간접 작용 → 이미지 최적화 = 랭킹 지렛대 + 전환 지렛대.
- **A/B**: 검색광고로 썸네일 테스트(상품 랭킹 리셋 없음). 배경/맥락이 최대 지렛대 → 먼저 테스트. 이미지 단독 상승 통상 3~8%(복리).
- **모바일 75%**: ~200px 가독성·세로 스크롤·CTA 반복·신뢰요소 중간 반복.

---

## 10. 단계별 빌드 (우리 레인)

| Stage | 내용 | 레인 | 검증 |
|---|---|---|---|
| **0 기반** | Prisma 7모델 + 마이그레이션 + DataLab 연결 + find_category + 정책 게이트 | Code 빌드 → Desktop 검증 | tsc0·build0·Supabase 테이블·정책 게이트 단위테스트 |
| **1 수직 슬라이스** | DNA 카드(반수동) + 슬롯 결정테이블 + 조립기 + Firefly/NB 통합 + 개입#1~3 UI | Code+Desktop | 브라우저 실무 테스트(명화 슬롯플랜 생성·1차 배치) |
| **2 학습 루프** | 튜플 로깅 + CTR/CVR 역연결(상품리포트·스토어통계) + 승격 로직 | Code+Desktop | 평점→승격 round-trip |
| **3 일반화** | DNA 위저드 + 검색광고 A/B + 라이브러리 UI | Code+Desktop | 2번째 카테고리 무코드 적용 |

각 Stage 완료 = "완료" 라벨 전 브라우저/실측 검증 통과 필수(#88).

---

## 11. 전상품 공통 보증 + 기존 시스템 흡수 맵

- 상품별 분기 코드 0(#55). 카테고리 지식 = 데이터(DNA 카드).
- 흡수: 6축 무드-카메라(L2 카메라/무드 룩업) · 자산 택소노미 6스테이지(생성물 적재) · 정합 가드 #80/#81(자산 무결성) · 개입카드 C-9(L5 개입점) · 합성 엔진(L3 합성플래그) · 대표 규격 §9(썸네일 슬롯 규격).
- 오류 발견 = 전상품 시스템 확장(단건 수습 금지, #62).

---

## 12. 주의 · 재검증 (변동 추적)

- 네이버 정책은 movable → 정책 게이트 config화·릴리스 전 판매자센터 공지 재검증.
- DataLab top-500 인기검색어 = 웹UI 전용(API 미반환) → 골든키워드 별도 경로. 쿼터 ~1,000/일 콘솔 검증.
- 모델 능력·크레딧 빠른 변동 → 모델별 네거티브 지원·라인업 빌드 전 재확인.
- 시드 재현성 불완전(긴 프롬프트·버전 간) → 픽셀 동일 가정 금지.
- 스크래핑 = 운영자 트리거·분석전용·재게시 금지·robots/ToS 존중.
