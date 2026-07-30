# 꽃틔움 가든 — 병행작업 트래커 (누락 0 원칙) · 최종 업데이트 2026-07-30 (rev95 — 꼬띠 소싱 에이전트 PRD·작업 스케줄 보드 신설 · Desktop) / 직전 rev94

> **⚠️ 2026-06-24(rev50)부터 2026-07-13까지 약 3주간 이 파일이 갱신되지 않았습니다.** 그 사이 실제로는 상품 IA 재설계(P1~P4), 꼬띠 페르소나 전면 적용, 재고 가시화, 좀비 튜닝 엔진 등 대형 작업이 진행·배포됐습니다(git log 기준 e7a3581~ea4e26d 다수 커밋).
>
> **원칙 #149~#253 전문은 `docs/plan/PRINCIPLES_LEARNED.md`를 참조하세요** (2026-07-14 정식 이관 완료 — #165/#217~#220/#225/#231은 원문에 개별 정의가 없는 결번으로 확정). rev50 이하 원문(rev40~rev50 상세 커밋 로그)은 이 트래커의 커밋 `5c9e9f5^`(`git show 5c9e9f5^:docs/plan/PARALLEL_WORK_TRACKER.md`)에서 조회 가능합니다 — 현재 HEAD 파일 본문에서는 제거되어 있습니다(직전 커밋 5c9e9f5가 "원문 보존"이라 주장했으나 실제로는 528줄을 삭제했던 것을 2026-07-14 발견, 아래 참조).


