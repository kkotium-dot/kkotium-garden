# 작업 스케줄 보드 (WORK SCHEDULE BOARD)

> **이 파일의 역할**: "지금 뭘 해야 하고, 뭘 동시에 해도 되고, 뭐가 막혀 있는지"를 한 화면에 보여주는 **단일 우선순위 권위 문서**.
> **갱신 의무**: 작업 착수·완료 시마다 즉시 갱신(#319). 세션 시작 시 이 파일을 먼저 본다.
> **최종 갱신**: 2026-08-27 (Cowork 문서정정 — cron_invocation_log 실측 결과 반영, B4-A DONE)
>
> **왜 만들었나**: `TASK_BRIDGE.md` §3-A 보드가 2026-07-22 이후 방치돼 이미 끝난 작업을 "대기중"으로 표시하는 사고가 있었다(#318). 그 재발 방지 + 운영자가 "이거 해도 되나요?"를 다시 묻지 않아도 되게 하기 위함.
>
> **2026-08-19 전면 재작성 사유**: 07-30 작성분이 낙후돼 이미 끝난 작업을 "READY(미착수)"로, 이미 반영된 브랜치를 "merge 대기"로 표시하고 있었다(#318 재발). Desktop 실측(rev115~120·브랜치 ahead 카운트)으로 실제 상태를 반영해 갈아엎었다.

---

## §0 이 보드 읽는 법

| 표기 | 뜻 |
|---|---|
| 🟢 **READY** | 지금 바로 착수 가능. 선행 작업 없음. |
| 🔵 **PARALLEL-OK** | 다른 작업과 **동시 진행 안전**(write set 겹침 없음, #322). |
| 🟡 **BLOCKED** | 선행 작업이 끝나야 착수 가능. 무엇에 막혔는지 명시. |
| ⏸️ **WAITING-OPERATOR** | 코드 문제 아님. 운영자 결정/확인만 필요. |
| ✅ **DONE** | 완료 + 검증 완료. |

**write set** = 그 작업이 *수정하는* 파일 목록. 두 작업의 write set이 겹치지 않으면 병렬 안전(wikidocs 098 원칙·#322).

---

## §1 지금 당장 (이번 주) — 신규 P0

> 07-30 §1의 P1/P2는 이미 완료됐다(아래 §1-B). 지금 최상단 우선순위는 아래 P0 3건.

| 순위 | 작업 | 상태 | write set | 담당 레인 | 비고 |
|---|---|---|---|---|---|
| **B4-A** | **아침 소싱 크론 계측** — ✅ `cron_invocation_log` 실측(8/20~25) 결과 6개 크론 전부 매일 정상 발화·적재 확인(sourcing-daily 포함). 잔여=추천 품질(카테고리 편중 등), 발송 여부 재조사 불필요 | ✅ DONE(2026-08-27) | (조사·계측, 코드변경 없음) | Desktop(대시보드)·Code(로그) | ⚠️ **재조사 금지 목록 준수**: force-dynamic·middleware·redirects·크론개수상한·미배포커밋 5건은 이미 기각(CURRENT.md 참조). 실 Discord 발송 테스트는 운영자 승인 없이 금지 |
| **B5** | **Git 연동 복구** — 계정 이관 후 커밋·push 흐름 점검. 미커밋 변경분(import 필드완전성 등) 커밋·push·verify-deploy | 🟢 READY | `git`(레포 상태)·`docs/handoff/CURRENT.md` | Code | CURRENT.md "다음 세션 시작 순서" 1번과 연동. 이번 세션 변경분이 프로덕션 미반영 상태 |
| **B6** | **Vercel Hobby ToS 확인** — 크론·상업적 사용 약관 적합성 검토(외부 안전망 GitHub Actions 도입 전 선행) | ⏸️ WAITING-OPERATOR | (조사·문서) | Desktop→운영자 | 매일 자동 실발송 CI = 디스코드 실발송 동급 승인 대상(#337). 요금제 상향 필요 여부 판단 |
| **P1-A** | **상품 정식 카테고리 정비** — `naver_categories` 0행·전 상품 `category_id` 0건 → 드롭십 적합도·소싱 씨앗·네이버 검색 적합도 3곳 동시 무력화. 마스터 적재→제안 품질(D3/D4)→dryRun 백필→앱 개입점 4단계 | ⏸️ WAITING-OPERATOR (설계 승인 대기·**구현 착수 금지**) | Step1~3: `naver_categories`·backfill 스크립트 / Step4 UI는 별도(파일 무겹침) | Desktop(설계 완료)→Code(구현) | 권위: `docs/design/PRODUCT_CATEGORY_BACKFILL_2026-08-20.md`. 선행조건 없음·골든셋(P0-6)과 write set 무충돌. ⚠️ FK `ON DELETE SET NULL` — 마스터 DELETE 금지. `--apply`는 운영자 GO 없이 금지. 매출 직결 기반 정비. **참고(2026-08-27 UCE-6 실측, rev126)**: `naver_categories`(Prisma `NaverCategory`) 0행 확인은 이 문서 작성 시점과 일치·재확인됨. 그 테이블의 유일한 앱 소비자(`auto-mapper.ts` matchCategory)는 도달 불가능한 죽은코드였음(어떤 페이지에도 안 붙은 `NaverAutoFillForm.tsx`가 유일한 호출경로) — 이 P1-A의 `category_id`/FK 백필과는 별개 필드(상품의 `naverCategoryCode` 제안 흐름은 이번 세션에서 정적 마스터 `NAVER_CATEGORIES_FULL` 직접매칭으로 이미 정상화됨, `naver_categories` 테이블과 무관). 착수 시 이 구분을 먼저 확인할 것 |

---

## §1-B 최근 완료 (07-30 §1 항목의 실제 결말 — 실측 확인)

| 작업 | 07-30 표기 | 실제 상태(2026-08 실측) |
|---|---|---|
| **P1 소싱추천 크론 연결 + dry-run + 취급제외 엔진** | 🟢 READY(미착수) | ✅ **완료** — rev115~120에서 크론 연결·독립 크론 분리·self-fetch 제거·카테고리 편중 근본수정까지 구현·배포됨. (단, 실발송 안정성은 B4-A로 별도 추적) |
| **P2 시즌 캘린더 확장** | 🔵 PARALLEL-OK | 시즌 데이터 리서치·설계 진척(SEASON_CALENDAR_*). 잔여분은 로드맵에서 개별 추적 |

---

## §2 그다음 (P0 이후) — 남은 소싱 로드맵

| 순위 | 작업 | 상태 | 막힌 이유 / 비고 | write set |
|---|---|---|---|---|
| 4 | **로드맵1b 8렌즈 쿼터 배분 cron 배선** | ✅ DONE(2026-08-27·9cf7f73) | `assignSourcingSlots`에 `classifySourcingLenses`·`allocateByLens` 실배선(F3 해소) + D-fix(category-trend-cache D1 trend 프리페치 주입, N+1 없음) — 🏆황금·📈급상승(SEO 경로) 부활. 프로덕션 `/growth` 배지 렌더 실측(인테리어=🏆황금+📚스테디) | `sourcing-recommender.ts`(cron 소비) |
| 5 | **P3 검수관 신설**(필터+배제사유) | 🟡 BLOCKED | 소싱 발굴 안정화 후 — 필터할 후보가 먼저 안정적으로 생성돼야 함 | `src/lib/sourcing/inspector.ts`(신규) |
| 6 | **P4 앱「꼬띠 브리핑」화면** | 🟡 BLOCKED | P3 완료 필요 — 배제사유까지 보여줘야 함 | `src/app/(dashboard)/...`(신규) |
| 7 | **P5 피드백 루프**(채택 이력 학습) | 🟡 BLOCKED | P4 완료 필요 — 채택 버튼이 있어야 데이터가 쌓임 | `prisma/schema.prisma`<br>`src/lib/sourcing/feedback.ts` |

---

## §3 브랜치 정리 (BRANCH_AUDIT_2026-08-11 실측 반영)

> **07-30 §1의 "브랜치 merge 대기" 항목은 삭제됐다.** 아래 4개 브랜치는 전부 main 대비 **ahead=0**(이미 반영 완료) — merge 대상이 아니라 **ref 정리만 남았다.**

### 이미 반영 완료 (ahead=0 → ref 삭제만)

| 브랜치 | 상태 |
|---|---|
| `preview-copy-then-redesign` | ✅ 이미 main 반영 — ref 정리만 |
| `mood-camera-system` | ✅ 이미 main 반영 — ref 정리만 |
| `image-studio` | ✅ 이미 main 반영 — ref 정리만 |
| `finish-image-router` | ✅ 이미 main 반영(6/23 별도 구현) — ref 정리만 |

### 실제 미merge 유효 커밋 (2건만)

| 브랜치 | 커밋 | 판단 |
|---|---|---|
| `prompt-asset-engine` | 4커밋(05-25) | 🟡 **재검토 후보** — 순수 신규 28파일·충돌 없음. 2.5개월 방치라 현 로드맵 부합 여부 운영자 검토 후 병합/폐기 |
| `sprint-7-m2` | 3커밋 | 🔴 **병합 절대 금지 확정** — `diagnose/route.ts`를 main 최신(5/30 VLM 게이트)보다 오래된 버전으로 회귀. 필요한 파일만 cherry-pick, 폐기 무방 |

---

## §4 대기 중 (우선순위 낮음, 급하지 않음)

| 작업 | 상태 | 비고 |
|---|---|---|
| 컬럼 불일치 근본수정 — sellerCode(sku vs sellerProductCode)·brand(payload 미포함)·taxType vs naver_tax_type(#340) | ⏸️ WAITING-OPERATOR | 부분재연동 dirty-field 감지기가 추적은 하나 실제 네이버 반영 효과 없는 필드. 착수 여부 운영자 판단 |
| 기존 6개 상품 썸네일 미표시 — "네이버에서 이미지 재동기화" 신규 기능 설계 | 🟢 READY | 구버전 import로 이미지 배열 빈 상태. 신규 임포트는 정상(rev117 C 확인) |
| `TASK_BRIDGE.md` §3-A 낡은 보드 정리 | 🟢 READY | 이 스케줄 보드가 그 역할 대체 → §3-A에 "이 파일 참조" 포인터만 남기고 정리 권장 |
| git stash `z3c-misdirected-changes-needs-redo` 처리 방향 | ⏸️ WAITING-OPERATOR | 손대지 않음. 운영자 결정 대기 |
| 「대표로 적용」 등 쓰기 동작 실사용 검증 | ⏸️ WAITING-OPERATOR | 실제 DB 변경이라 운영자 승인 필요 |

---

## §5 절대 어기면 안 되는 것 (매 작업 확인)

- 네이버 스토어 PUT/POST → 운영자 명시 "GO" 없이 **금지**
- **디스코드 실발송 → 운영자 승인 없이 금지.** 크론 수동 실행 시 실제 알림이 나감 — 반드시 dry-run 먼저
- 자동 발행 → **영구 금지**. 발행은 항상 운영자 검수 후(#307)
- 매일 자동 실발송을 일으키는 CI 워크플로(GitHub Actions 등) 추가·활성화 = 디스코드 실발송 동급 승인 대상
- 테스트 데이터 방치 → 주입했으면 같은 세션에 원복
- 허위 완료 보고 → 실측 못 한 건 "미검증" 명시(#310). **인계문서의 "완료/확인됨" 표기도 재검증 대상**(#318 이 보드 재작성 사유)
- 착수 전 실측 우선 → 문서의 "미완료/대기" 표기를 그대로 믿지 말 것(#318/#319)

---

## §6 레인 배분 원칙 (Desktop ↔ Code ↔ Cowork)

> **상세 규약은 `docs/plan/PING_PONG_PROTOCOL.md`로 이관.** 여기엔 요약만 둔다.

| 레인 | 담당 | 이유 |
|---|---|---|
| **Desktop** (설계·검증) | PRD 작성, MCP 리서치, 브라우저 실측, 배포 검증, 문서 갱신 | 코드 파일 생성/편집·git commit 불가 |
| **Code** (구현·배포) | 코드 작성, 커밋, 빌드, 테스트, 대용량 한글 MD 처리 | 실제 파일 쓰기 권한 |
| **Cowork** | 여러 파일에 걸친 광범위 리서치·문서 정리·정정 | 파일 3개 이하 작업은 Code 단독이 효율적 |

**병렬 필수 규칙**(wikidocs 097): 다른 레인이 동시 작업 중일 수 있다. **담당 write set 밖의 파일은 되돌리거나 정리하지 말 것.** 범위 밖 변경은 수정하지 말고 요약만 남긴다.

---

## §7 갱신 이력

| 날짜 | 변경 |
|---|---|
| 2026-07-30 | 최초 작성(Desktop). #318 문서정합성 사고 재발방지 + 꼬띠 에이전트 PRD 반영 |
| 2026-08-19 | 전면 재작성(Cowork). P1=완료 반영·merge대기 4건 삭제(ahead=0 ref정리로 대체)·유효 미merge 2건만 명시·신규 P0 3건(B4-A/B5/B6) 추가·§6을 PING_PONG_PROTOCOL로 이관 |
| 2026-08-20 | P1-A 상품 카테고리 정비 추가(설계 승인 대기·권위 PRODUCT_CATEGORY_BACKFILL_2026-08-20). Cowork |
