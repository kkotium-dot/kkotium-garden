# Claude Design 심층 활용 가이드 — v1 감성 유지 + 위젯 교체 반복 전략 (2026-07-10)

Authoring: DESKTOP(심층 리서치). 권위: Claude Design 직접 구동 실무 근거. 기준일 2026-07. ★research preview·UI/한도 자주 변동.

## 0. 핵심 요약
- Claude Design(claude.ai/design)=대화로 폴리시드 디자인/프로토타입 생성(2026-04-17 출시·Opus 4.7). 산출물=self-contained HTML. 프로젝트=파일(pages) 기반·여러 시안 공존(운영자 v1/v2가 이 구조).
- 이번 작업 정석: **v1(정원) 파일을 복사한 새 버전에서 "디자인 언어 보존 + negative constraint"로 위젯 영역만 교체.**

## 1. 기능 맵
- Hi-fi design(첫 렌더부터 완성 스타일)·Interactive prototype(실제 클릭/상태)·Design System(색·타이포·컴포넌트 추출 저장)·Frontend design(브랜드 없을 때 미학 방향)·Make tweakable(tweak 컨트롤 삽입)·Save as standalone HTML·Export(Canva/Figma/Claude Code handoff 등).
- 산출 medium=항상 HTML(+인라인 JSX). 프로덕션 React 아님 → 이식은 handoff 후 Code 몫.

## 2. 감성 유지 반복 3-surface (비용순)
1. **Tweaks 패널**(0토큰·모델 재호출 없음): 팔레트 토글·폰트·density·섹션 순서·variant. "슬라이더로 되면 타이핑 금지."
2. **Comment/Edit**(저비용): 캔버스 요소 클릭 → 컴포넌트 단위 수정. Edit=Simple(소규모)/Pro(section 속성) 직접 편집·"마지막 10%".
3. **Chat re-prompt**(고비용·풀 비전 패스): 구조/신규 섹션. 위젯 구성 교체는 여기.
→ 위젯 "무엇을 넣을지"=chat / 배치·밀도·색=Tweaks / 정렬·라벨=Edit.

## 3. 감성 드리프트 회피 (핵심)
- 여러 라운드 거치면 색·폰트·간격이 평균(코퍼릿 템플릿)으로 수렴 = v2 실패 원인.
- 회피: ①**토큰 잠금 후 레이아웃 세션 / 색·폰트 세션 분리** ②"이 파일의 색·폰트·컴포넌트·곡률·그림자·density를 **정확히 유지**·명시 안 된 새 색/폰트 도입 금지"(negative constraint) ③모호어(modern/clean) 대신 참조 파일+구체 수치 ④"픽셀 복제 말고 디자인 언어를 규칙으로 추출·적용".

## 4. 버전 관리
- 내장 히스토리/롤백 약함 → **큰 변경 전 "save what we have"로 스냅샷** + 파일 복사(v3). 수동 체크포인트 명명.

## 5. 프로덕션 이식(Next.js/Tailwind)
- 확정 → standalone HTML 저장 + Claude Code handoff(bundle=design.html+스크린샷+notes).
- handoff README 규칙: 기존 Tailwind 토큰/컴포넌트 재사용·hex 하드코딩 금지·plan mode로 폴더구조 먼저 확인.

## 6. 제한/버그
- **토큰 소모 큼**(25분에 주간 한도 80% 사례)·chat/Code와 한도 공유(6월~). 세션 계획 필수.
- Inline comment 간헐 소실→chat 붙여넣기. 모드 전환 조기 전송. 이미지 생성 없음(SVG/드로잉). 파일 1000줄 초과 회피.
- ★공식 자동화(Claude Design MCP `/design`)는 2026-06 기준 다수 404 보고(anthropics/claude-code #69310 등)·claude-in-chrome으로 UI 조작은 비공식·canvas 앱이라 신뢰성 위험·상태변경마다 승인.

## 7. 이번 작업 실행 전략 (권장)
- claude-in-chrome으로 v1 프로젝트 탭(1396056381) 직접 구동은 가능하나 취약 → **한 번에 명확한 chat 프롬프트 전송 → 생성 → 스크린샷 보고 → Tweaks/Comment 미세조정** 순. 큰 변경 전 스냅샷.
- 확정 시안 → standalone HTML → Code handoff(기존 토큰/컴포넌트 재사용).

## 작업 유의사항/원칙 (신규)
- **#235** AI 디자인 도구(Claude Design) 반복은 "감성 잠금(토큰 고정·negative constraint) → 위젯/레이아웃만 chat → 미세조정은 0토큰 Tweaks·저비용 Comment/Edit" 순. 큰 변경 전 스냅샷(save+파일복사). 프로덕션 이식은 handoff+기존 토큰/컴포넌트 재사용·hex 하드코딩 금지. 자동화 경로(웹UI 조작·MCP)는 불안정할 수 있으니 실패 시 정직 보고·수동 폴백.
