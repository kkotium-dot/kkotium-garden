# 꽃틔움 가든 (Kkotium Garden) — Claude Code Context

> 착수 전 필독: `docs/CORE_PRINCIPLES.md`(절대 원칙 요약·전 레인 관문) · `docs/DOMAIN_FACTS.md`(이 앱이 무엇인가) · `docs/PRODUCT_LIFECYCLE_FLOW.md`(상품이 지나는 길)
> 실시간 진행 상태는 `docs/plan/PROGRESS.md` / `ROADMAP.md` / `SESSION_LOG.md` / `TASK_BRIDGE.md`.
> 이 파일의 전문·이관 이력은 `docs/design/CLAUDE_MD_REDUCTION_CANDIDATES_2026-07-28.md`(v2) 참조.

---

## 0. 최우선 상시 원칙 — 화면 문구는 셀러 실무 용어 (작업원칙 #262, 2026-07-14 운영자 확정)

**모든 세션에서 항상 적용.** 화면에 사용자가 보는 모든 텍스트(배지·버튼·툴팁·알림·에러메시지·빈상태문구)는 개발자 은어("튜닝", "방어" 등) 대신 이커머스 파워셀러 실무 용어 + 꽃틔움 정원 컨셉 하이브리드로 작성한다.
- 코드 내부 타입명/변수명/주석/서버로그는 영어 유지 가능(화면에 안 보이므로).
- 네이버 공식 카테고리명(예: "튜닝용품")은 원문 유지(네이버 검색 직결).
- "좀비"는 운영자가 의도적으로 부여한 컨셉(향후 "좀비 꽃")이라 예외 — 은어 아님.
- 새 문구 작성 시 "초보 셀러가 설명 없이 이해할 수 있는가" 자문. 애매하면 후보 2~3개를 운영자에게 제시하고 확인.
- 전문은 `docs/plan/PRINCIPLES_LEARNED.md` 작업원칙 #262 참조.

---

## WHY — 이 앱은 무엇인가

1인 네이버 스마트스토어 셀러(스토어명: 꽃틔움 KKOTIUM)를 위한 운영 자동화 SaaS. 도매꾹/오너클랜 크롤링 → 마진 계산 → AI SEO 최적화 → 네이버 Commerce API 등록 / 엑셀 일괄 등록까지 풀 파이프라인. **화훼 아님** — "꽃/정원"은 브랜드 은유, 실제는 도매매 드롭십 셀렉트샵(자세한 오인 방지 사실은 `docs/DOMAIN_FACTS.md`).

