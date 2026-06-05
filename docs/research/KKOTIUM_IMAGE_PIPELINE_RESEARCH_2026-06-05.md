# 꽃틔움 가든(Kkotium Garden) 이미지 파이프라인 & MCP 오케스트레이션 아키텍처 리서치

> 저장: 2026-06-05 (Desktop 산출 리서치 전문 → Code 저장, #29b Python full-overwrite)
> 권위: 외부 리서치(Adobe/네이버/Bria/Canva/Figma 공식 문서 + 제3자 검증). 출처 신뢰도는 Caveats 참조.

## TL;DR
- **메인 대표컷 배경 생성만 반자동(수동)으로 남기고, 나머지(누끼·썸네일 합성·상세페이지·카피)는 전부 API로 자동화하는 하이브리드가 1인 셀러에게 정답이다.** Adobe Firefly Services API는 자체 셀프서브 요금제가 없고 엔터프라이즈 계약을 요구하므로(SudoMock 2026년 3월 검증 기준 "starts at $1,000/month"), 소규모 셀러에게는 비현실적이다. 누끼·배경생성·합성은 Bria AI(상업 무배상 제공) 또는 Sharp 자체 합성으로 합법·저비용 대체가 가능하다.
- **네이버 대표이미지는 2024년 10월 28일 강화된 기준 때문에 텍스트·가격·홍보문구·소품 혼입이 제재 대상이며, 공급사 원본 그대로 사용은 중복이미지·타사 브랜드 노출 위험이 크다.** 따라서 "본품 누끼 → 자체 배경 합성 → 깨끗한 단일 대표컷"이 라이선스·SEO 양면에서 최적이다.
- **MCP는 데스크톱(Claude Web) 작업 보조용으로 유지하되, 프로덕션 자동화는 웹앱 내부의 잡 큐(이미 존재하는 backdrop_jobs 패턴 확장)+라이선스 기반 도구 라우터로 구현하라.** 사람이 개입해야 하는 단계(메인컷 시안 선택, 발행 직전 검수)는 승인 게이트 큐로 명시적으로 분리한다.

## Key Findings

### 영역 1 — AI 이미지 생성/편집 도구의 상업 라이선스 및 자동화 가능 범위

**Adobe Firefly Services API의 진입 장벽 (정확한 사실관계 정정)**
프로젝트 컨텍스트에 기재된 "최소 50석/3년 계약"은 **공식 Adobe 문서가 아니라 Adobe 지원 커뮤니티 포럼의 비공식(비직원) 답변에서 나온 표현**으로, 공식 출처로 확인되지 않는다. 공식적으로 확인되는 사실은 다음과 같다:
- Firefly Services API는 **2025년 2월 12일부로 Creative Cloud와 분리된 독립 제품**이 되었다(SudoMock 2026년 3월 검증 및 Adobe Support Community: "Firefly API must be purchased separately (it became an independent product on February 12, 2025)"). 개인 셀프서브 가입 경로가 없으며 Adobe 엔터프라이즈/비즈니스 영업 계약을 통해서만 접근 가능하다.
- 제3자 추정치로는 실질 진입 비용이 **월 약 $1,000 수준, 영업 사이클 4~8주**로 보고된다(SudoMock 2026년 3월 검증: "Adobe Photoshop API (Firefly Services) starts at $1,000/month with per-operation credit costs" / "Firefly API requires an enterprise agreement starting at ~$1,000/month"). Adobe는 고정 API 단가를 공개하지 않으며 볼륨 협상 방식이다.
- **IP 무배상(indemnification)은 API 출력에도 적용된다.** Adobe 공식 법률 문서(Firefly Product Description, 2025년 9월 30일자)는 "Firefly APIs"를 Eligible Firefly Surface로 명시하며, "qualifying SKU/plan으로 Operations(API 호출 과금 단위)를 소비하고 Firefly Output을 다운로드"하는 경우를 Export Event로 정의한다. 단, **유료 적격 플랜에서만**, **Adobe 자체 모델(베타·파트너 모델 제외)**에 한정된다.
- Firefly의 강점: 학습 데이터가 Adobe Stock·라이선스·퍼블릭도메인 기반이라 상업 안전성이 업계 최고 수준이며, 상업 무배상을 제공할 수 있는 근거가 된다.

**결론:** 1인 셀러가 Firefly Services API를 프로덕션 자동화에 쓰는 것은 비현실적. 따라서 **메인컷 생성은 Firefly 웹 UI(소비자 구독)로 수동 생성하되, 그 외 편집·합성은 다른 API로 대체**하는 현재 구조가 맞다.

**브라우저 자동화 금지 약관 — 계정 리스크**
Adobe Generative AI User Guidelines는 "Using unauthorized automated or scripting processes (such as bulk or automated uploading of content through a script)"를 명시적으로 금지하며, 위반 시 계정 비활성화/접근 제한이 가능하다고 규정한다. 즉 **Firefly 웹 UI를 브라우저 자동화로 우회하는 것은 약관 위반이며 계정 정지 리스크**가 있으므로, 메인컷 생성 단계는 반드시 사람이 직접 수행하는 수동 단계로 유지해야 한다. (Canva·Figma도 Enterprise 미가입 상태에서 공식 API 우회를 시도하면 동일한 계정 리스크가 있으므로 공식 API 또는 수동 사용만 권장.)

**Adobe Photoshop API / Express API (Firefly Services 산하)**
- Remove Background는 Firefly Services 산하 Photoshop API의 `/v2/remove-background` 엔드포인트로 제공되며 비동기 잡 방식(잡 생성 → status 폴링)이다. **현재 누끼(Remove Background)는 generative credit을 소비하지 않는 0크레딧 작업**이지만, **API에 접근하려면 여전히 Firefly Services 엔터프라이즈 계약이 필요**하다. 즉 기술적으로는 자동화 가능하나 소규모 셀러 접근성은 막혀 있다.
- Photoshop API v1은 **2026년 7월 31일 EOL 예정**(Adobe Developer 공식 문서: "Photoshop API v1 will reach end of life on July 31, 2026 ... Migration to v2 is required"), v2로 마이그레이션 필요. v2는 UXP 스크립팅, Generative Fill/Expand 지원.
- 결론: Adobe 계열 편집 API는 "기술적으로 가능 / 소규모 셀러에겐 계약 장벽으로 사실상 불가."

**Canva Connect API**
- Autofill(브랜드 템플릿 자동 채우기) 및 Brand Template API는 **통합 개발자와 각 사용자 모두 Canva Enterprise 조직 멤버여야** 사용 가능하다("To use this API, your integration must act on behalf of a user that's a member of a Canva Enterprise organization"). 이미지/텍스트 필드를 데이터로 채우는 비동기 잡 방식(POST /autofills → GET /autofills/{jobId} 폴링).
- 이미지 자산은 사전 업로드 필요, 외부 이미지 URL 직접 autofill 불가. 2025년 9월부터 브랜드 템플릿 ID 신규 포맷으로 마이그레이션 필요(구 ID는 6개월간 호환).
- 결론: 1인 셀러에게 Canva Enterprise는 과한 비용. **Autofill API는 사실상 불가**, 단 Canva 자체(수동) 또는 MCP 커넥터로 데스크톱에서 보조 사용은 가능.

**Figma API / Plugin API**
- REST Variables API는 **Enterprise 조직의 Full seat에서만** 사용 가능(게스트 불가). 디자인 자동 채우기를 REST만으로 풀 자동화하기엔 제약이 크다.
- Plugin API로는 노드 조작·텍스트/이미지 교체·`setBoundVariable` 변수 바인딩이 가능하나, 플러그인은 Figma 에디터(데스크톱) 내 실행 환경이 필요해 서버리스 무인 자동화에는 부적합.
- 동적 이미지 생성은 Figma 디자인을 템플릿으로 쓰는 서드파티(예: Orshot, Dynogee)가 REST GET으로 텍스트/이미지 파라미터를 받아 렌더하는 방식 존재(Dynogee는 개인·저볼륨 무료 제공).
- 결론: Figma는 **디자인 템플릿 제작(수동)+서드파티 렌더링 API**라면 반자동 가능. 순수 무인 자동화는 비권장.

**소규모 셀러용 합법·경제적 대안 API**
- **Bria AI** — 학습 데이터를 라이선스 데이터로만 학습하며, **모든 출력에 IP 무배상 제공**(상업 안전). WaveSpeedAI 공식 블로그: "BRIA AI has partnered with over 30 data providers including Getty Images, Envato, Alamy, Freepik, and Depositphotos." Hugging Face 모델카드(briaai/RMBG-2.0): "trained with over 15,000 high-quality, high-resolution, manually labeled (pixel-wise accuracy), fully licensed images." API-first. 누끼(RMBG 2.0)는 fal.ai 공식 기준 **"Your request will cost $0.018 per generation"**, 배경 교체·Product Shot는 각 $0.023(fal 문서: "RMBG 2.0 ($0.018) ... 22% more cost-effective"). fal.ai/Replicate/Segmind/WaveSpeedAI 등 호스팅 경유 단건 호출 가능 → 셀프서브로 접근 용이. **Firefly의 현실적 상업-안전 대체재.**
- **Recraft V3** — 유료 플랜에서 생성물 완전 소유권+상업권, 벡터(SVG) 네이티브 생성 강점. 유료 $10/월~(1,000 크레딧). 무료 플랜은 공개·상업 라이선스 없음(생성물은 Recraft 소유).
- **Ideogram 3** — 텍스트 렌더링(이미지 내 한글/영문) 강점, 유료 플랜 생성물 소유권 인정·상업 사용 가능("Ideogram does not claim ownership of your generated outputs"), API 별도 과금(약 $0.03~0.09/이미지, 기본 in-flight 10건 레이트리밋). 단 SOC2/ISO 인증·명시적 indemnification은 없음.
- **Stable Diffusion/Flux 등** — 호스팅 아그리게이터(fal, Replicate, Together) 경유 $0.008~0.04/이미지로 저렴하나, 학습데이터 소송 리스크로 상업 무배상은 미제공.

### 영역 2 — 네이버 스마트스토어 이미지 SEO/전환율 베스트 프랙티스 (2025-2026)

**대표이미지(썸네일) 규격·요건**
- 최소 160×160px, **권장 가로 1,300px 이상**, 1:1 정방형 권장, 최대 20MB, JPG/JPEG/GIF/PNG.
- 네이버는 선명한 고해상도, **상품만 정직하게 드러내는 썸네일**을 검색 노출에 유리한 요건으로 명시. 활용 장면 연출 이미지를 추가 컷으로 더하면 전환율 제고에 도움.
- **2024년 10월 28일부터 대표이미지 기준 강화** — 네이버쇼핑 판매자센터 공지 원문: "기준 위반 시 네이버쇼핑 미노출 등 상품 제재 및 클린 프로그램 적용 / 적용 일정 2024년 10월 28일 (월)." 금지 항목:
  - 옵션으로만 구매 가능한 상품 이미지, 판매상품과 무관한 이미지
  - 할인율·혜택가·카드할인 등 **가격 정보 텍스트**
  - 배송비·배송방법·설치비 등 배송 정보 텍스트
  - 무료배송·원산지·A/S·KC인증 등 텍스트 삽입
  - 홍보성 문구("네이버쇼핑 1위" 등), 주목 효과용 외곽선·도형·인위적 마크
  - 본품과 구별 안 되는 소품 혼입, 저품질(저화질) 이미지

**전환율·검색 알고리즘 (네이버플러스 스토어 개편)**
- 네이버 쇼핑은 **네이버플러스 스토어로 개편**, 알고리즘은 적합도·인기도·신뢰도 3축. 2025년 3월부터 **광고 노출이 클릭률 중심에서 전환율 중심으로 변경**됨 → 상세페이지 품질·리뷰·결제 전환이 더 중요해짐. (신뢰도 축은 충족 시 가점이 아니라 위반 시 패널티 성격; 상품명 SEO·네이버쇼핑 패널티가 핵심 지표.)
- 상세페이지: 가로 860px 이상 권장(채널 확장 고려), 모바일 우선(글자 1.5배 크게), 세로 3,000px 초과 시 분할 권장. 한 장당 최대 5,000px/20MB.
- 전환율 높이는 구성(현장 셀러 공식): 판매자 정보·신뢰 증거(인증마크) → 문제 제시(페인포인트 공감) → 타겟 명확화 → 핵심 이득 → 후기/포토리뷰 → 혜택/CTA 순. "예쁜 것보다 해결책"이 핵심. 키워드 밀도는 본문의 약 1% 내외 권장.

**공급사 원본 이미지를 그대로 쓰면 안 되는 이유**
- 동일 이미지가 여러 셀러에 퍼지면 **카탈로그 매칭·가격비교로 묶일 위험**, 타사 브랜드/워터마크 노출, 저품질 판정 가능. 차별화 가공(누끼+자체 배경+자체 레이아웃)이 SEO·신뢰도·법적 안전 모두에 유리. 드롭쉬핑(도매매/도매꾹)에서 받은 원본을 그대로 올리면 가격비교에 묶여 마진이 무너지므로, 본 프로젝트의 누끼+합성 파이프라인은 차별화 측면에서도 정당하다.

**옵션 상품(향 3종 등) 대표이미지 전략**
- 네이버 규정상 **대표이미지에 옵션으로만 구매 가능한 상품을 넣으면 제재** → "여러 향을 한 컷에 다 보여주는 라인업 컷"을 대표이미지로 쓰면 위험. 기본가로 구매 가능한 단일 본품이 명확히 보여야 함(소품과 본품이 구별되어야 함).
- 권장: **대표이미지 = 깨끗한 단일 대표 향(본품) 컷**, 라인업/3종 비교 컷은 **추가 이미지(2~10번)·상세페이지**에 배치. 이는 규정 안전+클릭 시 인지 명확성(0.1초 안에 무엇인지 인지)+상세에서 옵션 어필을 동시에 만족. CTR 단독 최적화보다 전환율 중심 개편에 맞춰 "명확한 단일 컷"이 안전한 선택이다.

### 영역 3 — 반자동(Human-in-the-loop) 워크플로우 UX 설계

**핵심 패턴: 신뢰도 기반 3-레인 라우팅(green/amber/red)**
- Green(저위험·고신뢰): 자동 통과+샘플 검수. 예) 누끼 결과가 임계 신뢰도 이상 → 자동 진행.
- Amber(중위험·불확실): 사람 검수 큐로 라우팅. 예) 누끼 엣지 품질 애매, VLM 분류 신뢰도 낮음, 한글 카피.
- Red(고위험): 반드시 사람 승인. 예) 메인 대표컷(상업 무배상 필요·브랜드 인상 결정), 발행 직전 최종 검수.
- 사람은 "모든 산출물 QA"가 아니라 **엣지/고위험만** 처리해야 큐가 병목(ticket queue nightmare)이 안 된다.

