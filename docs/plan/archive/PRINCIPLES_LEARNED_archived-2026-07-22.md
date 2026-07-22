# PRINCIPLES_LEARNED — 아카이브 (2026-07-22 분할, 작업원칙 #31)

> 원본 `docs/plan/PRINCIPLES_LEARNED.md`가 1713줄로 1500줄 임계를 넘어 분할했습니다.
> **내용은 한 줄도 삭제하지 않았습니다** — 앞부분 815줄을 그대로 이 파일로 옮겼습니다.
> 여기 담긴 원칙 번호(26건): #26, #29, #31, #32, #33, #34, #35, #36, #37, #38, #39, #40, #41, #42, #43, #44, #45, #262, #263, #264, #265, #266, #267, #268, #270
>
> 최신 원칙은 `docs/plan/PRINCIPLES_LEARNED.md`에 있습니다.

---

## 작업원칙 #270 — 외부 API 파싱은 실제 응답으로 검증한다. 문서/추측 기반 타입은 조용히 전 건 실패를 만든다 (2026-07-18)

**맥락**: 도매꾹 재고 폴러가 4일 연속 전 상품 `qty=-1`(조회 실패)을 저장. 정원 창고 재고 신호등이 전부 "확인 중이에요"만 표시돼 재고 필터가 사실상 무력화. 운영자의 "재고를 파악하는 게 좋을까?" 질문이 계기가 되어 발견.

**진단 순서(재현 가능한 절차)**:
1. DB 실측 — `inventory_snapshots`에서 전 건 qty=-1, 4일 연속 확인
2. 크론 로그 확인 — 폴러는 매일 정상 실행 중이었음(죽은 게 아님)
3. **API를 curl로 직접 호출** — HTTP 200, 인증 통과, 실재고 반환 확인
   (아이스틀 7,934 / 달항아리 19,998이 API에서 정상적으로 옴)
4. 응답 구조를 코드의 타입 정의와 대조 → 3곳 불일치 발견

**버그(추측 기반 타입 3곳)**:
| 코드가 기대 | 실제 API | 결과 |
|---|---|---|
| `domeggook.multipleResult.item[]` | `domeggook.item[]` | 배열을 못 찾아 **전 건 -1** |
| `item.no` (최상위) | `item.basis.no` | 번호 매칭 실패 |
| `qty.inventory: number` | `"7934"` (문자열) | `typeof==='number'` 탈락 → -1 |

첫 번째가 근본 원인 — 존재하지 않는 경로를 읽으니 항상 빈 배열.

