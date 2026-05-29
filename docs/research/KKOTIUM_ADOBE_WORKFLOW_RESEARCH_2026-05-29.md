# KKOTIUM Adobe Integrated Workflow — 솔로셀러 표준 SOP (2026.05 기준)

> **상태**: RESEARCH SOURCE (Adobe 도구 분업·모델 선택의 권위 있는 근거 문서)
> **작성**: 2026-05-29 Desktop turn (대표 지시: "누끼=Express, 합성=Firefly 편집, 모델 비교 활용, 명화송풍구 햇살 톤 전환")
> **활용**: 본 문서는 향후 모든 디자인 워크플로우 결정의 1차 출처
> **선행 권위 문서**: docs/research/KKOTIUM_ART_DIRECTION_RESEARCH_2026-05-29.md (카테고리×톤 매핑 + 법적 게이트)
> **선행 인계**: HANDOFF_g8_engine_q3_2026-05-29.md, CLAUDE_MCP_DESIGN_WORKFLOW_2026-05-29.md

---

## 0. TL;DR (시스템 설계자 먼저 읽을 3줄)

- **도구 분업 정답**: 누끼·텍스트·브랜드키트·일괄변형 = **Adobe Express** / AI 배경 생성·자연 합성 = **Firefly(웹)** / 픽셀 보존 정밀 합성 = **Photoshop(Generative Fill + Harmonize)**. "누끼=Express, 배경=Firefly, 정밀합성=Photoshop"이 솔로셀러 ROI 최적 분업.
- **모델 선택 정답**: 상업안전 우선 컷(clean/badge) = **Firefly Image 4/5 네이티브(Adobe IP 면책)** / 합성·편집 = **Nano Banana(Gemini 2.5/3)** / 제품 색·재질 충실도 = **Imagen**. **달항아리 등 한국 전통 미감은 Firefly가 '한복→일본 기모노' 렌더 오류(2025.09 다수 한국 언론 보도) 약점이 있어 Nano Banana/Gemini 1순위 + 누끼 reference 고정 필수.**
- **명화송풍구 톤 재정의**: "다크 시네마틱 가죽" 폐기. **1순위 = 자연광 우드 책상/카페 창가, 2순위 = 자연광 차량 인테리어.** 인상주의 명화 라벨 + 조 말론·딥디크 한국 무드와 정합.

---

## 1. Adobe Express vs Firefly vs Photoshop — 정확한 기능 분업

### 1-A. Adobe Express
- **누끼(배경 제거)**: Firefly AI 원클릭, 한국어 UI, 최대 40MB 업로드 (무료 플랜 5MB 제한 사례 있음), 투명 PNG 출력
- **한계**: 머리카락·유리·반투명·저대비 배경 정확도 저하 (표본 3종은 단단한 외곽선이라 적합)
- **강점**: 템플릿, **Brand Kit**(로고·컬러·폰트 저장, 프리미엄은 복수 키트), 텍스트 효과, 다국어
- **Bulk Create**: CSV 1행=1변형, **최대 99개 변형** (텍스트·에셋 스왑). 단 링크 요소는 템플릿 재사용 시 재연결 필요
- **미지원**: 여러 이미지 일괄 리사이즈 (Photoshop/Lightroom 필요)

### 1-B. Firefly (웹)
- **Generate**: 텍스트→이미지 신규 생성
- **Edit**: 기존 이미지에 자연어 요소 추가·제거·교체 (Prompt to Edit)
- **Generative Fill**: 브러시로 영역 칠하고 프롬프트
- **Generative Expand**: 캔버스 확장·비율 변경 (아이스트레이 가로형 → 정사각 변환 사례)
- **Object Composite / Adaptive Composite**: 제품 사진을 생성 배경에 톤·그림자·조명 자동 매칭
- **Boards**: 무한 캔버스 무드보드, 여러 파트너 모델 한 화면 비교

