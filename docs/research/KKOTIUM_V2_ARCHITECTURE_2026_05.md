# 꽃틔움 가든 아키텍처 v2.0

**Gemini 제거 + Claude Pro Max + MCP 통합 전략**

> 본 문서는 2026-05-12 사용자 제공 리서치 PDF "꽃틔움 가든 아키텍처 v2.0"의 영구 참조본입니다. 본 앱의 향후 모든 이미지 생성·디자인 자동화·런타임 보안 의사결정의 단일 근거가 됩니다.
> 원본 PDF: `/Users/jyekkot/Desktop/2606512-꽃틔움 가든 아키텍처 v2.0.pdf`
> 다이어그램: `/Users/jyekkot/Downloads/kkotium_v2_architecture_2phase.svg`

---

## 0. 결정적 인식 — Gemini 제거는 손실이 아니라 청소

Vercel 환경변수 노출 위험은 표면이 여러 곳에 존재:
- `.env.backup.*` 같은 백업 파일이 git에 추적되어 GitHub secret scanning에 감지
- Vercel build logs에 환경변수 echo 가능성 (`console.log(process.env)` 디버그 실수)
- Edge Function 에러 로그가 환경변수 일부를 노출
- Source map이 production에 포함되면 클라이언트 번들에서 키 추적 가능
- `NEXT_PUBLIC_` prefix 실수로 client bundle 포함
- API route가 `process.env`를 echo back하는 디버그 코드
- Vercel preview deployment URL이 검색엔진 인덱싱
- 외부 모니터링 도구 (Sentry, LogRocket) 가 env 자동 캡처

Groq는 키 폐기 후 즉시 새 키 발급이 가능하지만, Google은 폐기 시 프로젝트 격리·결제 정지까지 가는 경우가 많아 사고 비용이 비대칭적으로 큼. **즉 Gemini를 자동화 파이프라인에 두면 매출이 늘수록 사고 확률이 비례 증가**.

### 새 원칙

> **"Vercel 런타임 = 정적 자산 + 안전한 서버 연산만"**

| 작업 종류 | Vercel 런타임 허용? | 적용 |
|---|---|---|
| 이미지 **생성** (create) | 불가 | Claude Web 세션에서 1회성으로 생성 → 정적 자산화 |
| 이미지 **변환** (transform) | 허용 | Cloudinary URL 기반, 키 클라이언트 노출 없음 |
| 이미지 **합성** (composite) | 허용 | Sharp 라이브러리, 로컬 연산 |
| 텍스트 **생성** (LLM) | 허용 | Groq, 검증된 회전 정책 |

---

## 1. 2-Phase 아키텍처

### Phase 1: Creative Phase (Claude Web Pro Max)

- **빈도**: 신규 카테고리 진입 시, 시즌별, A급 상품 단건
- **출력**: 정적 자산 (PSD/PNG/SVG/JSON 템플릿)
- **API 키 노출 위험**: 0 (모두 Claude.ai 세션 내부에서 처리)

### Phase 2: Production Runtime (Vercel)

- **빈도**: 신상품 등록 시 자동, 일 10~100건
- **입력**: Phase 1 정적 자산 + 도매꾹 실시간 상품 데이터
- **API 키 노출 위험**: Groq만 사용

---

## 2. Claude Pro Max + MCP 자원 활용 맵

