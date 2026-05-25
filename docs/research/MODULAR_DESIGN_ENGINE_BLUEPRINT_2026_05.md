# 모듈형 자동 조립 디자인 엔진 & 디자인 프리셋 시스템 구현 청사진 (2026)

> 생성일: 2026-05-21
> 작성: Claude Web (시니어 심층 리서치 — launch_extended_search_task)
> 분류: Sprint 7-M2 5-B / 모듈형 자동 조립 디자인 엔진 설계 근거 문서
> 트리거: 대표님 비전 전환 — "정적 PSD 3종"이 아니라 "상품 성격에 따라 AI가 에셋을
>   자동 배치하는 모듈형 템플릿 엔진 + 꽃틔움 디자인 프리셋(반복 결정 제거)".
>   셀러는 1차 완성본을 컨펌/디렉팅하는 디렉터로 남는다.

---

## TL;DR
- **결론: Adobe/Figma/Canva API를 통째로 채용하지 말고, "코드 우선 모듈러 엔진"을 자체 구축.** 1인 새싹 단계에서 Firefly Services(Enterprise, 추정 월 ~$1,000+), InDesign Server, Canva Connect Autofill(Enterprise 멤버만 + 결과가 Canva 종속), Figma REST(Pro에서도 Images 엔드포인트 429 빈번)는 모두 과잉. 최적 스택 = **Next.js 14 App Router + Satori/@vercel/og + Sharp + Firefly Image/Object Composite API(상품 합성에만 호출)**.
- **레이아웃은 "PSD"가 아니라 "JSON 슬라이스(slice) 스키마"로 모델링.** Prismic Slice Machine / Sanity 슬라이스 / Contentstack Modular Blocks / Builder.io 블록 패턴 차용. 각 섹션(후킹/USP/페인포인트/신뢰/FAQ/CTA)을 독립 블록으로 정의하고, 기존 전략적 역할 엔진(꿀통/니치/트렌드/레드오션)이 "어떤 블록을 어떤 순서로 끼울지" 결정하는 규칙 기반 컴포저(rule-based composer)가 정답.
- **모바일 퍼스트 + 한국 시장 특성은 비협상.** 한국 온라인쇼핑 모바일 비중 2025년 8월 79.4% / 9월 75.9%(국가데이터처). 네이버 대표이미지: 1:1 비율 1300px 이상 / 최대 20MB / JPG·PNG·GIF·BMP, **2024-10-28부로 텍스트·외곽선·"네이버 쇼핑 1위" 등 홍보·랭킹·인증 문구 인서트 금지(위반 시 즉시 제재 + 클린 프로그램)**. 상세페이지 가로 860px, 한 이미지당 ≤5000px·≤20MB. 시스템 폰트는 Pretendard(SIL OFL)가 사실상 표준.

---

## 1. 네이버 스마트스토어 2025-2026 디자인 기준 (확정 사실)

**대표이미지(썸네일)**: 권장 1:1 1300px 이상, 최소 160×160, 최대 20MB, JPG/JPEG/PNG/GIF/BMP.
- **2024-10-28부터 등록 기준 강화** (위반 시 상품 제재 + 클린 프로그램). 금지: (a) 상품명 불일치 이미지, (b) 가격/배송/홍보성 텍스트, (c) "네이버 쇼핑 1위"·"BEST"·"무료배송" 등 랭킹·홍보 문구, (d) 주목 유도용 외곽라인·도형·인위적 마크, (e) KC인증·A/S·원산지 텍스트 인서트, (f) 디자인 같고 세부만 다른 변형 이미지.
- **자동 조립 엔진 정책 가드: 썸네일에는 절대 텍스트·뱃지·홍보 문구 합성 금지. 텍스트 오버레이는 상세페이지 영역에만. 코드 레벨 강제 필요.**

**상세페이지**: 권장 가로 860px(PC 표시 ~900px), 모바일 자동 축소. 세로 무제한이나 한 이미지당 ≤5000px·≤20MB. GIF 인라인 허용. 글자 크기 PC 기준 약 1.5배 권장(모바일 16-18px).

**2025-2026 정책 변화(셀러 등급/노출 직접 영향)**:
- 2025-06-25 ET News: 고객 문의 24시간(1영업일) 내 응답 의무화, 위반 시 판매금지·이용정지 예고.
- 2026-01-01 ET News(2025-12-01): 굿서비스 점수(배송·발송속도·문의대응률·리뷰)가 정규 프로그램 전환 + 추천 알고리즘 직접 연동. 셀러 등급제 개편 2025-12-02부터.
- 검색 노출 알고리즘: 적합도(상품명·카테고리·태그·브랜드) + 인기도(클릭·판매·구매평·찜·최신성) + 신뢰도. 상세페이지는 인기도·신뢰도로 간접 기여.
- "2025-03 클릭률→전환율 전환", "CS 12h 단축"은 reseller 블로그 종합, 네이버 공식 미확인 — 디렉셔널 가이드로만.

