# 꽃틔움 KKOTIUM — 이미지·SEO·ROI 카피 적응형 엔진 (ADAPTIVE_IMAGE_SEO_ENGINE.md)

> 저장: 2026-06-08 | 권위 문서 (상세페이지 생성의 "이미지 + SEO + 카피" 운영 레이어)
> 상위 권위: CONCEPT_PRESET_SYSTEM.md (프리셋·토큰·강도) · DETAIL_PAGE_PLAYBOOK.md (7섹션 SOP·저작권)
> 짝 자산: docs/design/aroma_L3_detail_reference.html (aroma L3 정식 레퍼런스 = 첫 검증본)
> 핵심: 프리셋이 "무드"를 정하면, 본 엔진이 그 프리셋에 맞는 **이미지 지시·SEO·카피**를 자동 산출한다.
> 불변 원칙: 고정 코어 불변(#55 전상품 범용) · 비가역 0(발행 GO 전 PUT 금지 #46) · 대표이미지 SEO 가드는 프리셋과 직교.

---

## 0. 한 문장
**프리셋(aroma/gift/tradition/kitchen/pet) → 이 엔진이 [이미지 아트디렉션 + SEO 필드 + ROI 카피]를 한 번에 산출 → 7섹션 자동 조립 → 개입점에서 운영자 미세조정 → 발행.**

---

## 1. 적응형 이미지 전략 엔진

### 1-A. 2갈래 라우팅(기존 IMAGE_DETAIL_TWO_BRANCH_SYSTEM.md과 결합)
| 상세 소스 품질 | 라우팅 | 처리 |
|---|---|---|
| 공급사 상세 양호 | **Branch A** | 공급사 상세 그대로 채택(detail=curated) + SEO/누락요소만 보강 |
| 공급사 상세 부족 | **Branch B** | 본 엔진으로 7섹션 생성(프리셋 아트디렉션 적용) |

→ 명화=Branch A 확정(공급사 양호). 단 **앱 생성 역량(Branch B)** 은 전상품 대비 항상 준비. 본 레퍼런스(aroma L3)는 Branch B의 기준틀.

### 1-B. 프리셋별 이미지 아트디렉션 (A+C 레이어 모델)
- **A 레이어 = 배경 무드** (프리셋 팔레트로 분위기), **C 레이어 = 전경 오브제** (제품/정물 포인트). 히어로·향연출·아트스토리에 A+C 합성.
- 대표이미지는 이 모델 **제외** — 항상 1:1 화이트배경·본품만(SEO 가드, §3).

| 프리셋 | A 배경 무드 | C 전경 오브제 | 이미지 스타일 | Firefly 프롬프트 방향 |
|---|---|---|---|---|
| **aroma** | 인상주의 명화(모네 수련/정원) | 정물 꽃 한 점 | 연출·여백·무광 | "impressionist garden/water-lily, soft sage·cream, painterly, no text" |
| **gift** | 웜 파스텔 그라데이션·보케 | 리본·선물상자 | 언박싱·설렘 | "warm pastel gift scene, ribbon, soft bokeh, cozy, no text" |
| **tradition** | 한지 질감·먹 번짐·여백 | 단청 문양 포인트 | 한국적 여백 | "korean hanji texture, ink wash, dancheong accent, minimal, no text" |
| **kitchen** | 청결 화이트·라이트블루 | 제품 누끼·스펙컷 | 누끼·기능 | "clean white studio, soft blue, product cutout, crisp, no text" |
| **pet** | 친근 웜톤 라이프스타일 | 반려동물 정황 | 라이프스타일 | "cozy warm lifestyle with pet, friendly, soft light, no text" |

### 1-C. 저작권 가드(아트 프리셋 = aroma/일부 gift)
- 퍼블릭도메인(사후 70년+, Met Open Access CC0) 원작만. 캡션 필수: 작가·작품·연도·"Public Domain".
- Firefly 생성물은 유료 플랜(IP 면책). 실존 브랜드/유명인 식별 얼굴 금지(익명·비식별만), 미성년 부적절 금지. (플레이북 §5)

### 1-D. 도구 체인(파이프라인 §1)
S1 소재(공급사+Met CC0) → **S2 Firefly/Express 생성·합성** → **S3 아티팩트 1차틀**(본 레퍼런스) → **S4 Figma/Canva 860px 양산** → S5 네이버 업로드.

---

## 2. SEO 전략 (프리셋과 직교 — 전상품 동일 가드)
디자인 무드가 바뀌어도 SEO는 안 바뀐다. 데이터 모델에서 분리(CONCEPT §7).

### 2-A. 고정 가드(전상품)
- 상품명 50자 이내, 핵심 키워드 전진 배치, 중복·과장 금지.
- 대표이미지 1:1·화이트배경·본품만, 텍스트/외곽선/홍보문구 0(네이버 2024-10-28 강화).
- 카테고리 정확도 + 속성 채움(적합도 기여).

### 2-B. 골든 키워드 운영(상품별 데이터)
- 1차(상품 정체성) + 2차(용도·상황) + 롱테일(선물·추천) 3계층.
- 명화 예시: 차량용 디퓨저 · 송풍구 방향제 · 명화 디퓨저 / 차 안 인테리어 · 차량용 방향제 / 차량용 방향제 선물 · 차량용 디퓨저 추천.
- 상세 본문 카피에 자연 삽입(상세 텍스트=적합도 기여). 단 대표이미지엔 텍스트 금지.

---

## 3. ROI 카피라이트 엔진 (프리셋 톤 × 섹션 목적)
프리셋이 "톤"을, 섹션이 "목적"을 정한다. 둘의 교차로 카피를 산출.

### 3-A. 프리셋별 카피 톤
| 프리셋 | 톤 | 금기 |
|---|---|---|
| aroma | 감성 내러티브(향→장면 번역) | 스펙 나열식·과장 |
| gift | 설렘·따뜻함·관계 | 차가운 기능어 |
| tradition | 정서·이야기·격 | 가벼운 유행어 |
| kitchen | 명료·기능 불릿·실용 | 과한 감성 |
| pet | 신뢰·친근·안심 | 불안 조장 |

### 3-B. 섹션별 ROI 카피 공식(7섹션)
1. **후킹**: 감정 1줄 + 정체성 키워드. (이탈 방지) 예 "달리는 길 위에서, 한 점의 그림을 두르다"
2. **가치**: 베네핏 3개(기능 아닌 결과). 키워드 자연 삽입.
3. **스펙**: 사실·수치·정보고시. 과장 0(신뢰).
4. **사용법**: 동사 3단계(쉬움 = 구매장벽↓).
5. **신뢰**: 작품출처/국산/인증/성분 — ROI의 핵심(전환 직결).
6. **CTA**: 행동유도 + **안심요소(무료배송·국산·교환안내)**. 대형 레드버튼.
7. **공통안내**: 배송·교환·반품(store_settings 슬롯).

### 3-C. ROI 레버(검증된 전환 요소)
- 안심: 국산·인증·교환정책 명시(CTA 인근). · 선택의 즐거움: 무료 옵션 강조.
- 과장/최상급 금지(#46 진위성) — 신뢰가 곧 ROI.

---

## 4. 톤앤매너 매트릭스 (상품 → 프리셋 → 정체성)
| 상품 | 프리셋/Level | 정체성(페이지 주연) | 브랜드 위치 |
|---|---|---|---|
| 명화 차량용 디퓨저 | aroma / L3 | 미술관·작품·향의 내러티브 | 하단 메이커 마크 |
| 달항아리 도어벨 | tradition / L3 | 한국적 여백·공예 정서 | 하단 메이커 마크 |
| 64구 아이스트레이 | kitchen / L1 | 청결·실용·기능 | 절제 노출 |
- 공통: 페이지 정체성 = 상품의 것. 꽃틔움 = 품질 토큰 공급자 + 조용한 메이커 마크(브랜드 스탬프 금지, 플레이북 §2).

---

## 5. 앱 바인딩 (구현 명세 — Phase A/B)
프리셋 1개당 산출: ①팔레트 ②폰트페어링 ③여백밀도 ④이미지 아트디렉션(§1-B) ⑤카피 톤(§3-A) ⑥레이아웃(L3만).

### 5-A. 데이터(Supabase products 확장 — CONCEPT §6-A)
```
concept_preset    text default 'kitchen'  -- aroma|gift|tradition|kitchen|pet
preset_intensity  text default 'l1'       -- l1|l2|l3
preset_overrides  jsonb                    -- {accent, hero_copy, mood_image}
-- SEO 필드(seo_title/naver_category_id/attributes)는 프리셋과 분리(직교)
```
### 5-B. CSS(globals.css) — :root 코어 + [data-preset] 가변 (레퍼런스 HTML과 1:1)
### 5-C. 7섹션 CVA variant(preset × intensity) + generate-detail가 본 엔진 소비
### 5-D. SEO 가드 린터(상품명 50자·대표이미지 화이트배경·카테고리) = 프리셋 독립 항상 실행

---

## 6. 생성 흐름(상황별 융통 + 개입점 자연스럽게)
1. 카테고리 → 프리셋/Level 자동추천
2. 2갈래 판정(공급사 상세 품질) → A(채택+보강) / B(생성)
3. B면 본 엔진으로 [이미지 지시 + 카피 + SEO] 산출 → 7섹션 조립(레퍼런스 틀)
4. **개입점**: 커스터마이징 슬롯(accent/히어로카피/무드이미지) 운영자 미세조정
5. S2/S4 빌드업(Firefly·Met CC0 → Canva/Figma 860px)
6. SEO 가드 검증(프리셋 독립) → 발행 게이트 → 대표 GO → 발행(비가역 #46)

---

## 7. 개선점(이번 정리에서 추가)
- v2 시안 `--rose-dust` 키릴문자 오염 교정(#C98AA2). 레퍼런스에 반영.
- v2 누락이던 **신뢰 요소(국산·인증 HB...)** 를 S5/스펙/히어로 칩에 보강(플레이북 §4 정합).
- 토큰을 :root(코어)/[data-preset](가변)로 분리 → globals.css 직접 포팅 가능.
- 이미지 슬롯마다 **Firefly 프롬프트 주석** 삽입 → S2 빌드업 즉시 가능.
- CTA에 ROI 안심요소(국산·교환안내) 추가.

## 7.1 적용 개선 (2026-06-08 rev — Desktop 시니어 검토 반영)
정식 레퍼런스(aroma_L3_detail_reference.html)에 직접 반영 완료:
1. **버그 교정** — `<style>` 내 `<!-- -->` HTML 주석 4곳(CSS 무효·규칙 누락 위험) → `/* */` CSS 주석으로 교체.
2. **모바일 가독성** — 본문 13.5~14px → 모바일 16px+ 보정(플레이북 §3 준수).
3. **포토리뷰 슬롯** — S5 신뢰 섹션에 후기·평점 연동 슬롯 추가(§2 신뢰=후기, 전환 직결).
4. **모바일 상시 CTA 바** — position:fixed 구매바(모바일 전용, 데스크톱 비표시) → 스크롤 중 전환 누수 방지.

## 7.2 전 프리셋 [data-preset] 토큰값 (globals.css 포팅용 — Code Phase A)
고정 코어 `:root` 불변(brand-red #E62310 / pink #FFCCEA / Pretendard / 8배수). 아래는 가변 레이어(semantic) — 컴포넌트는 hex 모르고 semantic만 참조(CONCEPT §1).
```
[data-preset="aroma"]    { --surface:#F3EFE7; --surface-subtle:#FAF7F0; --surface-deep:#E9E2D4; --accent:#76864C; --accent-soft:#A4A879; --terracotta:#B5694C; --rose-dust:#C98AA2; --ink:#3A352E; --ink-soft:#7A7468; --line:#DAD2C2; --card:#FBF9F4; }
[data-preset="tradition"]{ --surface:#F4ECE0; --surface-subtle:#FAF4EA; --surface-deep:#E7D9C4; --accent:#9B2D30; --accent-soft:#C28A5E; --ink:#1C1C1C; --ink-soft:#5A5247; --line:#D8C9B2; --card:#FBF6EC; }   /* 한지·먹·단청 */
[data-preset="kitchen"]  { --surface:#FFFFFF; --surface-subtle:#F6F9FC; --surface-deep:#EEF3F8; --accent:#2F6FB0; --accent-soft:#7FA8D0; --ink:#1A1A1A; --ink-soft:#5B6470; --line:#E2E8EF; --card:#FFFFFF; }   /* 청결 화이트·블루 */
[data-preset="gift"]     { --surface:#FBF3EE; --surface-subtle:#FFFBF7; --surface-deep:#F3E2D6; --accent:#C98A3E; --accent-soft:#E3B98C; --ink:#3A2E28; --ink-soft:#7A6A60; --line:#EAD9CC; --card:#FFFBF7; }   /* 웜 파스텔·골드 */
[data-preset="pet"]      { --surface:#FBF6EF; --surface-subtle:#FFFCF7; --surface-deep:#F0E6D8; --accent:#C77A4A; --accent-soft:#E0A877; --ink:#34302A; --ink-soft:#6E665C; --line:#E4D8C8; --card:#FEFBF6; }   /* 친근 웜톤 */
```
강도(intensity)는 `data-intensity=l1|l2|l3`로 레이아웃 변형 제어(L3만 섹션순·히어로 변경). SEO 가드는 전 프리셋 동일(직교).


## 8. 다음
- Code: Phase A(globals.css 코어/프리셋4) + Phase B(Supabase 컬럼·7섹션 CVA·SEO 린터·generate-detail 소비). 레퍼런스=aroma_L3_detail_reference.html.
- Desktop: S2 Firefly 배경/향연출 + Met CC0 모네 원작 → S4 Canva/Figma 860px 양산(빌드업).
