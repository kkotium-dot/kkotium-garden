# FIREFLY 포토리얼리즘 프롬프트 표준 (전상품 · product-agnostic)

> 권위: 본 문서 + ADAPTIVE_COMPOSITE_ENGINE.md(Scene-first 3-Layer 합성) + DETAIL_PAGE_PLAYBOOK.md
> 적용 범위: 모든 상품의 모든 Firefly 이미지 생성 시 항상 적용. 명화 = 검증 케이스(특수 경로 아님).
> 보완 원칙: #74(Firefly 구동 경계) · #75(Scene-first 3-Layer 합성 표준).
> 최초 기록: 2026-06-13 (운영자 지시 — 실사 촬영 품질·AI 이질감 0)

## 0. 목적
AI 이질감(uncanny) 0. "정말 카메라로 촬영한 컷"의 품질. 구매 신뢰 = 전환율.

## 1. 핵심 전략 — 진짜 예술은 진짜로, 나머지는 사진으로
- AI로 회화를 위조하지 않는다 (저급 AI아트 느낌의 근원이므로 금지).
- 진짜 예술이 들어갈 자리: (a) 제품 라벨 = 실제 명화 reproduction, (b) 스토리 섹션 = 퍼블릭도메인 원작(예: Met Open Access Monet).
- 그 외 모든 컷(히어로 · 라이프스타일 · 무드 씬 · 합성) = 실사 사진 품질(real camera).
- 결과: 예술성과 사실성이 각자 authentic한 자리에 → 프리미엄 + 이질감 0.

## 2. 모델 선택 매트릭스 (이미지별 최선 모델 — Image 5 디폴트 금지)
| 이미지 유형 | 최선 모델 | 이유 |
|---|---|---|
| 포토리얼 씬/배경 (제품 없음) | Firefly Image 5 | Adobe 최신 포토리얼 T2I · 상업 인뎀니파이 |
| 제품 합성/안착·relight (누끼 드롭) | Nano Banana Pro | 편집/합성 최강 · 실제 누끼 자연 안착 · 형태 보존 |
| 씬이 AI틱할 때 폴백 | FLUX (Pro) | 극사실 사진 어드히어런스 강함 |

## 3. 포토리얼 프롬프트 해부 (필수 5요소)
1. Subject + 구체적 실제 setting
2. Camera body (예: Sony A7R V · Canon EOS R5 · Hasselblad X2D)
3. Lens + Aperture (제품 = 85~100mm macro f/2.8~4 / 라이프 = 35~50mm f/1.8~2.8)
4. Lighting (soft natural window light / golden hour backlight / softbox — "epic dramatic lighting" 금지)
5. Quality+Realism: "photorealistic, ultra-detailed texture, true-to-life color grading, subtle film grain, professional commercial product photography, sharp focus"

## 4. 카메라 스펙 라이브러리 (재사용 블록)
- 제품 히어로/클로즈업: "shot on Hasselblad X2D 100C, 90mm f/3.2, softbox key + window fill, ultra-sharp product detail"
- 라이프스타일(차량/실내): "shot on Sony A7R V, 35mm f/2.0, natural daylight through window, shallow depth of field"
- 무드 씬(자연/정물): "shot on Canon EOS R5, 50mm f/1.8, soft natural light, gentle bokeh"

## 5. 네거티브 (anti-AI · 항상 'Avoid:'로 부착)
Avoid: painting, illustration, CGI, 3D render, AI artifacts, plastic texture, waxy surface, oversaturation, HDR halo, distorted geometry, duplicated or extra objects, text, watermark, logo

## 6. 적재적소 가이드 (슬롯별)
- 배경(Layer A): 위 씬 모델 · photoreal · 프롬프트 끝에 "clean uncluttered lower-center area for product placement"
- 제품(Layer C): 기존 form-accurate 누끼 — 형태 불변(생성으로 다시 그리지 않음)
- 합성: Sharp 결정론 배치(스케일·접지그림자) -> Nano Banana Pro form-locked 하모나이즈(광·색만 통일) -> v8 형태충실도 게이트(드리프트 시 결정론 컷 폴백)

## 7. 시스템 적용 (앱 자동화)
- buildFireflyDropPayload / apply-composite 의 promptInject 에 본 표준(카메라 스펙 블록 + 네거티브)을 전상품 자동 prepend.
- 개입카드(firefly_drop) 프롬프트 텍스트에 카메라 스펙 블록 포함 -> 운영자가 붙여넣기만 해도 photoreal 보장.
- 회화 위조 금지 가드: art 는 제품 라벨 / 스토리 실작품 슬롯에만 허용.
