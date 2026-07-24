# HANDOFF — firefly-generate.ts 어댑터 + 인물 정책 코드 정합 (설계 명세)

> 작성: 2026-06-04 (Desktop) | Target Session: code-cli | Branch: main
> baseline: production HEAD 77812ea (Vercel READY)
> 권위: 본 문서 + 실측 코드(enqueue/ingest/classify, adobe-tool-router, category-tone-mapper, backdrop-vlm-gate)
> 성격: feat(신규 파일 1) + fix(stale-fact 정합 #44). 비가역 0. register/POST mutate 0.

---

## 0. 배경 — 왜 두 작업을 같이 묶나

대표 확정(2026-06-04) "AI 생성 인물 허용(익명 모델 / 특정 실존인물 금지)"이 문서(#47, PLAYBOOK §5)에는
반영됐으나 **실행 코드에는 구 하드룰이 잔존**한다. firefly-generate.ts만 신설하면 VLM 게이트가
인물 컷을 전부 탈락시켜 인물 컨셉컷이 자동 라인을 통과하지 못한다. 따라서 정합이 필수.

실측 잔존 stale-fact 3지점:
1. category-tone-mapper.ts 주석 "Human faces are hard-prohibited system-wide ... no 'face-allowed' member by design"
2. category-tone-mapper.ts 타입 `ModelPolicy = 'no-human' | 'hand-only' | 'silhouette'` (인물-허용 멤버 없음)
3. backdrop-vlm-gate.ts: has_person=true → 무조건 reject (배경 게이트로는 정당, 그러나 인물컷엔 부적합)

---

## 작업 1 — src/lib/automation/firefly-generate.ts 신설 (어댑터 패턴)

### 1-A. 목적
enqueue가 만든 `FireflyRequest`(backdrop-prompt-builder.ts FireflyRequest 타입)를 받아
이미지 1장을 생성하고 `{ imageUrl }`을 반환하는 단일 진입점. 두 모드를 환경변수로 토글:

- **manual 모드 (현재 기본)**: 생성을 수행하지 않고, 대표가 Firefly 웹에서 1-click 생성하도록
  request 스펙을 그대로 반환. 호출부는 ingest를 사람이 트리거. (API 키 없을 때 안전 동작)
- **api 모드 (엔터프라이즈 키 장착 시)**: Firefly Services v3 generateImages 호출 → 결과 URL 반환.

토글: `process.env.FIREFLY_MODE === 'api'` (미설정/기타 → 'manual'). 키 부재 시 api 모드여도
manual로 안전 강등(fail-safe, #46 허위 0 — "생성됨" 거짓 반환 금지).

### 1-B. 시그니처 (제안 — Code가 타입 최종 조정)
```ts
import type { FireflyRequest } from './backdrop-prompt-builder';

export type FireflyGenMode = 'manual' | 'api';

export interface FireflyGenResult {
  mode: FireflyGenMode;
  /** api 모드 성공 시에만 채워짐. manual 모드/실패 시 null. */
  imageUrl: string | null;
  /** manual 모드: 대표에게 보여줄 생성 스펙(=입력 그대로). */
  manualRequest: FireflyRequest | null;
  /** 모델 식별자 (FireflyModel). */
  model: string;
  /** 진단/로깅용. */
  note: string;
}

export async function generateBackdrop(req: FireflyRequest): Promise<FireflyGenResult>;
```

### 1-C. 동작 규칙
- manual 모드: `{ mode:'manual', imageUrl:null, manualRequest:req, model:req.model, note:'manual 1-click required' }` 반환. 네트워크 호출 0.
- api 모드 + 키 있음: Firefly Services v3 (`/v3/images/generate`, OAuth Server-to-Server 토큰) 호출.
  - 토큰 캐싱: 모듈 스코프 `let cachedToken: {value,expiresAt}` 패턴. 만료 60초 전 갱신.
  - 입력 매핑: FireflyRequest.prompt → prompt, negativePrompt, contentClass, size, seed, promptBiasingLocaleCode.
  - model 매핑: FireflyModel('firefly-image-5' 등) → Firefly Services 모델 문자열. 단 partner 모델
    (gemini-*/imagen/gpt-image-2)은 Firefly Services API 미지원 → api 모드에서 partner 모델 요청 시
    manual로 강등(+ note 명시). Firefly-native(firefly-image-4/4-ultra/5)만 api 자동.
- api 모드 + 키 없음: manual로 강등, note='api mode requested but FIREFLY_* keys missing → manual fallback'.
- 순수 부수효과 격리: 이 함수는 DB/Storage 미접촉(생성만). 적재는 기존 ingest가 담당.

### 1-D. 환경변수 (대표가 엔터프라이즈 계약 후 Vercel에 주입할 "환경")
```
FIREFLY_MODE=api                       # 미설정 시 manual
FIREFLY_SERVICES_CLIENT_ID=...         # Adobe Developer Console (Firefly Services)
FIREFLY_SERVICES_CLIENT_SECRET=...
FIREFLY_SERVICES_SCOPE=...             # firefly_api 등 (계약 시 확정)
```
→ 이 4개만 채우면 코드 변경 0으로 api 모드 가동. "환경만 만들면 자동화"의 실체.

### 1-E. workrule #38 정합 (중요)
#38은 "런타임 이미지 생성 API 호출 금지"가 베이스였으나, 본 어댑터는 **명시적 자동화 트랙**으로
대표가 의도한 기능이다. 단 기본값이 manual이라 키 부재 환경(현재)에서는 #38과 충돌 0
(네트워크 생성 호출 0). api 모드는 엔터프라이즈 키가 있는 의도된 운영 환경에서만 활성.
→ PRINCIPLES_LEARNED #38에 "firefly-generate api 모드는 예외(대표 승인 자동화 트랙)" 한 줄 보강 권장.

---

## 작업 2 — 인물 정책 코드 정합 (#44 stale-fact, #47 준수)

### 2-A. category-tone-mapper.ts
- ModelPolicy 타입에 인물-허용 멤버 추가:
  `export type ModelPolicy = 'no-human' | 'hand-only' | 'silhouette' | 'model-allowed';`
- 주석 "Human faces are hard-prohibited system-wide ... no 'face-allowed' member by design"를
  #47 준수 문구로 supersede:
  "Anonymous human models are allowed where the concept benefits (work-principle #47);
   identifiable real individuals / celebrities remain prohibited. Backgrounds stay no-human."
- ★ 기존 GROUP_ROWS의 modelPolicy 값은 **변경 금지** (배경 무대는 무인이 정답). 'model-allowed'는
  인물 컨셉컷 전용 분기에서만 쓰이는 신규 옵션 — 기존 배경 파이프라인 동작 불변.

### 2-B. backdrop-vlm-gate.ts — 게이트 분기 (배경 vs 인물컷)
현재 classifyBackdrop은 "빈 배경 무대" 전용 게이트(has_person=true → reject). 이건 **유지**.
인물 컨셉컷용 **별도 게이트 함수**를 신설(같은 Groq Llama 4 Scout 재사용):

```ts
export interface PersonShotVerdict {
  passed: boolean;
  has_identifiable_person: boolean;   // 특정 실존인물/유명인 (= reject 사유)
  has_text: boolean;                  // 로고/워터마크 (= reject 사유)
  is_appropriate: boolean;            // 상업 제품컷으로 적절 (미성년 부적절 묘사 등 차단)
  reasons: string[];
  model: string;
  raw: string | null;
}
export async function classifyPersonShot(pngBuffer: Buffer): Promise<PersonShotVerdict>;
```
- 통과 조건: `!has_identifiable_person && !has_text && is_appropriate`. (익명 인물 OK = #47)
- 시스템 프롬프트: "익명 일반 모델은 허용. 식별 가능한 특정 실존인물/유명인은 has_identifiable_person=true.
  미성년자 부적절 묘사는 is_appropriate=false." 영어로 작성.
- fail-closed 동일 패턴(에러/파싱불가 → reject) 유지.
- ★ 기존 classifyBackdrop은 손대지 않음 — 배경 게이트는 그대로.

### 2-C. ingest/classify 라우트 게이트 선택 (최소 변경)
- backdrop_jobs는 배경 무대 전용이므로 기존 classifyBackdrop 유지 — **이번엔 미접촉**.
- 인물 컨셉컷은 backdrop_jobs와 별개 흐름(상세페이지 자산). 본 핸드오프에서는 게이트 함수만 신설(2-B)하고,
  인물컷 인입 라우트 연결은 **다음 스프린트로 분리**(범위 폭주 방지). 지금은 함수 준비까지만.

---

## 검증 (Code 필수)
- `npx tsc --noEmit` 0 errors (특히 ModelPolicy union 확장 후 exhaustiveness)
- `npm run build` OK
- 한글 sentinel grep: `꽃젤|혁섭|쿠드|식타|릴고|헌서|위젝|스칵|정과|쿠두` 0건
- 비가역 0: firefly-generate 기본 manual → 네트워크 생성 호출 0. register/POST mutate 0.
- 새 의존성 0 (fetch만 사용, OAuth 토큰 수동 관리).
- 커밋: 한글 메시지 `.commit-msg.tmp` + `git commit -F` (#17). feat + fix 분리 권장하나 1커밋도 허용.

## 다음 (Desktop, 본 핸드오프 구현 후)
1. Adobe 가공자산 3종 Supabase product-assets 업로드 (단축URL 만료 전 영구화)
2. 대표 Firefly 인물 컨셉컷 1-click 생성 → classifyPersonShot 게이트 실측 검증
3. Figma 한도 리셋 후: 값 눈대조 + STEP2 7섹션 컴포넌트
