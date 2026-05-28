# HANDOFF — G8 온실 아틀리에 이미지 엔진 근본 재설계 (A 자동 + B 오버라이드)

> **상태**: OPEN (Code 착수 대기)
> **작성**: 2026-05-28 Desktop turn (Track B G8 검증 중 발견)
> **baseline**: fef5c84 (origin/main, Vercel READY, production HTTP 200 실측)
> **검증 표본**: 아이스트레이 DRAFT `cmpp62yje00015xup5h8pgwx0` (sku KKT-1779953038280)
> **성격**: 단순 버그 픽스 아님. 온실 아틀리에 = SEO/ROI 디자인 기반이라는 본질에 직결된 아키텍처 복원/재설계.

---

## 0. TL;DR (Code가 먼저 읽을 요약)

온실 아틀리에 썸네일 4변형(clean/price/badge/lifestyle)이 production에서 "거의 동일하게" 출력됨. 근본 원인은 **누끼(배경 제거) + 배경 생성 단계가 코드에서 통째로 빠져 있음**. 2026-05-15 Cloudinary fetch 401 차단 사고 이후 누끼 파이프라인을 단순 `fitImage` 리사이즈로 우회한 게 그대로 굳음. 4변형의 실질 차이가 "텍스트 오버레이 위치"밖에 안 남음.

추가로 G8 정주행 중 회귀 3건 동시 발견(진단 CDN 차단 500 / `[object Object]` 에러 직렬화 / studio `?product=` URL prefill skip).

**확정 방향**: `소스 우선순위 결정기(Source Priority Resolver)` 도입 = A(Adobe Express 누끼 + Nano Banana 배경 자동 생성)를 기본 엔진으로, B(디자이너 수동 누끼/배경 URL 오버라이드)를 최우선 레이어로 통합. 양자택일 아님.

---

## 1. 근본 원인 — 코드 레벨 확정 (추측 0)

### 1-A. 누끼/배경 생성 부재 (치명, P0)

파일: `src/lib/automation/thumbnail-generator.ts`

- 상단 주석 자백: Cloudinary fetch 모드가 account-level 401("Images of type fetch are restricted")로 막혀, 누끼 전처리 레이어를 bypass하고 Sharp `fitImage`(resize + bg fill)로 대체함 (2026-05-15, Phase 3-C-3-h).
- 결과: `renderClean`/`renderLifestyle` 모두 원본을 배경 위에 **그대로 얹기만** 함. 제품을 오려내지 않으므로 원본의 사각 배경이 그대로 노출 -> 흰배경/주방배경 변형이 모두 원본 배경째 보여 차이가 사라짐.
- 4변형 실질 차이가 텍스트 오버레이(제목/가격뱃지/카테고리뱃지/캡션) + 배경색뿐. 메모리의 "광합성 샤워 Gate 3"(누끼 -> 배경생성 -> 톤보정) 핵심이 코드에 미연결.

### 1-B. lifestyle 배경이 optional이라 사실상 미작동 (P1)

- `renderLifestyle`은 `lifestyleBackdropUrl`이 있을 때만 배경 합성, 없으면 `spec.colorTokens.secondary` 단색 폴백.
- studio -> generator로 backdropUrl을 전달하는 경로가 미연결로 추정 -> lifestyle이 영구적으로 "단색 + 원본 얹기" = production에서 본 "뿌연 필터" 정체.

### 1-C. 진단 API 도매꾹 CDN 직접 fetch 500 (P0)

파일: `src/app/api/diagnose/route.ts` (line 113 imageUrl 해석)

- imageUrl 해석 순서: `mainImage` -> `main_image_url` -> `images[0]`.
- 표본 실측(Supabase): `mainImage`=도매꾹 CDN 760 원본(`cdn1.domeggook.com/...img_760?hash=...`), `main_image_url`=null, `images`=0개.
- 400 가드("imageUrl required")는 통과(주소는 존재). 그러나 P-Filter가 그 주소 fetch 시 도매꾹 hotlink 차단/원본 만료로 가드 밖 예외 -> HTTP 500.
- 대조 사실: 같은 원본으로 **썸네일 생성은 성공**(generator의 fetch 경로가 다름). 즉 진단 fetch만 generator와 동일 경로(프록시/UA)로 정렬하면 해소 가능.

