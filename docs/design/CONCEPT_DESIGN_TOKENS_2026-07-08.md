# Claude Design 컨셉 — 디자인 토큰 + 리서치 대조 배선 (2026-07-08)

Authoring: DESKTOP. 출처: Claude Code가 전달한 컨셉(project/Kkottium Garden Dashboard.html·theme.jsx·branch implement-kkottium-garden 로컬커밋 34f5eed·클라우드 전용·origin push 불가). 권위: 대시보드 Phase 2(시각) 미감 배선 근거 + DASHBOARD_SHELL_REDESIGN_RESEARCH 대조.

================================================================
## 0. 대조 핵심 결론
================================================================
- 컨셉 팔레트가 이미 **브랜드색(--pop 핫핑크/코랄) ↔ 시맨틱 초록(--sage) 분리**를 지킴 = 리서치 #218 충족. → **팔레트 그대로 채택.**
- 조율 필요 = **장식 강도만**(뉴브루탈 하드섀도·와시테이프·회전·분수대 애니). 기본 차분(#217).
- 작업영역(테이블·폼·To-do)은 완화, 히어로·매출위젯·빈상태만 풀 브랜드 미감.

================================================================
## 1. 팔레트 4종 (CSS 변수·전체 HEX)
================================================================
### 정원의 만개 Garden Bloom [기본]
--cream:#FFF1E4 --cream-2:#FCE6D2 --ink:#2A1F1A --ink-soft:#4A3A30
--pop:#E8385A --pop-soft:#FF6B8A --pink:#FFB8C8 --pink-2:#FFD9DE
--sage:#2D5F4E --sage-soft:#6FA88F --butter:#FFD93D --lilac:#C8B6FF --sky:#BFE0E8 --terra:#C25A3F
### 노을 정원 Sunset Pop
--cream:#FFF6EC --cream-2:#FFE9D2 --ink:#3A1F1A --ink-soft:#5C3A2C
--pop:#F25C3D --pop-soft:#FF8E6E --pink:#FFC4A0 --pink-2:#FFE0CB
--sage:#3D5A40 --sage-soft:#88AA85 --butter:#FFCC2A --lilac:#E1B0FF --sky:#CFE6E0 --terra:#B84A2A
### 라벤더 필드 Lavender Field
--cream:#FFF6F2 --cream-2:#F5E6F0 --ink:#2B1F3A --ink-soft:#4A3A5C
--pop:#D04E89 --pop-soft:#E68AB1 --pink:#E2C7E8 --pink-2:#F0DEEE
--sage:#3D5A50 --sage-soft:#88B0A0 --butter:#F4D06F --lilac:#B095E0 --sky:#C7DCE6 --terra:#A85B7C
### 딸기 크림 Strawberry Cream
--cream:#FFEEE6 --cream-2:#FFD9C7 --ink:#2A1A22 --ink-soft:#4A2D38
--pop:#D02642 --pop-soft:#F26882 --pink:#FFA9BA --pink-2:#FFCBD3
--sage:#1F3D2E --sage-soft:#5C8A6E --butter:#FFCD3C --lilac:#D6BCFF --sky:#BBE2D8 --terra:#9C3725
### 고정
--shadow: rgba(42,31,26,0.12)
- 전환: document.documentElement.style.setProperty(--var,hex)로 14변수 교체 → 전 UI 리테마(컴포넌트는 var(--…) 참조).
- ★시맨틱 매핑: 성공=--sage, 경고=--butter/--terra, 위험=--pop 계열 아님(위험은 별도 빨강 or --terra). 브랜드 강조=--pop.

================================================================
## 2. 폰트
================================================================
--font-display: Caprasimo, "Black Han Sans", serif (제목/숫자)
--font-display-alt: "Bagel Fat One", "Black Han Sans" (강조 숫자·주문번호)
--font-body: "Gowun Dodum", "Bricolage Grotesque", system-ui (본문·가독)
--font-serif: "Instrument Serif", "Gowun Batang" (이탤릭 캡션)
--font-script: Caveat, Gaegu (손글씨 키커·꼬띠 대사)
- 본문 14px/1.45 · 전역 word-break:keep-all.
- ★리서치 조율: 디스플레이 폰트는 제목/KPI 숫자만·본문은 Gowun Dodum(가독 우선).

================================================================
## 3. 핵심 컴포넌트 스타일 (원본)
================================================================
- .card: bg --cream · border 1.5px --ink · radius 22px · shadow 4px 4px 0 --ink · pad 18px. (.soft=3px 3px 0 --ink-soft)
- .washi(와시테이프): --butter bg · --font-script · rotate(-3deg) · top -10.
- .sticker(필): --butter bg · 대문자 · 1.5px --ink · rotate(-2deg) · radius 999.
- .btn(청키): --ink bg · shadow 3px 3px 0 --ink · hover translate(-1,-1)/4px · active translate(2,2)/1px. 변형 .pop .cream .pink .butter .sage.
- .bubble(말풍선): 45도 꼬리. .stamp-frame: 물결 마스크(radial-gradient mask).
- 분수대(fountain.jsx·순수 SVG): 360x380 · 튤립캡→볼→기둥→세이지 basin · 목표링 circle r160 dasharray goalRatio*1005 · 물줄기 5갈래(--sky·매출>어제=1.6s/7방울, <=2.6s/4방울) · 중앙 ₩매출 오버레이+어제대비 배지(up=--sage·down=--terra).

================================================================
## 4. 레이아웃 그리드 (원본)
================================================================
- .app: grid 232px minmax(0,1fr) · min-width 1180px · bg radial-gradient(핑크/세이지)+cream.
- 대시보드 세로스택 gap 16px: 마퀴배너(풀폭) / 상단 1.4fr 1fr(분수대 정원 / 날씨+월간목표) / 중단 1.5fr 1fr 1fr(화단·벌통·버섯밭) / 하단 1fr 1fr 1fr(온실·우편함·좀비소) / 배송(풀폭 dog-trot) / 최하단 1fr 1fr(to-do·주문).
- PageHeader: 손글씨 키커(script 22px)+대형 제목(display 44px)+스티커.
- 키프레임: float-up·wiggle·spin-slow·bee-fly·cloud-drift·marquee·pageIn.

================================================================
## 5. 리서치 대조 배선 방침 (Phase 2 적용)
================================================================
| 컨셉 요소 | 채택도 | 배선 |
|---|---|---|
| 팔레트 4종 | ★풀 채택 | 토큰 그대로·시맨틱 분리 유지 |
| 폰트 | 부분 | 제목/KPI만 디스플레이·본문 Gowun Dodum |
| 뉴브루탈 카드(하드섀도) | 조율 | 작업영역 완화(옅은 보더/그림자)·히어로/빈상태만 풀 |
| 와시테이프·스티커·회전 | 토글 | 장식강도: 차분=off·중간/맥시멀=on |
| 분수대 애니 | 조율 | 매출영역만·기본 저속or정지·prefers-reduced-motion |
| 배경 radial-gradient | 부분 | 아주 옅게·집중 저해 시 차분에서 완화 |
| 마퀴·dog-trot 애니 | 토글 | 차분=정지 |

★대원칙(#216/217/218): 팔레트·폰트·카드 미감은 Phase 2에서 배선하되, **구조는 Phase 1(IA·완료)** 위에 얹고, **장식·모션은 Phase 3 토글(기본 차분)**. 컨셉을 mock 그대로 이식하지 않고 실앱 구조에 미감만 배선.

================================================================
## 작업 유의사항/원칙
================================================================
- **#219** 외부 디자인 컨셉 적용 시 = 팔레트/토큰(재사용 가능·저위험)은 풀 채택, 장식/모션(집중 저해)은 토글·기본 차분, 구조는 리서치 우선(컨셉 레이아웃 맹종 금지). 컨셉이 브랜드↔시맨틱색을 이미 분리했으면 그대로 활용.
