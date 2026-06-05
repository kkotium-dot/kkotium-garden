# 이미지 파이프라인 개선 마스터 플랜 (IMAGE PIPELINE IMPROVEMENT MASTER PLAN)

> 생성: 2026-06-05 (Code, #29b Python full-overwrite)
> 권위: docs/research/KKOTIUM_IMAGE_PIPELINE_RESEARCH_2026-06-05.md + 명화 첫 발행/배선 교정 실측(SESSION_LOG 32·33)
> 성격: 5트랙 로드맵. 본 문서는 계획 — 각 트랙 착수는 대표 승인 게이트.

## 1. 배경

명화(cmpnooli40001f0gveaxr8iim) 첫 발행 성공(naverProductId 13564133057, ACTIVE) 직후 발견:
발행 이미지가 **공급사 원본 그대로(디자인 미적용)**였다. 대표=공급사 4세트 진열컷(타사 영문 브랜드 노출),
상세=빈 미완성본. 근본 원인은 **자산 파일명 불일치 배선 결함** — 엔진(asset-source-resolver)은 고정 이름
`cutout.png` / `backdrop-{skeletonId}.png`을 찾는데, Storage엔 `myeonghwa-cutout.png`(스크립트 우회 임시 업로드)만
있어 cutout이 fallback(공급사 원본)으로 degrade. backdrop-S6.png는 이미 존재·작동(부분 정정).

Code 교정 완료(SESSION_LOG 33): `scripts/upload-cutout.js`로 cutout.png 배포 + backdrop 백업 후 큐레이트
업그레이드 → production 썸네일 재생성 시 assetSource `{cutout:"auto-cache", backdrop:"auto-cache"}` 전환 확인.
재료 품질은 우수(Desktop 육안 검증 GREEN). 단, **네이버 발행상품의 대표/상세 이미지 수정은 비가역이라 별도 turn(대표 승인) 보류** 상태.

## 2. 리서치 핵심 결론 (3줄)

1. **Firefly Services API는 1인 셀러에게 비현실적(엔터프라이즈 계약, ~$1,000/월)** → 메인 대표컷만 수동(Firefly 웹 UI 또는 Bria),
   누끼·썸네일 합성·상세·카피는 Bria AI(상업 무배상 API) + 자체 Sharp로 자동화하는 하이브리드가 정답.
2. **네이버 2024-10-28 대표이미지 기준 강화**(가격/홍보문구/옵션 라인업컷/소품 혼입 제재) → "단일 본품 누끼 + 자체 배경"
   방향이 라이선스·SEO 양면 정합. 공급사 원본 직송은 중복이미지·타사 브랜드·가격비교 묶임 리스크.
3. **MCP는 데스크톱 보조용 유지, 프로덕션 자동화는 웹앱 잡 큐로**: backdrop_jobs → asset_jobs 일반화 +
   라이선스 3-레인 라우터(green/amber/red) + 발행 검수 대시보드. 사람 개입은 메인컷 선택·발행 직전 승인 2지점만.

## 3. 작업 유형별 도구 매핑표

| 작업 유형 | 1순위 | 폴백 | 레인 | 단가 |
|---|---|---|---|---|
| 메인 대표컷 배경 생성 | Bria AI(무배상 API) / Firefly 웹 UI(수동) | 자체 Sharp 배경 | red(승인) | Bria Product Shot $0.023 |
| 본품 누끼(RMBG) | Bria RMBG 2.0 | 자체/오픈소스 RMBG | green/amber | $0.018/건 |
| 썸네일 레이아웃 합성 | 자체 Sharp | — | green(자동) | $0 |
| 상세페이지 섹션 합성 | 자체 Sharp + 템플릿 | Canva(수동) | green(자동) | $0 |
| 한글 카피 | LLM(Gemini/Groq/Claude) | 사람 작성 | amber(검수) | LLM 토큰 |

레인 정의: green=자동 통과+샘플 검수 / amber=사람 검수 큐 / red=반드시 사람 승인.

## 4. 5트랙 분할 로드맵

### T1 — asset_jobs 범용화 + 라이선스 티어 스키마
- 목표: backdrop_jobs를 범용 asset_jobs로 일반화해 모든 자산 작업(메인컷/누끼/썸네일/상세/카피)을 한 잡 테이블로 추적.
- 산출물: asset_jobs 스키마(job_type, status[queued/running/awaiting_review/approved/published/failed],
  tool_used, license_tier, input_refs, output_refs, error, reviewer_decision) 마이그레이션 + 기존 backdrop_jobs 데이터 이관/호환.
- 대표 개입 지점: 없음(스키마/마이그레이션). 단 적용 전 설계 승인.
- 의존성: 없음(선행 트랙). 고정 자산명 규약(cutout.png/backdrop-{skeletonId}.png) 유지 — asset-source-resolver 호환 불변.
- 완료 기준: asset_jobs 마이그레이션 적용 + 기존 backdrop 잡 무손실 이관 + TSC 0/build OK + 회귀 0.

### T2 — Bria AI PoC 통합
- 목표: 누끼·배경 합성을 셀프서브 API(Bria RMBG 2.0 / Product Shot)로 자동화. fal.ai 또는 Replicate 경유로 계약 부담 최소.
- 산출물: Bria 호출 어댑터(누끼 $0.018, 배경 $0.023) + asset_jobs 연동(비동기 잡 생성→폴링/웹훅) + 결과를 고정 자산명으로 Storage 적재.
- 대표 개입 지점: PoC 비용/품질 승인(월 예산 가드). 누끼 결과 amber 검수.
- 의존성: T1(asset_jobs). 키/예산 설정.
- 완료 기준: 1개 상품 end-to-end(원본→Bria 누끼→Storage cutout.png→썸네일 auto-cache) 실증 + 비용 실측 보고.

### T3 — 3-레인 라우터 + 도구 자동 선택
- 목표: 작업 유형별 라이선스 안전성 기반 라우터(green/amber/red)로 도구 자동 선택·디스패치.
- 산출물: 라우터 모듈(작업유형→1순위/폴백 도구 매핑 + 레인 판정) + 승인 게이트 큐(red/amber는 reviewer_decision 대기).
- 대표 개입 지점: red 레인(메인컷) 승인, amber(누끼 엣지·카피) 검수.
- 의존성: T1, T2.
- 완료 기준: 라우터가 매핑표대로 디스패치 + red/amber가 큐에서 대기·재개되는 인터럽트 패턴 실증.

### T4 — 발행 검수 대시보드 + 시안 선택 UI
- 목표: 발행 직전 publish-readiness 대시보드(대표이미지 규정 자동 점검, 옵션 단일성, 카피, MCP 연결) + N개 메인컷 시안 비교 1택 UI.
- 산출물: 빨간불/초록불 체크리스트 위젯(기존 PublishControlTowerWidget 확장) + 시안 갤러리 선택 컴포넌트 + 네이버 2024-10-28 금지항목 룰 점검(VLM/휴리스틱).
- 대표 개입 지점: (a) 메인컷 시안 선택 (b) 발행 직전 승인 — 본 트랙이 이 2지점의 UI를 제공.
- 의존성: T3(레인/큐).
- 완료 기준: 대시보드가 4축 체크리스트 표시 + 시안 선택→approved 전이 + 위반 자동 차단 실증.

### T5 — 앱-Desktop-MCP 환경 연결 + 발행 워크플로우 앱 통합
- 목표: 데스크톱(MCP/Firefly 웹)↔웹앱 핸드오프(딥링크/클립보드 브리지/상태 폴링)를 매끄럽게 + 발행 전 과정을 앱 워크플로우로 통합.
- 산출물: 핸드오프 페이로드 규약 + 잡 상태 폴링 UI + 소싱→가공→검수→발행 단일 워크플로우 화면.
- 대표 개입 지점: 메인컷 선택·발행 승인(T4 UI 재사용).
- 의존성: T1~T4.
- 완료 기준: 1개 상품을 앱 워크플로우만으로(소싱→누끼→합성→검수→발행) 완주 + 데스크톱 보조 단계 핸드오프 무손실.

## 5. 대표 개입 2지점 (이것만 수동, 나머지 자동)

- (a) **메인컷 시안 선택**: red 레인. 상업 무배상 필요·브랜드 인상 결정 → 사람이 N개 중 1택.
- (b) **발행 직전 승인**: 발행 검수 대시보드에서 4축 GREEN 확인 후 최종 승인 → 네이버 register(비가역).

그 외(누끼·썸네일·상세 합성·카피 생성)는 green/amber 자동 파이프라인. amber는 비차단 샘플 검수.

## 6. 즉시 후속 (본 플랜 외 잔여)

- 명화(13564133057) 네이버 대표/상세 이미지 수정(대표 승인, 비가역) — 배선 교정된 cutout/backdrop 반영.
- 수동 소싱 경로 crawl_logs.product_id 자동 배선 갭 교정(batch-register는 이미 자동 배선).
- 명화 재질/색상 발행후 보강(A안, 신상품 가점 24~48h).