### 1-D. studio `?product=` URL prefill skip (P1)

파일: `src/app/studio/page.tsx` (line 39 initialProductId, line 46~ fetchProducts, line 61 auto-select)

- `?product=<id>`로 진입해도 fetchProducts의 `if (!selectedId && list.length > 0) setSelectedId(list[0].id)`가 stale `selectedId`(null) 스냅샷을 참조 -> 목록 최신순 첫 항목(달항아리)으로 덮어씀.
- 재현: `/studio?product=cmpp62yje00015xup5h8pgwx0` 진입 -> 진단 클릭 시 선택이 달항아리로 튕김.
- 좌측 목록 수동 클릭(ref 타격)은 정상 -> 핸들러 자체는 정상, URL 초기 동기화만 결함.
- PLANT "이 상품 디자인하기" 동선에서 엉뚱한 상품 잡힘 -> 동선 단절 P1.

### 1-E. `[object Object]` 에러 직렬화 (P1, #46 거짓 라벨 인접)

- studio DiagnosisCard가 진단 실패 시 에러 객체를 문자열로 직렬화 못해 "진단 실패: [object Object]" 노출. 사용자가 원인 인지 불가.
- 에러 표면(thumbnail/detail 포함) 전수 점검 필요: `err.message ?? JSON.stringify(err)` 패턴으로 정규화.

---

## 2. 확정 아키텍처 — Source Priority Resolver (A 엔진 + B 오버라이드)

> **2026-05-28 실측으로 중대 정정**: "앱 런타임이 Adobe/Nano Banana 생성형 API를 호출"하는 원래 A안은 **폐기**. 이유: (1) Firefly Services API는 엔터프라이즈 유료(월 $19.99 Pro 구독 로는 불가) (2) Nano Banana=Gemini는 본 프로젝트 신규 금지 (3) Adobe MCP 커넥터는 이 환경에서 **생성형 AI(text-to-image, 생성형 배경교체) 불가**(adobe_mandatory_init 문서 명시). 따라서 생성형 이미지 경로 전체 폐기.

### 실제 확정 디자인 라인 (전부 Claude+MCP, 생성형 AI 0, 과금 0)

```
[1] 도매꾹 원본 -> Claude 컨테이너 다운로드(Referer 헤더로 hotlink 우회) -> /mnt/user-data/uploads/ 복사
[2] asset_initialize_file_upload (Adobe CC 청크 업로드, egress 경유) -> asset_finalize_file_upload -> presignedAssetUrl
[3] image_remove_background(presignedAssetUrl) -> 누끼 컷아웃 + Adobe 톤보정
[4] 배경/템플릿: Adobe Express(search_design+fill_text+change_background_color) 위주 + Claude Design 커스텀(추후 구축)
[5] 상품 합성 + 한글 헤더 -> 4변형
[6] Supabase product-assets 저장 -> 앱 main/detail_image_url 읽기
```

### Adobe 커넥터 입력 규칙 (2026-05-28 실측 확정, 중요)

- image_remove_background 등 처리 도구는 **임의 공개 URL을 거부**한다. 도메꾹 CDN ❌, Supabase public URL도 ❌ (둘 다 "URL domain not whitelisted").
- **유일 유효 경로 = Adobe CC에 직접 업로드한 presignedAssetUrl**. asset_initialize_file_upload는 /mnt/user-data/uploads/ 경로만 프로그래매틱 업로드 가능(egress enabled 전제). 로컬 머신(/Users/...) 경로는 asset_add_file 피커만 가능.

### Firefly 활용 동선 (대표 요청 반영)

