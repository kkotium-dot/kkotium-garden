# Claude MCP 디자인 워크플로 — 앱 ↔ Claude 앱 자연스러운 핸드오프

> **상태**: SPEC (Code 다음 세션 구현 대기)
> **작성**: 2026-05-29 Desktop turn (대표 지시 "앱에서 Claude 앱·MCP 사용 자연스러운 워크플로")
> **베이스라인**: b33b286 (G8-ENGINE-Q2 [코드 완료], Pretendard 두부 결함 해소, deriveCategoryBadge 결정론화)
> **선행 문서**: KKOTIUM_ASSET_ENGINE_2026-05-28.md, THUMBNAIL_ART_DIRECTION_SYSTEM_2026-05-28.md
> **성격**: 꽃틔움 앱(상품 운영)과 Claude 앱(Adobe MCP 디자인 도구) 사이를 deeplink + Storage 폴링으로 잇는 워크플로 설계.

---

## 0. 배경 — 왜 이 워크플로가 필요한가

G8-ENGINE-Q2까지 완료 후 production 픽셀 검증에서 드러난 본질:

1. **자동 누끼는 한계가 있다**: 아이스트레이 mainImage(도매꾹 760)는 손+과일 라이프스타일 합성 사진 -> 자동 누끼 시 사람·소품까지 빨려들어 누더기. **"좋은 누끼"는 깨끗한 제품 프레임에서만 나옴.**
2. **Firefly 생성형 MCP 미노출**: Adobe Express MCP(`search_design`, `fill_text`)와 이미지 처리 MCP(`image_remove_background` 등)는 가용하나 Firefly 생성형은 웹앱 전용.
3. **시니어 디자이너인 대표의 통제권(B 레이어)이 시스템의 자산**: 자동화로 대체하면 안 됨. "버튼 누르고 -> Claude로 디자인 -> 앱 자동 반영"이 정답.

핵심: **앱은 "어느 상품이 어느 단계에 있는지" 알고, Claude 앱은 "Adobe 디자인 도구 접근 권한"을 가짐. 두 컨텍스트를 deeplink + Storage 폴링으로 잇는다.**

---

## 1. 3-Touchpoint 워크플로 (전체 그림)

```
[꽃틔움 가든 앱]                              [Claude 앱 (MCP)]
─────────────────                             ─────────────────
① 진단 카드                                    
   누끼 부적합 감지                            
   -> "Claude에서 디자인" 버튼 ───deeplink───▶ ② Claude 앱 새 대화
                                                   productId + 가이드 + 프롬프트 자동 첨부
                                                   대표가 Adobe MCP로 누끼/씬 생성
                                                   Storage 적재 (Code script or MCP)
                                                              │
③ 자동 새로고침 ◀──────polling 60s────────────  완료
   assetSource: fallback -> auto-cache         
   4변형 자동 재생성 (프리미엄 발현)            
```

---

## 2. Touchpoint ① — 앱 진단 카드의 "Claude로 점프" 버튼

### 2-A. 위치
- studio/PLANT 진단 결과 카드 하단 (현재 "썸네일 생성" 버튼 옆)
- ThumbnailCard 컴포넌트 내 assetSource 표시 영역 옆

### 2-B. 표시 조건 (자동 판단)
다음 중 하나라도 해당하면 "Claude로 디자인" CTA 노출:
- `assetSource.cutout === 'fallback'` (누끼 미적재)
- `assetSource.backdrop === 'fallback'` (배경 미적재) AND skeletonId가 lifestyle 계열(S2/S6/S9/S10)
- 자동 누끼 부적합 감지: mainImage가 person/multi-object 가능성 (현재는 휴리스틱, 차후 image_select_subject 결과로 정밀화)

### 2-C. 자동 판단 로직 — 자동 누끼 부적합 감지 (휴리스틱 v1)
- imageQuality 진단의 P-Filter 결과 활용: 다중 객체(multiObject>0.7) 또는 인물 감지 시 부적합.
- 차후 정밀화: Adobe MCP `image_select_subject`로 subject mask 면적이 프레임의 50% 초과 시 양호 / 50% 미만 시 부적합 신호.

### 2-D. deeplink 포맷
```
https://claude.ai/new?
  q=<URL-encoded 프롬프트 본문>
  &project=<KKOTIUM 프로젝트 ID, 가능 시>
```

프롬프트 본문 (생성 코드 자동 주입):
```
꽃틔움 가든 디자인 작업 — 상품 ID: {productId}
상품명: {productName}
카테고리: {category}
conceptTone: {colorMood}/{pricePosition}/{emotionalTone}/{persona}/{genre}
도매꾹 원본 URL: {sourceImageUrl}
필요 작업: [누끼 / 배경 씬 / 둘 다]

가이드:
1. 도매꾹 원본을 Adobe CC 업로드 (asset_initialize_file_upload)
2. image_remove_background로 누끼 PNG 추출
3. (옵션) Firefly 웹에서 backdrop 씬 생성 (프롬프트 키트 참조)
4. Storage 적재: scripts/upload-cutout.js {productId} <누끼 경로>
   (배경: scripts/upload-backdrop.js {productId} <skeletonId> <배경 경로>)
5. 앱으로 돌아가 4변형 재생성 확인
```

