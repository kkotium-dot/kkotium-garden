# 꽃틔움 가든 v3.2 통합 마스터 플랜 — 심층 연구 보고서

> 생성일: 2026-05-19
> 출처: Claude Web 심층 연구 (compass_artifact_wf-3da534b6-f560-4427-b2e4-61d88db7f909)
> 분류: Master Plan Research

## TL;DR (3 bullets)
- **결론**: 꽃틔움 가든 v3.2는 (1) **P-Filter (전처리 진단 모듈)** → (2) **9축 비즈니스 진단** → (3) **단일 캔버스 인라인 마법사 (14 스켈레톤 × 12 빌딩블록)** 의 3단 구조로 가야 하며, 셀러 개입 등급은 4단계 한글 라벨("기본 자동화 / 검토 후 자동화 / 디자이너 손길 필요 / 완전 수동")로 매핑한다. 도매매 원본의 다수는 **L2(검토 후 자동화)** 로 분류될 가능성이 높다 — 공급사 로고/배너가 거의 항상 박혀 있기 때문이다.
- **즉시 적용 권고**: P-Filter는 **sharp + Tesseract.js + Laplacian 분산 + Hugging Face/Replicate의 BRISQUE/NIQE 추론** 조합으로 1.5초 이내 진단 가능. 다크패턴 규제 6대 유형(2025-02-14 시행, 2025-08-13 순차공개 가격책정 계도기간 종료, 2025-10-24 「전자상거래 등에서의 소비자보호 지침」 개정)을 **빌딩블록 차원에서 사전 차단 룰**로 내장해야 한다.
- **인라인 마법사 UX**: Notion/Cursor가 입증한 *inline overlay prompt* + *right-rail co-pilot* 하이브리드 + **Approve/Reject/Refine 3버튼 + 비파괴 버전 히스토리**가 디자이너 셀러에게 최적. Claude Artifacts 패턴(대화창 안 카피·시안 → 셀러 승인/거절/조정)은 **API 호출 없이도** 마법사 안에 그대로 이식 가능하다.

---

## Key Findings (영역별 핵심 인사이트)

### 영역 1 — 이미지 전처리 필터 (P-Filter) 알고리즘
1. **블러 검출의 사실상 표준은 Laplacian 분산**이다. sharp.js 의 `.convolve()` 로 3×3 Laplacian 커널을 돌린 뒤 분산(variance)을 구해 threshold(~300)와 비교하면 OpenCV 없이도 동등 결과가 나온다. (Pablo Schaffner Bofill의 sharp 기반 BlurryDetector 구현, LinkedIn 2024)
2. **No-Reference 이미지 품질 평가는 BRISQUE / NIQE / PIQE 세 가지**가 사실상 표준. BRISQUE 원전 논문 Mittal·Moorthy·Bovik, "No-Reference Image Quality Assessment in the Spatial Domain," IEEE Transactions on Image Processing, vol. 21, no. 12, pp. 4695-4708, Dec 2012 (DOI: 10.1109/TIP.2012.2214050). JavaScript 네이티브 구현은 빈약하므로 **Replicate / Hugging Face Inference Providers** 호출로 우회하는 게 가성비 최고다.
3. **상업용 image-quality API (Sightengine)** 가 0-1 스코어로 sharpness/exposure/contrast/brightness를 한 번에 돌려준다. 공식 임계값 가이드: **0.85+** "very good to perfect", **0.6~0.85** "good to very good", **0.45~0.6** "decent to good", **0.25~0.45** "poor to decent", **< 0.25** "very poor". 꽃틔움 L1~L4 등급 매핑에 그대로 사용 가능.
4. **도매매 원본의 워터마크/공급사 로고 검출은 Tesseract.js OCR + Sobel 엣지 + 모서리 영역 색상 히스토그램** 3중 룰로 충분하다. 도매매 이미지는 다수가 **하단 또는 상단에 한글 로고/사이트명**을 박는 패턴이므로, 이미지 상하 15% 영역에 OCR을 우선 돌리는 게 효율적이다.
5. **자동 보정 가능 범위**: 화이트밸런스/노출/밝기/콘트라스트는 **sharp의 normalize + linear**, 디노이징은 sharp의 `.median()` 또는 `.blur(0.3)`, 업스케일링은 **UpscalerJS** 또는 Replicate Real-ESRGAN. 워터마크 제거는 **Adobe Firefly의 Generative Remove API** (MCP 연결됨) 또는 Replicate LaMa 모델.

