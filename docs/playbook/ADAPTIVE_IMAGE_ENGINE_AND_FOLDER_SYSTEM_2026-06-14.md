# 적응형 이미지 엔진 · 폴더 자동분류 시스템 · Firefly 운영 규칙

- date: 2026-06-14 / 세션7-h (Desktop)
- scope: product-agnostic 전상품 공통 시스템 (#55). 명화 = 검증 케이스
- parent: `docs/playbook/IMAGE_SEO_PIPELINE_PLAYBOOK.md`, `docs/plan/ASSET_FOLDER_TAXONOMY_BUILD.md`, `docs/playbook/SCENT_MOOD_4SCENE_GRADE_2026-06-13.md`
- principle: 발견 오류는 단건 수습이 아니라 프로젝트 전체 확장 적용

---

## 0. 이번 세션 실측 사실 (추측 아님 · #45)

| 검증 | 결과 | 근거 |
|---|---|---|
| 스토리지 폴더 분류 | composite/·cutout/ = 서브폴더 정상 / backdrop·detail-source·thumb-* = 루트 평면 레거시 | `storage.objects` 쿼리 |
| 표준 writer | `uploadAutomationAsset()` → `{pid}/{kind}/{variant}-{ts}.{ext}` 전 신규자산 강제 분류 | `automation-storage.ts` |
| 자동분류 엔진 | `kindForSource()` 정규식 8단계(source/cutout/plate/reference/composite/thumbnail/detail/archive) | `asset-taxonomy.ts` |
| 레거시 평면파일 | **의도적 미이전** (URL 유효 유지, reader가 양쪽 읽음) = 버그 아님, 백필 대상 | 코드 주석 |
| 편집모드 비율 컨트롤 | **존재하지 않음** | DOM 실측 (ratioControls=[]) |
| Firefly 차단 | 크레딧 정상(1340/3000)인데 "사용 문제/나중에 다시 시도" = 레이트리밋 쿨다운 | DOM 실측 |

---

## 1. 비율 불일치 — 근본 원인 + 시스템 해결

**원인:** 편집모드(Gemini/Nano Banana)엔 종횡비 UI 컨트롤이 없다. 비율은 (a) 프롬프트 (b) 참조 이미지 비율 상속 (c) 모델 기본값으로 결정 → 세션마다 다른 참조/기본값이 섞여 출력 비율이 제각각.

**시스템 해결 (단건 수습 금지, 전상품 확장):** 2층 방어.
1. **생성 시점** — 참조 0 강제(비율 상속 차단) + 프롬프트에 "vertical composition" 유지(약한 유도). 비율 UI가 없으므로 생성 단계 통제는 약하다 → 2층이 본질.
2. **파이프라인 시점 (진짜 해결)** — 앱 Sharp 정규화 단계가 **모든 자산을 슬롯 규격 비율로 강제**. Firefly가 어떤 비율을 뱉든 슬롯 비율로 착지. 향 씬=4:5, 대표/썸네일=1:1, 상세=슬롯별. → "비율 통제를 사람이 매 컷 하는 게 아니라 파이프라인이 보장."

**개입점:** 스튜디오/관제탑에 슬롯별 목표 비율 표시 + 비율 불일치 자산 경고(기존 fidelity 가드 동형).

---

## 2. 적응형 생성 설정 매트릭스 (모델 · 표면 · 비율 · 구글검색)

법적 안전 무관, 이미지별 최고 품질 기준(작업 고정). 슬롯별 기본값 = 앱 config로 인코딩(매번 즉흥 결정 금지 = 자연 개입점).

| 이미지 종류 | 표면 | 모델 | 생성바 비율 | 구글검색 | 앱 정규화 |
|---|---|---|---|---|---|
| 향 씬(scene) | 편집모드 | Nano Banana Pro | (컨트롤 없음, 프롬프트 vertical) | ON | Sharp → 4:5 |
| 히어로 | 편집모드 | Nano Banana Pro | 동상 | ON | Sharp → 슬롯 |
| 라이프스타일 | 편집모드 | Nano Banana Pro | 동상 | ON | Sharp → 슬롯 |
| 합성(cutout+scene) | 편집모드 | Nano Banana Pro | 입력 유지 | OFF | Sharp → 슬롯 |
| 누끼(cutout) | Adobe MCP remove-bg | - | - | - | 투명 PNG |
| 썸네일/대표 | 합성·소스 크롭 | - | 1:1 | - | Sharp → 1:1 |
| 진짜 명화(라벨·S5) | 없음 | 실제 PD | 원본 | - | 원본 |

**구글검색 로직:** ON = 실물(레몬/린넨/체리) 정확도가 중요한 신규 photoreal 씬 → 그라운딩이 실물 형태·질감 정확도 ↑ = AI 이질감 0(#71). OFF = 합성(기존 cutout 편집, 외부 레퍼런스 유입 차단)·추상 텍스처.

---

## 3. 폴더 자동분류 — 현황 + 레거시 백필 (전상품)

**현황: 시스템 정상 구축됨.** 신규 자산은 전부 `{pid}/{kind}/` 자동분류. 레거시 평면파일만 미이전(설계상 backward-compat).

**개선(버그 수습 아님): 레거시 백필 마이그레이션 — 전상품 일괄.**
- 대상: `{pid}/*.{png,jpg}` 루트 평면파일 (서브폴더 미소속)
- 분류: 파일명 → `kindForSource()` → 대상 `{pid}/{kind}/`
- 처리: storage copy → DB URL 참조 갱신 → 원본 archive 또는 삭제
- 안전: dry-run 리포트 먼저(이동 예정 목록) → 운영자 GO → 실행 (#56 개입점)
- 멱등: 이미 서브폴더 소속 파일은 스킵

**반자동 업로드 현황:** 라우트 존재(`/api/products/[id]/assets/upload`, `/upload`, `/products/upload`). 개선 = 업로드 UI가 `kindForSource()` 추론 단계를 **표시 + 운영자 오버라이드** 허용(자연 개입점). 드롭 → 추론 stage 칩 표시 → 확인/변경 → 정확 서브폴더 적재.

---

## 4. 데스크톱 로컬 정리 규칙 (개선안)

앱은 Vercel(웹) → 다운로드는 브라우저 Downloads로 떨어짐. 앱이 데스크톱 폴더를 직접 못 만든다. 3단 처방:

1. **파일명 규칙(즉시·무인프라):** `{YYYYMMDD-HHmm}__{상품slug}__{stage}__{variant}.{ext}`. 평면 Downloads에서도 날짜정렬 + 상품/stage grep 가능.
2. **상품별 ZIP 내보내기(앱 기능):** "이 상품 자산 전체 내보내기" → 서버가 `{stage}/{file}` 구조로 zip → 운영자 1상품=1zip 해제.
3. **로컬 정렬 헬퍼(Code CLI 스크립트, 선택):** ~/Downloads 감시 → 규칙 파일명 → `~/Desktop/KKOTIUM_ASSETS/{상품}/{stage}/`로 이동.

**폴더 계층 권고 = 상품우선(날짜우선 아님):**
`~/Desktop/KKOTIUM_ASSETS/{상품명}__{pid8}/{stage}/{YYYYMMDD-HHmm}_{variant}.{ext}`
- 근거(devil's advocate): 날짜>상품 구조는 한 상품 자산이 여러 날짜 폴더에 흩어져 전체 보기 어려움. 상품우선은 한 상품 자산을 한곳에 모으고 **Supabase({pid}/{stage}/) · Adobe CC(KKOTIUM_GARDEN/{NN_stage}/)와 동일 멘탈모델** = 세 위치 일관. 날짜는 파일명에 보존 → Finder 검색으로 날짜뷰 즉시.

---

## 5. 통합 적응형 이미지·SEO 엔진 — 흐름 + 개입점 (전상품)

상황별 융통 + 개입점 자연스럽게. 슬롯마다:
1. **평가** — 소스 품질 스코어 → 모드(Simple 70+/Enhance 40-70/New <40)
2. **설정** — §2 매트릭스에서 모델·표면·구글검색·목표비율 자동선택
3. **생성/처리** — 표면 라우팅(편집모드 Nano Banana / Adobe MCP 누끼 / Sharp 크롭)
4. **정규화** — Sharp → 슬롯 비율·규격 강제(§1)
5. **자동분류 적재** — `kindForSource()` → `{pid}/{kind}/`(§3)
6. **SEO 메타** — alt·파일명·슬롯 매핑(네이버 SEO)
7. **개입점(#56)** — 관제탑/스튜디오 표면화: 사실성 레인 가드(#71)·비율/슬롯 경고·레거시 백필 확인·발행 GO. 강제 순서 없이 자연 노출(개입 대기열).

---

## 6. Firefly 운영 규칙 (이번 세션 학습 — 박제)

- **자동재시도 타이머 절대 금지.** setTimeout/setInterval로 생성 자동발사 = 크레딧 소모 + 쿨다운 무한 리셋. 이번 차단의 실제 원인. 생성은 항상 단발 수동 트리거.
- **레이트리밋("사용 문제/나중에 다시 시도") = 요청 0으로 실제 시간 경과만이 해제.** 두드리면 쿨다운 리셋되어 악화. 크레딧 정상이어도 발생(횟수 기반 단기 throttle).
- **생성 전 항상 참조 0 확인** (비율 상속 + 교차오염 차단, #71).
- **Control Chrome + Filesystem write 동시 금지(#26).** 브라우저 작업과 MD write는 같은 턴에서 순차 분리.

---

## 7. 구현 박제 (세션7-h Code · 2026-06-14)

### 7.1 백필 dry-run 실측 (#45 추측 아님)

`scripts/backfill-legacy-assets.ts` 기본 dry-run 출력 = **20개 / 3상품** (Desktop 실측 스펙과 1:1 일치):

| pid | 건수 | 비고 |
|---|---|---|
| cmp3afb45…0qpc | 9 | backdrop-S6→plate / cutout→cutout / detail×5→detail / thumb-clean×2→thumbnail |
| cmpnooli4…8iim | 10 | backdrop×2 + myeonghwa-backdrop-860→plate / detail×3→detail / thumb×4→thumbnail |
| cmpp62yje…wx0 | 1 | detail-source→detail |

- 제외 정상: `common/` · `lifestyle/` 비상품 네임스페이스 (Product 테이블 미존재) = 4건 영구 제외.
- **고정이름 자산 재배치 안전성 검증완**: `cutout.png`→`{pid}/cutout/`, `backdrop-S*.png`→`{pid}/plate/` 로 이동해도 `findCachedAsset`이 root miss 후 STAGE_DIRS(cutout·plate 포함) 순회로 그대로 해소 = asset-source-resolver 무영향.
- 실행 게이트: 기본 dry-run(무변경). 실행은 `--go --confirm` 이중 게이트 + 운영자 GO 필요(#46).
- 순서 박제: **COPY → DB URL 갱신(Product.mainImage/images/extra_images + AssetRegistry.path/stage/fileName) → 새 URL 도달 검증 → 원본 retire(archive 이동 또는 archive-kind는 삭제)**. move-then-update 절대 금지(라이브 URL 중간 404 방지).

### 7.2 분류기 결함 A·B 수정 (전상품·미래파일) + GO결정 3건

- **결함 A (backdrop)**: `kindForSource` plate 규칙에 `backdrop` 토큰 추가. backdrop = 합성 입력 배경 플레이트(asset-source-resolver가 `backdrop-{skeletonId}.png` 로드). **GO결정 #2 = plate** (운영자 승인).
- **결함 B (archive 순서)**: archive 규칙(prev/old/backup/reject/deprecated)을 composite/detail/thumbnail **앞**으로 이동 = 폐기 마커가 콘텐츠 마커보다 우선. cutout/reference/plate는 archive보다 앞 유지(라이브 작업자산은 스테이지 유지). **GO결정 #3 = 선행 교정** (운영자 승인).
- **GO결정 #1** = 백필 실행 승인 (dry-run 검토 후 `--go --confirm`, 본 턴 미실행·대기).

### 7.3 비율 정규화 2층 방어 배선 (task2)

- 신규 `src/lib/config/image-slot-matrix.ts` (§2 매트릭스 영문 상수화) + `src/lib/images/slot-ratio.ts`(Sharp `conformToSlotRatio`).
- 적재 경로 **둘 다** 보강: `/assets/upload`(반자동) + `/ingest-firefly`(Firefly 캐치베이슨). `ratioSlotForStage(stage)` → composite=4:5 cover / thumbnail=1:1 contain-white. 그 외 스테이지(source/cutout/plate/reference/detail/archive)=무변경.
- 허용오차 2% 게이트: 이미 슬롯비율인 출력은 무재인코딩 통과(=정규화는 비순응 자산만 교정하는 게이트). `normalize=false`로 옵트아웃.

### 7.4 신규 작업원칙 박제 (PRINCIPLES_LEARNED + CLAUDE.md)

- **#72** — 자동재시도 타이머 절대 금지 (setTimeout/setInterval 생성 자동발사 = 크레딧 소모 + 쿨다운 무한리셋). 생성은 항상 단발 수동.
- **편집모드 비율컨트롤 부재 → 파이프라인 정규화로 해결** (생성단계 통제 약함 = 2층이 본질, §1).
- **레거시 백필 = 시스템 개선** (단건 버그 수습 아님, 발견 오류는 전상품 확장, §3).
- **비상품 네임스페이스 제외** (common/lifestyle = 안정 URL, 백필·재분류 대상 아님).

---

## 8. 세션7-i 박제 (2026-06-14 Code) — 내용인식 분류 + IA 3탭 + 한글화 + 인앱삭제

### 8.1 브라우저 검증 (Desktop 실측 · #45)
- task4 추론칩+오버라이드+명시확인 PASS / task2 정규화 PASS(1376×768→614×768=4:5) / task5 ZIP PASS / 토큰추론 PASS. 테스트파일 운영자 대시보드 삭제 완료.

### 8.2 내용 인식 스테이지 분류 (전상품·근본개선)
- 현(파일명 정규식only)→개선(파일명 힌트 + Sharp 메타신호 결합). 신호: 알파→cutout / 1:1→thumbnail / 세로4:5→composite / h:w≥2.5→detail / 긴변<800px→저해상 품질플래그.
- 결정: 일치=고확신 / 이름XOR내용=보통 / 충돌=둘다표시+확인유도(낮음) / 무신호=thumbnail 폴백 (이전 무조건 thumbnail 개선 = 이름 무힌트 시 내용신호로).
- 구현: classifyAsset(asset-classify.ts) 순수함수 + kindHintForSource(힌트/디폴트 분리). /assets/upload·/ingest-firefly가 메타(alpha/channels) 추가 읽기 → recommendedStage + confidence + qualityFlags + conflict 응답(additive). 신규 preflight POST /assets/classify(무적재) → 칩이 업로드 전 확신도·품질·충돌 표시.

### 8.3 워크벤치 IA 5탭→3탭 (등록 여정順)
- 1 상품 분석 / 2 이미지(대표·썸네일 + 상세 페이지 + 자산 정리 = 3하위영역) / 3 발행. WorkbenchTabs grouped 모드(opt-in) — 미전달 시 기존 4/5탭 폴백(회귀0). 카드 로직 보존(순수 레이아웃·패널 상시 마운트로 상태 보존).

### 8.4 한글화 (음차 적발·표면)
- 단계(←스테이지)·배경판(←플레이트)·참고 이미지(←레퍼런스)·자동 분류(←추론된 스테이지)·이 단계로 올리기(←이 스테이지로 적재)·폴더 경로 복사(←경로 복사)·원본(←원본(생성 raw))·이전 방식(←레거시). 유지: 누끼·합성·SEO·AI·ZIP·Firefly. firefly_generate=이미 'Firefly 생성'(완료)·step1/step2 2단계 메시지=리터럴 부재(이미 한글/코드내부). ko.json 음차 sweep 0.

### 8.5 인앱 삭제 (에셋 브라우저)
- /assets/action에 delete 추가(deleteAutomationAsset 경유) — 2단계 확인게이트(비가역 #46, confirm:true)·assetRegistry 행 동시제거·대표 참조 시 차단·추가이미지 참조 시 de-ref. 테스트/반려 자산 인앱 정리(SQL 직접삭제 RLS 42501 차단 우회).

### 8.6 신규 영구원칙 3종 (#73 · 모든 UI작업 기본전제)
- 직관우선·과밀금지 / 한글우선 라벨(코드영어·표면한글) / 작업여정 정합(IA=사용자 여정順).

### 8.7 분류기 누끼 신호 교정 (세션7-i 검증 BUG · 전상품·전PNG)
- **버그**: cutout 트리거가 `hasAlpha`(알파 채널 존재)였음. canvas/Firefly/디자인툴 PNG는 불투명이어도 RGBA(4채널) = 알파 채널 보유 → 전 PNG가 누끼로 오분류. 스모크가 '알파有·불투명 PNG' 케이스 누락 = 사각지대.
- **Desktop 실측 증거**(같은 치수 PNG vs JPEG, /assets/classify): 1000² PNG→cutout(오)·JPEG→thumbnail(정) / 400×1200 PNG→cutout(오)·JPEG→detail(정) / 900×1125 PNG→cutout(오)·JPEG→composite(정).
- **교정**: cutout 신호 = `hasAlpha && (await sharp(buf).stats()).isOpaque === false`(실제 투명 픽셀 존재). 불투명 RGBA → 누끼 신호 무시 · 비율 신호(thumbnail 1:1 / composite 4:5 / detail h:w≥2.5)로 폴백. `isOpaque` 미산출(null) 시 누끼 단정 금지(비율 폴백 = 안전 디폴트).
- **신호 일원화**: 3경로(/assets/classify · /assets/upload · /ingest-firefly) 모두 `meta.hasAlpha` 일 때만 `sharp(buf).stats()` 추가 1회 호출(JPEG는 비용0). classifyAsset 시그니처에 `isOpaque` 추가 + 결과에 `hasTransparency` 노출. /assets/classify 응답에 `isOpaque`·`hasTransparency` 추가 → 칩에 '투명 배경' 사유 표시.
- **재검증(sharp 실이미지 7/7 PASS)**: 1000² 불투명PNG→thumbnail / 400×1200 불투명PNG→detail / 900×1125 불투명PNG→composite / 투명배경PNG→cutout / JPEG 3종 회귀 전부 정답.
- **교훈**: 콘텐츠 신호는 채널 '존재'가 아닌 실제 '상태'로 판정한다(알파 채널 ≠ 투명). 메타데이터 플래그가 의미를 단정하지 않음 = 픽셀 통계로 확증.

### 8.8 삭제 확인 UX 업그레이드 (#73 직관우선·오삭제 방지)
- 기존 익명 native confirm 2단계(대상 미표기) → 커스텀 모달: 썸네일 + 자산명 + 단계 라벨 + 용량 · '되돌릴 수 없습니다(스토리지 영구 제거)' 비가역 경고 · 추가 이미지 참조 시 '자동 해제' 안내 · 대표는 진입 전 차단. 모달 confirm만 실 삭제 트리거(비가역 #46, confirm:true 유지).

### 8.9 백필 'dangling 0' 정정 — DB ref 감사/치환 EXHAUSTIVE 전환 (2026-06-15 Desktop #45 적발)
- **정정**: 직전 백필의 'dangling 0' 보고는 부정확. Desktop to_jsonb 전수스캔서 1건 적발 — `Product.quality_reasons`(jsonb·cmpnooli4)에 구 depth-2 URL `/.../detail-S6-1779884981263.png`(404) 잔존. 근본원인 = updateDbRefs와 사전감사가 **하드코딩 컬럼리스트**(mainImage/images/extra_images/+*_url) 사용 → jsonb 컬럼 quality_reasons 누락.
- **instance 교정**: 캡처 후 정규 URL `/.../detail/detail-S6-1779884981263.png`로 치환(storage 200 확인·구 depth-2 400). 1필드/1치환.
- **class 근본수정(전상품)**: updateDbRefs·residualRefCount를 **컬럼리스트-FREE**로 전환 — 전체 row를 fetch해 모든 컬럼의 JSON 표현을 스캔(중첩 jsonb 포함), 변경된 컬럼만 기록. 사후 자가검증도 `to_jsonb(row)` 전수스캔으로 depth-2 ref=0 확인. 대상: Product 전컬럼 + asset_references + published_assets + asset_registry. 신규 `scripts/remap-depth2-refs.ts`(dangling-only 규칙: depth-2 원본 부재 && 정규 존재일 때만 치환·dry-by-default·자가검증). 사후 전3상품 잔존 depth-2 ref=0.
- **taxonomy LOW(GO#3 확장)**: `backdrop-S6-prev-firefly.png`가 plate로 분류되던 문제 — archive 마커 규칙을 plate 앞으로 이동(retire 마커가 backdrop 토큰을 이김). 단 'old'가 'gold/golden' 내부서 오탐하지 않도록 archive 규칙에 word-boundary(\b) 적용(전상품·미래파일·기존 plate/composite 회귀0).

### 8.10 /assets STALE 캐시 근본수정 — Storage 리스트 라이브화 (2026-06-15 Desktop 실앱테스트 #45)
- **적발**: `/api/products/[id]/assets`가 전상품 STALE — studio 자산 브라우저가 죽은 depth-2 URL(404) 렌더·현 canonical 누락. 증거: 명화 /assets total 22(pre-backfill snapshot: composite 9·root depth-2 10) vs 실제 storage 41(composite 18·depth-2 0·전 canonical stage). 배포로도 미소거(Vercel Data Cache는 deploy 비종속·지속). vercelCache=MISS이나 함수 반환이 stale.
- **근본원인**: route는 force-dynamic이나 그것만으론 server SDK 내부 fetch를 no-store화하지 못함. getServerClient(automation-storage)의 supabase-js list 결과가 Next Data Cache에 잔류 → cross-deploy stale. (unstable_cache는 전무 — 캐시는 fetch Data Cache 층.)
- **수정(전상품·근본)**: getServerClient에 `global.fetch`로 `cache:'no-store'` 주입 → 모든 Storage/REST read가 라이브(out-of-band 백필/remap 변동 즉시 반영). 방어층으로 /assets route에 `fetchCache='force-no-store'`+`revalidate=0` 추가. 클라이언트(AssetBrowser)는 이미 `cache:'no-store'`(회귀 없음).
- **검증**: listProductAssets 라이브 = 명화 total 41(depth-2 0·cutout3·plate3·composite18·thumbnail4·detail3·archive10) / 아이스트레이 2(detail1·archive1·depth-2 0) / cmp3afb 18(depth-2 0). build0·tsc0·additive·네이버 무접촉.

### 8.11 자산 정합 점검 시스템 가드 (#81 · #80 후속 · 전상품·개입점화)
- **배경**: #80 stale-listing은 사람이 studio를 봐야 드러났다. 드리프트 상시감지·개입점화 부재 → 프로젝트-전체 확장.
- **점검(라이브)**: `checkProductIntegrity`(src/lib/storage/asset-integrity.ts) — listProductAssets(no-store) 기준 상품별 (a) depth-2/root 잔존(정규화 누락) (b) DB ref dead(라이브 리스팅에 없는 product-assets 키=404, Product 전컬럼 중첩jsonb+asset_references+published_assets 전수스캔) (c) (선택 ?ratio=1) composite≠4:5·thumbnail≠1:1(Sharp 메타·bounded 16). 다운로드0(기본).
- **개입점화**: control-tower 개입 대기열에 `asset_integrity` 카드 시드 — setJobIntervention(jobType bg_clean→lane process→image track·status awaiting_human·멱등 matchInterventionType·best-effort). 정합 OK면 clearJobIntervention(status done). category INPUT_DECISION·deepLink /studio·강제모달0(#56). 라벨 '자산 정합: 비정규 N·dead M'. tool='sharp'(asset_jobs_tool_check 적합값).
- **1클릭 교정(#46 게이트)**: 카드 인라인 버튼 → POST /api/products/[id]/asset-integrity {action:'fix',confirm:true} → fixProductIntegrity(루트→정규 stage 이동·원본 archive 백업·exhaustive depth-2 ref 리맵 dangling-only) → 재점검·카드 갱신. confirm 모달 게이트.
- **상시감지(cron)**: /api/cron/asset-integrity-sweep(vercel.json `0 15 * * *`=KST 자정·CRON_SECRET). 전상품 점검·시드/클리어. read-mostly(저장소 이동0·네이버0; 이동은 1클릭 교정만).
- **검증**: 현 3상품 전부 ok(depth-2 0·dead 0). 드리프트 round-trip(detail 파일 root 이동→detect depth2=1·ok=false→card seed[matrix 쿼리 awaiting_human+image lane+interventionType 노출 확인]→1클릭 fix moved=1·after.ok=true→복원 detail1/archive1→card clear) PASS. 전상품·하드코딩0(#55)·외부 image API 0(Sharp만·#37)·네이버 무접촉·tsc0·build0.
- **권위**: docs/design/OPERATOR_SYSTEM_BLUEPRINT.md(개입 대기열) + §8.10 연계.