### 2-E. 구현 (Code 다음 세션 SCOPE)
- 신규: `src/components/atoms/ClaudeDesignCTA.tsx` (deeplink 생성 + window.open)
- 신규: `src/lib/diagnosis/cutout-suitability.ts` (자동 누끼 적합 판단)
- 수정: `ThumbnailCard.tsx` — assetSource fallback 시 CTA 노출
- 수정: `useStudioActions.ts` — 진단 결과에 cutoutSuitability 필드 추가

---

## 3. Touchpoint ② — Claude 앱 디자인 세션 (현재 진행 가능)

### 3-A. 작업 흐름 (대표가 수행, Claude MCP 보조)
1. 앱에서 "Claude로 디자인" 버튼 -> Claude 앱 새 대화 (productId·프롬프트 자동 첨부)
2. Claude가 STEP 0으로 productId 컨텍스트 정독 (Supabase MCP로 Diagnosis 조회)
3. **누끼**: 도매꾹 원본 -> Adobe CC 업로드 -> image_remove_background (실증 동선 6단계, G8-ENGINE-Q1과 동일)
4. **배경 씬** (lifestyle 변형용): Firefly 웹에서 프롬프트 키트(아래 §4) 기반 생성 -> 로컬 저장
5. **적재**: Code 환경 또는 Supabase MCP(service role 키 가용 시)로 Storage 적재
6. **완료 신호**: 앱 polling이 자동 감지 -> 4변형 재생성

### 3-B. Adobe MCP 가용 도구 (현재 검증된 동선)
| 도구 | 용도 | 검증 |
|---|---|---|
| `asset_initialize_file_upload` + 청크 PUT + `finalize` | 도매꾹 원본 -> CC 업로드 | G8-ENGINE-Q1 실증 |
| `image_remove_background` | 누끼 (배경 제거) | G8-ENGINE-Q1 실증 (rembg 대비 우위) |
| `image_select_subject` | 자동 누끼 적합성 판단 | 신규 활용 |
| `image_adjust_*` (exposure/highlights/temperature) | 누끼 후 색보정 | 차후 |
| `asset_search(GenAIAsset)` | Firefly 웹 생성물 검색 | G8-ENGINE-Q1 실증 |
| `search_design` + `fill_text` | Express 템플릿 (다른 슬롯) | 차후 |

### 3-C. Firefly 한계 명시 (#46)
- Firefly **생성형** MCP는 현재 미노출 -> 생성은 Firefly **웹앱**에서 수동.
- `asset_search(GenAIAsset)`로 웹 생성물을 Claude가 검색·수집 가능 -> 적재 자동화 길은 열림.

---

## 4. Firefly 프롬프트 키트 — 아이스트레이 backdrop 3종 (즉시 사용 가능)

진단 정합: warm / budget / friendly / minimal / senior
공통 룰: 1:1 정사각, **중앙 비움**(제품 누끼 합성됨), no text / no people / no logo
출력: 1080x1080 PNG (Firefly Image Model 3, Style: Photo)

### A. 자연광 주방 (Natural Light Kitchen) — warm 정합 최우선

```
A bright minimalist Scandinavian kitchen counter, light oak wood surface,
soft warm morning sunlight streaming from the left side, gentle window light,
clean empty center space approximately 60% of the frame for product placement,
shallow depth of field, soft bokeh background of blurred kitchen shelves,
photorealistic, professional product photography backdrop, 1:1 square,
no text, no people, no logos, no brands.
```
**용도**: lifestyle 변형 기본 backdrop

### B. 모던 미니멀 스톤 (Modern Minimal Stone) — 신뢰감 보강

```
A modern minimalist kitchen scene with a smooth light-beige microcement
countertop, soft diffused overhead light, subtle shadow gradients, sense of
quiet luxury and spaciousness, completely empty center area for product,
muted warm tones, photorealistic interior, 1:1 square composition,
no text, no people, no logos.
```
**용도**: price 변형 backdrop

### C. 감성 라이프스타일 (Cozy Sensory) — emotionalTone=friendly 정합

```
A cozy home kitchen scene, warm afternoon sunlight, light wood cutting board
at the bottom edge, a few fresh mint leaves and lemon slices arranged only
at the corners (not center), soft natural ambiance, warm cream and sage
color palette, empty central space for product placement, photorealistic,
1:1 square, no text, no people, no logos.
```
**용도**: badge 변형 또는 SNS 광고

### 생성 후 체크리스트
- [ ] 중앙이 비어있는가 (프레임 면적 약 60%)
- [ ] 사람·텍스트·로고 0건
- [ ] 1:1 정사각 비율
- [ ] 톤이 따뜻한가 (warm 정합)
- [ ] 1080x1080 이상 PNG/JPG

---

## 5. Touchpoint ③ — 앱 자동 새로고침 (polling)

