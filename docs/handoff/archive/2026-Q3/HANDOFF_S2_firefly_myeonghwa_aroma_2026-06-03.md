# S2 핸드오프 — 명화 디퓨저 aroma 상세페이지 이미지 생성 (Firefly)

> Target: 🧑 대표(Firefly 웹UI 1-click 생성) | From: 🖥 Desktop | 시안: myeonghwa_aroma_detail_v2_hybrid.html
> 제품: 명화 디퓨저 (id cmpnooli40001f0gveaxr8iim), aroma preset L3, A+C 하이브리드
> 파이프라인: S2(생성·합성) → S3(완료) → S4(Figma/Canva 양산) → S5(업로드)

---

## ★ 운영 원칙 (왜 이렇게 나누나)

| 자산 | 생성 방식 | 사유 |
|---|---|---|
| 히어로 배경 (A 모네 수련) | **Met CC0 실제 명화 다운로드** | 사후 70년 경과 퍼블릭도메인 → 실제 명화가 가장 고급. 생성 불필요. |
| 히어로 정물 오브제 (C) | **Firefly 생성** | 실제 명화엔 없는 포인트 → 무드만 차용(작가명 미언급) |
| 향 3종 배경 (A+C) | **Firefly 생성** | 노트별 장면 분기 — 인상주의 무드 + 정물 모티프 |

- **Firefly 생성은 대표님이 웹UI에서 1-click** (소비자 플랜 API 없음, 브라우저 자동화는 Adobe ToS 위반). 생성 이후 누끼·리사이즈·합성·DB 적재는 전부 자동.
- 모델: **Firefly Image 5** (10크레딧, Adobe IP 면책). Gemini/Nano Banana/FLUX 등도 자유 사용 가능(크레딧 비관여).
- **공통 네거티브(전 컷 적용)**: `no human face, no people, no text, no letters, no watermark, no logo, no brand name, no signature`
- **하드룰**: AI 얼굴 금지("얼굴 없는 인체 일부"), 실존 브랜드/캐릭터/생존작가명 프롬프트 금지.

---

## 1) 히어로 배경 — A. 모네 수련 (생성 아님 · 다운로드)

- **소스**: The Met Open Access (CC0). 후보 — Claude Monet, *Water Lilies* (1906, Met 영구소장) 또는 *Bridge over a Pond of Water Lilies* (1899).
- **다운로드**: metmuseum.org → 작품 페이지 → "Open Access" → 원본 JPG.
- **용도**: 히어로 배경 무드 레이어. Adobe Express에서 채도 -15%, 밝기 +8% (어스톤 정합, 제품컷이 떠 보이도록).

---

## 2) 히어로 정물 오브제 — C (Firefly 생성)

```
Firefly Image 5 · 비율 3:4 · 시드 자유
프롬프트(EN):
An impressionist-style still-life of a single soft pink garden flower with a few
sage-green leaves, loose painterly brushstrokes, warm cream background, muted
earth-tone palette, soft natural daylight, gallery-quality oil texture, elegant
and minimal, no harsh contrast
```
- **의도**: 모네 배경 위에 얹을 "그림 속 또 하나의 그림". 더스티 로즈 + 세이지 톤으로 시안 토큰 정합.
- **후처리**: Adobe MCP `image_remove_background` → 누끼 PNG → 히어로 우상단 합성.

---

## 3) 향 3종 배경 — A 인상주의 + C 정물 모티프 (Firefly 생성)

공통: `Firefly Image 5 · 비율 4:5 · 공통 네거티브 적용`

### ① 레몬 유칼립투스 — "창문 연 아침, 정원의 풀잎"
```
EN: Impressionist morning garden scene, fresh citrus-green and sage tones,
dappled sunlight through eucalyptus leaves, dewy fresh atmosphere, loose
painterly brushstrokes, a faint still-life of green herbs in soft focus,
bright airy mood, warm cream undertone
```

### ② 에이프릴 후레쉬 — "비 갠 뒤 꽃에 스민 햇빛"
```
EN: Impressionist scene of a flower garden just after spring rain, soft dusty-pink
and rose tones, gentle sunlight breaking through, water droplets on petals,
loose painterly brushstrokes, a faint still-life of blossoms in soft focus,
fresh clean mood, warm cream undertone
```

### ③ 블랙 체리 — "늦은 오후, 잘 익은 체리 한 입"
```
EN: Impressionist late-afternoon orchard scene, warm terracotta and deep cherry
tones, golden low sunlight, ripe cherries, loose painterly brushstrokes,
a faint still-life of cherries on a wooden surface in soft focus, cozy rich
mood, warm cream undertone
```

---

## 4) 생성 후 자동화 (대표님 다운로드 → Desktop/Code)

1. 4컷(정물 1 + 향 3) Firefly 다운로드 → `product-images` 버킷 업로드
2. Adobe MCP: `image_remove_background`(정물) + `image_crop_and_resize`(전 컷 규격화)
3. 히어로: Met 명화 배경 + 정물 누끼 + 제품컷 3겹 합성 (Adobe Express)
4. S4(Figma/Canva)에서 860px 상세 조립 → `product-assets` 버킷
5. 명화 디퓨저 `concept_preset='aroma'` / `preset_intensity='l3'` 적용 후 발행 게이트 재확인

---

## 검증 기준
- 생성물 얼굴/텍스트/로고 0건 (공통 네거티브 준수)
- 4컷 톤이 시안 토큰(세이지 #76864C / 웜크림 #F3EFE7 / 테라코타 #B5694C) 정합
- 제품컷 합성 시 1000×1000 보존
