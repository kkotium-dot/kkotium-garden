# Firefly 무인 생성·적재 자동화 리서치 (2026-05-30)

> **목적**: 꽃틔움 가든 backdrop 파이프라인의 마지막 수작업("Firefly 웹에서 배경 생성")까지 무인화하려는 요구에 대한 기술·법무·비용 심층 조사 결과.
> **결론 한 줄**: "Firefly 생성까지 브라우저로 무인 자동화"는 **계정 정지 리스크가 있는 가장 취약한 경로**다. 생성은 사람이 트리거하고, **다운로드·판별·적재·검증을 앱이 전부 삼키는** 구조가 새싹 단계 최적해다.
> **참조 원본**: 영문 심층 리서치 리포트(동일 세션 산출). 본 문서는 그 한국어 요약·실행 정리본.

---

## 0. 가장 중요한 발견 (의사결정 핵심)

| # | 발견 | 사업적 의미 |
|---|---|---|
| 1 | **소비자 Firefly 구독은 API 권한을 주지 않는다** | 대표님의 유료 구독($19.99 등)으로는 코드에서 Firefly를 호출할 수 없음 |
| 2 | **Firefly Services API는 엔터프라이즈 전용** | Adobe 커뮤니티 모더레이터 명시: "50석·3년 계약 최소조건", 3rd-party 추정 월 $1,000부터. 1인 셀러 자가가입 불가 |
| 3 | **소비자 Firefly 웹의 스크립트/자동화는 약관 위반** | Adobe 생성형 AI 가이드라인: "무단 자동화/스크립트 프로세스 금지" + "위반 시 계정·기능 접근 제재 가능" |
| 4 | **헤드리스 브라우저는 Vercel에서 정상 구동 불가** | 함수 번들 250MB 한도(설정 불가) — 풀 Chromium 초과. 별도 워커 필요 |
| 5 | **서버사이드 Supabase Storage 적재는 기존 방식 그대로 가능** | `upload-backdrop.js`의 service-role 패턴을 워커로 옮기면 됨 (검증된 경로) |

> **핵심 트레이드오프**: 토큰 비용은 문제가 아니나(대표님 구독 보유), **API 접근권 자체가 돈/계약으로 막혀 있고**, 우회(브라우저 자동화)는 **단일 Adobe 계정에 의존하는 1인 사업자에게 비대칭적으로 큰 리스크**(정지 시 사업 마비)다.

---

## 1. Firefly 프로그래밍 접근 — 두 개의 다른 제품

소비자가 흔히 "Firefly"라 부르는 것은 사실 두 제품이다.

| 구분 | 소비자 Firefly | Firefly Services API |
|---|---|---|
| 접근 | firefly.adobe.com 웹/데스크톱 UI | `https://firefly-api.adobe.io` REST |
| 인증 | 로그인(사람) | OAuth Server-to-Server (Client ID/Secret) |
| 가입 | 누구나 구독 | **엔터프라이즈 계약 필요(영업 통해서만)** |
| 비용 | 월 $9.99~$199.99 | 3rd-party 추정 월 $1,000+ / 이미지당 $0.02~0.10 |
| 자동화 | **약관상 스크립트 금지** | API로 합법 자동화 가능 |

**결론**: 대표님 구독은 1번. 무인 자동화에 필요한 건 2번인데, 2번은 1인 사업자에게 사실상 닫혀 있음 (영업 견적 협상 시 예외 가능성은 있음).

---

## 2. Firefly Services API 사양 (접근권 확보 시에만 의미)

접근권을 확보한다면, API 자체는 깔끔하다.

- **토큰 발급**: `POST https://ims-na1.adobelogin.com/ims/token/v3` (client_credentials, 24시간 유효 → 약 23시간마다 갱신 권장)
- **이미지 생성**: `POST https://firefly-api.adobe.io/v3/images/generate-async` (비동기)
- **요청 핵심 필드**:
  - `prompt` / `negativePrompt` (v3 표준은 지원 — "no humans/no product"에 활용. 단 Custom Model image3/4는 negativePrompt 미지원)
  - `contentClass`: `"photo"` 또는 `"art"`만
  - `size`: 1:1 = `{2048,2048}` 또는 `{1024,1024}`
  - `seeds`: 정수 배열 (동일 seed+prompt = 재현 가능 — 우리 art_director_prompts 시드 전략과 정합)
  - `numVariations`: 변형 개수 (4 권장 → 그중 빈 배경판 자동 선별)
  - `promptBiasingLocaleCode`: `"ko-KR"` (한국 정합)
- **출력 회수**: 비동기 job → `statusUrl` 폴링 → `outputs[].image.url`(presigned S3) 다운로드
- **레이트 리밋**: 조직당 기본 **4 RPM / 9,000 RPD** (429 시 backoff). backdrop 소량 생성엔 충분
- **모델 버전**: v3=Image Model 3. Image 5는 별도 `/v4/` 엔드포인트(`aspectRatio` 문자열). Image 4 API 도달성은 문서상 불명확 → Adobe 확인 필요

