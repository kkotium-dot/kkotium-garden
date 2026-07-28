---
paths:
  - "src/lib/design/**"
  - "src/app/api/**/composite/**"
  - "docs/design/ADAPTIVE_COMPOSITE_ENGINE.md"
---

# 이미지/발행 자산 규칙

> 이관 출처: CLAUDE.md §3-6 (2026-06-05 명화 발행 후 명문화). 전문 보존: `docs/archive/CLAUDE_MD_FULL_2026-07-24.md`.
> 이관 근거: `docs/design/CLAUDE_MD_REDUCTION_CANDIDATES_2026-07-28.md` 후보#2.

- **라이선스 안전**: 상업 무배상이 필요한 메인 대표컷은 Firefly(웹 UI 수동) 또는 Bria(무배상 API)만 사용. Stable Diffusion 등 상업 무배상을 제공하지 않는 모델은 메인컷 생성 금지.
- **브라우저 자동화 금지**: Adobe/Canva/Figma 웹 UI를 스크립트로 우회 금지(약관 위반·계정 정지 리스크). 공식 API 또는 사람 수동 작업만 허용.
- **네이버 대표이미지 규정(2024-10-28 강화)**: 대표이미지에 가격/할인/홍보 문구, 배송·원산지·A/S·인증 텍스트, 옵션 라인업컷, 본품과 구별 안 되는 소품 혼입 금지. 대표컷 = 단일 본품 누끼. 라인업/비교 컷은 추가이미지(2~10번)·상세페이지에 배치.
- **발행 이미지는 반드시 디자인 가공본**(누끼 + 자체 배경 합성). 공급사 원본 직송 금지(중복이미지·타사 브랜드 노출·가격비교 묶임·저품질 패널티).
- **자산 저장 이름 규약**: 엔진(asset-source-resolver)은 고정 이름 `cutout.png` / `backdrop-{skeletonId}.png`으로 자산을 조회. 저장 시 반드시 이 규약 준수(`myeonghwa-*` 같은 임의 접두어 금지). 정식 배포는 `scripts/upload-cutout.js` 스크립트 사용. 배선 결함(이름 불일치) 시 cutout이 fallback=공급사 원본으로 degrade되어 디자인 미적용 발행이 됨.
- **합성 표준 권위문서 (v8 참조 드롭)**: 본품 무드 합성(추가이미지/상세 히어로)은 `docs/design/ADAPTIVE_COMPOSITE_ENGINE.md`(v8 — 참조 드롭 하모나이즈·형태 가드·결정론 폴백·≥2무드·과대금지, 작업원칙 #61)를 권위로 따른다. 등록 전체 파이프라인(원산지·옵션재고·고시규격·이미지)은 `docs/design/PRODUCT_REGISTRATION_WORKFLOW.md` 권위. 상품현실시트 작성 후 finish-image(C-3)·apply-composite(C-7)·개입카드(C-9)·이미지 스튜디오(C-5) 경로.
- **매 상품 v8 (절대조건)**: 제품 합성 = 참조 드롭 하모나이즈(Firefly 참조 슬롯 -> Nano Banana 2) + 형태 가드, 실패 시 결정론 폴백(sharp). 생성 = 피사체 보존. 가독·참값 비례·사실성 = 절대조건.
- **충실도 카드 + 실물대조 + 클립물리 + 네이밍컨벤션 = 발행 전 절대 게이트 (전상품)**: 상품별 충실도 카드(Product.fidelity — 형태·마운트메커닉·구성요소·금지데코·향(scents)·promptInject; 명화 4향=Cotton Around · Black Cherry · April Fresh · Lemon Eucalyptus)를 이미지 프롬프트가 자동 prepend + 금지데코 네거티브 + 마운트물리정합 clause 주입. (1) 합성으로 슬롯 확정 시 마운트 정합 검수 개입카드(#56·mount_check, 클립-슬랫 물리 OK) → (2) 대표/추가 이미지 확정 시 충실도 카드 대조 개입카드(#56·fidelity_check)가 Operator Action Queue에 노출 → 운영자 실물대조 통과 후에만 발행(비가역 #46). 적재 = 스테이지 taxonomy v2(source/cutout/plate/reference/composite/thumbnail/detail/archive) + 네이밍컨벤션(STAGE_NAMING 토큰 angle/mood/slot/context) + AssetRegistry 인덱스. 권위 docs/design/ADAPTIVE_COMPOSITE_ENGINE.md §11·§15.
