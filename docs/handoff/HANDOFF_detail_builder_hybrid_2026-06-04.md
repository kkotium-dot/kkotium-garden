# HANDOFF — 씨앗심기 상세페이지 빌더 하이브리드 대수술 (통합 설계도)

> 작성: 2026-06-04 (Desktop) | Target Session: code-cli | Branch: feature/detail-builder-hybrid
> baseline: production HEAD a585635 / 브랜치 HEAD bf09837 (STEP 1 완료)
> 권위 문서: 본 설계도 + docs/research/TOOL_ECOSYSTEM_MANUAL_2026-06-04.md + 실측 코드
> 성격: 대수술(렌더 엔진 + 출력단 + UI). 단계 분할 필수. 비가역 0(발행 미접촉 유지).
> ★ 대원칙: P0(달항아리·명화 디퓨저 발행)을 망치지 않는다. 기존 PNG 경로는 회귀 없이 보존하고, 개선은 가산식으로.

---

## 0. 배경 — 왜 이 수술이 필요한가 (대표 확정)

현 빌더(section-builder.ts)는 섹션별 PNG를 stackVertically로 세로 적층 → "조각 모음" 이질감.
가독성·실용성 저하의 근본 원인. 대표 지적 + 도구 매뉴얼 결론("연속성·합성은 디자인 도구가 강하고
sharp 단순 적층은 약하다")이 일치. 개선 방향 = (1) 연속 캔버스화 (2) 무드배경 합성 연결
(3) 하이브리드 출력(이미지 OR HTML) (4) 정보 섹션 가독성 가드 (5) 커넥터 운영 규칙 코드화.

빌더 정체성(대표 확정): **하이브리드**.
- 이미지 경로: 상세페이지 이미지 자체가 좋거나 Adobe로 별도 제작 시 → 이미지 주소 업로드/대량등록.
- HTML 경로: 네이버 스마트에디터 호환 필요 시 → HTML 블록.
- 상황에 맞게 양방향 모두 지원.

---

## 작업 1 — 연속 캔버스화 (조각 적층 → 흐르는 페이지) [P1] = STEP 2

### 1-A. 문제
section-builder.stackVertically가 섹션 PNG를 top offset만 누적해 단순 적층. 섹션 간 공통 배경/
여백 연속성 0 → 끊김.

### 1-B. 설계 (sharp 경로 유지하되 연속성 주입)
- **공통 배경 레이어 선합성**: 전체 캔버스(860 x totalHeight)에 먼저 (a) 단색(기존) 또는
  (b) lifestyleAssetUrl 무드배경을 깔고, 그 위에 각 섹션을 **투명 배경**으로 합성.
  → 섹션 렌더러가 각자 배경을 칠하지 않고, 전역 배경 위에 콘텐츠만 얹는 구조로 전환.
- **섹션 간 연결 여백(bleed/gap) 토큰화**: section-variants.ts의 detailRootVariants space-y
  (l1=24/l2=40/l3=64) + section py를 builder가 읽어 섹션 사이 transition zone을 부드럽게.
- **하위호환 가드**: lifestyleAssetUrl 없으면 기존 단색 동작과 100% 동일하게 폴백
  (회귀 0 — P0 발행물 안전).

### 1-C. 영향 파일
- src/lib/automation/section-builder.ts (stackVertically → composeContinuous로 확장, 기존 함수 보존)
- src/lib/automation/section-renderers/*.ts (배경 칠 로직을 전역 배경으로 위임 — 단, 점진 적용:
  hero부터, 나머지는 회귀테스트 후)
- ★ 한 번에 전 섹션 고치지 말 것. hero 1개 먼저 전환 → 시각 확인 → 확산.

### 1-D. ★ STEP 1 실물 검증에서 도출된 STEP 2 반영 항목 (Desktop 2026-06-04 확인)
명화 디퓨저 실측 합성 결과, 회귀 가드/겹침(본품-패널 50px 간격)은 안전 확정. 다음 2건을 STEP 2에 녹일 것:
- **(개선1) 본품 바닥 앵커링**: 무드배경 모드에서 본품 누끼가 공중에 뜬 느낌. 배경의 테이블면
  (대략 캔버스 하단 1/3, 명화 배경 기준 약 y 0.62~0.68 지점)에 본품 바닥을 맞춰 "테이블에 놓인"
  사실감을 살릴 것. 단색 경로는 기존 중앙 배치 유지(회귀 0).
- **(개선2) 패널-본품 일체감**: 가독성 패널이 본품과 다소 동떨어져 보임. 패널 상단을 살짝 끌어올리거나
  상단 가장자리에 투명→흰 그라데이션 페이드를 주어 본품과 자연스럽게 연결. 단, 본품 가림 금지(현 50px
  안전 간격을 침범하지 않는 선에서 페이드만).

---

## 작업 2 — 무드 배경(A) + 본품(C) 합성 연결 [P1, 매출 직결] = STEP 1 (완료)

### ✅ STEP 1 완료 (브랜치 bf09837, Desktop 코드+실물 양면 검증 통과 2026-06-04)
- hero.ts에 무드배경 cover-fit + 본품 투명 letterbox + 가독성 패널 추가, usedLifestyle 게이트.
- 회귀 가드 검증: lifestyleAssetUrl 미전달 시 createCanvas/fitImage/패널null/레이어순서 전부 기존 동일.
- 실물 검증: 명화 디퓨저(배경 myeonghwa-backdrop-860.jpg + 누끼 myeonghwa-cutout.png) 합성 결과
  무드 일치, 본품 선명(가림 없음), "하나의 히어로 컷"으로 읽힘.
- 미세개선 2건은 위 1-D로 이관(STEP 2에서 처리).

### 2-C. 하이브리드 배경 정책 (대표 확정 = 하이브리드)
- 히어로/감성 섹션: 무드 배경 풀 적용.
- 정보 섹션(spec/shipping/as/cta 등): 무드배경에서 **톤만 추출**(연한 단색/그라데이션) + 가독성 우선.
- 구현: section-variants 또는 skeleton 메타에 sectionRole('emotional'|'informational') 플래그 추가,
  builder가 role에 따라 배경 강도 분기.

---

## 작업 3 — HTML 출력 경로 신설 (하이브리드 절반) [P2] = STEP 3

### 3-A. 목적
네이버 스마트에디터 호환 HTML 출력. 이미지 경로(PNG)와 **병렬**로 존재 — 대체 아님, 추가.

### 3-B. 설계
- buildDetailPage 결과(섹션 메타 + copy)를 입력으로 받는 **별도 직렬화기** detail-html-serializer.ts 신설:
  - 각 섹션 copy를 의미적 HTML 블록(h2/p/img/table)으로 변환.
  - 네이버 상세 권장 860px 폭 인라인 스타일, 모바일 대응(텍스트 1.5x).
  - 이미지 블록: Supabase 영구 URL을 img src로 (이미지 주소 업로드/대량등록 호환).
- generate-detail/route.ts 응답에 `detailHtml` 필드 **추가**(기존 detailBase64는 보존).
- 출력 선택은 호출 측(Studio UI / 대량등록 파이프)이 결정: 이미지가 좋으면 PNG, 호환 필요하면 HTML.

### 3-C. 가드
- HTML 경로는 신규 필드 추가이므로 기존 PNG 소비자(저장/발행) 회귀 0.
- copy의 #46 grounding 동일 적용(허위 사실 금지) — 직렬화기는 copy를 변형하지 않고 마크업만.

---

## 작업 4 — 정보 섹션 가독성 가드 + Studio UI 배선 [P2] = STEP 4

### 4-A. 렌더 측
- 작업 2-C의 sectionRole 분기를 정보 섹션에 적용(가독성 우선 배경).
- 작업 1-D 개선2(패널 페이드)도 여기서 정교화.

### 4-B. Studio UI 측 (DetailPageCard.tsx)
- 현재: 결과 PNG를 maxHeight 520 스크롤 미리보기로만 표시 → "블록 단위 인지" 한 원인.
- 개선: (a) 이미지/HTML 출력 토글 (b) lifestyleAssetUrl(무드배경) 입력/선택 UI
  (c) 미리보기를 "연속 페이지"로 인지되게 (스크롤 컨테이너 시각 개선).
- 본 작업은 UI라 Claude Design으로 초안 → Figma 정밀화 흐름 권장(매뉴얼 §1). 단 1차는 최소 기능부터.

---

## 작업 5 — 매뉴얼 기반 커넥터 운영 규칙 코드화 [P3] = STEP 5

도구 매뉴얼(TOOL_ECOSYSTEM_MANUAL_2026-06-04.md) 결론을 운영 규칙으로 반영:
- AEM MCP / Adobe Marketing Agent MCP: 솔로 셀러 무관 → 사용 안 함 명문화(PRINCIPLES_LEARNED 1줄).
- 이미지 생성 = Firefly 웹 수동 / 가공 = Adobe MCP / 합성·연속성 = 빌더+디자인도구 — 라우팅 규칙 명문화.
- 파트너 모델(FLUX/Nano Banana 등) 최종 판매물 금지(면책 없음) — firefly-generate.ts 주석/가드에 반영.
- ★ 발견된 캐시 이슈(영구 적재 자산 cache-control: no-cache)도 이 단계에서 일괄 점검:
  upload 시 cacheControl 옵션이 무시되는지 버킷 정책 확인 → 상세페이지 로딩 속도(전환율) 개선.

---

## 단계별 실행 순서 (회귀 방지 — 누락 없이)

1. ✅ **STEP 1 = 작업 2** (hero.ts 무드배경 연결) — 완료(bf09837, 검증 통과).
2. **STEP 2 = 작업 1** (연속 캔버스화) + 1-D 미세개선 2건. hero 전환 성공 후 전역 배경 구조로 확장.
3. **STEP 3 = 작업 3** (HTML 직렬화기) — 병렬 출력 추가.
4. **STEP 4 = 작업 4** (가독성 가드 + Studio UI).
5. **STEP 5 = 작업 5** (커넥터 운영 규칙 + 캐시 점검).

### ★ 진행 규칙 (대표 승인 = STEP 2~5 끝까지 진행, 단 검증 게이트 준수)
- 각 STEP은 **독립 커밋** + tsc/build/회귀 가드 통과 후 다음 STEP.
- STEP 2는 31개 렌더러 영향 = 최고 위험. **hero 1개 전환 → Desktop 시각 검증 → 나머지 확산** 순서 엄수.
  hero 외 섹션 일괄 전환 전 Desktop 회신 1회 권장.
- STEP 3/4/5는 회귀 위험 낮음(가산식). STEP 2 구조 확정 후 연속 진행 가능.
- 각 STEP 완료 시 보고에 명시: 변경 파일 / tsc·build 결과 / 회귀 가드 / 비가역 0 / 다음 STEP.

## 검증 (각 단계 필수)
- npx tsc --noEmit 0 / npm run build OK
- ★ 회귀 가드: lifestyleAssetUrl 미전달 시 기존 PNG 바이트와 동등(P0 발행물 불변)
- 한글 sentinel grep 0건 / 코드 주석 영어
- 비가역 0: generate-detail는 register/POST/DB mutate 0 (PNG/HTML 생성만). 발행 미접촉, DRAFT 유지.
- 각 단계 commit 분리(.commit-msg.tmp + git commit -F, #17). 5 MD 핑퐁.

## 다음 (Desktop, 각 STEP 구현 후)
- STEP 2 hero 앵커링/페이드 적용 후 → Desktop가 명화 디퓨저로 재합성 시각 검증.
- 전 STEP 완료 후 → 브랜치를 main 머지 전 Desktop 최종 회귀 검증(달항아리 단색 경로 불변 확인).
- Figma STEP2(7섹션 컴포넌트)는 이 빌더 구조와 정합되게 — 빌더 연속캔버스 = Figma 도면의 코드 구현체.
