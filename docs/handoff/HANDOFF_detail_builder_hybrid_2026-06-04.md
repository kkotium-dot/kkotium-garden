# HANDOFF — 씨앗심기 상세페이지 빌더 하이브리드 대수술 (통합 설계도)

> 작성: 2026-06-04 (Desktop) | Target Session: code-cli | Branch: feature/detail-builder-hybrid
> baseline: production HEAD a585635 / 브랜치 HEAD 9c31052 (STEP 2-확산 표본 완료)
> 권위 문서: 본 설계도 + docs/research/TOOL_ECOSYSTEM_MANUAL_2026-06-04.md + 실측 코드
> 성격: 대수술(렌더 엔진 + 출력단 + UI). 단계 분할 필수. 비가역 0(발행 미접촉 유지).
> ★ 대원칙: P0(달항아리·명화 디퓨저 발행)을 망치지 않는다. 기존 PNG 경로는 회귀 없이 보존하고, 개선은 가산식으로.

---

## 0. 배경 — 왜 이 수술이 필요한가 (대표 확정)

현 빌더(section-builder.ts)는 섹션별 PNG를 stackVertically로 세로 적층 → "조각 모음" 이질감.
가독성·실용성 저하의 근본 원인. 개선 = (1) 연속 캔버스화 (2) 무드배경 합성 (3) 하이브리드 출력
(이미지 OR HTML) (4) 정보 섹션 가독성 가드 (5) 커넥터 운영 규칙 코드화.
빌더 정체성(대표 확정): 하이브리드 — 이미지 주소 업로드/대량등록 + 스마트에디터 HTML 양방향.

---

## 진행 현황 (2026-06-04)

- ✅ STEP 1 (hero 무드배경 합성): bf09837. 검증 통과.
- ✅ STEP 2-foundation (composeContinuous + sectionRole 인프라): 4ef6102.
- ✅ STEP 2-확산 표본 (hero 테이블 앵커링 근본수정 + spec 불투명 유지): 9c31052.
  - 앵커링: 본품 base를 tableLineY(min(0.52h, panelTop-50))에 안착. Desktop 실물 검증 통과
    (디퓨저가 테이블에 놓임, 패널 간격 126px 안전). 단색 경로 회귀 0.
  - sectionRole(emotional/informational) 메타 도입 완료.
- ⏸ STEP 2-확산 (2)나머지 + STEP 3/4/5: 본 문서 하단 지시대로.

---

## ★ STEP 2-확산 (2) — 나머지 렌더러 차등 전환 (Desktop 코드 분류 확정)

### 분류표 (실제 렌더러 콘텐츠 기준 — 의심 시 informational 안전측)
**emotional (무드 배경 노출 + 가독성 가드):**
  hero(완료) / usage(★이미 lifestyleAssetUrl+비네팅 처리됨 — 패턴 참조) / seasonalHook / story
  (에디토리얼 문단+서명컷) / styledShot(라이프스타일 3컷) / problem / solution / philosophy

**informational (기존 불투명 유지 — 가독성 사수, 무드 비침 금지):**
  spec(완료) / specTable / specifications / cta / shipping / warranty / comparison / clinical /
  corePerformance / technology / benefits / options / optionIntro / eventDetails / reviews / package /
  product / detail / material(질감 매크로 — 정보측)

### 전환 규칙
- emotional: 무드 모드(ctx.lifestyleAssetUrl 존재)서 createCanvas 불투명 → 무드 배경 노출 구조로.
  usage.ts의 검증된 패턴(fitImage 배경 + applyBottomVignette 가독성) 재사용. 텍스트 대비 반드시 확보.
- informational: **변경 없음**(현행 불투명이 곧 정보 처리). 손대지 말 것 = 가독성 사수 + 회귀 0.
- ★ 회귀 가드: 모든 전환은 무드 모드에서만. no-lifestyle 단색 경로 = 전 렌더러 createCanvas(size,bg)
  그대로 → 달항아리 등 발행물 바이트 불변. 매 그룹 커밋마다 확인.

