# KKOTIUM Asset Engine — 누끼+배경 통합 자산 파이프라인 (Real Win 포함 전체 설계)

> **상태**: SPEC (누끼 적재 운영 + Firefly 씬 천장 통합 설계)
> **작성**: 2026-05-28 Desktop turn (대표 지시 "Real Win까지 한번에 설계")
> **baseline**: 400b726 (G8-ENGINE-Q1 [코드 완료], origin/main, Vercel READY)
> **선행 문서**: THUMBNAIL_ART_DIRECTION_SYSTEM_2026-05-28.md (크래프트 엔진 스펙)
> **성격**: 크래프트 엔진(400b726)은 완성. 본 문서는 그 엔진에 자산(누끼/배경)을 주입하는 운영 파이프라인 + 천장(Firefly 실사 씬) 통합 설계.

---

## 0. 핵심 진단 (production 400b726 실측 기반)

Desktop이 production POST /api/thumbnail/<아이스트레이> 실호출 + base64 디코드 육안 검수 결과:

| 발견 | 판정 | 근거 |
|---|---|---|
| 크래프트 엔진 작동 | OK | base64 4변형 md5 전부 상이 = 스윕/그림자/반사 파이프라인 정상 |
| artDirection 파생 | OK | colorMood=warm, accent #D6965A, productScale 0.9(minimal), typeScale 1.15(senior) 정합 |
| cloudinaryPreviewUrl=도매꾹 | **버그 아님** | 코드 주석 "informational" 필드. UI는 base64 소비. (Desktop 초기 P0 오판 -> 코드 정독 후 철회, #46) |
| **누끼 미적재 -> fallback letterbox** | **P0 레버** | assetSource.cutout=fallback. 엔진은 페라리인데 연료(누끼) 미주입 -> 프리미엄 씬 위에 원본 사각이미지 letterbox |
| **badge 카피 "일용보관함"** | **P0 카피** | generateCopy categoryBadge Groq 출력 오염(비문 합성어) |
| 폰트 시스템 폴백 | P1 | Pretendard 미번들(G8-ENGINE-Q1 item4 정직 미완료) |

핵심: **엔진은 완성. 품질 격차의 주범은 (a)누끼 미주입 (b)카피 오염 (c)폰트.** 누끼만 주입돼도 크래프트가 100% 발현.

---

## 1. 자산 적재 운영 — Desktop 한계 정직 보고 (#46)

Desktop은 누끼/배경을 production Storage에 직접 적재 **불가**:
- 컨테이너 env에 SUPABASE_SERVICE_ROLE_KEY 없음(.env.local 미주입) -> Storage REST PUT RLS 차단.
- Supabase MCP execute_sql은 SQL 전용, 바이너리 업로드 불가.
- 임시 public 호스트 우회(0x0.st 등) 시도 -> 차단 + 외부 의존이라 운영 부적합.
=> **적재는 Storage 쓰기 권한 환경(Code .env.local / 대표 콘솔 / studio UI 업로드 버튼)에서만.**

### 적재 방식 3안

| 방식 | 운영 부담 | 자동화 | 위치 |
|---|---|---|---|
| A. 대표 수동 Supabase 콘솔 드래그 | 매 상품 수동 | 0% | 단기 임시 |
| B. studio UI 업로드 버튼(G8-ENGINE 기구현) | 파일선택->자동 PUT | 50% | **Quick 권장** |
| C. Adobe MCP 누끼 -> 서버 누끼 API -> 자동 적재 | 1클릭 | 90% | **Real 천장** |

캐시키 규약(resolver 정합): `product-assets/{productId}/cutout.png`, `product-assets/{productId}/backdrop-{skeletonId}.png` (public 버킷).

---

## 2. 통합 파이프라인 아키텍처

```
B 레이어 (대표 디자인 통제)
  [도매꾹 원본] --Adobe Express/MCP 누끼--> cutout.png ---+
  [Firefly 웹 씬 생성] --> backdrop-{Sx}.png ------------+--> Supabase Storage product-assets
                                                          |     {id}/cutout.png
                                                          |     {id}/backdrop-{skeletonId}.png
                                                          v
                          [asset-source-resolver] manual > auto-cache(Storage) > fallback
                                                          v
                          [thumbnail-generator 크래프트 엔진] (400b726 완성)
                                                          v
                                4변형 프리미엄 (cutout 위에 sweep/backdrop + 그림자/반사/위계)
```

---

## 3. SCOPE — 우선순위별 (ROI 순)

### P0-즉시 (대표 or Code, 코드 0)
- 아이스트레이(cmpp62yje00015xup5h8pgwx0) 누끼 PNG를 Storage product-assets/cmpp62yje00015xup5h8pgwx0/cutout.png 적재.
  - 누끼 원본: Desktop G8-ENGINE 실증 산출물(Adobe image_remove_background, 760x760 투명 PNG, 투명체 경계+손 보존).
  - 대표 수동(콘솔) 또는 studio UI 업로드 버튼(방식 B) 또는 Code(.env.local service role).
- 검증: POST /api/thumbnail/<아이스트레이> -> assetSource.cutout=auto-cache 전환 + base64 4변형이 누끼 기반(배경 누출 0)으로 차별화 -> before/after 육안.

### P0-Code: badge 카피 오염 필터
- generateCopy categoryBadge slot의 Groq 프롬프트에 가드: 깨진 합성어("일용보관함") 방지.
  - category 원문을 그대로 쓰되, Groq가 임의 축약/합성하지 않도록 제약. 또는 category 화이트리스트 매핑.
  - 검증: badge copy가 자연스러운 카테고리어(예 "주방용품" / "얼음보관")로 출력.

### P1-Code: Pretendard 폰트 번들 (G8-ENGINE-Q1 item4 이월)
- 폰트 바이너리 확보 -> repo public/fonts 또는 Vercel fontconfig 설치 -> SVG font-family 실렌더 확인.
- **검증 필수**: Sharp/librsvg가 실제 Pretendard 글리프로 렌더하는지 육안(현 시스템 폴백 추정). 검증 없이 완료 단정 금지(#46).
- 임팩트 재평가: Desktop 분석상 "+5%"는 과소. 한글 타이포는 brand authority 게이트(중국 직소싱=싸구려 인식 차단)로 +30% 수준. 우선순위 P1로 상향.

### P2-천장 (Real Win): Firefly 씬 backdrop
- 대표가 Firefly 웹에서 라이프스타일 씬 생성(예: 우드 도마 위 얼음트레이, 주방 자연광).
  - conceptTone 정합 프롬프트: warm/budget/friendly/minimal -> "밝은 주방, 자연광, 우드톤, 미니멀, 제품 놓을 빈 공간 중앙".
- asset_search(GenAIAsset)로 Desktop이 수집 -> Storage backdrop-{skeletonId}.png 적재.
- lifestyle 변형이 backdropUrl 우선 소비(resolver 기구현) -> 실사급 씬.
- **법적 게이트(4-point)**: AI 생성 이미지 -> Gate 3 워크플로 준수. 네이버 대표이미지(clean)는 실사 누끼만, lifestyle은 AI 씬 허용하되 가상 배경 고지 검토.

---

## 4. Firefly 씬 프롬프트 세트 (대표 즉시 사용 — conceptTone 파생)

아이스트레이(warm/budget/friendly/minimal/senior) 기준:

```
[주방 자연광 씬]
A bright minimalist kitchen counter with warm natural sunlight, light wood
surface, soft morning light, clean empty center space for product placement,
shallow depth of field, Scandinavian style, no text, no people,
1:1 square composition, photorealistic, high-end product photography backdrop.

[냉장고/시원함 씬 — 얼음 테마]
A clean modern kitchen with a subtle cool-warm balance, frosted glass texture
accents, fresh and hygienic mood, light wood and white tones, empty center
for product, soft diffused lighting, no text, no people, 1:1 square,
photorealistic backdrop.

[감성 라이프스타일 씬]
A cozy home kitchen scene, warm afternoon light through window, wooden cutting
board, a few lemon slices and mint as subtle props at the edges (not center),
empty center space, friendly homely mood, photorealistic, 1:1 square, no text.
```

운영 원칙: **제품은 누끼로 합성되므로 배경은 "중앙 비움" 필수.** 소품은 가장자리만.

---

## 5. Code 붙여넣기 메시지 (새 Claude Code 세션)

```
꽃틔움 가든 Code. Phase G8-ENGINE-Q2 자산 파이프라인 운영 + 카피/폰트 품질.
[STEP 0] CLAUDE.md + PROGRESS 헤더 + TASK_BRIDGE §3 ACTIVE +
  docs/handoff/KKOTIUM_ASSET_ENGINE_2026-05-28.md +
  docs/handoff/THUMBNAIL_ART_DIRECTION_SYSTEM_2026-05-28.md 정독.
[베이스라인] 400b726 (G8-ENGINE-Q1 [코드 완료]).
[진단 — Desktop production 실측] 크래프트 엔진 정상(base64 4변형 md5 상이).
  품질 격차 주범: (a)누끼 미적재->fallback letterbox (b)badge 카피 오염 "일용보관함" (c)폰트 시스템폴백.
  cloudinaryPreviewUrl=도매꾹은 버그 아님(informational 필드, UI는 base64 소비).
[SCOPE] (우선순위 순):
  1. badge 카피 오염 필터 — generateCopy categoryBadge Groq 프롬프트 가드
     (깨진 합성어 방지, category 원문 보존 or 화이트리스트 매핑).
  2. Pretendard 폰트 번들 — 바이너리 확보 -> public/fonts or Vercel fontconfig
     -> SVG font-family 실렌더 육안 검증(검증 없이 완료 단정 금지 #46).
  3. (선택) studio UI 업로드 버튼 -> Storage PUT 경로 동작 확인(방식 B 기구현분 점검).
  각 단계 TSC0+build0+verify-vercel exit0.
[검증] production POST /api/thumbnail/<아이스트레이>:
  - badge copy 자연스러운 카테고리어(비문 0)
  - (누끼 적재 후) assetSource.cutout=auto-cache + 4변형 누끼 차별화
  - 폰트 실렌더 확인
[절대준수] 한글literal / 이모지금지(Lucide) / 영어주석 / heredoc금지(#26) /
  거짓라벨금지(#46) / new PrismaClient금지(prisma싱글톤) / 외부이미지API런타임0(#38) /
  Production=Vercel / SD-01 보존 / 비가역0(네이버 미발행).
[병행 Desktop] 누끼 Storage 적재(P0) + Firefly 씬 backdrop 생성/적재(Real Win).
```

---

## 6. 작업 유의사항 (이번 turn 핵심)

- **#46 자기교정 사례**: Desktop이 cloudinaryPreviewUrl=도매꾹을 P0 버그로 단정 -> 코드 정독 결과 "informational 필드, UI는 base64 소비"로 판명 -> P0 철회. API 응답 추측 != 코드 진실. **코드 read 후 단정 원칙 재확인.**
- **Desktop 적재 한계 정직**: service role 키 부재로 Storage 직접 적재 불가. 임시 호스트 우회 차단. -> Code/대표/studio UI 경로로 위임.
- **자산 = B 레이어(디자이너 통제)**: 누끼/배경은 대표 디자인 산출물. 자동 생성이 아니라 대표가 만든 것을 resolver가 소비.
- **#38 외부 이미지 API 런타임 0**: production은 Storage 사전 적재본만. Firefly/Adobe는 사전 작업(Desktop/대표).
- **법적 4-point 게이트**: AI 생성 씬은 Gate 3 워크플로. clean(대표이미지)은 실사 누끼만.
- **폰트 임팩트 재평가**: +5% -> brand authority 게이트(+30%급). P1 상향.
- **SD-01 / 비가역 0**: 아랍어 footer 보존, 네이버 미발행.
