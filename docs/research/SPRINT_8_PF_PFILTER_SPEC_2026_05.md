# Sprint 8-PF: P-Filter 전처리 진단 모듈 구현 명세서

> 생성일: 2026-05-21
> 작성: Claude Web (시니어 책임 영역)
> 분류: Sprint 8-PF / Pre-flight Image Quality Diagnosis
> 전제: 기존 assessImageQuality (Sharp 4축) 흡수 확장, /api/diagnose 호환 보존

---

## TL;DR

- **목적**: 도매매 원본 이미지가 상세페이지 에셋으로 쓸 수 있는 *물리적 상태*인지를 9축 비즈니스 진단 *이전*에 1.5초 내 검문
- **핵심**: 기존 `assessImageQuality` (Sharp 4축)을 8단계로 흡수 확장 + 워터마크 검출 신규 + 4등급 자동 판정
- **신규 의존성**: tesseract.js (OCR, 무료) 1개만 추가. sharp는 이미 설치됨 (0.34.5)
- **비용**: 상품당 0원 (100% 로컬 처리, 유료 API는 L3/L4 케이스만 선택적)

---

## 1. 현재 코드 분석 (시니어 직접 확인 완료)

### 1.1 기존 진단 흐름
```
POST /api/diagnose
  → resolveInputs (productId 또는 imageUrl)
  → assessImageQuality(imageUrl)   ← Sharp 4축, P-Filter가 흡수할 대상
  → inferConceptTone (CTI 8축)
  → gradeProduct (L1~L4)
  → persistDiagnosis (Diagnosis 테이블)
```

### 1.2 기존 자산 (재활용)
- `src/lib/diagnosis/image-quality.ts` — assessImageQuality, ImageQualityResult 타입
- sharp 0.34.5 설치됨
- runtime = 'nodejs' 확정 (Sharp는 Edge 비호환)
- colorMood / photoStyle 출력 → CTI 입력으로 이미 연결됨

### 1.3 P-Filter 통합 원칙
- 기존 assessImageQuality 호출부를 깨지 않음 (호환 보존)
- P-Filter = assessImageQuality의 상위 래퍼로 설계
- 새 출력 필드는 추가만, 기존 필드는 유지

---

## 2. P-Filter 8단계 파이프라인 (목표 1.5초)

| 단계 | 항목 | 도구 | 소요 | 임계값 |
|---|---|---|---|---|
| 1 | 메타데이터 스캔 | sharp.metadata() | 50ms | 가로<860px → 업스케일 후보 / <600px → L4 |
| 2 | 블러 검출 | sharp Laplacian convolve → variance | 200ms | <100 심각 / 100~300 주의 / >300 정상 |
| 3 | 노출/콘트라스트 | sharp.stats() mean/stdev | 150ms | mean<30 또는 >225 노출문제 / stdev<20 콘트라스트부족 |
| 4 | 화이트밸런스 | R/G/B 평균 비율 | 150ms | neutral에서 5%+ 치우침 → cast |
| 5 | 워터마크 OCR | tesseract.js 상하 15% 영역 | 400ms | 텍스트 검출 → 공급사 로고 의심 |
| 6 | 배경 단일성 | 코너4점+무게중심 히스토그램 분산 | 200ms | <1500 단일배경 / 그 이상 복잡 |
| 7 | 객체 비율 (선택) | sharp trim() bbox 추정 | 200ms | bbox/image 0.3~0.7 적정 |
| 8 | 4등급 판정 | 가중합 | 50ms | 아래 §4 매트릭스 |

### 2.1 단계 1~4: 기존 assessImageQuality 흡수
기존 Sharp 4축이 이미 메타데이터/블러/노출/색상 일부를 처리 중일 가능성 높음.
Code CLI는 image-quality.ts를 먼저 read하여 중복 구현을 피하고 *부족한 축만 추가*할 것.

### 2.2 단계 5: 워터마크 OCR (신규 핵심)
도매매 원본 패턴: 하단 또는 상단에 한글 로고/사이트명.
- sharp로 이미지 상단 15% + 하단 15% 영역만 crop
- tesseract.js 한국어+영어 모드로 OCR
- 텍스트 검출 시: 검출 위치 + 텍스트 내용 → watermarkSignal 반환
- 자동 크롭 후보 영역 마킹 (실제 크롭은 L2 자동화에서)

### 2.3 단계 6: 배경 단일성 (신규)
- sharp.extract()로 4개 코너(각 50x50px) + 중앙 샘플
- 각 영역 평균 색상 → 분산 계산
- 단일 배경이면 L1 자동 배경제거 가능 판정에 활용

---

## 3. 신규 파일 구조

| 파일 | 역할 | 예상 LOC |
|---|---|---|
| src/lib/diagnosis/p-filter.ts | 메인 파이프라인 runPFilter() | ~280 |
| src/lib/diagnosis/p-filter-watermark.ts | tesseract.js OCR 워터마크 검출 | ~120 |
| src/lib/diagnosis/p-filter-types.ts | PFilterResult 등 타입 | ~80 |
| src/lib/i18n/p-filter-messages.ko.json | 셀러 친화 한글 메시지 | ~40 |
| scripts/verify-p-filter.ts | 검증 (정상/블러/워터마크/저해상도 4케이스) | ~120 |

신규 의존성: `npm install tesseract.js` (무료, ~2MB)

---

## 4. 4등급 자동 판정 매트릭스

