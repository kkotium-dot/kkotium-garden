# 무드-카메라 스펙 이미지 생성 시스템 — 심층 리서치 결과
> 2026-06-16 · 세션8 · 전상품 공통 이미지 생성 시스템 설계 근거
> 코드화 산출물: `docs/design/MOOD_CAMERA_SPEC_SYSTEM.md` (이 리서치를 시스템으로 박제)

---

## 0. 한 줄 요약 (대표님용)

상품 종류는 무한하지만 **사진 무드는 6개로 수렴**한다. 무드를 "예쁜 분위기"가 아니라 **무엇을 파는가(전환 기능)** 로 분류하면, 처음 보는 상품도 무드 축 판정 → 카메라 스펙 조회 → 프롬프트 조립 → 생성으로 흘려보낼 수 있다. 상품별 하드코딩 0. 잘 나온 조합은 라이브러리에 버전으로 쌓여 시스템이 똑똑해진다.

핵심 발견 3가지:
1. **카메라 스펙은 실제로 작동하는 레버** — Google 공식 가이드가 "카메라 종류를 지정하면 이미지의 시각적 DNA가 바뀐다"고 명시. 무드별로 카메라/렌즈/조명을 다르게 매핑하되, 후보정 그레이드(필믹·그레인·매트)는 컬렉션 전체에 통일.
2. **벤치마크는 카테고리별로 전환** — 유아·임산부=무인양품/이솝(신뢰·클린), 인테리어·집들이=오늘의집/29CM(욕망·큐레이션), 일상잡화=컬리/쿠팡(명료·전환).
3. **★ Nano Banana / Gemini는 네거티브 프롬프트 필드가 없다** — 제외 요소는 "긍정형 표현"으로 작성해야 함 (예: "no cars"가 아니라 "empty street"). 이게 그동안 제외가 안 먹힌 근본 원인.

---

## 1. 무드 분류 체계 (6축) — 전환 기능 기준

> 분류 원칙: **무엇을 파는가**로 분류. 상품 유형은 무한하나 전환 기능(job)은 소수로 수렴.
> 들어오는 상품은 6축 각각 0~2점으로 채점 → 최고점 = 주 무드(카메라 스펙 결정), 차점 = 히어로 변형용.

| # | 무드 축 (기능) | 한글 | 파는 것(전환 job) | 대표 상품군 | 벤치마크 DNA |
|---|---|---|---|---|---|
| M1 | TRUST / SAFETY | 신뢰·안심 | "안전하다, 깨끗하다, 내 아이/몸에 순하다" | 유아·임산부·위생·수유 | 무인양품 / 이솝 |
| M2 | DESIRE / ASPIRATION | 욕망·동경 | "우리 집이 이렇게 보였으면" | 인테리어·데코·집들이 선물 | 오늘의집 / 29CM |
| M3 | CLARITY / EFFICIENCY | 명료·효율 | "받을 물건이 정확히 보인다, 빠르다" | 일상 생활용품·잡화 | 마켓컬리 / 쿠팡 |
| M4 | WARMTH / COZY | 따뜻·코지 | "포근하다, 위안된다, 사람 사는 느낌" | 패브릭·조명·주방·선물 | 29CM / 오늘의집 |
| M5 | PLAYFUL / DELIGHT | 발랄·재미 | "재밌다, 명랑하다, 선물하기 좋다" | 키즈·노벨티·베이비샤워 | 밝은 라이프스타일 커머스 |
| M6 | PREMIUM / CRAFT | 프리미엄·감각 | "고급스럽다, 값어치 한다" | 디자인 오브제·프리미엄 선물 | 이솝 / 29CM |

**6축이 유한하고 완전한 이유:** 모든 커머스 이미지는 최소 하나를 한다 — 안심시키기(M1)·유혹하기(M2)·정보전달(M3)·위안주기(M4)·즐겁게(M5)·격상시키기(M6). 꽃틔움 하우스 디폴트 = M4(코지) + M2/M6(트렌디·감각) 블렌드. 유아·임산부 상품은 M1으로 당겨짐.

**색채 심리 근거:** 파스텔=돌봄·안심(유아 신뢰), 화이트=청결·순수·안전(M1 팔레트), 앰버 웜톤=코지(M4).

---

## 2. 무드별 카메라 / 렌즈 / 조명 / 그레이드 매핑

> 카메라 바디·렌즈·조명·그레이드·리얼리즘은 무드별로 **다르게**(하이브리드 요구). 그 위에 **통일된 후보정 그레이드**를 컬렉션 전체에 입혀 혼합 카메라 세트도 한 촬영처럼 보이게 함.

