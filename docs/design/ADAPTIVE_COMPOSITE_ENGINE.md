# 적응형 3-Plane 하이브리드 합성 엔진 (Adaptive Composite Engine) — 전상품 합성 표준

작성 2026-06-11 · Claude Code(합성·#41 핑퐁) · **권위문서(전상품 합성 표준)** · ★대표 컨펌 대기. verbatim 정합(2026-06-11): 원칙6·워크플로7·무드 라이브러리8·명화 정정 3무드.
근거(grounded): `REPRESENTATIVE_IMAGE_FINISHING_SYSTEM.md`(§2 설계원칙·§3 적응형 라우터·§9 대표규격) + 작업원칙 `#52`(브라우저 반자동)·`#53`(도구 적재적소)·`#55`(전상품)·`#57`(누끼=실촬영 히어로컷·투-트랙)·`#58`(제품정체 우선)·`#59`(산출물 영구화)·`#61`(합성표준) + `HANDOFF_2026-06-10_cutout-fix-firefly-recipe.md`(§3 3-plane)·`HANDOFF_myeonghwa_composite_recipe_2026-06-09.md` + 대표 지시(2026-06-11: 실질적 비율·현실감 우선). 구현 = C-3/C-7/C-9/C-5.

---

## 0. 한 줄 / 왜 이 문서

공급사 본품을 **상품의 실제 비율·형태에 충실하게**, **스튜디오 촬영처럼 현실감 있게** 무드 장면에 합성하는 전상품 재사용 표준. 기존 `REP_FINISHING`(대표 마무리)·`#57`(누끼/투-트랙)·`2026-06-10`(3-plane 레시피)을 한 엔진으로 통합·명문화한다. 명화 디퓨저 = 검증 1호(#55).

핵심 교훈(왜 정정): 명화 #2(9T0) 합성본은 **형태오류(클립)·과대**로 폐기 — 소형 본품을 대형으로 렌더해 비율이 깨지고 라벨(핵심가치)이 뭉개졌다. 본 엔진은 그 재발을 **상품진실 앵커 + 스케일·각도 정합**으로 차단한다.

---

## 1. 6원칙 (합성 표준)

1. **상품진실 앵커 (Product-Truth Anchor)** — 모든 합성·렌더는 상품의 **실측 비율·크기·형태·정체**에 고정. 제품 정체는 공급사 실상세로 육안 확정(#58), 임의 가정 금지. 상품별 `상품현실시트`(§5)가 앵커. (#61, 대표 2026-06-11)
2. **3-Plane 리얼리즘 (3-Plane Realism)** — 후경(페인터리 디포커스)/중경(원목·표면 + 접지)/전경(본품 주인공 + 라벨 + 키라이트 + 접지그림자). 스튜디오 촬영 같은 사실적 빛·재질. Pillow 기계 겹침 폐기. (§2, 2026-06-10 §3)
3. **스케일·각도 정합 (Scale & Angle)** — 본품 크기·시점·원근이 장면과 **물리적으로 일치**. 과대·축소·왜곡·잘림 금지. 프레임 점유율은 상품현실시트 가이드(대표 70~85% / 무드 히어로 ~50~55%). (대표 2026-06-11 "실질적 비율", 9T0 형태오류 재발 차단)
4. **컨셉 구동 다양 무드 ≥2 (Concept-driven Multi-mood)** — 상품 본질/컨셉에서 무드를 도출해 **최소 2개**(예: 사용맥락 + 스튜디오 정물, 또는 전환형 + 정보형). 무드 라이브러리(§6)에서 셀렉터로 선택. (#57 투-트랙)
5. **컨셉 배경 (Concept Background)** — 배경 톤·소품은 상품 컨셉·라벨과 **호응**(예: 인상주의 명화 라벨 → 따뜻 우드+린넷·세이지). 차갑거나 화려한 충돌 배경 금지. (#57)
6. **하이브리드 (Hybrid 생성/코드)** — 자연 무드 합성 = Firefly 생성(Nano Banana Pro). 결정적 변환(크롭·리사이즈·틴트·harmonize·접지·normalize) = 코드(sharp). 난이도로 SIMPLE(인앱)/COMPLEX(Adobe) 적응 라우팅. 전상품 범용(#55)·비가역0(#46). (#53)

---

## 2. 3-Plane 합성 모델

| Plane | 내용 | 도구 |
|---|---|---|
| 후경 (back) | 페인터리/풍경 디포커스, 라벨 톤과 호응(따뜻 우드+린넷·세이지). | Firefly 생성 |
| 중경 (mid) | 원목 상판·표면·접지면. 본품 바닥-표면 접촉(컨택트 섀도)로 떠 보이지 않게. | Firefly 생성 |
| 전경 (front) | **본품(주인공) + 라벨 선명 + 키라이트(상단 좌측) + 드롭/접지 그림자**. 비율·각도는 상품현실시트 앵커. | 레퍼런스 누끼 충실 |

- 모델: **Nano Banana Pro**(제품 사실성·레퍼런스 충실 최강), 대안 FLUX (Firefly web 무료). 비율: 히어로 4:3, 썸네일용 1:1 각 1회. 레퍼런스 업로드 = 본품 누끼. 프롬프트는 **장면+스케일** 기술, 레퍼런스가 **형태** 운반. (2026-06-10 §3)

---

## 3. 앱 통합 (C-3 / C-7 / C-9 / C-5)

| 청크 | 역할 | 상태 |
|---|---|---|
| **C-3** `finish-image` | 대표 마무리 단일 라우터: bg-difficulty → SIMPLE 인앱 white-bg / COMPLEX bg_clean seed + apply-cutout 안내. main_image_policy 소비(lifestyle 대표 자기평가 시 dispatch:none·허위 seed 차단)·keepAsExtra. | ✅ 빌드 (feat/finish-image-router, preview READY·병합대기) |
| **C-7** `apply-composite` | 무드 합성 executor: 누끼+무드(Firefly 회수 or 인앱 sharp) → harmonize/normalize → extra_images 슬롯(가역). | ✅ 라이브 |
| **C-9** 개입카드 | `source_request`(누끼 소스 부재)·`hero_crop_request`(소스 과소/텍스트)·`firefly_drop`(무드 합성 드롭킷·3-plane 프롬프트). | ✅ 라이브 |
| **C-5** 스튜디오 마무리 카드 | C-3+C-7+C-9 착지점: 대표 SIMPLE/COMPLEX + 무드/추가 + 개입카드, dry-run before/after·재가드. | ☐ C-3 병합 후 |

엔진 한 줄: 인제스트 → 상품현실시트 → 누끼 → 대표 마무리(finish-image) → ≥2 무드(apply-composite·Firefly) → seo-guard 재검 → 개입대기열(필요분만 자연 등장) → 적용(가역) → 발행 GO(비가역).

---

## 4. 상품별 워크플로 7단계 (= 신규상품 합성 표준 프로세스)

1. **상품현실시트 작성** — 제품정체 육안 확정(#58) + 실측 비율·용량·형태·소재·라벨/핵심셀링(§5).
2. **누끼 소스 확보** — 공급사 실촬영 단품 히어로컷(완전포함)에서 `image_remove_background` → 투명 PNG. 작은 카드컷·텍스트컷·저해상 금지(#57). 산출 즉시 양쪽 적재(#59).
3. **대표 마무리** — `finish-image`(C-3) bg-difficulty 판정 → SIMPLE 인앱 white-bg / COMPLEX Adobe cutout → 흰배경 §9 규격(1:1 1000, 본품 70~85%, 텍스트 0).
4. **무드 설계** — 컨셉에서 무드 ≥2 도출(§6 라이브러리 셀렉터). 사용맥락 + 스튜디오 정물.
5. **합성 생성** — Firefly Nano Banana Pro 3-plane(레퍼런스=누끼, 스케일·각도 정합, **과대금지**). harmonize·접지그림자·normalize 등 결정적 변환은 코드(sharp).
6. **적재·적용** — `composite/` 적재(#59) → `apply-composite`(C-7) → extra_images 슬롯(가역). seo-guard 재검 → 개입대기열 자연 호출(C-9).
7. **검수·발행** — 브라우저 실측(C-6) → 대표 GO → 네이버 발행(비가역 #46).

---

## 5. 상품현실시트 템플릿 (Product Reality Sheet)

> 합성 전 필수. 과대·왜곡 차단의 앵커. 전상품 1장씩.

| 필드 | 값(예: 명화) |
|---|---|
| 상품ID / 상품명 | cmpnooli4… / 명화 디퓨저 |
| 제품정체 (육안 확정 #58) | 인상주의 명화 라벨 차량용 디퓨저(걸이형 사용가능) |
| 형태 (form-factor) | 걸이형 차량 송풍구 디퓨저 |
| 실측 치수 W×H×D | (실측 입력, mm) |
| 용량 (ml) | 15ml (/30ml) |
| 소재 / 마감 | 본체 + 명화 라벨 |
| 라벨·핵심 셀링포인트 | 인상주의 명화 라벨(또렷이 = 핵심가치) |
| 사용 맥락 | 차량 송풍구 걸이 / 홈 / 데스크 |
| 프레임 점유율 가이드 | 대표 70~85%(§9) · 무드 히어로 ~50~55% |
| 금지 | 과대·잘림·텍스트대표·평면 기계겹침 |

---

## 6. 무드 라이브러리 8 + 셀렉터

전상품 재사용 무드 8종. 컨셉/카테고리/라벨 톤으로 **≥2 선택**(원칙4).

| # | 무드 | 톤·광원 | 적합 |
|---|---|---|---|
| 1 | **Golden** | 따뜻한 오후 측광·골든·웜우드 | 홈 프래그런스·차량·감성 전환컷 |
| 2 | **Fresh** | 청량·쿨화이트·맑은 채광 | 주방·생활·청결/시원 컨셉 |
| 3 | **Dark-luxury** | 딥톤·저조도 스포트·고급 질감 | 프리미엄·선물·럭셔리 라벨 |
| 4 | **Bright-airy** | 밝고 화사·미니멀 화이트·하이키 | 정보형 추가이미지·기본 연출 |
| 5 | **Botanical** | 식물·자연광·그린·은은한 잎그림자 | 자연·아로마·플로럴 라벨 |
| 6 | **Vintage** | 웜그레인·레트로·필름톤 | 클래식·아트·명화 라벨 호응 |
| 7 | **Studio** | 중립 스튜디오 정물·소프트박스 | 상품 자체 스튜디오컷(대표 2026-06-11) |
| 8 | **Seasonal** | 계절·시즌(봄꽃/여름청량/가을웜/겨울딥) | 시즌 프로모·기획전 |

**셀렉터 규칙**: (a) 라벨/본질 톤과 호응(원칙5) → 1차 무드. (b) 역할 분담(#57) → 전환형(감성, 예: Golden/Dark-luxury) 1 + 정보형(명료, 예: Bright-airy/Studio) 1. (c) 카테고리 기본값 위에 상품 컨셉으로 미세조정. 최소 2개, 과대금지·스케일 정합 공통.

---

## 7. 명화 정정 프롬프트 — 3무드 (걸이형 15ml · 과대금지)

★ **누끼 caveat (#44/#45/#46/#58)**: 레퍼런스 누끼가 **실제 본체 형태·비율과 일치**해야 한다. `2026-06-10` 핸드오프는 기존 `cutout.png`를 reed(유리병+우드캡+리드스틱) 형상으로 육안 기록했고, 본 정정(걸이형 15ml 소형)과 형상이 다르다. 합성 전 **대표 재확인 누끼(실제 걸이형 본체·실비율)** 를 레퍼런스로 사용할 것 — 불일치 시 재누끼/재촬영(그렇지 않으면 프롬프트가 걸이형이어도 산출물에 reed가 남음).

공통 규칙: 본품을 **실측 15ml 소형 비율 그대로**(do not enlarge), 명화 라벨을 선명한 주인공으로, 자연 접지그림자, 포토리얼, no text/no watermark. 레퍼런스 누끼가 형태를 운반. 무드 3종 = Golden A(전환·감성) / Fresh B(청량·정보) / Dark-luxury C(프리미엄).

**무드 A — Golden (골든 홈/사용맥락):**
```
Photorealistic product shot of the exact compact 15ml car fragrance diffuser from the reference image, kept at its true small size (do not enlarge), hanging/clipped on a modern car air vent or resting on a warm light-oak surface; impressionist oil-painting label clearly visible and in sharp focus as the hero; soft golden afternoon side-light from the left, long soft shadow to the right, gentle realistic contact shadow; cream and warm-wood background; shallow DOF; warm editorial grade; no text, no watermark. 4:3 and 1:1.
```

**무드 B — Fresh (청량/정보형):**
```
Clean photorealistic studio shot of the exact compact 15ml car fragrance diffuser from the reference image at its true real-world scale (not enlarged), on a bright airy white surface with soft cool daylight; the impressionist painting label crisp and dominant as the hero; minimal fresh background with subtle sage-green accent; gentle contact shadow; high clarity; no text, no watermark. 1:1 and 4:3.
```

**무드 C — Dark-luxury (프리미엄):**
```
Premium photorealistic still-life of the exact compact 15ml car fragrance diffuser from the reference image at its true small scale (not enlarged), on a dark matte surface with a soft directional spotlight; deep elegant low-key background; the impressionist painting label glowing in sharp focus as the hero; refined contact shadow and faint reflection; shallow DOF; luxury editorial grade; no text, no watermark. 4:3 and 1:1.
```

산출물 용도: 추가이미지(2~9)·상세 히어로. 대표(1)는 별도 흰배경 §9. (REP_FINISHING §9, composite recipe §6)

---

## 8. 도구 분담 · 비가역 가드

- 누끼 = Adobe MCP `image_remove_background`(복구됨). 자연 무드 합성 = Firefly 웹UI 브라우저 반자동(#52, 파일드롭·생성클릭=대표). 결정적 변환 = 앱 sharp. compositing/gen-bg는 Adobe MCP 영구 미지원(#53). 산출물 영구화(#59).
- 비가역 0(#46): 네이버 PUT·발행·Adobe 폴더삭제는 **대표 GO 전 0**. 모든 합성 적용은 가역(DB extra_images 교체·이전 자산 스토리지 보존).

---

## 변경 이력
- 2026-06-11 (v2) — Desktop verbatim 정합(Code): 원칙6(상품진실앵커·3-Plane·스케일각도·컨셉구동 다양무드≥2·컨셉배경·하이브리드)·무드 라이브러리8+셀렉터·명화 정정 3무드(Golden A/Fresh B/Dark-luxury C). 근거 #58/#59 추가 반영.
- 2026-06-11 (v1) — 신규 작성(저장소 권위문서 합성·대표 리뷰). 전상품 합성 표준 단일화.