**IP 면책(상업 안전)**: 소비자 플랜의 웹/데스크톱 출력은 면책 적용. **API/3rd-party 래퍼 출력의 면책은 계약에 따라 달라짐** — 엔터프라이즈 계약 시 별도 명문화 필요. 베타 기능은 면책 제외. → 이커머스 셀러에게 중요한 포인트.

---

## 3. 브라우저 자동화(소비자 Firefly 웹) — 리스크 평가

**Adobe 입장은 명확하다.** 생성형 AI 가이드라인이 "무단 자동화/스크립트 프로세스(스크립트를 통한 대량/자동 업로드 등) 사용"을 금지하고, "가이드라인 위반 콘텐츠/행위 발견 시 Adobe 계정 또는 생성형 AI 기능 접근에 조치할 수 있다"고 명시.

**탐지 리스크 실재**: 헤드리스 Chromium은 `navigator.webdriver`, 누락 브라우저 속성, canvas/WebGL 지문, 행동 타이밍으로 식별됨. 스텔스 툴로 줄일 수는 있으나 Adobe 보호 우회 = 약관 위반 가중.

| 판정 | 내용 |
|---|---|
| **지속가능성** | ❌ 취약·약관위반·계정위험 — 프로덕션 전략으로 부적합 |
| **허용 가능 범위** | 사람이 트리거하는 저빈도 보조(본인 로그인 세션을 사람 속도로 구동)만, 고빈도 무인 파이프라인은 절대 금지 |
| **1인 사업자 관점** | 단일 Adobe 계정 정지 = 사업 마비. 보상 대비 손실 비대칭 |

> **Devil's advocate 결론**: 대표님 요청("Firefly 생성도 브라우저 MCP 자동화")은 기술적으로 가능하지만 **사업적으로 권장 불가**. 자동화의 본질 목표(반복 마찰 제거)는 **생성 이후 전 구간 무인화**로 90% 달성되며, 생성 트리거 1클릭만 사람이 남기는 게 리스크/효율 균형점.

---

## 4. Vercel에서 브라우저 자동화 가능한가

- **번들 250MB 한도(설정 불가)** — 풀 Chromium 불가. `puppeteer-core`/`playwright-core` + `@sparticuz/chromium(-min)` 필요(겨우 턱걸이)
- **Hobby 크론 = 하루 1회 한도** / 함수 실행시간 제한(Fluid compute로 Pro 300s까지)
- **결론**: Vercel 서버리스에서 안정 구동 곤란 → **별도 상시 워커 필요**

**1인 사업자용 워커 옵션 비교**:

| 옵션 | 월 비용(2026) | 적합도 |
|---|---|---|
| **Fly.io** 초소형 VM | ~$2 (+고정IPv4 $2) | 상시 워커 최적·고정IP 지원 |
| **Railway** Hobby | $5+사용량 | DX 최고 |
| **Render** Starter | $7 | 예측가능·백그라운드 워커 |
| GitHub Actions 스케줄 | 무료~ | 주기 배치용(IP 회전 — 고정IP엔 부적합) |
| Cloudflare Browser Rendering | $5+사용량 | 봇으로 자기식별(Adobe 우회 불가) |

**권장**: Fly.io / Railway 소형 상시 워커 + (가능하면)API 기반 생성.

---

## 5. 고정 IP / 네트워크 (네이버 + 안티어뷰즈)

- 네이버 커머스 API는 호출 IP 등록을 요구하는 방향(미등록 앱 점진 제한). Vercel 서버리스 egress IP는 기본 동적
- 옵션: Vercel Static IPs(월 $100/프로젝트 — 1인엔 과함) / 아웃바운드 고정IP 프록시(QuotaGuard ~$19) / **소형 VM 고정IP(Fly.io +$2 — 워커 겸용 권장)** / Cloudflare Tunnel(인바운드 노출용)
- **권장**: IP 민감 호출(네이버, 필요시 Adobe)을 고정IP 워커 1대에 모으고 사람 속도 cadence 유지

---

## 6. 권장 엔드투엔드 아키텍처 (저취약·저비용)

기존 흐름이 "자연스럽게 이어지는" 무인 구조:

```
(a) 앱: 상품 메타(skeletonId·baseTone·라우터 모델)로 Firefly 프롬프트 자동 생성
       → Supabase `backdrop_jobs` row(status=pending)에 요청바디 저장
        (prompt / negativePrompt="people,humans,product,text" / contentClass=photo / 1:1 / seed)
(b) 워커: backdrop_jobs 폴링(또는 pg_net 웹훅) → 생성 엔진 호출
       · 선호: Firefly Services API generate-async (접근권 보유 시)
       · 현실: 사람 트리거 Firefly 웹 + 산출물 자동 인입
(c) 빈 배경판 자동 선별: numVariations=4 → 제품/사람/얼굴/텍스트 없는 plate만 채택(§7)
(d) 결과 다운로드(presigned URL → 워커 메모리)
(e) Supabase Storage 적재(service-role):
     supabase.storage.from('backdrops').upload(`${skeletonId}/${baseTone}.png`, buf,
       {contentType:'image/png', upsert:true})
     (>6MB/불안정망은 TUS 재개형 업로드)
(f) 검증: production thumbnail API 재호출 → assetSource.backdrop fallback→auto-cache 단정
     성공시 job=done, 실패시 human-review 플래그
```

