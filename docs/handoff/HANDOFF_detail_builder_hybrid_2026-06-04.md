# HANDOFF — 씨앗심기 상세페이지 빌더 하이브리드 대수술 (통합 설계도)

> 작성: 2026-06-04 (Desktop) | Target Session: code-cli | Branch: feature/detail-builder-hybrid
> baseline: production HEAD a585635 / 브랜치 HEAD 4ef6102 (STEP 2 foundation 완료)
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

## 진행 현황 (2026-06-04)

- ✅ STEP 1 (작업2, hero 무드배경 합성): 브랜치 bf09837, 코드+실물 검증 통과.
- ✅ STEP 2-foundation (작업1, composeContinuous + hero 1-D): 브랜치 4ef6102, 검증 통과.
  - section-builder: composeContinuous 신설 + buildDetailPage 배선. no-lifestyle = stackVertically 동일.
  - hero 1-D 개선2(패널 페이드): 실물 양호.
  - ★ hero 1-D 개선1(바닥 앵커링): 코드는 정확하나 **명화 누끼(253×776 세로형)가 fit박스를 꽉 채워
    이동 여백 0 → 시각 효과 없음**. 본품 여전히 공중부양 느낌. → 아래 STEP 2-확산에서 근본 해결.
- ⏸ STEP 2-확산 (30개 렌더러) + STEP 3/4/5: 본 문서 하단 지시대로 진행.

---

## ★★ STEP 2-확산 — "섹션 역할별 차등 투명화" (최고 위험, 정밀 설계 필수) ★★

### 배경 — 단순 전체 투명화는 금지 (Desktop 표본 검수 결과)
전 렌더러는 동일 패턴: `const bg = resolveBgColor(...)` → `createCanvas(size, bg)`로 **불투명 단색 전체
배경**을 깔고 그 위에 콘텐츠 합성. composeContinuous의 전역 무드bg는 이 불투명 배경에 100% 가려짐.

★ 함정: spec.ts는 zebra 행에서 홀수 행을 #FFFFFF로 칠함. cta.ts는 흰색 카드. 이들을 "전체 투명화"하면
정보 텍스트가 무드 배경 사진과 겹쳐 **가독성 붕괴**(스펙·배송·AS 안 읽힘) → 전환율 하락. 절대 금지.

### 설계 — sectionRole 기반 차등 처리
1. **sectionRole 분류 도입** (section-builder 또는 skeleton 메타):
   - emotional: hero, seasonalHook, story, philosophy, styledShot, problem, solution
   - informational: spec, specTable, specifications, cta, shipping, warranty, comparison, clinical,
     benefits, corePerformance, technology, options, optionIntro, package, reviews, eventDetails, detail,
     material, usage, product
   (정확한 분류는 각 렌더러 콘텐츠 성격으로 Code가 최종 판단 — 의심되면 informational(안전측)로.)
2. **차등 투명화 규칙**:
   - emotional 섹션: `createCanvas` 투명(alpha 0) 전환 → 전역 무드bg 풀 노출. (단 텍스트 가독성 가드 유지)
   - informational 섹션: **기존 불투명 배경 유지**(가독성 사수). 단, 무드 모드에서 단색 대신 무드bg에서
     추출한 연한 톤(또는 반투명 카드)로 "톤만 통일" — 텍스트 대비는 반드시 확보.
   - 중간(usage/material): 반투명 카드(톤 비침 + 가독성 균형) 선택적.
3. **회귀 가드(P0)**: 위 전환은 **무드 모드(lifestyleAssetUrl 존재)에서만**. no-lifestyle 단색 경로는
   전 렌더러 `createCanvas(size, bg)` 그대로 → 달항아리 등 기존 발행물 바이트 불변. usedLifestyle류
   플래그를 ctx로 렌더러에 전달하거나, 렌더러가 ctx.lifestyleAssetUrl 유무로 분기.
