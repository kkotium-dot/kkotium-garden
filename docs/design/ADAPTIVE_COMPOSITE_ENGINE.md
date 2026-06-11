# 적응형 3-Plane 하이브리드 합성 엔진 (Adaptive Composite Engine) — 전상품 합성 표준

작성 2026-06-11 · Claude Code(합성·#41 핑퐁) · **권위문서(전상품 합성 표준)** · ★대표 컨펌 대기(content=저장소 권위문서 합성, 대표 리뷰 후 확정).
근거(grounded): `REPRESENTATIVE_IMAGE_FINISHING_SYSTEM.md`(§2 설계원칙·§3 적응형 라우터·§9 대표규격) + 작업원칙 `#52`(브라우저 반자동)·`#53`(도구 적재적소)·`#55`(전상품)·`#57`(누끼=실촬영 히어로컷·투-트랙) + `HANDOFF_2026-06-10_cutout-fix-firefly-recipe.md`(§3 3-plane)·`HANDOFF_myeonghwa_composite_recipe_2026-06-09.md` + 대표 지시(2026-06-11: 실질적 비율·현실감 우선). 구현 = C-3/C-7/C-9/C-5.

---

## 0. 한 줄 / 왜 이 문서

공급사 본품을 **상품의 실제 비율·형태에 충실하게**, **스튜디오 촬영처럼 현실감 있게** 무드 장면에 합성하는 전상품 재사용 표준. 기존 `REP_FINISHING`(대표 마무리)·`#57`(누끼/투-트랙)·`2026-06-10`(3-plane 레시피)을 한 엔진으로 통합·명문화한다. 명화 디퓨저 = 검증 1호(#55).

핵심 교훈(왜 정정): 명화 #2(9T0) 합성본은 **형태오류(클립)·과대**로 폐기 — 소형 본품을 대형으로 렌더해 비율이 깨지고 라벨(핵심가치)이 뭉개졌다. 본 엔진은 그 재발을 **상품진실 앵커**로 차단한다.

---

## 1. 6원칙 (합성 표준)

1. **상품진실 앵커 (Product-Truth Anchor)** — 모든 합성·렌더는 상품의 **실측 비율·크기·형태**에 고정. 과대·왜곡·잘림 금지. 상품별 `상품현실시트`(§5)가 앵커. (#61, 대표 2026-06-11 "실질적 비율과 어울리게")
2. **현실감 우선 (Photoreal-first)** — 스튜디오 촬영 같은 사실적 빛·그림자·재질·접지(컨택트 섀도). Pillow 기계적 겹침은 폐기 — 자연 합성은 생성 모델. (2026-06-10 §4, 대표 "현실감 있게")
3. **3-Plane 장면 구성** — 후경(페인터리 디포커스)/중경(원목·표면)/전경(본품 주인공 + 접지그림자 + 키라이트). (§2, 2026-06-10 §3)
4. **≥2 무드 (multi-mood)** — 상품마다 최소 2개 무드 장면: **사용맥락** + **스튜디오 정물**. 상품 자체만 스튜디오컷도 유효한 한 무드. (대표 2026-06-11)
5. **대표 vs 추가/상세 역할 분리** — 대표(1번)=흰배경 본품 §9 규격(텍스트 0). 무드 합성=추가이미지(2~9)·상세 히어로(텍스트 허용). 감성은 추가/상세에서, 대표는 본품. (REP_FINISHING §9)
6. **적응형 라우팅 · 전상품 범용 · 비가역 0** — 배경 난이도로 SIMPLE(인앱)/COMPLEX(Adobe) 자동 분기. 투-트랙(정보형 새배경 / 감성형 Firefly 무드, #57). 상품·카테고리 불문 동일 경로(#55). 적용은 가역(DB 교체), 네이버 발행은 별도 GO(#46).

---

## 2. 3-Plane 합성 모델

| Plane | 내용 | 도구 |
|---|---|---|
| 후경 (back) | 페인터리/풍경 디포커스, 라벨 톤과 호응(따뜻 우드+린넷·세이지). 차갑거나 화려한 배경 금지(#57). | Firefly 생성 |
| 중경 (mid) | 원목 상판·표면·접지면. 본품 바닥-표면 접촉(컨택트 섀도)로 떠 보이지 않게. | Firefly 생성 |
| 전경 (front) | **본품(주인공) + 라벨 선명 + 키라이트(상단 좌측) + 드롭/접지 그림자**. 비율은 상품현실시트 앵커. | 레퍼런스 누끼 충실 |

- 모델: **Nano Banana Pro**(제품 사실성·레퍼런스 충실 최강), 대안 FLUX (Firefly web 무료). (2026-06-10 §3)
- 비율: 히어로 4:3, 썸네일용 1:1 각 1회.
- 레퍼런스 업로드 = 본품 누끼(§4 워크플로 2단계). 프롬프트는 **장면+스케일**을 기술, 레퍼런스가 **형태**를 운반.

---

## 3. 앱 통합 (C-3 / C-7 / C-9 / C-5)

| 청크 | 역할 | 상태 |
|---|---|---|
| **C-3** `finish-image` | 대표 마무리 단일 라우터: bg-difficulty → SIMPLE 인앱 white-bg / COMPLEX bg_clean seed + apply-cutout 안내. main_image_policy 소비·keepAsExtra. | ✅ 빌드 (feat/finish-image-router, preview READY·병합대기) |
| **C-7** `apply-composite` | 무드 합성 executor: 누끼+무드(Firefly 회수 or 인앱 sharp) → harmonize/normalize → extra_images 슬롯(가역). | ✅ 라이브 |
| **C-9** 개입카드 | `source_request`(누끼 소스 부재)·`hero_crop_request`(소스 과소/텍스트)·`firefly_drop`(무드 합성 드롭킷·3-plane 프롬프트). | ✅ 라이브 |
| **C-5** 스튜디오 마무리 카드 | C-3+C-7+C-9 착지점: 대표 SIMPLE/COMPLEX + 무드/추가 + 개입카드, dry-run before/after·재가드. | ☐ C-3 병합 후 |

엔진 한 줄: 인제스트 → 상품현실시트 → 누끼 → 대표 마무리(finish-image) → ≥2 무드(apply-composite·Firefly) → seo-guard 재검 → 개입대기열(필요분만 자연 등장) → 적용(가역) → 발행 GO(비가역).

---

## 4. 상품별 워크플로 7단계 (= 신규상품 합성 표준 프로세스)

1. **상품현실시트 작성** — 실측 비율·용량·형태·소재·라벨/핵심셀링(§5).
2. **누끼 소스 확보** — 공급사 실촬영 단품 히어로컷(완전포함)에서 `image_remove_background` → 투명 PNG. 작은 카드컷·텍스트컷·저해상 금지(#57).
3. **대표 마무리** — `finish-image`(C-3) bg-difficulty 판정 → SIMPLE 인앱 white-bg / COMPLEX Adobe cutout → 흰배경 §9 규격(1:1 1000, 본품 70~85%, 텍스트 0).
4. **무드 설계** — ≥2 무드: 사용맥락 + 스튜디오 정물. 상품현실시트 비율 앵커, 카테고리 톤(#57).
5. **합성 생성** — Firefly Nano Banana Pro 3-plane(레퍼런스=누끼, **과대금지**). harmonize·접지그림자·normalize 등 결정적 변환만 코드(sharp).
6. **적재·적용** — `composite/` 적재 → `apply-composite`(C-7) → extra_images 슬롯(가역). seo-guard 재검 → 개입대기열 자연 호출(C-9).
7. **검수·발행** — 브라우저 실측(C-6) → 대표 GO → 네이버 발행(비가역 #46).

---

## 5. 상품현실시트 템플릿 (Product Reality Sheet)

> 합성 전 필수. 과대·왜곡 차단의 앵커. 전상품 1장씩.

| 필드 | 값(예: 명화) |
|---|---|
| 상품ID / 상품명 | cmpnooli4… / 명화 디퓨저 |
| 형태 (form-factor) | 걸이형 차량 송풍구 디퓨저(걸이형 사용가능) |
| 실측 치수 W×H×D | (실측 입력, mm) |
| 용량 (ml) | 15ml (/30ml) |
| 소재 / 마감 | 유리/플라스틱 본체 + 명화 라벨 |
| 라벨·핵심 셀링포인트 | 인상주의 명화 라벨(또렷이 보여야 = 핵심가치) |
| 사용 맥락 | 차량 송풍구 걸이 / 홈 / 데스크 |
| 프레임 점유율 가이드 | 대표 70~85%(§9) · 무드 히어로 ~50~55% |
| 금지 | 과대·잘림·텍스트대표·평면 기계겹침 |

---

## 6. 명화 정정 프롬프트 — 2무드 (걸이형 15ml · 과대금지)

★ **누끼 caveat (#44/#45/#46)**: 레퍼런스 누끼가 **실제 본체 형태·비율과 일치**해야 한다. `2026-06-10` 핸드오프는 기존 `cutout.png`를 reed(유리병+우드캡+리드스틱) 형상으로 육안 기록했고, 본 정정(걸이형 15ml 소형)과 형상이 다르다. 합성 전 **대표 재확인 누끼(실제 걸이형 본체·실비율)** 를 레퍼런스로 사용할 것 — 불일치 시 재누끼/재촬영(그렇지 않으면 프롬프트가 걸이형이어도 산출물에 reed가 남음).

공통 규칙: 본품을 **실측 15ml 소형 비율 그대로**(do not enlarge), 명화 라벨을 선명한 주인공으로, 자연 접지그림자, 포토리얼, no text/no watermark. 레퍼런스 누끼가 형태를 운반.

**Mood 1 — 사용맥락(걸이형):**
```
Photorealistic product shot of the exact compact 15ml car-vent fragrance diffuser from the reference image, kept at its true small size (do not enlarge), hanging/clipped on a tasteful modern car air vent; the impressionist oil-painting label clearly visible and in sharp focus as the hero; soft natural daylight from the left, gentle realistic contact shadow; shallow depth of field on a clean car-interior background; warm editorial grade; photorealistic; no text, no watermark. 4:3.
```

**Mood 2 — 스튜디오 정물(상품 자체):**
```
Premium studio still-life of the exact compact 15ml fragrance diffuser from the reference image at its true real-world scale (not enlarged), standing on a warm light-oak surface; softly blurred impressionist water-lily painting backdrop in cream and sage-green; soft key light upper-left; gentle contact shadow and faint reflection; shallow DOF; warm editorial grade; the painted label crisp and dominant as the hero; photorealistic; no text, no watermark. 1:1 and 4:3.
```

산출물 용도: 추가이미지(2~9)·상세 히어로. 대표(1)는 별도 흰배경 §9. (REP_FINISHING §9, composite recipe §6)

---

## 7. 도구 분담 · 비가역 가드

- 누끼 = Adobe MCP `image_remove_background`(복구됨). 자연 무드 합성 = Firefly 웹UI 브라우저 반자동(#52, 파일드롭·생성클릭=대표). 결정적 변환(크롭·리사이즈·틴트·harmonize·normalize) = 앱 sharp. compositing/gen-bg는 Adobe MCP 영구 미지원(#53).
- 비가역 0(#46): 네이버 PUT·발행·Adobe 폴더삭제는 **대표 GO 전 0**. 모든 합성 적용은 가역(DB extra_images 교체·이전 자산 스토리지 보존).

---

## 변경 이력
- 2026-06-11 — 신규 작성(Code, 저장소 권위문서 합성·대표 리뷰 대기). 6원칙·3-plane·앱통합(C-3/C-7/C-9/C-5)·워크플로7·상품현실시트·명화 정정 2무드. 권위 = 본 문서로 합성 표준 단일화.