| 자원 | Creative Phase 역할 | 사용 빈도 | 대체 가능성 |
|---|---|---|---|
| **Adobe for Creativity MCP** | Express 템플릿 검색·텍스트 채움 (`fill_text`), Firefly Boards 무드보드, 배경 색 변경, Lightroom/Stock 자산 검색 | A급 단건 + 월 1~2회 템플릿 갱신 | Adobe CC 데스크톱 앱 (수동) |
| **Canva MCP** | 인스타·페이스북·블로그용 빠른 디자인, IR 자료, 브랜드 키트 적용 | 주 2~3회 | 직접 Canva 웹 |
| **Claude Artifacts (Pro Max)** | 인터랙티브 UI 프로토타입, 상세페이지 미리보기, 마진 계산기, 분류 시뮬레이터, SEO 점수 위젯 | 상시 (개발 보조) | Figma + Storybook |
| **Mermaid Chart MCP** | 아키텍처 다이어그램 (PROGRESS.md용) | 문서화 시 | 손그림 |
| **Figma MCP** | (선택) 디자인 시스템 구축 시 | 빅파워 이후 | 직접 작업 |
| **Vercel MCP** | 배포 상태, 환경변수, 로그 점검 | DevOps 상시 | Vercel 대시보드 |
| **Supabase MCP** | 마이그레이션, 스키마 변경, RLS, 쿼리 검증 | DB 변경 시 | 직접 SQL Editor |
| **Google Drive / Gmail MCP** | 도매업체 카탈로그·견적·메일 자동 분류 | 주 단위 소싱 | 수동 |
| **PlayMCP (네이버)** | 데이터랩 트렌드, 쇼핑 카테고리 코드, 카페·블로그 후기 분석 | A급 평가 시 | 직접 데이터랩 |
| **PDF Services (Adobe)** | 상품 매뉴얼·스펙시트·견적서 PDF 자동 생성 | 월 단위 | 수동 InDesign |

---

## 3. 수정된 3-Tier 시스템 (Gemini 제거)

### A급 — 디자이너 풀 수동 + Adobe MCP 협업 (상품당 25~40분)

**Claude Web 세션 워크플로우**:
1. Claude에 도매꾹 상품 데이터 + 원본 이미지 전달
2. PlayMCP `NaverSearch-datalab_shopping_category` 로 카테고리 트렌드 분석
3. Adobe `create_firefly_board` 로 무드보드 생성 (Firefly Web 2,000 credit 일부 소비)
4. Adobe `search_design` 으로 Express 템플릿 후보 추천
5. Adobe `fill_text` 로 선택 템플릿에 상품 데이터 자동 입력
6. 결과를 디자이너가 Photoshop에서 픽업 → Generative Fill + Harmonize(2025 MAX) 로 마무리
7. Lightroom 마스터 프리셋으로 색보정 + 4종 익스포트
8. 완성 JPG를 Supabase Storage에 정적 자산으로 업로드
9. DB의 product 레코드에 `static_asset_url` 연결

**핵심**: Adobe MCP는 **Claude 세션 내부에서만 호출**되므로 Vercel에 어떤 API 키도 노출되지 않습니다.

### B급 — Photoshop Variables 양산 + Claude Artifacts 검수 (상품당 6~10분)

**Creative Phase (월 1회 템플릿 갱신)**:
- Claude 세션에서 Adobe MCP `search_design` 으로 5섹션 마스터 후보 검색
- Photoshop에서 Variables 정의 (Text/Pixel/Visibility)
- PSD 마스터를 Supabase Storage에 저장

**Production Runtime (상품마다)**:
1. 도매꾹 API → Supabase 저장 (Vercel cron)
2. Cloudinary `e_background_removal` URL 변환
3. CSV 자동 생성 (상품명·가격·옵션 → Variables 매핑)
4. 디자이너가 로컬에서 PSD 열고 Data Sets > Import → 일괄 익스포트 (1상품 30초)
5. Sharp 로 5섹션 단일 JPG 합성 (Vercel Edge Function)
6. Groq Llama로 SEO 카피 + 다크패턴 정규식 필터
7. Claude Artifacts 검수 위젯(아래 4번) 또는 본 앱 검수 UI에서 PC/모바일 미리보기 후 승인
8. 네이버 커머스 API 등록

**Gemini 빈자리 채움**: 라이프스타일/사용씬 컷은 Adobe MCP `asset_search` 로 Adobe Stock 또는 Lightroom 라이브러리에서 사전 큐레이션 → 정적 자산화. 무료 stock(Pixabay, Unsplash) 보조 활용.

### C급 — 완전 자동 (상품당 2~3분)

