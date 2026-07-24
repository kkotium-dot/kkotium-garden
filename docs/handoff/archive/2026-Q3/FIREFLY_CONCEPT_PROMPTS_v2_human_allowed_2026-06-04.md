# 꽃틔움 KKOTIUM — Firefly 컨셉컷 생성 가이드 v2 (인물 허용 정책 반영)

> 저장: 2026-06-04 (Desktop turn) | 짝 문서: HANDOFF_S2_firefly_myeonghwa_aroma_2026-06-03.md
> 목적: 대표 확정 신규 정책(인물 등장 허용)을 반영한 Firefly 생성 프롬프트 모음.
> 파이프라인 위치: S2 생성(대표 Firefly 1-click 수동) → 가공(Adobe MCP 자동: 누끼/리사이즈/합성준비).

---

## 0. ★ 신규 디자인 정책 (대표 확정 2026-06-04) — 인물 등장 허용

| 이전 (구 하드룰) | 변경 후 (현행) |
|---|---|
| 인체·얼굴 일절 금지 ("얼굴 없는 인체 일부 전략") | **컨셉에 어울리면 인물 등장 허용** |
| — | 단, **특정 실존 모델(연예인/식별 가능 개인)은 금지** = 익명 일반 모델만 |

원칙: "상품·컨셉상 사람이 들어가야 감도가 사는 경우" 인물을 넣되, 식별 가능한 특정 인물·유명인 얼굴은 생성하지 않는다. 미성년자 부적절 묘사 금지(상업 제품컷 맥락 유지). 이 정책은 구 메모리의 "얼굴 없는 인체 일부 = 하드룰"을 대체한다.

Firefly 공통 네거티브(인물 포함 시): `no recognizable celebrity, no specific real person likeness, no text, no logo, no watermark, no brand marks`.

---

## 1. 명화 디퓨저 (aroma 프리셋) — 인물 포함 라이프스타일 컷 프롬프트

### A. 손 모델 — 디퓨저를 놓는 컷 (감성 내러티브)
```
A woman's hands gently placing a glass reed diffuser on a sunlit wooden table,
soft morning backlight, warm cream and sage tones, pampas grass blurred in
background, shallow depth of field, lifestyle product photography, anonymous
model hands only no face, no text, no logo, no recognizable person, photoreal,
85mm, soft natural light
```

### B. 공간 속 인물 — 디퓨저가 놓인 거실에서 휴식 (분위기 컷)
```
A person relaxing on a linen sofa in a warm minimalist living room, a reed
diffuser on the side table in soft focus foreground, golden hour light,
sage and terracotta accents, anonymous figure seen from behind or out of focus,
no identifiable face, editorial lifestyle photography, no text, no logo, photoreal
```

### C. 향을 맡는 실루엣 (감각 강조, 얼굴 비식별)
```
Backlit silhouette of a person softly inhaling near a reed diffuser, warm
window light, dreamy bokeh, sage-cream-terracotta palette, face not identifiable
(silhouette/soft focus), serene mood, lifestyle fragrance photography, no text,
no logo, no celebrity, photoreal
```

> 모두 aroma 토큰(세이지 #76864C / 웜크림 #F3EFE7 / 테라코타 #B5694C) 정합 무드.
> 생성 후 Adobe MCP 가공: 인물 컷은 누끼 불요(분위기 컷 그대로) / 본품 강조 시 image_crop_and_resize로 재프레이밍.

---

## 2. 가공 라인 SOP (생성 이후 자동화 — 2026-06-04 입증 완료)

명화 디퓨저 정물컷으로 실제 검증된 가공 체인:
1. `image_remove_background` — 본품 누끼 (단, 피사체 2개 이상이면 함께 딸려옴 주의)
2. `image_crop_and_resize` fit:extract + focus:{prompt} — 본품만 정밀 추출 (팜파스 등 부피사체 제거)
3. `image_crop_and_resize` fit:pad + output 1000x1000 — 네이버 대표이미지(흰배경, 홍보문구 0)
4. 배경컷: fit:reframe + output 860x860 — 상세페이지 합성 무대
5. 합성(A+C 겹치기)은 Adobe 미지원 → Figma 마스터 레이어 또는 Photoshop

### 2026-06-04 생성 자산 (명화 디퓨저)
- 본품 누끼 PNG: Adobe 단축URL(세션 한정, 영구보관은 Supabase product-assets 업로드 필요)
- 대표이미지 1000x1000 JPEG: 동일
- 배경 무대 860x860 JPEG: 동일
- ★ 영구 보관 TODO: 위 3종을 Supabase product-assets 버킷에 업로드 (Adobe 단축URL은 만료됨)

---

## 3. 가공 도구 한계 (정직 기록)
- Adobe MCP: 사진 "생성" 불가(생성AI 미지원). image_generative_expand(아웃페인팅)만 예외.
- 합성(compositing, 이미지 위 이미지 얹기): Adobe 미지원 → Figma/Photoshop.
- 배경 교체(프롬프트 기반): Adobe 미지원 → Firefly/Photoshop.
- 따라서 "인물 컨셉컷 생성"은 반드시 대표 Firefly 1-click → 이후 Adobe 가공.