**"AI 생성 → 사람 검수/선택/승인 → 다음 단계 자동" 흐름**
- 승인 대기열(approval queue), 시안 비교 선택(N개 후보 썸네일 나란히 비교 후 1택), 단계별 상태 표시(생성중/검수대기/승인됨/발행됨).
- 비동기 인터럽트 패턴(LangGraph `interrupt` 등): 워크플로우를 특정 노드에서 멈추고(draft 생성) 사람의 Approve/Request Changes/Reject를 기다린 뒤 재개. 승인은 몇 시간~며칠 걸려도 상태가 유지되어야 함(이벤트 드리븐+잡 토큰; AWS Step Functions의 `waitForTaskToken` 패턴과 동형).

**외부 도구(MCP/데스크톱)↔웹앱 핸드오프**
- 딥링크(웹→데스크톱 작업 안내), 작업 핸드오프(컨텍스트 페이로드 전달), **클립보드 브리지**(Firefly 웹 생성 결과 다운로드 후 웹앱에 붙여넣기/드래그), **상태 폴링**(잡 테이블을 주기적으로 확인해 자산 도착 감지). 데스크톱↔웹 핸드오프가 매끄러우면 신뢰·이탈 방지에 직접 기여한다.
- 발행 직전 검수 대시보드(publish-readiness): 대표이미지·상세·옵션·카피·MCP 연결 상태를 한 화면에 체크리스트로. 네이버 "상품정보 검색품질 체크"처럼 빨간불/초록불로 표시하여 비개발자 파트너도 직관적으로 발행 가부를 판단.