| 무드 | 카메라 아키타입 | 렌즈/조리개 | 조명 | 컬러 그레이드 | 리얼리즘 단서 | 해상도/비율 |
|---|---|---|---|---|---|---|
| M1 TRUST | 중형(핫셀블라드풍) | 100mm 매크로/80mm, f/8 | 대형 소프트박스 1등, 무그림자 하이키 | 클린·중립쿨·트루화이트 | 선명 미세질감, 그레인 최소 | 4K, 1:1 / 4:5 |
| M2 DESIRE | 풀프레임 시네마(라이카풍) | 35~50mm, f/2.8 | 부드러운 창광 + 웜 앰비언트 | 웜·가벼운 필믹 | 은은한 보케, 생활 소품 | 4K, 4:5 / 4:3 |
| M3 CLARITY | 클린 풀프레임 | 50mm, f/8 | 균일 다광원, 무그림자 | 중립·정확 | 끝까지 샤프, 방해요소 0 | 2K, 1:1 |
| M4 WARMTH | 풀프레임/라이카 글로우 | 50mm, f/2.0 | 웜 사이드 창광, 긴 부드러운 그림자 | 웜 앰버·매트 | 부드러운 폴오프, 파인 그레인 | 4K, 4:5 |
| M5 PLAYFUL | 크리스프 풀프레임 | 35~50mm, f/4 | 밝은 균일 데이라이트 | 채도↑·명랑 | 클린, 약한 팝, 그레인 최소 | 2K, 1:1 |
| M6 PREMIUM | 중형/페이즈원 | 90~100mm, f/5.6~f/8 | 키아로스쿠로 방향광, 통제 대비 | 깊고 뮤트·정제 | 스페큘러 통제, 미세 그레인 | 4K, 4:5 |

**통일 컬렉션 그레이드(전 무드 고정):** 필믹 톤커브 + 파인 필름 그레인 + 매트 블랙포인트 리프트 + 부드러운 하이라이트 롤오프.

**네이버 사이징/SEO:** 상세 이미지 ~860px 폭(최대 20MB, 1장 ≤5000px), 썸네일 ≥1000px 고해상 권장(저해상 자동 후순위). 2K/4K 생성 후 썸네일 크롭 추출.

---

## 3. 하이브리드 벤치마크 시스템 (벤치마크 DNA 태깅)

> 각 무드 축에 `benchmark_dna` 태그를 달아, 단일 레퍼런스 고정이 아니라 **카테고리별로 시각 레퍼런스가 전환**되게 함.

| 벤치마크 DNA | 시각 시그니처 | 적합 무드 | 카테고리 적합 |
|---|---|---|---|
| 무인양품(MUJI) | "여백"(하라 켄야), 무로고, 중립, 절제 | M1, M6 | 유아·위생·미니멀 |
| 이솝(Aesop) | 앰버/어스톤, 약국 감성, 타입 중심 캄 | M1, M6 | 프리미엄 케어 |
| 오늘의집(Ohou) | 실거주 스타일링컷, 맥락적, 이미지콘텐츠 중심 | M2, M4 | 인테리어·집들이 |
| 29CM | 에디토리얼 매거진 감성, "감도 깊은 취향" 큐레이션 | M2, M4, M6 | 디자인 지향 라이프스타일 |
| 마켓컬리(Kurly) | 클린 통일 썸네일, 상품 전면, 세로 롱 | M3 | 일상·식품형 명료 |
| 쿠팡(Coupang) | 최대 명료, 빠른 이해 | M3 | 범용 생필품 |

**매핑 로직 한 줄:** 유아·임산부 → 무인양품 클린 신뢰 / 인테리어·집들이 → 오늘의집·29CM 욕망 / 일상잡화 → 컬리 효율 명료.
태그는 `MoodAxis.benchmark_dna[]`에 저장 → 조립된 프롬프트마다 따라다님 → 추후 레퍼런스 이미지 앵커링에 활용(Nano Banana 멀티모달 최대 14장 참조 가능, 각 참조에 명시적 역할 1개).

---

## 4. 프롬프트 빌딩블록 조립기

> 전부 영어(이미지 생성은 영어가 최적). 신뢰 순서: **Subject → Surface → Light → Lens/Camera → Finish**. 정확한 색(hex)·제외는 별도 슬롯.
> 조립 = `[SUBJECT + 팔레트 + 광](상품 가변) + [CAMERA + 렌즈 + 해상도 + 리얼리즘](무드표 조회) + [공통 그레이드 + 제외](고정)`

**고정 공통 그레이드 블록(전 상품):**
```
unified collection grade: filmic tone, fine film grain, matte finish,
soft highlight roll-off, photorealistic commercial product photography,
professional accurate color
```

