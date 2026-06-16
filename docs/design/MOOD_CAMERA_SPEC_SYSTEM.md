# 무드-카메라 스펙 이미지 생성 시스템 (전상품 공통)
> 권위 문서 · 2026-06-16 박제 · 근거: `docs/research/MOOD_TO_CAMERA_SPEC_RESEARCH_2026-06-16.md`
> 적용 범위: **모든 상품**. 명화 디퓨저는 검증 케이스일 뿐, 단건 패치 금지(#55).
> 등록 워크플로 연결: `docs/design/PRODUCT_REGISTRATION_WORKFLOW.md` §6 이미지 단계에서 이 시스템 호출.

---

## 0. 이 문서의 목적

상품마다 따로 카메라를 정하지 않는다. **무드 축을 판정 → 카메라 스펙 자동 조회 → 프롬프트 자동 조립 → 가드 통과 → 생성.** 상품별 하드코딩 0. 처음 보는 상품도 이 흐름 하나로 처리. 잘 나온 조합은 라이브러리에 버전으로 쌓여 시스템이 학습됨.

**근본 교정(이번 세션 발견):**
1. v5 템플릿이 4향 전부에 `Sony A7 50mm f/1.8`를 하드코딩 → "전부 소니" 현상의 근본 원인. 단일 디폴트 금지(가드 `camera_variety_applied`).
2. 편집 모드에서 생성 이미지가 자동으로 참조(0/6→1/6)에 붙어 다음 생성을 오염 → "April·Cotton이 비슷"했던 근본 원인. 매 컷 전 참조 클리어 필수.
3. Nano Banana/Gemini는 네거티브 프롬프트 필드 없음 → 제외가 안 먹혔던 근본 원인. 긍정형 표현으로 작성.

---

## 1. 무드 6축 (전환 기능 기준)

> 상품 유형 무한, 사진 무드 유한. 분류 기준 = **무엇을 파는가**.
> 신규 상품은 6축 0~2점 채점 → 최고점 주 무드(카메라 결정), 차점 히어로 변형용.

| 코드 | 무드 | 파는 것 | 대표 상품군 | 벤치마크 DNA |
|---|---|---|---|---|
| M1 | 신뢰·안심 TRUST | 안전·청결·순함 | 유아·임산부·위생·수유 | 무인양품/이솝 |
| M2 | 욕망·동경 DESIRE | "우리 집이 이렇게" | 인테리어·데코·집들이 | 오늘의집/29CM |
| M3 | 명료·효율 CLARITY | 정확히 보임·빠름 | 일상 생활용품·잡화 | 컬리/쿠팡 |
| M4 | 따뜻·코지 WARMTH | 포근·위안·사람냄새 | 패브릭·조명·주방·선물 | 29CM/오늘의집 |
| M5 | 발랄·재미 PLAYFUL | 명랑·선물하기 좋음 | 키즈·노벨티·베이비샤워 | 밝은 라이프스타일 |
| M6 | 프리미엄·감각 PREMIUM | 고급·값어치 | 디자인 오브제·프리미엄 | 이솝/29CM |

**꽃틔움 하우스 디폴트:** M4(코지)+M2/M6(트렌디·감각). 유아·임산부는 M1으로.

---

## 2. Layer 1 — 무드별 카메라 스펙 결정 테이블

> 순수 룩업. 입력=무드축+카테고리, 출력=아래 행. 상품과 디커플.

| 무드 | 카메라 | 렌즈/조리개 | 조명 | 그레이드 | 리얼리즘 | 해상도/비율 |
|---|---|---|---|---|---|---|
| M1 | 중형(핫셀풍) | 100mm 매크로, f/8 | 소프트박스 1, 무그림자 하이키 | 클린·중립쿨·트루화이트 | 미세질감, 그레인 최소 | 4K, 1:1/4:5 |
| M2 | 풀프레임 시네마 | 50mm, f/2.8 | 창광+웜 앰비언트 | 웜·가벼운 필믹 | 은은한 보케 | 4K, 4:5 |
| M3 | 클린 풀프레임 | 50mm, f/8 | 균일 무그림자 | 중립·정확 | 끝까지 샤프 | 2K, 1:1 |
| M4 | 풀프레임 글로우 | 50mm, f/2.0 | 웜 사이드 창광 | 웜 앰버·매트 | 부드러운 폴오프 | 4K, 4:5 |
| M5 | 크리스프 풀프레임 | 35mm, f/4 | 밝은 균일 | 채도↑·명랑 | 약한 팝 | 2K, 1:1 |
| M6 | 중형/페이즈원 | 90mm, f/5.6 | 키아로스쿠로 방향광 | 깊고 뮤트 | 스페큘러 통제 | 4K, 4:5 |

**통일 그레이드(전 무드 고정):** 필믹 톤 + 파인 그레인 + 매트 + 부드러운 하이라이트 롤오프. → 혼합 카메라 세트도 한 촬영처럼 보이게.

---

## 3. Layer 2 — 프롬프트 조립기

**구조:** `[SUBJECT+팔레트+광](상품 가변) + [CAMERA+렌즈+해상도+리얼리즘](Layer1 조회) + [공통그레이드+제외](고정)`
**순서:** Subject → Surface → Light → Lens/Camera → Finish. 전부 영어. 80~250단어.

**고정 공통 그레이드:**
```
unified collection grade: filmic tone, fine film grain, matte finish,
soft highlight roll-off, photorealistic commercial product photography,
professional accurate color
```

**★ 제외 — 긍정형 (Nano Banana 네거티브 필드 없음):**
```
clean composition containing only the product and its soft shadow,
plain uncluttered background, realistic photograph only.
no on-image text, no logos, no human figures, no illustration or painting.
```

**무드별 템플릿 (`[…]` 치환):**
- **M1:** `A [product] in soft [palette] tones on a smooth white seamless surface, lit by a single large softbox creating near-shadowless even light, shot on a medium-format camera with a 100mm macro lens at f/8, crisp fine surface detail, clean and calm.`
- **M2:** `A [product] styled in a sunlit modern home corner with subtle props, soft window daylight from camera left with warm ambient glow, shot on a full-frame camera with a 50mm lens at f/2.8, gentle background bokeh, editorial lifestyle mood.`
- **M3:** `A [product] centered on a pure white background, even multi-source shadowless lighting, shot on a full-frame camera with a 50mm lens at f/8, edge-to-edge sharp focus, true accurate color, e-commerce catalog clarity.`
- **M4:** `A [product] on a warm wooden surface in cozy domestic light, warm side window light with long soft shadows, shot on a full-frame camera with a 50mm lens at f/2.0, soft falloff, amber matte tone.`
- **M5:** `A [product] on a bright pastel surface, cheerful even daylight, shot on a full-frame camera with a 35mm lens at f/4, clean and crisp with a light cheerful pop.`
- **M6:** `A [product] on a deep muted backdrop, directional chiaroscuro lighting with controlled contrast, shot on a medium-format camera with a 90mm lens at f/5.6, refined specular highlights, premium craft mood.`

(각 템플릿 끝에 공통 그레이드 + 제외 블록 append)

---

## 4. Layer 3 — 가드 / 개입 체크 (firefly_auto 카드 subcheck)

| subcheck | 통과 조건 | 실패 시 |
|---|---|---|
| `cameraVarietyApplied` | 배치 내 카메라 스펙이 무드별로 다름(단일 디폴트 금지) | 카드 RED, 재조립 유도 |
| `referenceCleared` | 생성 직전 참조 0/N (편집모드 오염 방지) | 새 이미지(+) 클리어 개입 |
| `settingsVerified` | 비율/해상도/grounding이 무드 스펙과 일치 | 픽커 재설정 개입(트러스티드 클릭) |
| `exclusionsPresent` | 제외 블록(긍정형) 포함 | 프롬프트 보강 |
| `benchmarkDnaSet` | 무드축에 벤치마크 DNA 태그 존재 | 무드 재판정 |

> 카드는 자연스러운 개입점(#56)으로 노출 — 숨김/강제순서/모달 금지. 코드 레인에서 `src/lib/automation/intervention.ts` + firefly_auto 카드에 subcheck 추가.

---

## 5. 누적 학습형 라이브러리 (운영 3단계 유지)

**운영 UX:** 무드 선택 → 조립 → 생성. 끝. 학습은 결과물 즐겨찾기/평점만으로 수동 포착.

**데이터 모델(Prisma/Supabase):**
```
MoodAxis(id, code M1..M6, name_ko, conversion_job, benchmark_dna[])
CameraSpec(id, mood_axis_id FK, camera_archetype, lens, aperture,
           lighting, color_grade, realism_cues, resolution, aspect_ratio)
PromptBlock(id, type subject|surface|light|camera|finish|exclusion,
            mood_axis_id FK?, body_en, is_fixed)
PromptLibraryEntry(id, mood_axis_id FK, benchmark_dna, assembled_prompt,
            camera_spec_id FK, product_category_tags[], example_output_url,
            rating 1-5, is_favorite, version, parent_id FK self, timestamps)
Generation(id, entry_id FK, product_name, output_url,
           model, rating, naver_ctr?, created_at)
```
**규율:** 발행 엔트리 불변 — 수정 = version++ 새 행 + parent_id(즉시 롤백). (무드,카테고리)별 최고평점 = 자동 추천 디폴트.

---

## 6. 미지 상품 적용 흐름 (상품별 코딩 0)

```
신규 SKU 인입
  → ① 무드 6축 채점(0~2) → 주/차 무드 확정
  → ② Layer1에서 CameraSpec 조회
  → ③ Layer2 프롬프트 조립(가변+조회+고정)
  → ④ Layer3 가드 5종 통과 확인
  → ⑤ Firefly(Nano Banana) 생성
  → ⑥ 대표님 평점/즐겨찾기 → 라이브러리 학습
```

**롤아웃:** Stage1 6축+템플릿+가드 시드 / Stage2 평점·즐겨찾기·자동승격 / Stage3 네이버 CTR A/B 재가중.
**모델 티어링:** 초안 Flash(~10cr) → 발행 히어로 Pro(~40cr).

---

## 7. ★ Firefly 편집모드 운영 4대 규칙 (오염 방지 — 전상품 공통)

> 편집 모드(`firefly.adobe.com/generate/image?view=edit`)에서 4컷 이상 연속 생성 시 필수.

1. **참조 클리어 우선:** 매 컷 생성 전 참조 0/N 확인. 직전 생성물이 자동 참조로 붙음 → 다음 생성 오염. 하단 히스토리 스트립 '새 이미지(+)' 버튼으로 클리어.
2. **트러스티드 클릭 구분:**
   - `SP-BUTTON`(생성)은 합성 JS 클릭 존중 → JS로 생성 가능.
   - `SP-ACTION-BUTTON`(새 이미지) / `sp-picker`(비율) / `sp-switch`(grounding)는 합성 무시, **실제 트러스티드 클릭만 인정** → Claude-in-Chrome `find`→ref → `computer` ref 클릭.
3. **재오픈 후 설정 재검증:** 브라우저 재오픈하면 비율(4:5 소실→16:9/자동), grounding/2K는 잔존하나 항상 재확인. 픽커 수정은 트러스티드 클릭 필요.
4. **좌표 클릭 금지:** 스크린샷은 가변 윈도우 크기에서 스케일 캡처(관측: 0.457 비균일) → DOM 좌표≠스크린샷 좌표. JS getBoundingClientRect 또는 find+ref 클릭 사용.

**확정 셀렉터:**
- 프롬프트: 유일 visible TEXTAREA(shadow-DOM ≤9, 네이티브 세터로 주입).
- 비율 리프: `"표준 (4:5)"` (전체 라벨), 생성: `SP-BUTTON` text `"생성"`.
- 새 이미지: `FIREFLY-IMAGE-EDITOR-HISTORY-PANEL-NEW-IMAGE-BUTTON` > `SP-ACTION-BUTTON[aria-label="새 이미지"]` (하단 우측 +, 트러스티드 필요).
- 완료 신호: 참조 0/N → 1/N. 4:5 결과 = 1856×2304.
- 검증: Adobe MCP `asset_search(entityScope=GenAIAsset)` + `asset_inline_preview`(서버 base64, 브라우저 idle 무관).

---

## 8. 명화 디퓨저 적용 예시 (검증 케이스)

4향 = "하루의 빛" 4컷, 무드/카메라 분리(단일 디폴트 금지 검증):
| 컷 | 향 | 시간 | 카메라(원안) | 상태 |
|---|---|---|---|---|
| 1 | Lemon Eucalyptus | 아침 | Sony A7 50mm f/1.8 | 생성·검증·Adobe 보존 |
| 2 | Cotton Around | 한낮 하이키 린넨 | Hasselblad X2D 65mm | 생성·검증(오염 없음, 4:5/2K) |
| 3 | April Fresh | 오후 비갠 파스텔 | Canon EOS R5 RF85mm f/1.2 | 보류(개선 후) |
| 4 | Black Cherry | 해질녘 과수원 | Leica SL2 50mm f/1.4 | 보류(개선 후) |

> 컷3·4는 새 6축 시스템 + 신뢰 가능한 트러스티드 클릭 경로 확보 후 진행. 단건이 아니라 시스템으로 재개.

---

## 9. 명심 (Standing)

- 단일 디폴트 카메라 영구 금지(`cameraVarietyApplied`).
- 제외는 항상 긍정형. Gemini에 `negativePrompt` 필드 전송 금지.
- 매 컷 전 참조 클리어. 그레이드는 컬렉션 통일.
- 발견된 오류 = 전상품 시스템 가드로 승격(단건 수습 금지).
- 텍스트는 후작업(Photoshop/Canva). 정확 충실도 제품은 실제 제품 레퍼런스 앵커.