4. **본품 앵커링 근본 해결(개선1 재처리)**: hero 무드 모드에서 누끼가 세로로 길어 바닥정렬 무효 →
   본품 배치 자체를 캔버스 상단(y=40)이 아니라 **배경 테이블면(약 y=size.height*0.50~0.55)** 기준으로
   내려 배치. 텍스트 패널과의 50px 안전간격은 재계산해 유지(겹침 금지). 단색 경로 무변경.

### 확산 진행 순서 (회귀 방지)
- (1) emotional 1개(이미 hero) + informational 1개(예: spec) 먼저 전환 → tsc/build → **Desktop 시각 검증**.
- (2) 통과 후 나머지 렌더러 그룹별 확산. 한 커밋에 몰지 말고 그룹 단위 커밋 권장.
- (3) 매 커밋 회귀 가드: no-lifestyle 출력 불변 확인.

---

## STEP 3 — HTML 출력 경로 신설 (하이브리드 절반) [가산식·저위험]
- detail-html-serializer.ts 신설: buildDetailPage의 섹션 메타+copy를 의미적 HTML 블록(h2/p/img/table)으로.
  네이버 860px 폭 인라인 스타일, 모바일 텍스트 1.5x, 이미지 블록은 Supabase 영구 URL을 img src로.
- generate-detail 응답에 detailHtml 필드 **추가**(detailBase64 보존). 출력 선택은 호출 측 결정.
- copy의 #46 grounding 동일 적용(직렬화기는 copy 변형 금지, 마크업만). 기존 PNG 소비자 회귀 0.

## STEP 4 — 정보 섹션 가독성 가드 + Studio UI [가산식]
- 렌더 측: STEP 2-확산의 sectionRole 차등을 정교화(정보 섹션 대비 확보, 패널 페이드 일관 적용).
- Studio UI(DetailPageCard.tsx): (a) 이미지/HTML 출력 토글 (b) lifestyleAssetUrl(무드배경) 입력/선택
  (c) 미리보기를 "연속 페이지"로 인지되게 개선. UI 초안은 Claude Design → Figma 정밀화(매뉴얼 §1).

## STEP 5 — 매뉴얼 기반 커넥터 운영 규칙 + 캐시 점검 [독립]
- PRINCIPLES_LEARNED 명문화: AEM/Marketing Agent MCP 미사용 / 생성=Firefly수동·가공=AdobeMCP·합성=빌더 라우팅 /
  파트너 모델 최종판매물 금지(면책 없음, firefly-generate 주석 반영).
- ★ 캐시 이슈: 영구 적재 자산 cache-control: no-cache 확인됨 → upload cacheControl 무시 여부/버킷 정책
  점검, 상세페이지 로딩 속도(전환율) 개선.

---

## 검증 (각 STEP 필수)
- npx tsc --noEmit 0 / npm run build OK
- ★ 회귀 가드: lifestyleAssetUrl 미전달 시 기존 PNG 동등(P0 발행물 불변) — 매 커밋 확인
- 한글 sentinel grep 0건 / 코드 주석 영어
- 비가역 0: generate-detail는 register/POST/DB mutate 0 (PNG/HTML 생성만). 발행 미접촉, DRAFT 유지.
- STEP/그룹별 commit 분리(.commit-msg.tmp + git commit -F, #17). 5 MD 핑퐁.

## 회신 게이트 (Desktop 검증)
- STEP 2-확산 (1)단계(emotional+informational 표본 전환) 후 → Desktop 시각 검증(명화 디퓨저 재합성:
  본품 테이블 앵커링 + 정보 섹션 가독성 + 단색 회귀 0).
- 전 STEP 완료 후 → main 머지 전 Desktop 최종 회귀 검증(달항아리 단색 경로 불변).

## 다음 (Desktop)
- STEP 2-확산 표본 전환 후 명화 디퓨저 재합성 시각 검증.
- Figma STEP2(7섹션 컴포넌트)는 이 빌더 구조와 정합 — 빌더 연속캔버스 = Figma 도면의 코드 구현체.