### 5-A. 동작
- studio/PLANT의 ThumbnailCard가 60초마다 `/api/thumbnail/<id>?head=true` (HEAD 또는 가벼운 metadata-only 호출).
- assetSource 응답이 `fallback` -> `auto-cache`로 변경 감지 시:
  1. 사용자에게 토스트 알림 "디자인 자산이 적용되었습니다. 4변형을 다시 생성하시겠어요?"
  2. 1클릭 재생성 -> 프리미엄 4변형 표시

### 5-B. 폴링 ON/OFF 조건
- ON: assetSource에 fallback 항목이 있고, 사용자가 Claude로 점프한 이력이 있을 때 (sessionStorage 마커)
- OFF: 모든 자산이 auto-cache이거나 사용자가 페이지 떠난 후 5분 경과

### 5-C. 구현 (Code 다음 세션 SCOPE)
- 신규: `/api/thumbnail/<id>/asset-status` (가벼운 metadata-only 엔드포인트, base64 미반환)
- 수정: `useStudioActions.ts` polling 로직 + sessionStorage 마커
- 수정: `ThumbnailCard.tsx` 토스트 알림 + 1클릭 재생성

---

## 6. Code 붙여넣기 메시지 (새 Claude Code 세션)

```
꽃틔움 가든 Code. Phase G8-ENGINE-Q3 Claude MCP 워크플로 + Firefly 적재 자동화.
[STEP 0] CLAUDE.md + PROGRESS 헤더 + TASK_BRIDGE §3 +
  docs/handoff/CLAUDE_MCP_DESIGN_WORKFLOW_2026-05-29.md +
  docs/handoff/KKOTIUM_ASSET_ENGINE_2026-05-28.md 정독.
[베이스라인] b33b286 (G8-ENGINE-Q2 [코드 완료], Pretendard 두부 해소).
[근거] 자동 누끼 한계 + Firefly 생성형 MCP 미노출 -> 대표 디자인 통제권(B레이어)을
  자연스러운 워크플로로 시스템화. 앱 진단 카드 -> Claude 앱 점프 -> Storage 적재 -> 폴링.
[SCOPE] (의존성 순서):
  1. scripts/upload-backdrop.js 신규 — Storage product-assets/{id}/backdrop-{skeletonId}.png 적재
     (upload-cutout.js 동일 패턴, .env.local service role).
  2. src/lib/diagnosis/cutout-suitability.ts 신규 — 자동 누끼 적합 휴리스틱
     (P-Filter multiObject + person 신호로 부적합 판정).
  3. src/components/atoms/ClaudeDesignCTA.tsx 신규 — deeplink 생성
     (claude.ai/new?q=URL-encoded 프롬프트). 자동 첨부: productId/conceptTone/sourceImageUrl/적재 가이드.
  4. ThumbnailCard 수정 — assetSource fallback + cutoutSuitability=unsuit 시 CTA 노출.
  5. /api/thumbnail/<id>/asset-status 신규 — 가벼운 metadata-only 엔드포인트 (base64 미반환).
  6. useStudioActions polling 60s + sessionStorage 마커 + 토스트 알림.
  각 단계 TSC0/build0/verify-vercel exit0.
[검증] production:
  - 누끼 fallback 상품의 진단 카드에 "Claude로 디자인" 버튼 노출
  - deeplink 클릭 -> Claude 앱 새 대화 + 프롬프트 자동 첨부
  - Storage 적재 후 60초 내 폴링이 auto-cache 감지 -> 토스트
  - 1클릭 재생성 -> 4변형 프리미엄 발현
[절대준수] 한글 literal / 이모지 금지(Lucide) / 영어 주석 / heredoc 금지(#26) /
  거짓 라벨 금지(#46) / new PrismaClient 금지 / 외부 이미지 API 런타임 0(#38) /
  Production=Vercel / SD-01 보존 / 비가역 0.
[병행 Desktop/대표] §4 프롬프트 키트로 Firefly 웹 backdrop 생성 -> 
  Code가 만든 upload-backdrop.js로 적재 -> 4변형 검증.
```

---

## 7. 작업 유의사항

- **자동화 vs 디자이너 통제**: 자동 누끼·자동 생성은 한계가 명확. **대표 디자인 통제권은 자산**이지 비효율이 아님. 워크플로는 통제권을 빠르게 행사하도록 돕는 것이 목적.
- **Firefly 생성형 MCP 미노출 정직 (#46)**: 생성은 웹앱 전용. `asset_search(GenAIAsset)`로 수집만 가능.
- **deeplink 한계**: `claude.ai/new?q=...` 길이 제한(브라우저 URL 한계 ~2000자). 긴 프롬프트는 sessionStorage 임시 저장 + Claude 앱 진입 후 첫 메시지로 다시 주입하는 방식 검토.
- **법적 4-point 게이트**: AI 생성 backdrop은 lifestyle 변형만. clean(대표이미지)은 실사 누끼만(네이버 대표이미지 정책).
- **#38 외부 이미지 API 런타임 0**: production은 Storage 사전 적재본만. Adobe/Firefly MCP는 Desktop/Claude 앱 세션 전용.
- **SD-01 / 비가역 0**: 아랍어 footer 보존, 네이버 미발행.
EOF