### 영역 4 — MCP 기반 도구 오케스트레이션 웹앱 통합 아키텍처

**오케스트레이션 설계**
- MCP는 "도구/리소스 레이어"를 표준화하는 통합 계층이지 오케스트레이터 두뇌가 아니다("MCP is an integration layer, not an 'agent brain'"). 웹앱은 **작업 유형별 라우터(오케스트레이터)**를 두고, 각 도구를 표준 인터페이스로 호출.
- 패턴: 슈퍼바이저(라우터)가 작업 유형(메인컷/누끼/합성/상세/카피)을 판별 → 적합 도구로 디스패치 → 결과 수집 → 다음 단계. N×M 통합 문제를 N+M으로 축소(각 도구는 MCP만, 각 에이전트는 MCP만 알면 됨).
- 프로덕션 자동화는 **MCP(데스크톱 대화형)에 의존하지 말고**, 웹앱 서버에서 직접 REST API(Bria, Sharp 등)를 호출하는 결정론적 잡 실행이 안정적(비결정성·핸드오프 실패 위험 회피). MCP는 1인 셀러의 데스크톱 보조 작업(Claude Web에서 시안 탐색·디자인 보조)에 한정.

**잡 큐/잡 테이블 기반 추적**
- 이미 존재하는 `backdrop_jobs` 테이블을 **범용 `asset_jobs`로 확장**: job_type(main_cut/cutout/thumbnail/detail/copy), status(queued/running/awaiting_review/approved/published/failed), tool_used, license_tier, input_refs, output_refs, error, reviewer_decision.
- Supabase + Vercel 환경에서 비동기 잡: 외부 API(Bria 등 비동기)는 잡 생성 후 폴링/웹훅으로 상태 갱신(Vercel 서버리스의 장시간 실행 한계 고려 → 큐+폴링이 적합). 고정 자산명(cutout.png, backdrop-{skeletonId}.png) 규약 유지하여 asset-source-resolver 호환.