### 영역 2 — 2025-2026 AI 셀러 도구 벤치마킹
1. **PhotoRoom의 핵심 성공 패턴**: (a) Shopify 직접 연동으로 "촬영 → 편집 → 등록" 한 도구 내 완결, (b) Flat Lay API + Product Beautifier API + AI Background Generator를 합쳐 **하나의 워크플로우 = 하나의 API 호출**, (c) Decathlon 사례 — 1,000장 처리 시간 2주 → 20분, 품질 통과율 99%, 비용 99% 절감 (PR Newswire, April 14, 2026). 공식 배치 한도 250장/회(Super Batch 500장), (d) Background Remover 1초 이내 응답.
2. **Claid.ai의 차별점**: e-커머스 product photography에만 집중 — Precise/Creative/Mockup의 **3가지 모드**로 통제권을 단계화. $9 ~ $39/월 크레딧제, AI Fashion Models 기능이 잠옷/임부복 카테고리에 직결.
3. **Adobe Firefly Image Editor (2026)**: Generative Fill/Remove/Expand/Upscale/Remove Background를 **한 인터페이스 통합**, **12개 이상 외부 파트너 모델**(Gemini 3 Nano Banana Pro, GPT Image, Runway Gen-4.5, FLUX, Luma AI, Kling AI, ElevenLabs, Topaz Astra 등) 사용자 선택. **자연어 프롬프트** AI Assistant 추가. "셀러는 결과만 보고 승인" 패턴.
4. **Canva Magic Studio**: Background Remover + Magic Eraser/Grab/Expand/Layers — 모두 **단일 캔버스 위에서** 작동, "사진 일부만 골라 명령" 가능. Canva Pro $12.99/월. 단점: 진정한 batch 처리 없음.
5. **공통 성공 패턴**: (a) "한 번 업로드 → 여러 결과" (4개 variant 동시 생성), (b) "테마/스타일 = 재사용 가능한 자산" (Brand Kit, Pebblely 40+ 테마), (c) "per-image approval workflow" (Macks.ai: 격자뷰로 한 장씩 승인/거절/재생성), (d) "Sub-1초 응답".

### 영역 3 — 네이버 스마트스토어 상세페이지 (2025-2026)
1. **공식 이미지 사양**: 권장 가로 860px, 단일 이미지 세로 5,000px 이하(3,000px 초과 시 분할), 파일당 최대 20MB, **대표이미지 1,300px 이상 + 1:1 비율** (Photio Blog 인용 — production 적용 전 Naver 공식 헬프 cross-check 필요). sharp.js 자동 리사이즈/분할/포맷 변환을 P-Filter 최종 단계에 내장.
2. **검색 알고리즘 4축 (네이버플러스 스토어 개편 후)**: 적합도(필드 연관도 + 카테고리 선호도) / 인기도(클릭·판매·리뷰·찜·최신성) / 신뢰도(SEO 페널티 + 어뷰징) + **개인 선호도** (신규 추가). 2024년 **Tree-based 매칭 모델** 교체로 키워드 스터핑은 오히려 페널티.
3. **AiTEMS 추천 시스템**: 2024-04-17부터 스마트스토어/브랜드스토어 페이지에 AiTEMS 추천 광고 노출. 셀러는 **상세페이지 내 체류시간/스크롤 깊이**를 늘리는 게 AiTEMS 가중치 받는 길.
4. **다크패턴 6대 금지 유형 (2025-02-14 시행)**: ① 숨은갱신 ② 순차공개 가격책정 ③ 특정옵션의 사전선택 ④ 잘못된 계층구조 ⑤ 취소·탈퇴 등의 방해 ⑥ 반복간섭. **2025-08-13 계도기간 종료** 후 즉시 제재. **2025-10-15 첫 과태료 처분** — 쿠팡 250만, 콘텐츠웨이브 400만, NHN벅스 300만, 스포티파이 100만 (총 1,050만원). **2025-10-24 「전자상거래 등에서의 소비자보호 지침」 개정 시행** — '첫 화면' 정의 구체화.
5. **굿서비스 점수 (2025-12-02 우수셀러 배지 시작 → 2026-01 정규 전환)**: 주문 이행 / 배송 품질 / 고객 만족 3축. 14일 윈도우 매일 갱신. 월평균 점수가 등급 산정 반영. 판매금액 집계 기간 3개월 → 1개월 단축.
6. **상세페이지 첫 화면(First Fold) 5섹션 공식**: Hook(헤드 카피 + 키비주얼) → 공감(페인포인트 제시) → 해결(USP 한 줄) → 신뢰(인증/후기/숫자) → CTA.

