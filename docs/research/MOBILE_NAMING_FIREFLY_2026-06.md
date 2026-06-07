# 꽃틔움 가든 — 모바일 대응·명칭 직관화·Firefly 합성 연구 보고서

> 작성일: 2026-06-01 / 출처: Desktop 정밀 리서치 (반응형 UX + UX 라이팅 + Adobe Firefly 합성)
> 상위 문서: UIUX_INTEGRATED_DESIGN_SYSTEM / GARDEN_DESIGN_BRIEF / GARDEN_CONCEPT_ANALYSIS
> 목적: 모바일 미대응·전문용어 난해·AI 합성 그림자 어색 3대 문제 해결. P0~P2 작업 권위 참조.

## TL;DR
- **모바일 대응**: 1180px 고정 레이아웃 폐기 → Tailwind 모바일-퍼스트(기본 360-767 / md:768 / lg:1024 / xl:1280). 사이드바→하단 탭바, 3분할→탭+바텀시트, 우측 드로어→전체화면 모달, 테이블→카드 스택. 터치 타겟 44x44px.
- **명칭 직관화**: S6/L2/컨셉 30-40s/톤 friendly 같은 내부 코드 → 순한글(상세페이지 구성안 6번 / 이미지 가공 2단계 / 타깃 연령 30·40대 / 말투 다정함). 단 카테고리·콘텐츠·템플릿·SEO 등 표준 외래어는 유지.
- **Firefly 합성(최우선)**: 떠 보이는 그림자 근본원인 = 누끼를 배경에 단순히 얹기 때문. 해법 = Firefly 웹 이미지 편집/생성형 채우기에 제품을 레퍼런스로 넣고 빛 방향·색온도·접지 그림자 명시 프롬프트로 생성. 앱은 프롬프트 텍스트 + Firefly 링크 + 결과 드롭존의 "사람 1클릭" 워크플로우 제공.

## Key Findings
1. 1180px 고정 레이아웃은 2026 SaaS 백오피스 표준(적응형·콘텐츠 리플로우·유연 그리드·터치타겟·가로스크롤 금지) 위반. 1인 셀러는 매장/외출 중 폰으로 주문·재고 확인 → 모바일 미대응 치명적.
2. 사이드바→하단 탭바 전환이 최적해. 탭 3-5개(가든홈·화단·씨앗심기·온실 4개 이상적). 햄버거는 발견성 낮아 1차 내비 비권장, 보조 메뉴만.
3. 3분할 작업벤치는 모바일에서 "중앙 캔버스 주화면 + 상단 목록 칩 + 하단 바텀시트 컨트롤". Material Design 권장: 폭 따라 1→2→3 페인.
4. 우측 SEO 편집 드로어는 모바일에서 전체화면 모달. NN/g: 바텀시트는 임시 컨텍스트용이며 오래 머무는 핵심 작업엔 부적합 → 전체화면 모달이 안전.
5. 데이터 테이블은 모바일에서 카드 스택. 가로 스크롤 = 최악 패턴. 카드 헤더=썸네일+상품명, 액션=44px 아이콘, 나머지=본문/아코디언.
6. Tailwind 컨테이너 쿼리(@container)가 컴포넌트 단위 적응 핵심. CSS 컨테이너 쿼리 2025-08 'widely available', 지원율 ~90% 프로덕션 안전.
7. 명칭 직관화 핵심 = "사용자 어휘"(NN/g). 셀러가 S6/L2 모름 → 순한글. 단 카테고리·콘텐츠·템플릿·SEO는 순화 시 어색.
8. Firefly 떠 보이는 그림자 = 알려진 한계. AI는 픽셀 예측일 뿐 물리 광선 계산 안 함 → 접지 그림자/광원 방향 자주 틀림 → 전환 킬러.
9. ★[정정] Harmonize·Object Composite(제품 업로드+위치 지정 합성)는 소비자용 Firefly 웹 기능 아님 — Photoshop/엔터프라이즈 API 전용. 일반 플랜 실질 경로 = 이미지 편집(Edit)/생성형 채우기(Generative Fill)/Prompt to Edit + 레퍼런스 이미지.
10. 모델 선택: 제품 합성·IP안전=Firefly Image 5(2025-10-28 발표, 네이티브 4MP). 빠른 변형·대화형=Gemini(Nano Banana 2/Pro). 텍스트·일관성=FLUX.