### 접지 그림자 (대표 승인 — emotional 공통 옵션)
- 본품 누끼가 테이블에 "스티커처럼 붙은" 느낌 해소용. 누끼 base 아래에 옅은 타원 drop-shadow 1겹
  (예: 반투명 검정 타원 blur). hero부터 적용, emotional 공통 헬퍼로 추출 권장.
- ★ 발행 차단 아님(미세 사실감). 단색 경로 미적용(회귀 0). 과하지 않게(opacity~0.18, blur).

### 진행 순서
- emotional 그룹 먼저 전환(usage 패턴 확장 + 접지그림자) → tsc/build → 그룹 커밋.
- informational은 무변경 확인만(혹시 무드 비침 생기면 차단). → 그룹 커밋.
- 각 커밋 회귀 가드(no-lifestyle 불변).

---

## STEP 3 — HTML 출력 경로 신설 (하이브리드 절반) [가산식·저위험]
- detail-html-serializer.ts 신설: buildDetailPage의 섹션 메타+copy+role을 의미적 HTML 블록
  (h2/p/img/table)으로. 네이버 860px 폭 인라인 스타일, 모바일 텍스트 1.5x, 이미지 블록은
  Supabase 영구 URL을 img src로(이미지 주소 업로드/대량등록 호환).
- generate-detail 응답에 detailHtml 필드 **추가**(detailBase64 보존). 출력 선택은 호출 측 결정.
- copy의 #46 grounding 동일 적용(직렬화기는 copy 변형 금지, 마크업만). 기존 PNG 소비자 회귀 0.

## STEP 4 — 정보 섹션 가독성 가드 정교화 + Studio UI [가산식]
- 렌더 측: sectionRole 차등 정교화(정보 섹션 대비 확보, 패널 페이드 일관 적용).
- Studio UI(DetailPageCard.tsx): (a) 이미지/HTML 출력 토글 (b) lifestyleAssetUrl(무드배경) 입력/선택
  (c) 미리보기를 "연속 페이지"로 인지되게 개선. UI 초안은 Claude Design → Figma 정밀화(매뉴얼 §1).

## STEP 5 — 매뉴얼 기반 커넥터 운영 규칙 + 캐시 점검 [독립]
- PRINCIPLES_LEARNED 명문화: AEM/Marketing Agent MCP 미사용 / 생성=Firefly수동·가공=AdobeMCP·합성=빌더
  라우팅 / 파트너 모델 최종판매물 금지(면책 없음, firefly-generate 주석 반영).
- ★ 캐시 이슈: 영구 적재 자산 cache-control: no-cache 확인됨 → upload cacheControl 무시 여부/버킷
  정책 점검 → 상세페이지 로딩 속도(전환율) 개선.

---

## 검증 (각 STEP/그룹 필수)
- npx tsc --noEmit 0 / npm run build OK
- ★ 회귀 가드: lifestyleAssetUrl 미전달 시 기존 PNG 동등(P0 발행물 불변) — 매 커밋 확인
- 한글 sentinel grep 0건 / 코드 주석 영어
- 비가역 0: generate-detail는 register/POST/DB mutate 0 (PNG/HTML 생성만). 발행 미접촉, DRAFT 유지.
- STEP/그룹별 commit 분리(.commit-msg.tmp + git commit -F, #17). 5 MD 핑퐁.

## 회신 게이트 (Desktop 검증)
- STEP 2-확산 (2) emotional 그룹 전환 후 → Desktop 시각 검증(명화 디퓨저 재합성: 감성 섹션 무드 노출 +
  접지 그림자 + 정보 섹션 가독성 + 단색 회귀 0).
- 전 STEP 완료 후 → main 머지 전 Desktop 최종 회귀 검증(달항아리 단색 경로 불변).

## 다음 (Desktop)
- STEP 2-확산 (2) 후 명화 디퓨저 재합성 시각 검증.
- 전 STEP 완료 → main 머지 전 최종 회귀 검증 → 머지 → P0 발행 재개.
- Figma STEP2(7섹션 컴포넌트)는 이 빌더 구조와 정합 — 빌더 연속캔버스 = Figma 도면의 코드 구현체.