**규칙**:
1. 외부 API 어댑터의 응답 타입은 **문서나 추측이 아니라 실제 응답(curl/실호출)으로 검증**한다. 특히 배열 래퍼 경로, id 필드 위치, 숫자의 문자열화는 자주 어긋난다.
2. 숫자 필드는 **문자열로 올 수 있다고 가정**하고 `Number()` + `Number.isFinite()`로 강제 변환한다. `typeof === 'number'` 체크는 API 응답에 쓰지 않는다.
3. **"전 건 실패"는 개별 상품 문제가 아니라 파서/경로 문제**라는 신호다. 한 건 실패는 그 상품, 전 건 실패는 코드를 의심한다.
4. `-1` 같은 실패 센티널(#260)은 유지하되, **센티널이 계속 나오면 상품이 아니라 파서를 먼저 열어본다**. 4일이나 방치된 것은 신호등 같은 가시화가 없어서였다 — 실패가 화면에 드러나야 빨리 잡힌다.
5. 크론이 "실행됨"과 "성공함"은 다르다. 실행 로그만 보고 정상으로 판단하지 말고 **산출 데이터(저장된 값)를 확인**한다.

**교훈**: 조용한 전 건 실패가 가장 위험하다. 에러가 안 나고 그냥 -1이 쌓였기 때문에 4일간 아무도 몰랐다. 외부 연동은 "실패가 눈에 보이는가"를 항상 함께 설계한다(신호등이 이번에 그 역할을 했다).

## 작업원칙 #263 — 앱 내부 관리자 API는 브라우저(앱 화면)에서 호출해야 인증 통과, curl 401은 오진 (2026-07-14 정정)

**맥락**: `/api/admin/test-daily-discord`를 터미널 curl로 호출했다가 401이 떠서 "로컬 CRON_SECRET과 production 값이 불일치"로 잘못 진단하고, 운영자에게 "Vercel 대시보드에서 시크릿 확인 필요"라고 잘못된 요청을 함(2026-07-13~14 두 세션 연속 오진). 실제로는 `isAuthorized()`가 4개 경로 중 하나만 통과하면 되는 구조:
1. `Authorization: Bearer ${CRON_SECRET}` (cron 전용)
2. host가 localhost/127.0.0.1
3. **`origin`이 우리 앱 URL로 시작** ← 브라우저에서 앱 화면 통해 fetch하면 자동 충족
4. **`referer`가 우리 앱 URL로 시작** ← 동일

즉 CRON_SECRET은 Vercel cron이 외부에서 때릴 때만 쓰는 것이고, 브라우저에서 우리 앱 화면을 열어놓고 `fetch('/api/admin/...')`하면 origin 헤더가 자동으로 붙어 통과된다. curl은 origin/referer가 없어서 유일하게 남은 경로인 Bearer 검사에 걸린 것.

**규칙**:
1. 앱 내부 관리자 API를 검증할 때는 **Control Chrome / Claude-in-Chrome으로 앱 화면을 연 뒤 `javascript_tool`로 fetch**한다. 터미널 curl이 401이라고 해서 시크릿 불일치로 단정하지 말 것.
2. 401을 만나면 먼저 해당 라우트의 `isAuthorized()`(또는 동등 함수) **소스를 읽어 어떤 경로가 열려 있는지 확인**한다. 시크릿 값 확인을 운영자에게 요청하는 것은 소스 확인 후에도 방법이 없을 때만.
3. 브라우저 fetch는 비동기라 `javascript_tool` 한 번에 결과가 안 온다 — `window.__result`에 저장 후 별도 호출로 읽는 2단계 패턴 사용(기존 패턴과 동일).
4. 이 오진은 운영자에게 **불필요한 작업을 시킬 뻔한 사례** — "운영자 개입 필요"로 분류하기 전에 반드시 Claude 측에서 가능한 경로를 전부 소진했는지 자문할 것.

**교훈(일반화)**: "막혔다 → 운영자에게 요청"으로 넘기기 전에, 막힌 원인이 도구 선택 실수인지 진짜 권한/환경 문제인지 소스로 확인한다. 특히 인증 로직은 다중 경로인 경우가 흔하다.

## 작업원칙 #262 — 화면 노출 문구는 반드시 셀러 실무 용어로 번역, 개발자 은어 금지 (2026-07-14 운영자 확정, 상시 적용)

**맥락**: 상품 손질(구 "튜닝") 배지 작업 중 운영자가 지적 — "튜닝", "방어" 등 개발자/게임/자동차 정비 은어가 화면에 그대로 노출되고 있었음. 초보 셀러가 바로 이해할 수 없는 용어는 앱 전체에서 금지.

**규칙**:
1. **화면(사용자 노출) 텍스트**는 예외 없이 이커머스 파워셀러 실무 용어 + 꽃틔움 정원 컨셉의 하이브리드로 작성한다. 배지 라벨, 버튼, 툴팁, 디스코드 알림 문구, 에러 메시지(사용자에게 보이는 것), 빈 상태 문구 전부 대상.
2. **코드 내부(타입명·변수명·주석·서버 로그)**는 영어 개발 용어 그대로 유지해도 무방하다 — 화면에 렌더되지 않는 것은 대상이 아니다(예: `TuningTier = 'grow'|'defend'|'demote'` 타입명은 유지, 렌더되는 `TUNING_TIER_LABEL` 값만 번역).
3. **예외**: 네이버가 공식적으로 쓰는 카테고리명·용어(예: "튜닝용품"은 네이버 자동차용품 카테고리 공식명)는 원문 그대로 유지 — 네이버 노출/검색과 직결되므로 임의 번역 금지.
4. **"좀비"는 운영자가 의도적으로 부여한 브랜드 컨셉**(되살릴 상품, 향후 "좀비 꽃"으로 발전 예정)이라 개발자 은어가 아님 — 유지 대상. 신규 은어 후보와 혼동하지 말 것.
5. 새 기능을 만들 때마다 화면에 넣는 모든 문자열에 대해 "이 단어를 초보 셀러가 설명 없이 이해할 수 있는가"를 자문한다. 애매하면 실제 노출 전에 운영자에게 후보안을 제시하고 확인받는다(예: "손질필요도" vs "관리필요도" vs "개선필요도" 중 택1 요청 사례).
6. Claude(Desktop/Code)가 운영자에게 진행상황을 설명하거나 브리핑할 때도 이 원칙을 따른다 — "커밋", "배포", "tsc", "API" 같은 개발 용어는 핵심 인계 메시지(다음 세션이 읽을 문서)에서는 정확성을 위해 허용하지만, 운영자와의 대화·설명에서는 최대한 실무 용어로 풀어 설명한다.

**적용 사례(2026-07-14, commit cbdf516)**: "튜닝 필요도"→"손질필요도", "방어"(중간 등급)→"관찰", "온실 아틀리에에서 튜닝"→"...에서 꽃단장", "전환 튜닝 체크리스트"→"전환율 손질 체크리스트". 10개 파일 전수 스캔 후 일괄 교체, 화면 실측으로 반영 확인 완료.

## ~~작업원칙 #261~~ — **폐기됨 (2026-07-14 운영자 지시로 정정, #264로 대체)**

> **폐기 사유**: 본 원칙은 "좀비발견 필터(revival-score)와 손질필요도 배지(tuning-score)는 의도적으로 분리된 별개 엔진이니 통합하지 말고 운영자 확인을 받으라"고 규정했음. 같은 날 운영자가 **"'좀비 발견'으로 통일하라"**고 확정 지시 → 분리 유지 전제가 무효화됨. 통합 방침은 **#264** 참조. 아래 원문은 이력 보존용(당시 코드 상태 진단 기록으로서는 여전히 유효).

## 작업원칙 #267 — 메뉴 라벨의 권위는 페이지 h1이다. 개발 은어는 메뉴에 남기지 않는다 (2026-07-18 운영자 확정)

**운영자 원문**:
> "왼쪽의 메뉴 카테고리명이 일치하지않아요. 꿀통 꽃나들이는 크롤링, 정원창고는
>  작성중 이런식으로 되어있는데 모든 카테고리명 꽃틔움 컨셉에 맞춘 이름으로 바꿔주세요"

**규칙**:
1. **메뉴 라벨 = 그 라우트 페이지의 h1.** h1이 권위다 — 운영자가 실제로 보는 것이기 때문.
   라벨과 h1이 다르면 클릭한 곳과 도착한 곳의 이름이 어긋난다.
2. **개발 은어를 메뉴에 두지 않는다**(#262 연장). "크롤링"·"작성중"·"대시보드"·"설정"은
   개발자 어휘. 세계관 용어("꿀통 꽃나들이"·"정원 창고"·"정원 일지"·"정원 설정")로 통일.
3. **부모 그룹명이 하위 하나를 대표하면 안 된다.** 하위가 여럿이면 그룹은 상위 개념이어야
   한다. (자가교정 사례: settings 그룹을 "배송 레시피"로 두려다 취소 — 하위에 네이버
   기본값·라이프 자산도 있어 그룹은 "정원 설정"이 맞음)
4. **부모-자식 이름이 겹치면 안 된다.** 겹치면 부모를 상위 개념으로 올린다.
   (사례: 꿀통 꽃나들이(부모) > 꿀통 꽃나들이(자식) → 부모를 "꿀통 창고"로)
5. 메뉴를 바꿀 때는 **전수 감사 스크립트로 라벨 vs h1을 대조**한다. 한 건이 보이면
   나머지도 어긋나 있다고 가정한다(#62).

**전수 감사 결과 (2026-07-18, prod 30825a5)**: 7건 불일치.
"정원 창고 vs 꽃밭 돌보기"(#256, 971ab58)와 **동일 패턴이 앱 전체에서 재발**한 것.

| 메뉴 라벨 | 실제 h1 |
|---|---|
| 대시보드 | 정원 일지 |
| 크롤링 | 꿀통 꽃나들이 |
| 작성중 | 정원 창고 (동적) |
| 설정 / 배송 설정 | 배송 레시피 |
| 공급사 관리 | 거래처 명단 |

**교정 후 (prod ee9e274, 실측 — 개발 용어 0건)**:
```
정원 일지 (오늘 할 일 · 현황)
시장 분석 / 성장 · 소싱 / 관제탑
꿀통 창고 (꽃나들이 · 정원 창고)
   └ 꿀통 꽃나들이   -> /crawl
   └ 정원 창고       -> /products?tab=draft
온실 아틀리에 (씨앗심기 · 꽃단장)
   └ 씨앗 심기 / 꽃단장 작업실
꽃밭 돌보기 (좀비꽃 · 연동)
주문 관리 / 카카오 채널 / 인서트 카드 / 공급사 관리
정원 설정 (배송 · 네이버 · 자산)
   └ 배송 레시피 / 네이버 기본값 / 라이프 자산
```

---

## 작업원칙 #268 — 자사 몰명은 정식 명칭 전체를 쓴다. 짧은 이름은 경쟁사를 지운다 (2026-07-18)

**맥락**: R-1(시장 분석 자사 제외)이 `store_settings.store_name`을 읽어 자사 상품을
경쟁사 집계에서 뺀다. 실측 결과 DB에 `"꽃틔움"`으로만 등록돼 있었고, 코드 폴백 상수
`DEFAULT_OWN_MALL`도 `'꽃틔움'`이었다. 운영자 확인 결과 **정식 명칭은 "꽃틔움 KKOTIUM"**.

**왜 위험한가**: 매칭이 **부분일치**라 짧은 이름을 쓰면 `"꽃틔움농원"`·`"꽃틔움플라워"`
같은 **타사 몰까지 자사로 오인해 제외**한다. 경쟁사가 분석에서 사라지므로
"경쟁 낮음"이라는 잘못된 신호가 뜨고, 그 위에서 가격·키워드 결정을 하게 된다.
**틀린 데이터로 하는 의사결정이 데이터가 없는 것보다 나쁘다.**

**규칙**:
1. 자사 식별자는 **정식 명칭 전체**를 쓴다. 축약형·별칭 금지.
2. DB와 코드 폴백 상수를 **항상 같이** 맞춘다(DB가 비었을 때 폴백이 작동하므로).
3. 스토어 식별 필드가 여럿이면 정합을 확인한다
   (사례: `store_name`="꽃틔움" vs `kakao_channel_name`="꽃틔움 KKOTIUM" 불일치 → 통일).

**교정(2026-07-18)**: Supabase `UPDATE store_settings SET store_name='꽃틔움 KKOTIUM'`
+ `DEFAULT_OWN_MALL` 상수 동일 교정(`ee9e274`).

## 작업원칙 #266 — 정원 창고 / 꽃밭 돌보기 나눔 기준은 "스토어 등록 여부"(naverProductId), 앱 상태(status)가 아니다 (2026-07-17 운영자 확정)

**운영자 원문(2026-07-17)**:
> "꿀통창고 안의 상품들 목록은 꽃밭 돌보기가 아니라 정원창고로, 앱에 등록되지 않은
>  상품 목록들을 관리하는 겁니다. 꽃밭 돌보기에 있는 상품들은 앱에서 스토어로 등록한
>  상품과 스토어에 이미 판매중인 상품을 연동한 상품을 관리하는거에요"

**확정 정의**:

| 화면 | 소속 | 무엇을 담나 | 필터 |
|---|---|---|---|
| **정원 창고** | 꿀통 창고 > 작성중 | 스토어(네이버)에 아직 안 올린 상품 | `status === 'DRAFT' && !naverProductId` |
| **꽃밭 돌보기** | 상품 > 꽃밭 돌보기 | 스토어에 올라간 상품 (앱에서 등록 + 스토어에서 연동) | `!!naverProductId` |

두 화면은 **같은 Product 테이블의 두 뷰**이며 같은 라우트(`/products`)를 공유한다(#256 §1).

**규칙**:
1. **나눔 축은 `naverProductId` 유무 하나뿐이다.** `status`는 앱 내부 작업 단계
   (DRAFT/READY/ACTIVE/OUT_OF_STOCK/INACTIVE)를 뜻하는 **다른 축**이므로 분류에 쓰지 않는다.
2. **같은 라우트가 두 화면을 서빙하므로 제목(h1)은 반드시 동적이어야 한다.**
   `tab === 'draft' ? '정원 창고' : '꽃밭 돌보기'`. 고정값을 넣으면 클릭한 메뉴와
   도착한 화면 이름이 어긋난다.
3. 명칭을 바꿀 때는 **어느 뷰를 가리키는지 먼저 판별**한다. "정원 창고"라는 문자열이
   전부 같은 뜻이 아니다(꽃단장 작업실의 자산 브라우저 탭은 또 다른 개념).

**왜 반복 실패했나 (2회 연속 오류 기록)**:
- **1차(F-2, ccf8e2c)**: 나눔 기준을 `status !== 'DRAFT'`로 구현. status와 스토어 등록
  여부를 같은 축으로 착각.
- **2차(971ab58)**: h1의 "정원 창고"를 옛 이름으로 오판해 "꽃밭 돌보기"로 통째 교체.
  같은 라우트가 두 화면을 서빙한다는 사실을 놓침 → 꿀통창고→작성중으로 들어가도
  "꽃밭 돌보기"라고 뜨게 됨.

**실측 증거(교정 전, prod 971ab58)**:
```
플라티코  status=INACTIVE  naverId=10523253208  → 꽃밭돌보기 (맞음)
아이스틀  status=DRAFT     naverId=없음         → 정원창고   (맞음)
명화      status=DRAFT     naverId=13564133057  → 정원창고   ★오분류
달항아리  status=DRAFT     naverId=없음         → 정원창고   (맞음)
```
명화는 **스토어에 판매 중인데 앱에서 수정 중**이라 status=DRAFT → 정원 창고로 오분류.
스토어 상품을 수정할 때마다 반복될 구조적 결함이었다.

**교정 후 실측(prod 9f0de1b)**:
```
꽃밭 돌보기 (/products)          h1="꽃밭 돌보기"  → 명화, 플라티코
정원 창고   (/products?tab=draft) h1="정원 창고"   → 아이스틀, 달항아리
```

**교훈**: 운영자가 "이미 그렇게 분리하기로 계획을 다 했는데 왜 자꾸 오류가 나는지"라고
물으면, 구현이 스펙 문장을 **글자 그대로** 따랐는지 확인한다. "발행 여부"라는 스펙
표현을 코드가 `status`로 해석했는데 운영자 의도는 `naverProductId`였다 —
**같은 한국어 단어를 서로 다른 필드로 매핑한 것이 근본 원인**.

## 작업원칙 #265 — DOM 수치 검증은 시각 검증을 대체하지 못한다 (2026-07-17 확정)

**맥락**: Desktop 스크린샷 도구 장애(캡처는 성공하나 이미지가 컨텍스트로 전달되지 않음)로
2026-07-14~17 3세션 동안 DOM 수치(getBoundingClientRect·scrollHeight·textContent)로만
검증했음. 수치상으로는 전부 PASS였으나, 운영자가 화면 사진 6장을 제공하자 **수치가
놓친 문제 4건**이 즉시 드러남:

| 문제 | 왜 수치로 안 잡혔나 |
|---|---|
| 메뉴 "꽃밭 돌보기" vs 페이지 h1 "정원 창고" 불일치 | 두 문자열이 각각 정상 렌더 중 — 비교해볼 생각을 못 함 |
| 시장 분석이 자사 상품을 경쟁자로 집계 | `경쟁 상품수 1`은 유효한 숫자라 R1("0이면 숨김") 통과 |
| 패널 하단 액션 11개 과밀 | 개별 버튼은 전부 정상 동작 |
| 패널 열면 목록 컬럼 7개 가려짐 | 컬럼 DOM은 존재 — 시야에서만 사라짐 |

**규칙**:
1. **수치 PASS ≠ 화면 정상.** DOM 검증은 "요소가 있나/크기가 맞나"만 답한다.
   "말이 되나·눈에 편한가·앞뒤가 맞나"는 답하지 못한다.
2. 시각 판단이 필요한 작업(레이아웃·명칭·정보 위계·과밀)은 **완료 보고 전 반드시
   운영자 육안 확인을 요청**한다. 수치만으로 "완료"라 보고하지 않는다.
3. 운영자에게 요청할 때는 **무엇을 찍어달라는지 구체적으로** 명시:
   - 패널 작업 → 상품 클릭 후 패널 전체 1장
   - 목록/메뉴 작업 → 해당 화면 전체 1장
   - 알림 작업 → 디스코드 메시지 1장
   설명은 요구하지 않는다. 사진만 받아 Claude가 읽는다.
4. **명칭 일관성은 전수 스캔으로 확인**한다(`scripts/audit-old-name.py` 패턴).
   한 곳을 고치면 그 이름을 참조하는 모든 안내 문구가 같이 바뀌어야 한다(#62).
   특히 **디스코드 알림처럼 앱 밖으로 나가는 문구**가 없는 메뉴로 안내하면
   운영자가 헤맨다.

**교훈**: 도구가 막혔을 때 "대체 수단으로 검증했다"고 완료 처리하는 것이 가장 위험하다.
대체 수단의 사각지대를 명시하고, 그 사각지대는 운영자에게 넘긴다.

## 작업원칙 #264 — 좀비 판정은 단일 기준으로 통일, 하위 신호는 흡수 (2026-07-14 운영자 확정)

**운영자 지시 원문(2026-07-14)**: "좀비 발견vs손질필요: '좀비 발견'으로 통일하세요. 꽃밭 돌보기에 있는 상품들 중에서 좀비 발견 뱃지가 뜬 상품은 클릭했을때 보이는 좀비꽃이 된 이유를 빠르게 파악할 수 있게 심플하게 알려주세요.(추가 아이디어: 좀비가 된 이유를 꼬띠가 말해준다) ... SEO진단·품절대체·손질필요 기능은 꽃밭 돌보기의 상품들의 좀비꽃 감지+수치+알림에 적용이 돼야합니다."

**규칙**:
1. **"좀비 발견"이 유일한 상품 문제 판정 라벨**이다. "손질필요도"·"부활 필요도"·"튜닝" 등 병렬 라벨을 화면에 노출하지 않는다.
2. 기존 엔진들(revival-score의 상태/이미지/SEO 신호, tuning-score의 마진/판매실적/트렌드 신호, SEO 진단 결과, 품절 대체 신호)은 **삭제하지 않고 좀비 판정의 하위 입력 신호로 흡수**한다 — 각 엔진의 계산 로직은 유지하되, 최종 사용자에게는 "좀비꽃 판정 + 그 이유" 하나로만 보여준다.
3. **좀비 배지를 클릭하면 "왜 좀비꽃이 됐는지"를 즉시·심플하게** 파악할 수 있어야 한다. 여러 지표를 나열하지 말고 핵심 사유 위주로. 꼬띠 보이스로 전달하는 방식 권장(운영자 아이디어).
4. 통합 지점은 **꽃밭 돌보기** 화면이다. SEO 진단·품절 대체를 별도 메뉴로 분리 유지하지 않는다(2026-07-14 실측 기준 둘 다 별도 메뉴로 잔존 중 → 제거 대상).
5. "좀비"는 운영자가 부여한 브랜드 컨셉(되살릴 수 있는 상품)이며 향후 "좀비 꽃"으로 발전 예정 — 개발자 은어가 아니므로 #262(용어 번역 원칙)의 교체 대상이 아니다.

**배경**: 2026-07-14 실측에서 상품 관련 기능이 4개 화면(`/products`, `/products/link`, `/naver-seo`, `/products/reactivation`)에 흩어져 있고, 각각 다른 판정 지표를 노출해 운영자가 "어디서부터 봐야 할지" 혼란을 겪는 상태임을 확인. P1(메뉴 재편)이 완료로 기록됐으나 실제 미완료(트래커 rev53 참조).



**맥락**: `/products` 가든의 "좀비발견" 필터 탭(revival:{label:'좀비발견', filter:isRevivalCandidate})은 `revival-score.ts`(#244/#247, 상태·이미지·SEO 기반 "부활 필요도")를 쓰고, 본 턴에서 배선한 `TuningBadge`는 `tuning-score.ts`(#256 P4, 마진·판매실적·트렌드 기반 "튜닝 필요도")를 쓴다. 둘은 **의도적으로 분리된 독립 엔진**이며(revival-score.ts 하단 주석에 명시: product-lifecycle과 SEPARATE, 다이버전시 금지), 각자 다른 범위의 "문제 상품"을 판정하도록 설계되었다. 따라서 "좀비발견" 탭에 잡힌 상품의 튜닝 점수가 좀비 임계값(60) 미만이어도 **정상**이다 — 단, 2026-07-14 브라우저 실측(탭 필터 4건 전부 튜닝 0~40점 범위)에서 둘이 같은 화면에 나란히 보이면 운영자가 "좀비라는데 튜닝점수는 낮네?"로 혼동할 수 있음.

**규칙**: (1) 이 둘을 임의로 통합하거나 하나를 삭제하지 않는다 — 각각 권위 문서(revival-score.ts 하단 주석, tuning-score.ts 파일 헤더)가 명시적으로 분리를 지시함. (2) UI에서 둘이 함께 보일 때 혼동을 줄이는 방법(툴팁 문구로 "부활필요도≠튜닝필요도" 명시, 또는 탭별로 배지 선택적 노출 등)은 **운영자 확인 후** 착수한다 — UX 판단이라 Code/Desktop 임의 결정 사항이 아니다. (3) 장기적으로는 운영자가 둘 중 하나를 단일 기준으로 통합할지, 두 지표를 병기할지 결정 필요(결정 대기 항목에 등재).

**상태**: TuningBadge 배선 자체는 실측 확인 완료(commit ecd0d6f, prod 배포·브라우저 실측 완료 — 4건 튜닝 배지 정상 렌더·색상구분·툴팁 모두 확인). 이 원칙은 배선 결과를 무효화하지 않고, 단지 두 지표 병존이 의도된 것임을 기록해 다음 세션이 "버그"로 오인하지 않도록 방지한다.

# 작업원칙 — 학습된 패턴 (#26 ~ #36)

> **이 파일의 역할**: 세션 중 사고/학습으로 추가된 작업원칙. PROGRESS.md에서 분리됨 (작업원칙 #31 (b)).
> **상위 원칙**: PROGRESS.md "절대 작업 원칙 #1~#25" → `docs/plan/PRINCIPLES_CODE.md`
> **분할 시점**: 2026-05-12 Session E-2 Phase 2 (HEAD `5892c42`)

---

## 작업원칙 #26 — IA 점검 의무화 + 고아 라우트 처리 (2026-05-08)

직전 Z-3c' 사고: `/products/sourced` (사이드바 미등록 고아 라우트) 의 backlink 4곳을 `/products`로 변경했으나, 변경 대상이었던 `/products/[id]/edit`, `/products/upload` 도 모두 사이드바 미등록 고아 라우트로 판명. 즉 *고아 라우트끼리의 backlink 정리*는 의미 없는 작업이었으며, 만약 commit했다면 *구버전이 마치 살아있는 것처럼 굳어질* 위험이었음. 변경사항은 stash 보존 (`stash@{0}: z3c-misdirected-changes-needs-redo`).

**근본 원인**: 코드 grep만으로 IA 결정 → "이 라우트는 사이드바에 등록되어 있는가? = 실제 사용 흐름인가?"를 먼저 확인하지 않음.

**일반화 규칙 3가지 (강제 적용)**:

(a) **코드 변경 전 IA 점검 의무화** — 변경 대상 라우트가 `src/components/layout/Sidebar.tsx`의 NAV에 등록되어 있는지를 grep으로 *먼저* 확인:
  ```bash
  grep -nE "href:.*'(/products|/crawl|...)" src/components/layout/Sidebar.tsx
  ```
  사이드바에 등록 = 실제 사용 흐름 → 신중 처리. 사이드바 미등록 = 고아 라우트 → 구버전 잔재 의심 → 수정/삭제 결정 전에 꽃졔님께 "이거 살아있나요?" 확인.

(b) **고아 라우트끼리의 backlink 정리는 의미 없음** — 둘 다 사용자가 도달하지 않는 페이지면 둘 사이를 깨끗이 잇는 작업은 *구버전 활성화 착시*만 만들 뿐. 고아 라우트는 정리(삭제 또는 redirect)의 대상이지 backlink 정비 대상이 아님.

(c) **구버전 의심 페이지는 수정/삭제 전에 살아있는지 확인** — 페이지 컴포넌트가 import되는 위치 + 라우트가 사이드바에 있는지 + 실제 브라우저 진입 결과를 모두 검증한 후 판단. 단순 grep만으로는 부족.

**부수 학습 (Filesystem:edit_file vs git diff 모순)**: `Filesystem:edit_file`이 diff 출력으로 성공을 보고했으나 일부 파일은 `git status`에 변경으로 나타나지 않을 수 있음 → 작업 후 *반드시 `git status --short`로 raw 검증* 의무화.

**작업원칙 #26 추가 일반화 (2026-05-08 Z-3b 세션 학습)**:

(d) **같은 컴포넌트 한 세션 내 2회 패치 시 .next 정리 + dev 재시작 워크플로우 의무화** — Next.js dev hot-reload는 동일 파일을 짧은 시간에 두 번 수정하면 캐시 충돌로 옛 버전을 서빙하는 경우가 있음. 두 번째 패치 직후 반드시: `kill -2 <dev_pid> && rm -rf .next && nohup npm run dev > /tmp/dev.log 2>&1 &`.

(e) **Chrome MCP javascript_tool / Control Chrome execute_javascript는 4분 hang 패턴 보유** — 세션 끝 부근(commit/push 직전 또는 큰 MD 패치 직후)에 자주 멈춤. 검증 1순위는 `tabs_context_mcp` URL 비교 + `screenshot` 시각 확인. JS 도구는 한 번 hang하면 같은 세션 내 재시도 금지.

---

## 작업원칙 #29 — 한글 처리 절대 규칙 (2026-05-06 강화 5가지)

본 프로젝트는 한글 사용이 많아 한글 깨짐 사고가 반복 발생했습니다. 도구의 인코딩 layer 한계가 근본 원인이며, 워크플로우 차원의 회피 패턴으로 100% 방지 가능합니다.

**5가지 규칙 (강제 적용)**:

(a) **edit_file의 newText에 한글 다량 포함 절대 금지** — escape 변환 layer에서 글자 단위 오류 발생 가능 (사례: 꽃졔 / 혁섭셀러 / 쿠드 / 릴고 등)

(b) **MD 갱신은 항상 write_file 직접 입력** 또는 별도 임시 파일 + Python 안전 삽입 패턴 사용. edit_file은 oldText/newText 모두 영어/구두점만일 때만 사용 가능

(c) **코드 edit는 영어 주석/타입만 사용** — 한글 자체 회피로 risk 0

(d) **셸 명령에 한글 직접 입력 금지** — `echo "꽃졔"` 대신 한글은 파일에 작성 후 `cat .tmp_message.txt` 또는 Python 파일 읽기 패턴

(e) **한글 작업 후 즉시 grep 검증 의무화**:
  ```bash
  grep -nE "혁섭|쿠드|식타|릴고|헌서|위젝|스칵|쿠두" docs/plan/*.md docs/research/*.md
  ```
  결과 0건이어야 정상. 매칭 발견 시 즉시 git restore + write_file 패턴으로 재작성. (주의: "정과" 패턴은 가정과/이정과 등 정상 단어 거짓양성 빈발 → 본 세션부터 검증 패턴에서 제외)

(e+) **한글 고유명사 처리 원칙 (2026-05-07 본 세션 두 번째 학습)** — 사용자 이름·별명 등 한글 고유명사는 *내 답변/스크립트 출력 토큰으로 직접 작성 금지*. 모델 한글 자모 결합 단계 출력 오류는 도구 escape 문제가 아니므로 자기 검증 불가능. 안전 패턴: 사용자가 별도 파일에 작성 → Python read → 치환만 수행. 답변에서 언급 시 사용자 메시지 직접 인용만 허용. 본 세션처럼 위험을 감수하고 한글 출력 시는 *반드시* 변수 1개 인스턴스로 최소화 + grep 변종 자동 검출 + 사용자 시각 확인 후에만 commit.

**29-1 (2026-05-02 강화)**: read_text_file의 head/tail 미리보기는 깨진 글자처럼 렌더링되는 경우가 있으나 실제 파일은 NFC 정상인 케이스가 자주 발생. 화면에서 깨져 보여도 즉시 정정 시도하지 말고 **반드시 raw 검증 먼저** — Python으로 `\uFFFD` 카운트 + `unicodedata.normalize('NFC', text) != text` 카운트 측정해 둘 다 0이면 파일 정상 → 정정 작업 자체를 시작하지 않음.

---

## 작업원칙 #29 (e++) — 사용자 닉네임 절대 규칙 (2026-05-08 강화)

작업원칙 #29 (e+) 가 등록되어 있음에도 직전 세션 동안 사용자 닉네임을 잘못된 변종으로 출력하는 사고가 반복 발생. 사용자 명시 강화 지시로 본 (e++) 영구 규칙 등록.

**닉네임 정확 표기**:
사용자 닉네임은 "꽃지혜"의 줄임말이며, 두 번째 음절은 "지" + "ㅖ" 결합형입니다.

**알려진 잘못된 변종 (grep 감시 대상 — 발견 시 즉시 정정)**:
- 잘못된 변종 1: 두 번째 음절을 "ㅈ + ㅗ + ㅁ" 결합형으로 출력 (자모 결합 단계 오류)
- 잘못된 변종 2: 두 번째 음절을 단모음 "ㅔ"로 출력 ("ㅖ" 대신)
- 잘못된 변종 3: 두 번째 음절에 받침 "ㄹ" 추가 출력

이 3가지 변종이 grep 감시의 sentinel입니다. 어느 하나라도 매칭되면 즉시 정정.

**절대 규칙 4가지 (강제 적용)**:

(1) **답변 본문에 닉네임 직접 작성 금지** — 호명이 필요한 경우 "안녕하세요" 또는 무인칭 표현 사용.

(2) **허용 케이스 3가지만**:
  - (a) 사용자 메시지 verbatim 인용 (대화 맥락 보존 시)
  - (b) 코드 변수 (예: `const userName = "..."`)
  - (c) `Filesystem:write_file`로 MD 파일 작성 (escape 코드 0건, 직접 한글 입력)

(3) **오타 정정 시**: 사용자 메시지에서 copy-paste만 사용 — *기억으로 타이핑 절대 금지*. 모델이 자기 출력의 자모 결합 정확도를 자기 검증할 수 없음.

(4) **본 세션 commit 직전 grep 검증 의무화**:
```bash
# 잘못된 변종 3개 감시
grep -nE "잘못된변종패턴" docs/plan/*.md docs/research/*.md
# 결과 0건이어야 commit 가능
```

**작업원칙 #29 (e+) 와의 차이**:
- (e+): 한글 고유명사 일반론 (사용자 이름·별명 등 *모든* 고유명사)
- (e++): 본 프로젝트 사용자 닉네임 *특정* 절대 규칙 + 알려진 변종 3개 sentinel 등록

**본 패턴 적용 후 영향**:
- 이전 세션들의 닉네임 변종 매칭은 *과거 사고 기록*이므로 정정하지 않음 (이력 보존)
- 향후 모든 신규 세션 entry / 인계 메시지 / 답변 본문은 본 규칙 강제 적용
- userMemories에도 동일 규칙 영구 등록됨

---

## 작업원칙 #32 — TSC ≠ Production 빌드 검증 (2026-05-07 Z-Hotfix 학습)

Z-Hotfix 사고: 5개 commit 연속 Vercel 빌드 ERROR가 누적됐는데 매 commit마다 `npx tsc --noEmit`은 0 errors로 통과. 차이는 *Next.js의 prerender 단계에서 useSearchParams를 Suspense 없이 사용*하면 TSC는 catch 못하지만 production build는 실패. 꽃졔님은 이 동안 production이 5번 깨졌는지 인지하지 못한 상태로 작업 진행.

**규칙**: push 전 의무 검증 = `npx tsc --noEmit` AND `npm run build` 둘 다 0 errors. 빌드 시간 20-40초 소요는 작업원칙 #28 (Vercel = source of truth) 보호의 *최소 비용*. TSC 통과만으로 push하면 production이 부서져도 모름.

---

## 작업원칙 #33 — useSearchParams 추가 시 Suspense 자동 점검 (2026-05-07 Z-Hotfix 학습)

Z-3b commit `32e56f9`이 `Sidebar.tsx`에 `useSearchParams()`를 추가했지만 layout.tsx에서 `<Sidebar />`를 Suspense로 감싸지 않아 23개 페이지 prerender 모두 실패. 작업원칙 #12 (useSearchParams pages must be wrapped in Suspense)의 *적용 범위가 layout-level 컴포넌트까지 확장됨*을 파악하지 못한 결과.

**규칙**: `useSearchParams()` 호출을 추가/이동할 때 즉시 다음 점검:
  1. 호출이 page.tsx 안에 있으면 → 해당 page를 Suspense로 감쌌는가?
  2. 호출이 *layout-level component* (Sidebar, Header 등 모든 페이지에서 import됨)에 있으면 → **모든 페이지가 영향**, 컴포넌트 *내부*에서 `Inner()` 분리 + default export `<Suspense fallback={null}><Inner /></Suspense>` 패턴.
  3. 패치 후 *반드시* `npm run build` (작업원칙 #32 연동) — TSC만으로 catch 안 됨.

**Z-Hotfix 적용 패턴 예시**:
```tsx
// BEFORE (broken)
export default function Sidebar() {
  const searchParams = useSearchParams(); // breaks all pages
  // ...
}

// AFTER (correct)
function SidebarInner() {
  const searchParams = useSearchParams();
  // ...
}
export default function Sidebar() {
  return <Suspense fallback={null}><SidebarInner /></Suspense>;
}
```

---

## 작업원칙 #34 — 명백한 오류 파일 발견 시 사용자 알림 의무 (2026-05-07 Z-Hotfix 부수 학습)

Z-Hotfix 정리 중 발견된 2개 잔재 파일:
- `src/app/api/crawler/page.tsx` — Next.js 패턴 위반 (`/api/` 폴더 안 page.tsx). 진짜 크롤러는 `/crawl`. placeholder + 작동 안 하는 onClick.
- `src/app/chart-test/page.tsx` — 1월 21일 dev 테스트 잔재. 사이드바 미등록, 외부 import 0건, 4개월 미수정.

꽃졔님은 비개발자로 모든 코드 파일을 파악할 수 없으므로 *Claude가 발견한 명백한 오류는 알림 + 정리 제안 의무*.

**규칙**: 다음 상황에 사용자에게 즉시 보고:
  - Next.js 라우팅 패턴 위반 (`/api/.../page.tsx`, route handler 위치 오류 등)
  - 사이드바 미등록 + 외부 import 0건 + 6개월+ 미수정 = 강력 잔재 의심 (단순 grep만으로 결정 금지 — 작업원칙 #26 a/c 연동)
  - import 사이클 / 사용하지 않는 export / dead code subgraph
  - **발견 즉시 보고 + 삭제/유지 결정 받기** (혼자 결정 금지)

**작업원칙 #26 (b)와의 차이**: #26 (b)는 *수정 작업 중 발견한 고아 라우트끼리의 backlink*에 대한 규칙. #34는 *오류 패턴 자체 발견 시* 별도 보고 의무.

---

## 작업원칙 #31 — MD 의미 단위 자동 분할 + 인계 무결성 (2026-05-07 본질 강화)

**개선 배경**: 2026-05-07 STEP 0 재검토 세션에서 작업원칙 #31의 한계가 노출됨. 단순 줄 수 임계만 트리거하니 (1) 의미 단위 분할 부재 (2) 추가 MD 파일 자동 생성 부재 (3) 인계 무결성 검증 메커니즘 0 (4) 새 채팅 인계 메시지에 read 대상 자동 등재 안 함 (5) 세션 entry 자체 분할 정책 없음 — 결과적으로 정보 분산 시 인계 누락 위험. 본 개선판은 사용자 명시 본질 ("내용 누락 없이 새 채팅으로 인계")을 8개 규칙으로 형식화.

**8가지 규칙 (자동 적용 — 사용자 지시 없이도)**:

(a) **3중 임계 트리거**:
- T1 (소프트, 1000줄): 분할 *권고* 알림 + 핵심 인덱스 점검
- T2 (하드, 1500줄): 분할 *의무* — 자동 진행
- T3 (긴급, 2000줄): 분할 *즉시 차단* — 다른 작업 우선 중단

(b) **의미 단위 자동 분할 — 추가 MD 파일 생성**:
- **PROGRESS.md** 분할 시:
  - 본 파일 = 헤더 + 핵심 인덱스 + 현재 앱 상태 + 환경/메뉴/파이프라인 (~300줄 목표)
  - `docs/plan/PRINCIPLES_CODE.md` (신규) = 작업원칙 #1~#25 코드/UI/세션/보고 절대 원칙
  - `docs/plan/PRINCIPLES_LEARNED.md` (신규) = 작업원칙 #26~#34+ 학습된 패턴
  - `docs/plan/SPRINT_PLAN.md` (신규) = 진행중/예정 Sprint 계획 (Sprint 6/6.5/6-Pre/7/8)
  - `docs/plan/REFERENCES.md` (신규) = 핵심 파일 경로 + 알려진 이슈 + SEO 인사이트 + 기술 패턴
- **SESSION_LOG.md** 분할 시:
  - 본 파일 = 각 세션 5~10줄 짧은 요약 + 상세 파일 링크
  - `docs/plan/sessions/SESSION_YYYY-MM-DD-{slug}.md` (신규 폴더+파일) = 세션별 상세 entry
- **ROADMAP.md** 분할 시:
  - 본 파일 = 현재 진행 + "다음 새 채팅 시작 메시지" *최신 1개*만
  - 누적 시작 메시지 + 완료 Sprint → `docs/plan/archive/ROADMAP_{YYYY}Q{N}_{MONTH}.md`

(c) **분할 후 인덱스 무결성 자동 검증 — 3가지 체크리스트**:
1. 본 파일 핵심 인덱스가 *모든 분할 MD*를 가리키는지 grep 검증
2. 분할 MD 각각이 본 파일로 backlink (상호 양방향)
3. wc -l 분할 후 합계가 분할 전 ±5줄 이내 — 내용 누락 0 보장

(d) **새 채팅 인계 메시지 자동 등재**:
- ROADMAP.md "다음 새 채팅 시작 메시지" 안에 read 대상 모든 파일 자동 명시
- 분할 발생 시 즉시 신규 MD 경로 추가
- 정보 분산 시에도 인계 누락 0% 보장

(e) **idempotent 스크립트 의무화 (2026-05-07 본 세션 학습)**:
- prepend 패턴 모두 `if header_marker in content: skip` 가드 필수
- replace 패턴은 `if NEW in content: skip` (이미 적용 시 skip)
- 실수로 두 번 실행해도 안전

(f) **분할 작업 자체의 안전 패턴**:
- 시작 전 git status clean 의무
- 단일 commit (`docs(plan): split MD per principle 31 (T2 trigger NNN lines)`)
- 분할 직후 (c) 3가지 검증 + 작업원칙 #29 (e) 한글 grep 검증
- 검증 실패 시 git restore 즉시

(g) **매 세션 시작 시 자동 점검 (작업원칙 #21 강화 연동)**:
- `wc -l docs/plan/*.md docs/plan/sessions/*.md docs/research/*.md`
- 핵심 인덱스 ↔ 분할 MD 양방향 링크 검증
- T1 임계 도달 파일 발견 시 즉시 사용자에게 분할 권고

(h) **사용자 명시 지시 없이도 자동 진행** (현행 유지) — 본 원칙은 사용자가 2026-05-08 명시적으로 지시한 것: "앞으로 내용이 과부화되면 제가 지시하지 않아도 그렇게 진행하도록". 매 세션 시작 시 MD 사이즈 점검을 체크리스트의 첫 항목으로 둠.

**최초 적용 결과 (2026-05-08)**:
- `docs/plan/PROGRESS.md`: 1864줄 → 약 700줄 (헤더 + 영구 참조만 유지)
- `docs/plan/archive/PROGRESS_2026Q2_MAY.md`: 신규 1007줄 (5월 누적 세션 기록)

**다음 분할 작업 (2026-05-07 STEP 0 세션 후 위임)**:
- 다음 세션 첫 작업 = PROGRESS.md 의미 단위 분할 (b) 정책 적용 → PRINCIPLES_CODE.md / PRINCIPLES_LEARNED.md / SPRINT_PLAN.md / REFERENCES.md 4개 신규 생성
- 인계 무결성 (c) 3가지 검증 통과 후 단일 commit
- 향후 모든 prepend/replace 스크립트는 (e) idempotent 가드 의무

---

## 작업원칙 #35 — 한글 사전 분리 패턴 (2026-05-08 본 세션 학습)

본 세션 디스코드 5채널 본문에서 7건의 한글 자모 결합 오류 발생 (일찰/즈시/융지/론이/오를(잘 팔리는)/좌비/꼬뜸한). 작업원칙 #29 (e+) 가 등록되어 있음에도 escape 코드 *생성 단계*에서는 작동 안 함이 확인됨.

**근본 원인**: 모델이 한글 escape 코드 자체를 생성할 때 (예: `\uC4DE\uC2DC`(즉시) → `\uC988\uC2DC`(즈시)) 자모 결합 단계에서 확률적 오류. 모델이 자기 출력을 시각 검증할 수 없어 자기 발견 불가능.

**영구 해결책 (강제 적용)**:

(a) **모든 한글 사용자 대면 텍스트는 외부 JSON 사전 파일로 분리** — 코드 파일은 한글 0건 보장.
- 예: `src/lib/notifications/discord-strings.ko.json` (87 strings)
- 빌더 코드는 키 참조만: `STRINGS.recommend.title`

(b) **사전 파일은 항상 `Filesystem:write_file`로 직접 작성** — 직접 한글 입력만 사용, escape 코드 생성 금지.

(c) **검증 스크립트 의무 실행** — `scripts/verify-korean-dict.py`
- NFC 정규화 검사 (위반 0건)
- FFFD replacement char 검사 (0건)
- 알려진 오타 21개 패턴 매칭 (0건)
- 신규 오타 발견 시 검증 패턴에 추가 (누적 사전)

(d) **escape 코드 grep 0건 확인** — 한글 텍스트가 코드에 안 들어가 있는지 자동 검사:
```bash
grep -cE "\\u[0-9A-Fa-f]{4}" src/lib/notifications/discord-builder.ts
# 결과 0이면 통과
```

(e) **본 패턴은 이번처럼 *대량 한글 작성 작업*에만 적용** — 1~2줄 한글은 작업원칙 #29 (e+) 안전 패턴(사용자 메시지 인용)으로 충분.

**실전 적용 결과 (2026-05-08)**:
- 5개 빌더 함수 4섹션 구조 작성 (87 strings 사전)
- TSC 0 errors / 빌드 26/26 / 5채널 발송 HTTP 204 / 한글 깨짐 0건
- 발신자 이름 영문 `Kkotti` → 한글 `꼬띠` 정정 (test-discord-5-channels.mjs)

---

## 작업원칙 #36 — Vercel deploy 검증 의무화 (2026-05-12 본 세션 학습)

본 세션 prefill 버그 수정 검증 중 *4일간 git push 5건이 모두 Vercel에 도달 못한* 사실 발견. GitHub repo의 webhook 목록이 빈 배열 (Vercel git integration 끊김). PROGRESS.md / ROADMAP.md / SESSION_LOG.md에 "배포 READY"로 명시된 모든 최근 진행 (Sprint 6-A 백엔드 / archive 정비 / CLAUDE.md / cleanup) 실제로는 4일 전 옛 코드로 production이 운영됨. 사용자도 Claude도 인지 못한 채로 진행됨.

**근본 원리**: *"git push 성공"은 production 반영을 의미하지 않는다*. push 후 Vercel build trigger + Vercel build complete + production traffic 전환까지 3단계 모두 검증되어야 함. 작업원칙 #28 (Vercel = source of truth)의 *검증 메커니즘 부재*가 본 사고의 직접 원인.

**규칙 (강제 적용)**:

(a) **push 직후 commit SHA 일치 검증 의무** — 모든 production push 후 Vercel `list_deployments`로 최신 production deployment의 `meta.githubCommitSha`가 `git rev-parse HEAD`와 일치하는지 확인 의무.

(b) **검증 스크립트 활용** — `scripts/verify-vercel-deploy.sh --wait` 실행. 180초 polling으로 새 deployment의 READY 상태 + commit SHA 일치 모두 확인. exit code 1 발생 시 webhook 끊김 진단 + 사용자 즉시 보고.

(c) **세션 시작 STEP 0 보강** — 매 새 세션 첫 turn 환경 점검에 `gh api repos/<owner>/<repo>/hooks` + Vercel `list_deployments` 결과 비교 추가. 직전 commit SHA가 production에 반영 안 됐으면 *본 작업 시작 전 사용자 보고 + 해결 의무*.

(d) **MD 기록 표기 강화** — PROGRESS.md / ROADMAP.md / SESSION_LOG.md에 "배포 READY"라고 적기 전 *반드시 (a) 검증 통과한 commit SHA*만 기록. 검증 안 된 상태에서는 "push만 완료, deploy 미확인"으로 정직하게 표기.

(e) **git integration 끊김 자동 감지 (2026-05-12 본 세션 정정)** — push 후 180초 내 새 deployment 미발생 시 git integration 끊김 의심. 진단은 `gh api 'repos/<owner>/<repo>/deployments?environment=Production&per_page=1'`로 *최신 production deployment SHA == HEAD SHA* 확인이 우선 신호. `gh api .../hooks` 의 빈 배열은 **GitHub App 통합 시 정상 상태**이므로 검증 신호로 사용하지 않음 (false positive 원인). 끊김 확정 신호는 *commit SHA 불일치 또는 Vercel 대시보드 Settings → Git 비어있음*. 확정 시 사용자에게 Vercel 대시보드 → Settings → Git → Connect Git Repository 안내. 본 정정 트리거: 2026-05-12 STEP 0 점검에서 webhook 0건 알람이 false positive로 판명 (Vercel은 GitHub App으로 통합되어 있어 legacy webhook 미사용).

**적용 예시 (본 세션 사고 흐름)**:
```
push: 4657173 (cleanup + SESSION_LOG split)
→ list_deployments since=마지막 → 0건  ⚠️ 위반
→ 본 작업원칙 미적용 = 위반 인지 X, 다음 작업 진행
→ 4일 후 다음 작업 (prefill fix) 검증 중 발견 = 4일 누적 정보 손실

올바른 흐름 (본 작업원칙 적용 시):
push: 4657173 직후
→ scripts/verify-vercel-deploy.sh --wait
→ exit 1 (180s 후 mismatch) → webhook 진단
→ gh api hooks → [] → Vercel 대시보드 안내
→ 사용자 재연결 → 정상 deploy + push 검증
→ 4일 갭 0
```

**본 작업원칙은 작업원칙 #28의 *검증 메커니즘*을 형식화**. #28이 *원칙*이라면 #36이 *집행 도구*.

---

## 작업원칙 #37 — Production runtime never calls image generation APIs (2026-05-12 v2.0 아키텍처 채택)

본 원칙은 **2026-05-12 사용자 제공 "꽃틔움 가든 아키텍처 v2.0" 리서치** 직접 채택 결과입니다 (`docs/research/KKOTIUM_V2_ARCHITECTURE_2026_05.md` 영구 참조).

### 배경

Vercel 환경에서 Google 계열 API 키 (특히 Gemini)가 자주 폐기되는 실제 원인은 단순한 하드코딩 실수가 아닙니다. 표면은 여러 곳에 존재:

- `.env.backup.*` 같은 백업 파일이 git에 추적되어 GitHub secret scanning에 감지
- Vercel build logs에 환경변수 echo 가능성 (`console.log(process.env)` 디버그 실수)
- Edge Function 에러 로그가 환경변수 일부를 노출
- Source map이 production에 포함되면 클라이언트 번들에서 키 추적 가능
- `NEXT_PUBLIC_` prefix 실수로 client bundle 포함
- API route가 `process.env`를 echo back하는 디버그 코드
- Vercel preview deployment URL이 검색엔진 인덱싱
- 외부 모니터링 도구 (Sentry, LogRocket) 가 env 자동 캡처

**Groq는 키 폐기 후 즉시 새 키 발급이 가능하지만, Google은 폐기 시 프로젝트 격리·결제 정지까지 가는 경우가 많아 사고 비용이 비대칭적으로 큼.** 즉 Gemini를 자동화 파이프라인에 두면 매출이 늘수록 사고 확률이 비례 증가합니다.

### 새 원칙 (강제 적용)

> **"Vercel 런타임 = 정적 자산 + 안전한 서버 연산만"**
>
> "Production runtime never calls image generation APIs. Static assets created in Claude Web sessions are the only image source."

### 4가지 작업 종류별 허용 규칙

| 작업 종류 | Vercel 런타임 허용? | 적용 |
|---|---|---|
| 이미지 **생성** (create) | ❌ **불가** | Phase 1 Claude Web 세션에서 1회성 생성 → 정적 자산화 → Supabase Storage |
| 이미지 **변환** (transform) | ✅ 허용 | Cloudinary URL 기반, 키 클라이언트 노출 없음 |
| 이미지 **합성** (composite) | ✅ 허용 | Sharp 라이브러리, 로컬 연산 |
| 텍스트 **생성** (LLM) | ⚠️ 제한 허용 | **Groq만** 사용 (검증된 회전 정책 + 키 즉시 재발급 가능) |

### 2-Phase 아키텍처

**Phase 1 (Creative — Claude Web Pro Max)**:
- **빈도**: 신규 카테고리 진입 시, 시즌별, A급 상품 단건
- **출력**: 정적 자산 (PSD/PNG/SVG/JSON 템플릿)
- **API 키 노출 위험**: 0 (모두 Claude.ai 세션 내부에서 처리)
- **자원**: Adobe for Creativity MCP + Canva MCP + Claude Artifacts + Lightroom 라이브러리

**Phase 2 (Production Runtime — Vercel)**:
- **빈도**: 신상품 등록 시 자동, 일 10~100건
- **입력**: Phase 1 정적 자산 + 도매꾹 실시간 상품 데이터
- **사용 가능 API**: Groq (LLM) + Cloudinary (transform) + Supabase + Naver Commerce API + 도매꾹 OpenAPI
- **금지 API**: Gemini (이미지 + 텍스트 모두), OpenAI DALL-E, Adobe Firefly Services API (라이선스 차단 + 본 원칙)

### 위반 시 대응

본 원칙 위반 코드 발견 시:
1. **즉시 제거** (commit + push) — 매출 늘수록 사고 위험 비례 증가하므로 미루지 않음
2. `.env.local` + Vercel 환경변수에서 해당 키 제거
3. 정적 자산 대체 path 구축 (Phase 1 Claude Web 세션 작업 또는 Cloudinary transform)
4. PROGRESS.md "알려진 이슈" 섹션에 *재발 방지* 노트 추가

### 본 원칙 영구 참조 문서

- `docs/research/KKOTIUM_V2_ARCHITECTURE_2026_05.md` (전체 10 section 본 원칙 근거 + 7일 액션 플랜 + 비용 재계산 + Caveats)

### 본 앱 현 상태 (2026-05-12 채택 시점)

**위반 코드 발견 시 제거 대상**:
- `src/app/api/category/suggest/route.ts` 의 `suggestWithGemini()` 함수 (Phase 5 캐시 layer로 회피했지만 fallback path 잔존)
- `src/lib/trend-analyzer.ts` 의 Gemini fallback (이미 DataLab만 사용 중이지만 import 잔존 가능)
- `.env.local` 의 `GEMINI_API_KEY` / `_2` / `_3` 3개 변수
- Vercel 환경변수의 동일 3개 변수
- 검색 조련사 / AI Studio 등 Gemini direct call 코드 (별도 grep 후 식별)

**즉시 채택 가능 path** (이미 보유):
- Cloudinary (`CLOUDINARY_CLOUD_NAME` 등) → Phase 2 이미지 변환 즉시 사용
- Groq (`GROQ_API_KEY` + `_3`) → Phase 2 LLM stack 이미 채택
- Supabase Storage → 정적 자산 저장소 패턴 이미 운영 중
- Adobe Creative Cloud 구독 + 2,000 Firefly credits (사용자 보유) → Phase 1 Creative Phase 자원

---

## 작업원칙 #38 — Production Runtime = Static Assets Only

Vercel 런타임은 정적 자산과 안전한 서버 연산만 수행한다.

**허용**:
- 이미지 변환(Cloudinary URL 기반)
- 이미지 합성(Sharp 라이브러리, 로컬 연산)
- 텍스트 생성(Groq, Anthropic API — 회전 정책 안정한 것만)
- 정적 자산 서빙(Supabase Storage CDN)

**금지**:
- 이미지 생성 API 직접 호출(Gemini 등 자동 폐기 위험)
- Adobe Firefly API 직접 호출(Web UI 전용, 일반 API 미공개)
- 환경변수 echo back (`console.log(process.env)`, API route response에 env 전체 포함)
- `NEXT_PUBLIC_` 접두사로 시크릿 노출
- Source map production 활성화

이미지 생성이 필요하면 Claude Web Pro Max 세션에서 Adobe MCP + Firefly Boards로 사전 생성 → 정적 자산으로 추출 → Supabase Storage 저장 → 런타임에서 정적 자산만 참조.

근거: Gemini API 키 자동 폐기 사고(2026-04-11, 04-29 등 다회 발생) 이후 채택.

**예외(2026-06-04 명문화)**: `src/lib/automation/firefly-generate.ts`의 **api 모드**는 #38의 예외 — 대표가 의도한 명시적 자동화 트랙이다. 단 기본값이 manual이라 키 부재 환경(현재)에서는 네트워크 생성 호출 0으로 #38과 충돌 0이며, api 모드는 엔터프라이즈 Firefly Services 키가 주입된 의도된 운영 환경에서만 활성. 키 부재/파트너 모델 시 manual로 fail-safe 강등(#46 허위 성공 0).

## 작업원칙 #39 — CTI Inference is the Entry Point

모든 상세페이지 자동화는 CTI(Concept-Tone Inference) 8축 추론에서 시작한다.

**8축**:
- 컨셉 4축: 페르소나(20s/30-40s/senior/kidsmom) · 맥락(daily/gift/pro/event) · 가격(budget/standard/premium) · 유형(single/options/set)
- 톤 4축: 컬러무드(warm/calm/vivid/mono) · 감성톤(friendly/professional/sensory/trust) · 사진스타일(white/lifestyle/detail) · 장르(korean/minimal/vintage/natural)

**추론 → 골격 매칭**: CTI 결과로 S1~S12 중 1개 자동 선택. 디자이너는 1클릭으로 교체 가능.

**추론 도구**: 1차 Groq Llama 3.1 8B(무료), 2차 보강 Claude Vision(옵션 2, 신뢰도 <70%일 때만).

**원칙**: 디자이너는 0에서 시작하지 않는다. 시스템이 추론한 컨셉/톤이 출발점, 디자이너는 그 위에서 1클릭 교체 또는 디테일 작업.

근거: 광범위 일괄 컨셉 가정(v2.0 PDF)이 새싹 셀러의 상품 1개 단위 작업 흐름과 어긋난다는 진단(2026-05-12 v3.1 FINAL 기획 점검).

## 작업원칙 #40 — Designer Sense is the Sacred Resource

자동화는 디자이너 감각을 대신하는 게 아니라, 디자이너 감각이 발휘될 시간을 벌어주는 도구다.

**L1/L2 자동 트랙**: 0번부터 99번까지 반복 작업을 시스템이 처리. 디자이너는 모바일 PWA 스와이프 검수만(L1 6초/건, L2 5-8분/건).

**L3/L4 디자이너 트랙**: 100번에 1번의 정성스러운 작업. 시스템은 골격·무드보드·라이프스타일 컷 후보를 미리 펼쳐두고, 디자이너는 채색·디테일에만 집중(L3 15-25분, L4 30-60분).

**시간 분배**: 디자이너 시간 단가가 가장 비싼 자원이므로, ROI 양수 상품에만 L4 손길을 투입. ROI 계산은 진단 단계에서 자동 수행.

**금지 패턴**:
- 모든 상품에 균일한 시간 투입
- 카테고리·매출 잠재력 무시한 풀 수동 작업
- "이 정도면 됐다"는 임의 판단 — 진단 결과를 우선 신뢰하되 사용자 슬라이더로 강제 변경 가능

근거: 사용자 자기 정의 — "자동화는 내 감각을 대신하는 게 아니라, 내 감각이 온전히 발휘될 시간을 벌어주는 도구여야 합니다."(2026-05-12 v3.1 FINAL 기획 점검).

---

## 작업원칙 #41 — 두 환경 핑퐁 프로토콜 (2026-05-19 명문화)

**배경**: Sprint 7-PC paper-cut batch에서 두 환경 (🖥 Desktop ↔ 💻 Code) 핑퐁 운영 패턴이 자연 발생. 본 패턴을 영구 작업원칙으로 등재. 본문 + ledger는 `docs/plan/TASK_BRIDGE.md`에 보관.

**규칙 7가지**:

(a) **역할 상호 배타** — Desktop은 planning + verify, Code는 build + ship. 두 환경 overlap 0. TASK_BRIDGE.md §1 표 참조.

(b) **5-step 표준 hand-off** — 모든 hand-off는 TASK_BRIDGE.md §2 형식 (FROM / TO / BASELINE / SCOPE / VERIFICATION / FALLBACK).

(c) **TASK_BRIDGE §3 ACTIVE 갱신 의무** — 매 hand-off 직후 갱신. SESSION_LOG와 *역할 분리* (TASK_BRIDGE = 실시간, SESSION_LOG = 회고).

(d) **단일 commit 단위** — 변경 50 LOC 이하 권고. 단일 sub-phase 단일 commit.

(e) **push 직후 검증 의무** — `scripts/verify-vercel-deploy.sh --wait` exit 0 + Vercel `list_deployments` HEAD 일치 확인.

(f) **Cross-track 검증 4-source** — 가능한 한 git + Vercel + Supabase + Chrome 4 source 모두 cross-check. 단일 source 단정 금지.

(g) **한계 정직 보고** — Desktop은 MD edit 불가 / Code는 Chrome MCP 불가. 각자의 한계는 §1 표 그대로. *못 하는 작업 우회 시도 금지*, 다른 환경에게 hand-off.

근거: Sprint 7-PC 5 commits (48b50fa → 91a1eef → 9ae0673 → 742ce91 → 5a3b8c2 → 29b7c49) 모두 본 패턴으로 진행. 인간 paste-mediator 없이 두 Claude 환경이 자동 sync 가능 (사용자가 사용자 메시지로 hash만 전달하면 됨).

---

## 작업원칙 #42 — AI policy 변경 시 코드 마이그레이션 동시 commit 의무 (2026-05-19 명문화)

**배경**:
2026-05-15 v3.1 FINAL에서 "Groq primary" 결정 후 memory + PROGRESS.md는
갱신됐으나 코드의 5개 endpoint가 Perplexity 호출 잔존 상태로 약 5일 운영.
사용자가 황금 키워드 사냥 위젯 빨간 에러 박스 발견 후에야 단정.

**규칙**:
- AI provider/모델 정책 변경 결정 시 *동일 commit 안에 모든 endpoint 마이그레이션 포함*
- PROGRESS.md + memory 단정 직후 → 코드 grep으로 사용처 모두 확인 → 동일 commit
- "다음 sprint로 미룬다"는 결정은 *반드시 paper-cut 인벤토리에 명시 등재*
- 미등재 + 미마이그레이션 상태 0건 정합 의무

**검증 패턴**:
- AI policy 변경 commit 직후:
  ```bash
  grep -rn "Perplexity\|Gemini\|Groq\|Anthropic\|openai" src/ --include="*.ts"
  ```
- 잔존 사용처 모두 단일 commit으로 정합화 또는 paper-cut 등재

**메타-단정 사례 (2026-05-19 PM 후속, Sprint 7-PC-D)**:
- PC-C `2276ed7`에서 5 endpoint Groq 정합 완료 후에도 잔존 6 endpoint *4일간 코드 0건 변경* 상태로 운영
- 사용자가 "PERPLEXITY 만료 → 사용 안 함" 명시한 후 일괄 제거 (Sprint 7-PC-D)
- 학습: "DEPRECATED 상태" + paper-cut 등재만으로는 부족 — *4일 갭 사이 사용자 노출 위험 잔존*
- 강화: 사용자 직접 결정으로 DEPRECATED → REMOVED 격상 시 *24h 내 전면 제거 의무*

---

## 작업원칙 #43 — 시크릿/API 키 포함 코드의 backup 패턴 절대 금지 (2026-05-19 명문화)

**배경**:
src/lib/gemini.ts.bak 파일 잔존이 GEMINI_API_KEY 노출 → revoke 사고 원인.
`.bak` 패턴은 git tracking + 원격 push로 영구 공개 위험.
PC-C-hotfix 시점 git-tracked .bak/.old 파일 17개 일괄 삭제.

**규칙**:
- 시크릿/키 호출 코드의 `.bak`, `.old`, `.tmp` 파일 *코드베이스 0건 정합*
- 코드 변경 시 backup 필요 시 git stash 또는 별도 브랜치 사용 (commit 0건)
- .gitignore에 `*.bak`, `*.old`, `*.tmp.[a-z]*` 패턴 추가 의무
- 신규 키 발급 *전*에 backup 파일 0건 검증 의무

**검증 패턴**:
- 매 commit 전:
  ```bash
  find . -name "*.bak" -not -path "./node_modules/*" \
    -not -path "./.next/*" -not -path "./.git/*" \
    -not -path "./.claude/worktrees/*"
  ```
- 0건 정합 시에만 push 허용
- git ls-files | grep -E "\.bak$|\.old$" 결과 0건 의무

**검증 패턴 (2026-05-19 PM 강화 — 메타-단정 사례)**:

단일 패턴 grep은 *다른 패턴 누락을 보장하지 않는다*. 직전 `.bak` 일괄 삭제 후에도 `.backup` 60건이 추가 잔존 (Desktop search_files 단정). 따라서 멀티 패턴 union grep 의무:

```bash
find . \( -name "*.bak" -o -name "*.backup*" -o -name "*.BROKEN*" \
          -o -name "*.old" -o -name "*.v[0-9]*" \) -type f \
  -not -path "./node_modules/*" \
  -not -path "./.next/*" \
  -not -path "./.git/*" \
  -not -path "./.claude/worktrees/*"
```

- 0건 정합 시에만 push 허용
- `.gitignore`의 backup section 정기 검토 권고 (월 1회)
- 메타-단정 사례 (2026-05-19 PM): 룰 등재만으로는 부족 → 등재된 룰이 *그 자체로 검증되어야* 권위 정합. PC-C-hotfix `f9119a0`에서 `.bak` 17개 삭제 후 PC-C-archive에서 `.backup` 60건 추가 발견 — 단일 패턴 grep 한계 노출

---

## 작업원칙 #44 — 에러 메시지는 코드 상태 변경 시 동시 갱신 의무 (2026-05-19 명문화)

**배경**:
/api/ai/seo-workflow line 423의 "Perplexity API 크레딧이 부족합니다.
GEMINI_API_KEY를 .env.local에 추가하면 무료로 사용 가능합니다." 메시지가
AI chain 변경 후에도 stale하게 남아 사용자에게 fact 오류 안내.

**규칙**:
- AI provider/모델/키 정책 변경 시 *모든 에러 메시지 grep + 정합 갱신 의무*
- 에러 메시지에 *환경변수명 직접 노출 금지* (예: "GEMINI_API_KEY 추가")
  → 일반화된 안내로 교체
- 권고 메시지 패턴:
  "AI 서비스 일시 응답 없음 (제공자 모두 실패). 잠시 후 재시도해주세요."
- 사용자 노출 메시지는 fact-check 후에만 production 배포 허용

**검증 패턴**:
- AI 관련 commit 시:
  ```bash
  grep -rn "API_KEY\|.env.local" src/ --include="*.ts"
  ```
  → 사용자 노출 메시지 0건 정합
- 에러 메시지 변경 시 동일 commit에 사용자 노출 단정 (Chrome MCP smoke 권고)

---

## 작업원칙 #45 — Production smoke는 출력 품질까지 단정 의무 (2026-05-19 명문화)

**배경**:
2276ed7 commit에서 HTTP 200 + provider 정합 + qualityScore 75 통과했으나
실제 productNames 텍스트 "촛소시우에 촛소시우에 촛소시우에" 반복 출력.
구조 검증만으로 user-facing 결함 단정 불가. llama-3.1-8b-instant 한국어
한계 → llama-3.3-70b-versatile hotfix 진행 (P24).

**규칙**:
- AI/생성 API endpoint 변경 commit 직후 Desktop이 *실제 응답 텍스트 시각 단정*
- HTTP 200 + 응답 JSON 구조 정합 + *내용 fact-check* 3-tier 검증
- 텍스트 응답 검증 항목:
  - (a) degenerate 출력 (동일 토큰 3회+ 반복) 0건
  - (b) 다양성 (3개 variant 모두 동일) 0건
  - (c) 언어 정합 (한국어 요청 → 한국어 응답) 100%
- 결함 발견 시 hotfix paper-cut 즉시 등재 + 24h 내 fix

**검증 패턴**:
- Desktop이 curl로 production 응답 fetch
- 응답 JSON의 자연어 필드 (name, text, description) 시각 단정
- 결함 패턴 발견 시 작업원칙 #21 정합 (근본 원인 추적)

---

---
