# docs/research/ — 리서치 + API 진단 보고서

> **이 폴더의 역할**: 작업 중 발생한 디버그·진단·전략 리서치 결과를 누적 저장. **매 세션 정독 불필요**. 관련 주제 작업 시에만 grep/read로 참고.

---

## 보고서 인덱스

| 파일 | 작성일 | 주제 | 참고 시점 |
|------|--------|------|----------|
| **KKOTIUM_GARDEN_V3_2_MASTER_PLAN_2026_05.md** | 2026-05-19 | v3.2 통합 마스터 플랜 심층 연구 — (1) P-Filter 전처리 진단 모듈(sharp + Tesseract.js + Laplacian + BRISQUE/NIQE), (2) 9축 비즈니스 진단, (3) 14 스켈레톤 × 12 빌딩블록 단일 캔버스 인라인 마법사. 셀러 개입 4등급 한글 라벨(기본 자동화/검토 후 자동화/디자이너 손길 필요/완전 수동). 다크패턴 6대 금지유형(2025-02-14 시행, 2025-10-24 지침 개정) 빌딩블록 차원 사전 차단 룰. PhotoRoom/Claid/Firefly/Canva 2025-2026 벤치마킹 + Notion/Cursor inline overlay UX 패턴. | Sprint 8+ 자산 자동화 마스터 플랜 / P-Filter 구현 진입 / 다크패턴 lint 룰 설계 / 인라인 마법사 UX 결정 시 |
| **SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md** | 2026-05-12 | Smart Asset Workflow v3.1 FINAL — 상품 단위 적응형 자동화 시스템(Diagnosis → Automation → Refinement 3단 파이프라인). CTI 8축(컨셉 4축 + 톤 4축) + 12 골격 매칭 + L1~L4 등급별 분기. 디자이너 감각 보존(작업원칙 #40) 구체 구현. v2.0 PDF "월 1회 카테고리 큐레이션" 대안 폐기. | Sprint 7-M2 Smart Asset Workflow 작업 / CTI 추론 + 골격 매칭 구현 / 디자이너 감각 보존 원칙(#40) 구체화 시 |
| **KKOTIUM_V2_ARCHITECTURE_2026_05.md** | 2026-05-12 | v2 아키텍처 (v3.2 전신, 보존용) | reference |
| **OVERSEAS_SOURCING_BASELINE_2026_05.md** | 2026-05-08 | 해외 직소싱 영구 baseline — 셀렉트 편집샵 큐레이션 셀러 단계별. 1688/SUPER DELIVERY/Faire 등 15개 채널 비교, AI 도구 5대장(Accio·Wise·드랩아트 등), 매출 임계값별(씨앗→파워→빅파워) 4단계 로드맵, 1인 셀러 망하는 7가지 패턴, 꽃틔움 가든 앱 어댑터 우선순위. | 해외 직소싱 시점·방법 결정 / Sprint 7+ 1688 어댑터 통합 / 자체 브랜드 런칭 검토 시 |
| **DOMEGGOOK_API_INTEGRATION_STRATEGY_2026_05.md** | 2026-05-07 | 도매꾹/도매매 Open API + Private API 통합 전략 — 28개 Private API 효용 분석, Open API ROI Top 5 (재고 폴링·가격 변동·공급사 모니터·꼬띠 추천·카테고리 캐시), 위탁판매자 vs 공급사 관점, Sprint 6/7/8 재구성안. | Sprint 6 도매매 자동화 작업 / Private API 발급 결과 모니터링 / Sprint 8 자동발주 활성화 시점 |
| **SPROUT_TO_POWER_SELLER_WORKFLOW_2026_05.md** | 2026-05-07 | 새싹→파워셀러 워크플로우 최적화 — 15개 핵심 발견사항(등급 개편, 적합도 3축, 단건 vs CSV, 25-50자 상품명, 황금 키워드 7-10개, 카테고리 1페이지 일치율, 태그 사전 등재, 다크패턴 경고, 등록 7일 골든윈도우, 도매꾹 v4.5 옵션, AiTEMS, D+30 한달리뷰, 반품안심케어 +13.6%). | 등록 정확도 강화 / SEO 점수 개선 / 새싹→파워 단계 전략 수립 |
| **COMMERCE_API_403_ROOT_CAUSE.md** | 2026-05-06 | Naver Commerce API 403 근본 원인 진단 — `.env.local` `$` 미escape로 인한 dotenv-expand 부분 치환 버그. naver-doctor 진단 라우트 8체크 결과. | Naver API 인증 문제 발생 시 |
| **COMMERCE_API_ORDER_DIAGNOSIS.md** | 2026-04 | Naver Commerce Order API 403 진단 보고서 (Track B Deep Diagnosis) — `lastChangedFrom` 마이그레이션 가설 검증. 결과: 가설 빗나감, api-client.ts 그대로 정답. | Naver Order API 403/엔드포인트 변경 의심 시 |

---

## 사용 패턴

### 매 세션 정독 X
이 폴더의 보고서는 **매 세션 자동 읽기 대상이 아닙니다**. 새 채팅 시작 시 자동 정독 대상은 `docs/plan/`의 3종만 정독하세요.

### 필요할 때 참고 O
다음 상황에서 grep으로 키워드 검색 후 해당 보고서 정독:

| 작업 상황 | 검색 키워드 예시 |
|----------|----------------|
| Naver API 403 / GW.AUTHN / 인증 문제 | `grep -l "GW.AUTHN\|403" docs/research/*.md` |
| dotenv / 환경변수 / `$` escape 이슈 | `grep -l "dotenv\|escape" docs/research/*.md` |
| Order API 엔드포인트 변경 의심 | `grep -l "lastChangedFrom\|product-orders" docs/research/*.md` |
| 도매매 Open/Private API mode 별 효용 | `grep -l "getItemView\|getItemList\|setOrder" docs/research/*.md` |
| 새싹→파워 등급 임계값 / SEO 가이드라인 | `grep -l "황금 키워드\|골든윈도우\|반품안심케어" docs/research/*.md` |
| 해외 직소싱 / 1688 / SUPER DELIVERY / Faire | `grep -l "1688\|SUPER DELIVERY\|Faire\|Accio" docs/research/*.md` |

---

## 새 보고서 추가 가이드

### 1. 파일명 규칙

```
<DOMAIN>_<TOPIC>_<TYPE>.md
또는
<TOPIC>_<DETAIL>_<YYYY_MM>.md (시점 명시 baseline의 경우)
```

예시:
- `COMMERCE_API_403_ROOT_CAUSE.md` — Commerce API 403 근본원인
- `OVERSEAS_SOURCING_BASELINE_2026_05.md` — 해외 직소싱 baseline (시점 명시)
- `NAVER_DATALAB_TREND_ANALYSIS.md` — DataLab 트렌드 분석

### 2. 보고서 구조 권장 (최소 4섹션)

```markdown
# <제목>

> 작성일: YYYY-MM-DD | 작성 컨텍스트: <세션 또는 commit hash>

## 1. 증상 / 발견된 문제 (또는 TL;DR / Key Findings)

## 2. 진단 과정 (또는 Details — 영역별 심층 분석)

## 3. 근본 원인 (또는 Recommendations — 단계별 실행 권고)

## 4. 해결책 / 영구 조치 (또는 Caveats — 해석상 주의사항)
```

### 3. 인덱스 갱신

새 보고서 추가 시 본 README의 "보고서 인덱스" 표에 한 줄 추가.

---

## 향후 분류 확장 제안 (현재 적용 X, 보고서 10개 이상 시 검토)

보고서가 많아지면 다음 하위 폴더로 분류 가능:

```
docs/research/
├── api/        ← API 관련 진단/디버그
├── strategy/   ← 비즈니스 전략 리서치 (Sprout, Domeggook, Overseas 등)
├── ux/         ← UI/UX 리서치
└── perf/       ← 성능/최적화 리서치
```

현재는 평탄 구조 유지 (보고서 5개로 분류 불필요).
