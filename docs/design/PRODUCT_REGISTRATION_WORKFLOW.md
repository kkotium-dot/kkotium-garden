# 전상품 등록 워크플로우 표준 (Product Registration Workflow)

작성 2026-06-12 · 개정 **rev2 2026-06-15** · #41 핑퐁 · **권위문서(전상품 등록 표준)**

근거(grounded): `docs/playbook/ADAPTIVE_IMAGE_ENGINE_AND_FOLDER_SYSTEM_2026-06-14.md`(§7~§8.11 자산/폴더/정합) + `docs/playbook/FIREFLY_AUTOMATION_PLAYBOOK_2026-06-13.md` + `docs/playbook/SCENT_MOOD_4SCENE_GRADE_2026-06-13.md` + `ADAPTIVE_COMPOSITE_ENGINE.md`(v8 합성) + `OPERATOR_SYSTEM_BLUEPRINT.md`(개입 대기열) + `REPRESENTATIVE_IMAGE_FINISHING_SYSTEM.md` + CLAUDE.md §3-3(카테고리)·§3-6(이미지)·§3-7(v2 FULL REPLACE) + 작업원칙 `#45 #46 #55 #56 #57 #58 #71 #72 #79 #80 #81`.

대상: **전상품 범용**(신규 인제스트 → 네이버 발행 GO 단일 표준). 명화 디퓨저는 검증 사례일 뿐(#55) — 모든 단계는 상품에 종속되지 않고 상품현실시트/충실도카드로 상품별 자동 적응한다.

---

## 0. 한 줄 / 왜 이 문서

공급사(도매매 primary / 도매꾹 fallback) 원본을 네이버 스마트스토어에 등록할 때 **원산지·옵션 재고·고시 규격·이미지**가 추측이나 디폴트로 오염되지 않도록 강제하고, **자산·정합을 상시 시스템으로 보증**하는 전상품 등록 표준. 핵심 원칙: **확정값만 등록, 미확인은 보류 큐**(임의 디폴트 금지), **자산은 항상 정규 경로·라이브 표시·정합 자동감지**, **비가역(네이버 PUT)은 명시 GO에서만**.

---

## 1. 등록 파이프라인 (표준 7단계)

```
STEP 1  인제스트     : 공급사 원본 크롤링 -> DB 적재(원본 보존)
STEP 2  제품정체 확정 : 공급사 실상세 육안 확정(#58) -> 상품현실시트 + 충실도카드 자동생성(#64)
STEP 3  원산지 흡수   : 공급사 원산지 표기 -> 원산지코드 룩업(국산 디폴트 금지, 2장)
STEP 4  옵션·재고 정합: 옵션 트리 + 옵션별 재고 일치 검증(3장)
STEP 5  고시·규격     : 상품고시정보 + 고시 사이즈 -> 스케일 앵커(4장)
STEP 6  이미지 자산   : 누끼->합성/Firefly->정규 stage 적재->정합(5장 + 8장 상시가드)
STEP 7  검수·발행     : 페이로드 전체 재구성 -> readinessGrade -> 대표 GO -> 네이버 발행(비가역 #46)
```

미확인 필드/정합 위반이 하나라도 있으면 STEP 7 진입 금지 -> **개입 대기열**로 빠진다(6장).

**충실도 카드 자동생성 (#64)**: STEP 2에서 공급사 권위 원본(실상세)으로부터 `Product.fidelity`를 자동생성한다 — 향/맛(scents)·부속(components)·마운트(mountType/mountMechanic)·금지데코(decorForbidden)·promptInject·sourceRef. 카드는 이미지 프롬프트 주입(promptInject prepend + decorForbidden 네거티브 + 마운트 물리정합)과 발행 게이트(fidelity_check·mount_check, #56)의 권위. 이 카드 한 장이 STEP 5~6을 상품별로 자동 적응시키는 핵심 — 신상품마다 새 코드가 아니라 새 카드만 생성한다(#55).

---

## 2. 원산지 정합 (공급사 권위 -> 룩업, 국산 디폴트 금지)

**원칙: 원산지의 권위 소스는 공급사 표기.** 코드는 그 표기를 원산지코드 테이블로 흡수만 한다. 표기가 없거나 모호하면 **국산(00)으로 자동 디폴트하지 않고 보류 큐로 보낸다.**

- 룩업: `src/lib/naver/naver-origin-codes.ts`(로컬, 원산지코드.xls 기준). 라이브 API 호출 금지.
- 매핑: "중국/수입+중국" -> `0200037` / "국산/국내산/한국" -> `00` / 부재·모호("기타","해외") -> **보류**(`origin_unconfirmed`).
- 금지: 표기 부재 시 국산(00) 자동 채움(원산지 허위 표기 리스크).
- 검증 사례: 명화 = `originCode=0200037` / `naver_origin=중국`(가역 교정 완료).

> 제조사·수입사: 공급사/상세 표기 권위 흡수, 없으면 '꽃틔움'(메모리 `naver-manufacturer-importer-policy`, 대표 확정).

---

## 3. 옵션·재고 정합

- 옵션 트리(조합형/단독형)는 공급사 원본 구조 보존 + 네이버 옵션 규격 정규화.
- **옵션별 재고 1:1 일치 검증.** 옵션 수 != 재고 행 수면 보류(`stock_mismatch`).
- 재고 수정은 네이버 v2 **FULL REPLACE**(§3-7) — 부분 PUT 금지, GET-merge 경로만.
- 폴링: `src/lib/dome-inventory-poller.ts`(Option C 하이브리드)와 정합.

---

## 4. 고시·규격 (고시 사이즈 -> 스케일 앵커)

- 상품고시정보(카테고리별 고시 항목)는 공급사 표기 흡수 + 미확인 시 보류(`notice_incomplete`).
- **고시 사이즈(실측 W×H×D, 용량) = 합성 스케일 앵커.** 상품현실시트 실측 치수 필드로 직결되어 이미지 단계의 과대·축소를 차단(부재 시 `dimension_missing` 보류).
- 예: 명화 소형 유리병 걸이형 -> 고시 치수가 누끼 프레임 점유율 가이드를 결정.

---

## 5. 이미지 자산 스테이지 (정규 폴더 체계 v2 + 적응형 엔진)

권위 = `ADAPTIVE_IMAGE_ENGINE_AND_FOLDER_SYSTEM_2026-06-14.md`(§7~§8.11). 등록 관점 요약:

### 5.1 정규 폴더 체계 (8단계 · 전상품 동일)

```
{productId}/source/      원본(공급사 실상세·히어로 원본)
{productId}/cutout/       단일 본품 누끼(투명 PNG)
{productId}/plate/        배경판/backdrop 소재
{productId}/reference/    Firefly 참조 슬롯 입력
{productId}/composite/    합성 결과(추가이미지 4:5)
{productId}/thumbnail/    썸네일(1:1)
{productId}/detail/       상세 히어로(세로 긴 비율)
{productId}/archive/      이전본·백필 백업(비가역 백업)
```

- **스토리지 = 진실 원천**, `asset_registry` = 쿼리 보조. 파일은 항상 정규 stage 경로에만(루트/depth-2 금지).
- 파일명 토큰: `YYYYMMDD-HHmm__slug__stage__variant`(angle/mood/slot/context vocab, `asset-naming.ts`).

### 5.2 내용 인식 분류 (#73/#78)

업로드/적재 시 stage 자동 추론 = 파일명 힌트 + Sharp 메타. 신호:
- cutout = `hasAlpha && isOpaque===false`(실제 투명 픽셀만; 불투명 RGBA는 누끼 아님 — #78).
- 1:1 -> thumbnail / 4:5 -> composite / h:w>=2.5 -> detail / 긴변<800px -> 저해상 플래그.
- 이름·내용 충돌 시 둘 다 표시 + 운영자 확인(강제 아님). preflight `POST /assets/classify`로 적재 전 확신도·품질 칩 표시.

### 5.3 비율 정규화 2층 방어 (#72)

- composite=4:5 / thumbnail=1:1, 2% 허용오차 게이트. `/assets/upload` + `/ingest-firefly` 양 경로에서 `conformToSlotRatio`(opt-out 가능). 편집모드 비율 컨트롤 부재를 파이프라인이 보정.

### 5.4 생성 레인 (realism lane #71)

- **AUTHENTIC-ART**(라벨/예술작품 슬롯): 퍼블릭도메인 실제 작품만.
- **PHOTOREAL**(히어로·라이프스타일·향씬·합성·썸네일·추가 전부): 실사 카메라 품질. **AI 유화/회화 마감 전면 금지.** 비명화 상품도 PHOTOREAL 보편 적용(#55).
- 누끼는 실사 단일 본품 풀컨테인먼트(#57), 제품정체는 공급사 실상세 대조 확정 후에만(#58).

### 5.5 Firefly 자동화 (#74/#77)

- 셀렉터·실행 = `FIREFLY_AUTOMATION_PLAYBOOK_2026-06-13.md`(shadow-DOM textarea native-setter / ratio "와이드스크린 (16:9)" / 1K->2K / grounding sp-switch / Remove-ref positional / generate PointerEvent).
- 생성 전 가드: `generateModeConfirmed`(ACTIVE 마스크/참조잠금만 ABORT) + `settingsVerified`(ratio·resolution·grounding·reference 4플래그).
- **자동 재시도 타이머 금지(#72)** — 단발 timeout만(과거 크레딧 소진 사고).
- 적재: `POST /api/products/[id]/ingest-firefly`(base64 -> 정규 stage -> registry -> publicUrl). 무드 배경은 향/맛의 감각 무드를 표현(리터럴 사물 아님), variant별 구분(SCENT_MOOD 권위).

### 5.6 대표·표시 정책

- 대표(1번): 흰배경 단일 본품 누끼(REP_FINISHING 규격 — 텍스트·가격·라인업 금지, 네이버 대표 규정).
- `main_image_policy`: 대표 override 시 사유 로깅(예: 라이프스타일 유지 = "1호 사례").
- 추가(2~9)·상세: 참조 드롭 하모나이즈 -> 형태 가드 -> 실패 시 결정론 폴백(sharp).
- 모든 이미지 적용은 **가역**(extra_images 슬롯·이전 자산 archive 보존). 발행 PUT만 비가역(#46).

---

## 6. 개입 대기열 (전상품 공통 개입점 · #56)

미확인/정합 위반/검토필요는 발행을 막고 Operator Action Queue 카드로 **자연스럽게** 노출(숨김·강제순서 금지, 강제모달 0). product-agnostic 카드 카탈로그:

| 카드 | 트리거 | 해소 |
|---|---|---|
| `origin_unconfirmed` | 원산지 표기 부재/모호 | 공급사/대표 확정 -> 룩업 흡수 |
| `stock_mismatch` | 옵션-재고 행 불일치 | 옵션 트리/재고 정합 |
| `notice_incomplete` | 고시 필수항목 누락 | 고시 항목 보강 |
| `dimension_missing` | 실측 치수 부재 | 치수 입력(스케일 앵커) |
| `fidelity_check` | 충실도카드 보유 상품 대표/추가 확정 | 충실도 체크리스트 통과 |
| `mount_check` | 마운트 물리정합 검토 | 마운트 규격 확인 |
| `firefly_auto` | Firefly 생성 대기 | 생성모드 + 설정 4플래그(ratio·resolution·grounding·reference) 확인 |
| `asset_integrity` | 정합 드리프트(depth-2/dead ref/비율) | 1클릭 교정(루트->정규 stage 이동·ref 리맵, confirm 게이트) |
| 발행 신호등 | readiness 미충족 | 채워야 할 항목(상세·대표·SEO·키워드·설명·골든키워드·원산지·제조사 고시) |

해소 전 발행 GO 금지. 게이트 통과 후에만 STEP 7. 발행 관제탑(`/dashboard`)이 발행가능/보완/발행불가 신호등으로 한눈에 표시.

---

## 7. 발행 (비가역 #46)

- 네이버 v2 등록/수정 = **전체 페이로드 재구성**(`buildNaverProductPayload`) — 부분 PUT 금지(§3-7).
- `dryRun`으로 전체 payload + `readinessGrade`/`readinessScore`(`row.publish.readinessGrade`) 미리보기.
- 실 PUT은 `confirm:true && !dryRun`에서만, **그리고 대표의 명시·구체 GO에서만**(#46). 거짓 성공 라벨 금지.
- 카테고리: 로컬 `NAVER_CATEGORIES_FULL`(라이브 API 금지, §3-3).
- 발행 후 적용 현황 명시(#54), 가역 자산은 스토리지 보존.

---

## 8. 전상품 상시 시스템 가드 (Standing Guards · 단건 수습 금지)

발견된 오류는 단건 수습이 아니라 **전상품 시스템 + 개입점**으로 확장한다(운영 철학). 현재 상시 가드:

### 8.1 자산 리스팅 라이브 (#80)

- `/api/products/[id]/assets`·`listProductAssets`는 스토리지를 **라이브**로 읽는다(`getServerClient`가 `cache:'no-store'` 주입 + route `fetchCache='force-no-store'`). 백필/remap 등 앱 외부 변동도 즉시 반영. (배경: Next Data Cache 잔류로 stale 리스팅 사고 — depth-2 죽은 URL 표시·신규 자산 누락.)

### 8.2 자산 정합 가드 (#81)

- `checkProductIntegrity` = depth-2/root 잔존 + dead ref(라이브 리스팅에 없는 product-assets 키 = 404; Product 전컬럼 중첩 jsonb + asset_references + published_assets **전수스캔**) + (옵션) 비율 비정규.
- 드리프트 시 `asset_integrity` 개입 카드 시드(멱등·best-effort), 정합 OK면 클리어. 1클릭 교정(루트->정규 stage 이동·원본 archive 백업·dangling-only ref 리맵, confirm 게이트 #46).
- cron `asset-integrity-sweep`(KST 자정) 전상품 상시 점검. 엔드포인트 GET=점검 / POST seed(드리프트 있을 때만 카드) / fix.

### 8.3 백필 + 전수 ref 정합 (#79)

- 레거시 depth-2 자산은 `scripts/backfill-legacy-assets.ts`로 정규 stage 이동(COPY->DB갱신->검증->retire, 멱등·이중게이트).
- ref 감사/치환은 **하드코딩 컬럼·테이블 리스트 금지 -> 전수스캔**(전체 row JSON 표현 스캔, 중첩 jsonb 포함). `scripts/remap-depth2-refs.ts` = dangling-only(원본 부재 && 정규 존재일 때만)·dry-by-default·사후 잔존 depth-2 ref=0 자가검증.

### 8.4 분류·비율 (#73/#78/#72)

- 5.2~5.3 분류기·비율정규화가 적재 시점에 상시 작동 -> 미래 파일도 자동 정규화.

---

## 9. 작업 시 명심 (Operating Principles · 매 작업 적용)

| # | 원칙 | 실무 의미 |
|---|---|---|
| #45 | production-first 검증 | 보고를 그대로 믿지 말고 Vercel+Supabase+브라우저로 직접 실측. 화면 stale 에러는 코드+MD와 교차확인. |
| #46 | 비가역 0 | 네이버 PUT 등 비가역은 대표의 명시·구체 GO에서만. 거짓 성공 라벨 절대 금지. |
| #55 | 전상품 범용 | 단건 코드 금지. 명화는 검증 사례. 신상품은 새 코드가 아니라 새 충실도카드. |
| #56 | 자연스러운 개입 | 모든 개입점은 자연/유연하게 표면화(숨김·강제순서 금지). |
| #57 | 누끼 본질 | 실사 단일 본품·풀컨테인먼트, 3D 품질 보존. |
| #58 | 제품정체 우선 | 공급사 실상세 대조 확정 전 이미지 작업 금지. |
| #71 | realism lane | 라벨=퍼블릭도메인 실작품, 그 외 전부 실사·AI 회화마감 금지. |
| #72 | 타이머 금지 | Firefly 자동 재시도 타이머 금지(크레딧 소진). |
| #79 | 전수스캔 | ref 감사/치환 하드코딩 리스트 금지. |
| #80 | 라이브 리스팅 | 자산 표시 캐시 stale 금지(no-store). |
| #81 | 정합 상시감지 | 드리프트는 단건 수습 아닌 상시 감지 + 개입카드. |

**코드 컨벤션(확약)**: JSX/주석 이모지 금지(Lucide만)·주석 영어·한글 타입 리터럴 금지·`src/lib/prisma.ts` 싱글톤만·외부 image API 0(Sharp만)·커밋 전 `tsc --noEmit` 0 + build 0·additive·비가역0.

---

## 10. 신규 상품 등록 체크리스트 (per-product · 복사해서 사용)

```
[ ] STEP1 인제스트: 공급사 원본 크롤링·DB 적재(원본 보존). 소싱 도매매 우선.
[ ] STEP2 제품정체: 공급사 실상세 육안 확정(#58) -> 상품현실시트 + 충실도카드 자동생성(#64)
[ ] STEP3 원산지: 공급사 표기 -> 룩업 흡수(국산 디폴트 금지). 모호 시 origin_unconfirmed
[ ] STEP4 옵션·재고: 옵션 트리 + 옵션별 재고 1:1. 불일치 시 stock_mismatch
[ ] STEP5 고시·치수: 고시 항목 + 실측 치수(스케일 앵커). 누락 시 notice_incomplete / dimension_missing
[ ] STEP6 이미지:
      [ ] 누끼(cutout, 실사 단일본품 #57) -> Supabase 즉시 영구화
      [ ] 대표(흰배경 누끼·REP 규격) / 추가(composite 4:5) / 썸네일(1:1) / 상세(detail)
      [ ] Firefly 무드 배경(realism lane #71·설정4플래그·생성모드 가드) -> ingest-firefly 분류적재
      [ ] 정규 stage 경로 적재(루트/depth-2 금지) -> /assets 라이브 표시 확인(#80)
      [ ] 정합 점검 ok(depth-2 0·dead 0) — asset_integrity 카드 없음 확인(#81)
[ ] STEP7 발행:
      [ ] dryRun 전체 payload + readinessGrade 확인(보류 큐 전부 해소)
      [ ] 발행 관제탑 신호등 = 발행가능
      [ ] 대표 명시·구체 GO 수령(#46) -> confirm:true && !dryRun PUT
      [ ] 발행 후 적용 현황 명시(#54) + 가역 자산 보존
```

---

## 11. 이미지 무드-카메라 시스템 연결 (2026-06-16 rev3)

STEP6 이미지 생성은 단일 디폴트 카메라가 아니라 **무드 6축 시스템**으로 처리한다(전상품 공통, 상품별 코딩 0).

- **흐름**: 무드 6축 채점(M1 신뢰/M2 욕망/M3 명료/M4 코지/M5 발랄/M6 프리미엄) → Layer1 카메라 스펙 조회 → Layer2 프롬프트 조립(가변+조회+고정) → Layer3 가드 통과 → 생성 → 평점/즐겨찾기 학습.
- **고정 규칙**: 제외는 긍정형(Gemini 네거티브 필드 없음), 매 컷 참조 클리어, 그레이드 통일, 단일 디폴트 카메라 금지.
- **권위**: `docs/design/MOOD_CAMERA_SPEC_SYSTEM.md`. 근거: `docs/research/MOOD_TO_CAMERA_SPEC_RESEARCH_2026-06-16.md`. 편집모드 운영: `docs/playbook/FIREFLY_AUTOMATION_PLAYBOOK_2026-06-13.md` §9.
- **firefly_auto 카드 subcheck**: cameraVarietyApplied·referenceCleared·settingsVerified·exclusionsPresent·benchmarkDnaSet 추가(#84/#83/#85/#86).

---

## 변경 이력

- 2026-06-16 (rev3) — STEP6 이미지에 무드-카메라 6축 시스템 연결(§11). 단일 디폴트 카메라 금지·긍정형 제외·참조 클리어·트러스티드 클릭을 전상품 가드로 codify. 권위 = MOOD_CAMERA_SPEC_SYSTEM + FIREFLY_AUTOMATION_PLAYBOOK §9 + PRINCIPLES_LEARNED #82~#86.
- 2026-06-15 (rev2) — 자산 폴더 체계 v2(8단계)·내용인식 분류(#73/#78)·비율정규화(#72)·realism lane(#71)·Firefly 자동화(#74/#77)·대표/표시 정책(main_image_policy)을 STEP6에 codify. §8 전상품 상시 가드(라이브 리스팅 #80·정합 가드 #81·백필/전수스캔 #79·분류/비율) 신설. §9 작업 시 명심(원칙 인덱스 + 코드 컨벤션) 신설. §6 개입 대기열 카드 카탈로그 확장(fidelity_check·mount_check·firefly_auto·asset_integrity·발행 신호등). §10 신규 상품 등록 체크리스트 신설. 권위 = ADAPTIVE_IMAGE_ENGINE_AND_FOLDER_SYSTEM §7~§8.11 + FIREFLY_AUTOMATION_PLAYBOOK + SCENT_MOOD_4SCENE_GRADE + OPERATOR_SYSTEM_BLUEPRINT.
- 2026-06-12 — STEP 2 충실도카드 자동생성(#64) 명문화 + 발행 게이트(fidelity_check·mount_check) 연결.
- 2026-06-12 (v1) — 신규 작성. 원산지(공급사 권위->룩업)·옵션 재고 정합·고시 사이즈 스케일 앵커·v8 이미지 스테이지·보류 큐 게이트 단일화.