- MCP 커넥터로 Firefly 생성형 호출 = ❌ (차단). 대신:
- 대표님이 firefly.adobe.com 웹에서 직접 생성(창작 통제권=B 레이어) -> asset_search(entityScope:GenAIAsset)로 Claude가 결과물 검색/활용 -> 누키 제품과 합성. 이 검색 동선은 다음 turn 실증 예정.

### 소스 우선순위 (제품별 + 변형별)

| 우선순위 | 소스 | 동작 | 정체 |
|---|---|---|---|
| 1 | 디자이너 수동 업로드 URL | 존재 시 무조건 최우선 사용 | B (디자이너 거부권) |
| 2 | 자동 생성 캐시 (Storage) | 기존 자동 결과물 재사용 (API 재과금 0) | A (절약) |
| 3 | 자동 생성 실행 | Adobe Express 누끼 + Nano Banana 배경 생성 -> 캐시 -> 사용 | A (핵심 엔진) |
| 4 | 원본 리사이즈 폴백 | 전부 실패 시 현재 fitImage 동작 유지 (앱 무중단) | 안전망 |

### 신규/변경 모듈 (제안)

1. `src/lib/automation/asset-source-resolver.ts` (신규)
   - 입력: productId, variant, { manualCutoutUrl?, manualBackdropUrl? }
   - 출력: { cutoutUrl, backdropUrl, source: 'manual'|'auto-cache'|'auto-gen'|'fallback' }
   - 누끼/배경 캐시 키: Storage `product-assets/{productId}/cutout.png`, `/backdrop-{skeletonId}.png`
2. `src/lib/automation/nukki-adapter.ts` (신규) — Adobe Express 누끼 API 어댑터. timeout/실패 시 graceful fail -> resolver가 다음 우선순위로.
3. `src/lib/automation/backdrop-adapter.ts` (신규) — Nano Banana(Firefly hub) 배경 생성 어댑터. 동일 graceful fail.
4. `thumbnail-generator.ts` 수정 — renderClean/renderLifestyle이 resolver의 cutoutUrl/backdropUrl을 입력으로 받도록 변경. fitImage는 폴백 경로로만.
5. studio/PLANT UI — B 수동 업로드 입력 칸(누끼/배경) 추가 + 자동/수동 소스 뱃지 노출.

### 비기능 요건 (반드시)

- API 호출은 비동기 + AbortController timeout(진단 B-4 선례 참조). 무한 대기 0.
- Sharp 무거운 합성은 서버(Vercel) 측 처리 유지 -> Desktop iterm #26 행 회피. 단 detail 5섹션(5000~7000px)은 maxDuration + 스트리밍/단계 분리 검토.
- 외부 API 키는 env로만. 신규 키 추가 시 메모리 AI 체인 정책 충돌 점검(Gemini/Perplexity 신규 금지).
- 누끼/배경 자동 생성은 저화질 입력(760px 이하) 가드 -> 품질 미달 시 "재촬영/고해상도 확보" 분기(진단 L4 UX와 정합).

---

## 3. 작업 순서 (Code, 의존성 고려)

> 권장: P0 기반 픽스 먼저(빠른 통과) -> 그 위에 엔진 재설계(큰 작업). 단계마다 TSC 0 + build 0 + verify-vercel.

### Phase G8-FIX (P0/P1 기반, 작은 commit 단위)
1. `diagnose/route.ts` imageUrl fetch를 generator의 fetchImageBuffer 경로(프록시/UA)와 정렬 -> 도매꾹 CDN 500 해소 (1-C).
2. studio DiagnosisCard + Thumbnail/Detail 에러 표면 직렬화 정규화 (1-E).
3. `studio/page.tsx` URL prefill skip 수정 — fetchProducts에서 initialProductId 우선 보존(setSelectedId 가드를 `prev => prev ?? ...` 함수형 갱신 또는 initialProductId 직접 참조) (1-D).
4. 각 단계 production 재검증 후 G8-FIX 핸드오프 [CLOSED].

