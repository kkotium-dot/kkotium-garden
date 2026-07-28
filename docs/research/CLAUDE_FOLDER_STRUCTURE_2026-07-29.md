# .claude 폴더 구조 — 실무 표준 대조 (2026-07-29)

> 상태: 시점(2026-07-29)
> 원본: wikidocs 347582(.claude 구조) · 347584(CLAUDE.md 템플릿) · 347587(PRD 템플릿) · 347431(README)
> ※ 347582 완독. 나머지 3건은 목차·맥락 기준 판단(정직 표기) — 필요 시 다음 세션 정독.

## 1. 표준 구조 vs 우리 현황

| 항목 | 표준 권고 | 우리 현황 | 판정 |
|---|---|---|---|
| `settings.json` | 권한·hooks·기본 동작 | ✅ 있음(claudeMdExcludes) | 유지 |
| `rules/` | paths 범위 지정 규칙 | ✅ 3종(naver-api·korean-md·image-assets) | 유지 |
| `skills/` | 반복 작업 절차 | ❌ 없음 | **후보** |
| `agents/` | 전문 역할 subagent | ❌ 없음 | 보류 |
| `hooks/` | 이벤트 자동 실행 | ❌ 없음 | **신중**(자동실행 위험) |
| `commands/` | slash command | ❌ 없음 | 보류 |
| `worktrees/` | — | ⚠️ **정체불명 파일 다수** | **정리 필요** |

## 2. ★ 핵심 원칙 — "없으면 어떤 반복 문제가 생기는가"

> 새 파일을 추가할 때는 **"이 파일이 없으면 어떤 반복 문제가 생기는가"**를 먼저 적어 본다. 답이 모호하면 아직 추가하지 않는다.

우리 `DOCS_STANDARD §13`의 "이 줄을 지우면 실수하게 되는가"와 같은 판별 기준. **일관성 확인됨.**

## 3. 단계별 확장 (우리 위치)

| 단계 | 추가할 것 | 기준 | 우리 |
|---|---|---|---|
| 1 | settings.json | 권한·기본 규칙 | ✅ 완료 |
| 2 | 작은 Skill 하나 | 반복 빈도 높고 기준 명확 | **← 지금 여기** |
| 3 | reviewer agent | 읽기 전용 검토 필요 시 | 보류 |
| 4 | hook | 자동 실행 이득 > 위험 | 보류 |
| 5 | reference 문서 | Skill이 긴 지침 반복 읽지 않게 | ✅ 이미 docs/ |

## 4. 우리 앱 적용 — Skill 후보 3종 (반복 빈도 실측 기반)

이번 사이클에서 **실제로 매 세션 반복된 절차**만 후보로 올린다.

| Skill 후보 | 반복 근거 | 절차 |
|---|---|---|
| **`session-handoff`** | 매 세션 종료 시 CURRENT.md 갱신 + 인계 블록 작성 | status·branch·goal·next-action 4항목 + 미진행/계획 |
| **`deploy-verify`** | 매 배포 후 SHA 대조·reload·curl (#305/#308/#309) | push → SHA 확인 → reload → curl 원본 → 보고 |
| **`docs-audit`** | 문서 삭제 전 매번 (#314·#315) | 전문 보존 → 후보표 → 승인 → grep 검증 |

> **주의**: 위 3종은 **후보**다. 실제 생성은 "없으면 어떤 반복 문제가 생기는가"에 답이 명확한 것부터 **하나씩**. 한꺼번에 만들면 안 쓰는 Skill이 쌓여 §5 정리 부담만 는다.

## 5. hooks — 우리는 특히 신중해야 한다

표준 자료도 "자동 실행 위험이 있으므로 꼭 필요한 경우만"이라 경고한다. **우리는 더 위험하다**:
- 네이버 PUT/POST가 훅으로 자동 실행되면 **비가역 사고**(#46)
- 디스코드 훅이 걸리면 **실제 알림 발송**

→ **결론: hooks는 도입하지 않는다.** 도입 시 반드시 ADR로 근거·범위·실패 시 동작을 먼저 남긴다.

## 6. 소유권·정리 기준 (표준 채택)

| 항목 | 관리 기준 |
|---|---|
| Skills | 목적 · 입력 · 산출물 · **마지막 검토일** |
| Agents | 역할 · 도구 권한 · 사용 조건 |
| Hooks | 트리거 · 실행 명령 · **실패 시 동작** |
| Settings | 권한 변경 **이유와 승인자** |
| References | 오래된 문서 제거 기준 |

→ Skill을 만들 때 **SKILL.md 상단에 위 4항목을 헤더로** 넣는다(DOCS_STANDARD §4 필수헤더와 동일 사상).

## 7. 즉시 조치 필요 — `.claude/worktrees/` 정체불명 파일

실측(2026-07-29): `.claude/worktrees/xenodochial-golick-2019d7/` 아래에 `fix_schema.js` · `setup.sh` · `phase2-install-simple.sh` · `next.config.backup-20260120.js` · `FIX-8-db-sync.sh` · `check_api.mjs` · `setup-product.js` 등 **과거 작업 잔여물**로 보이는 파일 다수.

- **위험**: git worktree 잔여물이면 삭제 안전하나, **확인 없이 지우지 않는다**(#314).
- **조치**: Code가 `git worktree list`로 활성 여부 확인 → 비활성이면 후보 목록 보고 → 승인 후 정리.
- **컨텍스트 영향**: `claudeMdExcludes`에 이미 archive는 제외했으나 `.claude/worktrees/**`는 미제외 → **추가 필요**.