### 1-C. Photoshop (Generative Fill + Harmonize)
- **핵심 ROI**: **비파괴 합성** — 실제 제품을 Smart Object 잠그고 배경에만 Generative Fill, Layer Mask + 1px feather로 **제품 픽셀 0% 변형 보장**
- **Harmonize** (MAX 2025): 조명·색·톤 자동 매칭
- **마켓플레이스 정책 안전**: 쿠팡/아마존은 제품 픽셀 AI 변형을 "부정확 표현"으로 리스팅 정지 위험 → "배경=AI, 제품=실사 보존" 하이브리드가 안전

### 1-D. 기능 매트릭스

| 기능 | Adobe Express | Firefly(웹) | Photoshop |
|---|---|---|---|
| 누끼(배경 제거) | ◎ 원클릭·한국어·40MB | ○ 일괄 | ○ 개체 선택 |
| 배경 생성 | △ 템플릿 | ◎ Generate·파트너 모델 | ○ Generative Fill |
| 자연 합성 | △ | ◎ Object/Adaptive Composite | ◎ Harmonize+레이어 |
| **정밀 합성(픽셀 보존)** | ✕ | △ | **◎ Smart Object** |
| 텍스트/카피 | ◎ | ✕ | ○ |
| Brand Kit | ◎ 복수 키트 | △ Custom Models | △ |
| 일괄 변형 | ◎ Bulk 99개 | △ 엔터프라이즈 | △ |
| 일괄 리사이즈 | ✕ | ✕ | ◎ |

---

## 2. Firefly 모델 5종 비교 (2026.05 최신)

### 2-A. 모델별 정밀 비교

| 모델 | 강점 | 약점 | 상업안전성 | 한국 미감 | 해상도 |
|---|---|---|---|---|---|
| **Firefly Image 4 / 4 Ultra** | 구조·스타일 제어, 인물·동물·건축 정밀 | 아트성 평범 | ◎ **Adobe IP 면책** | △ 한복→기모노 약점 | 2K |
| **Firefly Image 5** (public beta, 2025.10.28) | 4MP 네이티브, **Layered Editing**, Prompt to Edit | 베타(면책 비대상 가능) | ◎ | △ 검증 필요 | 4MP(2240×1792) |
| **Nano Banana** (Gemini 2.5 Flash Image) | 합성·편집·일관성 95%+, 대화형 | 1K, 블렌딩 약점, 사진 충실도↓ | △ **크리에이터 책임** | ◎ 커뮤니티 1순위 | ~1K |
| **Nano Banana Pro** (Gemini 3 Pro Image, 2025.11) | 4K, 텍스트·한국어 라벨, 14ref, Search 그라운딩 | 비용 | △ 크리에이터 책임 | ◎ 경복궁 정확 | 4K |
| **Imagen 3/4** | **제품 색·재질 충실도 최강** (블라인드 73% 선호) | 느림, 편집 외부툴 | △ 크리에이터 책임 | △ 검증 필요 | 고해상 |

### 2-B. Adobe MAX 2025 (2025.10.28) 파트너 모델 명단 (공식)
- Black Forest Labs (FLUX)
- Google (Gemini/Imagen/Veo)
- Luma AI
- OpenAI (GPT Image)
- Runway
- ElevenLabs
- Topaz Labs

### 2-C. 한국적 미감 — CRITICAL 약점

**Adobe Firefly의 '한복' 렌더 오류**:
- 전자신문·서울경제·헤럴드경제 2025.09 보도
- 서경덕 교수 지적: "프롬프트에 한복을 입력하자 허리띠(오비)가 있는 일본풍의 전통의상이 검색"
- 반크: 다수 생성형 AI가 '경복궁'을 오사카성처럼 생성

**Nano Banana/Gemini 한국 평가**:
- 한국 커뮤니티 한국 전통 렌더 1순위
- 네이티브 한국어 프롬프트 강점
- "한국 전통 복식이라는 특화된 영역에서는 나노바나나가 구조적 오류가 적다"
- 단 달항아리/백자 충실도 정식 벤치마크는 부재 → **셀러 자체 A/B 필수**

