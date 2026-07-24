# HANDOFF — 크롤러 desc.contents 빈 객체 TypeError 근본 수정 (G1 회귀)

> **작성**: 2026-05-28 Desktop turn (Track B G1 정주행 검증 중 발견)
> **상태**: [CLOSED 2026-05-28 Desktop] — 동일 36904429 G1 재검증 통과(크롤 200 + name/supplierPrice 7980/options 4/images 1 완전). desc.contents {} 타입가드 fix d2f5d6e 실효 확정.
> **베이스라인**: HEAD `016631c` (origin/main, Vercel READY)
> **발견 경로**: Track B G1 게이트 — 신규 도매매 상품 36904429(아이스트레이) 크롤링 시 HTTP 500

---

## 1. 증상

`POST /api/crawler/domemae` body `{ url: "36904429" }` 호출 결과:

```json
{ "status": 500, "ok": false, "ms": 356, "data": { "success": false, "error": "e.replace is not a function" } }
```

- Vercel runtime log: `03:15:29 POST /api/crawler/domemae 500 error [crawler-api] error: TypeError...`
- 356ms 즉시 실패 = 도매꾹 OpenAPI 응답 수신 직후 파싱 단계 폭발 (fetch 자체는 200)
- minified 변수명 `e` 때문에 소스만으로는 어느 `.replace`인지 특정 불가 → raw 직접 검증으로 단정

## 2. 근본 원인 (raw 응답 직접 검증으로 100% 단정)

도매꾹 `getItemView ver=4.5 om=json` 36904429 raw 응답 필드 타입:

| 필드 | 실제 타입 | 기대 타입 | 판정 |
|---|---|---|---|
| `basis.title` | str | string | 정상 |
| `price.supply` | int (7980) | number | 정상 |
| `category.current.code` | str ("12_08_04_12_00") | string | 정상 |
| **`desc.contents`** | **dict (빈 객체 `{}`)** | string | **범인** |

도매꾹은 상세 HTML 본문이 비어 있을 때 `desc.contents`를 빈 문자열이 아니라 **빈 객체 `{}`** 로 직렬화한다 (XML→JSON 변환에서 빈 노드는 `{}`).

### 폭발 경로 (`src/lib/sources/domemae-adapter.ts` getItemDetail)

```
item.desc.contents = {}
-> const descContents = item.desc?.contents ?? '';   // {} 는 nullish 아님 -> {} 그대로 통과
-> stripHtmlToText({})                                // if(!html) 가드는 {} 가 truthy라 통과
-> ({}).replace(/<style.../)                          // TypeError: (intermediate).replace is not a function
```

`extractGalleryImages({})` 는 `RegExp.exec`가 인자를 String으로 coerce해 폭발하지 않으나(빈 결과), 같은 줄 흐름의 `stripHtmlToText(descContents)` 가 return 객체 평가 시 폭발.

## 3. 영향 범위 (실무 타격 큼 = P0)

- **상세 HTML이 없는 모든 도매꾹 상품이 크롤링 100% 실패**.
- 명화송풍구(65322245)는 화보 HTML이 풍부해 `desc.contents`가 string이었기에 그동안 미발현.
- 저가 생활용품·위탁판매 상품은 상세를 이미지로만 올리거나 desc 미입력이 흔함 → 소싱 실패율 높음.
- 작업원칙 #45 직접 사례: production 실측(G1 첫 크롤)이 코드 정독으로 못 잡은 숨은 회귀를 차단.

## 4. 근본 수정 명세 (Code, 3건 — 1 파일)

파일: `src/lib/sources/domemae-adapter.ts`

### Fix A (근본 — 추출 시점 타입 가드, 필수)

`getItemDetail` 내 descContents 추출부:

```ts
// BEFORE
const descContents = item.desc?.contents ?? '';

// AFTER
const descContents =
  typeof item.desc?.contents === 'string' ? item.desc.contents : '';
```

한 줄로 `{}` / number / null 모두 `''` 로 정규화 → 모든 하위 `.replace` / `.exec` 안전.

### Fix B (방어 심층 — 헬퍼 자체 가드, 권장)

```ts
// extractGalleryImages
function extractGalleryImages(html: string): string[] {
  if (!html || typeof html !== 'string') return [];
  ...
}

// stripHtmlToText
function stripHtmlToText(html: string): string {
  if (!html || typeof html !== 'string') return '';
  ...
}
```

### Fix C (예방 — title 숫자 상품 대비, 권장)

순수 숫자 상품명이 number로 직렬화되는 경우 대비:

```ts
// BEFORE
const name = item.basis?.title?.replace(/\s+/g, ' ').trim() ?? '';

// AFTER
const name = String(item.basis?.title ?? '').replace(/\s+/g, ' ').trim();
```

> 타입 정의(`desc?: { contents?: string }`)는 런타임을 보호하지 않으므로 위 런타임 가드가 핵심. 타입은 `contents?: unknown` 으로 정직화해도 좋으나 가드만으로 충분.

## 5. 검증 (Code)

- `npx tsc --noEmit` 0 errors
- `npm run build` exit 0
- 한글 sentinel grep 0 hits
- push 후 `scripts/verify-vercel-deploy.sh --wait` exit 0

## 6. 검증 후 재개 동선 (Desktop, 작업원칙 #41 핑퐁)

Code fix + Vercel READY 신호 수신 시 Desktop이 동일 36904429로 G1부터 재개:

1. `POST /api/crawler/domemae { url: "36904429" }` → 200 + `data.name`("64구 아이스틀...") / `supplierPrice`(7980) / `images` / `options` 단정
2. G2 카테고리 자동 추천 (도매꾹 cat `12_08_04_12_00` → 네이버 코드 매핑)
3. G3~G8 정주행 계속
4. 통과 시 본 핸드오프 헤더 → `[CLOSED]` + TASK_BRIDGE §7 ARCHIVED

## 7. 회귀 재현 케이스 영구 보존

36904429(아이스트레이) = `desc.contents == {}` 재현 표본. fix 후 회귀 테스트 케이스로 보존 권장 (상세 본문 없는 상품의 골든 픽스처).
