# 현재 인계 (CURRENT)

> 이 파일 1개만 활성 인계. 과거 116건은 `archive/2026-Q3/`로 격리(전부 이동, 삭제 0건).
> 갱신 규칙: 매 세션 종료 시 이 파일을 덮어쓴다(누적 아님) — 실시간 상태는 `docs/plan/TASK_BRIDGE.md` §3 ACTIVE가 정본.

- **status**: 진행 중 — 문서 정리(AI_DOCS_MANAGEMENT_STANDARD 도입) + ADR-0002(source-gone 스파이크 내성) 구현 완료·검증 완료(smoke exit0·tsc0·T-16/T-17 PASS). handoff 아카이브 격리 완료(작업2). CLAUDE.md 축소는 1단계(삭제후보 보고)만 진행, 실 삭제는 운영자 승인 대기(작업3·#314).
- **branch**: `main` (baseline `d282523`, 1인 개발 direct-push 체계 — 별도 브랜치 없음)
- **goal**: docs/DOCS_STANDARD.md v2 기준으로 handoff 산더미·CLAUDE.md 비대(346줄)를 정리해 다음 세션 온보딩 비용을 낮춘다. 동시에 ADR-0002(공급처 단절 판정 고립 스파이크 1회 허용)를 코드에 반영해 폴러 오독 1건으로 처분 대상이 누락되는 사고를 막는다.
- **next-action**: 운영자가 CLAUDE.md 삭제후보 표를 검토 후 승인하면 2단계(실제 삭제 + grep 검증)를 진행. 그 전까지 Code 측 추가 착수 항목 없음 — 승인 대기.
