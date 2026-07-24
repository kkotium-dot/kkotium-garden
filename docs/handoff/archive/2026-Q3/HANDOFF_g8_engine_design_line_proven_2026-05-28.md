# HANDOFF — G8-ENGINE 디자인 라인 실증 완료 (Desktop turn, 코드 0)

> **상태**: OPEN (Code Phase G8-ENGINE 착수 대기)
> **작성**: 2026-05-28 Desktop turn (Track B G8-ENGINE 디자인 라인 실증)
> **baseline**: 08795bb (origin/main, Vercel READY, G8-FIX [CLOSED] 상태)
> **검증 표본**: 아이스트레이 DRAFT `cmpp62yje00015xup5h8pgwx0` (sku KKT-1779953038280)
> **성격**: 확정 동선 6단계의 production viability를 실 MCP 호출로 전수 증명. 비가역 0(Supabase 미저장, 네이버 미발행).
> **선행 문서**: docs/handoff/HANDOFF_g8_studio_asset_engine_2026-05-28.md (근본 진단 + 아키텍처 방향)

---

## 0. TL;DR (Code가 먼저 읽을 요약)

확정 동선 6단계(도매꾹 다운로드 -> Adobe CC 업로드 -> 누끼 -> GenAIAsset 검색 -> 합성 -> 4변형)를 실 MCP 호출로 **전 구간 실측 통과**. "4변형 거의 동일" 결함이 누끼/배경 도입으로 해소됨을 **육안 증명** 완료. 단, 두 가지 아키텍처 발견으로 Phase G8-ENGINE 설계가 **확정**됨:

1. **Adobe Express MCP는 외부 누끼 PNG를 템플릿에 합성하는 도구가 없다.** search_design/fill_text/change_background_color는 Express 디자인 내부 텍스트/배경색만 조작. -> **실제 합성 엔진은 서버(Sharp) 측이어야 함** (production thumbnail-generator.ts와 동일 구조). Express/Firefly는 "배경 소스" 역할로 한정.
2. **image_remove_background 등 처리 도구는 임의 공개 URL 거부.** 유일 유효 입력 = Adobe CC 직접 업로드 후 presignedAssetUrl (도매꾹 CDN/Supabase public URL 모두 거부).

결론: Phase G8-ENGINE = `nukki-adapter`(Adobe, MCP 아닌 production은 별도 처리) + `backdrop-source`(Express템플릿/Firefly웹/브랜드색 캐시) -> **Sharp 합성기** 통합. resolver는 소스 우선순위(수동 B > 자동캐시 > 자동생성 > fitImage 폴백)만 결정.

---

## 1. 확정 동선 6단계 실측 결과 (추측 0, 전부 실 호출)