### Phase G8-ENGINE (재설계, 별도 sprint 권장)
5. asset-source-resolver.ts + nukki-adapter.ts + backdrop-adapter.ts 신규.
6. thumbnail-generator.ts가 resolver 출력 소비하도록 리팩터.
7. studio/PLANT UI에 B 수동 오버라이드 입력 + 소스 뱃지.
8. lifestyle backdropUrl 전달 경로 연결 (1-B).
9. 저화질 입력 가드 + 진단 연동.
10. production E2E: 표본 진단 -> 4변형(육안상 명확히 차별화) -> save-assets -> Supabase main/detail_image_url 기록 검증.

---

## 4. plan MD 갱신 블록 (Code가 그대로 적용 — 한글 literal, sentinel grep 0 확인 후 commit)

### 4-1. PROGRESS.md 헤더 prepend

```
> 2026-05-28 **Track B G8 [진행중] 온실 아틀리에 이미지 엔진 근본 재설계 착수** (Desktop turn, 코드 변경 0, baseline fef5c84). G8 production 실측 중 4변형(clean/price/badge/lifestyle)이 거의 동일 출력 발견. 근본: 누끼/배경 생성이 thumbnail-generator.ts에서 부재(2026-05-15 Cloudinary 401 차단 후 fitImage 우회 고착) -> 4변형 차이가 텍스트 오버레이뿐. 동반 회귀 3건: 진단 도매꾹 CDN 직접 fetch 500(표본 mainImage=CDN760, main_image_url=null) / studio ?product= URL prefill skip(목록 최신순 첫항목 덮어씀) / [object Object] 에러 직렬화. 확정 방향: Source Priority Resolver = A(Adobe Express 누끼 + Nano Banana 배경 자동) 기본 엔진 + B(디자이너 수동 누끼/배경 URL) 최우선 오버라이드 통합. 썸네일 4변형 생성 배관 자체는 #26 행 없이 정상(생성 성공). save-assets 라우트는 base64 수신->Storage 업로드->DB UPDATE로 무거운 합성 없음(#26 무관) 확인. 비가역 0(더미 저장 안 함, 네이버 미발행). 상세: docs/handoff/HANDOFF_g8_studio_asset_engine_2026-05-28.md. 다음: Code Phase G8-FIX(P0 진단 CDN + 에러직렬화 + URL prefill) -> Phase G8-ENGINE(resolver + 누끼/배경 어댑터).
```

### 4-2. TASK_BRIDGE.md §3 ACTIVE 교체 (Desktop이 이미 targeted edit 적용 — Code는 확인만)

(아래 5절 참조 — Desktop turn에서 적용 완료)

### 4-3. SESSION_LOG.md entry 추가

```
## 2026-05-28 Track B G8 이미지 엔진 근본 진단 (Desktop turn, 코드 0)

- 표본 아이스트레이(cmpp62yje00015xup5h8pgwx0) /studio 정주행 검증.
- before 단정: main_image_url=null, detail_image_url=null, status=DRAFT, mainImage=도매꾹 CDN760.
- 발견 1: 진단 500 — 도매꾹 CDN 직접 fetch 차단(P-Filter). 같은 원본으로 썸네일 생성은 성공(fetch 경로 차이).
- 발견 2: 썸네일 4변형 거의 동일 — thumbnail-generator.ts 누끼/배경 부재(Cloudinary 401 우회 고착). 차이가 텍스트 오버레이뿐.
- 발견 3: studio ?product= URL prefill skip — 목록 최신순 첫항목(달항아리) 덮어씀. 수동 클릭(ref)은 정상.
- 발견 4: [object Object] 에러 직렬화 결함(#46 인접).
- save-assets 라우트 해부: base64->Storage->DB UPDATE, 무거운 합성 없음(#26 무관) 확인.
- 확정 방향: Source Priority Resolver(A 자동 엔진 + B 수동 오버라이드 통합).
- 비가역 0(더미 저장 안 함). SD-01 아랍어 footer 보존 확인(studio 하단 노출 유지).
- 다음: Code Phase G8-FIX -> Phase G8-ENGINE.
```