> **📦 rev80 이전은 archive로 분할됨(#31, 2026-07-28)**: `docs/plan/archive/PARALLEL_WORK_TRACKER_~rev80.md` 참조(rev51~rev80, 삭제 0).

## rev90 — 작업1 F3 사전조사(검수 판정 근거) + 작업2 surfaceRules 실배선 2건 (2026-07-24 Code)

**작업1 (F3 사전조사 — 구현 없음, 조사·보고만)**:
- `/products/[id]/preview` + `GET /api/products/[id]/publish-preview`는 **완전 읽기전용**(prisma read만, DB write 0). 매 GET마다 OCR·이미지품질을 재계산해 반환 — **검수 이력이 남는 구조가 아니다**. Product 스키마에도 발행-검수용 필드는 없음(`reviewedBy/reviewedAt`은 다른 모델=전략 콘텐츠 draft/approved 게이트 소관, `StoreSettings.manualReviewCount`는 고객리뷰 수동추적용 — 둘 다 무관).
- **경고 0건 판정은 이미 계산돼 있음**: `imageWarnings`/`blockingImageWarnings` 배열 + `canPublish`(readinessOk && canRegister && blockingImageWarnings.length===0) 반환. F3 판정 근거로 그대로 쓸 수 있는 형태.
- ★**구조적 발견(설계에 중요)**: 이 검수 화면의 "발행하기" 버튼은 `POST /api/naver/products/update`(이미 등록된 상품의 재발행/수정 전용, `naverProductId` 없으면 409)로 연결돼 있다. 반면 실제 **최초 발행 경로**(정원창고 "준비된 것 일괄 발행" → `NaverRegisterModal` → `POST /api/naver/products/register`)는 이 검수 화면·`publish-preview`의 이미지품질/OCR 경고 계산을 **전혀 거치지 않는다** — 자체적으로 `validateForRegistration`(readiness/attribute grade)만 체크. 즉 오늘 기준 "경고 0건"과 "실제 최초발행 가능"은 **서로 다른 경로**라 즉시 연결 불가. Cowork 설계 시 결정 필요: (a) 최초발행도 이 검수화면을 강제로 거치게 라우팅을 바꾸거나, (b) `publish-preview`의 경고계산을 register 경로에도 이식하거나, (c) 별도의 경량 게이트를 register 직전에 추가.

**작업2 (surfaceRules 실배선, T-05/T-18 제외)**: 코드를 더 훑어 실제 T-19 위반 2건을 발견·수정.
- `products/out-of-stock/page.tsx`(처분 결정 대기함) — "재입고 검토" 그룹 편입 조건이 `p.status === 'OUT_OF_STOCK'`만 보고 `naverProductId`를 확인하지 않아 미발행 상품이 새어들어올 수 있었음(T-19 위반 가능 지점). `isQueueEligible(deriveLifecycleState(...))` 가드 추가.
- `KkottiWidget.tsx`(대시보드 할일 — 품절임박 위젯) — 동일 패턴(`p.status === 'OUT_OF_STOCK'` fallback, naverProductId 미확인). 동일하게 가드 추가.
- 두 곳 모두 `decideDisposition`의 action이 이미 'NONE'인 케이스에서 status만으로 다시 주워담는 fallback 분기였음 — action 기반 1차 필터는 원래도 안전했으나(disposition.ts:129 내장 게이트), fallback 분기가 그 안전판을 우회하고 있었다.
- T-05/T-18(삭제버튼 숨김)은 지시대로 미적용.

검증: tsc 0 · `npm run build` 0(out-of-stock 8.9→9.07kB로 실제 포함 확인) · surfaceRules.test.ts 10/10 · 로컬 브라우저 실측(두 화면 모두 정상 렌더, 콘솔 에러 0).

---

## rev89 — 작업1 양성검증 보강 + 작업2 prisma분리(1단계) 완료 + 2단계 재검토 결과 (2026-07-24 Code · #310 미검증 해소)

**작업1 (배너 양성 검증 보강)**: `NewVersionBanner.tsx`에 `?forceVersionCheck=1` 쿼리 처리 추가 — 가짜 SHA 조작 없이 (1) 스로틀 전면 우회(마운트 즉시 + 매 탭포커스 복귀마다), (2) 화면 우하단에 `초기 SHA / 현재 SHA / 일치여부` 디버그 텍스트 노출. 파라미터 없으면 완전히 기존과 동일. **버그 1건을 구현 중 발견·수정**: 최초 작성 시 `if (!initialSha.current) return`이 디버그 표시보다 먼저 실행돼 dev(sha=null)에서는 디버그 텍스트 자체가 절대 안 뜨는 결함이 있었음 — early return을 디버그 세팅 뒤로 옮겨 해결. 로컬 브라우저 실측: `?forceVersionCheck=1` → "forceVersionCheck — 초기: null / 현재: null / 비교불가(dev sha=null)" 정상 노출, 파라미터 없으면 미노출 확인.

- **미검증으로 남는 것(#310 원칙 그대로 적용)**: 실제 SHA 불일치 시 배너가 뜨는지(양성 경로) — dev에서는 SHA가 항상 null이라 재현 불가, fetch 가로채기로도 React ref(initialSha)를 외부에서 주입할 방법이 없어 인위적 검증이 불가능함을 재확인(Desktop #310 진단과 동일 결론). **다음 실제 프로덕션 배포 때 이 디버그 도구(`?forceVersionCheck=1`)로 즉시(스로틀 대기 없이) 확인** — 이번 보강의 목적은 "당장 검증"이 아니라 "다음 자연검증을 빠르게 만드는 것".

**작업2 1단계 (prisma 분리, 완료)**: `source-gone.ts`의 순수 계산 4종(`SOURCE_GONE_MIN_CONSECUTIVE`·`countLeadingNegatives`·`countLeadingOutOfStockDays`·`isSourceGoneFromCount`)을 신규 `source-gone-pure.ts`로 추출, `source-gone.ts`는 재수출만(기존 서버측 import 3곳 무변경 동작). `lifecycle.ts`가 이제 순수 모듈만 import — prisma 체인 완전 제거. **실제로 검증**: `/workflow`(client 컴포넌트)에 `surfaceRules.ts` import를 임시로 추가해 `npm run build` — 에러 0·번들 4.42kB→5.08kB(실제 포함됨 확인) → 되돌림(diff 0 확인). 이걸로 "client 컴포넌트에서 안전하게 import 가능"이 추측이 아니라 실측이 됨.

**작업2 2단계 (배지·카운트 전환) — 재검토 결과: 추가 변경 불필요로 판단**: 승인받은 방향대로 착수 전 실제 코드를 다시 훑어보니, "배지·카운트가 raw status를 직접 비교"하는 잔여 지점이 없었다. `InventoryBadge.tsx`·`/products/out-of-stock`는 이미 `decideDisposition`(disposition.ts 단일 권위)을 직접 소비 중이었고, 두 작업 큐 화면(부활소·처분대기함) 모두 `naverProductId` 필터가 이미 있어 T-19(작업큐 발행전용)는 `decideDisposition` 자체의 내장 게이트(`if (!p.naverProductId) return NONE`)로 이미 실질 충족돼 있었다. 남은 후보는 `StageBadge.tsx`(대시보드·꿀통·창고 3화면 공유)였으나 이건 lifecycle.ts의 7상태와 **다른 모델**(수집됨/씨앗/발행대기/등록대기/발행됨/품절/재활성화 — 자산·단절 축이 없는 저작 단계 배지)이라, 억지로 갈아끼우면 3개 화면에 회귀 위험만 키우고 실질 개선은 없다고 판단해 손대지 않았다. **결론**: surfaceRules.ts는 SURFACE_RULES.md v2를 코드화한 테스트/문서 권위로 존재하고, 실제 런타임은 이미 (다른 이름의) 동일 단일권위 함수를 올바르게 소비하고 있어 "전환"이라 부를 실질 변경점이 없었다 — 없는 일을 만들지 않음(#56/#303).

검증: tsc 0 · `npm run build` 0(clean cache) · surfaceRules.test.ts 10/10 · client-safety 실측(위) · 로컬 브라우저 배너 디버그모드 실측.

---

## rev88 — 작업1 완료 (새 버전 감지 배너, #308) (2026-07-24 Code · 운영자 승인: SHA API·탭포커스 트리거·전역배너 전부 권장안 채택)

`GET /api/version`(신규) — Vercel이 배포마다 자동 주입하는 `VERCEL_GIT_COMMIT_SHA`를 그대로 반환(force-dynamic, 별도 빌드스크립트 불요). `NewVersionBanner`(신규, `src/components/layout/NewVersionBanner.tsx`) — 최초 로드 시 캡처한 SHA와 재조회 SHA를 비교해 다르면 상단 전역 배너("새 버전이 준비됐어요 — 새로고침") 노출. `layout.tsx`에 배선해 전 페이지 공통.

- **트리거**: setInterval 폴링 아님 — `visibilitychange`(탭 포커스 복귀) 시에만 체크, 최소 60초 스로틀. 자동발사 타이머 금지(#72) 정신 준수.
- **오탐 방지**: 로컬 dev는 `VERCEL_GIT_COMMIT_SHA` 자체가 없어 sha=null → null끼리는 비교하지 않아 배너가 절대 뜨지 않음(운영 prod에서만 동작). fetch 실패도 best-effort로 무시(네트워크 문제로 오탐 배너 금지).
- **검증**: tsc 0 · build 0(라우트 `ƒ /api/version` 등록 확인) · 로컬 `/api/version` → `{"sha":null}` 확인 · 대시보드에서 배너 미노출(오탐 없음) 확인 · 콘솔 에러 0. mismatch 발생 경로(SHA 실제 변경 시 배너 노출)는 로직 리뷰로 확인 — 다음 실제 프로덕션 배포 때 자연 검증됨(기능 목적상 자기증명적).

---

## rev87 — 작업2/작업3 완료 (SubstituteEditor 단일권위 전환 + surfaceRules 매트릭스) (2026-07-24 Code · SURFACE_RULES.md v2 기준)

**작업2**: `products/page.tsx`(현재 888번 줄) `SubstituteEditor isOutOfStock={product.status === 'OUT_OF_STOCK'}` → `dispositionVerdict.action !== 'NONE'`로 교체(#295). 이미 같은 컴포넌트 scope에 계산돼 있던 `dispositionVerdict`(disposition.ts 단일 권위)를 재사용 — 신규 계산 없음. 로컬 브라우저 실측: 품절대체 탭 정상 렌더, 콘솔 에러 0.

**작업3**: `src/lib/products/surfaceRules.ts`(신규) + `surfaceRules.test.ts`(신규) — SURFACE_RULES.md v2 §2(surface 5종 registry: 보관함 2·작업큐 3) + §5(액션 권한 매트릭스)를 코드화. 순수함수(`isQueueEligible`·`isDeleteAllowed`·`isDeleteVisible`·`allowedActionsFor`·`isPrimaryLabelAllowed`·`hasFullStateCoverage`)로 lifecycle.ts(7상태)·disposition.ts(5액션)를 감싼다. 테스트는 v2 문서에 **구체적으로 정의된** ID만 구현(T-05 수정판·T-08·T-11·T-12·T-13·T-16~T-20 = 10건) — T-01~04/06/07/09/10/14/15는 v2 문서 어디에도 개별 정의가 없어(T-04/06/07/10은 명시 폐기) 지어내지 않고 스킵(#303 원칙). `npx tsx src/lib/products/surfaceRules.test.ts` 10/10 PASS. T-20은 이번 F1 모순(배지=단절인데 주액션=등록완료/되살리기) 재발 방지 회귀 테스트로 직결.

**주의(향후 배선 시 확인 필요)**: `lifecycle.ts`가 `source-gone.ts`(prisma 의존)를 import하므로, `surfaceRules.ts`를 client 컴포넌트에서 직접 import하면 #32/#37 빌드 경계를 건드릴 수 있다. 현재는 어디서도 import하지 않아(독립 신규 모듈) 문제 없음 — SURFACE_RULES.md §7 5단계("전 화면 배지/버튼을 판정함수 소비로 전환")를 실제 착수할 때 prisma 분리(sales-assets.ts처럼 pure 서브모듈 분리)부터 먼저 확인할 것.

검증: tsc 0 errors · `npm run build` 0 errors · surfaceRules.test.ts 10/10 · 로컬 브라우저 실측(작업2).

---

## rev86 — F1/F2 근본수정 완료 + F3 조사·제안 (2026-07-23 Code · #295/#307 연장)

★운영자 확정 #307("준비도≠발행승인") 적용 하에 진행. F3는 지시대로 조사·제안까지만(구현 안함).

**F1 (재활성화 필요 ↔ 부활소 모순) — 단일 판정 소스로 통일**: 근본원인=꽃밭돌보기 배지(raw `status==='INACTIVE'/'HIDDEN'`)와 부활소 후보(`getReactivationReason` 3사유: 품절/장기미판매/점수급락)가 서로 다른 로직 소비 → 판매중지이지만 장기미판매·점수급락 조건을 우연히 만족 못하면 부활소에서 완전 누락(플라티코 실측 재현). 조치: `daily-slots.ts:getReactivationReason`에 4번째 사유(`suspended`, INACTIVE/HIDDEN 직접 체크) 추가 + `products/page.tsx`(STATUS_SEGMENTS·TAB_CONFIG.reactivation)가 동일 함수(`needsReactivation` 헬퍼)를 소비하도록 통일 + `reactivation/page.tsx`(REASON_META·counts·필터탭·정렬순서·새생명부여 CTA)에 `suspended` 배선. 로컬 브라우저 실측: 플라티코가 이제 부활소에 "판매중지 — 재활성화 검토 필요"로 노출(이전 0건) · 꽃밭돌보기 판매중지 카운트=1과 일치.

**F2 (정원창고 배지 재정의)**: 조건축 `notReady`(입력정보 부족) → `gardenCounts.unpublished`(naverProductId null, 미발행 전체)로 교체. 문구 "등록 미완료 N건 — 이어서 작성" → "**검수 대기 N건 — 씨앗심기에서 확인**". 클릭 시 인페이지 필터 토글 → `/products/new`(씨앗심기) 이동 Link로 교체. `notReady`/`ready`/`all` 서브필터 탭(별개 UX)은 무변경 유지. 로컬 실측: 아이스틀·달항아리 2건 → "검수 대기 2건 — 씨앗심기에서 확인" 정상 노출, href=/products/new 확인.

**F3 (일괄 발행 게이트 — 조사만)**: 현재 게이트=순수 필드완성도(`getPublishReadiness`), 검수/승인 개념 없음. schema의 `reviewedBy/reviewedAt`(prisma:1198)은 다른 모델(전략 콘텐츠 draft/approved) 소관, Product엔 검수완료 플래그 없음. 제안(미구현): Product에 `reviewApproved`/`reviewedAt` 필드 신설 → 씨앗심기 검수 완료 시 세팅 → `gardenCounts.readyProducts` 계산에 AND 조건 추가. 스키마 마이그레이션 필요 사안이라 운영자 결정 대기.

**검증**: tsc 0 errors · `npm run build` 0 errors · 로컬 dev 브라우저 실측(F1/F2 위 서술) · 한글 sentinel grep 0건. 오타 정정: tracker rev85 "좁비 부활소"→"좀비 부활소".

---

## rev91 — F3 구조적 발견 확증 · T-19 전체확장 검증 · 문서기준 수립 (2026-07-23 Desktop · 배포 `7858694`)

### ★ F3 전제가 바뀌었다 — 검수 화면은 최초발행 경로에 없다 (#311 신설)
Desktop 실측으로 Code 보고를 교차 확인:
| 항목 | 실측 |
|---|---|
| `batch-register` 게이트 | `productIds`만 받음 — readiness/canPublish 검사 **0** |
| 최초발행 모달(`NaverRegisterModal`) | `publish-preview` 참조 **0건** — 검수 화면 안 거침 |
| 검수 화면 발행 버튼 | **재발행(`/update`) 전용**, 미등록 상품에는 409 |

→ 기존 제안("있는 검수 화면을 일괄발행에 연결")만으로는 불충분. **최초발행 경로 자체에 게이트가 없다.**
→ 원칙 **#311**: 게이트는 화면이 아니라 **경로(서버 진입점)**에 건다. 우회 경로 0건 확인이 완료 조건.

### T-19 전체확장 검증 PASS
Code가 기존 7채널 외 **신규 위반 2건 자발 색출·수정**: `out-of-stock/page.tsx`(재입고 검토 그룹) · `KkottiWidget.tsx`(대시보드 품절임박) — 둘 다 `status==='OUT_OF_STOCK'`만 보고 발행여부 미확인 → `isQueueEligible` 배선.
Desktop 프로덕션 실측: 처분 결정 대기함 정상(0건·빈상태 문구 정상). **단건 수습이 아닌 전체 확장 이행 사례.**

### Cowork 설계 접수 — 대안 D 권장
`docs/design/PUBLISH_REVIEW_GATE_2026-07-23.md`. 결정적 발견: 스키마에 **`reviewChecklist Json` · `reviewLastUpdated` · `manualReviewCount` 이미 존재**(schema.prisma:442-444) → **DB 신설 0**으로 검수 상태 저장 가능. PLAYBOOK #1(기존 것 고쳐 쓰기) 정합.

### 문서 관리 기준 수립
`docs/DOCS_STANDARD.md` 신설 — docs 299개 MD 누적 대응. 수명별 4분류(영구/누적/시점/만료) · 폴더 단일책임 · 날짜접미사 규약 · 필수헤더 3줄 · 진입경로 4문서 · archive 규칙.

---

## rev87 — 작업1/2/3 배포 검증 (2026-07-23 Desktop · 배포 `bbc1a97`)

### 검증 결과
| 항목 | 실측 | 판정 |
|---|---|---|
| `/api/version` 원본(curl) | `{"sha":"bbc1a976..."}` · `cache-control: max-age=0, must-revalidate` | ✅ 정상 |
| 배포 SHA | `bbc1a97` == HEAD | ✅ |
| 배너 미노출(동일 버전) | 오탐 없음 | ✅ |
| `surfaceRules.test.ts` 독립 재실행 | **10/10 PASS**(T-05·T-08·T-11·T-12·T-13·T-16~T-20) | ✅ |
| SubstituteEditor | `isOutOfStock={dispositionVerdict.action !== 'NONE'}` (page.tsx:890) | ✅ 단일권위 소비 |
| F1 수치 유지 | 꽃밭돌보기 재활성화 1 ↔ 부활소 1 | ✅ 회귀 없음 |

**T-20 통과 = F1 모순(배지↔버튼 불일치)의 회귀 방지가 코드에 고정됨.**

### ★ 검증 방법론 교훈 (#309 신설)
 Desktop이 브라우저로 `/api/version`을 읽었더니 `{"샤":"..."}` — **Chrome 자동번역이 JSON 키까지 번역**해 "버그"로 오판할 뻔함. curl 원본 확인으로 정상 판명. **API 검증은 브라우저 렌더 텍스트가 아니라 curl 원본으로** 한다.

### 미결 — 배너 양성 동작 미검증
"다른 버전일 때 실제로 뜨는가"는 미확인. fetch 가로채기로 가짜 SHA 주입 + focus/visibilitychange 발생시켰으나 60초 스로틀로 즉시 확인 불가. **다음 배포 시 자연 검증됨**(그때 배너가 뜨면 양성 동작 확증). 뜨지 않으면 즉시 조사 필요.

---

## rev86 — F1/F2 프로덕션 검증 PASS · 캐시 함정 발견(#308) (2026-07-23 Desktop · 배포 `543f38b`)

### 검증 결과 — 전수 PASS (강제 새로고침 후)
| 항목 | 실측 | 판정 |
|---|---|---|
| 부활소 판매중지 | **1건** · 플라티코 "판매중지 — 재활성화 검토 필요" | ✅ F1 해소 |
| 꽃밭돌보기 "재활성화 필요" | **1** | ✅ **두 화면 수치 일치** |
| 정원창고 배지 | **"검수 대기 2건 — 씨앗심기에서 확인"** | ✅ F2 해소(#307 준수) |

Code의 F1(getReactivationReason에 INACTIVE/HIDDEN 분기 추가 + 꽃밭돌보기 카운트를 동일 함수 소비로 전환)·F2(조건축 notReady→미발행 · 문구·이동경로 교체) 모두 정확했음.

### ★ 신규 발견 — 브라우저 캐시 함정 (#308 신설)
배포 SHA 3중 일치에도 프로덕션 화면이 **구버전을 렌더** → Desktop이 "수정 실패"로 오판할 뻔했음. DB(status=INACTIVE·pid 존재)·API 응답·코드 경로를 전부 실측해 조건 충족을 확인한 뒤 **reload** 하자 즉시 정상. 
→ **운영자도 같은 함정에 빠진다.** 배포 알림 시 "Cmd+Shift+R 후 확인" 안내 필수. 개선 후보: 앱이 새 버전 감지 시 "새로고침" 배너 노출.

### F3 — 조사 완료, 운영자 결정 대기
일괄 발행 게이트는 필드완성도(`getPublishReadiness`)만 체크 — **검수/승인 개념 없음**. Product에 검수완료 플래그 부재(schema의 reviewedBy/reviewedAt은 다른 모델용). 제안: `reviewApproved`(boolean) 신설 → 씨앗심기 검수 완료 시 세팅 → 일괄발행 카운트에 AND 조건 추가. **스키마 마이그레이션 필요 → 운영자 결정 대기.**

---

## rev85 — 프로덕션 실측 검증 3화면 PASS + 신규 모순 2건 발견 (2026-07-23 Desktop · 배포 `1d50ed1`)

### 배포 확인
`73046a2..1d50ed1` push 완료(6커밋). production SHA = HEAD 일치 3중 확인(verify-vercel-deploy exit 0 · gh api · Desktop Chrome 실측). **#305/#306 적용 후 첫 정상 배포 검증.**

### 검증 3화면 — 전수 PASS
| 화면 | 이전 | 현재 | 판정 |
|---|---|---|---|
| 좀비 부활소 | 미발행 2건 노출(위반) | **전체 0건** · "모두 양호합니다" | ✅ T-19 해소 |
| 정원 창고 | — | 전체 3 · **표시 2**(아이스틀·달항아리) · 발행가능 2 | ✅ 착지 확인(#301/#56) |
| 꽃밭 돌보기 | — | 전체 3 · **표시 1**(플라티코) | ✅ 발행여부 경계 정상 |

### ★ 신규 모순 2건 (다음 최우선)
**F1. 꽃밭돌보기 "재활성화 필요 1" ↔ 부활소 0건** — 플라티코 행이 "재활성화" 버튼을 띄우는데 이동하면 빈 화면. 부활소에만 발행필터를 넣고 꽃밭돌보기 카운트는 자체기준 유지 → **#295 위반이 해소된 게 아니라 이동함**. 두 화면이 같은 판정 소스를 소비해야 해소. 부수: 플라티코는 발행상품인데 부활소 4사유 어디에도 안 잡힐 → 사유 판정 누락 조사 필요.

**F2. 정원창고 "이어서 작성" 배지 미노출** — `notReady`(입력정보 부족) 기반이라 실측 준비미흡 0 → 배지 안 뜰. 부활소가 쓰던 `draft_incomplete`(미발행 상태)와 **다른 축**. 제안: "발행 가능 N건 — 발행하러 가기"로 재정의 또는 기존 "준비된 것 일괄 발행 N" 버튼과 중복이므로 제거. 현상태는 "준비미흡 0"과 "이어서 작성"이 모순(T-20 계열).

---

## rev84 — 미push 5커밋 발견 · 브리지 "9종" 잔존 정정 · Cowork v2 저장 확인 (2026-07-23 Desktop)

- **미push 5커밋 발견** → 원칙 #305(localhost ≠ 프로덕션)·#306(종료 전 push 확인) 신설. Code가 보고한 "브라우저 실측"은 localhost였음.
- **브리지 "9종" 잔존 2곳**(§4 표 · §9 1항) 정정 → **7종 확정**. Cowork 지적이 정확했음(§3 수정만으로 부족했음).
- **Cowork v2 3종 저장 성공 확인** — LIFECYCLE_STATE_MACHINE(6,530B)·COPY_SYSTEM(5,898B)·SURFACE_RULES(6,391B). 폴더 연결 조치(#304)가 실제로 효과 입증.
- **#303 정상 작동 2회** — Code("9종 문서와 7종 표 불일치") · Cowork("브리지도 정정할지 결정 필요") 둘 다 지어내지 않고 멈추어 확인 요청.

---

## rev83 — lifecycle.ts 착지 · 문서오류 정정 · 경계위반 프로덕션 확증 (2026-07-23 Desktop)

### 확정 사실
- **Code 커밋 2건**: `7bdbc0f`(Desktop 저장분 4파일) + `e2048ba`(CLAUDE.md 포인터 · TASK_BRIDGE stale 정정 · **`src/lib/products/lifecycle.ts` 신설**). TSC 0 errors.
- **문서 오류 정정**: 브리지 §3 제목 "7 → 9"는 **오기**. PERIOD_ENDED·ARCHIVED 2종 폐기 + SOURCE_GONE_* 2종 신설 = **총 7종**. 구현(7종)이 정답. Code가 지어내지 않고 확인 요청 → **#303 정상 작동 첫 사례**.
- **경계위반 프로덕션 실측**(Chrome 커넥터): 꽃밭돌보기 = 전체 3개 중 **표시 1개**(플라티코·발행분만) → 발행여부 필터 **정상**. 반면 부활소는 미발행 2건 노출 → **같은 계열 두 화면이 다른 기준** = 위반 확증(추정 아님).
- **Cowork 3종 문서 미저장 발견**: `docs/design/`에 LIFECYCLE_STATE_MACHINE·COPY_SYSTEM·SURFACE_RULES **0건**. 당시 Cowork가 폴더 미연결이라 저장소에 쓸 수 없었음. 채팅 첨부본이 유일본 → **Cowork가 연결된 지금 v2로 직접 저장**해야 함.
- **신규 문서**: `docs/plan/COLLABORATION_PLAYBOOK.md` — 문제해결 방식 지침(기존것 우선·지침 2계층·환경으로 먼저 막기·커넥터 전수시도·증거기반 검증·문서↔구현 불일치 처리).

### 다음 선행
`lifecycle.ts`가 생겼으나 **아직 어느 화면도 소비하지 않는다**(UI 변경 0). 다음은 소비자 연결: 부활소 경계 수정 + 꿀통창고 '이어서 작성' 큐 이식(세트).

---

## rev82 — Cowork 생애주기 설계 검증 + 브리지 v2 확정 (2026-07-23 Desktop)

### ★ Cowork 3종 설계 검증 — 골격 채택 / 도메인 축 이식
Cowork가 **코드 접근 없이 독립 설계**("첨부된 지식 폴더가 비어 있어")한 결과, 실제 스키마·코드와 갭 6건 확정(Supabase information_schema + disposition.ts/source-gone.ts/daily-slots.ts 실독).

| 갭 | 내용 |
|---|---|
| G1 | Cowork 원자 7필드 중 **실재 0개**(isPublished/isArchived/isSuspended/saleStartAt/saleEndAt/requiredFieldsComplete/stock 전부 부재) |
| G2 | **sourceGone(공급처 단절) 상태 소실** — OUT_OF_STOCK로 뭉개짐. 이번 작업의 존재 이유가 빠짐 |
| G3 | 처분 5액션(NONE/MARK_OUT_OF_STOCK/SUSPEND/RESOURCE/DELETE_SAFE) 미반영 |
| G4 | 자산 축 소실 — T-05 "발행 트랙 삭제 전면금지"는 과잉(실제는 자산 유무 분기) |
| G5 | 도메인 오인("화훼 이커머스") → 실제 도매매 드롭십. 기간판매 미사용 |
| G6 | "status 컬럼 제거" 실현 불가(write 3경로+필터탭 사용 중) |

**판정**: 폐기 아님. **골격 채택**(파생 단일함수·발행여부 1급 축·권한 매트릭스·금지조합 테스트·3초룰·T-11 주액션 유일성) + **도메인 축 이식** → `docs/design/LIFECYCLE_BRIDGE_V2_2026-07-23.md` 신설(브리지가 Cowork 문서의 원자·상태·액션을 override).

### 확정 사항
- 파생 상태 **7 → 9**: `SOURCE_GONE_RESOURCE`/`SOURCE_GONE_DELETABLE` 이식. 우선순위 **단절 > 중지 > 품절**(명화 케이스: 중지만 보이면 대체소싱이 숨음).
- **상태 축 ↔ 권고 축 분리**(#300): 배지=진단(9상태) / 버튼=처방(5액션). disposition.ts:139가 이미 SUSPENSION→NONE인 것과 정합.
- **화면 성격 2종**(#301): 보관함(위치·발행여부 분리) vs 작업 큐(조건·발행 전용). disposition.ts:129 `!naverProductId→NONE`이 이미 발행 게이트 내장.
- **부활소 `draft_incomplete` = 경계 위반 확정** → 분기 제거 + `!!p.naverProductId` 필터. 누락 방지로 꿀통창고에 '이어서 작성' 큐 이식(#56).
- 테스트: T-04/T-06/T-07/T-10 폐기(미구현 개념), T-05 수정(자산 축), **T-16~T-20 신규**.

### Code 카테고리 회귀 검증 결과 (읽기전용 · 접수)
| 항목 | 결과 |
|---|---|
| /products 기본뷰 미발행 제외 | ✅ 반영됨(`ccf8e2c` · `all: filter p => !!p.naverProductId`). TASK_BRIDGE:364-367 "미착수" 메모는 **stale → 정정 필요** |
| 부활소 미발행 포함 | 코드 확인(daily-slots.ts:161-163). **정책 판정 = 위반 → 제거**(위 확정) |
| 꿀통창고 2탭 | ✅ 구현됨(garden-nav.ko.json:47-70 · 꿀통 꽃나들이/정원 창고) |

### 커밋 상태
`c5f5290` — Desktop rev81+원칙#295~299+인계 / Code 판정감사·강건성티켓·스모크스크립트 7파일 한 커밋 완료. **코드 변경 0(docs only) → 브라우저 테스트 대상 없음**.

---

## rev81 — DESKTOP-1 처분 7채널 정합 실측 종결 + 생애주기 일원화 착수 (2026-07-23 Desktop)

### ★ DESKTOP-1 실측 종결 — 정합 6/7, 부활소 이탈 확정, 원복 완결
실 DB 주입(inventory_snapshots qty=-1 3행 · now/-1h/-2h 끼임회피) → **sourceGone=TRUE**(선두 연속음수 3) 실측 → 채널1(처분 대기함) 육안 PASS(삭제안전 1건) → 부활소 육안+grep 이탈 확정 → 원복 완결(TESTDISP-* 0 · pid/type NULL).
- 안전조치: 주입 전 pid/status NULL 확인(무손실 원복) · id text타입 확인 · 끼임 교정(실 07-22 양수 위에 3행 안착).
- Cowork 스텁이 못 잡은 "실 DB 행" 정합을 실측으로 증명(이번 사이클 마지막 구멍 종결).

### 채널별 판정
| 채널 | 판정 | 근거 |
|---|---|---|
| 1 처분 대기함 | 정상 | 육안(삭제안전 1건) |
| 2 목록배지 · 3·4 대시보드 · 5 알림 · 7 발행게이트 | 정상(추정) | grep — 육안 미확인 |
| 6 부활소 | **이탈 확정** | 육안+grep (getReactivationReason 자체 status 판정 · daily-slots.ts:143) |

### 신규 발견 (단건 아님 · 전체 확장 대상)
1. 부활소 = 화면간 모순 지시("삭제 권장" 배지 + "등록 완료" 버튼 동시). 근본 = 화면별 자체 분류(#295).
2. products/page.tsx:878 SubstituteEditor 재고0 넛지 = `status==='OUT_OF_STOCK'` 직접 비교(부분 이탈). sourceGone+ACTIVE 케이스 강조 누락. 1줄 수정 후보(일원화 배치).
3. sourceGone 스냅샷 타이밍 취약(#297 · SOURCE_GONE_ROBUSTNESS_TICKET_2026-07-23.md).
4. 카테고리 회귀 의심: 부활소에 미발행("등록 미완료") 노출 = 발행여부 분리(스펙 §1) 미전파(#296) → Code 검증.
5. 상품셋 변화: 명화(검증 baseline #55) → Product 테이블 제거, 플라티코 추가. 교체 경위 확인 필요.

### 작업 큐 (우선순위 · 상태 · 다음 액션)
| P | 작업 | 레인 | 상태 | 다음 액션 |
|---|---|---|---|---|
| 1 | 생애주기 state machine 설계(deriveLifecycleState · 발행여부 축) | Cowork | 착수 | docs/design 3종(LIFECYCLE/COPY/SURFACE) |
| 1 | 판정 일원화 전면 감사(부활소 외 이탈 색출) | Code | 감사분 완료 | 카테고리 회귀 검증 추가 |
| 2 | 처분 스모크 스크립트 커밋 | Code | 대기 | git 커밋(실행은 보류) |
| 2 | sourceGone 강건성 정책확정(연속N vs 최근M중N) | Code | 설계완 | 운영자 확정 후 구현 |
| 3 | 일원화 구현(부활소·SubstituteEditor:878·발행여부 필터) | Code | 대기 | Cowork 설계 확정 후 |
| 3 | 처분 스모크 실행 | Desktop | 대기 | 대상 선정(naverPid有+스냅샷0) |
| — | 명화 판매중지 PUT | 운영자 | 보류 | GO(#46) |
| — | 명화→플라티코 교체 경위 | Desktop | 확인필요 | 다음 세션 |

### 커넥터 노트
Filesystem MCP 다운(#26) → **Desktop Commander로 우회 저장 성공**(#298). 이 rev81도 Desktop Commander로 기입. Code 미커밋 3파일(DISPOSITION_SURFACE_AUDIT·SOURCE_GONE_ROBUSTNESS_TICKET·smoke script)은 Code 커밋 대기.

---

---

## rev93 — 발행전검수 화면 개선 + 꼬띠 페르소나 표면축 신설 완료 (2026-07-30 Desktop 검증)

**배경**: 대표님 스크린샷 기반 "발행 전 검수" 화면 UI/UX 개선 요청(문구 오류·레이아웃 밋밋함) + 이어서 발견된 잔여 사투리 8곳 정리.

**작업1~2 (Desktop 설계, Code 구현, 2026-07-30 오전 세션)**:
- `3532d78` 문구 근본수정 — `simple-crop.ts`의 개발자용 영어 경고 메시지가 화면에 그대로 노출되던 버그의 근본원인(`CropStudioPanel.tsx`가 `warning.message`를 raw 렌더) 확정·해소. `code`→한글 매핑 + 자동후보 2종(주목도·디테일) 중복 dedup. 페이로드 사람표기(가격 콤마, 원산지 라벨, 카테고리 풀네임).
- `994fb91` 레이아웃 재설계 — 1단 세로 스택 → 마스터-디테일 2단 그리드(좌: 이미지 작업 / 우: sticky 결정 패널 — 준비도 게이트·페이로드·검수승인). 상단 고정바(상품명+상태+발행버튼).
- Desktop 브라우저 실측: 아이스틀·달항아리 2개 상품 정상 렌더, 영어원문 0건, 중복 0건, 콘솔 에러 0.

**작업3 (페르소나 표면축, 2026-07-30 오후 세션)**: 검증 중 판단표면(검수·발행 게이트)에 사투리 감탄사("이랴", "~어유")가 남아있는 게 오히려 판단력을 흐린다는 문제를 발견. 조사 결과 `persona-audit.py`가 "사투리 존재=페르소나 적용 완료"로만 판정하는 얕은 기준이 원인(판단표면에도 기계적으로 사투리 삽입을 유도).
- **원칙 #318 신설**: 정원사🌷/카우걸🤠 모드축과 별개로 "친밀 표면"(사투리 허용) vs "판단 표면"(사투리 감탄사 제거, 정확한 톤) 축 추가.
- `e16dcde` `KKOTTI_PERSONA_VOICE_GUIDE.md` §6 신설(§1~5 원문 무변경, 순수 추가).
- `bf72731` 판단표면 8곳(`publish-preview-strings.ko.json`의 error.title·publish.disabledHint·publish.fail·publish.notRegisteredHint·cropStudio.drawHint·editHint·clipWarn·error) 사투리 제거.
- `373cca9` `persona-audit.py`에 `JUDGMENT_SURFACE_KEYS` 반전판정 추가(#283 `CUSTOMER_FACING` 패턴 재사용, #62 준수) — 판단표면은 "사투리 부재"가 정상으로 판정되도록 로직 수정.

**Desktop 실측(직접 git diff 대조 + 재실행 + 브라우저)**:
- git diff로 8곳 값이 지정 스펙과 글자 단위까지 정확히 일치 확인
- JSON 유효성·sentinel 0건·사투리 잔존 0건 확인
- `persona-audit.py` 직접 실행 → "판단 표면 위반 0건 (8개 키 확인)" 재현
- 로컬 dev 서버(전경 프로세스 방식) + 브라우저로 `disabledHint`·`drawHint`·`editHint` 3곳 실제 렌더 확인, `notRegisteredHint`도 코드 기준 확인
- 미검증(정직 표기, #310): `publish.fail`·`cropStudio.clipWarn`·`cropStudio.error`·`error.title` — 인위적 오류 유발 없이는 재현 불가, git diff로만 확인

**★ 부수 발견 — 문서 정합성 사고 (재발방지 기록)**: 이번 세션에서 "CLAUDE.md 축소 2단계"와 "`#311` 게이트 배선"을 낡은 인계 문서를 근거로 "미완료"로 오판, 재작업을 준비하다가 실측(git log, grep)으로 **둘 다 이미 완료돼 있음**을 발견했다. 원인은 `TASK_BRIDGE.md` §3-A 작업큐 보드가 2026-07-22 이후 갱신되지 않고 방치된 것. `docs/handoff/CURRENT.md`에 상세 기록, 향후 세션은 인계 문서의 "미완료" 표시를 그대로 믿지 말고 먼저 실측할 것.

**검증**: tsc 0 errors · 로컬 브라우저 실측(6곳 중 4곳 직접 확인, 2곳 코드리뷰) · sentinel 0건 · JSON 유효성 확인. 브랜치 `feature/preview-copy-then-redesign`(6커밋) 미push — 운영자 결정 대기.

---

## rev94 — 팀 구조 정정 + PRINCIPLES_LEARNED 분할 완료 (2026-07-30 Desktop)

**배경**: 대표님 확정 — "이건 1인 개발이 아니다. 대표님+Claude가 함께 진행하며, 에이전트가 늘어나면 역할이 더 나뉠 것". "1인 개발이라는 단어 이외에 문제되는 내용이 없다면 그렇게 처리"로 범위 한정.

**작업1 (팀 구조 정정)**: 전 활성 문서(archive 제외) 전수 스캔 — `CLAUDE.md`(팀 구조 각주 신설 + 3곳 정정, 이전 세션), `TASK_BRIDGE.md` §4 SD-04(STANDING DECISIONS, 정확히 1건 매치 확인 후 치환), `PRINCIPLES_LEARNED.md` #320(정확히 2건 매치 확인 후 치환). 전부 "1인 개발" 단어만 제거, 문장 나머지 의미 보존. "1인 셀러"·"1인 운영자"(스토어 운영 형태를 가리키는 정당한 표현)와 과거 archive 문서(시점 기록)는 의도적으로 유지.

**작업2 (PRINCIPLES_LEARNED.md 분할, #31)**: 1483줄로 1500줄 임계 근접 → 원칙 #46~#227 구간(131건, 718줄)을 `docs/plan/archive/PRINCIPLES_LEARNED_archived-2026-07-30.md`로 이동. 현재 파일은 #254부터 시작, 763줄(임계까지 여유 737줄 확보).

**손실 0 검증(코드로 증명)**: `git show HEAD:...`로 원본 1483줄을 복원한 뒤, "헤더 + archive본문 + 현재파일본문"을 파이썬으로 재조합해 원본과 라인 단위로 완전 일치(`Match: True`) 확인. 상단 인덱스 표(2026-07-22 분할 시 만든 것, 이제 실태와 어긋난 상태였음)도 함께 정정.

**검증**: tsc 0 errors · sentinel grep 0건(현재파일·archive파일 양쪽) · 손상문자 0건 · 재조합 완전일치 확인.

---

## rev95 — 꼬띠 소싱 에이전트 PRD + 작업 스케줄 보드 신설 (2026-07-30 Desktop)

**배경**: 운영자 요구 — "디스코드 꼬띠 추천이 기존 크롤링 상품 내에서만 나온다. 웹데이터로 시즌·니치 상품을 발굴해 제안하고, 내가 할 일을 자동화해 컨펌만 하게 해달라. 에이전트로 폴더구조를 확장해야 하나?"

**실측 진단(근본원인 확정)**:
- `/api/cron/daily`(08:00 KST)가 `computeRecommendation(products)` 호출 — products = 자사 DB 상품뿐. **이것이 "추천이 부실하다"의 직접 원인.**
- **신규 발굴 엔진은 이미 존재**: `src/lib/sourcing-recommender.ts`(496줄)가 DataLab 트렌드→검색량→경쟁분석→도매꾹/도매매 OpenAPI 실시간 검색→마진계산→황금/니치/시즌 태그까지 수행. **그러나 `vercel.json` crons에 없어 어떤 크론에도 연결 안 됨** → 수동 POST 아니면 절대 실행되지 않음.
- 좀비·품절·마진위기·발행준비 알림은 이미 정상 작동(`computeOpsDigestSignals`).
- `getSeasonContext()`는 6개 이벤트만 하드코딩(발렌타인/화이트/어린이/어버이/빼빼로/크리스마스) — 설·추석·신학기·장마·김장·블프·이사철 전부 누락. "시즌 전략상품"이 안 나오는 직접 원인.

**wikidocs 「Claude 기초부터 고급까지 100」 검토**(034·036·092·097·098 전문 정독, 093~096은 092 템플릿 따르는 역할별 예시):
- 092 Subagents: `.claude/agents/*.md`, 별도 context window, **세션 중에만 동작** → 프로덕션 크론 대체 불가 확인
- 097 구현에이전트: "동시 작업자의 변경을 되돌리지 말라" 지시문 — 다중 레인 환경에 직접 적용 가치 있음
- 098 Agent Teams: **write set 기준 병렬 분리 + 공유 계약 + 통합 담당자** — 운영자의 "작업 흐름 꼬임" 우려에 대한 정확한 해법
- 036 PRD: 범위/비범위 분리로 "알아서 만들어줘" 위험 차단
- 034 디렉터리별 CLAUDE.md: 위험 폴더(naver·discord·prisma)에 경고 배치 — 향후 검토 후보

**산출물**:
| 파일 | 역할 |
|---|---|
| `docs/design/KKOTTI_AGENT_SYSTEM_PRD.md` (신규) | 에이전트 시스템 PRD — 3계층 구분·4역할 파이프라인(정찰병/전략가/검수관/전령)·범위/비범위·수용기준·P1~P5 의존성 그래프·열린질문 4건 |
| `docs/plan/WORK_SCHEDULE_BOARD.md` (신규) | **작업 우선순위·의존성 단일 권위 보드** — READY/PARALLEL-OK/BLOCKED 상태 + write set 표기 + 레인 배분 원칙 |

**신규 원칙**: #321(에이전트 3계층 A/B/C 구분 — 운영자가 원하는 건 항상 C, MCP는 시드 데이터 구축용) · #322(병렬 판단은 write set 겹침 여부로, 주제 유사성 아님)

**구현 계획**: P1 소싱추천 크론 연결+dry-run(🟢READY) → P3 검수관 → P4 앱 브리핑 화면 → P5 피드백 루프. **P2 시즌 캘린더 확장은 P1과 write set 안 겹쳐 병렬 안전**.

**미착수**: 코드 구현 전량(설계만 확정). 디스코드 실발송은 dry-run 검증 후 운영자 승인 필요.