## 2. 디자인 자동화 플랫폼 API 비교 (1인 셀러 관점)

| 항목 | Adobe Firefly Services | InDesign API | Canva Connect Autofill | Figma REST/Plugin |
|---|---|---|---|---|
| 진입 자격 | Enterprise 계약 | Enterprise만 | Canva Enterprise 멤버만 | 누구나(rate-limit) |
| 인증 | OAuth S2S(2-legged) | 동일 | OAuth2 scope | PAT/OAuth2 |
| 가격(1인) | 추정 월 ~$1,000+ | 별도 견적 | Enterprise 시트(비현실적) | 무료(한도 내) |
| 결과 소유 | S3 presigned URL | O | Canva 종속 | export PNG/SVG/PDF |
| 자동 범위 | T2I, Generative Fill/Expand, **Object Composite**, Custom Models, Photoshop Masking, Upscale | CSV→INDD 가변생성 | 브랜드템플릿 필드 오토필(분당 60req) | 노드 export, Plugin 레이어 조작 |
| 한계 | 텍스트 레이아웃·배지 약함, 사진합성·배경 강함 | InDesign 종속 | 오토필만, 조건부 슬라이스 불가 | REST/Plugin 불일치, export 429 |
| 1인 적합도 | △ 상품샷 슬롯만 한정 호출 | ✕ | ✕ | ✕ |

**결정적 권고**: Firefly Object Composite + Image Generation API만 "상품 이미지 슬롯"에 사용. 레이아웃 조립은 자체 코드.

**대안 Template Automation API**: Bannerbear($49/월·1000크레딧), Placid($19/월·500), Templated.io($29/월·Canva임포트), APITemplate.io($29/월·HTML/CSS), Imejis.io($14.99~). 단 한국어 폰트는 자체 호스트가 안정적. **첫 빌드 셀프호스트(@vercel/og+Satori) → 트래픽 늘면 Bannerbear/Templated 부분 이관.**

## 3. Vercel 서버리스 합성·렌더링 스택 (자체 호스팅)

**1순위 Satori + @vercel/og (Next.js 14 내장)**: HTML/CSS(JSX)→SVG→PNG, Edge·Node 모두, 100-500ms. 제약: bundle ≤500KB, **flexbox만(grid 미지원)**. 한국어: Pretendard Variable woff2 서브셋(~200KB).

**2순위 Sharp(libvips)**: Satori로 텍스트카드/USP배지/헤더 PNG 생성 후 composite()로 상품+아이콘+배경 합성 → 분할 5장. GraphicsMagick 대비 4-7배.

**3순위 보조 Puppeteer + @sparticuz/chromium-min**: 풀-CSS HTML 캡처용만. 콜드스타트 5-15초, 장당 30초+ 흔함 → 동기 path 부적합, 백그라운드 권장.

| 방식 | 콜드스타트 | 장당 | 자유도 | 한국어 |
|---|---|---|---|---|
| Satori/@vercel/og | <100ms | 100-500ms | flexbox만 | 서브셋 필수 |
| Sharp | ~50ms | 50-300ms/장 | 합성만 | OS폰트/SVG |
| Puppeteer | 5-15s | 1-10s | 풀CSS·JS | 자유 |

**권장 파이프라인**: 슬라이스 스키마(JSON) → JSX 트리 → 이미지 슬롯(Firefly 비동기 사전생성→Blob) → Satori→resvg→PNG → Sharp composite 860×Y 분할 5장 → 디렉터 UI 컨펌 → 다운로드.

## 4. 디자인 토큰 + 디자인 시스템 (브랜드 일관성)

디자인 토큰 = Jina Anne이 Salesforce Lightning(2014) 창안. Style Dictionary = Amazon Danny Banks(2017) 사실상 표준. W3C DTCG 표준화 중.

**3계층 토큰 스키마**: primitive(color/space/font 원시값) → semantic(text-headline/surface-accent/gutter) → component(usp-badge/section). Style Dictionary로 CSS Variables + Tailwind config + Satori inline style 동시 export.

**역할별 테마 토큰 세트**(Brad Frost 멀티브랜드 패턴): 꿀통(차분 네이비/그린), 트렌드(블랙/네온 하이콘트라스트), 니치(파스텔/세리프 강조), 레드오션(가격·비교 강조). primitive 공유 + semantic만 차등.