**라이선스 안전성 기반 도구 자동 선택 라우팅**
- **메인 대표컷 배경 생성** (상업 무배상 필요): Firefly 웹 UI(수동) 또는 Bria AI(API, 무배상) → red 레인(사람 승인).
- **본품 누끼**: Bria RMBG 2.0 API($0.018) 또는 Photoshop API(계약 시) → green/amber.
- **썸네일 레이아웃 합성**: 자체 Sharp/Canvas(라이선스 무관, 비용 0) → green 자동.
- **상세페이지 섹션 합성**: 자체 Sharp + 템플릿 → green 자동.
- **한글 카피**: LLM(Claude 등) 생성 → amber(사람 검수).

## Details

### 도구별 자동화 가능 여부 구분표

| 도구 | 자동화 가능 | 반자동(수동개입) | 불가/비권장 | 비고 |
|---|---|---|---|---|
| Adobe Firefly 웹 UI(소비자) | | O 메인컷 생성 | | 브라우저 자동화는 Adobe Gen AI 가이드라인 위반(계정정지 리스크) |
| Adobe Firefly Services API | | | O (엔터프라이즈 계약, SudoMock "$1,000/month"부터) | 1인 셀러 비현실적; 단 API 출력도 무배상 적용 |
| Adobe Photoshop API(누끼) | O 기술적 | | (계약 장벽으로 사실상 불가) | 누끼 0크레딧, but 계약 필요; v1 2026-07-31 EOL |
| Canva Connect Autofill | | | O (Enterprise 필요) | MCP로 수동 보조만 |
| Figma REST/Plugin | | O 템플릿+서드파티 렌더 | (순수 무인 자동화) | Variables REST는 Enterprise Full seat |
| Bria AI API | O 누끼·배경·합성 | | | 상업 무배상, 셀프서브(fal/Replicate 경유) |
| Recraft/Ideogram API | O 생성·벡터·텍스트 | | | 유료 소유권 O, 강한 indemnity는 Bria만 |
| 자체 Sharp/Canvas | O 레이아웃 합성 | | | 비용 0, 라이선스 무관 |

