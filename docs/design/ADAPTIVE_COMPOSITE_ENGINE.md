# 적응형 합성 엔진 v8 — 참조 드롭 하모나이즈 (Adaptive Composite Engine) · 전상품 합성 표준

작성 2026-06-11 · v8 전면 개정 2026-06-12 · Claude Code(합성·#41 핑퐁) · **권위문서(전상품 합성 표준)**
근거(grounded): `docs/handoff/HANDOFF_image_workflow_v8_referencedrop_2026-06-12.md`(0~9장 verbatim) + `REPRESENTATIVE_IMAGE_FINISHING_SYSTEM.md`(§2 설계원칙·§9 대표규격) + 작업원칙 `#46`(비가역 가드)·`#52`(브라우저 반자동: 참조 드롭 = 운영자)·`#53`(도구 적재적소)·`#55`(전상품)·`#56`(개입 자연 노출)·`#57`(누끼=실촬영 히어로컷)·`#58`(제품정체 우선)·`#59`(산출물 영구화)·`#61`(합성표준). 구현 = C-3/C-7/C-9/C-5.
대상: 전상품 범용. 명화 디퓨저(cmpnooli40001f0gveaxr8iim)는 **검증 케이스일 뿐 특별 경로 아님**(#55).

---

## 0. 아키텍처 전환 (v7 → v8): 왜 바꾸나

| 항목 | v7 (폐기된 1차 경로) | v8 (확정 1차 경로) |
|---|---|---|
| 배경 | Firefly가 "빈 플레이트" 생성 | 동일(필요 시) — 단 **제품 합성엔 미사용** |
| 합성 | 앱이 누끼를 PIL/sharp로 "붙여넣기" | **Firefly 참조 슬롯에 누끼 드롭 → 모델이 장면에 녹임** |
| 빛·그림자·반사 | 코드로 근사(붙인 티 남) | **모델이 장면 광원에 맞춰 자동 매칭(자연스러움)** |
| 모델 | (없음) | **Gemini 3.1 (Nano Banana 2)** = 피사체 보존 합성 |

근거: PIL 붙여넣기는 빛/반사가 장면과 불일치해 "점점 어색"해진다. Nano Banana 2는 피사체를 보존하면서 장면 광원·접지그림자·반사를 매칭해 자연 합성한다(실측 우선 #45 — 대표 판정이 권위). 제품 형태 변형 리스크는 **삭제가 아니라 가드로 관리**한다(3·4·5장).

**결정론 합성(PIL/sharp)은 삭제되지 않는다 = 하모나이즈 실패 시 안전망**(형태 100% 보존). 1차=하모나이즈, 폴백=결정론. 하이브리드.

---

## 1. 전상품 이미지 워크플로우 (표준 파이프라인)

```
STEP 0  무드 도출 : 상품 컨셉(카테고리·소재·태그·USP·톤앤매너) -> AI 무드 후보 6종 자동 제안
STEP 1  무드 픽   : 운영자가 그리드에서 2~3 픽                         [개입]
STEP 2  누끼 드롭 : 실사 단품 히어로컷 누끼를 Firefly 참조 슬롯에 드래그   [개입: 드래그 1회]
STEP 3  하모나이즈: 앱이 장면+배치 프롬프트 주입 -> 생성 -> 후보 2~4 회수  (Claude 운전)
STEP 4  형태 가드 : 출력 제품영역 vs 누끼 대조 -> 변형 시 플래그/재생성/폴백
STEP 5  편집 루프 : 거의 좋은데 한 끗 아쉬운 컷 선택 -> 편집뷰 -> 결함만 외과 수정 [개입: 픽+승인]
STEP 6  적재·픽   : extra_images append(가역) -> 운영자 최종 픽           [개입: 최종 픽]
```

핵심: 개입은 강제 순서가 아니다. 필요할 때 자연스럽게 떠오르는 표면(Operator Action Queue, #56)으로 노출한다(8장).

---

## 2. 누끼 소스 규칙 (#57 강화)

- 누끼 = **실사 단품 히어로컷만.** 공급사 상세페이지 라인아트/그래픽 목업 누끼 금지(가드: OCR/엣지 그래픽 감지 -> 차단).
- 정면 기하 필요(차량 송풍구 등) = 정면 단품컷. 프리미엄 3D 무드(정물·갤러리) = 각도 실사컷.
- 명화 검증 자산: cutout_C(정면 단품, 차량), cutout_B(3D 각도, 정물/갤러리/디테일) — 둘 다 실사 확인됨.
- 산출 즉시 양쪽 적재(#59). 자산 저장 이름 규약(`cutout.png` 고정, CLAUDE.md §3-6) 준수 — 임의 접두어 금지.

---

## 3. 참조 슬롯 운용 (형태 보존 핵심)

- 모델 = **Gemini 3.1 (Nano Banana 2)** 고정(피사체 보존).
- 참조 모드 = "피사체/이 이미지 사용" 우선. **구도 전용 모드 지양**(재드로잉 유발).
- 프롬프트 명시: "참조 제품을 형태·라벨·캡 변형 없이 그대로 두고 장면에 합성. 장면 광원을 제품에 매칭, 접지그림자·반사 추가, 슬랫/주변 사물 대비 작고 사실적인 스케일."
- **슬롯 위생: 생성 전 참조 슬롯 자동 클리어** + 생성 후 "의도한 누끼만 사용됐는지" 확인(잔존 참조 오염 차단 — 과거 변형 원인).

---

## 4. 형태-정합 가드 (신규)

- 출력 컷의 제품 영역을 누끼와 대조(라벨 텍스트/병 실루엣 매칭 스코어).
- 임계 미달(변형) -> ① 재생성, ② 프롬프트에 "do not redraw" 강조, ③ 반복 실패 시 **결정론 합성(PIL/sharp) 폴백**.
- 결정론 합성 = 안전망(형태 100% 보존). 하이브리드 구조의 폴백 레그.

### 4-1. 결정론 폴백 스펙 (sharp, 형태 보존)

하모나이즈 형태 실패 시 자동 진입. 누끼를 변형 없이 배경 위에 합성:

```
resize        : 상품현실시트 프레임 점유율 가이드에 맞춰 누끼 스케일(과대 금지)
warm tint     : 8~10% (장면 광원 톤 근사)
drop shadow   : alpha 0.30~0.40, blur w/24, offset (w/18, w/12)
contact shadow: ellipse, alpha ~95, blur w/6 (바닥-표면 접지, 떠 보임 방지)
```

`w` = 누끼 폭(px) 기준 상대값. 결정론 폴백은 형태가 100% 보존되므로 형태 가드(4장) 재검 면제, 단 스케일·접지 점검은 유지.

---

## 5. 편집 루프 (대표 의도 명문화)

- 정의: 거의 완성인데 한 끗 아쉬운 컷을 **선택 -> 편집뷰(`?view=edit`)** 로 넘겨 **결함 부위만** 자연스럽게 수정.
- **70%+ 완성 컷은 재생성 금지.** 부분 편집(채우기/제거/디테일조절)으로 외과 처치.
- 예: 끈 오부착 제거, 마개 정리, 접지그림자 보강.

---

## 6. 컷 세트 규칙

- 1 누끼 -> 4컷 기본 / 6컷 확장. 전 컷 동일 제품 정합.
- 표준 4컷: ① 클린/스튜디오(라벨 가독, 대표급) ② 라이프스타일 A(사용맥락·스케일) ③ 라이프스타일 B(정물·전환) ④ 디테일/스케일.
- 무드는 상품 컨셉에서 **동적 도출**(고정 템플릿 금지). 한국 SEO/ROI 배경 우선(국내 차종 톤·주거 무드).

---

## 7. 하모나이즈 품질 체크리스트 (전 컷 공통)

- [ ] 제품 형태·라벨·캡 = 누끼와 동일(변형 0)
- [ ] 스케일 = 배경 사물과 사실적 비례(미니어처·부풀림 금지)
- [ ] 빛 = 장면 광원 방향 일치, 접지그림자 존재, 반사 자연
- [ ] 배경 구조 = 물리적으로 가능(불가능 구조 배제)
- [ ] 부속 정합 = 용도별 정확(송풍구 = 클립, 백미러 = 끈+비드)
- [ ] 무드 = 컨셉 톤앤매너 일치, 배경 사물 실재화

---

## 8. 운영자 개입 맵 (#56 — 자연 노출, 강제순서 아님)

1. 무드 픽 (후보 6 -> 2~3)
2. 누끼 드롭 (Firefly 참조 — 드래그 1회)
3. 최종 컷 픽
4. 편집 루프 승인 (결함 수정 확인)
5. 발행 GO (비가역 #46)

전부 Operator Action Queue("개입 대기열")에 **product-agnostic 카드**로 노출(권위: `OPERATOR_SYSTEM_BLUEPRINT.md`).

---

## 9. Firefly 주입기 기술 사양 (Claude 운전부)

- 생성뷰 `firefly.adobe.com/generate/image` / 편집뷰 `?view=edit`. shadow-DOM 재귀 탐침.
- 모델 = Gemini 3.1 (Nano Banana 2).
- 생성버튼 = `sp-button` / `role=button` "생성"(네이티브 button 매처 불충분 — 둘 다 포함).
- 프롬프트 = 첫 textarea(placeholder fallback), 네이티브 value setter + input/change dispatch.
- **참조 드롭 = 운영자 수행**(file input 보안상 JS 주입 불가, #52). Claude는 프롬프트·생성·폴링·선별·편집 운전.
- 회수 = sleep 55~65s -> Adobe GenAIAsset createDate desc -> get_presigned_urls(acp) -> inline_preview 판정.
- 적재 = `apply-composite`/`compose-plate` -> extra_images append(가역).

---

## 10. 앱 통합 (C-3 / C-7 / C-9 / C-5)

| 청크 | 역할 | 상태 |
|---|---|---|
| **C-3** `finish-image` | 대표 마무리 단일 라우터: bg-difficulty -> SIMPLE 인앱 white-bg / COMPLEX bg_clean seed + apply-cutout 안내. main_image_policy 소비·keepAsExtra. | 라이브(a089b12) |
| **C-7** `apply-composite` | 무드 합성 executor: 누끼+무드(Firefly 회수 or 폴백 sharp) -> harmonize/normalize -> extra_images 슬롯(가역). | 라이브 |
| **C-9** 개입카드 | `source_request`(누끼 소스 부재)·`hero_crop_request`(소스 과소/텍스트)·`firefly_drop`(무드 합성 드롭킷). | 라이브 |
| **C-5** 이미지 스튜디오 | 무드보드 + 누끼 드롭 존 + 하모나이즈 큐 + 형태 가드 + 편집 루프 + 4~6컷 빌더. v8 워크플로우 앱 이식. | 세션 2 |

엔진 한 줄: 인제스트 -> 상품현실시트 -> 누끼 -> 무드 도출/픽 -> **참조 드롭 -> 하모나이즈** -> 형태 가드 -> (실패 시 결정론 폴백) -> 편집 루프 -> extra_images 적재(가역) -> 발행 GO(비가역 #46).

---

## 11. 상품현실시트 템플릿 (Product Reality Sheet)

> 합성 전 필수. 과대·왜곡 차단의 앵커. 전상품 1장씩.

| 필드 | 값(예: 명화) |
|---|---|
| 상품ID / 상품명 | cmpnooli4... / 명화 디퓨저 |
| 제품정체 (육안 확정 #58) | 인상주의 명화 라벨 차량용 디퓨저(걸이형 사용가능) |
| 형태 (form-factor) | 걸이형 차량 송풍구 디퓨저 |
| 실측 치수 W×H×D | (실측 입력, mm) |
| 용량 (ml) | 15ml (/30ml) |
| 소재 / 마감 | 본체 + 명화 라벨 |
| 라벨·핵심 셀링포인트 | 인상주의 명화 라벨(또렷이 = 핵심가치) |
| 사용 맥락 | 차량 송풍구 걸이 / 홈 / 데스크 |
| 프레임 점유율 가이드 | 대표 70~85%(§9 대표규격) · 무드 히어로 ~50~55% |
| 금지 | 과대·잘림·텍스트대표·평면 기계겹침 |

---

## 12. 무드 라이브러리 8 + 셀렉터

전상품 재사용 무드 8종. STEP 0 무드 후보 6종은 이 라이브러리에서 컨셉/카테고리/라벨 톤으로 동적 셀렉트한다.

| # | 무드 | 톤·광원 | 적합 |
|---|---|---|---|
| 1 | **Golden** | 따뜻한 오후 측광·골든·웜우드 | 홈 프래그런스·차량·감성 전환컷 |
| 2 | **Fresh** | 청량·쿨화이트·맑은 채광 | 주방·생활·청결/시원 컨셉 |
| 3 | **Dark-luxury** | 딥톤·저조도 스포트·고급 질감 | 프리미엄·선물·럭셔리 라벨 |
| 4 | **Bright-airy** | 밝고 화사·미니멀 화이트·하이키 | 정보형 추가이미지·기본 연출 |
| 5 | **Botanical** | 식물·자연광·그린·은은한 잎그림자 | 자연·아로마·플로럴 라벨 |
| 6 | **Vintage** | 웜그레인·레트로·필름톤 | 클래식·아트·명화 라벨 호응 |
| 7 | **Studio** | 중립 스튜디오 정물·소프트박스 | 상품 자체 스튜디오컷(대표급) |
| 8 | **Seasonal** | 계절·시즌(봄꽃/여름청량/가을웜/겨울딥) | 시즌 프로모·기획전 |

**셀렉터 규칙**: (a) 라벨/본질 톤과 호응 -> 1차 무드. (b) 역할 분담(#57) -> 전환형(감성, 예: Golden/Dark-luxury) 1 + 정보형(명료, 예: Bright-airy/Studio) 1. (c) 카테고리 기본값 위에 상품 컨셉으로 미세조정. 최소 2개, 과대금지·스케일 정합 공통. 한국 SEO/ROI 배경 우선.

---

## 13. 명화 검증 프롬프트 — 3무드 (걸이형 15ml · 참조 드롭 · 과대금지)

**누끼 caveat (#44/#45/#46/#58)**: 참조 누끼가 **실제 본체 형태·비율과 일치**해야 한다. 합성 전 대표 재확인 누끼(실제 걸이형 본체·실비율)를 참조로 사용할 것 — 불일치 시 재누끼/재촬영(그렇지 않으면 프롬프트가 걸이형이어도 산출물에 reed가 남음).

공통 규칙: 참조 제품을 **실측 15ml 소형 비율 그대로**(do not enlarge, do not redraw), 명화 라벨을 선명한 주인공으로, 자연 접지그림자, 포토리얼, no text/no watermark. **참조 슬롯이 형태를 운반**(프롬프트는 장면·스케일만 기술). 무드 3종 = Golden A(전환·감성) / Fresh B(청량·정보) / Dark-luxury C(프리미엄).

**무드 A — Golden (골든 홈/사용맥락):**
```
Using the exact product from the reference image without altering its shape, label,
or cap, place it into a photorealistic scene: the compact 15ml car fragrance diffuser
kept at its true small size (do not enlarge, do not redraw), hanging/clipped on a modern
car air vent or resting on a warm light-oak surface; impressionist oil-painting label
clearly visible and in sharp focus as the hero; match the scene light to the product,
soft golden afternoon side-light from the left, long soft shadow to the right, gentle
realistic contact shadow; cream and warm-wood background; shallow DOF; warm editorial
grade; no text, no watermark. 4:3 and 1:1.
```

**무드 B — Fresh (청량/정보형):**
```
Using the exact product from the reference image without altering its shape or label,
place it into a clean photorealistic studio scene: the compact 15ml car fragrance diffuser
at its true real-world scale (not enlarged, not redrawn), on a bright airy white surface
with soft cool daylight; the impressionist painting label crisp and dominant as the hero;
match scene lighting to the product, add a gentle contact shadow; minimal fresh background
with subtle sage-green accent; high clarity; no text, no watermark. 1:1 and 4:3.
```

**무드 C — Dark-luxury (프리미엄):**
```
Using the exact product from the reference image without altering its shape, label, or cap,
place it into a premium photorealistic still-life: the compact 15ml car fragrance diffuser
at its true small scale (not enlarged, not redrawn), on a dark matte surface with a soft
directional spotlight; deep elegant low-key background; the impressionist painting label
glowing in sharp focus as the hero; match scene light to the product, refined contact shadow
and faint reflection; shallow DOF; luxury editorial grade; no text, no watermark. 4:3 and 1:1.
```

산출물 용도: 추가이미지(2~9)·상세 히어로. 대표(1)는 별도 흰배경 §9 규격(REP_FINISHING §9).

---

## 14. 도구 분담 · 비가역 가드

- 누끼 = Adobe MCP `image_remove_background`. **자연 무드 합성 = Firefly 웹UI 참조 드롭 + 하모나이즈**(브라우저 반자동 #52, 파일드롭·생성클릭 = 운영자). 결정적 폴백 = 앱 sharp(4-1). compositing/gen-bg는 Adobe MCP 영구 미지원(#53). 산출물 영구화(#59).
- 비가역 0(#46): 네이버 PUT·발행·Adobe 폴더삭제는 **대표 GO 전 0**. 모든 합성 적용은 가역(DB extra_images 교체·이전 자산 스토리지 보존).

---

## 변경 이력

- 2026-06-12 (v8) — 전면 개정: **참조 드롭 하모나이즈**(Firefly 참조 슬롯 누끼 드롭 -> Nano Banana 2 하모나이즈)를 1차 경로로 확정, PIL/sharp 붙여넣기를 결정론 폴백으로 강등. 형태-정합 가드(4장)·편집 루프(5장)·Firefly 주입기 사양(9장) 신규. 결정론 폴백 sharp 스펙(4-1) 명문화. 근거 = `HANDOFF_image_workflow_v8_referencedrop_2026-06-12.md` 0~9장 verbatim.
- 2026-06-11 (v2) — Desktop verbatim 정합: 6원칙·무드 라이브러리8+셀렉터·명화 정정 3무드.
- 2026-06-11 (v1) — 신규 작성(저장소 권위문서 합성). 전상품 합성 표준 단일화.