**Production Runtime만**:
1. 도매꾹 API → Supabase 저장
2. Cloudinary 누끼 + 흰 배경 패딩
3. Sharp 로 사전 제작 5섹션 마스터 PNG 위에 상품 이미지·텍스트 SVG 오버레이 합성
4. 라이프스타일 컷은 **카테고리별 사전 큐레이션 stock 라이브러리에서 무작위 선택**
5. Groq Llama로 카피 자동 생성 + 다크패턴 필터
6. 자동 등록, 24시간 노출 모니터링 후 부진 시 B급 재처리 큐로 자동 이동

**비용**: Cloudinary $0.005 + Sharp 무료 + Groq 무료 = 약 **$0.005/상품** (Gemini $0.02 제거로 75% 절감)

---

## 4. Claude Artifacts 활용 케이스 (꽃틔움 가든 앱 개발 보조)

Pro Max의 높은 Artifacts 한도를 활용해 개발 중 상시 보조 도구로 사용:

### 4.1 상세페이지 미리보기 위젯
- 도매꾹 상품 JSON + 카피 텍스트 입력 → 5섹션 합성 결과 PC/모바일 토글 프리뷰
- React Artifact로 구현, Sharp 출력물과 시각적으로 동일하게 보이도록 CSS 조정
- **목적**: 디자이너가 코드 빌드 없이 카피·레이아웃 검증

### 4.2 A/B/C 분류 시뮬레이터
- 마진율·경쟁도·옵션 수·트렌드 점수 슬라이더
- 실시간 점수 산출 + 등급 표시 + 예상 처리 시간/비용
- **목적**: 분류 알고리즘 임계값 튜닝

### 4.3 마진·수수료 계산기
- 도매가·예상 판매가 입력 → 네이버 수수료 2.73% + 네이버페이 3.63~3.74% + 반품안심케어 카테고리별 자동 차감 → 실 마진 표시
- 새싹/파워/빅파워 등급별 수수료 변동 반영
- **목적**: 단가 결정 즉시 ROI 검증

### 4.4 SEO 점수 위젯
- 상품명 입력 → 글자수, 키워드 밀도, 중복 단어, 특수문자, 금지어 자동 검증
- 0-100 점수 + 빨강/노랑/초록 표시
- **목적**: 등록 전 신뢰도 페널티 사전 회피

### 4.5 일괄 처리 진행 모니터 (개발 단계용)
- 폴링으로 Supabase products 테이블 상태 변화 시각화
- 칸반 컬럼별 카드 카운터, 처리 시간 통계
- **목적**: 개발 중 파이프라인 디버깅

### 4.6 디자인 토큰 시안 패널
- 색상·폰트·간격 토큰을 슬라이더로 조정 → 5섹션 미리보기 실시간 반영
- export to Tailwind config 버튼
- **목적**: 디자인 시스템 단일 소스 of truth

---

## 5. 비용 재계산 (Gemini 제거 후)

월 100상품 등록 가정:

| 항목 | v1 (Gemini 포함) | v2 (Gemini 제거) | 절감 |
|---|---|---|---|
| Cloudinary | $0 (Free 25 credits) | $0 (Free 유지) | - |
| **Gemini Imagen 4 Fast** | $1.2 (60건×$0.02) | **$0** | $1.2 |
| Groq | $0 (무료) | $0 | - |
| Adobe CC (기존) | $25/월 | $25/월 | - |
| Vercel Hobby | $0 | $0 | - |
| Supabase Free | $0 | $0 | - |
| Claude Pro Max (기존) | $100/월 | $100/월 | - |
| **상품당 변동비** | **약 ₩30** | **약 ₩7** | **77% 절감** |

추가로 Gemini 자동 폐기 사고 처리 시간(평균 1-2시간/회) 0회 절감.

---

## 6. Adobe Stock vs 무료 Stock 큐레이션 (Gemini 라이프스타일 컷 대체)