---

## 5. Code 붙여넣기 메시지 (새 Claude Code 세션)

```
꽃틔움 가든 Code. Track B G8 이미지 엔진 근본 재설계.
[STEP 0] CLAUDE.md 자동 + PROGRESS.md 헤더 + TASK_BRIDGE §3 ACTIVE +
  docs/handoff/HANDOFF_g8_studio_asset_engine_2026-05-28.md 정독.
[베이스라인] fef5c84 (origin/main, Vercel READY). git status 확인 — Desktop이
  TASK_BRIDGE §3 + PROGRESS 헤더 targeted edit 적용했으므로 working tree에 docs 변경 존재 가능.
  먼저 그 docs 변경 + SESSION_LOG entry(핸드오프 4-3)를 단일 docs commit으로 정리 후 진입.
[Phase G8-FIX 먼저] (P0/P1, 작은 commit):
  1. diagnose/route.ts imageUrl fetch를 thumbnail-generator의 fetchImageBuffer 경로와 정렬
     (도매꾹 CDN hotlink/UA) -> 진단 500 해소.
  2. studio 에러 표면(DiagnosisCard/Thumbnail/Detail) 직렬화 정규화 -> [object Object] 제거.
  3. studio/page.tsx ?product= URL prefill skip 수정(initialProductId 우선 보존).
  각 단계 TSC 0 + build 0 + verify-vercel-deploy.sh --wait exit 0 후 보고.
[Phase G8-ENGINE 다음] (별도 sprint 권장):
  asset-source-resolver.ts + nukki-adapter.ts(Adobe Express) + backdrop-adapter.ts(Nano Banana)
  신규 -> thumbnail-generator.ts가 resolver 출력 소비하도록 리팩터 -> studio/PLANT에
  B 수동 오버라이드 입력 + 소스 뱃지 -> lifestyle backdropUrl 경로 연결 -> 저화질 입력 가드.
[절대준수] 한글 literal(\uXXXX 금지) / 이모지 금지(Lucide만) / 영어 주석 / heredoc 금지(#26) /
  거짓 라벨 금지(#46) / new PrismaClient 금지(src/lib/prisma 싱글톤) / 신규 Gemini·Perplexity 금지 /
  외부 이미지 API 키는 env만 / Production=Vercel only(npm run dev 아님) / SD-01 아랍어 footer 보존 /
  비가역 0(네이버 실발행 금지, DRAFT까지만).
[Phase G8-FIX 통과 후] Desktop 새 채팅에서 production 재검증 -> G8-ENGINE 진입.
```

---

## 6. 작업 유의사항 (이번 turn 재확인 + 영구)

- **#45 production 실측**: 보고 신뢰 금지, git/Vercel/DB/Chrome 교차검증. (본 turn: HEAD fef5c84 + prod 200 + DB before/after 실측 적용)
- **#46 거짓 라벨 금지**: `[object Object]`는 거짓 라벨 인접 결함. 에러는 항상 의미 있는 메시지로.
- **#26 iterm 행**: Sharp 무거운 합성은 서버 측 유지. 행 시 재시도 금지, 즉시 보고.
- **#29 한글 인코딩**: MD는 literal 한글만(\uXXXX 금지), 편집 후 sentinel grep 필수.
  sentinel: `grep -nE "혁섭|쿠드|식타|릴고|헌서|위젝|스칵|쿠두"` = 0이어야 함.
- **비가역 0**: 본 turn 더미 썸네일 Storage 저장 안 함(폐기 데이터 방지). 네이버 실발행 금지.
- **SD-01**: studio 하단 아랍어 footer는 의도된 개인 메시지 — 무접촉/무수정/무문서화.
- **온실 아틀리에 본질**: 디자인 요소(누끼/배경/차별화)는 SEO·ROI의 기반. 단순 리사이즈 도구로 방치 금지.
```