### 4.1 등급 정의 (셀러 친화 한글)
| 코드 | 한글 라벨 | 조건 | 셀러 개입 |
|---|---|---|---|
| L1 | 기본 자동화 | 모든 점수 정상 + 워터마크 없음 | 0-click |
| L2 | 검토 후 자동화 | 워터마크 검출 OR 노출/WB 보정 필요 | 1-click 승인 |
| L3 | 디자이너 손길 필요 | 블러 심각 OR 객체 절단 OR 배경 복잡 | 슬라이더 디렉팅 |
| L4 | 완전 수동 | 해상도 부족(<600px) OR 객체 인식 실패 | 재촬영 권고 |

### 4.2 판정 우선순위 (위에서부터 검사, 먼저 걸리면 확정)
```
1. 가로 < 600px → L4 (완전 수동)
2. 블러 variance < 100 → L3 (디자이너 손길)
3. 워터마크 검출 → L2 (검토 후 자동화)
4. 노출 문제(mean<30 또는 >225) OR WB cast → L2
5. 배경 복잡(분산>1500) AND 단일배경 필요 카테고리 → L3
6. 위 모두 통과 → L1 (기본 자동화)
```

### 4.3 PFilterResult 출력 형태
```typescript
interface PFilterResult {
  grade: 'L1' | 'L2' | 'L3' | 'L4';
  gradeLabel: string;          // 셀러 친화 한글 (i18n)
  passed: boolean;             // L1/L2 = true, L3/L4 = false (자동화 가능 여부)
  signals: {
    resolution: { width: number; height: number; sufficient: boolean };
    blur: { variance: number; level: 'severe' | 'warning' | 'ok' };
    exposure: { mean: number; ok: boolean };
    whiteBalance: { cast: boolean; direction?: 'warm' | 'cool' | 'green' | 'magenta' };
    watermark: { detected: boolean; regions: string[]; texts: string[] };
    background: { variance: number; uniform: boolean };
    objectRatio?: { ratio: number; appropriate: boolean };
  };
  autoFixSuggestions: string[];  // 셀러에게 보여줄 한글 제안
  requiresSellerReview: boolean;
  elapsedMs: number;
}
```

---

## 5. 9축 진단과의 통합 지점

### 5.1 /api/diagnose 흐름에 삽입
```
resolveInputs
  → runPFilter(imageUrl)         ← 신규 (assessImageQuality 흡수 확장)
  → IF grade === 'L4': early return (재촬영 권고, CTI/grading 스킵)
  → inferConceptTone (기존)
  → gradeProduct (기존, P-Filter 결과를 qualityScore에 반영)
  → persist (PFilterResult를 Diagnosis.qualitySignals에 포함)
```

### 5.2 호환 보존 규칙
- 기존 assessImageQuality 출력(colorMood, photoStyle)은 그대로 유지 → CTI 입력 보존
- P-Filter는 ImageQualityResult를 *확장*한 PFilterResult 반환
- gradeProduct의 qualityScore 입력은 P-Filter의 종합 점수로 대체 (더 정확)
- Diagnosis 테이블 qualitySignals(JSON)에 PFilterResult 전체 저장 → 스키마 변경 불필요

---

## 6. 신규 DB 처리

스키마 변경 최소화 원칙:
- Diagnosis.qualitySignals (기존 JSON 필드)에 PFilterResult 저장 → **신규 테이블 불필요**
- 단, 등급 빠른 조회용으로 Diagnosis에 컬럼 1개 추가 권장:
  - `pFilterGrade String?` (L1~L4, nullable, 기존 row 호환)
- migration name: diagnosis_add_pfilter_grade

---

## 7. 검증 계획 (scripts/verify-p-filter.ts)

| 케이스 | 입력 | 기대 등급 |
|---|---|---|
| 정상 상품컷 | 깨끗한 1000px 상품 이미지 | L1 |
| 워터마크 박힘 | 하단 로고 있는 도매매 원본 | L2 |
| 흐릿한 사진 | 블러 variance < 100 | L3 |
| 저해상도 | 가로 500px | L4 |

각 케이스 PFilterResult.grade 일치 + elapsedMs < 2000 검증.
B+C 격리 패턴 (더미 이미지 URL, 실 상품 미오염).

---

## 8. 한계와 주의사항

1. **tesseract.js 첫 로딩 지연**: WASM 로딩 ~1초. production cold start 시 첫 호출만 느림. 워밍업 전략 또는 lazy init 필요.
2. **객체 비율(단계 7)은 선택**: sharp trim()은 단색 배경에서만 정확. 복잡 배경은 부정확 → optional 처리, 실패 시 skip.
3. **워터마크 오탐**: 상품에 원래 텍스트(브랜드명 등)가 있으면 워터마크로 오인 가능. L2 분류는 셀러 1-click 승인이라 오탐 비용 낮음.
4. **L4 비율 모니터링**: 도매매 원본 다수가 L4로 빠지면 임계값(600px) 재조정 필요. 첫 실상품 등록 후 비율 확인.
5. **Edge runtime 금지**: sharp + tesseract 모두 nodejs runtime 필수. /api/diagnose는 이미 nodejs 확정.

---

## 부록 — Code CLI 작업 순서 요약

```
0. image-quality.ts read (기존 4축 파악, 중복 회피)
1. npm install tesseract.js
2. p-filter-types.ts (타입)
3. p-filter-watermark.ts (OCR)
4. p-filter.ts (8단계 파이프라인)
5. p-filter-messages.ko.json (한글 메시지)
6. /api/diagnose에 runPFilter 삽입 (L4 early return)
7. prisma schema pFilterGrade 컬럼 + migration
8. verify-p-filter.ts 4케이스 검증
9. TSC + build + commit + push + verify-deploy
```
