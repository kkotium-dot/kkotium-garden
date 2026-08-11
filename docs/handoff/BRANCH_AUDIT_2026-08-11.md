# 미merge 브랜치 3개 조사 결과 (2026-08-11, Desktop)

> 운영자 요청: 방치된 미merge 브랜치 3개 상태 확인. 코드 수정 없이 조사만 진행, 실제 병합/삭제는 이 문서로 판단 근거만 정리 — 최종 결정은 운영자.

## 조사 방법
각 브랜치를 `main`과 `git rev-list --left-right --count`로 비교(브랜치 고유 커밋 수 확인) + `git diff --stat`로 실제 변경 파일 확인 + main에 동일 경로 파일이 이미 있는지·더 최신인지 대조.

## 결과 요약

| 브랜치 | 최근 커밋 | main 대비 | 판단 |
|---|---|---|---|
| `feat/finish-image-router` | 2026-06-11 | main 546커밋 앞섬, 브랜치 고유 2커밋 | ⚠️ **폐기 후보** — main에 같은 경로(`finish-image/route.ts`)가 이미 6/23(브랜치보다 늦게) 존재, 다른 방식으로 이미 완료된 것으로 추정 |
| `feature/prompt-asset-engine` | 2026-05-25 | main 812커밋 앞섬, 브랜치 고유 4커밋 | 🟡 **검토 후보** — 28개 파일·3768줄 **순수 신규 추가**(삭제 0). art-director/legal-lint/metrics-collector 등 완전히 독립적인 기능 세트. main과 파일 충돌 없어 보이나, 오래 방치된 만큼 지금 프로젝트 방향과 여전히 맞는지 재확인 필요 |
| `feature/sprint-7-m2-smart-asset-workflow` | 2026-05-20 | main 826커밋 앞섬, 브랜치 고유 3커밋 | 🔴 **병합 금지(확정)** — `src/app/api/diagnose/route.ts`를 568줄 규모로 수정하는데, **main의 같은 파일이 브랜치보다 10일 늦은 5/30에 이미 다른 방향으로 수정됨**(VLM 빈배경판 게이트 + diagnose→enqueue 체이닝, Track B P2). 지금 병합하면 이미 완료된 main의 최신 로직이 브랜치의 구버전으로 덮어써져 **명백한 회귀** 발생 |

## 상세

### 1. `feat/finish-image-router` — 폐기 권장
- 고유 변경: `src/app/api/products/[id]/finish-image/route.ts` 296줄 신규 + 문서 2건 소폭 수정.
- main 확인: `finish-image/route.ts`가 **이미 존재**(6/23 생성, 12,364 bytes — 브랜치 296줄보다 훨씬 큼). 브랜치보다 12일 늦게 만들어진 걸 보면, 이 기능이 **다른 세션/다른 방식으로 이미 완성돼 main에 들어갔을 가능성이 높음**.
- **권장**: 브랜치 삭제(`git push origin --delete feat/finish-image-router`). 단, 실행 전 운영자 확인 요망(브랜치명이 암시하는 "이미지 라우터 완성"이 정말 main 버전과 같은 목적인지 최종 확인 권장 — 다르면 유용한 아이디어가 묻힐 수 있음).

### 2. `feature/prompt-asset-engine` — 재검토 후 병합 또는 폐기 결정 필요
- 고유 변경: 순수 신규 파일 28개(3768줄, 삭제 0). 프롬프트 큐레이터·법률 린트·메트릭 수집기·시즌/스튜디오 모델 어댑터 등.
- main과 파일 경로 충돌 없음(전부 신규 경로로 보임) — **기술적으로는 병합 리스크 낮음**.
- 다만 5월 하순 작업이라 **2.5개월 방치**됐고, 그 사이 프로젝트 방향(소싱 v2, 카테고리 정밀화 등)이 크게 진화함. 이 기능이 지금도 필요한지, 혹은 이미 다른 형태로 구현됐는지 **내용 검토가 먼저 필요**.
- **권장**: 병합 전에 이 브랜치가 만들려던 기능(CVR 회수 파이프라인, 프롬프트 큐레이터)이 지금 로드맵과 맞는지 운영자 확인. 필요하면 최신 main 위로 rebase 후 병합, 불필요하면 폐기.

### 3. `feature/sprint-7-m2-smart-asset-workflow` — 병합 절대 금지
- **확정된 회귀 위험**: `diagnose/route.ts`를 main의 최신 버전(5/30, VLM 빈배경판 게이트)보다 오래된 버전(5/20)으로 되돌리게 됨.
- **권장**: 이 브랜치를 병합하지 말 것. 브랜치 안에 유의미한 아이디어(L1 automation pipeline, adobe-bg-removal.ts 등)가 있다면, **브랜치 병합이 아니라 필요한 파일만 개별적으로 cherry-pick**해서 최신 main 기준으로 재작업하는 게 안전. 폐기해도 무방(main이 이미 그 이후로 발전했으므로).

## 다음 단계 (운영자 결정 필요)
- [ ] `feat/finish-image-router`: 삭제 승인 여부
- [ ] `feature/prompt-asset-engine`: 내용 검토 후 병합/폐기 결정
- [ ] `feature/sprint-7-m2-smart-asset-workflow`: 폐기 승인 (병합은 금지 확정)

이 작업은 코드 수정 없이 조사만 진행됨. 실제 브랜치 삭제/병합은 운영자 승인 후 별도 진행.
