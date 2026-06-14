# 향별 무드 배경 시스템 — 하루의 빛 시퀀스 (실사 마감 / 사실성 레인)

- date: 2026-06-13 / 세션7-g rev3 (Desktop)
- authority parent: `docs/design/SCENT_MOOD_BACKGROUND_SYSTEM.md`
- validation product: 명화 차량용 디퓨저 `cmpnooli40001f0gveaxr8iim`
- scope: product-agnostic system (#55) — 명화는 검증 케이스, 전상품 범용
- subject source: `myeonghwa_detail_v2.html` 상세페이지 향 설명 원문

---

## 0. 최상위 원칙 — #71 "진짜 예술은 진짜로 (Authenticity Realism Lane)"

AI 회화/유화 마감은 전 자산에서 금지. 예술성(명화)은 **실제 퍼블릭도메인 작품**으로만 authentic하게 둔다.

| 레인 | 슬롯 | 마감 | 근거 |
|---|---|---|---|
| AUTHENTIC-ART | 제품 라벨 / 브랜드 스토리(S5) | 실제 명화 reproduction · 퍼블릭도메인 진짜 모네 | 진짜 예술 = 진짜 |
| PHOTOREAL | 히어로 · 라이프스타일 · 향 씬 · 합성 · 썸네일 · 추가이미지 | 실사 카메라 촬영 품질 (회화 마감 0) | AI 이질감 0 · 프리미엄 신뢰 ↑ |

핵심: 명화 컨셉은 라벨(실제)과 S5 스토리(실제 모네)가 짊어진다. 향 씬·히어로·합성을 AI 유화로 칠하면 컨셉이 사는 게 아니라 AI 이질감만 생기고 신뢰가 깎인다.
전상품 적용: 슬롯마다 레인 태깅. 비명화 상품도 PHOTOREAL 룰(회화 마감 금지)은 보편 적용. 앱 개입점 = 사실성 레인 가드(§7).

---

## 1. 전체 톤 = "하루의 빛 시퀀스" (실사)

4컷이 같은 카메라 · 같은 실사 컬러그레이드 · 같은 구도 문법으로 찍힌 한 편의 사진 시퀀스. 차이는 오직 하루의 빛(시간).
- 통일축: 실사 카메라(Sony A7 50mm f/1.8) + filmic 컬러그레이드 + 상단중앙 여백(병 합성 자리)
- 차별축: 시간대 빛 / 색온도 / 명도 곡선 `중상 → 최상 → 중 → 중하`
- ★ 마감 = 실사 사진. 유화/회화/일러스트 마감 금지(#71).

---

## 2. 상세페이지 향 설명 원문 (subject source)

| 향 | 시간/빛 | 정물 피사체 (실사) | 향 설명 원문 | 명도/색온도 | 팔레트(상세 CSS 정합) |
|---|---|---|---|---|---|
| 레몬 유칼립투스 / LEMON EUCALYPTUS | 이른 아침·쿨 첫 햇살 | 레몬+유칼립투스, 이슬, 옅은 안개 | 상큼 시트러스 위 청량 유칼립투스, 막 깨어난 정원 공기 | 중상 / 쿨 | `#E6E9CE #C9D49B #B8C77E` |
| 코튼 어라운드 / COTTON AROUND | 한낮·하이키 직사광 | 잘 갠 흰 린넨·면직물, 창가 (꽃 ❌) | 볕에 마른 면, 갓 정리한 침구의 보송함 | 최상 / 웜뉴트럴 | `#F6F0E4 #E8DAC2 #D9C6A4` |
| 에이프릴 후레쉬 / APRIL FRESH | 비 갠 오후·확산광 | 연한 봄꽃+꽃잎 물방울, 비 갠 습기 | 부드러운 플로럴+깨끗한 머스크, 봄비 그친 오후 | 중 / 뉴트럴 | `#F1E7DF #E7CBD8 #D8B8C8` |
| 블랙 체리 / BLACK CHERRY | 해질녘·골든아워 | 잘 익은 체리+우디 가지, 과수원 | 달큰 체리+은은 우디, 해질녘 과수원 단내 | 중하 / 웜 | `#E9D7C8 #C98A6E #9E4B3C` |

코튼 일시품절(공급사) · 자가검사 HB21-12-2572(코튼) / HB19-12-1462(그 외 3향).

---

## 3. 공통 그레이드 표준 (4컷 동일 · 실사)

- 마감: photorealistic still-life photograph, natural light (NO painting / illustration / painterly)
- 그레이드: filmic color grade, fine photographic grain, matte finish, no oversaturation
- depth: shallow depth of field, gentle bokeh
- 구도: 상단중앙 breathing room(병 합성 자리) · 하단 정물 안착 · 하드 차량 엣지 금지
- camera standard: Sony A7 / 50mm f/1.8 (4컷 고정)
- negatives 공통: no people, no text, no logos, no painting, no illustration, no painterly effect
- negative COTTON 전용: NO flowers (직전 실패=참조로 april 꽃 유입)

---

## 4. Firefly 프롬프트 (paste-ready · v5 실사)

### LEMON EUCALYPTUS — 정원의 아침
```
A photorealistic still-life photograph of fresh lemons and eucalyptus sprigs on a pale stone ledge in an early-morning garden, dewdrops catching the first cool sunlight, soft natural mist, palette of light yellow-green and olive, crisp clean morning air, natural light, shallow depth of field with gentle bokeh, fine photographic grain, clean neutral-cool color grade, matte finish, clean breathing room in the upper-center for a small bottle, vertical composition, shot on Sony A7 50mm f/1.8, bright cool morning light. No people, no text, no logos, no painting, no illustration, no painterly effect.
```

### COTTON AROUND — 볕에 마른 면(린넨)
```
A photorealistic still-life photograph of crisp folded white linen and cotton fabric on a sunlit wooden surface near a bright window, soft warm midday sunlight, gentle natural fabric shadows, palette of warm cream beige and tan, clean fresh-laundry feeling, natural light, shallow depth of field, fine photographic grain, clean bright color grade, matte finish, clean breathing room in the upper-center for a small bottle, vertical composition, shot on Sony A7 50mm f/1.8, bright high-key midday light. No flowers, no people, no text, no logos, no painting, no illustration, no painterly effect.
```

### APRIL FRESH — 비 갠 꽃밭
```
A photorealistic still-life photograph of soft pastel spring blossoms with clean water droplets on the petals on a misty surface just after rain has cleared, diffused clearing afternoon light, palette of cream and soft rose-mauve, fresh dewy after-rain air, natural light, shallow depth of field with gentle bokeh, fine photographic grain, clean neutral color grade, matte finish, clean breathing room in the upper-center for a small bottle, vertical composition, shot on Sony A7 50mm f/1.8, soft afternoon light. No people, no text, no logos, no painting, no illustration, no painterly effect.
```

### BLACK CHERRY — 늦은 오후 과수원
```
A photorealistic still-life photograph of ripe dark cherries with subtle woody branches on a rustic surface in an orchard at golden hour, warm low dusk sunlight, deep cozy atmosphere, palette of warm beige terracotta and deep wine-red, sweet ripe richness, natural light, shallow depth of field with warm bokeh, fine photographic grain, warm golden color grade, matte finish, clean breathing room in the upper-center for a small bottle, vertical composition, shot on Sony A7 50mm f/1.8, golden-hour low warm light. No people, no text, no logos, no painting, no illustration, no painterly effect.
```

---

## 5. 모델 선택 — 이미지별 최고 품질 (법적 안전 무관 · 작업 고정)

규칙(고정): 모델은 인뎀니티/라이선스가 아니라 **생성 이미지에 맞는 최고 품질** 기준으로 선택. 크레딧 무관. Firefly 웹UI 전 모델 자유 사용.

| 단계 | 모델 | 이유(품질) |
|---|---|---|
| 향 씬 / 히어로 / 라이프스타일 (신규 실사) | Nano Banana Pro (편집 모드) | 최고 photoreal + 실물 그라운딩 → AI 이질감 0 |
| 합성 (실제 누끼 + 씬 정합/harmonize/relight) | Nano Banana Pro (편집 모드) | 편집/합성 최강 |
| 진짜 명화 (라벨 · S5) | 모델 불필요 | 퍼블릭도메인 실제 이미지 |

설정: Portrait 3:4(→ 인앱 Sharp 4:5 크롭) · 2K+ · 구글검색(그라운딩) ON.
★ 매 컷 직전 참조 0 강제 — 직전 실패 1순위(참조 잠금 → cotton에 april 꽃 유입). 4컷 교차오염 차단.

---

## 6. 상세페이지 통합 (S2/S3 BUILDUP — 개정)

- 교체 대상: `.scent-visual.v-lemon / .v-april / .v-cotton / .v-cherry` (aspect 4/5)
- ★ 플레이스홀더 개정: "A 인상주의 + C 정물" → "실사 정물 — [장면]" (#71)
- 팔레트 정합 필수: 생성컷이 위 CSS 색역에 들어와야 페이지가 한 덩어리로 읽힘
- 히어로: "A. 모네 수련 무드(Firefly)" → 실사 프리미엄 환경 + (선택) 벽면 실제 모네(퍼블릭도메인) 액자
- S5 스토리: 퍼블릭도메인 진짜 모네 이미지(AUTHENTIC-ART 레인)

---

## 7. 시스템 일반화 + 앱 개입점 (product-agnostic · #55/#71)

재사용 공식: 사실성 레인 태깅 + 공통 그레이드 + 변형축 + 카메라 표준 + 팔레트 앵커.
앱 개입점(#56): 자산 슬롯 realism_lane 태그 → 관제탑/스튜디오 사실성 가드(PHOTOREAL 슬롯 회화마감 경고, 기존 fidelity/main_image 가드 동형) → AUTHENTIC-ART 슬롯 PD 실제작품만(저작권 게이트 연동).
향후 대상: 달항아리 `cmp3afb450001gng5468w0qpc`, 아이스트레이 `cmpp62yje00015xup5h8pgwx0`.

---

## 8. Firefly 표면(surface) 전략 — #72 "편집 모드 통일"

두 생성 표면:

| 표면 | 엔진/특징 | 강점 |
|---|---|---|
| 표준 이미지생성 (`/generate/image`) | Adobe Firefly 모델 · 구조/스타일 ref · 비율 프리셋 | Adobe 정밀 ref 제어 |
| 편집 모드 생성 (구글검색 토글) | Gemini / Nano Banana Pro · 그라운딩 · 대화형 편집+합성 한 표면 | 최고 photoreal · 실물 그라운딩 · 생성/편집/합성 단일 표면 |

결정(고정): **PHOTOREAL 전 작업 = 편집 모드 + Nano Banana Pro + 구글검색 ON 통일.**
- 이유: (1) 최고 photoreal 품질 (2) 실물 그라운딩 → AI 이질감 0(#71 직결) (3) 생성→편집→합성을 한 표면에서 → 표면 전환 0·대화형 반복 가능.
- 예외(표준 생성 사용): 편집 캔버스에 없는 Adobe 정밀 구조/스타일 ref 제어가 꼭 필요할 때만. 현 스코프(실사 정물+합성)에선 거의 미발생.
- AUTHENTIC-ART(라벨·S5): 생성 안 함 — 실제 PD 이미지.
- 구글검색 토글: 실물 정확도에 도움 → 실사 씬 ON 권장(결과 모니터링, 원치 않는 레퍼런스 유입 시 OFF 비교).