| 옵션 | 비용 | 품질 | 다양성 | 한국 상품 적합도 |
|---|---|---|---|---|
| Adobe Stock (Adobe MCP `asset_search` StockAsset) | 사용자 자산 등급 | 매우 높음 | 매우 높음 | 중간 (서양 모델 위주) |
| Adobe Stock Free 카테고리 (`pricing: "free"`) | 0 | 높음 | 중간 | 중간 |
| Lightroom 라이브러리 (`asset_search` LightroomAsset) | 0 | 자체 촬영 | 한정적 | **매우 높음** |
| Unsplash / Pexels (외부) | 0 | 높음 | 매우 높음 | 중간 |
| 직접 촬영 + Lightroom 보정 | 시간 비용 | 최고 | 한정적 | **매우 높음** |

### 권장 운영

- 카테고리별 라이프스타일 컷을 월초에 **50-100장 일괄 큐레이션**
- Supabase Storage에 `lifestyle/{category}/{tag}/{filename}.jpg` 구조로 저장
- 런타임에 카테고리·태그 매칭으로 무작위 선택, 동일 상품 30일간 같은 컷 재사용 방지

---

## 7. 수정된 7일 액션 플랜

### Day 1 — Claude 세션에서 Adobe MCP 탐색 + 정적 자산 라이브러리 초기 구축
- Adobe `search_design` 으로 꽃·리빙·식품 카테고리별 Express 템플릿 5종 후보 수집
- `create_firefly_board` 로 카테고리별 무드보드 1개씩 생성 (Firefly Web credit 활용)
- Lightroom에서 보유 사진 50장 골라 카테고리 태깅
- Supabase Storage 버킷 구조 설계: `templates/`, `lifestyle/`, `branding/`, `psd-masters/`

### Day 2 — Photoshop 마스터 PSD + Variables 정의
- 5섹션 마스터 PSD 제작 (가로 860px 통일)
- 각 텍스트/이미지 레이어 Variables 정의 (Text/Pixel/Visibility)
- 테스트 CSV 1개로 5상품 일괄 익스포트 검증

### Day 3 — Lightroom 마스터 프리셋 + 카테고리 분기
- 카테고리별 5-7개 프리셋 (꽃/리빙/패션/식품/잡화)
- 익스포트 프리셋: 860px-JPG-q90, 1080×1080 IG, 1080×1920 Story, 300px 썸네일

### Day 4 — Vercel 런타임 파이프라인 핵심 코드
- `src/lib/image/cloudinary.ts` — 누끼 + 패딩 + 업스케일 URL 빌더
- `src/lib/image/sharp-composite.ts` — 5섹션 합성 함수 (마스터 PNG + 동적 SVG 오버레이)
- `src/lib/image/lifestyle-picker.ts` — 카테고리/태그 기반 라이프스타일 컷 선택기 (Supabase Storage 인덱스 활용)
- Gemini 의존성 코드 전체 제거 + `.env.local`에서 `GEMINI_*` 변수 제거 + Vercel 환경변수에서 제거
- `npx tsc --noEmit` 으로 타입 에러 0 확인

### Day 5 — Groq 카피라이팅 + 다크패턴 필터 강화
- Groq Llama-3.1-8b-instant 프롬프트 작성 (상품명 25-35자, 특장점 3개, FAQ 5개)
- 정규식 필터 모듈: 다크패턴 6유형 + 신뢰도 페널티 표현
- 단위가격 의무 입력(2026-02-24 시행) 자동 계산 로직

### Day 6 — Claude Artifacts 검수 위젯 + 분류 알고리즘
- A/B/C 점수 산출: Groq + PlayMCP 데이터랩 트렌드 보조 점수
- 검수용 Claude Artifact (4.1 + 4.4): 디자이너가 Claude 세션 내에서 카피 검증 가능
- 본 앱의 검수 UI는 Next.js로 별도 구현 (Artifact는 임시 보조)

### Day 7 — 네이버 커머스 API 연동 + 첫 C급 일괄 등록
- 등록 함수: tier별 분기
- C급 10개 자동 등록 → 24시간 노출 데이터 모니터링
- Vercel MCP로 배포·로그 모니터링 셋업