### 영역 4 — 인라인 마법사 UX 패턴
1. **AI UI의 5가지 자리**: (a) Inline Overlay (Notion/Grammarly), (b) Right Panel (Cursor, Copilot), (c) Canvas Agent (Figma/Lovable), (d) Chat-First (ChatGPT), (e) Modal Wizard (Shopify onboarding). 꽃틔움은 **(a) + (c) 하이브리드**가 디자이너 셀러에게 최적.
2. **Regeneration UX 두 모드**: **Overwrite**(채팅형) vs **Branching**(편집기형). 새싹 셀러는 인지 부하 줄이기 위해 **Overwrite + 최근 5개 history toggle** 적합.
3. **Approve / Reject / Refine 3버튼 패턴**: Macks.ai batch editor가 모범 — 처리 후 격자뷰(2×2~6×6 가변) 한 장씩 결정. 비파괴 원칙.
4. **Shopify Onboarding 검증 패턴**: auto-advance + progress bar + 명확 CTA + dismiss/resume. 위자드 5~8단계 sweet spot.
5. **인라인 편집 + AI 통합 새 표준 (Cursor 2.0)**: Plan Mode → Agent Mode → aggregated diff → 일괄/개별 승인.

---

## Details (영역별 구체 패턴 + 통합 방법)

### 영역 1 상세 — P-Filter 사양

#### 단계별 진단 파이프라인 (목표: 1.5초 이내)
1. **메타데이터 스캔** (50ms): sharp.metadata() → width/height/format/density/orientation. 860px × 860px 미만 → **L4** 또는 자동 업스케일.
2. **블러 점수** (200ms): sharp 3×3 Laplacian convolve → variance. < 100 "심각", 100~300 "주의", >300 "정상".
3. **노출/콘트라스트** (150ms): sharp.stats() → channels[].mean / stdev. mean < 30 또는 > 225 노출 문제. stdev < 20 콘트라스트 부족.
4. **화이트밸런스** (150ms): R/G/B 평균 비율 → sRGB neutral 영역 5% 이상 치우치면 cast 검출.
5. **OCR 텍스트 검출** (400ms): Tesseract.js **상하 15% 영역만** 한국어 모드 실행 → 워터마크/로고 분류, 자동 크롭 후보 마킹.
6. **배경 단일성 검사** (200ms): 코너 4점 + 무게중심 색상 히스토그램 분산 비교. < 1500 단일 배경.
7. **객체 위치/비율** (300ms, optional): Hugging Face DETR 또는 Replicate segmentation. bbox/image 비율 0.3~0.7 "적정".
8. **최종 등급 판정**: 7개 점수 가중 합 → **꽃틔움 4-등급**:
   - **기본 자동화 (L1)**: 모든 점수 정상, 워터마크 없음 → 1.225초 파이프라인 직행
   - **검토 후 자동화 (L2)**: 워터마크 검출 OR 노출/WB 보정 필요 → AI 자동 보정 후 셀러 1-click 승인
   - **디자이너 손길 필요 (L3)**: 블러 심각 OR 객체 절단 OR 배경 복잡 → 마법사 안에서 디렉팅
   - **완전 수동 (L4)**: 해상도 부족 OR 객체 인식 실패 → 재촬영/재선택 권고