**★ 제외 블록 — 긍정형 표현 (Nano Banana는 네거티브 필드 없음):**
Google 공식: "원하지 않는 것이 아니라 원하는 것을 묘사하라." 따라서 "no people / no text" 대신:
```
clean composition containing only the product and its soft shadow,
plain uncluttered background, realistic photograph only
```
+ 선언형 제약(Gemini는 본문 내 선언형은 존중):
```
no on-image text, no logos, no human figures, no illustration or painting.
```
디퓨전/Flux 폴백 경로에서만 네거티브 필드(콤마 리스트, CFG 기반)에 옮김.

**무드 축별 즉시 사용 템플릿** (`[…]` 치환):

- **M1 TRUST:** `A [product] in soft [palette] tones on a smooth white seamless surface, lit by a single large softbox creating near-shadowless even light, shot on a medium-format camera with a 100mm macro lens at f/8, crisp fine surface detail, clean and calm. [공통그레이드] [제외]`
- **M2 DESIRE:** `A [product] styled in a sunlit modern home corner with subtle props, soft window daylight from camera left with warm ambient glow, shot on a full-frame camera with a 50mm lens at f/2.8, gentle background bokeh, editorial lifestyle mood. [공통그레이드] [제외]`
- **M3 CLARITY:** `A [product] centered on a pure white background, even multi-source shadowless lighting, shot on a full-frame camera with a 50mm lens at f/8, edge-to-edge sharp focus, true accurate color, e-commerce catalog clarity. [공통그레이드] [제외]`
- **M4 WARMTH:** `A [product] on a warm wooden surface in cozy domestic light, warm side window light with long soft shadows, shot on a full-frame camera with a 50mm lens at f/2.0, soft falloff, amber matte tone. [공통그레이드] [제외]`
- **M5 PLAYFUL:** `A [product] on a bright pastel surface, cheerful even daylight, shot on a full-frame camera with a 35mm lens at f/4, clean and crisp with a light cheerful pop. [공통그레이드] [제외]`
- **M6 PREMIUM:** `A [product] on a deep muted backdrop, directional chiaroscuro lighting with controlled contrast, shot on a medium-format camera with a 90mm lens at f/5.6, refined specular highlights, premium craft mood. [공통그레이드] [제외]`

**순서/가중 규칙:** (a) 강하고 구체적인 subject로 시작 (b) 렌즈/카메라 줄이 체감 리얼리즘 최고 레버 (c) 광원은 1개만 잘 묘사(3개 명시하면 탁해짐) (d) 80~250단어 (e) 정확 색은 hex + 기존 제품 이미지 편집 시 "구조/스티치/그림자 보존" 절 추가 (f) 충돌 스펙 금지(예: "shallow DoF" + "f/16").

---

## 5. 누적 학습형 프롬프트 라이브러리

> 프롬프트를 생산 자산으로 취급: 불변 버전, 롤백, 평점, 태깅. 운영 UX는 3단계 유지(무드 선택 → 조립 → 생성). 학습은 수동적으로 포착 — 결과물 즐겨찾기/평점만 하면 검증된 조합이 다음 무드 픽커 상단으로.

**Prisma / Supabase 데이터 모델 스케치:**
```
MoodAxis        (id, code M1..M6, name_ko, conversion_job, benchmark_dna[])
CameraSpec      (id, mood_axis_id FK, camera_archetype, lens, aperture,
                 lighting, color_grade, realism_cues, resolution, aspect_ratio)
PromptBlock     (id, type: subject|surface|light|camera|finish|exclusion,
                 mood_axis_id FK nullable, body_en, is_fixed bool)
PromptLibraryEntry (id, mood_axis_id FK, benchmark_dna,
                 assembled_prompt, camera_spec_id FK,
                 product_category_tags[], example_output_url,
                 rating int 1-5, is_favorite bool, version int,
                 parent_id FK self, created_at, updated_at)
Generation      (id, entry_id FK, product_name, output_url,
                 model 'nano-banana-pro'|'nano-banana-flash',
                 rating, naver_ctr float nullable, created_at)
```

**버전 규율:** 발행된 `PromptLibraryEntry`는 절대 변형 금지 — 수정 시 `version`++ 새 행 + `parent_id` 포인터(불변 이력 → 즉시 롤백). 즐겨찾기 + 평점 + `product_category_tags[]`가 "똑똑해지는" 메커니즘: (무드축, 카테고리)별 최고 평점 항목이 자동 추천 디폴트. 선택적으로 `naver_ctr`을 생성별 저장 → 실제 썸네일 성과로 재랭킹.