### 2-D. 모델 선택 결정 룰 (KKOTIUM 표준)

```
clean / badge (최종 상업컷, 면책 필요)        → Firefly Image 4/5 네이티브 (1순위)
lifestyle 합성 (제품+배경 자연 결합)           → Nano Banana 2.5 / Pro (1순위)
제품 색·재질 충실도 최강 (라벨·금속·유리)      → Imagen (1순위)
한국 전통 (한옥·달항아리·한지)                → Nano Banana/Gemini (1순위) + 누끼 reference 고정 필수
                                            → 최종 상업컷은 Firefly 네이티브 재생성 (면책)
```

---

## 3. 명화송풍구 "햇살 고급" 톤 재정의 (CRITICAL)

### 3-A. 왜 다크 시네마틱이 틀렸나
- 제품 = 4세트 인상주의 명화 (반 고흐 어선·들판, 모네 양산·가을 강가) 라벨
- **다크 시네마틱은 인상주의(자연광·외광파·파스텔)와 정면 충돌**
- 조 말론·딥디크·아쿠아 디 파르마의 한국 인지 무드는 "자연·따뜻함·편안함"이지 다크 럭셔리 아님

### 3-B. 한국 디퓨저·향수 상세페이지 검증된 표준 무드
- **자연광 렌탈스튜디오 + 우드 소품 + 카페 창가 + 햇살/따뜻한 조명 + 식물 오브제**
- 사례:
  - 언노운필름: "자연광 렌탈스튜디오에서 따뜻한 감성을 가득 담아 촬영"
  - 바:림: "따뜻한 자연광에서 촬영한 우드 볼 디퓨저"
  - ADFi 향수 상세페이지 가이드: "향수상세페이지는 제품의 향 자체를 직접 전달할 수 없는 구조이기 때문에 시각적인 무드 연출이 핵심... 햇살 같은 따뜻함" 감정선 먼저 전달

### 3-C. ROI 우선순위
- **1순위: 자연광 우드 책상 / 카페 창가** (범용성 + 제작 난이도 + 인상주의 정합 모두 우위, 인테리어·차량 양쪽 소구)
- **2순위: 자연광 차량 인테리어** (차량용 핵심 USP 강조 컷 1장만)

### 3-D. 햇살 고급 Firefly 프롬프트 5종 후보

1. **자연광 우드 책상 (1순위)**:
```
A luxury car diffuser bottle on a warm oak wood desk by a large window, soft morning sunlight casting gentle shadows, impressionist painting label visible, minimal Scandinavian interior, dried pampas grass in ceramic vase, shallow depth of field, warm color grade, photorealistic, 4:5
```

2. **카페 창가**:
```
Premium perfume diffuser on a marble café table beside a sunlit window, golden hour natural light, linen napkin, a cup of latte softly blurred, airy bright atmosphere, impressionist pastel mood, commercial product photography
```

3. **자연광 차량 인테리어 (2순위)**:
```
Elegant car air diffuser clipped to a luxury vehicle vent, warm afternoon sunlight streaming through windshield, beige leather interior softly lit, clean and bright, sense of calm sanctuary, lifestyle product shot, natural light
```

4. **우드 인테리어 선반**:
```
Car diffuser displayed on a warm walnut wood shelf, soft diffused daylight from side window, small green plant, beige wall, cozy warm minimalist Korean interior, impressionist art label, natural soft shadows
```

5. **발코니 햇살**:
```
Luxury diffuser on a balcony ledge with morning sunlight, soft bokeh of green plants and warm city light, fresh airy mood, gentle warm tones evoking Monet impressionism, lifestyle photography, 4:5
```

### 3-E. 톤 일관성 유지
- Firefly Image 4/5 (상업안전) 1차 생성
- **Composition Reference로 누끼 실제품 고정**
- 동일 Seed + Style Reference 유지로 4변형 톤 통일

---

## 4. 도매꾹 상세페이지 부분 활용 — 한국 저작권 가이드