#### 추천 라이브러리 스택 (월 비용 0원 가정)
| 기능 | 1순위 | 2순위 |
|---|---|---|
| 이미지 메타/리사이즈 | **sharp** (이미 사용) | jimp |
| 블러 검출 | sharp + Laplacian | @bstrickl/blurriness |
| OCR | **Tesseract.js** | Cloudinary OCR add-on |
| BRISQUE/NIQE 점수 | Replicate API (~$0.001/img) | Sightengine (free tier) |
| 업스케일 | UpscalerJS (브라우저) | Replicate Real-ESRGAN |
| 워터마크 제거 | Adobe Firefly Generative Remove (MCP 연결됨) | Replicate LaMa |
| 객체 detection | Hugging Face DETR (free tier) | Replicate Grounding DINO |

#### 9축 진단 시스템과의 통합
P-Filter는 9축 진단의 **C1 (이미지 카드)** *입력 사전 검증* 단계:
```
업로드 → P-Filter (물리적 품질) → 9축 진단 (비즈니스 적합도) → 14 스켈레톤 매칭 → 12 빌딩블록 조립
```
P-Filter 출력 = 9축 진단의 **C1 자동 점수** 일부로 변환. 워터마크 검출 → T4 (신뢰도 위험) 자동 가중치 추가.

---

### 영역 2 상세 — AI 셀러 도구 벤치마킹

#### 도구별 자동화 흐름 (사용자 클릭 수)

| 도구 | 업로드 → 완성 클릭 수 | 디자이너 개입 지점 | 가격 |
|---|---|---|---|
| **PhotoRoom** | 3클릭 | 템플릿/배경 선택만 | 무료 / $9.99/월 / $19.99/월 |
| **Claid.ai** | 4클릭 | 모드 + 프롬프트 | $9 ~ $39/월 (크레딧제) |
| **Pebblely** | 2클릭 | 40+ 사전 정의 테마 | Free 40장/월 |
| **Flair AI** | 다수(드래그앤드롭) | 소품/조명/카메라 직접 배치 | $8 ~ $38/월 |
| **Booth AI** | 3클릭 | 모델/장면 텍스트 지시 | Custom |
| **Adobe Firefly + Express** | 4클릭 | 자연어 프롬프트 + AI Assistant | Creative Cloud 포함 |
| **Canva Magic Studio** | 3클릭 | Magic Grab/Eraser/Expand 부분 제어 | $12.99/월 (Pro) |

#### 꽃틔움에 바로 적용 가능한 패턴
- **(P1)** PhotoRoom Brand Kit → 꽃틔움 셀러별 **브랜드 키트**(로고, 컬러 팔레트, 폰트, 기본 배경 톤) 1회 설정 후 모든 빌딩블록 자동 주입.
- **(P2)** Claid 3-모드 패턴 → **"빠르게 / 균형 / 정밀"** 3-슬라이더를 P-Filter 결과 따라 자동 추천.
- **(P3)** Macks.ai 격자 승인 뷰 → 14 스켈레톤 각 시안 4개씩 생성 → 한 페이지에서 한 번에 승인/거절/재생성.
- **(P4)** Adobe MCP 직접 연결 → Firefly Generative Remove를 워터마크 제거 전용 호출.
- **(P5)** Pebblely "Surprise Me" → 9축 진단 + 카테고리별 톤 추천 버튼.

---

### 영역 3 상세 — 네이버 스마트스토어 상세페이지 최적화

#### 첫 화면(First Fold) 5섹션 표준 (모바일 우선)
| 섹션 | 길이 | 내용 | 14 스켈레톤 매핑 |
|---|---|---|---|
| **Hook** | 1줄, 30자 이하 | "명사 + 차별 동사" 패턴, 5초 안에 USP 전달 | S1 (헤더) |
| **공감** | 2~3줄 | 타깃 고객 고민 직접 호명 | S2 (페인포인트) |
| **해결** | 1줄 + 키비주얼 | "이 상품이 왜 다른가" | S3 (USP/해결) |
| **신뢰** | 3~5개 요소 | "98%가 만족", 인증서, 베스트 리뷰 | S5 (신뢰), S6 (사회적 증명) |
| **CTA** | 버튼 (다크패턴 회피) | "지금 구매 → 무료배송" | S14 (CTA) |

