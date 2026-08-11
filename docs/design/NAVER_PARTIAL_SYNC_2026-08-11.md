# 설계 — 씨앗심기 "수정한 필드만 네이버 재연동" (2026-08-11)

> **상태**: 설계만. 코드 변경 0. 실 구현은 운영자 승인 후 별도 라운드.
> **요청 원문 재기술**: "네이버에서 가져온 상품을 씨앗심기에서 수정 → 저장 시 수정한 필드만
> 네이버에 반영되고, 안 건드린 필드는 기존 네이버 값 그대로 유지."

---

## 1. 핵심 확정 사실 — "부분 재연동" ≠ 부분 PUT

`.claude/rules/naver-api.md`(작업원칙, 기존 확정 사실): 네이버 v2
`PUT /v2/products/origin-products/{no}`는 **FULL REPLACE**다. 요청 body에서
누락된 필드는 네이버 상품에서 **제거**된다(commerce-api discussion #1650).
따라서 "수정한 필드만 네이버에 보낸다"는 부분 PUT은 애초에 선택지가 아니다 —
반드시 **전체 payload를 재구성해서 PUT**해야 하고, "수정한 필드만"이라는
요청은 실제로는 다음을 의미해야 한다:

> **"안 건드린 필드는 (변경 없이) 그대로 전송되고, 건드린 필드만 새 값으로
> 바뀐 채 전체가 전송된다"** — 즉 부분 전송이 아니라 **정확한 전체 재구성**.

## 2. 기존 인프라 재조사 — 이미 있는 것

verify-first(#181) 원칙에 따라 새로 만들기 전에 기존 코드부터 확인했다.
**핵심 쓰기 경로는 이미 구현되어 있다**:

- `src/app/api/naver/products/update/route.ts` — `POST {productId, dryRun, confirm, fields?}`
  - `loadNaverUpdateContext(productId)` (`src/lib/naver/load-update-context.ts`)로 DB에서
    최신 상품 전체를 로드
  - `buildNaverProductPayload(product, ...)` (`src/lib/naver/product-builder.ts`)로
    **항상 DB 현재 상태 기준 전체 payload**를 재구성 (레지스터 라우트와 동일 빌더 재사용)
  - **누락 방어(§4-C, `NAVER_STORE_OPERATIONS_UPDATE_2026-07-09`)**: PUT 직전
    `GET origin-products/{no}`로 네이버 현재 값을 가져와, DB-built 값이
    placeholder/빈 값으로 판정되면(`isPlaceholderDetail` 등) 네이버 쪽 값으로
    되돌려 채움 — 이미 "GET 후 병합" 패턴이 부분적으로 구현돼 있음
    (detailContent·sellerTags·metaDescription 3필드 한정)
  - GO 게이트 기존 그대로: `dryRun !== false || confirm !== true` → 프리뷰만,
    `confirm:true && dryRun:false`에서만 실 PUT (#46)
  - `fields?: string[]` 파라미터가 **이미 존재** — 현재는 advisory(응답에
    `fieldsRequested`로 에코만 하고 실제 로직엔 미사용)

- `src/app/products/[id]/preview/page.tsx` — 이 update 라우트를 호출하는
  기존 UI(발행 전 미리보기 화면). dryRun 프리뷰 → confirm 실행 흐름이 이미
  화면으로 존재한다.

**결론**: "쓰기 파이프라인"(전체 재구성 + GET 방어 + GO 게이트)은 **새로
만들 필요가 없다**. 부족한 것은 ①씨앗심기 화면에서의 진입점, ②"무엇이
바뀌었는지" 사람이 읽을 수 있는 변경 필드 감지/프리뷰, ③씨앗심기 저장
흐름과의 연결 3가지뿐이다.

## 3. 설계 — 3개 축

### 3-A. 변경 감지 (프론트엔드, dirty-field tracking)

`src/app/products/new/page.tsx`(씨앗심기, edit 모드 `?edit=`)에서:

1. hydrate 시점(네이버 연동 상품을 폼에 불러온 직후)의 값을 `useRef`로
   스냅샷 저장 — 이미 hydrate 로직이 존재하므로 그 시점에 1줄 추가.
2. 저장 시점 값과 스냅샷을 필드별로 비교해 **변경된 필드 목록**(사람이 읽을
   라벨: "상품명", "판매가", "대표이미지", "원산지" 등)을 만든다.
3. 비교는 얕은 값 비교로 충분(문자열/숫자/배열 길이+내용) — 상품 스키마가
   크므로 전 필드 비교가 아니라 **네이버 payload에 실제로 매핑되는 필드만**
   화이트리스트로 비교(`buildNaverProductPayload`가 참조하는 필드 목록과
   1:1 대응시켜 화이트리스트 작성 — 무관한 내부 필드 변경을 "네이버 반영
   대상"으로 오표시하지 않기 위함).

### 3-B. UI — 진입점 + 미리보기

- 씨앗심기 저장 버튼 근처에 **"네이버에도 반영"** 버튼을 별도로 배치
  (기존 자동저장=로컬 즉시, 네이버 반영=명시적 트리거로 분리 — 요청 원문
  그대로).
- LINKED 상품(`naverProductId` 존재)에서만 노출. 미연동 상품은 버튼 자체를
  숨김(신규 발행은 register 경로와 별개).
- 변경 필드가 0건이면 버튼 비활성 + "변경된 내용이 없어요" 안내(불필요한
  PUT 방지).
- 클릭 시 **1단계**: 기존 `/api/naver/products/update`를 `dryRun:true`로
  호출 → 응답의 `payloadPreview`를 3-A의 dirty-field 라벨과 매칭해
  "이 필드가 바뀝니다" 확인 모달 표시(변경 필드는 강조, 안 바뀐 필드는
  "그대로 유지" 문구로 안심시킴).
- **2단계**: 모달에서 운영자 명시 확인 후 `confirm:true`로 재호출 — 실
  PUT (#46 GO 게이트 그대로 재사용, 신규 위험 0).

### 3-C. 백엔드 — 최소 변경 제안 (구현 라운드용, 이번엔 미착수)

기존 `/api/naver/products/update`를 그대로 재사용하는 것을 1순위로 한다.
필요하면 다음 중 하나만 추가:

- `fields` 파라미터를 advisory에서 **프리뷰 응답 필터링**용으로 실사용
  (요청받은 필드만 `payloadPreview`에서 하이라이트 — PUT 자체는 항상 전체
  전송이므로 로직 변경 없음, UI 힌트 강화만).
- 3-A에서 만든 dirty-field 목록을 그대로 `fields`로 전달하면 백엔드 변경
  없이도 프론트 3-B가 완성됨 — **백엔드 코드 변경이 아예 불필요할 가능성
  높음**(확인만 하면 되는 항목, 구현 라운드에서 실측 후 확정).

## 4. 안전장치 (요청 원문 "절대 금지" 준수)

- **부분 PUT 금지**: 항상 `buildNaverProductPayload`로 전체 재구성 —
  기존 규칙 그대로, 신규 위반 경로 0.
- **GO 게이트**: 기존 `confirm:true && dryRun:false` 그대로 재사용 — 새
  게이트를 만들지 않고 검증된 것을 재사용(원칙 #46).
- **미리보기 필수**: dryRun 프리뷰 없이 바로 실행하는 경로를 만들지 않음.
- **필드 화이트리스트**: dirty-field 비교는 네이버 payload에 실제 매핑되는
  필드만 대상 — 무관 필드(내부 메모 등) 변경으로 오해 유발 금지.

## 5. 이번 라운드 산출물

- 본 설계 문서만. 코드 변경 0. 네이버 접촉 0.
- 다음 라운드(승인 후): 3-A(dirty tracking) + 3-B(버튼/모달) 구현,
  3-C는 실측 후 필요 시에만 최소 추가.

## 6. 관련 파일 (write set 예상, 구현 라운드용)

- `src/app/products/new/page.tsx` — dirty tracking, 버튼, 모달 (신규 코드,
  기존 흐름 비침습)
- `src/app/api/naver/products/update/route.ts` — 변경 불필요할 가능성 높음
  (실측 후 확정)
- 신규 파일 불요(기존 update 라우트 + product-builder 재사용)
