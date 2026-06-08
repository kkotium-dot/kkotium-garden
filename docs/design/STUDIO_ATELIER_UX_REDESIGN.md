# 온실 아틀리에(/studio) UI/UX 재설계 스펙 (2026-06-08)

> 권위 스펙. 트리거: 우측 썸네일 패널 UI 깨짐(텍스트 잘림·배지 겹침·레드 과용) 대표 지적 + 스크린샷.
> 디자인 SoT: docs/design/KKOTIUM_DESIGN_SYSTEM.md (레드 #E62310 10% / 핑크 #FFCCEA 15% / 뉴트럴 75%, Pretendard, Lucide, 8배수 간격, 카드 r16, 그림자 0 4px 20px rgba(0,0,0,0.06)).
> 구현 = Code(#41). QA = Desktop이 Control Chrome execute_javascript로 라이브 DOM 측정 가능(studio 탭 1396049659 접근 OK; Claude-in-Chrome이 차단한 건 네이버 셀러센터 탭이었음). 스크린샷은 대표 육안 병행.
> 라이브 실증 근본원인(2026-06-08): AI 큐 스텝 카드가 4열 강제 -> 너비 54px로 짓눌려 scrollWidth>clientWidth(overflow=true). 상태칩(.gp-sticker 38px)이 좁은 카드와 충돌.
> 대상 컴포넌트: src/components/studio/ThumbnailCard.tsx + workbench/{AiQueueStepper, FireflyPromptBuilder, AssetDropZone, WorkbenchShell, WorkbenchCanvas, WorkbenchTabs}.

## 1. 진단 (현행 문제)
- (P1) AiQueueStepper 4단 가로 카드: 폭 부족으로 제목 잘림 + 완료/진행/대기 상태 배지가 제목과 겹침. 가장 깨져 보이는 지점.
- (P2) 이중 박스 중첩(소스 오버라이드 박스 안에 AI 큐 박스) + 보더 3종 혼재(레드 실선·그린 실선·그레이 점선) = 시각 소음.
- (P3) 레드 과용(진행 카드 레드 보더 + 1~6 번호원 레드 + 섹션 제목 레드) → 75/15/10 위반(레드는 CTA 10% 전용).
- (P4) "2" 원형 배지가 제목과 분리되어 부유.
- (P5) 합성 프롬프트 박스: 한글 상품명 + 영문 프롬프트 혼재·소형·답답.
- (P6) 정보구조 혼란: 1차(4변형 1클릭 메인 선택)과 2차(소스 오버라이드/AI 생성)이 시각적으로 동급 경쟁.

## 2. 정보구조 재정렬
- 1차(항상 노출): 썸네일 4변형 갤러리 + 1클릭 "메인 지정". 패널 최상단·최대 강조.
- 2차(Disclosure, 기본 접힘): "디자이너 소스 오버라이드" → 펼치면 [AI 생성 큐 → 드롭존 → Firefly 합성 프롬프트] 수직 단일 흐름. 평소 접혀 1차를 방해하지 않음.
- 중첩 박스 제거: 단일 섹션 + subtle divider. 한 방향 수직선.

## 3. 컴포넌트 규격 (토큰 정합)
- 카드: 화이트 + 보더 1px #E5E5E5 + radius 16 + 그림자 0 4px 20px rgba(0,0,0,0.06). 보더색 통일. 상태는 보더색이 아니라 좌측 4px 액센트 바 + 작은 칩으로 표현.
- AI 생성 큐: 가로 4열 강제 폐기 → 세로 스텝 리스트. 각 스텝 = [상태 아이콘 Lucide: CheckCircle 완료·Loader 진행·Circle 대기] + [제목(굵게, 잘림 0, 줄바꿈 허용)] + [1줄 설명 #6B6B6B]. 상태 칩은 제목과 별도 영역(겹침 0). 진행=핑크 액센트, 완료=그린 체크(시맨틱), 대기=뉴트럴.
- 번호원(프롬프트 6요소): 레드 → 핑크 #FFCCEA 배경 + #1A1A1A 텍스트(또는 뉴트럴). 레드 제거.
- 섹션 헤더: 핑크 배지 라벨("STEP 2") + 제목(Pretendard SemiBold 22~26) + 1줄 서브카피. 부유 "2" 배지를 헤더 라벨로 통합.
- 합성 프롬프트: 라벨/값 분리, 본문 16px, 영문 프롬프트만 모노폭. 복사 버튼(Lucide Copy).
- 간격: 섹션 24~40, 요소 16. 터치 타겟 48px. 레드는 "메인 지정" CTA 1곳에만.

## 4. 수용 기준 (Code 완료 판정)
- 큐 스텝 제목 잘림 0 · 배지 겹침 0 (우측 패널 폭 축소 시에도).
- 레드 사용 = 메인 지정 CTA 1곳(번호원·상태·헤더에서 레드 제거).
- 1차(4변형) 시각 우선 · 2차(오버라이드) 기본 접힘.
- tsc 0 / build OK / 이모지 0(Lucide) / 한글 코드 리터럴 0(고객노출 문구는 studio-strings.ko.json) / 반응형 깨짐 0.
- 모든 색·간격·radius = KKOTIUM_DESIGN_SYSTEM 토큰.

## 5. 적용 범위(2단계)
- 1단계(이번): 우측 워크벤치 패널(ThumbnailCard + workbench/*) — P1~P6 해소.
- 2단계(후속): /studio 전체(ProductListPane·ActionsCard·DetailPageCard·DiagnosisCard)를 동일 토큰·섹션헤더·카드 규격으로 정렬.
