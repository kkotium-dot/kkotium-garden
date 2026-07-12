# 정원 대시보드 v4 빌드업 시안 — 생성 완료·운영자 export 대기 (2026-07-10)

Authoring: DESKTOP(claude-in-chrome 직접 구동). 권위: GARDEN_DASHBOARD_BUILDUP_PRINCIPLE(#237) + CLAUDE_DESIGN_USAGE_GUIDE. 원칙 #236/#237. 상태: **v4 생성 성공·Desktop 시각검증 불가(캔버스 캡처 미반환)·운영자 export/스샷 대기.**

## 진행 실측
- v3(운영자 PDF로 확인·방향 OK) → Desktop이 claude-in-chrome으로 빌드업 프롬프트 전송(#237 §2 완성도 향상 6항목·감성/기능 유지·negative constraint) → **새 파일 `Kkottium Garden Dashboard v4.html` 생성**(URL 확인·완료 ✓·Verifier 통과). v1·v3 원본 보존.
- ★한계(정직·#236): v4 스크린샷/zoom 모두 Desktop에 [image] 미반환(디자인 캔버스 캡처가 자동화로 안 넘어옴). Desktop이 v4를 직접 못 봄 → 묘사 안 함(#82).

## 전송한 빌드업 프롬프트 (기록)
"v3 딛고 v4로 빌드업(v3 보존). 정원 컨셉·분수대·화단·온실/우체통/망루·꼬띠·손그림·스캘롭·빨강+핑크+크림·위젯 구성·기능 유지. 완성도만 향상: (1)시각 위계 강화(분수대·오늘할일 1순위·KPI/요약 2·3순위 대비) (2)데이터 가독성(또렷 산세리프·단위 정리) (3)여백·8px 그리드·리듬 프리미엄 SaaS (4)카드/배지/버튼 디자인 시스템 통일·토큰화 (5)모션 절제·목적(분수·상태오브제·reduced-motion) (6)트렌디 악센트 소량(그레인·유기곡선·표현적 헤드라인). ADHD 3초룰·귀엽고 상쾌하되 프리미엄·데이터 또렷·감성 가장자리."

## 다음 단계
1. **운영자 export**: Claude Design에서 `Kkottium Garden Dashboard v4.html` → PDF export(v3 때처럼) 또는 스크린샷 → 이 대화 공유. (Desktop 캡처 불가라 운영자 눈/파일 필요.)
2. Desktop이 v4 수령 → 분석 → (a)추가 빌드업 프롬프트 or (b)확정.
3. 확정 시 → standalone HTML → Code handoff(#237 §4·기존 토큰/컴포넌트 재사용·실데이터 바인딩·hex 하드코딩 금지·저위험 단계).

## 파일 버전 히스토리 (Claude Design 프로젝트)
- v1 = 원본 정원 컨셉(분수대·정원지도·풀 위젯) — 보존.
- v2 = 코퍼릿 미니멀(감성 소실·폐기).
- v3 = 융합(v1 감성 + 간결 6청크) — 운영자 방향 OK.
- **v4 = 빌드업(v3 + 완성도 향상)** — 현재·검증 대기.