### 4-A. 사진저작물 vs 단순 제품사진
- **단순 제품 사진**: 창작성 약함 → 사진저작물로 인정 어려움 (대법원 기준)
- **이미지 사진(연출컷)**: 피사체 선정·구도·조명·소품 배치에 촬영자 개성 → **저작물로 보호됨**
- **함의**: 도매꾹 상세의 감성 연출 컷일수록 무단 변형 리스크 큼

### 4-B. 2차적저작물·동일성유지권
- 원저작물 변형 (크롭·톤보정·합성) → 새 창작성 추가 = **2차적저작물 작성**
- 원저작자 허락 없으면 **2차적저작물작성권·동일성유지권 침해 가능**

### 4-C. 형사처벌 (저작권법 제136조 제1항, 2021.5.18 개정)
- **5년 이하 징역 또는 5천만원 이하 벌금 또는 병과**
- 영리목적·상습 침해는 **비친고죄**

### 4-D. 도매꾹 실무 룰
1. 상세페이지의 "상세설명 이미지 사용여부" 반드시 확인
2. 사용 허용 표시 제품만 활용
3. **가급적 단순 제품컷(누끼 가능)만 차용해 자체 배경으로 재구성**
4. 감성 연출 원본은 그대로 쓰지 말 것

### 4-E. asset-legal-gate 룰 추가 (Code 작업 권고)
- 도매꾹 mainImage URL 패턴 감지 시 "원본 활용 가능 여부" 플래그 강제
- 감성 연출 컷(인물·라이프스타일 무드)은 누끼만 차용, 배경은 재생성

---

## 5. 비용 기준선 (Firefly Pro $19.99 보유)

### 5-A. Firefly Pro 구성
- **$19.99/월** (Adobe 공식)
- **4,000 premium credits + 무제한 표준 생성**
- Adobe Express Premium 포함
- Photoshop (web/mobile) 포함
- 크레딧 매월 billing date 리셋 (이월 없음)
- 4,000 크레딧 ≈ 5초 영상 약 40개분
- **솔로셀러 최적**: 표준 이미지 생성 무제한 → 상세페이지 작업 한계비용 사실상 0

### 5-B. 한국 외주 단가 대비 (크몽 공식)
- 상세페이지: 기본형 픽셀단위 최소 1.9만원, 평균 20만원, 풀패키지 54만원+
- 누끼 보정: 건당 1만~2만원
- **자체 Adobe 워크플로우 ROI**: 상품 3~5개 자체 제작만으로 월 외주비 회수

---

## 6. 표본 3종 단계별 도구 매핑 SOP

### 6-A. 공통 4변형 정의
- **clean**: 흰배경 누끼
- **lifestyle**: 자연광 연출
- **price**: 가격·혜택 텍스트
- **badge**: 인증·USP 뱃지

### 6-B. 아이스트레이 (주방/warm)
1. 원본 → **Express 누끼** → clean 컷 (흰배경)
2. **Firefly Image 4 Generate** "warm kitchen counter, morning light, wood board" → lifestyle 배경 (또는 기존 Firefly_D 사용)
3. **Photoshop**: 누끼 제품 Smart Object 잠그고 배경 합성 + **Harmonize** → lifestyle 컷
4. **Express**: price/badge 텍스트·뱃지 합성, Brand Kit 적용, Bulk로 4변형 사이즈 출력

### 6-C. 명화송풍구 (차량/디퓨저) — 톤 전환
1. 원본 → **Express 누끼** → clean 컷
2. **Firefly Image 4/5** + 위 프롬프트 1·3번 + Composition Reference(누끼 PNG) + Style Reference(따뜻한 자연광) → lifestyle 2종 (책상·차량)
3. 라벨 인상주의 디테일 보존 → **Imagen으로 제품 충실도 보강** 옵션, 또는 **Photoshop 비파괴 합성**
4. **Express**: 명화 4세트 옵션 뱃지 + price, Brand Kit, 4변형 출력

