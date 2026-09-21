# RISKY_IDIOMS — 반복 결함을 낳은 코드 관용구 사전

> 신설 2026-09-06 (CORE_WORKING_PRINCIPLES 학습화개선 #1).
> 목적: 반복 결함은 특정 코드 패턴에서 나온다. 그 "패턴 자체"를 박제해,
> 매 코드 작업 착수 시 grep으로 자기점검 → 단건 수습이 아니라 재발 차단(기둥2).
>
> 사용법: 코드 작업 착수 시 아래 grep 패턴으로 자기 코드/수정영역을 훑는다.
> 걸리면 "이 케이스에서 이 관용구가 안전한가?"를 표로 확인 후 진행.

---

## IDIOM-1 — `qty ?? 0` / `x ?? 0` (판정 로직에서 "데이터 없음"을 "0"으로 뭉갬)

**결함 사례**: 2026-09-06 disposition 결함1. disposition.ts·publish-gate.ts가
`(qty ?? 0) <= 0`으로 재고 판정 → 스냅샷 부재(qty=null/undefined, 폴링 전)를
실재고 0(품절)으로 오판 → 재고 멀쩡한 발행상품을 품절 오권고·발행 오차단.

**근본**: `?? 0`은 "값이 없으면 0으로 친다"인데, 판정 로직에서 "측정 안 됨(null)"과
"측정했더니 0"은 **의미가 정반대**다. 전자는 판정 보류(모름), 후자는 조치(품절).

**grep 패턴**: `\?\? 0` (특히 비교연산 `<= 0`, `< 0`, `=== 0` 근처)

**실행 커맨드** (2026-09-21 소급):
```bash
grep -rn '?? 0' src/lib/products/ src/lib/naver/ src/lib/notifications/ --include="*.ts"
```

**안전 체크 표** (판정 로직에 `?? 0` 발견 시):
| 입력 | 이 코드의 판정 | 맞나? |
|---|---|---|
| null/undefined (데이터 없음) | ← `?? 0`이 0으로 만들어 "값 0" 취급 | ❌ 대개 틀림. 판정 보류가 맞음 |
| 0 (측정된 0) | 0 | ✅ |
| 양수/음수 | 그대로 | ✅ |

**올바른 패턴**: null을 먼저 분기. `if (x == null) return 보류; if (x <= 0) return 조치;`
또는 `x != null && x <= 0`. 소비처(load 함수)가 `?? null`로 넘기는지도 확인
(disposition-load.ts는 `snap?.qty` = undefined 가능 → 순수함수가 방어해야 함).

**적용 원칙**: #260(조회실패 센티널), 결함1. CORE 기둥3 "데이터 없음 ≠ 값 0".

---

## IDIOM-2 — substring 부분매칭 / slash-synonym 파편 (엉뚱한 리프에 낚임)

**결함 사례**: UCE-9~F 계열. `leaf.includes(term)` / slash-packed 라벨
("내솥/패킹/트레이")을 쪼갠 파편("트레이")이 상품명에 substring으로 걸려
엉뚱한 카테고리(전기밥솥) 확신 매칭. "미니받침"→욕실홀더(결함F),
"실리콘트레이"→접착용품(결함D).

**근본**: 짧은 generic 물건종류어(트레이·받침·홀더)가 무관한 상위 카테고리의
slash 라벨 파편과 우연히 겹침 + 위치일치 보너스가 곱셈으로 확신구간까지 밀어올림.

**grep 패턴**: `.includes(` (매처/카테고리 로직 내), `split('/')`, `HEAD_NOUN_BOOST`

**실행 커맨드** (2026-09-21 소급):
```bash
grep -n "\.includes(" src/lib/naver/category-deterministic-matcher.ts
grep -n "split('/')" src/lib/naver/category-deterministic-matcher.ts
```

**안전 체크**: partial 매칭(matched < parts)엔 커버리지 비율 페널티(matched/parts),
위치 보너스는 완전일치(strongHeadMatch)에만. 저신뢰(<임계)는 AI/개입큐로
(결함E). 카탈로그 밖 "~트레이/~받침/~쟁반" 20종+ dryRun 필수.

**적용 원칙**: #346, #352, 결함C/D/E/F.

---

## IDIOM-3 — `< THRESHOLD` 경계 (임계에 정확히 걸친 값이 빠져나감)

**결함 사례**: UCE-11 결함C 트리거. `top.score < DETERMINISTIC_MIN_CONFIDENT_SCORE(20)`
인데 점수가 정확히 20 → `20 < 20 = false` → 저신뢰 판정을 빠져나가 오답 확신.

**근본**: `<` vs `<=` 경계 하나 차이로, 임계에 정확히 착지한 값의 처리가 갈림.
스코어링이 특정 값(파편매칭 등)에서 임계와 같은 수를 자주 만들면 경계버그 발현.

**grep 패턴**: `< [A-Z_]+SCORE`, `< THRESHOLD`, `< MIN_`, `<= MAX_` (임계 비교)

**실행 커맨드** (2026-09-21 소급):
```bash
grep -nE "< [A-Z_]+SCORE|< THRESHOLD|< MIN_|<= MAX_" src/lib/naver/category-deterministic-matcher.ts src/lib/products/*.ts
```

**안전 체크**: 임계에 정확히 착지하는 입력이 있는가? 있으면 포함/제외 어느 쪽이
안전한가? 저신뢰 판정은 "애매하면 포함(보수적)"이 대개 안전(#353).

**적용 원칙**: #353, 결함C.

---

## 추가 규약
- 새 반복 결함이 특정 관용구에서 나오면 여기 IDIOM-N으로 추가(날짜·사건·grep패턴·안전표).
- 이 사전은 CORE_WORKING_PRINCIPLES 기둥2(단건수습금지)의 실행 도구다.
- 코드 리뷰/인계 시 "IDIOM-N 체크했나?"를 회귀표와 함께 확인.


---

## IDIOM-4 — "테스트/진단" 엔드포인트가 실제 부작용(발송·쓰기)을 일으킴

**결함 사례**: 2026-09-06 디스코드 감사. `/api/discord` GET을 "진단"으로
호출했으나 실제로는 5개 운영 채널에 [테스트] 메시지를 실발송(status 204).
"디스코드 실발송 주의" 작업룰과 정면 충돌 — 진단이 운영을 오염.

**근본**: 이름/의도가 "테스트·진단·체크"인 엔드포인트가 내부적으로 실
API 호출(발송·DB쓰기·외부POST)을 함. 조회만 할 거라 믿고 호출하면 부작용.

**grep 패턴**: `/api/.*test`, `/api/.*diagnos`, GET 핸들러 내
`sendDiscord`/`fetch(.*POST`/`prisma.*(create|update|delete)` 동시 존재.

**실행 커맨드** (2026-09-21 소급):
```bash
find src/app/api -type d -iname "*test*" -o -type d -iname "*diagnos*"
grep -rln "sendDiscord" src/app/api/ --include="route.ts"
```

**안전 체크**: 진단/테스트 라우트는 호출 전 코드를 먼저 읽어 부작용 여부
확인. 진단은 기본 dry-run(상태·설정만 반환), 실행은 명시적 플래그
(`?send=1`·`?apply=1`)일 때만. 외부 발송/비가역 쓰기는 프로덕션에서
함부로 호출 금지.

**적용 원칙**: #46(비가역 쓰기·실발송 주의), 디스코드 실발송 작업룰.

---

## IDIOM-5 — GraphQL/스키마기반 API에 "합리적으로 추정한 필드명"을 검증 없이 사용

**결함 사례**: 2026-09-09 오너클랜 어댑터. `item.stock`이라는 존재하지
않는 필드를 쿼리했는데 HTTP 200 + `data` 필드 정상 반환 → 인증 성공,
에러 없음, 컴파일도 통과. 하지만 스키마에 없는 필드라 조용히
null/누락 처리되어 모든 상품이 예외 없이 qty=-1(추정치 기본값)로만
나옴. 인증 문제로 오인해 되돌아가는 시행착오 발생 후에야 원인 확정.

**근본**: REST API와 달리 GraphQL은 요청한 필드가 스키마에 없어도
최상위 응답이 "성공"으로 보일 수 있다(서버 구성에 따라 필드만 조용히
빠지고 전체 요청은 에러 없이 통과). "쿼리가 실행됐다"와 "요청한
필드명이 실재한다"는 별개 사실인데 코드에서는 구분이 안 보인다.

**grep 패턴**: 새 GraphQL 쿼리 문자열 작성 시 — 필드명이 운영자 제공
공식 문서(매뉴얼 PDF 등)의 Method/Type 섹션에 정확히 그 이름으로
등장하는지 확인. "stock", "inventory", "count" 같은 일반적인 이름을
매뉴얼 대조 없이 자연스럽게 지어내지 않았는지 자문.

**실행 커맨드** (2026-09-21 소급 — GraphQL 쿼리 문자열 전수 나열, 각
필드명을 매뉴얼과 수동 대조):
```bash
grep -n "query\|gql\`" src/lib/suppliers/*.ts src/lib/naver/*.ts --include="*.ts" -A 15
```

**안전 체크**: (1) 공식 스키마 문서에서 정확한 필드명을 그대로 인용
(추정 금지) (2) 가능하면 GraphQL introspection으로 라이브 스키마를
한 번 긁어 `docs/research/`에 저장해두고 문서-실물 어긋남까지 대조
(3) 모든 대상에서 예외 없이 같은 기본값이 나오면 필드명 오류부터
의심 (4) 신규 필드 도입 시 어댑터 코드 주석에 "매뉴얼 어느 섹션에서
확인했는지" 남긴다(ownerclan-adapter.ts의 FIELD_NAME_CORRECTION 패턴).

**적용 원칙**: #367(GraphQL 성공응답≠필드명정확), #231(침묵실패 표시).

---

## IDIOM-6 — 같은 목적의 두 분기(if/else if) 중 하나만 안전장치를 가짐

**결함 사례**: 2026-09-21 #45(휴대폰 스트랩→카메라 오분류). headNounWeight
함수의 strongHeadMatch(완전일치)와 weakHeadMatch(부분일치) 두 분기는
"슬래시 합성어 일부만 매칭됐을 때 신뢰를 낮춘다"는 같은 목적을 갖는데,
weakHeadMatch만 `partialMatch ? 1 : HEAD_NOUN_BOOST`로 partial을 체크하고
strongHeadMatch는 무조건 `HEAD_NOUN_BOOST`를 반환 — 그 갭을 "삼각대가방/
스트랩"(형제 파트 중 하나만 일치)이 정확히 찔러 60점 확신 오분류.
같은 클래스: #382(HEAD_NOUN_EXCLUDE가 STOP_NOUNS_SET과 별도 사전이던 것),
#44(homonymUnconfirmed의 rival 조건이 "자식있는 branch"만 인정, "자식0개
d3-as-리프"는 배제).

**근본**: 판정 함수 안에 "같은 위험을 막으려는" 분기가 여러 개 있을 때,
하나를 고치거나 새로 만들 때 형제 분기에 같은 안전장치를 넣는 걸 잊기
쉽다 — 각 분기가 독립된 조건문이라 시각적으로 떨어져 있고, 리뷰 시
"이 분기만" 보고 넘어가기 때문.

**grep 패턴**: 판정 함수 내부의 `if (...Match) return` 또는
`if (...Match) { ... }` 형태 분기가 2개 이상 있으면, 각 분기의 return
문/조건이 사용하는 안전장치 변수(partialMatch, corroborated, breadth 등)
목록을 나란히 적어 비교. 하나라도 다른 분기엔 있는데 이 분기엔 없으면
의심.

**실행 커맨드** (2026-09-21 소급):
```bash
grep -n "Match)" src/lib/naver/category-deterministic-matcher.ts
```
(출력된 각 분기의 return문에 partialMatch/corroborated 등이 동일하게
쓰이는지 육안 대조)

**안전 체크 표**:
| 분기 | 안전장치 적용? | 비고 |
|---|---|---|
| weakHeadMatch | partialMatch 체크함 | 원래부터 있었음 |
| strongHeadMatch | (수정 전) 없음 → (수정 후) 있음 | #45로 발견·수정 |

**부작용 주의**: 안전장치를 대칭으로 맞출 때, 그 분기가 원래 정당하게
커버하던 케이스(완전일치 slash 그룹, 예: "컵받침"=="컵받침/홀더"의 유일
파트)까지 discount하지 않는지 즉시 재검증 — #383(rev185) 참고, 실제로
"아로마 디퓨저" 회귀를 냈고 modifier-corroboration 신호로 즉시 보강.

**적용 원칙**: #295(단일권위), #382, #383.

---

## IDIOM-7 — 컴포넌트 본문 안에 정의된 인라인 자식 컴포넌트 + CSS 진입 애니메이션 조합

**결함 사례**: 2026-09-21 rev186 #23(Studio 상세캔버스 콘텐츠가 DOM엔
있는데 화면에 전혀 안 보임). `const StepGroup = (...) => (...)`가
부모 함수 컴포넌트(`StudioPage`) 본문 안에서 매 렌더마다 새로 정의됨
→ React는 함수 참조가 바뀌면 다른 컴포넌트 타입으로 인식해 매번
언마운트+재마운트 → 그 자식에 걸린 CSS 진입 애니메이션
(`kk-step-reveal`, opacity 0→1, 0.22s)이 매번 처음부터 재시작 →
부모가 0.22초보다 자주 리렌더링되면 애니메이션이 영원히 프레임1
(`opacity:0`)에 고정되어 실질적으로 안 보임. 3초 넘게 대기해도
`getComputedStyle().opacity`가 "0", `animationPlayState`가
"running"으로 확인됨.

**근본**: "DOM에 노드가 존재하는가"를 확인하는 표준 디버깅
(`document.body.innerText.includes(...)`, `querySelector`)은 이
결함을 절대 못 잡는다 — 노드는 항상 정상 존재하고 텍스트도 정확하다.
오직 `getComputedStyle`로 `opacity`/`transform`/`animationPlayState`
같은 시각적 계산값을 직접 찍어봐야 드러난다.

**grep 패턴**: 부모 함수 컴포넌트 본문(`function X() { ... }` 또는
`const X = () => { ... }`) 안에서 `const Y = (props) => (<jsx/>)` 또는
`const Y = ({...}) => {...}` 형태로 정의된 하위 컴포넌트가 있고, 그
컴포넌트가 렌더하는 JSX에 CSS 애니메이션 클래스(`animation:`,
`transition:` 등)가 걸려 있으면 의심. 특히 `hidden`/`display:none`
토글과 함께 진입 애니메이션이 같이 쓰이는 조건부 렌더링 패턴에서
빈발.

**진단 절차**: (1) `document.body.innerText.includes(...)`로 콘텐츠가
DOM에 있는지 먼저 확인 — 있는데도 화면에 안 보이면 (2)
`elementFromPoint(x,y)`로 그 좌표의 실제 최상위 요소를 확인 — 정상
텍스트가 나오면 (3) 그 요소부터 조상 체인을 따라 `getComputedStyle`의
`opacity`/`visibility`/`transform`/`animationPlayState`를 전수 스캔
— `opacity:0`이면서 `animationPlayState:running`인 조상을 찾으면
바로 이 패턴.

**실행 커맨드** (2026-09-21 소급 — 브라우저 콘솔/javascript_tool에서
그대로 실행 가능한 3단계 진단 스니펫):
```javascript
// STEP1: DOM에 콘텐츠가 있는지
document.body.innerText.includes('찾는 텍스트')

// STEP2: 그 좌표의 실제 최상위 요소
document.elementFromPoint(x, y).innerText

// STEP3: opacity:0으로 고착된 조상을 조상 체인에서 탐색
(() => {
  let el = document.elementFromPoint(x, y), i = 0;
  while (el && i++ < 8) {
    const cs = getComputedStyle(el);
    if (cs.opacity === '0') return {tag: el.tagName, cls: el.className, animationPlayState: cs.animationPlayState};
    el = el.parentElement;
  }
  return 'not found';
})()
```

소스 코드에서 인라인 자식 컴포넌트를 찾는 정적 grep:
```bash
grep -n "^  const [A-Z][a-zA-Z]* = (" src/app/studio/page.tsx
```

**안전수정**: 인라인 자식 컴포넌트를 (a) `useCallback([안정적인
의존성들])`로 함수 참조 고정하거나, (b) 부모 함수 바깥으로 완전히
빼서 독립 컴포넌트로 선언하거나, (c) props로 필요한 값을 전달받는
형태로 변경. (a)가 가장 최소 변경이지만 의존성 배열에 "매 렌더마다
바뀌는 값"(인라인 객체·배열 리터럴, 매번 새로 생성되는 함수)이
들어가면 무의미해지므로, 의존성이 실제로 안정적 참조(모듈
import·useState·useMemo 결과 등)인지 먼저 확인.

**적용 원칙**: #384.

---

## IDIOM-8 — flex 레이아웃 수정이 형제 요소의 CSS 트릭(marginTop:auto 등)을 조용히 무력화

**결함 사례**: 2026-09-22 rev193(이스터에그 footer가 화면 중간에 고정돼
콘텐츠를 가림, 대표님 스크린샷 신고). rev186(#23 Studio 수정)에서
`<main>` 콘텐츠 div에 `flex:1`을 추가했는데, 그 형제인 `<footer>`가
`marginTop:'auto'`로 "콘텐츠 짧으면 바닥에 붙는다" 트릭을 쓰고 있었음
— flex column에서 `flex:1`인 형제가 남는 공간을 전부 차지해버리면,
`marginTop:auto`는 조용히 `0px`로 계산된다(에러도 경고도 없음). 즉
**A를 고치려고 만든 `flex:1`이, 전혀 다른 목적(B: footer를 화면
하단에 붙이기)으로 쓰인 CSS 트릭을 몇 커밋 뒤에 조용히 깨뜨렸다**.

**근본**: flex 컨테이너 안에서 `flex-grow`/`flex:1`과
`margin:auto`(또는 `justify-content: space-between` 등 "남는 공간"에
의존하는 트릭)는 **같은 자원(남는 공간)을 두고 경쟁**한다. 한쪽을
바꾸면 반드시 다른 쪽의 계산 결과가 바뀌는데, 이건 컴파일 에러도
런타임 에러도 안 나고 그냥 "시각적으로 이상해 보일 뿐"이라 리뷰에서
놓치기 매우 쉽다.

**grep 패턴**: `flex: 1` 또는 `flexGrow: 1`을 추가/수정하는 커밋에서,
**같은 flex 컨테이너 안의 형제 요소들** 중 `margin.*auto`,
`justify-content: space-between`, `align-self: flex-end` 등 "남는
공간에 의존하는" 스타일이 있는지 반드시 대조.

**실행 커맨드** (2026-09-22 소급):
```bash
grep -n "marginTop: 'auto'\|margin-top: auto\|marginBottom: 'auto'" src/app/layout.tsx src/components/**/*.tsx 2>/dev/null
```

**안전 체크**: `flex:1`을 추가하기 전, 그 형제 요소들에 `margin:auto`
류 트릭이 있는지 먼저 확인 — 있으면 (a) 그 형제를 flex 컨테이너 밖으로
빼거나 (b) `margin:auto` 대신 명시적 `justify-content`/wrapper 구조로
바꾸거나, (c) 최소한 수정 직후 실제 브라우저에서 "그 형제가 여전히
의도한 위치에 있는지" 스크롤 시나리오로 재검증한다.

**검증 시 추가 함정(같은 사고에서 발견)**: 페이지에 동일 태그(`<footer>`
등)가 여러 개 있을 수 있다 — `document.querySelector('footer')`로
검증하면 완전히 다른 컴포넌트를 검증하게 될 위험. 반드시
`querySelectorAll`로 개수를 먼저 확인하고, 텍스트 내용으로 정확한
대상을 특정한다.

**적용 원칙**: #385.