**상품 생애 흐름** (정본: `docs/PRODUCT_LIFECYCLE_FLOW.md`): 꿀통 꽃나들이(크롤링) → 정원 창고(발행전 보관) → 온실 아틀리에(씨앗심기·꽃단장) → **[검수 + 운영자 발행]** → 꽃밭 돌보기(판매중 관리). 미발행→발행은 **씨앗심기 검수 후 운영자만** 결정한다(#307, `CORE_PRINCIPLES.md` §2).

## WHAT — 스택 · 외부 연동

- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS · ORM: Prisma · DB: Supabase PostgreSQL(`doxfizicftgtqktmtftf`)
- AI: Gemini(3키 round-robin, 주력) → Groq llama-3.1-8b-instant(무료 fallback)
- 배포: Vercel production = `https://kkotium-garden.vercel.app`(source of truth, #28)
- 알림: Discord 5채널 webhook + Solapi 알림톡
- 외부 API: 도매꾹 OpenAPI · 네이버 Commerce API · 네이버 검색광고 API · Supabase MCP(project id로 직접 SQL DDL)

**핵심 파일 경로는 `docs/plan/REFERENCES.md`가 정본** — 새 경로 추가 시 그 파일에 기록. 진행 상태 스냅샷은 항상 `docs/plan/PROGRESS.md` 재확인(이 파일에 스냅샷을 두지 않는 이유: SoT 위반 방지).

## HOW — 세션 시작 시 필수 절차 (순서 준수)

매 새 세션 첫 turn에 반드시 아래를 수행. 사용자 별도 요청 전까지 본 작업 시작 금지.

**STEP 0 — 환경 점검**
```bash
cd /Users/jyekkot/Desktop/kkotium-garden && \
  git rev-parse HEAD origin/main && git status --short && git stash list && \
  git --no-pager log --oneline -5 && wc -l docs/plan/*.md && \
  curl -sIo /dev/null -w "Vercel HTTP: %{http_code}\n" https://kkotium-garden.vercel.app/dashboard && \
  echo "Latest prod deploy SHA: $(gh api 'repos/kkotium-dot/kkotium-garden/deployments?environment=Production&per_page=1' --jq '.[0].sha[0:7] // "NONE"' 2>/dev/null || echo '?')" && \
  scripts/verify-vercel-deploy.sh 2>&1 || true
```
확인: HEAD==origin/main · working tree clean · SESSION_LOG.md 1500줄 초과 시 분할(#31) · Vercel HTTP 200 · **prod deploy SHA==HEAD**(불일치 시 #36 발동, 즉시 보고) · verify-vercel-deploy.sh exit 0.

**STEP 1 — 정독**: `PROGRESS.md` → `ROADMAP.md` → `SESSION_LOG.md`(직전 5세션) → `TASK_BRIDGE.md`(§3 ACTIVE+§4 STANDING+§6 PENDING 의무) → 필요시 `PRINCIPLES_LEARNED.md`/`PRINCIPLES_CODE.md`/`SPRINT_PLAN.md`/`REFERENCES.md`. `docs/plan/archive/`는 grep 검색 시에만.

**STEP 2 — 브리핑**: 현재 HEAD + 직전 산출물 요약 · 다음 본 작업(ROADMAP "다음 새 채팅 시작 메시지") · 미커밋/untracked 정확 보고 · SESSION_LOG 분할 필요 여부.

**STEP 3 — 승인 대기**: 명시적 승인 없이는 본 작업 시작 금지. (자동화 실패 시 수동 트리거: "PROGRESS/ROADMAP/SESSION_LOG 정독 후 환경점검·브리핑, 승인 후 진행"이라 말할 것.)

## HOW — 코드 작성 규칙

- **Prisma**: `new PrismaClient()` 절대 금지 → `src/lib/prisma.ts` 싱글톤. `keywords` 등 JsonValue 필드는 `Array.isArray()` 가드. 스키마 변경 후 `npx prisma generate` + dev 재시작.
- **네이버 카테고리**: 로컬 데이터(`src/lib/naver/naver-categories-full.ts`, 4,993건)만 사용, API 호출 금지, 전체 데이터셋 AI 프롬프트 전달 금지(토큰 초과).
- **환경 변수**: `.env.local`의 `$` 포함 값은 `\$` 이스케이프(dotenv-expand가 bare `$`를 확장 처리).
- **검증**: 모든 수정 후 `npx tsc --noEmit` 0 errors 필수. 작업 완료 마킹 전 브라우저 테스트 의무(API 200만으로 불충분). tsc 통과 ≠ production 빌드 통과 → 의심 시 `npm run build`(#32).
- **이미지/발행 자산**: `.claude/rules/image-assets.md` 참조(라이선스·네이버 대표이미지 규정·자산 저장명 규약).
- **네이버 v2 상품 수정**: PUT은 항상 전체 payload(부분 PUT 절대 금지 — 누락 필드가 상품에서 제거됨). 실 쓰기는 `confirm:true && !dryRun`에서만. 구현 절차는 `.claude/rules/naver-api.md` 참조.

## HOW — 작업 흐름 규칙

- **승인 게이트**: 본 작업은 사용자 명시 승인 후. 한 turn 안에 완료 가능한 단위로 분할. 중간 보고 금지 — 완료 후 한 번에. 못 하는 작업은 즉시 정직하게 알림.
- **닉네임 규칙(#29 e++)**: 응답 본문 prose에 사용자 닉네임 "꽃졔" 사용 금지(사용자 메시지 직접 인용·코드 변수명·MD 파일 기록은 예외). 오타 변종(꽃졤/꽃제/꽃젤) 절대 출력 금지 — 오타 수정 시 사용자 verbatim 메시지에서 복사, 기억으로 타이핑 금지.
- **MD 파일 갱신(#29 b+#31)**: 한글 다량 포함 MD는 `Read`+`Write`(전체 덮어쓰기) 또는 Python 안전 삽입. `Edit`는 영어/구두점만일 때만. 1500줄 초과 시 `docs/plan/archive/`로 분할. 갱신 후 한글 sentinel grep 검증은 `.claude/rules/md-hangul-check.md` 참조.
- **Git**: commit/push 전 TSC 0 errors 확인. 커밋 메시지 prefix `feat:`/`fix:`/`docs:`/`refactor:`/`chore:`. 한글 다량 시 `.commit-msg.tmp`+`git commit -F`(#17). main 직접 push(1인 개발). **push 직후 `scripts/verify-vercel-deploy.sh --wait` 의무**(#36) — exit 1 시 webhook 진단.
- **세션 종료 시 문서 3종 점검(#319)**: 의미 있는 작업 단위(기능·수정·설계 확정) 완료 시 다음을 빠짐없이 확인 — ① `docs/handoff/CURRENT.md` 덮어쓰기(다음 세션이 이어받을 상태), ② `docs/plan/PARALLEL_WORK_TRACKER.md`에 rev 추가(무엇을 했는지 누적기록), ③ 새 규칙이 생겼으면 `docs/plan/PRINCIPLES_LEARNED.md`에 번호 등재. 셋 중 하나라도 스킵했으면 "완료"로 보고하지 않는다. **착수 전에는 이 문서들의 "미완료" 표기를 그대로 믿지 말고 먼저 `git log`/`grep`으로 실측 확인**(#318 문서정합성 사고 교훈 — 낡은 인계문서가 이미 끝난 작업을 "대기중"으로 잘못 표시했던 사례 있음).
- **의심 파일(#34)**: 명백히 잘못된 파일명/구조 발견 시 자동 처리 금지 → 즉시 알리고 결정 위임.
- **Auto-accept 주의**: `Shift+Tab` 자동승인 중 `git push --force`/`rm -rf` 직전엔 반드시 끄고 개별 승인.

## 절대 금지 · 원칙 인덱스 (참조)

네이버 PUT/POST 비가역·디스코드 실발송·테스트 데이터 방치·문서 무단삭제·허위 완료 보고 등 **어겼을 때 실제 사고가 났던 절대 규칙 전체는 `docs/CORE_PRINCIPLES.md`가 정본**(운영자 승인 없이 그 문서 항목 삭제 금지). 작업원칙 전체 인덱스는 `docs/plan/PRINCIPLES_CODE.md`(#1-25)·`docs/plan/PRINCIPLES_LEARNED.md`(#26+) 참조. **AI 인프라 변경 시**(새 스킬·서브에이전트·hooks·MCP 서버 도입 포함) **#42~#45 필독** — 도입 시 `docs/plan/PRINCIPLES_LEARNED.md`에 그 도구가 문서 갱신 규율(#319)과 어떻게 맞물리는지 별도 검토·등재할 것(예: 서브에이전트가 자동으로 문서를 쓰게 되면 sentinel 검증·덮어쓰기 규칙이 그대로 적용되는지 재확인).

## 행동 가이드라인

- 가정은 명시한다. 불확실하면 묻는다. 해석이 여러 개면 전부 제시하고 혼자 고르지 않는다.
- 확인할 수 없는 것은 지어내지 않는다. 시스템 한계는 즉시 사실대로 보고한다.
- 요청한 범위만 수정한다. 인접 코드·주석·포맷을 임의로 "개선"하지 않는다.
- 깨지지 않은 것을 리팩토링하지 않는다. 기존 스타일을 따른다.
- 모든 변경된 줄은 사용자 요청으로 추적 가능해야 한다.
- 오류는 근본 원인을 찾아 고친다. 같은 원인이 있는 곳을 전수 조사해 함께 고친다.
- 다단계 작업은 계획을 먼저 제시하고, 각 단계마다 검증 방법을 함께 적는다.
- 되돌릴 수 없는 작업(발행·삭제·외부 전송)은 실행 전 반드시 승인을 받는다.