## 5. 모듈형 자동 조립 레이아웃 엔진 — 설계 패턴

**개념**: 헤드리스 CMS의 Slice/Modular Block/Builder.io 블록 = Page는 ordered list of Slices, 각 Slice는 타입·데이터·표시조건.

**Slice 카탈로그 12종**: hero_hook / painpoint_agitation / benefit_grid / usp_badges / lifestyle_scene(Firefly Composite) / comparison_table(레드오션·트렌드 필수) / social_proof / certification(상세영역만) / delivery_info(네이버 정책 대응) / faq / cta_block / brand_story.

**Slice 데이터 모델**: TypeScript discriminated union (type별 필드 분기).

**Rule-Based Composer** (8축 진단+전략역할+정체성키워드 입력):
```ts
function composePage(diag): Page {
  const slices = [];
  slices.push(heroFor(diag.role, diag.identity));                  // 항상
  if (['꿀통','니치'].includes(diag.role)) slices.push(painPoint(diag));
  if (diag.role === '레드오션') slices.push(comparison(diag));
  slices.push(uspBadges(diag, diag.role==='트렌드'?5:3));
  if (diag.score.aesthetic > 6) slices.push(lifestyle(diag));
  if (diag.score.trust < 5) slices.push(certification(diag));
  if (diag.reviewCount >= 10) slices.push(socialProof(diag));
  slices.push(deliveryInfo(diag), faq(diag), ctaBlock(diag));       // 마지막
  return { slices, theme: themeFor(diag.role) };
}
```

**경험적 매칭 룰**:
- 꿀통: 페인포인트→혜택→신뢰 비중↑, 가격비교 생략
- 니치: 감성 후킹(라이프스타일)→브랜드스토리→혜택, 비교없음
- 트렌드: 즉시성(오늘출발/한정)→USP다수→사회증거, 짧고 강하게
- 레드오션: 비교테이블→차별점→가격우위→리뷰양, 가장 길어도 됨

**슬라이스 모델 이점**: (a) 부분 재생성, (b) 모바일 LCP 개선, (c) 슬라이스 단위 A/B 테스트.

## 6. Human-in-the-Loop 디렉팅 워크플로우

**개입 지점(escalation)**:
1. 자동 통과: confidence ≥ 0.8 + 역할 명확 + 키워드 안정 → 1차 완성본, 셀러 컨펌만
2. 선택 제시: confidence 0.5-0.8 → 슬라이스 순서 후보 2-3개 비교카드
3. 필수 확인: 가격·인증마크·배송정보 = 규정 리스크 → 항상 셀러 확인 게이트
4. 반려/수정: 슬라이스 단위 "이 섹션만 다시", "톤 차분하게"

**컨펌 UI**: 좌측 모바일 360px 프리뷰 + 우측 슬라이스 패널(수정·재생성·삭제·이동). 자연어 대신 5-7개 토글("톤 차분/팝", "정보 늘리기/줄이기", "USP우선/리뷰우선"). 승인=단일버튼+분할JPG 다운로드. 변경시 새 버전, 이전은 archive.

**피드백 루프**: 셀러 "제거/이동" 액션을 (카테고리,역할,정체성) 차원 집계 → composer 룰 가중치 베이즈 업데이트. 셀러센터 CTR·전환율 매칭 → 데이터 기반 강화. 처음 100건 휴리스틱, 이후 보정.

## 7. 권장 최종 기술 스택

```
Next.js 14 App Router (Vercel)
1. 셀러 입력 UI (RSC + Server Actions)
2. 기존 엔진(진단·역할·정체성·카피·아트디렉터) 호출
3. Composer (rule engine, 순수함수, Node Functions)
4. Slice Renderer: Satori+resvg→슬라이스 PNG / Sharp→합성·분할 5장
5. 이미지 슬롯: Firefly Generate/Object Composite → Vercel Blob
6. 디렉터 UI: 모바일 프리뷰 + 슬라이스 패널
7. Style Dictionary build: 토큰→CSS vars+JSON
```

의존성: next 14, @vercel/og(Satori), sharp, @sparticuz/chromium-min(선택), style-dictionary, groq(기존), @vercel/blob. 폰트: Pretendard Variable woff2(SIL OFL).

**Firefly 비용**: 2025-02 CC에서 분리 독립 제품. 공식 가격 비공개(SudoMock ~$1,000+/월 추정). 컨슈머 Pro($19.99/월 4000크레딧) API 제한적. **실용 결론: 초기엔 Firefly 컨슈머 UI에서 이미지 미리 생성→자동조립 재사용(비용 0)→매출 도달 후 Services API/Bannerbear 본격화.**