### 일주일 후 KPI
- 정적 자산 라이브러리: 카테고리별 lifestyle 50장+, 템플릿 5종 확보
- 자동화 end-to-end 작동: 도매꾹 → DB → C급 자동 등록
- API 키 노출 위험 자산: Gemini 0건 (전체 제거 확인)

---

## 8. Vercel 환경변수 보안 체크리스트 (Gemini 사고 재발 방지)

코드 작업 시 매번 적용해야 할 규칙:

| 항목 | 규칙 |
|---|---|
| `.gitignore` | `.env*` 와일드카드 + `!.env.example` 예외만 |
| 백업 파일 | `.env.backup.*` 패턴 명시적 차단 |
| 환경변수 접근 | `process.env.X` 만 사용, 절대 echo back 안 함 |
| `NEXT_PUBLIC_` prefix | 진짜 클라이언트 노출 OK인 값만 (URL, public ID 등) |
| 로그 | `console.log(env.X_KEY)` 금지 — Vercel logs에 잔존 |
| pre-commit hook | `git-secrets` 또는 `gitleaks` 도입 검토 |
| API route 디버그 | env 전체를 응답에 echo하는 코드 절대 금지 |
| Source map | production에서 비활성화 (Next.js `productionBrowserSourceMaps: false`) |
| 모니터링 도구 | Sentry 등이 env 자동 캡처 안 하도록 scrub 설정 |
| Preview deployment | basic auth로 보호 또는 검색엔진 차단 헤더 |

---

## 9. Caveats / 주의사항

### Adobe for Creativity MCP의 한계
- **Claude 세션 내부에서만 호출 가능**. 자동화 cron으로 트리거할 수 없음.
- 따라서 "월 1회 템플릿 갱신, A급 단건 작업" 같은 디자이너 인터랙티브 워크에만 적용.
- 출력물은 반드시 **정적 자산으로 추출해 Supabase Storage에 저장**해야 Vercel에서 활용 가능.

### Canva MCP `generate-design` 의 한계
- 디자인 생성 후보를 반환하지만 최종 design_id를 만들려면 추가 `create-design-from-candidate` 호출 필요.
- export는 `export-design` 별도 호출.
- 이 흐름은 디자이너가 Claude 세션에서 단계적으로 실행해야 하며 자동화 불가.

### Claude Artifacts의 한계
- **Production-ready code 생성기 아님**. 프로토타입·검수·시뮬레이션 한정.
- `localStorage` 사용 불가 (Claude.ai 환경 제약). 데이터 영속은 `window.storage` API 사용.
- 실제 꽃틔움 가든 앱의 UI는 Next.js 컴포넌트로 별도 구현 필수.

### Pro Max 사용량
- Pro Max는 Pro 대비 5배 사용량이지만 무제한 아님.
- 이미지·MCP·Artifacts 동시 사용 시 한도 빠르게 소비.
- **Claude 세션은 "디자인 의사결정"에 집중**하고, 코드 변환·문서 작성은 별도 세션 분리.

### MCP Prompt Injection 방어
- Adobe/Canva MCP가 반환한 텍스트·이미지에 악의적 instruction 포함 가능성.
- 본 시스템에서는 **MCP 출력을 사용자 검수 후에만 Vercel 데이터로 반영**하는 게이트가 핵심 방어선.

### 다크패턴 규제 2025-08-13 이후 직권조사
- 자동 카피라이팅에 정규식 필터만으로 부족할 수 있음.
- 월 1회 등록된 상품 카피 무작위 샘플링 → Claude 세션에서 수동 점검 권장.

### 정적 자산 라이브러리 신선도
- Stock 라이프스타일 컷은 6개월 단위로 갱신 (트렌드 따라가기).
- 동일 컷 재사용 30일 cooldown 유지 (네이버 어뷰징 감지 회피).
- 디자이너가 시즌별로 큐레이션 세트 교체.

---

## 10. 한 줄 요약