## 주제 1 — 모바일 완전 대응
### 브레이크포인트 (Tailwind 기본 유지)
- 모바일 ~767(프리픽스 없음): 단일 컬럼, 하단 탭바, 카드 스택
- md:768 태블릿: 2컬럼, 사이드바 복귀 또는 아이콘 레일
- lg:1024 데스크톱: 사이드바 240-280 + 콘텐츠
- xl:1280+ 와이드: 3분할 풀. 필요시 xs:480 커스텀.
### 화면별 명세
- 대시보드: KPI grid-cols-1 sm:2 lg:4. auto-fit minmax(240px,1fr). 필터 가로스크롤 칩.
- 상품목록: 테이블→카드 스택. 헤더=썸네일+상품명, 본문=가격·재고·SEO막대, 액션 44px.
- 씨앗심기 드로어: 우측 드로어→모바일 전체화면 모달. 미리보기 상단고정, 폼 하단스크롤, 저장/닫기 하단고정바.
- 아틀리에 3분할: 데스크톱 좌·중·우 / 태블릿 좌측 접이식 레일 / 모바일 중앙캔버스 전체 + 상단 목록칩 + 하단 바텀시트(드래그 50/90% 스냅).
### 터치/폼
- 인터랙티브 최소 44x44px(WCAG 2.5.5 AAA 44, 2.5.8 AA 24). 인접 간격 8px+. 아이콘 24+패딩=44 히트영역. 가로스크롤 금지.

## 주제 2 — 명칭 직관화
### 판단 3단계
1. 순한글로 풀기: 내부코드·약어·모르는 영어 → 평이 한글.
2. 외래어 음차 유지: 표준화된 외래어(카테고리·콘텐츠·템플릿·이미지·SEO·스토어·키워드).
3. 동일기능 동일용어: 글로서리로 일관.
### 매핑 표
| 현재 | 의미 | 권장 한글 | 비고 |
|---|---|---|---|
| S6 | 상세 골격 6번 | 상세페이지 구성안 6번 | "골격" 노출 금지 |
| L2 | 처리 레벨 2 | 이미지 가공 2단계(보통) | 1·2·3단계 척도 |
| 신뢰도 | AI 확신도 | AI 추천 정확도 | 툴팁 보조설명 |
| 이미지 품질 점수 | 적합도 | 사진 품질 점수(0-100) | 척도 명시 |
| 컨셉 30-40s | 타깃 30~40대 | 타깃 연령 30·40대 | s=영문복수 한글로 |
| 톤 friendly | 어조 친근 | 말투: 다정함 | 영어형용사 한글 |
- 정확성+친근함: 정원 은유(씨앗심기·화단·온실)는 가볍게, 진단결과 등 정확성 중요한 곳은 은유 빼고 명확. 점수엔 척도+툴팁. CTA는 동사로.