## 8. 모바일 퍼스트 디자인 원칙 (한국 검증)

- 텍스트: 본문 16-18px, 헤드라인 28-36px(PC 1.5배), 슬라이스당 ≤100자. Pretendard 700/600/500 위계.
- 컬러·여백: 흰 배경 + 액센트 1색 + 흑/회색 텍스트. 슬라이스 간 48-64px. 대비 ≥4.5:1.
- 이미지: hero 1:1 또는 4:5, 라이프스타일은 Firefly Composite 누끼+배경합성, 모든 슬라이스 동일 860px폭.
- 섹션 순서: 후킹(5초)→페인포인트→기능/혜택→사용장면→사회증거(리뷰·인증)→FAQ→CTA.
- A/B 케이스(에이전시 자체보고, 통제실험 아님): 상단 "무료배송/오늘출발"=전환 1.8배, CTA강조+후기+인증=+15%. 단 대표이미지엔 텍스트 금지, 상세 내부만.

## 9. 한국어 폰트 처리

next/font/local로 Pretendard Variable woff2(weight '45 920' 지정 필수 — 미지정시 WebKit 굵기 오류). Satori엔 woff/ttf 변환(woff2 일부 글리프 버그) + 사용글자 서브셋(NotoSansKR-Hestia ~200KB)으로 500KB 통과. Pretendard 2024-04부터 범정부 UI 기본서체 채택.

## 10. 데이터 기반 매칭 — 점진 학습

- Phase 1(0-100건): 휴리스틱 룰만, if-else 분기
- Phase 2(100-1000건): 슬라이스조합×카테고리×역할 매트릭스에 전환율 EMA 누적, 기본룰+통계우수변형 함께 제안
- Phase 3(1000건+): Multi-armed bandit(Thompson sampling) 슬라이스 순열 자동 탐색

## 11. 한계 (Caveats)

1. "전환율 전환(2025-03)"·"CS 12h"는 블로그 종합, 공식 미확인. 공식 사실은 24시간 응답 의무 + 2026-01 굿서비스 추천 연동.
2. Firefly 정확 가격 비공개. 1인은 컨슈머 플랜 시작 안전.
3. Canva Autofill = Enterprise 한정 + Canva 종속. 1인 부적합.
4. Figma REST Images 엔드포인트 429 빈번. 대량 export 의존 금물.
5. Satori flexbox만(grid 미지원). 한국어 woff2 글리프 버그 → woff/ttf 폴백 보유.
6. **네이버 대표이미지 자동 텍스트·뱃지·외곽선 합성 절대 금물(2024-10-28 강화). "썸네일=누끼/단색배경+상품만, 텍스트·인증·홍보는 상세만" 코드 강제.**
7. 한국 전환율 케이스(1.8배,+15%)는 에이전시 자체보고, 통제실험 아님. 자기 데이터 재검증 필수.
8. HITL 학습은 1인 데이터량(월 수십~수백)에선 통계적 의미 약함. 초기 1년은 데이터 수집+휴리스틱. ML/RL은 이후.
9. 모바일 76-79%는 한국 전체 평균(국가데이터처), 스마트스토어 한정 아님. 단 산업평균 적용해도 안전.

---

## 부록 — 우리 시스템(꽃틔움 가든) 적용 매핑

| 연구 요소 | 우리 기존 자산 | 신규 필요 |
|---|---|---|
| Slice 카탈로그 12종 | section-composer.ts(B02/B06/B07/B09 텍스트) | 이미지 슬라이스 + Satori 컴포넌트 |
| Rule-Based Composer | role-engine.ts(꿀통/니치/트렌드/레드오션) + identity-extractor.ts | composePage 룰 엔진 |
| 역할별 테마 토큰 | art-director(prompt-dictionary) | Style Dictionary 토큰 4테마 |
| 이미지 슬롯 | art-director(Firefly 프롬프트) | Satori+Sharp 렌더러 + Firefly Composite |
| HITL 디렉터 UI | asset-status("당신의 손길 대기 중") | 모바일 프리뷰 + 슬라이스 패널 |
| 디자인 프리셋 | (신규) | 꽃틔움 디자인 프리셋 = 토큰 + 정책가드 + 슬라이스 룰 |

**핵심**: "마스터 PSD 3종"이라는 정적 개념을 폐기하고 "Slice 스키마 + Rule Composer + 디자인 토큰"의 동적 엔진으로 전환. 셀러는 1차 완성본을 컨펌/디렉팅하는 디렉터로 남는다.