#### 카테고리별 특화 패턴
- **인테리어소품**: 라이프스타일 컷이 핵심. AI 배경 합성(Claid Creative Mode 또는 Firefly Generative Fill)으로 "거실/침실/원목 책상 위" 컨텍스트 자동 생성.
- **잠옷 / 임부복**: AI Fashion Models (Claid, Booth AI). 임부복 임산부 모델 사용 시 "안전·편안·여유" 키워드 반드시 포함.
- **아기침구**: 신뢰 요소 압도적으로 중요. KC 인증, OEKO-TEX 안전성 배지를 첫 화면 안에 배치. AI는 "톤·온도·밝기"만 보정, 제품 자체 변형 금지.

#### 다크패턴 회피 사전 차단 룰 (자동 lint)
- **순차공개 가격책정 금지**: 빌딩블록 B-가격 "첫 화면에 총 결제액(배송비·옵션비 포함) 명시" enforced field 강제.
- **숨은갱신 금지**: 정기결제 옵션은 갱신·증액 시 추가 동의 UI 자동 생성.
- **잘못된 계층구조 금지**: "취소/반품" 버튼은 "구매" 버튼과 동일 시각 비중 자동 렌더링.
- **반복간섭 금지**: 팝업·푸시 카운트 제한 (1세션 1회).
- **취소·탈퇴 방해 금지**: 회원탈퇴 → '계정관리' 메뉴 자동 배치.

> **자동 lint** 는 12 빌딩블록 출력 직전 통과 의무 — 한 항목 위반 시 셀러에 즉시 경고 + 자동 수정 제안.

#### 9축 진단과의 통합
- **C2 (카피)** ← Hook + 공감 + 해결 + CTA 5섹션 자동 평가
- **C3 (구성)** ← 첫 화면 5섹션 순서 + 모바일 우선 레이아웃 평가
- **T2 (검색 노출)** ← 적합도/인기도/신뢰도 + 개인선호도 4축 확장 평가
- **T4 (신뢰도)** ← 다크패턴 lint 결과 + 굿서비스 점수 시뮬레이션

---

### 영역 4 상세 — 인라인 마법사 UX 패턴

#### 단일 캔버스 = 좌 미리보기 + 우 빌딩블록 패널 + 하 진행 상태바

```
+--------------------------------------------------------------+
| 꽃틔움 가든 — [상품명: 코튼 아기침대 가드 (인테리어소품)]    |
+------------------------------------+-------------------------+
|  모바일 미리보기 (실시간)           |  빌딩블록 (B01~B12)    |
|  +------------------------------+  |  +- B01 헤더           |
|  |  [헤더 이미지 — S1 + B01]   |  |  |   자동 완성          |
|  |  "원터치로 펼치는 안전한 침대"|  |  |   직접 수정          |
|  |                              |  |  |   다시 생성          |
|  |  [페인포인트 — S2 + B02]    |  |  +- B02 페인포인트     |
|  |  "잠 못 자는 아기, 부모도..."|  |  |   진행 중            |
|  |  ...                         |  |  +- B03 USP            |
|  +------------------------------+  |  |   대기               |
|                                    |  +- ...                  |
+------------------------------------+-------------------------+
|  진행: 4/14 단계  | 되돌리기  | 자동저장                     |
+--------------------------------------------------------------+
```

#### Approve / Reject / Refine 3버튼 인터랙션
- **Approve**: 다음 빌딩블록으로 자동 진행 (Cursor 2.0 aggregated diff)
- **Reject**: 변경 폐기, 셀러 직접 입력 모드 전환
- **Refine**: 같은 빌딩블록 다른 톤/스타일 재생성. 옵션 슬라이더 4개:
  1. **톤**: 친근 ↔ 전문
  2. **길이**: 짧게 ↔ 길게
  3. **감정**: 따뜻 ↔ 자극
  4. **포커스**: 가격 ↔ 가치