### 6-D. 달항아리 도어벨 (전통/인테리어) — 모델 선택 주의
1. 원본 → **Express 누끼** → clean 컷
2. **한국 전통 미감이라 Firefly 단독 생성 지양** → **Nano Banana/Gemini로 한옥·한지·자연광 배경 생성** (한국 전통 렌더 우위), 누끼 달항아리를 reference로 고정
3. 백자 질감·색 충실도는 **Imagen** 또는 **Photoshop 실사 합성**으로 보강, 결과물 한 컷씩 육안 검수 (백자 뉘앙스 오류 체크)
4. **Express**: 전통·인테리어 뱃지 + price, Brand Kit, 4변형 출력
5. **단, clean/badge 등 상업안전·면책이 필요한 최종 컷은 Firefly 네이티브로 재생성** (파트너 모델은 면책 비대상)

### 6-E. 4변형에 다른 도구·모델이 필요한 이유

| 변형 | 도구 | 모델 | 이유 |
|---|---|---|---|
| clean | Express 누끼 | — | 빠름·무크레딧 |
| lifestyle | Firefly + Photoshop | Nano Banana/Imagen | 배경 생성·자연 합성 |
| price | Express | — | 텍스트·Brand Kit |
| badge | Express + Firefly | Firefly 네이티브 | 면책 필요 |

톤 일관성은 Style Reference + 동일 Seed로 4변형 통일.

---

## 7. Composition / Style / Structure Reference 단계별 가이드

### 7-A. Composition (= Structure) Reference
- 누끼 제품 PNG 또는 원하는 배치 이미지 업로드
- Firefly가 외곽선·깊이 매칭
- Strength 슬라이더로 적용 강도 조절
- **용도**: 동일 제품을 동일 위치·각도로 여러 배경에 일관 합성