### 작업 유형별 최적 도구 매핑 권고

| 작업 유형 | 1순위 | 2순위(폴백) | 레인 | 단가 기준 |
|---|---|---|---|---|
| 메인 대표컷 배경 생성 | Bria AI(API, 무배상) | Firefly 웹 UI(수동) | red(승인) | Bria $0.023(Product Shot) |
| 본품 누끼 | Bria RMBG 2.0 | 자체/오픈소스 | green/amber | $0.018/건 |
| 썸네일 레이아웃 합성 | 자체 Sharp | — | green | $0 |
| 상세페이지 섹션 | 자체 Sharp+템플릿 | Canva(수동) | green | $0 |
| 한글 카피 | LLM(Claude) | 사람 작성 | amber(검수) | LLM 토큰 비용 |

## Recommendations

**1단계 (즉시):** 메인컷 배경 생성을 Firefly 웹 UI 수동 유지하되, **Bria AI API를 PoC로 도입**해 누끼·배경 합성을 셀프서브 자동화로 전환. fal.ai 또는 Replicate 경유로 시작(계정·계약 부담 최소). 비용 감각: 누끼 $0.018/건이면 월 수백 건도 수만 원대. Bria는 상업 무배상 학습데이터(Getty/Alamy/Envato 등 30+ 제공사)라 드롭쉬핑 상업 사용에 법적으로 안전.