| 단계 | 도구 | 결과 | evidence |
|---|---|---|---|
| 1. 도매꾹 원본 다운로드 | bash curl + Referer 헤더 | ✅ | http 200, 760x760 JPEG 106196 bytes. Referer=https://domeggook.com/ 로 hotlink 우회 성공 |
| 2. Adobe CC 청크 업로드 | asset_initialize_file_upload -> 청크 PUT -> asset_finalize_file_upload | ✅ | init 200(transfer_document 정상) / 청크 PUT 200(106196 bytes) / finalize 200 -> presignedAssetUrl 획득 |
| 3. 누끼 (배경 제거) | image_remove_background(presignedAssetUrl) | ✅ | success:true, 760x760 투명 PNG. 투명 플라스틱(유리질) 경계 깔끔 + 초록 뚜껑 + 누르는 손까지 보존. 주변 소품(컵/레몬/마늘) 완전 제거. rembg 대비 우위(투명체 잔상/구멍 없음) |
| 4. GenAIAsset 검색 | asset_search(entityScope:GenAIAsset) | ✅ | totalHits:0 (검색 경로 정상, 대표 Firefly 웹 생성물 현재 0건). 동선 자체 검증 통과 |
| 5. 배경+한글 헤더 합성 | 컨테이너 Pillow + Noto Sans CJK | ✅ | 4종 배경(순백/브랜드핑크/그레이/웜그라데이션) + 한글 헤더 합성. 브랜드 프리셋(Red #E62310 / Pink #FFCCEA) 적용 |
| 6. 4변형 차별화 | 동상 | ✅ | clean(무텍스트=대표이미지 후보) / price(가격pill) / badge(카테고리리본) / lifestyle(그림자+한글헤더strip). 배경/구성/소구점 명백히 차별화 |

### 실측 정정 (핸드오프 §2 vs 이번 세션)

- 핸드오프 §2: 업로드 경로 = `/mnt/user-data/uploads/`.
- **이번 세션 실측: `/mnt/user-data/uploads/`가 읽기 전용(read-only)이었음.** 쓰기 시도 시 "Read-only file system".
- 우회: `/home/claude` 스크래치에 다운로드 -> asset_initialize_file_upload는 상대경로(path:"kkotium/icetray_src.jpg")만 받으므로 uploads 쓰기 권한 불필요. 청크 PUT은 /home/claude 원본을 dd로 읽어 정상 업로드.
- **다음 세션 인계**: 컨테이너 다운로드 위치는 `/home/claude`(쓰기 가능)를 기본으로. uploads는 읽기 전용 가정.

---

## 2. Phase G8-ENGINE 확정 설계 (이번 실증으로 변경된 부분)

> 선행 핸드오프(HANDOFF_g8_studio_asset_engine_2026-05-28.md) §2의 resolver 골격은 유지. 다만 합성 위치와 Adobe 역할이 실측으로 확정됨.

### 2-A. 합성 엔진 위치 = 서버 Sharp (확정)

- Adobe Express MCP는 **외부 이미지를 템플릿에 합성 불가**. 따라서 production 합성은 thumbnail-generator.ts의 Sharp가 담당(현 구조 유지가 맞음).
- 변경점: renderClean/renderLifestyle이 **원본 대신 누끼 PNG(cutout)** 를 입력으로 받아야 함. + lifestyle은 backdrop 소스를 받아 합성.

### 2-B. 누끼 소스 (확정)

- production 런타임에서 Adobe MCP를 직접 호출할 수는 없음(MCP는 Desktop 세션 전용). 두 가지 경로 중 택1을 Code가 결정:
  - (a) **사전 누끼 캐시 방식**: Desktop/대표가 Adobe로 누끼한 PNG를 Storage(product-assets/{id}/cutout.png)에 적재 -> production은 캐시만 소비. (API 과금 0, 디자이너 통제권 = B 레이어)
  - (b) **서버측 누끼 라이브러리**: rembg 등 self-host. (이번 실증에서 Adobe 품질이 rembg 대비 우위 확인됨 -> (a) 권장)
- **권장 = (a)**. resolver 우선순위 1(수동 업로드) / 2(자동 캐시)에 정합. 누끼는 "디자이너 작업물"로 취급.

### 2-C. 배경 소스 (확정)

- lifestyle 배경 = 3택: (1) 대표가 Firefly 웹 생성 -> asset_search(GenAIAsset)로 Desktop이 수집 -> Storage 적재 / (2) Express 템플릿 export / (3) 브랜드색 그라데이션 폴백(이번 데모의 웜톤 방식).
- production은 Storage에 적재된 배경만 소비(외부 이미지 API 런타임 호출 0, 작업원칙 #38 정합).

### 2-D. 신규/변경 모듈 (Code 작업)

1. `src/lib/automation/asset-source-resolver.ts` (신규) — productId/variant + {manualCutoutUrl?, manualBackdropUrl?} -> {cutoutUrl, backdropUrl, source}. 캐시키: product-assets/{id}/cutout.png, /backdrop-{skeletonId}.png
2. `thumbnail-generator.ts` 수정 — 4 renderer가 resolver의 cutoutUrl/backdropUrl 소비. fitImage는 source='fallback' 경로로만.
3. studio/PLANT UI — B 수동 업로드 칸(누끼/배경) + 소스 뱃지(manual/auto-cache/fallback).
4. lifestyle backdropUrl 전달 경로 연결 (선행 핸드오프 1-B 미연결분).
5. 저화질 입력 가드(760px 이하) -> 진단 L4 UX 정합.

### 2-E. 비기능 요건 (유지)

- 외부 API 키 env만. Gemini/Perplexity 신규 금지.
- Sharp 무거운 합성은 서버측 유지(#26 iterm 행 회피). detail 5섹션(5000~7000px)은 maxDuration + 단계 분리.
- new PrismaClient 금지(src/lib/prisma 싱글톤).

---

## 3. 작업 순서 (Code)

### Phase G8-ENGINE (별도 sprint)
1. asset-source-resolver.ts 신규 (소스 우선순위 + Storage 캐시키).
2. thumbnail-generator.ts 4 renderer가 cutout/backdrop 소비하도록 리팩터.
3. studio/PLANT B 수동 오버라이드 입력 + 소스 뱃지.
4. lifestyle backdropUrl 경로 연결.
5. 저화질 가드 + 진단 연동.
6. production E2E: 표본 진단 -> 4변형(육안 차별화) -> save-assets -> Supabase main/detail_image_url 기록.
- 각 단계 TSC 0 + build 0 + verify-vercel-deploy.sh --wait exit 0.

### 누끼/배경 적재 운영 (Desktop, 엔진 완성 후)
- 대표 상품별 Adobe 누끼 -> Storage cutout 적재 / Firefly 웹 배경 -> Storage backdrop 적재. resolver가 소비.

---

## 4. plan MD 갱신 블록 (Code가 그대로 적용 — 한글 literal, sentinel grep 0 확인 후 commit)

### 4-1. PROGRESS.md 헤더 prepend

```
> 2026-05-28 **Track B G8-ENGINE 디자인 라인 실증 완료** (Desktop turn, 코드 변경 0, baseline 08795bb). 확정 동선 6단계 실 MCP 호출 전수 통과: (1)도매꾹 원본 Referer 우회 다운로드 760x760 200 (2)Adobe CC 청크 업로드 init/PUT/finalize 200 -> presignedAssetUrl (3)image_remove_background 투명 누끼 성공(투명체 경계+손 보존, rembg 대비 우위) (4)asset_search GenAIAsset 경로 정상(자산 0건) (5)Pillow+Noto CJK 한글 헤더 합성 (6)4변형 clean/price/badge/lifestyle 차별화 육안 증명. 아키텍처 확정 2건: Adobe Express MCP는 외부 누끼 PNG 합성 불가->합성엔진은 서버 Sharp 유지 / image_remove_background는 Adobe CC presignedAssetUrl만 허용(공개 URL 거부). 실측 정정: /mnt/user-data/uploads 읽기전용->/home/claude 스크래치 사용. 비가역 0(Supabase 미저장, 네이버 미발행). 상세: docs/handoff/HANDOFF_g8_engine_design_line_proven_2026-05-28.md. 다음: Code Phase G8-ENGINE(asset-source-resolver + thumbnail-generator 리팩터 + B 수동 오버라이드 UI).
```

### 4-2. SESSION_LOG.md entry 추가 (최상단 prepend)

```
## 2026-05-28 Track B G8-ENGINE 디자인 라인 실증 (Desktop turn, 코드 0)

- baseline 08795bb. 확정 동선 6단계 실 MCP 호출 전수 검증. 표본 아이스트레이(cmpp62yje00015xup5h8pgwx0).
- 1단계 다운로드: 도매꾹 CDN760 원본 Referer=domeggook.com 헤더로 hotlink 우회 -> /home/claude 다운로드 760x760 http 200.
- 2단계 Adobe CC 업로드: asset_initialize_file_upload(path 상대경로) -> 청크 PUT 200(106196 bytes) -> asset_finalize_file_upload -> presignedAssetUrl 획득. egress enabled 환경 정합.
- 3단계 누끼: image_remove_background(presignedAssetUrl) success:true 투명 PNG 760x760. 투명 플라스틱 경계 깔끔 + 초록 뚜껑 + 손 보존 + 주변 소품 제거. rembg 대비 품질 우위 육안 확인.
- 4단계 GenAIAsset: asset_search(GenAIAsset) totalHits:0 (경로 정상, 대표 Firefly 웹 생성물 현재 0건).
- 5/6단계 합성: 컨테이너 Pillow + Noto Sans CJK로 4변형(clean 무텍스트=대표이미지 후보 / price 가격pill / badge 카테고리리본 / lifestyle 웜그라데이션+그림자+한글헤더). 브랜드 프리셋(Red #E62310 / Pink #FFCCEA). 배경/구성/소구점 명백히 차별화 -> G8 진단의 "4변형 거의 동일" 결함 해소 증명.
- 아키텍처 발견: (1) Adobe Express MCP는 외부 누끼 PNG 템플릿 합성 불가 -> production 합성엔진은 서버 Sharp 유지가 정답. (2) image_remove_background는 Adobe CC presignedAssetUrl만 허용(도매꾹 CDN/Supabase public URL 거부). -> Phase G8-ENGINE = nukki-adapter(Adobe 누끼->Storage 캐시) + backdrop-source + Sharp 합성기 통합 확정.
- 실측 정정: /mnt/user-data/uploads 읽기전용 -> /home/claude 스크래치 사용(다음 세션 기본).
- 비가역 0(Supabase 미저장, 네이버 미발행, 데모는 컨테이너에만). SD-01 무접촉.
- 다음: Code Phase G8-ENGINE.
```

### 4-3. TASK_BRIDGE.md §3 ACTIVE 교체 (아래 본문 — Desktop이 targeted edit 적용, Code는 확인)

(본 파일 §5 참조 — Desktop turn에서 적용)

---

## 5. Code 붙여넣기 메시지 (새 Claude Code 세션)

```
꽃틔움 가든 Code. Track B Phase G8-ENGINE 이미지 엔진 구축.
[STEP 0] CLAUDE.md 자동 + PROGRESS.md 헤더 + TASK_BRIDGE §3 ACTIVE +
  docs/handoff/HANDOFF_g8_engine_design_line_proven_2026-05-28.md +
  docs/handoff/HANDOFF_g8_studio_asset_engine_2026-05-28.md 정독.
[베이스라인] 08795bb (origin/main, Vercel READY). git status 확인 — Desktop이
  TASK_BRIDGE §3 + PROGRESS 헤더 targeted edit 적용했을 수 있음. SESSION_LOG entry(핸드오프 4-2)는
  Code가 단일 docs commit으로 정리 후 진입.
[실증 단정 — Desktop이 실 MCP로 검증 완료] 확정 동선 6단계 전부 viability 통과.
  핵심: 합성엔진=서버 Sharp 유지 / 누끼=Adobe presignedAssetUrl만(공개URL 거부) ->
  누끼 PNG는 Storage 캐시로 소비 / 배경=Express템플릿·Firefly웹·브랜드색 캐시.
[SCOPE Phase G8-ENGINE] (의존성 순서):
  1. src/lib/automation/asset-source-resolver.ts 신규 — productId/variant +
     {manualCutoutUrl?, manualBackdropUrl?} -> {cutoutUrl, backdropUrl, source}.
     소스 우선순위: manual > auto-cache(Storage) > (배경만)brand-color fallback.
     캐시키: product-assets/{id}/cutout.png, /backdrop-{skeletonId}.png.
  2. thumbnail-generator.ts 4 renderer(clean/price/badge/lifestyle)가 resolver의
     cutoutUrl/backdropUrl 소비. cutout 없으면 현 fitImage(source='fallback') 유지.
  3. studio/PLANT UI에 B 수동 업로드 칸(누끼 URL/배경 URL) + 소스 뱃지(manual/auto-cache/fallback).
  4. lifestyle backdropUrl 전달 경로 연결(선행 핸드오프 1-B 미연결분).
  5. 저화질 입력 가드(760px 이하 경고) -> 진단 L4 UX 정합.
  각 단계 TSC 0 + build 0 + verify-vercel-deploy.sh --wait exit 0 후 보고.
[절대준수] 한글 literal(\uXXXX 금지) / 이모지 금지(Lucide만) / 영어 주석 /
  한글 리터럴 타입 금지(영어 상수 분리) / heredoc 금지(#26) / 거짓 라벨 금지(#46) /
  new PrismaClient 금지(src/lib/prisma 싱글톤) / 신규 Gemini·Perplexity 금지 /
  외부 이미지 API 런타임 호출 0(#38, Storage 캐시만) / Production=Vercel only /
  SD-01 아랍어 footer 보존 / 비가역 0(네이버 실발행 금지, DRAFT까지만).
[Phase G8-ENGINE 통과 후] Desktop 새 채팅에서 production E2E 재검증
  (표본 진단 -> 4변형 육안 차별화 -> save-assets -> DB main/detail_image_url 기록) ->
  통과 시 Track A(명화송풍구 B-12 발행) 대표 승인 후 별도 채팅.
```

---

## 6. 작업 유의사항 (대표가 늘 강조 + 이번 turn 재확인)

- **#45 production 실측**: 보고 신뢰 금지, 실 MCP 호출 + 육안 검증. (본 turn: 6단계 전부 실 호출, 누끼/4변형 asset_inline_preview + present_files 육안 확인)
- **#46 거짓 라벨 금지**: "동선 가능" 단정을 추측이 아닌 실 호출 결과로만. Adobe Express 합성 불가/uploads 읽기전용 = 발견 즉시 정직 보고.
- **#26 iterm 행**: 이번 turn iterm 미사용(전부 bash 단일 호출 + MCP). Sharp 무거운 합성은 production 서버측 유지.
- **#29 한글 인코딩**: 본 핸드오프 write_file 신규 작성(한글 literal). plan MD 적용은 Code 위임(sentinel grep 필요). sentinel: grep -nE "혁섭|쿠드|식타|릴고|헌서|위젝|스칵|쿠두" = 0.
- **#41 핑퐁**: Desktop=실증/검증/paste-ready 본문, Code=코드+MD 실적용+git push. Desktop은 MD edit 가능하나 sentinel grep(bash) 불가 -> 대형 plan MD는 Code 위임 권장. 본 핸드오프 신규 파일만 Desktop write.
- **비가역 0**: Supabase 미저장(데모 PNG는 컨테이너 /home/claude에만), 네이버 미발행. POC 잔존(product-images/poc/icetray-cmpp62yje-poc.jpg)은 이전 turn 산물, 본 turn 신규 적재 0.
- **SD-01**: studio 하단 아랍어 footer = 의도된 개인 메시지. 무접촉/무수정/무조사/무문서화.
- **온실 아틀리에 본질**: 디자인 요소(누끼/배경/차별화)는 SEO·ROI 기반. 단순 리사이즈 도구로 방치 금지 — 이번 실증으로 4변형 차별화 복원 경로 확정.
- **환경 차이 메모**: /mnt/user-data/uploads 읽기전용 -> /home/claude 스크래치. Adobe 처리도구는 CC presignedAssetUrl만(공개 URL 거부). 도매꾹 다운로드는 Referer=domeggook.com 헤더 필수.