→ **사람은 생성 트리거(또는 분류·검증 실패 시)에만 개입.**

---

## 7. "빈 배경판" 자동 판별 (사람 눈 제거)

각 변형을 인입 전 검증:

| 계층 | 방법 | 비고 |
|---|---|---|
| **1차(권장)** | VLM 제로샷 분류 | 엄격 JSON 강제: `{is_empty_backdrop, has_person, has_product, has_text}`. 학습 불필요·즉시 프로덕션 |
| **2차** | 피사체/얼굴 검출 | Adobe `image_select_subject`로 주요 피사체 면적 크면 "빈 배경 아님"으로 거부 |
| **오픈소스** | MobileNet/EfficientNet 미세조정 | 라벨 데이터·유지보수 필요 |

**권장**: VLM 게이트 + 저가 피사체/얼굴 프리필터. 4변형 중 통과 0개면 인입 말고 human-review.

---

## 8. 보안 / 시크릿

- `ADOBE_CLIENT_ID/SECRET`, `SUPABASE_SERVICE_ROLE_KEY`는 **서버 전용 env**. `NEXT_PUBLIC_*` 절대 금지, 브라우저 번들 노출 금지
- **service-role 키는 RLS 우회 → 절대 클라이언트 도달 금지**. 서버/워커 컨텍스트만
- Adobe 토큰 24h 캐시 후 ~23h 갱신(요청마다 발급 금지). 클라 업로드 필요시 `createSignedUploadUrl`로 스코프 토큰만

---

## 9. 단계별 로드맵 (꽃틔움 가든 적용 결정)

| Phase | 내용 | 담당 | 비용 |
|---|---|---|---|
| **0** | Adobe 영업에 1인 org Firefly Services API 견적 문의(50석/3년 최소조건 예외 가능성). 동시에 **소비자 웹 브라우저 무인 자동화는 착수 금지** | 대표 | 0 |
| **1** | **무인 적재 spine 구축**(엔진 무관 선행): `backdrop_jobs` 테이블 + Fly.io/Railway 소형 워커 + 서버사이드 Supabase upload + auto-cache 검증. → `~/Downloads`+수동적재 단계 즉시 제거 | Code | $2~5/월 |
| **2** | **자동 분류** 추가: VLM 제로샷 빈배경 검증 + 피사체/얼굴 프리필터. → "빈 plate 고르기" 사람 단계 제거 | Code | API 소액 |
| **3** | **생성 자동화**: API 접근 확보 시 generate-async 무인. 미확보 시 생성만 사람 트리거 + 산출물 자동 인입(폴더 워치/URL 페이스트) → 분류→적재→검증 자동 | Code | 엔진 의존 |
| **4** | 네트워크 경화: 네이버 IP 거부 시 고정IP 프록시 or Fly.io 전용 IPv4로 아웃바운드 통일 | Code | $2~19/월 |

**전환 임계값(plan 변경 트리거)**:
- Adobe가 감당 가능한 API 견적 제시 → Phase 3 API 경로로 직행, 브라우저 자동화 영구 폐기
- 일일 생성량 수백 plate 초과 → 4RPM/9000RPD 상향 필요(계정 매니저)
- 분류 오수용률 비무시 → 저신뢰 케이스 human-review 유지하며 VLM 프롬프트/임계 튜닝

---

## 10. 주의·한계 (정직 고지)

- **API 가격은 대부분 3rd-party 추정**(SudoMock 등). Adobe 공식 고정가 미공개 — 직접 견적 필수. 모든 금액은 지표일 뿐 계약 아님
- **Image 4/5 API 도달성 불확정** — v3=Image3 확정, /v4=Image5 별도. Image4 standard/ultra API는 커뮤니티 보고상 제한적. Adobe 확인 후 의존
- **브라우저 자동화 약관 리스크는 정성적** — "X시 차단" 명문은 없으나 자동화 금지·계정제재 문구는 명시. 정지=저확률 고충격 사건으로 취급
- **API/자동화 출력 면책은 계약 의존** — 소비자 플랜 면책이 API/래퍼 출력까지 자동 확장된다 가정 말 것. 서면 검증 필요
- **#38 원칙과의 관계**: 본 설계는 "런타임 생성 비용 0" 정신을 유지하되, 생성을 *비동기 워커로 분리*하는 방향. #38 전면 개정이 아니라 "생성=워커, production=캐시 소비"로 정합 가능

---

## 11. 한 줄 권고

> 토큰 비용은 풀려도 **API 접근권은 돈/계약으로 막혀** 있고 **브라우저 무인 자동화는 계정 리스크**다. **"생성=사람 1클릭, 그 이후 전부 앱 무인화"**(Phase 1→2 우선 구축)가 새싹 단계 최대 자동화·최소 취약 균형점. API 견적이 감당 가능하면 그때 생성까지 무인(Phase 3)으로 승급.