**2단계:** `backdrop_jobs`를 `asset_jobs`로 일반화하고, **라이선스 티어 컬럼+3-레인 라우터**를 구현. 메인컷은 red(승인 게이트), 누끼·합성은 green 자동. 비동기 외부 API는 잡 생성+폴링/웹훅으로 추적, 고정 자산명 규약 유지.

**3단계:** **발행 직전 publish-readiness 대시보드** 구축 — 대표이미지 규정 자동 점검(텍스트/소품/가격문구 감지 VLM), 옵션 대표컷 단일성 검증, 카피 검수, MCP 연결 상태 표시. 비개발자 파트너용 빨간불/초록불 체크리스트.

**4단계:** 옵션 상품은 **단일 본품 대표컷 + 라인업은 추가이미지/상세**로 강제하는 템플릿 규약 적용. 네이버 2024-10-28 기준 위반 자동 차단.

**의사결정 임계값(트리거):**
- Bria 월 비용이 $50 초과하고 볼륨이 지속 증가 → Photoshop API 계약 또는 자체(오픈소스 RMBG self-host) 모델 검토.
- 네이버 제재(미노출) 발생 → 대표이미지 자동 점검 룰 강화.
- 메인컷 수동 생성이 병목(주 50건 초과) → Firefly Services 계약 ROI 재평가 또는 Bria 메인컷(Product Shot API) 완전 이관으로 수동 단계 제거.
- 네이버 전환율 중심 알고리즘 하에서 특정 상품 CVR 저조 → 상세페이지 구성(페인포인트·후기·CTA) A/B 테스트.

## Caveats
- Firefly Services "50석/3년" 최소 조건은 **공식 미확인(Adobe 지원 커뮤니티 포럼 비공식 발언)**; 실질 비용 월 ~$1,000은 제3자(SudoMock, Toolradar) 추정치로 Adobe 영업 확인 필요. aitoolsdevpro 등 일부는 "pay-as-you-go ~$0.02/image"를 주장하나 다수 증거와 배치되어 신뢰도 낮음.
- 누끼 0크레딧 정책은 Adobe 정책 변경 가능성 있음(현재는 픽셀 생성 없는 작업이라 무료).
- 네이버 알고리즘·대표이미지 기준은 자주 변경되므로 스마트스토어 판매자센터 공식 공지 모니터링 필수.
- Bria indemnification은 엔터프라이즈 계약 조건에 명시되며, fal/Replicate 등 호스팅 아그리게이터 경유 시 라이선스가 "Recraft/Bria 원 라이선스를 따른다"고만 표기되는 경우가 있어 **상업 무배상 적용 범위는 Bria 직접 계약 또는 호스팅사 약관으로 재확인** 권장.
- 한국 셀러 커뮤니티 자료(블로그·카페)는 출처 신뢰도가 일정치 않으므로 네이버 공식 공지로 교차검증 권장. 전환율 7단계 공식 등은 개별 셀러 경험담으로, 일반화 전 자체 A/B 검증 필요.
- Canva·Figma의 Enterprise 요구는 향후 정책 변화 가능성이 있으나 2025-2026 기준 1인 셀러 진입 장벽은 확실.
