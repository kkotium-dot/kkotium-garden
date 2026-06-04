# HANDOFF — 씨앗심기 상세페이지 빌더 하이브리드 대수술 (통합 설계도)

> 작성: 2026-06-04 (Desktop) | Target Session: code-cli | Branch: feature/detail-builder-hybrid
> baseline: production HEAD a585635 / 브랜치 HEAD 60c5408 (STEP 2-확산 emotional 그룹 완료)
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
- ✅ STEP 2-확산 표본 (hero 테이블 앵커링 + spec 불투명): 9c31052. 실물 검증 통과.
- ✅ STEP 2-확산 emotional 그룹 (emotional-bg 헬퍼 + 6개 1줄 스왑 + 접지그림자): 60c5408.
  - Desktop 실물 검증: 스크림 0.62는 무드 과소(연한 배경화) → 0.40이 가독성 유지하며 무드 회복 확인.
  - 대표 확정: **MOOD_SCRIM_ALPHA 0.62 → 0.40**.
- ⏸ 스크림 조정 + STEP 3/4/5: 본 문서 하단 지시대로.

---

## ★ STEP 2-확산 마감 — 스크림 값 조정 + 다크 배경 안전장치

### 2-1. 스크림 기본값 하향 (대표 확정)
- emotional-bg.ts `MOOD_SCRIM_ALPHA = 0.62` → **0.40**. 1줄.
- 근거: 명화(밝은 햇살) 배경에서 0.62는 무드가 거의 소실(연한 베이지화). 0.40에서 세이지 헤드라인·흰
  카드 본문 모두 가독 유지하며 무드 회복(Desktop 실물 비교 검증).

### 2-2. ★ 다크 배경 안전장치 (선제 위험 차단 — 중요)
- 0.40은 **밝은 무드 배경 기준**이다. 향후 어두운 무드 배경(예: 야간/딥톤 컨셉)을 쓰는 상품은 흰 스크림
  0.40으로는 dark-on-light 텍스트 대비가 깨질 수 있다(검은 글씨가 어두운 배경 위에 �뜸).
- 해결(택1, Code 판단 — 간단한 쪽 우선):
  (a) **적응형 스크림**: cover 버퍼의 평균 밝기를 sharp stats로 측정 → 밝으면 0.40, 어두우면 0.55~0.62로
      자동 상향(밝기 임계 1개). 가장 견고.
  (b) 차선: emotional 섹션은 흰 스크림 대신 **하단 그라데이션 스크림**(텍스트 영역만 흰 wash)로 — 단,
      problem/philosophy는 텍스트가 상·중단이라 (a)가 안전.
- ★ 본 안전장치는 무드 모드에서만. no-lifestyle 단색 경로 불변(회귀 0).
- 적용 시점: 지금(2-1과 함께) 또는 STEP 4 가독성 정교화. 단 **명화 발행 전 어두운 배경 상품을 쓸 일이
  없으면** STEP 4로 미뤄도 무방(현재 P0는 밝은 배경) — Code가 일정 보고 시 명시.

### 2-3. 검증
- 스크림 변경 후 tsc/build, 명화 재합성은 Desktop이 검증(0.40 적정 확인).
- 단색 경로 회귀 0 재확인.

---

## STEP 3 — HTML 출력 경로 신설 (하이브리드 절반) [가산식·저위험]
- detail-html-serializer.ts 신설: buildDetailPage의 섹션 메타+copy+role을 의미적 HTML 블록
  (h2/p/img/table)으로. 네이버 860px 폭 인라인 스타일, 모바일 텍스트 1.5x, 이미지 블록은
  Supabase 영구 URL을 img src로(이미지 주소 업로드/대량등록 호환).
- generate-detail 응답에 detailHtml 필드 **추가**(detailBase64 보존). 출력 선택은 호출 측 결정.
- copy의 #46 grounding 동일 적용(직렬화기는 copy 변형 금지, 마크업만). 기존 PNG 소비자 회귀 0.
- ★ HTML 경로의 이미지: emotional 무드 배경/접지그림자는 PNG 합성 산물이라 HTML에선 재현 불가 →
  HTML 모드는 "정보 전달 우선"(텍스트+제품 이미지 블록), 무드 비주얼은 이미지(PNG) 모드 강점으로 분리.
  이 분담을 직렬화기 주석에 명시(하이브리드 철학: 감성=이미지, 호환=HTML).

## STEP 4 — 정보 섹션 가독성 가드 정교화 + Studio UI [가산식]
- 렌더 측: sectionRole 차등 정교화 + (미뤘다면) 2-2 적응형 스크림 여기서.
- Studio UI(DetailPageCard.tsx): (a) 이미지/HTML 출력 토글 (b) lifestyleAssetUrl(무드배경) 입력/선택
  (c) 미리보기를 "연속 페이지"로 인지되게 개선. UI 초안 Claude Design → Figma 정밀화(매뉴얼 §1).

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
- 스크림 0.40 적용 후 → Desktop 명화 재합성 최종 확인(이번 turn에서 Desktop가 0.40 검증 완료 시 생략 가능).
- STEP 3~5는 가산식·저위험 → 연속 진행 가능. 전 STEP 완료 후 → main 머지 전 Desktop 최종 회귀 검증.

## 다음 (Desktop)
- 전 STEP 완료 → main 머지 전 최종 회귀 검증(달항아리 단색 불변) → 머지 → P0 발행 재개.
- Figma STEP2(7섹션 컴포넌트)는 이 빌더 구조와 정합 — 빌더 연속캔버스 = Figma 도면의 코드 구현체.