#### 비파괴 편집(Non-destructive editing) 원칙
- **모든 자동화 출력은 별도 layer**로 저장 — 원본 데이터 절대 덮어쓰지 않음.
- **최근 5개 버전 즉시 토글** mini-history UI.
- **자동 저장 = 매 30초 + 매 빌딩블록 완료 시** → Supabase 행 단위 upsert.

#### Skip / Override / Resume 패턴
- **Skip**: 빌딩블록 건너뛰면 → 9축 진단 해당 항목 경고 + 점수 차감
- **Override**: 자동 결과 무시 직접 입력 → 학습 데이터 저장
- **Resume**: 작업 중단 → 마지막 위치 + 모든 시안 + history 복원

#### Claude Artifacts 비-API 패턴 활용
> **핵심 아이디어**: Claude.ai Artifact 창을 직접 임베드하지 말고, **꽃틔움 자체 캔버스가 Artifact처럼 작동**하도록.

- **카피 시안 1개 = 1 artifact = 1 카드**. 셀러 카드 안 inline 편집 가능, 외곽에 Approve/Reject/Refine.
- **여러 시안 동시 표시**: 한 빌딩블록당 4개 artifact 카드 격자 (Macks.ai 패턴) → 한 번에 비교.
- **inline AI prompt**: 카피 안 특정 문장 드래그 → 작은 floating menu ("더 짧게 / 더 친근하게 / 통계 추가") — Notion AI inline + Cursor selection-based edit 패턴.
- **버전 분기 (branching)**: Refine 버튼 길게 누름 → "이 시안 보존하고 새 변형 생성" → 트리 뷰 시각화.

#### 9축 진단과의 통합
- 9축 점수 **실시간 우측 상단 표시** — 빌딩블록 수정마다 즉시 갱신
- 점수 변화 5점 초과 시 토스트 알림 ("C2 점수가 73 → 81로 상승!")
- 진단 점수 80점 미만 영역은 **빨간 점 배지** 자동 부여

---

## Recommendations (단계별 실행안)

### 즉시 (Sprint 1, 1주 이내)
1. **P-Filter MVP**: sharp + Tesseract.js + Laplacian variance만으로 5개 진단 항목 구현 → 1.5초 응답. 비용 0원.
2. **4-등급 한글 라벨 확정**: "기본 자동화 / 검토 후 자동화 / 디자이너 손길 필요 / 완전 수동"
3. **다크패턴 lint 룰 6개 작성**: 빌딩블록 출력 직전 통과 의무.

### 단기 (Sprint 2-3, 2~4주)
4. **단일 캔버스 인라인 마법사 프로토타입**
5. **Adobe MCP 활용 워터마크 제거**: Firefly Generative Remove를 P-Filter L2 자동 실행에 결선
6. **빌딩블록당 4-시안 격자 뷰**

### 중기 (Month 2-3)
7. **9축 진단 점수 실시간 갱신 UX** (websocket 또는 Supabase Realtime)
8. **버전 history + branching UI**
9. **굿서비스 점수 시뮬레이터** — T4 항목 강화

### 장기 (Month 4+)
10. **셀러 학습 데이터 기반 개인화 추천**
11. **카테고리별 LoRA / Custom Model** — 인테리어소품·잠옷·임부복·아기침구 4개 카테고리
12. **Naver Commerce API 직접 연동** — 등록까지 한 번에

### 임계값(thresholds) — 추천 변경 트리거
- **P-Filter L4 비율 > 15%** → P-Filter 임계값 재조정 또는 자동 보정 강화
- **9축 진단 평균 점수 < 75** → 빌딩블록 템플릿 자체 개선
- **셀러 평균 마법사 완주율 < 70%** → 단계 수를 5개로 축소
- **셀러 Refine 평균 3회 이상** → 1차 자동화 품질 부족 → 모델 교체 또는 프롬프트 튜닝

---

## Caveats (한계와 주의사항)