## 주제 3 — Firefly 합성 (최우선)
### 두 접근 비교
- 접근1(제품 레퍼런스+새 장면 생성): 빛·그림자·원근 처음부터 일관, 떠보임 최소 / 제품 디테일 미세변형 가능. 라이프스타일·시즌 배경에.
- 접근2(기존 배경+누끼 합성): 형태·색 100% 보존, 빠름 / AI가 접지그림자·광원 자주 틀려 떠보임. 화이트배경·카탈로그에.
- 권장: 형태 보존 중요→접근2+강한 프롬프트, 분위기 연출→접근1. 1인 셀러 카탈로그는 대개 접근2.
### 소비자 Firefly 웹 실제 경로
1. 만들기→이미지 편집(Edit) 또는 생성형 채우기
2. 모델 드롭다운(Firefly Image 5 / Gemini / FLUX 등 전 모델 자유 선택)
3. 누끼/배경 업로드 → 레퍼런스 이미지로 제품 Subject 추가
4. 접지·광원·색온도 명시 프롬프트 → 생성 → 변형 선택
- 주의: 4MP는 text-to-image만, Generative Fill/Prompt to Edit는 최대 2MP + 프리미엄 모델 전용. Object Composites·Harmonize 슬라이더는 엔터프라이즈/API 전용 → 일반 셀러 UX에서 의존 금지.
### 합성 프롬프트 6요소
1. 광원 방향 "soft window light from upper left at 45°"
2. 색온도 "warm 5400K daylight"
3. 그림자 종류: 접지(contact shadow/ambient occlusion)+캐스트(cast shadow), soft/hard
4. 그림자 방향/길이
5. 접지감 "sits firmly, heavy contact shadow where it touches, no floating"
6. 반사/원근 "matched perspective at eye level, subtle reflection"
### 템플릿 (복사용)
"[제품] resting on a [표면], soft diffused window light from the upper left at 45 degrees, warm 5400K daylight, realistic contact shadow directly beneath where the product touches the surface, soft cast shadow falling gently to the lower right, matched perspective at eye level, subtle reflection on the surface, photorealistic e-commerce product photo, natural grounding, no floating."
### 떠보임 교정
- 접지 그림자 누락 → "heavy contact shadow", "ambient occlusion where object touches floor", "PBR".
- 그림자 회색 얼룩 → 광원 구체화 "directional sunlight"/"single overhead softbox".
- 그림자는 순흑 아닌 환경색 머금기 "shadow tinted with ambient surface color".
- 배경 광원 방향 먼저 읽고 제품 하이라이트 일치(불일치 시 부자연).
### 모델별 용도
- Firefly Image 5: 제품합성·사실조명·IP안전. 기본 권장.
- Gemini(Nano Banana 2/Pro): 빠른 변형·대화형. Pro는 유리/반사/복잡조명 우수.
- FLUX: 이미지 내 텍스트·일관성.
- 팁: 빠른 모델로 구도 탐색 → 최종 고품질 렌더.
### 앱 제공 3종 (사람 1클릭 HITL)
1. 자동 채운 합성 프롬프트 + "프롬프트 복사" 버튼.
2. "Firefly에서 만들기" 링크(firefly.adobe.com/generate/image?view=edit 새 탭).
3. 결과 업로드 드롭존 + 진행상태 + 검수 승인 게이트("이 결과로 등록"/"다시").
- 단계 진행바(프롬프트복사→생성→업로드→검수)로 길 안 잃게.

## 우선순위 권고
- P0(사용성 회복): viewport 메타 + 1180 고정 해제(가로스크롤 0), 사이드바→하단 탭바(가든홈·화단·씨앗심기·온실), 상품목록→카드 스택, 터치 44px.
- P1(핵심 화면): 아틀리에 3분할→모바일 캔버스+탭+바텀시트, SEO 드로어→전체화면 모달, 명칭 매핑+용어집.
- P2(합성 품질): 프롬프트 빌더+복사+Firefly 링크+드롭존 HITL, 프롬프트 템플릿 라이브러리, 검수 승인 게이트.

## 변경 임계치
- 모바일 트래픽 의미있게 잡히면 P0 최우선.
- Firefly가 Object Composite/Harmonize 일반플랜 개방 시 접근2 자동화 재검토.
- 셀러 문의가 특정 명칭("S6가 뭐예요?")에 집중되면 해당 라벨 우선 치환.

## Caveats
- ★Harmonize·Object Composite는 Photoshop/엔터프라이즈 API 전용(소비자 웹 아님). 일반 플랜 = 편집/생성형 채우기/Prompt to Edit(프리미엄 모델·최대 2MP). 앱 설계 전제.
- 프롬프트 예시는 Adobe 공식 아닌 실무 벤더 사례 → 셀러 환경 검증 필요.
- 모델 라인업·플랜 정책 빠르게 변동 → 출시·가격 재확인.
- 반응형 수치는 권장 기본값 → 콘텐츠 밀도(특히 3분할 캔버스) 실측 조정.
- ★Gemini: API 키 커밋 노출 사고로 자체 API revoke 상태이나 모델 금지 아님 — 키 보안 해결 시 재사용. Firefly 웹 UI 모델 선택은 키와 무관, 전 모델 자유 사용.