---

## 6. 확장성 아키텍처 (3계층)

- **Layer 1 — 결정 테이블(상품과 디커플):** 입력=무드 시그널(6축 0~2점 + 카테고리 태그), 출력=`CameraSpec` 행 전체. 순수 룩업 테이블이라 행 추가/규칙 튜닝이 조립기·상품코드를 건드리지 않음. (정책=어떤 룩이 어떤 무드에 / 프로세스=프롬프트 조립 분리)
- **Layer 2 — 프롬프트 조립기:** `[가변 subject/팔레트/광]` + `[Layer1 조회 카메라/리얼리즘]` + `[고정 그레이드/제외]` → 최종 영어 프롬프트.
- **Layer 3 — 가드/개입 체크:** `camera_variety_applied`(배치 전체 동일 디폴트 카메라면 거부 — "단일 디폴트 금지"), `benchmark_dna_set`, `exclusions_present`, `settings_verified`(해상도/비율 무드 스펙 일치).

**미지 상품 흐름(상품별 코딩 0):**
`신규 SKU → 6축 채점 → Layer1 CameraSpec 조회 → Layer2 프롬프트 조립 → Layer3 가드 통과 → Firefly(Nano Banana) 생성 → 대표님 평점/즐겨찾기 → 라이브러리가 우승 조합 포착`

---

## 7. 권장 단계 (롤아웃)

| 단계 | 내용 | 임계 신호 |
|---|---|---|
| Stage 1 (1주) | 6축 + CameraSpec + 6 템플릿 Supabase 시드, 3단계 UI, Layer3 가드 | 무드 수동 오버라이드 >30%면 채점 루브릭 정밀화 |
| Stage 2 (2~4주) | 즐겨찾기 + 평점 활성. ~50건 후 (무드,카테고리)별 최고평점 자동 승격 | — |
| Stage 3 (2개월+) | SKU당 무드 2변형 A/B → 실제 네이버 썸네일 CTR로 Layer1 재가중 | 안정 표본에서 명확 우위 시 챌린저 채택(단기 노이즈 무시) |

**모델 티어링:** Nano Banana Flash(~10cr)로 구도/초안 → Nano Banana Pro/Gemini 3 Pro(~40cr)로 발행 히어로(유리·반사·복합광 월등). 제외는 항상 긍정형, Gemini에 `negativePrompt` 필드 절대 전송 금지.

**SEO 위생:** 키워드 풍부 파일명 + alt, 썸네일 ≥1000px, 상세 ~860px, 카테고리당 그레이드 통일(네이버·구매자가 보상하는 "프로페셔널·정제" 신뢰 신호).

---

## 8. 주의사항 (Caveats)

- **텍스트 렌더링 불안정** — 길어지면(~3~8단어 초과) 급락. 클린 이미지 생성 후 한글 마케팅 카피는 Photoshop/Canva로 후작업. (Nano Banana Pro는 개선됐으나 생성마다 검증)
- **"카메라 바디" 프롬프트는 스타일 바이어스지 센서 물리 에뮬 아님** — 핫셀/라이카/후지는 스타일 레버로 취급.
- **출처·정직성:** 모든 생성물에 C2PA + SynthID 워터마크. 네이버/마켓 AI 이미지 정책 확인, 실제 제품 왜곡 금지(오늘의집은 타인 이미지 사용 금지 명시). 정확 충실도 필요 제품은 실제 제품을 레퍼런스 이미지로 앵커.
- **무드 채점은 초기엔 주관적** — 평점/CTR 피드백 루프가 교정 장치. 자동 디폴트 신뢰까지 수 주 누적 필요.
- **아키텍처 뉘앙스:** 프롬프트 패턴 계층이 일관성 ~80% / 나머지 ~20%(운영자·시간에 따른 드리프트)는 저장·버전 라이브러리가 해결. 버전 라이브러리 생략 금지.

---

## 9. 출처 (핵심)

- Lindgaard, Fernandes, Dudek & Brown (2006), "Attention web designers: You have 50 milliseconds to make a good first impression!", *Behaviour & Information Technology* 25(2):115–126 — 시각 매력 50ms 내 형성.
- Google Cloud Blog, "Ultimate prompting guide for Nano Banana" — 카메라 종류가 시각 DNA 변경, 긍정형 표현 권장, 조명 용어.
- Apiyi API Guide (2025) — Nano Banana Pro(Gemini 3 Pro Image) `negativePrompt` HTTP 400.
- 무인양품/이솝/오늘의집/29CM/마켓컬리/쿠팡 — 카테고리별 비주얼 벤치마크 시그니처.