1. **네이버 공식 이미지 사양은 third-party blog 기준 인용** — help.sell.smartstore.naver.com 직접 확인 안 됐다. 사실상 표준으로 봐도 무방하지만, production 적용 전 Naver 공식 헬프 cross-check 필요.
2. **다크패턴 규제는 시행 중이지만 판례 축적 부족** — 2025-10-15 첫 과태료 처분은 복합 사유로, 일반 상세페이지 어떤 표현이 "정확히" 어떤 유형에 해당하는지는 향후 케이스로 결정.
3. **AI 이미지 생성은 제품 자체 변형 위험** — 특히 아기침구/임부복 안전성 신뢰 핵심이므로 **AI는 배경/환경에만 적용, 제품 자체 보존** 원칙 강제. Adobe Firefly Content Credentials는 신뢰성 도구.
4. **새싹 셀러 비용 부담**: 무료 API tier 한도 넘으면 비용 발생. 셀러당 일일 한도 클라이언트 측 명시 + 한도 초과 시 lightweight 로컬 알고리즘 fallback 필요.
5. **모바일 vs 데스크탑 동시 지원**: 단일 캔버스 UI 모바일 폭(<375px)에서 좌-우 패널 동시 표시 어려움. **모바일은 탭형 (미리보기 패널 토글)**, 데스크탑은 split-view 분기.
6. **9축 진단 자동 점수의 객관성**: 일부 축은 본질적으로 주관적 (예: T5 감정적 매력). 자동 점수는 "참고 점수" 표기 + 셀러 직접 조정 슬라이더 제공.
7. **AiTEMS는 블랙박스**: 네이버 공식 가중치 비공개. 시뮬레이션은 추정치. 실제 노출 변화는 A/B 테스트로 검증.

---

## 부록 — 통합 마스터 플랜 v3.2 골격 요약

```
[1. 업로드]
    |
[2. P-Filter: 8단계 진단 (sharp + Tesseract + Replicate)]
    |
    +- L1 기본 자동화 → 9축 진단 → [3. 인라인 마법사]
    +- L2 검토 후 자동화 → AI 보정 (Firefly/Claid MCP) → 1-click 승인 → [3]
    +- L3 디자이너 손길 → 마법사 안에서 보정 디렉팅 → [3]
    +- L4 완전 수동 → 재촬영/재선택 권고 → 종료
                                                            |
[3. 인라인 마법사 = 단일 캔버스]
    좌: 모바일 미리보기 (실시간)
    우: 14 스켈레톤 × 12 빌딩블록 (B01~B12)
    하: 진행 상태바 (4/14) + 자동저장 + 되돌리기
    각 블록: Approve / Reject / Refine + 4-시안 격자 + Claude Artifact 패턴
    |
[4. 9축 진단 점수 실시간 갱신 + 다크패턴 lint]
    |
[5. 굿서비스 점수 시뮬레이터 + AiTEMS 적합성 추정]
    |
[6. 출력: 스마트스토어 호환 (860px / 5000px / 20MB / 1:1 thumbnail)]
    |
[7. (선택) Naver Commerce API 직접 등록]
```

#### L1~L4 정확한 한글 정의
- **L1 기본 자동화** = 셀러가 결과만 본다 (0-clicks)
- **L2 검토 후 자동화** = AI가 먼저 보정하고 셀러는 1-click 승인 (1-click)
- **L3 디자이너 손길 필요** = 셀러가 슬라이더/프롬프트로 디렉팅 (3-5 clicks)
- **L4 완전 수동** = 셀러가 처음부터 만든다 (재촬영 또는 외부 도구)

#### 자동화 vs 디자이너 디렉팅 분기 매트릭스
| 입력 품질 | 카테고리 복잡도 | 분기 |
|---|---|---|
| 우수 | 단순 (인테리어소품) | L1 |
| 우수 | 복잡 (임부복+모델) | L2 |
| 보통 | 단순 | L2 |
| 보통 | 복잡 | L3 |
| 미흡 | 단순 | L3 |
| 미흡 | 복잡 | L4 |
| 부적합 | 무관 | L4 |