> **Gemini를 빼고, 그 자리에 "Claude Web Pro Max + MCP를 디자인 컨트롤 센터로 사용 + Adobe Stock/Lightroom 큐레이션 정적 자산"을 넣어 런타임 보안 표면을 0으로 만든다. 비용은 77% 절감, 사고 위험은 사실상 제거, 디자이너 강점은 그대로 살린다.**

---

## Appendix: PROGRESS.md / ROADMAP.md 업데이트 권장 사항

본 v2.0 아키텍처 채택 시 다음 항목을 두 MD 파일에 반영 필요:

1. **Operating Principle #37 추가**: "Production runtime never calls image generation APIs. Static assets created in Claude Web sessions are the only image source."
2. **Sprint 신설**:
   - **Sprint X** — Gemini 제거 + 정적 자산 라이브러리 구축 (7일 액션 플랜 반영)
   - **Sprint Y** — 5섹션 상세페이지 자동 생성 (Sharp 합성 + Groq 카피 + 다크패턴 필터)
   - **Sprint Z** — 라이프스타일 컷 큐레이션 + Claude Artifacts 보조 위젯
3. **알려진 이슈 섹션 갱신**: Gemini quota 항목 → Gemini 완전 제거로 교체
4. **도구 스택 다이어그램 갱신**: Phase 1 / Phase 2 구분 명시
5. **보안 체크리스트 섹션 신설**: Vercel 환경변수 보안 규칙 10개 항목

---

## 본 앱 현 상태와의 매핑 (2026-05-12 기준)

### 이미 v2.0과 정합한 부분 ✅

- **Groq 회전 정책** (GROQ_API_KEY + _3) — Phase 2 LLM stack 이미 채택
- **Cloudinary 보유** (`CLOUDINARY_CLOUD_NAME` 등 env) — Phase 2 이미지 변환 즉시 사용 가능
- **Supabase Storage** — 정적 자산 저장소 패턴에 이미 정합
- **Adobe Creative Cloud 구독 + 2,000 Firefly credits** (사용자 보유) — Phase 1 Creative Phase 자원 확보
- **Sprint 6-E 카테고리 캐시** (Phase 5) — `category_mappings` 테이블이 Gemini 호출 회피 path 이미 구축
- **Sprint 7 P1-B `NameRulesPanel`** — Claude Artifacts 4.4 SEO 점수 위젯의 본 앱 구현체와 정합
- **Sprint 7 P0-C `TopProductsCard` / `ParetoInboxRow`** — 분류 시뮬레이터(4.2)의 일부 실현

### v2.0 채택 시 제거할 부분

- `/api/category/suggest` 의 Gemini 호출 path (캐시 miss 시 fallback)
- `.env.local` 의 `GEMINI_API_KEY`, `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3` 3개 변수
- Vercel 환경변수의 동일 3개 변수
- 검색 조련사 / AI Studio 등에서 Gemini direct call 코드 (별도 grep 후 식별)

### v2.0 채택 시 신규 구축 부분

- **Phase 1 산출물 (사용자 Claude Web 세션에서 작업)**:
  - 카테고리별 마스터 PSD (꽃·리빙·식품·패션·잡화)
  - 카테고리별 라이프스타일 컷 50-100장 → Supabase Storage 인덱스
  - 5섹션 마스터 PNG (Sharp 합성용 베이스 이미지)
  - Adobe MCP 사용 가이드 (별도 사용자 매뉴얼)
- **Phase 2 산출물 (본 앱 코드 작업)**:
  - `src/lib/image/cloudinary.ts`
  - `src/lib/image/sharp-composite.ts`
  - `src/lib/image/lifestyle-picker.ts`
  - `/api/products/[id]/generate-detail` (5섹션 자동 합성 + Groq 카피)
  - `DetailPagePreview` 컴포넌트 (Artifacts 4.1 본 앱 구현체)
  - `BatchProgressMonitor` 컴포넌트 (Artifacts 4.5 본 앱 구현체)

---

본 문서는 2026-05-12 사용자 제공 PDF 원본의 영구 참조본으로 향후 모든 이미지·디자인 자동화 의사결정의 단일 근거가 됩니다.