### 7-B. Style Reference
- 브랜드 톤 무드보드 (KKOTIUM Brand Red #E62310, Pink #FFCCEA, 따뜻한 자연광 샘플) 업로드
- 색·조명·질감·분위기 학습
- Visual Intensity·Strength 슬라이더 조절
- **주의**: Composition/Style/Color/Camera 등 추가 컴포넌트는 **Adobe 네이티브 모델 전용** — 파트너 모델(Nano Banana 등) 미지원

### 7-C. Seed 관리
- 동일 Seed + 동일 프롬프트 + 동일 reference = 유사 결과 재현
- **4변형 톤 일관성 유지의 베스트프랙티스**
- Seed를 기록해두고 변형마다 재사용

### 7-D. Firefly Custom Models (beta)
- 권리 보유 이미지 10장+ 업로드로 브랜드 전용 모델 학습
- KKOTIUM 시그니처 톤을 반복 생성
- 솔로셀러도 Creative Cloud 플랜서 waitlist 접근 가능

### 7-E. 주의사항
- 사용자가 업로드한 reference(Style/Structure)에 **타인 저작물 포함 시 IP 책임이 사용자에게 이전**
- 누끼 reference는 반드시 자체 보유/제작 이미지

---

## 8. Claude Chrome MCP 자동화 가능성과 한계

### 8-A. 자동화 가능
- Firefly·Express 웹 UI 직접 조작 (프롬프트 입력·생성·다운로드)
- 반복 변형, 배경 생성 배치
- category-tone-mapper + asset-legal-gate + 12종 프롬프트 라이브러리 연동
- 표본별 프롬프트 자동 주입

### 8-B. 한계 — 수동 검수 필수
1. **백자·인상주의 라벨 등 디테일 충실도** 육안 확인
2. **4-Point 법적 게이트 통과 여부** (특히 파트너 모델 결과의 상업책임)
3. **마켓플레이스 제품 픽셀 변형 리스크**
4. Composition/Style Reference 미세 조정

### 8-C. 솔로셀러 소요 시간
- 자동화 생성: 10~20분
- 수동 검수·보정: 20~40분
- **상품당 합계: 약 30분~1시간 (4변형 기준)**

---

## 9. 권고 — 즉시·단기·중기

### 9-A. 즉시 (0~2주)
1. **도구 분업 고정**: 누끼=Express, 배경생성·합성=Firefly(웹), 정밀합성=Photoshop. 표본 3종에 위 SOP 그대로 적용해 각 1상품 파일럿
2. **모델 정책 확정**: clean/badge=Firefly Image 4/5(면책), lifestyle 합성=Nano Banana(편집력), 제품 충실도=Imagen. 달항아리=Nano Banana 1순위 + Firefly 최종 재생성
3. **asset-legal-gate 룰 추가**: "파트너 모델 결과 = 크리에이터 책임, 최종 상업컷은 Firefly 네이티브"
4. **명화송풍구 톤 교체**: 다크 시네마틱 폐기 → 위 프롬프트 1·3번(자연광 책상·차량) 채택, Brand Kit 컬러·Seed 등록

### 9-B. 단기 (2~6주)
5. **Reference 자산화**: 누끼 PNG 라이브러리 + 따뜻한 자연광 Style Reference 무드보드 구축. Seed 기록 시트 운영
6. **저작권 게이트 강화**: 도매꾹 "이미지 사용여부" 자동 체크 + 감성 연출 원본 차단, 단순 제품컷만 누끼 차용
7. **Firefly Custom Models waitlist 신청** → KKOTIUM 시그니처 톤 학습 준비

### 9-C. 중기 (6주+)
8. Express Bulk Create로 4변형 × 다플랫폼(스마트스토어·쿠팡) 사이즈 자동 양산
9. Claude MCP 자동화 파이프라인에 카테고리×톤 매핑 연동, 상품당 30분 목표

### 9-D. 판단 기준 (Threshold)
1. **파트너 모델 결과가 상업 리스크 검토 통과 못 하면** → 즉시 Firefly 네이티브 재생성
2. **백자/라벨 충실도 육안 NG면** → Imagen 또는 Photoshop 실사 합성으로 전환
3. **월 표본 검수 시간이 상품당 1시간 초과하면** → 프롬프트 라이브러리·Custom Model 재튜닝
4. **Nano Banana 달항아리 A/B서 Firefly가 동등 이상이면** → 면책 우위로 Firefly 일원화

---

## 10. Caveats (단정 제한사항 #46)

- **파트너 모델 상업책임**: Nano Banana/Imagen/GPT/FLUX는 Adobe IP 면책 비대상. 상업 사용 적정성 = 크리에이터 책임. Firefly 네이티브만 자격 플랜서 면책. 베타 기능도 면책 비대상. Style/Structure reference에 타인 저작물 업로드 시 책임 사용자 이전.
- **한국 미감 벤치마크 공백**: Firefly의 한복→기모노 오류는 다수 한국 언론 보도로 확정적이나, 달항아리/백자 충실도의 모델별 정식 벤치마크 부재. Nano Banana 우위는 블로거·브랜드 테스트 기반(피어리뷰 아님). 셀러 자체 A/B 권장.
- **모델·가격 변동성**: Firefly 모델/플랜/파트너 라인업 분기마다 급변 (2025년 Image 4→5, Nano Banana→Pro, FLUX.2, Runway 제휴 추가). 가격·크레딧 공식 페이지 재확인 필수.
- **마켓플레이스 정책**: 쿠팡/아마존은 제품 픽셀 AI 변형을 "부정확 표현"으로 리스팅 정지 가능. 제품은 실사 보존, 배경만 AI 원칙 유지.
- **사진 vs 합성 충실도**: Nano Banana는 실제품 사진적 정확도 약함 (색온도·피사계심도) → 단독 제품샷 부적합, 합성·편집 보조 사용. 제품 충실도는 Imagen/실사 보존이 우위.
- **무료 플랜 한계**: Express 무료는 5MB 업로드·크레딧 제한 보고 사례. Firefly Pro 보유 시 해당 없음.
- **Adobe MAX 2025 (2025.10.28)** 발표 기준 모델 라인업이며, 분기마다 변동 가능.
