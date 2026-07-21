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

## 작업원칙 #46 — 거짓 라벨 금지: registry/UI는 실 가동 단정 후 등재 (2026-05-19 명문화)

**배경**:
2026-05-19 Sprint 8-IA 진입 결정 시 발견. 직전 세션에서 만들어진 `/automation` 페이지의 `automation-registry` 26-entry 중 14개가 *미구현 작업의 사전 라벨*. 사용자가 "정상 17"으로 표시된 화면을 보고 *실제로는 cron 3건만 가동*임을 직접 시각 점검으로 발견. 파워셀러 시각: 작동하지 않는 기능이 작동한다고 표시되는 게 가장 큰 운영 리스크 (사용자 신뢰 깨짐).

**원인 진단**:
- "향후 작업의 *등록 지점*을 미리 깔아둔다"는 의도 → 실제로는 *미구현을 정상으로 위장*
- registry는 모니터링 도구가 아니라 *사용자에게 시스템 상태를 보고하는 화면*
- 미가동 작업을 미리 등재하면 *그 행이 정상으로 표시되는 순간 거짓 보고*

**규칙 5가지 (강제 적용)**:

(a) **registry 등재 = 실 가동 단정 후만** — 다음 3 조건 모두 통과해야 entry 추가:
  1. 코드 구현 완료 (production deploy 통과)
  2. 최소 1회 실 실행 확인 (cron 발화 또는 on-event trigger 성공)
  3. 로그/메트릭 endpoint 존재 (상태 fetch 가능)

(b) **미가동 작업은 *Sprint 인벤토리*에 등재** — `SPRINT_PLAN.md` 또는 `ROADMAP.md`에만 명시. registry/UI에는 진입 금지.

(c) **사용자 노출 UI에서 "준비"/"대기"/"보류" 상태 금지** — 사용자가 보는 화면은 "정상" 또는 "오류" 2가지만. "준비/대기/보류"는 *관리자 영역* (`/admin/*`)에서만 허용.

(d) **상태 라벨은 *fetch 결과 기반*만 허용** — hardcoded "정상" 라벨 금지. 매 페이지 로드 시 endpoint fetch → 실 상태 표시. fetch 실패 → "오류" 표시 (가짜 정상 금지).

(e) **신규 자동화 작업 commit 시 registry entry 동시 추가 의무** — 코드 commit + registry entry는 *같은 commit*. 분리 시 *commit gap 동안 가짜 라벨 발생 위험*.

**검증 패턴**:

```bash
# registry entry 수 == 실 가동 작업 수 검증
grep -c "id: '" src/lib/automation-registry.ts
# == 실 cron 작업 + Discord 채널 + 알림톡 등 가동 단정된 것의 합
```

신규 자동화 sprint 진입 시:
1. 코드 구현 → production deploy → 실 실행 확인 (검증 통과)
2. 같은 commit에 registry entry 추가
3. 사용자 노출 UI에서 자동으로 "정상" 표시 (hardcoded 아님)

**적용 사례 (2026-05-19 Sprint 8-IA Phase 1)**:

- BEFORE: registry 26 entry (정상 17 / 대기 2 / 보른 6 / 준비 2)
  - 정상 17 중 *실제 가동*: 3건 (재고폴링 + 일배치 + 주배치)
  - 14개 가짜 정상 라벨 = 본 원칙 *직접 발화 사례*
- AFTER (Phase 1 적용): registry 8 entry (정상 8 / 대기 0 / 보류 0 / 준비 0)
  - 모두 실 가동 단정된 작업만 (Discord 5채널 + 재고폴링 + 일/주 배치)
  - 사용자가 본 화면 = 실 상태 100% 정합

**파생 학습**: "registry는 *미래 작업의 등록 지점*이 아니라 *현재 가동의 보고 화면*". 등록 지점 역할은 `SPRINT_PLAN.md`가 담당. 두 역할을 한 파일에 합치면 *시점 충돌* 발생 → 본 사고가 그 직접 사례.

---

## 작업원칙 — publishReady 라벨의 검사축 명시 의무 (#46 확장, 2026-05-31 학습)

**사고**: 달항아리 상세 환각제거 cycle 후 `publishReady=true`로 라벨이 떴으나, 네이버로 실제 전송되는 naver_* 페이로드 17필드가 전부 NULL이었음. authentic 게이트는 detail PNG 콘텐츠만 검사하고 네이버 전송정보는 미검사 → 발행 불가 상태에서 "발행가능" 거짓신호.

**교훈**: **publishReady 라벨은 검사 축을 명시해야 한다. authentic(PNG) ≠ naverPayloadComplete(전송정보).** 발행 게이트는 네이버로 실제 가는 페이로드를 검증해야 하며, 자산 미리보기 검증만으로 "발행가능" 라벨을 붙이는 것은 #46(거짓 라벨 금지)의 확장 위반.

**시스템 강제**:
- `evaluatePublishReadiness`의 publishReady는 다축 AND: `fieldsAllSet && authentic && naverPayloadComplete && status=DRAFT && naverProductId=null`.
- 각 축은 응답에 독립 노출 (publishReady만 보지 말고 어느 축이 false인지 확인).
- 신규 게이트 축 추가 시 라벨 라이브 의미가 변함 — 회귀 0 + 전 상품 영향 신경.

**파생 학습**: 단일 boolean 신호는 *축의 합성*이지 단일 진실이 아니다. 라벨이 true일 때 어느 축 통과로 true인지 추적 가능해야 한다. 단축 추가 시 기존 true가 false로 강등되는 것은 *의도된 강등*(거짓신호 차단).

---

## 작업원칙 #47 — AI 생성 인물 정책: 익명 모델 허용 / 특정 실존인물 금지 (2026-06-04 대표 확정)

**정책 변경(대표 확정)**: 상품·컨셉상 사람이 들어가야 감도가 사는 경우 AI 생성 인물 등장을 허용한다. 단 (a) 특정 실존 모델(연예인·식별 가능 개인·유명인 얼굴) 생성 금지 = 익명 일반 모델/비식별만, (b) 미성년자 부적절 묘사 금지(상업 제품컷 맥락 유지).

**대체 관계**: 구 하드룰 "얼굴 없는 인체 일부 전략"(KKOTIUM_ART_DIRECTION_RESEARCH_2026-05-29 §3-D, DETAIL_PAGE_PLAYBOOK §5)은 본 정책으로 대체된다. 법적 근거: 익명·비식별 모델은 퍼블리시티권(부정경쟁방지법 (타)목)·표시광고법(AI 가상인물 광고 표시) 리스크를 회피하므로 "식별 불가" 조건만 지키면 허용 가능.

**Firefly 공통 네거티브(인물 포함 시)**: `no recognizable celebrity, no specific real person likeness, no text, no logo, no watermark, no brand marks`.

**적용 의무(#44 stale fact 연동)**: 본 정책 변경 시 구 하드룰을 명시한 라이브 SOP(DETAIL_PAGE_PLAYBOOK §5)를 동시 갱신한다(본 turn 이행). 동결된 과거 리서치/핸드오프(KKOTIUM_ART_DIRECTION_RESEARCH, HANDOFF_S2 등)는 시점 기록이므로 보존하되, 본 #47이 최신 권위임을 본 ledger로 단정.

**권위 문서**: docs/handoff/FIREFLY_CONCEPT_PROMPTS_v2_human_allowed_2026-06-04.md §0.

## 작업원칙 #48 — 도구 생태계 라우팅 규칙 (2026-06-04 명문화, TOOL_ECOSYSTEM_MANUAL 근거)

**도구 라우팅(고정)**:
- **이미지 생성** = Adobe Firefly 웹 1-click(대표 수동) — Firefly Services api 모드는 엔터프라이즈 키 장착 시에만(작업원칙 #38 예외).
- **가공**(누끼/리사이즈/리프레임/합성준비) = Adobe MCP 자동.
- **합성·연속성**(상세페이지 레이아웃) = 빌더(section-builder/composeContinuous) + 디자인 도구(Figma). sharp 단순 적층은 약함 — 빌더 연속 캔버스가 담당.
- **시안·의사결정·배너**(내부용, 2026-06-05 추가) = 캔버스 시각화(Claude Design 류) / Canva — 발행 GO/NO-GO 의사결정 카드·둘째 상품 hero 시안 탐색·단발 이벤트 배너. **판매 발행물 아님** → IP 면책 불요. 판매 자산은 여전히 Firefly-native 생성 + Figma 양산만(면책 경계 불변).

**연결 상태 명문화(2026-06-05 갱신, #44 stale-fact)**:
- **AEM MCP**: 연결 유지(2026-06-05 대표 재연결), 단 현재 1인 셀러 워크플로우 미해당 — 향후 멀티채널 확장(자사몰 등) 시 활용. **Adobe Marketing Agent MCP**: 동일(연결 유지·현재 미해당). 억지 편입 금지(정직 평가 #46) — 엔터프라이즈 CMS/마케팅 운영 도구로 현재 1인 셀러 호출 표면 없음.

**파트너 모델 면책 경계(중요)**:
- FLUX / Nano Banana / gemini-image / imagen / gpt-image 등 **파트너(비 Firefly-native) 모델은 IP 면책 없음** → **최종 판매물(발행 자산)로 사용 금지**. Firefly-native(firefly-image-4/4-ultra/5, 유료 플랜 면책)만 판매물 허용. firefly-generate.ts는 api 모드에서 파트너 모델을 manual로 강등해 자동 발행 경로에서 배제(주석 반영).

**근거**: docs/research/TOOL_ECOSYSTEM_MANUAL_2026-06-04.md + 빌더 하이브리드 대수술 STEP5. 2026-06-05 보강(Claude Design 슬롯 편입·AEM 재연결 정정): docs/handoff/HANDOFF_claude_design_slot_aem_2026-06-05.md.

---

## 작업원칙 #49 — Desktop 핸드오프 직접 write 인계 (2026-06-04 명문화, 손품 제거)

**배경**: 기존 핑퐁은 Desktop이 핸드오프 작성 → 대표가 다운로드 → Claude Code에 업로드(첨부)하는 사이클로, 매 핑퐁마다 대표 수작업 발생.

**실증(2026-06-04 Desktop)**: Filesystem:write_file로 docs/handoff/에 한글 핸드오프 직접 작성 → read 재검증 결과 한글·특수문자(·, ★, →)·따옴표 깨짐 0 확인. 다운/업로드 사이클 불필요 입증.

**규칙**: Desktop → Code 인계 시, Desktop은 핸드오프 MD를 docs/handoff/에 Filesystem:write_file로 직접 작성한다. 대표는 Code에 "docs/handoff/{파일명} 정독" 한 줄만 전달(다운/업로드 0).
- **적용 범위**: 핸드오프/인계 문서(일회성). Desktop write_file = 전체 작성(overwrite)이라 안전.
- **제약(불변)**: 큰 추적 MD 5종(PROGRESS/ROADMAP/SESSION_LOG/TASK_BRIDGE/CLAUDE) 및 PRINCIPLES_LEARNED 등 누적형 한글 MD의 부분 편집은 여전히 Code의 Python full-overwrite(#29b 불변 — Desktop이 큰 파일 전체 덮어쓰면 기존 내용 유실 위험).
- **git**: Desktop write 파일은 git 미추적 → Code가 작업 turn에 git add/commit으로 보존.
- **역할 분담**: Desktop=핸드오프 직접 쓰기 / Code=큰 추적 MD 반영 + git 보존.

**근거**: docs/handoff/HANDOFF_principle49_publish_handoff_2026-06-04.md §0.


## 작업원칙 #50 — 신규 테이블 의존 코드는 migrationPending 가드로 역순배포 안전화 (2026-06-06 학습, Phase 1 asset_jobs)

**문제**: 새 DB 테이블(asset_jobs 등)을 읽는 코드를 마이그레이션 적용 전 push하면, production에서 테이블 부재(Prisma P2021)로 런타임 에러. 그러나 마이그레이션 선행(commit 보류) → push 순서는 두 환경 핑퐁(#41)에서 직렬 대기를 강제해 느림.

**규칙**: 신규 테이블을 읽는 라우트는 P2021/relation-does-not-exist를 catch해 `{migrationPending:true}` 등 안전 응답으로 degrade한다. 그러면 (a) 코드 push가 마이그레이션보다 먼저여도 production 무중단(위젯은 '준비 중' 표시), (b) Desktop이 Supabase apply_migration 적용 시 자동으로 정상 표시 전환. 마이그레이션 SQL은 docs/handoff/에 박제(단일 소스, prisma/migrations는 gitignore).
- **적용 범위**: 신규 테이블 read 경로(집계/조회 API). 신규 테이블 write 경로는 마이그레이션 선행 필수(쓰기는 degrade 불가).
- **검증**: 가짜 초록 금지(#46) — migrationPending은 '데이터 없음'이 아니라 '준비 중'으로 명시 표시.

**근거**: 본 세션 /api/products/asset-jobs-matrix가 P2021 가드로 a55976b/e9a6c95 push를 Supabase 마이그레이션보다 먼저 안전 배포.


## 작업원칙 #51 — 제품교체 B안: 실제 제품 누끼 고정 + 배경만 AI (2026-06-06 대표 확정)

**규칙**: AI 생성 이미지의 "상상 제품"을 실제 제품으로 교체(재생성/채우기 swap)하지 않는다. 실제 제품 누끼를 고정하고 배경/무드만 AI로 생성해 레이어 합성 + 빛 정합한다. 라벨·텍스트·형태 왜곡 0.
- **근거**: Adobe/Google 공식 문서가 재생성 시 라벨·텍스트 보존 미보장 + 소비자 71% '실물 불일치' 반품(Salsify). 라벨 유리병(명화 등)은 재생성 시 라벨 왜곡 = 전환↑ 노리다 반품↑ 자충수.
- **대표이미지 = 흰배경 누끼만**(네이버 2024-10-28): 라이프스타일 합성컷은 상세/추가 전용. 코드 가드 = naver-normalize.ts assertWhiteBackground(4모서리 luma/chroma) + assertRepresentativeAssetKind.
- **방향전환 트리거**: 라벨 왜곡 클레임/네이버 제재 1건 → 흰배경 누끼 회귀.

## 작업원칙 #52 — 브라우저 반자동 핸드오프: detect→deliver→resume (2026-06-06)

**규칙**: 대표가 로그인 Chrome 환경을 열어두면 AI(Claude in Chrome)가 이어받되, 비가역·고위험·봇차단 단계는 사람이 한다.
- **사람**: 로그인/MFA, CAPTCHA, 로컬 파일 업로드, 다운로드 확인, 결제·발행 비가역 클릭, 최종 품질 승인.
- **AI**: 프롬프트 입력, 생성 클릭, 변형 선택, 내비게이션, 상태 폴링, 로그 읽기.
- **패턴**: AI가 인증벽/업로드 지점 감지→일시정지(awaiting_human) → 앱이 '지금 이 작업 하세요' 알림(딥링크) → 사람 해결 → AI가 폴링으로 완료 감지→재개(human_done→in_progress). 높은 핸드오프 비율 = 실패가 아니라 자기 한계를 아는 견고함. (잔여 프롬프트 인젝션 11.2% → 비가역은 사람.)

## 작업원칙 #53 — 도구 적재적소 (각 프로그램 장점 최대 활용, 2026-06-06 대표 확정)

**규칙**: 단계별 최적 도구로 분담한다. Firefly=생성(면책 경로) / Photoshop=정밀 누끼·레이어 합성·빛 정합(Harmonize) / Adobe Express=브랜드 마감·Bulk Create 대량변형·리사이즈 / Sharp=네이버 규격화(서버 자동) / Claude Design=시안·관제탑. 이미지 생성은 면책/크레딧 불문 최고 품질 모델(단 판매물 상업 사용권은 발행 전 확인 — 파트너 모델은 참조 외부 전송 주의, Firefly 네이티브가 명확).


## 작업원칙 #54 — 적용 현황 항상 명시 (application status visibility, 2026-06-08 대표 상시 요구)

**규칙**: 무엇이 실제 라이브인지 추정 금지(#45 실측우선). 모든 세션 보고에 "앱 적용 현황" 블록을 항상 포함하고, 상품별로 3구분 명시한다: **LIVE(production 실측) / DB-only(가역 반영) / 미적용(pending)**.
- **시스템화(채팅 의존 탈피)**: 관제탑/스튜디오에 상품별 "적용 현황 인디케이터"(필드 4종 = attributesApplied / mainImageApplied / detailApplied / publishState)를 내장해 앱에서 상시 가시화. 컬럼 부재 가드(#50), 전상품 동작, 텍스트 잘림 0, 레드 금지(75/15/10 — LIVE 초록/DB-only 뉴트럴/미적용 점선).
- **근거**: 과잉/누락 작업 방지(ROI). 권위: docs/decisions/2026-06-08-always-state-status-and-universal.md.

## 작업원칙 #55 — 전상품 범용 (product-agnostic, 2026-06-08 대표 상시 요구)

**규칙**: 신규 작업은 출시 전 범용화(상품 불문 동작) 선행. 명화 = 검증 케이스일 뿐 특수 경로 아님. 명화 전용 일회성 금지.
- **전상품 공통 대상**: 크롭 표준(주제 완전포함+프레이밍) · 아틀리에/스튜디오 UI · 발행 파이프라인 · 이미지 전략 · 라인 엔진 · 적용 현황 인디케이터.
- **이미 범용 확인**: T5 파이프라인 수렴 · THUMBNAIL_CROP_EDIT_STANDARD · 2026-06-07 crop-full-subject-containment · KKOTIUM_DESIGN_SYSTEM · 라인 엔진(quality_reasons.line). 권위: docs/decisions/2026-06-08-always-state-status-and-universal.md.


## 작업원칙 #56 — 개입 자연스러움 (smooth human-in-the-loop, 2026-06-08 대표 지시)

**규칙**: 대표 개입이 필요한 모든 지점은 앱이 자연스럽게 surface한다(숨김·추측 강요 금지). 권위: docs/design/OPERATOR_SYSTEM_BLUEPRINT.md §3·§4.
- **개입 대기열(Operator Action Queue)**: 전상품을 가로지르는 단일 surface. "지금 무엇이·어느 상품에·왜 필요한가"를 카드로 노출. 4분류 = AUTO(자동 진행·초록) / INPUT_DECISION(입력·결정·앰버) / GO_PENDING(비가역 발행 GO 대기·레드) / AUTH(외부 인증·일시정지). 데이터 원천 = control-tower-engine의 nextAction+applyStatus+게이트 파생(신규 컬럼 0).
- **순서 강제 0**: 기능은 상황에 따라 융통적으로 사용. #54(적용현황 상시=결과축)·#55(전상품 범용)와 한 쌍(개입 대기열=행동축).
- **자동/반자동 경계**: 비가역·인증·창작 판단은 대표; 그 외 의존성 없는 기술작업은 앱/Code가 완결 후 보고.
- **레드 스코프**: GO_PENDING(비가역 GO) + 1차 액션(메인 지정)만 레드. 보조 CTA(프롬프트 복사 등)는 뉴트럴(75/15/10).


## 작업원칙 #57 — 누끼 소스 = 실촬영 히어로컷 + 투-트랙 합성 (2026-06-09 대표 확정)

**규칙**: 상품 누끼·합성컷의 소스는 항상 공급사 실촬영 단품 히어로컷(상세페이지의 크고 선명한 실사진)에서 따다. 작은 변형 카드컷·텍스트 섞인 컷·저해상 썸네일 금지(평면·그래픽·잘림 원인). 명화 = 검증 케이스(전상품 적용 #55).
- **완전 포함**: 캡·병·라벨 잘림 0(완전포함 원칙·T6 가드). 합성 = 빛·그림자·재질 살아있는 입체감 유지(평면 금지).
- **투-트랙 추가이미지 전략**: (1) 정보형 = 흰배경/린넷 새배경 합성(라벨 또렷이, 추가이미지 상단 2~3번) / (2) 감성형 = Firefly 포토리얼 무드(차량·골든 홈, 전환 유도 히어로). 정보·감성 역할 분담 → SEO+전환 동시.
- **배경 톤 = 라벨과 호응**: 인상주의 자연·풍경 라벨 → 따뜻한 우드+린넷+은은한 식물그림자. 차갑거나 화려한 배경 금지(라벨 충돌).
- **도구**: 누끼=Adobe MCP image_remove_background(복구됨) / 새배경=앱 sharp 즉시 / 포토리얼 무드=Firefly 웹UI 브라우저(#52, 파일드롭·생성클릭=대표). compositing/gen-bg는 Adobe MCP 영구 미지원.
- **앱 적용**: C-7 apply-composite(extra_images 슬롯)·C-8 멀티슬롯 매니저에 본 표준 반영. 합성 소스 선택 UI에 '실촬영 히어로컷' 우선 표기. 권위: HANDOFF_myeonghwa_composite_recipe §4.


## 작업원칙 #58 — 제품 정체 우선 검증 (2026-06-11 학습, 명화 리드목업 사고)

**규칙**: 이미지 작업(누끼·합성·상세) 전 **공급사 실상세(detail-source)로 진짜 제품을 먼저 육안 확정**하고 MD에 제품정체 1줄 박제. Supabase/생성폴더의 기존 이미지를 제품으로 가정 금지(AI목업 혼입 함정 — 명화 리드목업 사고). 전상품 영구구조(#55). 권위 = docs/playbook/CUTOUT_HERO_STANDARD.md·HANDOFF_2026-06-10_PRODUCT-IDENTITY-RECOVERY.md.

## 작업원칙 #59 — 산출물 영구화 (2026-06-11 학습, 끊김 방지)

**규칙**: 누끼/합성/실소스 산출 즉시 ①프로젝트 `assets/generated/{pid}/cutout|composite/` ②Supabase `{pid}/cutout|composite/` **양쪽 적재**. Claude 환경/다운로드만으로 두면 유실(세션 끊김 원인). MCP는 Storage 업로드 불가 → Supabase 적재는 Code 1스텝. 전상품(#55).

## 작업원칙 #60 — 세션 진입 시 HEAD 대조 후 pull (2026-06-11 제안, EOD 드리프트 방지)

**규칙**: 새 세션 진입 시 **Vercel production HEAD vs 로컬 HEAD를 먼저 대조** — 다르면 편집 전 `git pull`. (EOD 핸드오프가 production보다 뒤처진 사례를 #45가 적발 → 본 원칙으로 사전 차단.) STEP 0 환경 점검(verify-vercel-deploy)과 정합.

## 작업원칙 #61 — 합성 표준: 상품진실 앵커 + 3-Plane 리얼리즘 + ≥2무드 (2026-06-11 대표 확정)

**규칙**: 본품 무드 합성은 상품의 **실측 비율·형태에 충실**하게(과대·왜곡·잘림 금지 = "상품진실 앵커"), 스튜디오 촬영처럼 **현실감 있게**(3-plane 후경/중경/전경·접지그림자·키라이트), **상품마다 ≥2 무드**(사용맥락 + 스튜디오 정물). 전상품 합성 표준(#55). 권위 = docs/design/ADAPTIVE_COMPOSITE_ENGINE.md.
- **상품현실시트**: 합성 전 상품별 실측 비율/용량/형태/소재/핵심셀링 시트 작성(과대 차단 앵커).
- **누끼 진실성**: 레퍼런스 누끼가 실제 본체 형태·비율과 일치(불일치 시 재누끼). 명화 #2(9T0) 폐기 = 형태오류(클립)·과대 → 본 원칙으로 차단.
- **생성=Firefly·결정적변환=코드**: 자연 합성은 Firefly Nano Banana Pro(3-plane), harmonize/normalize/접지는 sharp. Pillow 기계겹침 폐기. (#52·#53·#57 재확인)
- **앱 적용**: finish-image(C-3)·apply-composite(C-7)·개입카드(C-9)·스튜디오 마무리 카드(C-5)가 본 표준 소비.
- 번호 정합: #58(제품정체 우선)·#59(산출물 영구화)·#60(세션 HEAD 대조) 정식 등재 완료(갭 해소).

## 작업원칙 #62 — 교차뷰 리페치 브로드캐스트 (2026-06-12, SWR/plain-fetch 환경)

**규칙**: 한 뷰가 상품 이미지 상태(대표/추가/아카이브)를 바꾸면 같은 상품을 띄운 타 뷰(스튜디오 헤더·캔버스·상세)가 즉시 리페치해야 한다. 앱은 React Query 부재(SWR/plain-fetch) → 라이브러리 무관 window CustomEvent(`kkotium:product-mutated`) 브로드캐스트로 구현(src/lib/events/product-mutated.ts). 액션 측 broadcast → 구독 측 refetch. SSR 안전(window 가드).

## 작업원칙 #63 — 실사용 브라우저 테스트 통과 후 다음 작업·가짜보고 절대 금지 (2026-06-12 대표 확정)

**규칙**: 기능 "완료"는 실사용 브라우저 테스트 통과가 조건. Desktop이 preview 인증벽(Vercel Deployment Protection)으로 검증 불가 시 → (a) 병합 후 production에서 테스트 또는 (b) 대표 점검 요청. **절대 가짜보고 금지** — 미검증을 "검증완"으로, 미표시를 "표시"로 기록 금지. 발견된 미해결(예: /assets composite 미표시)은 그대로 노출. #44(stale fact 갱신)·#45(출력 fact-check) 강화.

## 작업원칙 #64 — 등록 시 공급사 권위원본에서 fidelity card 자동생성 (2026-06-12 대표 확정)

**규칙**: 모든 상품은 등록 시 공급사 권위 원본(실상세·#58)에서 충실도 카드(Product.fidelity)를 자동생성한다 — 향(scents)·부속(components)·마운트(mountType/mountMechanic)·금지데코(decorForbidden)·promptInject. 카드는 이미지 프롬프트 주입 + 발행 게이트(fidelity_check/mount_check)의 권위. 권위 PRODUCT_REGISTRATION_WORKFLOW.md·ADAPTIVE_COMPOSITE_ENGINE.md §11. 전상품(#55).

## 작업원칙 #65 — Firefly 수동 드롭은 임시·Firefly Bridge 수렴 (2026-06-12 방향)

**규칙**: 현행 Firefly 참조 슬롯 수동 드롭(#52)은 과도기. 목표 = Firefly Bridge가 reference/ 스테이지 자동로드 + 생성 자동구동, 운영자 개입은 "당선작 픽(최종 선별)"으로 수렴. 전자동화 전까지 수동 드롭 유지하되 reference/ 적재·STAGE_NAMING로 자동화 준비.

## 작업원칙 #66 — 스토리지 list 진단 5단 격리 (2026-06-12 학습, /assets composite=0 근본원인)

**규칙**: `/assets` 등 스토리지 표시 이상 시 추측으로 production env/키를 먼저 건드리지 않고 5단 격리한다 — (a) storage.objects 데이터 SQL 전컬럼 비교, (b) storage.search/search_v2/list_objects_with_delimiter를 service_role로 직접, (c) storage-api REST를 실제 키·body 변형으로, (d) 배포소스 GitHub raw diff, (e) 배포 클라이언트(storage-js) 정확버전 설치 후 collect() 복제. 각 계층을 무혐의/혐의로 분리한 뒤 단일 미통제 변수(런타임)를 계측(probe)으로 확정. #45(출력 fact-check)·#63(가짜보고 금지) 연속.

## 작업원칙 #67 — storage list trailing-slash 자가치유 (2026-06-12, 전상품 방어)

**규칙**: nested prefix `.list()`가 비-빈 폴더에 0행을 반환할 수 있음(클라이언트/키/런타임 조합 특이). no-slash 0행 → trailing-slash 1회 재시도 = 전상품 표준 방어(자산 무음 누락 0). 0행일 때만 동작하므로 정상결과 불변(automation-storage.ts listProductAssets.collect). 권위 HANDOFF_2026-06-12_composite-rootcause-probe. 라이브 검증완 2026-06-12(세션6-c) — composite 0→9 3-tier(/assets x-vercel-cache MISS·SQL storage.objects 1:1·/studio 에셋탭 9썸네일 naturalWidth>0). 근본원인=no-slash list버그 확정·자가치유 영구복구.

## 작업원칙 #68 — production env 정합 게이트 (2026-06-12)

**규칙**: 로컬 .env와 Vercel env의 키 drift가 "코드·DB는 정상인데 production만 이상"의 원인이 될 수 있음. 신형 sb_secret_ 키 마이그레이션 시 Vercel env 동기화 필수. 진단 시 probe로 env.keyPrefix/keyLen을 노출해 drift를 직접 판정(추측 금지).

## 작업원칙 #69 — 인계 in-chat 박제 · 누락0 연속성 (2026-06-12 대표 확정)

**규칙**: 모든 작업 종료 시 인계 메시지를 채팅 응답 본문에 누락 없이 정리한다(파일에만 두지 않음). 포함: Target Session·Branch·다음 1액션·검증절차·코드패치 위치·세션요약. 운영자=paste-mediator → 채팅에서 바로 복사·착수 가능해야 함. CLAUDE.md 작업원칙 섹션 + PRINCIPLES_LEARNED 양쪽 박제.

## 작업원칙 #71 — 진짜 예술은 진짜로 (Authenticity Realism Lane) (2026-06-13 세션7-g, 전상품)

**규칙**: 모든 자산 슬롯은 사실성 레인으로 태깅한다. **AUTHENTIC-ART**(제품 라벨·브랜드 스토리 S5) = 퍼블릭도메인 실제 작품만(실제 명화 reproduction·진짜 모네). **PHOTOREAL**(히어로·라이프스타일·향 씬·합성·썸네일·추가이미지) = 실사 카메라 촬영 품질, AI 유화/회화/페인터리 마감 전면 금지. 명화 컨셉은 라벨(실제)+S5 스토리(실제 모네)가 짊어지고, 향 씬·히어로·합성을 AI 유화로 칠하면 컨셉이 사는 게 아니라 AI 이질감만 생겨 신뢰가 깎인다. 비명화 상품은 AUTHENTIC-ART 레인이 비어도 PHOTOREAL 룰(회화 마감 금지)을 보편 적용(#55). 앱 개입점 = 사실성 레인 가드(asset 슬롯 realism_lane('authentic_art'|'photoreal') 파생 + PHOTOREAL 슬롯 회화마감 경고, 기존 fidelity_check/main_image_white_bg 가드 동형·강제모달 0 #56). 전거 docs/playbook/SCENT_MOOD_4SCENE_GRADE_2026-06-13.md §0·§7, docs/design/SCENT_MOOD_BACKGROUND_SYSTEM.md, 스펙 docs/design/REALISM_LANE_GUARD_SPEC_2026-06-13.md.

## 작업원칙 #74 — Firefly programmatic 프롬프트 주입 유지 가능 (SUPERSEDE, 2026-06-13 실측)

**규칙**: Firefly programmatic 프롬프트 주입은 shadow-walk 노드 포착 + native 프로토타입 setter+InputEvent면 유지됨(stuck 실측). 구#74의 '폐기'는 단순 el.value= 방식 한정. blob 결과는 fetch->arrayBuffer로 추출 가능(image/png 검증). 구체: Firefly SPA는 353 Shadow DOM 호스트로 캡슐화되어 top-level querySelector는 0이지만 shadow root 재귀 관통으로 textarea·생성·다운로드 버튼·결과 이미지(4컷 1376x768) 전부 포착. native setter+InputEvent 주입은 React/Spectrum 내부 상태에 반영되어 값 유지(stuck:true). 결과 blob은 fetch->arrayBuffer->base64로 바이트 추출(2.45MB·시그니처 89504e47 유효). 적재 catch-basin = POST /api/products/[id]/ingest-firefly(base64->uploadAutomationAsset->{pid}/{stage}/ + asset_registry 인테이크, 비가역 0·네이버 무접촉, 전상품). 개입카드 firefly_drop->firefly_auto 확장(탭 열림 감지 시 '자동 생성 가능' 표시·강제모달 0 #56). 생성 트리거·폴링은 Desktop 1컷 실측서 확정(크레딧 소비). 근거 docs/playbook/FIREFLY_AUTOMATION_PLAYBOOK_2026-06-13.md. 보완 #75(Scene-first 3-Layer 합성 표준).

## 작업원칙 #77 (정정판) — Firefly 모드 가드: view=edit 워크스페이스는 안전, ACTIVE 마스크/선택영역/참조잠금만 ABORT (2026-06-13 정정, 전상품)

**규칙(정정)**: `view=edit` 편집 워크스페이스 자체는 위험이 아니다. 마스크가 없고 전체 캔버스가 생성 타겟이면 `생성` 클릭은 새 풀생성으로 작동(허용). 진짜 위험 = **ACTIVE MASK / 선택영역 / 참조 잠금(부분 인페인)** 활성일 때만. 따라서 가드는 `edit-locked-ABORT`(maskActive || refLoaded>0)만 중단하고, `generate`·`generate-in-edit-OK`(편집 워크스페이스 진입했으나 마스크 없음=풀생성 안전)는 진행한다. ※ 1차판(세션7-c, '편집도구 버튼 존재=편집모드') 오탐 정정 — 편집도구 버튼(새로 편집·마크업·디테일 조절·업스케일)·대형 단일 표시이미지는 편집 워크스페이스 신호일 뿐 ABORT 사유 아님(상시노출 오탐). 실측 근거: 5컷 배치 maskActive=false + perceptual hash minHamming 19/64(전부 distinct)=정상 풀생성, 시각 확인도 5컷 전부 프롬프트 일치 별개 씬. 통합 규칙: 단건·5컷 루프 매 iteration `kkSetPrompt` 직전 `kkAssertGenerateMode()` 호출 → `edit-locked-ABORT`(마스크/선택영역/참조잠금)만 중단+개입알림, `generate`·`generate-in-edit-OK`는 진행. 사후 perceptual hash(minHamming<10=오염) 보강 유지. 앱 연동(기박제, 중복 금지): firefly_auto 개입카드 payload.generateModeConfirmed 게이트(미확인=검증대기·강제모달 0 #56·전상품 #55). 전거 docs/playbook/FIREFLY_GROUNDING_AND_QUALITY_UPGRADE_2026-06-13.md §1.2~1.4 (PLAYBOOK §8.3 supersede).

**검증판 kkAssertGenerateMode (§1.3 그대로 인용)**:
```js
function kkAssertGenerateMode(){
  const seen=new Set();
  let genBtn=false, newEditBtn=false, markupTools=0, refLoaded=0, maskActive=false, dom=null;
  (function w(root,d){ if(!root||d>14)return; let ns; try{ns=root.querySelectorAll('*');}catch(e){return;}
    ns.forEach(el=>{ if(seen.has(el))return; seen.add(el);
      const tag=el.tagName?el.tagName.toLowerCase():'';
      const lab=((el.innerText||'')+' '+((el.getAttribute&&el.getAttribute('aria-label'))||'')).trim();
      const cls=(typeof el.className==='string'?el.className:'')||'';
      if((tag==='button'||(el.getAttribute&&el.getAttribute('role')==='button'))&&(el.offsetWidth||el.offsetHeight)){
        if(/생성|generate/i.test(lab)) genBtn=true;                          // FIX: no ^$ anchor
        if(/새로 편집|new edit/i.test(lab)) newEditBtn=true;
        if(/마크업|markup|디테일 조절|detail adjust|업스케일|upscale/i.test(lab)) markupTools++;
      }
      if(tag==='img'&&el.naturalWidth>200&&(el.offsetWidth||el.offsetHeight)){
        const r=el.getBoundingClientRect();
        if(!dom||r.width*r.height>dom.dw*dom.dh) dom={dw:Math.round(r.width),dh:Math.round(r.height)};
        if(/reference|참조|composition|구도|base/i.test(cls+lab)) refLoaded++;
      }
      if(/mask|마스크|선택 영역|brush|브러시|selection/i.test(cls+lab)&&(el.offsetWidth||el.offsetHeight)) maskActive=true;
      if(el.shadowRoot) w(el.shadowRoot,d+1);
    });
  })(document,0);
  const dominantOpen = !!(dom && dom.dw>=500);
  // SAFE to generate even in edit workspace IF no mask/region/reference lock:
  const partialEditLock = maskActive || refLoaded>0;
  const editSession = newEditBtn || (dominantOpen && markupTools>=2);
  const mode = partialEditLock ? 'edit-locked-ABORT'
             : genBtn ? (editSession ? 'generate-in-edit-OK' : 'generate')
             : 'ambiguous';
  return { mode, genBtn, newEditBtn, markupTools, dominantOpen, refLoaded, maskActive };
}
```
- 실측 검증: 라이브 편집상태에서 newEditBtn=true·markupTools=3·dominantOpen=true·maskActive=false → generate-in-edit-OK(풀생성 안전). 마스크 활성 시 edit-locked-ABORT.

## 작업원칙 #72 — 자동재시도 타이머 절대 금지 (2026-06-14 세션7-h 학습)

- setTimeout/setInterval로 생성을 자동발사하지 않는다. 크레딧 소모 + 레이트리밋 쿨다운 무한 리셋 = Firefly 차단의 실제 원인.
- 생성은 항상 단발 수동 트리거. 레이트리밋("사용 문제/나중에 다시 시도")은 요청 0 + 실제 시간 경과만이 해제(두드리면 쿨다운 리셋되어 악화). 크레딧 정상이어도 발생(횟수 기반 단기 throttle).
- 전거: docs/playbook/ADAPTIVE_IMAGE_ENGINE_AND_FOLDER_SYSTEM_2026-06-14.md §6.

## 작업원칙 (이미지 엔진 보강 3종) — 2026-06-14 세션7-h

- **(a) 편집모드 비율컨트롤 부재 → 파이프라인 정규화로 해결**: Gemini/Nano Banana 편집모드엔 종횡비 UI가 없다(DOM 실측 ratioControls=[]). 생성단계 통제는 약함 → Sharp 슬롯비율 정규화(conformToSlotRatio, 향씬 4:5·대표 1:1)가 본질적 2층 방어. 적재/사용 전 강제, 적재 경로 둘 다(/assets/upload·/ingest-firefly) 보강. 2% 허용오차 게이트(순응 자산은 무재인코딩 통과).
- **(b) 레거시 백필 = 시스템 개선(단건 버그 수습 아님)**: 발견 오류는 단건 수습이 아니라 전상품 확장. 평면 레거시 자산은 kindForSource로 분류 후 {pid}/{kind}/ 이동(COPY→DB갱신→검증→retire). move-then-update 절대 금지(라이브 URL 중간 404 방지)·멱등(서브폴더 소속 스킵)·이중게이트(--go --confirm).
- **(c) 비상품 네임스페이스 제외**: common/·lifestyle/ = 안정 URL·비상품 → 백필·재분류 영구 제외. 스코프 게이트 = Product 테이블 멤버십.

## 작업원칙 #73 — UI 작업 기본전제 3종 (2026-06-14 세션7-i 학습)

모든 UI 작업의 기본 전제. 위반 = 재작업.

- **(a) 직관 우선·과밀 금지**: 화면은 한눈에 이해되어야 한다. 탭/카드/컨트롤 과밀 금지 — 정보는 작업 단계로 묶고 한 화면의 결정 수를 줄인다. 추론 결과는 확신도·품질경고로 투명하게(블랙박스 금지).
- **(b) 한글 우선 라벨**: UI 표면 문구는 한글 우선. 음차(스테이지·플레이트·레퍼런스·레거시 등) 금지 — 자연스러운 한국어로(단계·배경판·참고 이미지·이전 방식). 코드 내부=영어 식별자 유지(§3-1), 표면=한글. 유지 가능 외래어=정착 용어(누끼·합성·SEO·AI·ZIP·Firefly). ko.json 음차 sweep 의무.
- **(c) 작업 여정 정합**: 정보구조(IA)는 사용자의 실제 작업 여정 순서를 따른다. 워크벤치 = 상품 분석 → 이미지 → 발행. 기능 나열이 아니라 여정 단계로 그룹핑. 기존 동작 폴백 유지(회귀0).

## 작업원칙 #78 — 콘텐츠 신호는 채널 존재가 아닌 실제 상태로 판정 (2026-06-14 세션7-i 검증 BUG)

메타데이터 플래그의 '존재'를 의미로 단정하지 않는다 — 실제 픽셀 '상태'로 확증한다.

- **알파 채널 존재 ≠ 투명**: canvas/Firefly/디자인툴 PNG는 불투명이어도 RGBA(4채널). `hasAlpha`를 cutout(누끼) 신호로 쓰면 전 PNG 오분류. 실제 투명 = `hasAlpha && sharp(buf).stats().isOpaque === false`(투명 픽셀 존재). 불투명 RGBA → 신호 무시·비율 폴백.
- **사각지대 교훈**: 스모크가 '알파有·불투명 PNG' 케이스를 누락(PNG=JPEG 동일 치수 대조로 적발). 신호 교정 시 실이미지(sharp 생성)로 PNG/JPEG 양쪽 재검증 의무. #73(직관우선) 검증완료 — 투명 사유 칩 표시로 분류 근거 투명화. #45(출력 fact-check)·#63(가짜보고 금지) 연속.

## 작업원칙 #79 — DB ref 일괄 치환/감사는 하드코딩 컬럼리스트 금지 (2026-06-15 백필 dangling 적발)

스토리지 URL/키를 DB에서 일괄 치환하거나 dangling을 감사할 때, **하드코딩한 컬럼 목록을 쓰지 않는다** — jsonb·중첩 필드를 반드시 누락한다(사례: quality_reasons).

- **EXHAUSTIVE 판정**: 전체 row를 fetch해 모든 컬럼의 JSON 표현(또는 `to_jsonb(row)::text`)을 전수스캔. 변경된 컬럼만 write-back. 자가검증(잔존 ref=0)도 동일한 전수스캔으로. 대상은 Product 전컬럼 + 연관 테이블(asset_references·published_assets·asset_registry) 전부.
- **치환 안전규칙(dangling-only)**: depth-2 원본이 storage서 사라졌고 정규 키가 존재할 때만 치환(정규 미존재=orphan은 날조 금지·보고). 캡처 후 교정·dry-by-default·멱등. #45(출력 fact-check)·#46(비가역) 연속. 'dangling 0' 같은 단정은 전수스캔으로 입증된 뒤에만.

## 작업원칙 #80 — force-dynamic ≠ Data Cache 무효화; server SDK fetch는 no-store 주입 (2026-06-15 /assets STALE)

라우트 `dynamic='force-dynamic'`는 렌더를 동적화할 뿐, 서버 SDK(supabase-js 등) 내부 `fetch`가 Next Data Cache에 잔류하는 것을 막지 못한다(배포로도 미소거 — Data Cache는 deploy 비종속).

- **근본 차단**: out-of-band로 바뀌는 자원(스토리지 리스팅 등)을 읽는 운영자용 SDK 클라이언트에는 `global.fetch`로 `cache:'no-store'`를 주입한다. 라우트엔 `fetchCache='force-no-store'`+`revalidate=0`을 방어층으로. 'force-dynamic 걸었으니 라이브'라는 가정 금지 — 실앱서 stale 입증되면 SDK fetch 층을 의심(#45 출력 fact-check·#28 production source-of-truth 연속).

## 작업원칙 #81 — 드리프트는 상시감지·개입점화한다 (2026-06-15 #80 후속 시스템 가드)

무결성 격차가 '사람이 화면을 봐야' 드러나면 이미 늦다(stale-listing 사고 #80). 라이브 소스 기준 자동 점검 → 이상 시 개입점으로 자연 노출한다.

- **패턴**: (1) 라이브 소스(no-store 리스팅)로 상품별 무결성 점검 → (2) 이상 시 control-tower 개입 대기열 카드 시드(멱등·best-effort·강제모달0 #56), 정합 OK면 카드 클리어 → (3) 1클릭 교정(비가역은 confirm 게이트 #46·원본 archive 백업) → (4) cron 상시 스윕으로 out-of-band 변동까지 포착. 점검은 read-only/다운로드0 우선(외부 image API 0·#37). #80(stale 근본수정)의 시스템 확장.

## 작업원칙 #82 — 최대 직접 자동화 (Maximize Direct Automation) (2026-06-16 세션8)

진정으로 불가능하지 않은 한 Claude가 직접 실행한다 — 설정 포함. 운영자 핸드오프는 정말 불가능할 때만.

- **직접 실행 우선**: 비율/해상도/토글/클릭 등 설정 표면도 실제 클릭 커넥터로 직접 처리. 운영자에게 토스 = 진짜 불가능 입증 후 최후수단. 완료 후 사후보고(허락 요청 0).
- **날조 금지**: 직접 못 하면 거짓/추정 라벨 금지 — 솔직히 "불가능, 운영자 클릭 필요"라고 물어본다(#46 가짜라벨 금지 연속). 폴링(상태 확인)은 OK, 재생성 자동 재시도는 금지(#72 크레딧 보호).

## 작업원칙 #83 — 편집모드 참조 오염은 매 컷 클리어로 차단 (2026-06-16 세션8 근본원인)

Firefly 편집모드는 생성물이 자동으로 참조(0/N→1/N)에 붙어 다음 생성을 오염시킨다 — "April·Cotton이 비슷"했던 근본원인.

- **가드 `referenceCleared`**: 매 컷 생성 직전 참조 0/N 확인. 직전 생성물이 참조로 잔류하면 '새 이미지(+)' 버튼으로 클리어 후 생성. 첫 생성은 자연히 0/N.
- **전상품 시스템**: 4컷 이상 연속 생성하는 모든 상품에 적용. firefly_auto 카드 subcheck로 노출(#56 자연 개입). 상세: `docs/design/MOOD_CAMERA_SPEC_SYSTEM.md` §7.

## 작업원칙 #84 — 단일 디폴트 카메라 영구 금지; 무드 6축 시스템 (2026-06-16 세션8 근본원인+리서치)

v5 템플릿이 4향 전부에 Sony 1종을 하드코딩 → "전부 소니" 근본원인. 상품 무한·무드 유한(6축)으로 분류, 무드별 카메라 다르게·그레이드는 통일.

- **가드 `cameraVarietyApplied`**: 배치 내 카메라 스펙이 무드별로 달라야 통과(단일 디폴트면 RED). 무드=전환 기능 기준 6축(M1 신뢰/M2 욕망/M3 명료/M4 코지/M5 발랄/M6 프리미엄), 각 축에 카메라/렌즈/조명/벤치마크DNA 매핑.
- **전상품 시스템**: 처음 보는 상품도 무드 채점→스펙 조회→조립→생성(상품별 코딩 0). 권위 문서 `docs/design/MOOD_CAMERA_SPEC_SYSTEM.md`, 근거 `docs/research/MOOD_TO_CAMERA_SPEC_RESEARCH_2026-06-16.md`.

## 작업원칙 #85 — 트러스티드 클릭 vs 합성 이벤트 구분 (2026-06-16 세션8 확증)

Spectrum 컴포넌트별로 합성 JS 이벤트 수용 여부가 다르다. 잘못 가정하면 클릭이 무시된다.

- **수용/거부 맵**: `SP-BUTTON`(생성)=합성 클릭 존중(JS 생성 가능). `SP-ACTION-BUTTON`(새 이미지)·`sp-picker`(비율)·`sp-switch`(grounding)=합성 무시, 실제 트러스티드 클릭만 인정 → Claude-in-Chrome `find`→ref → `computer` ref 클릭.
- **좌표 금지**: 스크린샷은 가변 윈도우서 스케일 캡처(0.457 비균일) → DOM좌표≠스크린샷좌표. JS getBoundingClientRect 또는 ref 클릭만. 셀렉터 카탈로그: `docs/playbook/FIREFLY_AUTOMATION_PLAYBOOK_2026-06-13.md`.

## 작업원칙 #86 — 제외는 긍정형 표현; Gemini 네거티브 필드 전송 금지 (2026-06-16 세션8 리서치)

Nano Banana/Gemini는 네거티브 프롬프트 필드가 없다(HTTP 400) — "제외가 안 먹혔던" 근본원인.

- **긍정형 작성**: "no cars"가 아니라 "empty street". 제외 = `clean composition containing only the product..., realistic photograph only` + 선언형 `no on-image text, no logos, no human figures, no illustration`. 가드 `exclusionsPresent`.
- **모델별**: Gemini류엔 `negativePrompt` 필드 절대 전송 금지. 디퓨전/Flux 폴백에서만 네거티브 필드 사용. 전상품 프롬프트 조립기 고정 규칙.

## 작업원칙 #87~#89 — 작업 관제탑 체계 (2026-06-16 세션8)

### #87 단일 관제탑 (Single Control Tower)
모든 병행 트랙은 PARALLEL_WORK_TRACKER 상단 라이브 보드 한 곳에만 산다. 보드에 없으면 존재하지 않는 작업(누락 방지). 세션 시작 = 보드 필독 → 지금 큐 top 실행. 세션 종료 = 보드 갱신(상태·다음 1액션) + 변경로그 1줄 + 핸드오프. 우선순위/스케줄 변경은 변경로그에 기록. 파생 큐(지금/결정대기/검증대기)는 보드에서 자동 도출.

### #88 완료=검증 (Done Means Verified)
코드/기능 작업은 실제 브라우저/실측 검증을 통과하기 전 "검증 대기" 상태로 둔다. 검증 없이 "완료" 라벨 금지, 검증 없이 다음 본작업 진행 금지. Code 보고만으로 완료 처리 금지(#45 결합). 실측 불가 시 거짓 보고 대신 대표에게 요청.

### #89 변경 흡수 (Change Absorption)
세션 도중 추가 요청·개선·변경은 즉시 관제탑 보드에 등재 + 우선순위 재산정 후 진행한다. 흐름 보존이 목적 — 대표가 같은 사항을 재언급하지 않아도 누락 없이 이어지게.

## 작업원칙 #90 — 폴백 기본값은 카테고리 중립 + 신호 오발화 가드 (2026-06-17 세션8 #62 배치)
미시드 카테고리의 안전 폴백(emptyCard)은 절대 특정 카테고리 편향을 담지 않는다. 향수 baseline(scent_note/use_install/size_duration)이 기본 슬롯열에 박혀 있어 비향수 전 카테고리(아이스트레이 등)가 향 슬롯을 오상속한 사고 재발 방지. 폴백 = 구조 슬롯만(hero·problem·solution_usp·trust·gift·cta), 카테고리 전용 슬롯은 실 DNA 시드로만 추가. 미시드는 control-tower 'category_dna_unseeded' 개입카드(INPUT_DECISION·idle priority·강제모달0·#56)로 가시화하되, 실작업을 마스킹하지 않게 idle(다음액션 없음)에서만 점화. 신호 휴리스틱(deriveProductSignals)도 오발화 가드: '리필'이 본품동반(bundleAnchor) 또는 giftBiased면 lowInvolvement 미발화 — 본품+리필 번들/선물은 충동소모품이 아니므로 펀들 단축(problem/size_duration 드롭) 금지. 단, 순수 소모품(commodityHard)은 가드 예외(여전히 단축). 매칭 키워드는 JSON(product-signal-keywords.json), 코드 한글 리터럴 0.

## 작업원칙 #91 — Vercel 서버리스 본문 한계 < full-res base64; 적재 기본 = web-JPEG (2026-06-17 IMG-INGEST 실측)
Vercel 서버리스 함수 본문 한계(~4.5MB) < full-res Firefly base64(~7MB) → ingest-firefly의 15MB 가드는 도달 불가(그 전에 HTTP 413). 상세페이지 용도는 web-JPEG(1456px·~330KB)로 충분 — full-res 2K 마스터가 꼭 필요할 때만 Supabase signed-URL 직업로드(서버 본문 우회) 검토. 즉 적재 기본 포맷 = web-JPEG, 2K 마스터 = 예외적 signed-URL. 전상품 #55. 실측: April(composite/fresh-1781657005726.jpg)·Black Cherry(composite/dark_luxury-1781657008705.jpg) web-JPEG 1456×1807 ingest 성공·registered·publicUrl 200.

## 작업원칙 #92 — ingest 검증 3단 레시피 (전상품·#55, 2026-06-17)
ingest(적재) 검증은 3단으로 단정한다: (1) /assets 200 → (2) composite 그룹에 신규 파일 존재 → (3) 이미지 탭 DOM 렌더(최신순 맨앞). 검증경로 = 상품선택 → 이미지탭. 어느 상품이든 동일(전상품 공통 레시피). #45(출력 품질까지 단정)·#88(완료=검증) 결합 — HTTP 200·registered만으로 완료 금지, DOM 렌더까지 확인.


## 작업원칙 #93 — 자산 검증은 storage 물리 + registry DB 양쪽 교차 (2026-06-17 세션9 #62 승격)
자산 정합 검증은 storage 물리 파일과 asset_registry 인덱스를 **양쪽 교차**로 본다. 한쪽만 보면 고아를 놓친다: storage-only(미등록 물리 — 레지스트리 도입 2026-06-13 이전 자산은 전부 여기)·registry-only(파일 부재 등록). 단건 발견 시 전상품 정합성 패스로 승격(#62 적용). 구현: checkProductIntegrity.registryDrift(asset-integrity.ts) — 기존 #80/#81(storage vs DB ref) 위에 registry 차원 가산. **검증(2026-06-17 production 실측)**: 명화 registryOnly=1(botanical-1781410335495.png 파일 부재)·storageOnly composite=9 / 달항아리 storageOnly=9 / 아이스 storageOnly=1 = 3상품 전부 드리프트 = 전상품 공통(단건 아님). advisory — ok 게이트 불변(스턱 카드 0·#56). 고아 reconcile = 운영자 결정(등록 vs 아카이브)=COMPOSITE-CLEANUP 후속.

## 작업원칙 #94 — 스테이지 택소노미는 storage 실측으로 주기 점검 (2026-06-17 세션9)
스테이지 택소노미는 storage 직속 폴더 실측(listProductStageFolders — `{pid}/` 직속 폴더 열거)으로 주기 점검한다. listProductAssets는 STAGE_DIRS만 순회하므로 택소노미에 없는 폴더는 invisible(silent drop) — 진짜 undefined stage는 별도 폴더 열거로만 탐지된다. **단 본 세션 교차검증(#45·#88)**: 핸드오프가 우려한 `plate`는 이미 STAGE_DIRS v2(2026-06-12)에 존재 → undefined 아님. production 실측 undefinedStages=0(전 3상품). 보고를 맹신하지 않고 코드 상수로 교차검증한 결과 — 핸드오프 #94 우려는 코드 레벨 기해소 확인. (가드는 미래 surprise용으로 유지.)

## 작업원칙 #95 — 원산지 진실성: 추측 발행 절대 금지·불일치 HARD BLOCK (2026-06-17 세션9 전상품 #62)
payload origin은 Product 실제 origin(originCode)과 **불일치 절대 금지**. 국산(00)이든 중국(0200037)이든 **디폴트 폴백 금지** — origin 미상 시 추측하지 말고 **발행 HARD BLOCK**. 허위 원산지 = 대외무역법/관세법 법적 리스크. 구현(전상품·전 발행경로 공유): validateForRegistration에 origin 진실 게이트 — originCode 미상/무효 시 errors(canRegister=false → 관제탑 publish track 자동 개입점화 #56), 선행 0 절삭 치유 시 warning(DB 정규값 저장 권고). buildNaverProductPayload/register route의 silent 중국 폴백 `?? '0200037'` 제거 → resolveOriginAreaCode가 빈 origin에 loud throw(last-line defense). **근본 메커니즘**: 구코드 `resolveOriginAreaCode(originCode ?? '0200037')`의 `?? '0200037'`이 빈 값을 중국으로 먼저 치환해 resolveOriginAreaCode의 empty-throw 가드를 무력화 = silent 추측. **검증(production 실측)**: 명화/달항아리 0200037 PASS·canRegister 무회귀(S/94)·payload 0200037(DB 반영) / 아이스 200037 auto-heal WARNING. 옵션도 정합 가드(DB option_rows vs payload combinations 불일치 시 warning, 미로드 경로 skip=오탐0). ★"payload 국산/4" 류 경보는 코드 의심 전 DB 실측 선행(#96 동형).

## 작업원칙 #96 — 엔진/발행 진실원천은 Product 정규 필드, 산출 이상 시 값 먼저 실측 (2026-06-17 세션9)
엔진 카테고리 진실원천 = Product.naverCategoryCode(라벨 product.category 아님·#62 CAT-CODE 정합). 발행 원산지 진실원천 = Product.originCode. **산출/표시 이상 시 코드(빌더/엔진) 의심 전에 DB 값을 먼저 실측**한다. 사례: 세션9 "payload 국산(00)" 경보 → DB 실측 결과 originCode=0200037(중국, 정확) = 경보는 stale 스냅샷, 코드 결함 아님. "옵션 4 vs 3" → DB option_rows=4 전부 ON_SALE(Cotton 품절 의도 미반영=데이터 드리프트, 빌더는 DB 충실 반영). #45(보고 비신뢰·직접검증)·#88(완료=검증) 결합 — 추측 전 그라운드 truth 실측.

## 작업원칙 #97 — 전상품 검증은 시드+미시드 양쪽 (2026-06-17 세션9)
엔진/가드 검증은 **시드된 상품 + 미시드 상품 양쪽**으로 한다. 시드: 카테고리-특화 슬롯/DNA 정상 산출. 미시드: fallback이 **우아하게 degrade**(에러 아님)되고 **카테고리-특화 슬롯을 오상속하지 않음**(ICE-TRAY-DNA 사례: emptyCard 향수편향이 미시드 전 카테고리에 scent_note 오상속 → 중립화 #62/#90). 한쪽만 보면 fallback 오염/누락을 놓친다(#93 storage+registry 양쪽 교차와 동형 — 양면 검증 원칙). REGISTRY-STORAGE-DRIFT/엔진 strategy 검증 시 3상품(명화=시드 / 달항아리·아이스=미시드) 전수 실측이 표준.

## 작업원칙 #98 — 변형(variant) 바인딩 차원: 옵션 상품은 변형별 대표 컷 커버리지 의무 (2026-06-17 세션9 #62 P2)
옵션이 있는 상품(향/색/사이즈)은 **재고 있는 각 변형에 대표 컷을 바인딩**해야 한다. 일시적 mood/slot 태그만으로는 불충분 — 변형 커버리지는 **대기열 표면화 1급 지표**다. 구현(전상품): asset_registry.variant 컬럼(향 옵션 바인딩)·computeVariantCoverage(분모=Product.options jsonb stockQuantity>0=진실원천 #96·분자=variant바인딩 LIVE composite distinct·고아제외)·INTERVENTION_VARIANT_COMPOSITE 카드(INPUT_DECISION·cron 전상품 상시·seed<100%&hasOptions·clear=100%)·ingest-firefly variant param(생성물→바인딩). **검증(2026-06-17 명화)**: active 3(레몬유칼립·에이프릴·블랙체리·코튼 stock0 제외)·covered 0·missing 3 → 카드 0/3. 바인딩 라운드트립 covered 0→1→복원. Desktop 감사 일치(바인딩 계층 filename/schema/data 3중 부재가 근본). 페어: realism_lane 가드(#71)와 묶어 변형 컷 파이프라인을 ingest 시점 사실성 게이트(후속).

## 작업원칙 #99 — 브라우저 검증: element.click() 비신뢰, 풀 MouseEvent 디스패치 (2026-06-17 세션9)
React 핸들러는 `element.click()`로 안정적으로 발화하지 않는다(no-op처럼 보여 거짓 'no bug'/'bug' 판정 위험). 브라우저 검증 시 풀 MouseEvent 시퀀스(pointerdown/mousedown/pointerup/mouseup/click·bubbles:true)를 디스패치한다. 네이티브 window.confirm은 JS를 블록 — 클릭 전 오버라이드하거나 운영자가 취소(비가역 게이트 #46 PASS 확인). 사례: per-orphan reconcile UI 아카이브 버튼 — element.click() 무발화 적발 후 풀 이벤트로 재시도 → 실제 confirm 발화 → 운영자 취소 → mutation 0(드리프트 22/1 불변). #45(직접검증)·#88(완료=검증) 결합.

## 작업원칙 #100 — 개입 대기열은 상품당 다중 카드 비마스킹 (2026-06-17 세션9 P0·#56)
개입 대기열은 상품당 활성 개입을 **전부** 노출한다(스택 또는 "+N" 어포던스) — 상품당 1카드만 렌더하면 후순위 개입이 가려져 숨은 개입점(#56 위반)이 된다. 사례: 명화 registry_drift + variant_composite 2개 동시 awaiting_human인데 대기열은 variant 1개만 렌더(자산 정합 전체 부재). 근본 = route가 상품당 첫 잡만 보관(interventionById) + ControlTowerRow.actionQueue 단수 + widget map(상품당 1). 수정 = route 전체 수집(타입별 dedup·primary+extra) → ControlTowerRow.extraQueue → widget flatMap(actionQueue+extraQueue)·key=productId+type. ★응답 매핑(필드 명시 선택)에도 extraQueue 추가 필수(엔진 구성만으론 미전달). 비회귀: clear된 카드 비노출(awaiting_human만)·idle 비마스킹(#90 동형)·단일 개입 무변경. #90(저긴급 상시·긴급큐 비마스킹)과 동형 — 둘 다 "숨기지 말 것" 원칙.

## 작업원칙 #101 — 변형 바인딩은 in-stock 진실원천과 대조 검증 (2026-06-17 세션9 #62·E5)
생성물의 변형(variant/scent/color) 바인딩은 적재 시 상품 in-stock optionValues(Product.options stock>0=진실원천 #96)와 **대조 검증**한다. 불일치(오타 포함) 시 바인딩 거부(variant=null·파일은 적재)+응답 variantUnmatched:true+validVariants 노출 — 침묵 등록 금지. 사례(april escape): april '후레쉰'(후레쉬 오타)이 registered=True로 적재됐으나 어떤 변형과도 불일치 → 해당 향이 영구 coverage 미달인데 2/3 침묵 정체(아무 경고 없음). 가드: ingest-firefly stage=composite+variant 시 getActiveVariants 대조. 전상품(#55). #88(완료=검증)·#98(변형 커버리지)와 결합 — 바인딩 진실성이 커버리지 진실성의 선결.


## 작업원칙 #102 — 레퍼런스 리서치는 한국 우선(커머스 컨벤션 vs 무드 품질 2축) (2026-06-18 세션9 E8)
네이버 스마트스토어(한국 사용자 압도적) 판매이므로 레퍼런스 리서치는 한국 인기/트렌드 시장 우선(Pinterest/Google=외국 사용자 편향). 2축 분리: (1)커머스 컨벤션(클릭+전환)=메인 썸네일 구도·명품/고급·선물 프레이밍·골든키워드 → 한국 우선 필수, (2)무드/미감 품질바=향배경·상세 무드 → 글로벌(Pinterest) 보조 허용. 소스 티어(전상품): T1 한국 커머스 진실(네이버 쇼핑 상위·쿠팡·올리브영·오늘의집·29CM/W컨셉) → T2 한국 트렌드(DataLab·블로그·인스타 한국 해시태그) → T3 글로벌 무드 보조(Pinterest·Google·품질바만). NaverSearch MCP(search_shop/image·datalab·find_category)=Tier1 즉시 엔진. 실증: '차량용 디퓨저' 232,164건·명품/고급 프레이밍 만연·datalab 차량용 방향제(60~100)>>디퓨저(5~9)>>송풍구(1~5).

## 작업원칙 #103 — SEO 골든키워드 가드: 상품명/태그를 검색량으로 검증 (2026-06-18 세션9 E8)
모든 상품명/태그는 datalab 검색량 진실원천과 대조하고 카테고리 1위 검색어 누락 시 '상품명 키워드 검증' 개입카드로 표면화한다(전상품·additive·비가역0·네이버 무접촉·#56). 사례: 명화 상품명 '선물 본품리필 가벼운 명화 송풍구 방향제'가 검색 1위어 '차량용' 누락·니치 '송풍구 방향제' 사용 → '상품명 67(B)' 점수 원인. 니치 키워드는 노출 손실. #96(진실원천 실측)·#102(한국 우선) 결합.

## 작업원칙 #104 — info-dependency 디자인 게이트 + 사전생성 자산풀 (2026-06-18 세션9 하이브리드 워크플로)
디자인 산출물을 상품정보 의존성으로 분리해 비강제 게이트(#56)한다. info-free(언제나·소싱 전 가능): 향/무드 배경·일반 라이프스타일·브랜드미감 — 컨셉 구동·사전 일괄생성→사전생성 자산풀 파킹. info-bound(소싱 게이트): 메인썸네일(카테고리 컨벤션+SEO 1위어+가격/선물)·상세 히어로/스펙(옵션/재질/인증/원산지)·변형 대표컷 바인딩(확정 optionValues 필요=변형 컷을 옵션 확정 전 적재 못한 이유). 메커니즘: 온실아틀리에 'Design Readiness' 레인(산출물별 필요정보 충족/대기)·info-free 항상 생성가능→풀·info-bound 소싱 필드 충진 시 자동활성(자연 표면화·비강제). 양방향 바인딩: 사전생성 무드배경을 후에 소싱 상품 변형/썸네일에 바인딩(ingest variant 바인딩 일반화). 코드: engine slot/strategy에 infoDependency 메타(산출물별 필요 product 필드).


## 작업원칙 #105 — 컨벤션은 상품 정체성에 복무한다(충돌 시 정체성 우선) (2026-06-18 세션9 E8)
경쟁사/카테고리 컨벤션(스펙트럼 추출·benchmarkDna)은 클릭·전환을 위한 입력 신호이지 상품 정체성을 덮어쓰는 권위가 아니다. 컨벤션과 상품 정체성(브랜드·핵심가치·제품 진실)이 충돌하면 **정체성 우선**. 따라서 벤치마크 적용 파이프라인은 '상품 정체성 적합/오버라이드' 단계를 반드시 거친다(컨벤션 제안→정체성 대조→채택/오버라이드). 사례: 차량용 디퓨저 카테고리 '명품/다크오브제' 컨벤션이 만연하나, 상품이 밝은 향(레몬)·선물 포지션이면 다크 컨벤션을 정체성에 맞게 오버라이드. #62(전상품)·#102(한국우선)·#71(사실성 레인)과 정합 — 컨벤션은 수단, 정체성은 목적.


## 작업원칙 #106 — 어우러짐 = 배경이 상품 자신의 작품세계를 에코 (2026-06-18 세션9)
배경/씬이 상품과 어우러진다는 것은 배경이 상품 자신의 작품세계(productAestheticDna: 상품 고유의 팔레트·무드)를 에코하는 것이다. **카테고리 컨벤션 = 포맷(구도·프레이밍), 상품 정체성 = 팔레트·무드.** 예: 명화 디퓨저는 라벨의 인상주의 회화 팔레트(세이지-올리브·웜크림·선햇살 옐로)를 배경이 에코해야 하나로 읽힌다. #105(컨벤션⊳정체성)의 적용 — 컨벤션이 포맷을 주면 정체성이 색·무드를 채운다. 엔진 productAestheticDna 필드(상품별 팔레트/무드)→배경 프롬프트 팔레트 절 주입(전상품·#62).

## 작업원칙 #107 — 합성/이미지 표준: 누끼→Firefly 레퍼런스 합성·전 이미지 실사 카메라 (2026-06-18 세션9)
합성/이미지 표준 = (1) 누끼컷(cutout)을 레퍼런스로 첨부 → Firefly 레퍼런스 합성(프롬프트가 실제 제품을 씬에 배치·제품/라벨/유리/캡 재생성 금지)·타깃별 최적 모델(Nano Banana Pro=합성 최강·Firefly Image 5=무배상 대안). 분리 합성(빈 배경판+PIL/sharp 로컬 페이스트)은 **폐기·폴백 한정**(붙인 티·AI 이질감). (2) 전 이미지(hero/lifestyle/scene/composite)는 **실사 카메라 품질** — REALISM-CAMERA-BLOCK(카메라바디+렌즈+조리개+자연광+필름그레인+true-to-life색+고마이크로콘트라스트+'photorealistic editorial' + 'no CGI/3D-render/AI artifacts/illustration' 제외) + 상품 컨셉별 카메라(프리미엄 정물→중형 100mm f/4·라이프스타일→풀프레임 35-50mm·매크로→100mm 매크로). AI 이질감 0 = 프리미엄 신뢰 상승. 아마추어 AI 위조감 = 최하급 역효과. 사실성 레인(#71) 하드닝·전상품(#62)·엔진 편입(C6).

## 작업원칙 #108 — INGEST 추론 종속성: 명시 파라미터 ⊳ 파일명 토큰 (2026-06-18 세션9 #62·C14)
ingest(catch-basin) 적재 시 **명시 `stage`/`variant` 파라미터가 파일명 토큰 추론을 오버라이드**한다. (1) 운영자가 `stage:'thumbnail'`을 명시했는데 파일명에 'composite'/'thumbnail' 같은 서술 토큰이 섞여 분류기가 다른 stage를 추론하더라도 **명시값이 권위** — 거짓 `conflict` 보고 금지(`explicitStage` 표기, 픽셀 신호 불일치는 비차단 `contentMismatch` advisory로만). (2) `variant`(옵션 변형 바인딩)는 **변형 보유 stage(scent_note=composite)에서 실제 in-stock 옵션과 매치되거나 명시 전달될 때만** 설정 — 제품레벨 stage(thumbnail/hero/source/detail…)는 일대일(상품당 1)이므로 **variant=null 강제**, 서술형 파일명이 가짜 변형을 만들어 커버리지를 오염시키지 못하게 함(`variantIgnoredForStage` 표기). 단발 케이스 수습 금지·전상품 가드(#62)·기존 INGEST-GUARD(variantUnmatched·C11) 패밀리 확장. 적재 = 진실(추측 금지), 명시 = 권위.

## 작업원칙 #109 — publishReady=첫발행 게이트·기등록 상품은 재개/업데이트 별도 경로 (2026-06-20 세션9 C19 e2e)
`evaluatePublishReadiness`의 `publishReady = … && status==='DRAFT' && naverProductId===null` 는 **신규 DRAFT 첫 발행 전용 게이트**다. 이미 네이버에 등록된 상품(naverProductId 보유·판매중지/판매중)은 publishReady가 **구조적으로 영원히 false**이며 이는 정상 — 첫발행이 아니라 **재개/업데이트** 상황이기 때문. 기등록 상품 변경은 별도 경로: (a) 콘텐츠 수정 = `POST /api/naver/products/update`(PUT origin-products 전체교체·confirm 게이트·#3-7) — 존재함, (b) 판매재개(SUSPENSION→SALE)도 동일 update route가 커버 — buildNaverProductPayload가 originProduct.statusType='SALE'를 항상 emit(product-builder.ts:937)하므로 full-replace PUT가 판매중지를 해제한다(prod dryRun 실증: payloadPreview.statusType=SALE·네이버 무접촉). api-client의 'statusType read-only' 주석은 OUTOFSTOCK(재고 파생)에만 해당하고 SALE/SUSPENSION/CLOSE는 PUT 페이로드로 설정 가능. ★정정(#44): 직전 D5의 'read-only→전용 엔드포인트/수동' 보고는 오류, 본 실증으로 정정·D6 불필요. 추가로 **thumbnailAssessed는 publishReady 공식의 입력이 아니다**(공식엔 thumbnailPass만·미평가 시 기본 true); thumbnailAssessed는 게이트 readout/품질 표식일 뿐. **교훈(#45 강화): e2e 왕복(POST 플립/DELETE 원복)이 sub-flag 개별 독해보다 게이트의 진짜 구조를 드러낸다** — '유일 미충족=thumbnailAssessed' 가설이 e2e로 'publishReady=첫발행 전용·thumbnailAssessed=공식 밖'으로 정정됨.

> 참고: 작업원칙 #110~#112는 **의도적 결번**(Desktop 레인/예약 번호) — Code가 내용을 날조하지 않음(#115). Code 레인 박제는 #113부터 이어짐.

## 작업원칙 #113 — 판매재개 = update route의 full-replace PUT(statusType='SALE')·D6 CLOSED (2026-06-21 세션9 D5 정정)
기등록 상품의 판매재개(SUSPENSION→SALE)는 신규 라우트가 아니라 기존 `POST /api/naver/products/update {confirm:true}`가 그대로 수행한다 — buildNaverProductPayload가 `originProduct.statusType='SALE'`를 항상 emit(`product-builder.ts:937`)하므로 v2 full-replace PUT가 판매중지를 해제한다. prod dryRun 실증(payloadPreview.statusType=SALE·네이버 무접촉). **D6(전용 판매상태 변경 라우트)=CLOSED·불필요.** 명화 재개 동선: 씨앗심기 백필→가격/마진 확정→re-dryRun→대표 GO→update confirm:true(비가역 #46).

## 작업원칙 #114 — statusType 가변성: SALE/SUSPENSION/CLOSE는 PUT로 설정 가능, OUTOFSTOCK만 read-only (2026-06-21 세션9)
네이버 v2 `originProduct.statusType`의 SALE/SUSPENSION/CLOSE는 상품 PUT 페이로드로 **직접 설정 가능**하다. OUTOFSTOCK만 재고 파생(stockQuantity=0→자동 전환)이라 직접 설정 불가(read-only). api-client setProductOutOfStock 주석의 'statusType read-only'는 OUTOFSTOCK 한정 의미였고 이를 전체 statusType로 오독하면 안 된다(주석 정정 완료).

## 작업원칙 #115 — 문서 회귀 방지 + 검증 규율: 정정 사실은 전 사본 동시 정합·grep 거짓음성 경계 (2026-06-21 세션9)
직전 턴에 박제한 사실이 정정되면 **모든 사본(PRINCIPLES_LEARNED + PARALLEL_WORK_TRACKER §4 + 소스 문서)을 동시 정합**해야 한다 — 한 곳만 고치면 문서 회귀(stale fact 잔존)가 생긴다. 검증 규율: grep 거짓음성(예: product-builder.ts statusType 미매치)에 속지 말고 **직접 읽기(sed/Read)+런타임 실증(dryRun)**으로 확정(#45/#88 강화). D5 사례: grep 거짓음성+api-client 주석 오독→오보고→직접읽기+dryRun으로 정정.

## 작업원칙 #116 — 통합 노력 레인: 단순/디테일이 최상위 축이며 공급사 A/B를 흡수 (2026-06-21 세션9 rev2)
노력 레인 **단순(=실 발행 경로)/디테일(=Firefly 3-plane 프리미엄 테스트)**이 최상위 축이며, 공급사 자산품질 A/B 라우팅(IMAGE_DETAIL_TWO_BRANCH_SYSTEM: A=양호 재사용/B=빈약 크롭·생성)을 **별도 축이 아니라 레인 내부 서브라우팅으로 흡수**한다. 실 발행은 단순 레인 사용 — 라이브 상품의 단순·스테일 대표이미지는 버그가 아니라 단순 레인이 의도대로 동작한 결과(개선 범위=단순 레인 대표 흰배경 마감). 디테일 레인은 검증된 뒤에만 발행에 공급. 전상품(#55·#62).

## 작업원칙 #117 — 씨앗심기 선행: 소싱 시드가 디자인보다 먼저 (2026-06-21 세션9 rev2)
씨앗심기(SEO/ROI 소싱 시드·크롤 기반)는 온실 아틀리에 디자인보다 **반드시 선행**한다. 가격/마진 검증은 소싱 정보에 게이트되며, 디자인-전-소싱은 가격을 검증 불가로 만든다. 올바른 순서: 크롤링→씨앗심기(소싱 채움)→(공급사 제공정보+소싱)→온실 아틀리에(디자인·STEP6). 앱은 design-ran-before-sourcing를 `sourcing_incomplete` 개입 카드로 표시. 명화가 이를 위반(STEP6로 점프→가격 BLOCKED).

## 작업원칙 #118 — 재입고 미정/일시품절 옵션은 품절 유지(은닉 제외 금지) (2026-06-21 세션9 rev2)
재입고 미정·일시품절 옵션은 **품절(stock 0, 옵션+상세에 노출) 유지**하고 은닉/임의 제외하지 않는다. 운영자 명시 지시에서만 제거. (명화 코튼어라운드 = 품절 유지.)

## 작업원칙 #119 — 검증 거버넌스 4종: 하드리프레시·인터럽트 cleanup·정적 probe 시점성·done↔verified 컬럼분리 (2026-06-21 세션9 C19b)
브라우저/필드 검증(#88)을 4가지로 정밀화한다. (a) **하드리프레시 의무**: 브라우저 검증은 하드리프레시(캐시 무시 재로드)로 current bundle을 보장한다 — stale 탭은 옛 번들을 실행해 거짓 FAIL(false-negative)을 만든다. (b) **인터럽트된 e2e 변이는 명시적 cleanup 추적**: e2e 왕복(POST 플립→DELETE 원복) 중 중단되면 잔여 상태 변이를 명시 추적·복원한다(이번 명화 대표이미지 평가 잔여 POST→DELETE 복원 사례). 비가역 게이트(#46)와 동형 — 검증이 남긴 부작용도 장부에 남긴다. (c) **정적 API probe = point-in-time**: 정적 API 응답 probe는 호출 시점 스냅샷일 뿐, 라이브 DOM/DB가 ground truth다(#45 보강). 평가 플립 같은 상태 전이는 응답 1회가 아니라 라이브 양 상태 렌더로 단정. (d) **'코드 done ↔ prod-verified' 컬럼 분리**: 기능 상태는 '코드 완료(빌드/배포)'와 'prod 검증완(라이브 e2e)'를 별도 컬럼으로 분리 관리한다(전기능 거버넌스). C19b 사례: '코드 done'은 직전 턴이나 'prod-verified'는 본 턴 Desktop 하드리프레시 e2e로 확정 — 둘을 합치면 미검증을 done으로 오인한다. #45(출력 품질 단정)·#88(완료=검증)·#100(비마스킹)과 결합.

## 작업원칙 #120 — MCP는 물리 Storage 변이 불가, 물리 변이는 Code service-role SDK/앱 API 전담 (2026-06-21 세션9 C15·#59 일반화)
MCP(Supabase MCP 포함)는 DB SQL 읽기/쓰기는 가능하나 **물리 Storage 객체 변이(업로드·삭제·이동·복사)는 일체 불가**하다(#59 일반화). 따라서 자산 물리 정리/이관/삭제는 **Code service-role SDK(@supabase/supabase-js·SUPABASE_SERVICE_ROLE_KEY) 또는 앱 API**가 전담한다. 역할 분담: 진단/참조스캔(#79)·registry DB 갱신 = MCP execute_sql 가능 / 물리 객체 move·remove = Code SDK(moveAutomationAsset/deleteAutomationAsset). **가역 우선(C23·#46 정신)**: 물리삭제는 복구 불가이므로 stray/슈퍼시드 정리는 하드삭제 대신 `{pid}/archive/`로 move(가역)+registry stage→archive를 기본으로 한다(하드삭제는 명시 지시 시에만). 선행 필수: #79 전수 참조스캔(::text 캐스트로 중첩jsonb 포함·하드코딩 컬럼리스트 폐기·레포 grep 병행) 0참조 확인 후에만 변이. 사례: 명화 detail/hero-1781957364462.png(slot=hero@stage=detail 불일치 firefly_auto stray) — 12테이블 0참조 확인 → 가역 아카이브(detail→archive)·registry 정합·복원경로 보존. #88(완료=검증)·#119(b)(검증 부작용 추적)와 결합.

## 작업원칙 #121 — Adobe MCP는 생성형 합성·배경교체 불가, 3-plane 생성합성은 Firefly 브라우저 자동화 전담 (2026-06-23 세션9 · Desktop 산출·검증됨)
Adobe MCP(Express/Photoshop 계열 도구)는 누끼·크롭·보정·리사이즈 등 결정론적 편집은 가능하나 **생성형 합성(프롬프트 기반 배경 생성·배경 교체)은 불가**하다. 따라서 3-plane 생성합성(피사체 보존 + 무드 배경 생성·하모나이즈)은 **Firefly 브라우저 자동화가 전담**한다(#74·#77·shadow-walk + native setter + InputEvent). 역할 분리: Adobe MCP=결정론 편집 레인 / Firefly 자동화=생성 합성 레인. #61(3-plane 합성표준)·#107(누끼→Firefly 레퍼런스 합성·PIL 폴백)과 정합.

## 작업원칙 #122 — Supabase public URL 직접투입 + Adobe-독립 시각확증 폴백 (2026-06-23 세션9 · Desktop 산출·금세션 O1 적용·검증됨)
Supabase public bucket URL은 `/storage/v1/object/public/{bucket}/{path}` 형식이며, URL을 수용하는 도구(뷰어·Adobe import 등)에 **직접 투입**한다. Adobe encode 400 flake(간헐 인코딩 실패)가 발생하면 **bash `curl` 다운로드 → 로컬 view로 Adobe-독립 시각확증**으로 폴백한다(도구 한 곳의 장애가 검증 자체를 막지 않게). 금세션 O1(명화 대표이미지) 승인 검증에 실제 적용·검증됨. #45(출력 품질 단정)·#88(완료=검증)의 검증 수단 다변화.

## 작업원칙 #123 — 누끼-source 적격성 게이트 (2026-06-23 세션9 · Desktop 산출·검증됨)
누끼(배경제거) 소스는 **적격성 게이트**를 통과해야 한다. 마케팅 스트립(다중 장면·텍스트 오버레이·세로 롱 이미지)은 **누끼 불가**이며, **깨끗한 단일 제품 히어로만 누끼-ready**다. 부적격 소스는 임의 누끼하지 말고 **C9 Design Readiness 카드로 전상품 surface**한다(#104·info-bound 소싱 충진 시 자동활성·#56). 아이스(트레이)가 첫 실증(cutout 부재=info-bound 누끼-선행 readiness). #78(누끼 신호=실제 투명)·#107(누끼→Firefly 합성)과 결합.

## 작업원칙 #124 — 검증 순차성: 선행 검증이 후행을 게이트한다 (2026-06-23 세션9 O3)
검증은 순차적으로 수행하며 선행 검증이 후행 단계를 게이트한다. 여러 미검증 항목을 동시에 'done'으로 주장하지 않는다(#88 보강). 사례(명화 발행): (1) O3 정보고시 자동조립 확인 → (2) 대표이미지 평가 → (3) 상태정합(ACTIVE↔판매중지) → (4) 대표 GO(비가역 #46) 순서이며, 앞 게이트 미통과 시 뒤 단계 진입 금지. 정적 API probe는 호출 시점 스냅샷이므로(#119c) 순차 게이트의 각 단계는 라이브로 단정한다. 역할 분리: #119='어떻게 검증하나'(하드리프레시·인터럽트 cleanup·시점성·done↔verified), #124='어떤 순서로 게이트하나'.

## 작업원칙 #125 — 양라인 플래그십 실테스트 후 확장 (2026-06-23 세션9 양라인 결정)
양라인(단순/디테일·#116) 파이프라인은 플래그십 상품(명화)으로 실테스트(실 발행/실 자산 e2e)를 통과한 뒤에만 타 상품으로 확장한다. 미검증 파이프라인을 다수 상품에 선행 적용하면 결함이 N배로 번진다. 사례: 명화 양라인검증(O1→O2→단순)이 P0이며, D3(달항아리·아이스 composite/realism 확장)는 명화 양라인 통과 전까지 PARKED. #116(단순/디테일 레인)·#124(검증 순차성)와 결합 — 플래그십이 먼저, 확장은 검증 후.

## 작업원칙 #126 — 대표이미지 평가·승인 게이트는 product-agnostic·가역, lifestyle 라벨 텍스트는 허용 (2026-06-23 세션9 · 후보)
대표이미지 평가·승인 게이트(C19/C19b·thumbnailAssessed)는 **product-agnostic(전상품 동형)이며 가역**하다(승인 POST ↔ 재평가 DELETE 원복). lifestyle 대표컷에서 **제품 고유 라벨 텍스트(본품에 인쇄된 브랜드/제품명)는 허용**한다 — 금지 대상은 **홍보/가격 문구·테두리(border) 오버레이** 등 합성 추가 요소뿐(네이버 대표이미지 규정 §3-6 정합). 즉 '본품에 원래 있는 텍스트'와 '마케팅 오버레이'를 구분해 게이트한다.

## 작업원칙 #127 — UI canSave ≠ API canRegister: 크롤 임포트 거짓음성, 판정 기준은 API dryRun (2026-06-23 세션9)
studio UI 발행 신호(canSave=인앱 생성 state·useStudioActions.ts:476)와 API 실제 발행 가능(canRegister/readiness/dryRun)은 **별개**다. 크롤 임포트로 기존 폴더적재 Storage 자산(product.mainImage/detail_image_url)을 보유한 상품은 UI canSave=false(생성 state 없음)지만 API canRegister=true(DB row로 full payload 빌드 가능)일 수 있다 → **UI 게이트만 보면 거짓음성(false-negative)**. 발행 가능 판정의 SoT = **API dryRun**(POST /api/naver/products/update {dryRun:true} → canRegister·readiness·payloadPreview)이지 UI 버튼이 아니다. 해소 = C25(studio 발행경로 기존 DB자산 인식·studio UI=API 정합). #62(전상품)·#88(완료=검증)·#109(publishReady 구조)·#126(게이트 product-agnostic)과 결합.

## 작업원칙 #128 — Storage가 자산 SoT, registry는 부분반영(20/71)이나 발행 무영향 (2026-06-23 세션9)
적재 5계층(asset_jobs·물리 Storage·asset_registry·published_assets·prompt_library/references) 중 **물리 Storage가 자산의 SoT**다. asset_registry는 인덱스/메타 계층으로 현재 **부분 반영(20/71 등록·51 미등록 드리프트)**이나, **발행 경로는 registry가 아니라 Product row(mainImage/additionalImages/detail_image_url)를 읽으므로 발행에 무영향**(buildNaverProductPayload는 registry 미참조). 따라서 registry 드리프트는 발행 블로커가 아니라 **인덱스 정합 과제**다. 정합 = C26(storage→registry 백필 + 발행후 자동등록·dry-run→GO·전상품). #62(전상품)·#93/#94(registry 교차차원 탐지)·#120(물리변이=Code SDK)와 결합.

## 작업원칙 #129 — 신규 트랙 제안 전 기존 구현 코드 실측 필수 (중복 구축 방지) (2026-06-23 세션9)
신규 트랙/엔진을 제안·등재하기 전에 **기존 구현을 코드로 실측**한다(grep/직독) — 그리고 **과거 트래커 기록도 검색**한다. 직전 C26은 '레지스트리-스토리지 정합 엔진 신규 구축'으로 등재됐으나, 실측 결과 `reconcileRegistryDrift`(asset-integrity) + `registry_drift` 개입카드(#56)가 **이미 구축**돼 있었고 **C16(CLOSED)에 이미 기록**돼 있었다 → C26을 (a) 기존 reconcile **실행** + (b) write-path 등록 **감사**로 재범위했다(중복 빌드 0). 추측 기반 신규 트랙은 중복 구축·자원 낭비를 낳는다. '없다고 단정하기 전에 grep'(코드 + 트래커 둘 다). #45(추측 금지·실측)·#46(비가역 전 확인)·#88(완료=검증)과 결합.

## 작업원칙 #130 — 라이브 변이 테스트 = throwaway+즉시정리 사이클, 잔여검증은 storage SoT (2026-06-23 세션9 Desktop)
프로덕션 라이브에서 변이(업로드/삭제 등)를 검증할 때는 **throwaway 자산 + 즉시정리 사이클**(업로드 → 검증 → 삭제)로 수행해 잔재를 남기지 않는다. 변이 후 **잔여검증은 UI 표시가 아니라 storage SoT + asset_registry 그라운드트루스**로 단정한다(#45 출력 단정·#128 Storage=SoT). 이중 렌더(같은 자산이 2회 DOM 출현 등) 페이지에서는 **보이는 인스턴스 + 정확한 속성(title vs aria-label 구분)**을 타겟해 오검증을 피한다(#119 point-in-time 보강). 한계: 등록후삭제 사이클은 'positive 등록(업로드가 registry.create 하는지)'을 단정 불가 → non-delete 경로 별도 검증(백로그·C26 흡수). #88(완료=검증)·#46(비가역 변이 추적)과 결합.

## 작업원칙 #131 — 스테이지 단일책임: 소싱·초안입력·상세/비주얼 생산·발행을 분리, 중복 시 생산 스테이지로 통합 (2026-06-23 premium-redesign)
워크플로 스테이지는 단일책임을 가진다: **소싱(Crawl/꿀통 intake)** → **초안 입력(Plant/씨앗 심기)** → **상세+비주얼 생산(Studio/온실 아틀리에)** → **발행**. 같은 산출물(예: 상세페이지 조립)이 두 스테이지에 중복 노출되면 **생산 스테이지로 통합**한다. 사례: 상세페이지(상세설명/상세자동화)가 Plant 이미지탭과 Studio에 이중 존재 → Plant에서 제거하고 Studio를 단일 홈으로 확정(C-PLANT-UX/ISSUE 3). 중복은 운영자에게 '어디서 작업하나'를 모호하게 만들고 동기화 결함을 부른다. IA 단일책임 = 직관·정합의 전제(#73 작업여정 정합·#26 IA 점검).

## 작업원칙 #132 — UI 리디자인은 검증된 기존 백엔드를 먼저 표면화한다, 새 엔진 최소화 (#129 확장) (2026-06-23 premium-redesign)
UI 리디자인/관제탑/점수 시각화는 **새 스코어링 엔진을 만들기 전에 이미 검증된 백엔드 상태를 표면화(surfacing)**한다. 검색 생장 관제탑의 **개화도 게이지·신호등**은 기존 dryRun 발행 게이트(`EngineGateView` 불리언)·asset-integrity·DNA를 **시각화한 것**이며 새 점수 엔진이 아니다 — 새 fetch·새 산식 금지, 기존 pass/fail 플래그 카운트만 허용. 사례: 개화도 = 발행게이트 통과 현황(hardComplete/seoComplete/authentic/naverPayloadComplete/thumbnailPass) 카운트의 0~100 시각화. 이는 #129(신규 트랙 전 기존 코드 실측)의 UI 적용판이다. 검증 로직(dryRun·게이트·마진·SEO 계산)은 절대 변경 금지(shell/relocate only).

## 작업원칙 #133 — 하드리프레시 연타 금지(dev thrash): 컴파일·HMR 완료를 기다린 뒤 1회 검증 (2026-06-23 studio UX-v2)
localhost dev에서 변경 직후 **하드리프레시를 연타하면 dev thrash**가 발생한다 — Next dev 서버가 동시다발 재컴파일/HMR 폭주로 큐가 밀리고, 화면이 이전(스테일) 번들을 잠깐 노출하거나 빈 화면을 거치며 **거짓 음성**(고쳤는데 안 고쳐진 듯 보임)을 만든다. 규칙: **저장 → 터미널 'compiled' 또는 HMR 적용 로그를 확인 → 1회만** 새로고침해 검증한다(소프트 리로드 우선, 필요 시에만 하드). 잔여 의심은 #45(출력 단정)·#88(완료=검증)대로 storage/네트워크 그라운드트루스로 확인하되 새로고침 횟수로 해결하려 들지 않는다. (production 검증은 #36 verify-vercel-deploy·#32 build로 별도.)

## 작업원칙 #134 — 점진적 공개 + 컨텍스트 동기화: 현 단계가 필요로 하는 것만 보이고 나머지는 접는다 (2026-06-23 studio UX-v2)
프리미엄 정돈의 두 축: **(1) 컨텍스트 동기화** — 도구·자산을 현재 워크플로 스텝에 맞춰 기본 노출하고(예: 도구함 AssetBrowser가 activeStep의 스테이지 자산만), '전체 보기' 토글로 전량 접근은 항상 유지한다. **(2) 점진적 공개** — 한 화면에 주작업 1개를 펼치고 보조 카드(진단·무드·퍼널 등)는 접어 시선 흐름을 통제한다. 보조 CTA는 overflow(•••)로 강등해 주 액션을 시각적으로 단일화한다. 구현은 **공유 컴포넌트 우선**(`src/components/common/Collapsible`·`OverflowMenu`)으로 /studio·/crawl·/products/new에 동형 적용(중복 0). 이는 셸·표면화만 바꾸는 작업이며 검증/발행 로직은 불변(#132)·#73(직관우선·과밀금지)의 구조적 실현이다.

## 작업원칙 #135 — 재설계는 new+edit를 동시에, 하나의 공유 컴포넌트/모드로 (2026-06-23 edit 패리티)
폼·화면을 재설계할 때 생성(new) 경로만 고치고 수정(edit) 경로를 방치하면 패리티 갭이 생긴다 — edit가 구형 UI에 고립되고(이모지탭·옵션/배송탭 부재) 동일 데이터에 두 가지 편집 경험이 공존한다. 규칙: 같은 폼은 하나의 공유 컴포넌트 또는 한 컴포넌트의 edit 모드로 양 경로가 같은 UI+저장 로직을 쓰게 한다. 사례: `/products/[id]/edit`를 구형 ProductForm에서 떼어 premium 씨앗심기 폼의 `?edit=` 모드로 서버 리다이렉트 → 단일 편집기(Lucide 6탭·임시저장·상세제거#131·저장 후 온실 아틀리에 자동 상속, 구형 폼 번들 16.8kB→141B). 저장은 멱등(savedProductId시 PUT)으로 재저장/재등록 중복 행을 차단한다. 미연결 잔존 필드(옵션 prefill 등)는 데이터 안전 먼저 보장(부분 PUT가 누락 필드를 보존)한 뒤 GAP으로 트래킹한다. #132(셸·표면화만)·#62(전상품 공통)·#129(기존 구현 실측)와 결합.

## 작업원칙 #136 — dev 실행 중 build 금지: 공유 .next 청크 손상으로 'Cannot find module' 500 다발 (2026-06-23 Desktop 진단)
`npm run dev`가 떠 있는 동안 `npm run build`를 돌리면 둘이 같은 `.next` 디렉터리를 공유해 빌드가 청크 매니페스트를 덮어쓰고, 실행 중인 dev 서버가 `Cannot find module './<chunk>.js'` 런타임 500을 다발로 뱉는다 — **코드 결함이 아니라 캐시 손상**이다. 규칙: (1) Code의 1차 검증은 **`tsc --noEmit`**(타입 0)로 한다. (2) production build가 꼭 필요하면 **dev를 정지한 뒤** 돌리거나 별도 트리/포트에서 돌린다. (3) build 후 dev를 재개할 때는 **`rm -rf .next`**로 손상 캐시를 비우고 시작한다. 500을 코드 결함으로 오판해 불필요한 수정 인계를 만들지 않는다 — 클린 캐시 재검증으로 먼저 가른다. 직전 세션 B5/B6/v2.5의 500은 본 원인(캐시 손상)으로 진단됨(코드 무결). #45(실측·추측 금지)·#88(완료=검증)·#32(build 검증은 별도 단계)와 결합.

## 작업원칙 #137 — 항목별 액션 밀도는 overflow 케밥(점3개)으로 표준화 (2026-06-23 스튜디오 리서치)
리스트/그리드의 각 항목에 상시 노출되는 액션이 많으면(에셋 타일당 4버튼 x 100-160타일 = 수백 개 동시 노출) 시선이 폭발하고 좁은 레일(217px)에서 잘린다. 표준: **평소 = 아이콘 0개(깔끔한 썸네일/행) -> 호버·포커스 = 주요 액션 1개(예 대표지정(별)) + 케밥(점3개: 부차 액션 — 추가이미지·아카이브·삭제) -> 다중선택 = 하단 일괄 액션 툴바.** 케밥엔 항상 라벨/툴팁(접근성). PatternFly 기준 '액션 2개 이하면 케밥 금지 / 공간 제약이면 케밥'. **crawl 행 <-> 스튜디오 에셋 타일에 동일 패턴(공유 `OverflowMenu`) 적용해 통일**(#134 보조CTA 강등·#73 과밀금지의 구조적 실현). 근거 `docs/research/STUDIO_REFACTOR_RESEARCH_KO_2026-06-23.md` §2·§5.

## 작업원칙 #138 — 대형 리팩토링은 검증 가능한 Stage로 분할 — 구조 먼저, 라이브 검증, 대표 리뷰 후 디테일 도출 (2026-06-23 스튜디오 리팩토링)
화면 전면 재설계를 한 번에 빌드하면 검증 불가능한 거대 변경이 되고 회귀·되돌림 비용이 폭증한다. 규칙: **(1) 구조(Stage 1)부터** — 스크롤·게이팅·항목 액션밀도 같은 골격을 먼저 빌드. **(2) 라이브 검증**(#88·#45 실렌더). **(3) 대표 리뷰**로 방향 확정 -> 그 다음에 레이아웃(Stage 2)·모바일/폴리시(Stage 3)의 디테일을 도출. 각 Stage엔 명시적 통과 기준(예 '어느 단계든 다음 행동을 스크롤 없이 5초 내 발견')을 둔다. 셸·표면화 우선(#132)·기존 검증 백엔드 재사용. 근거 동 리서치 §9 3단계 로드맵.

## 작업원칙 #139 — 검증완료 미커밋 자산 누적 시, 대형작업 착수 전 먼저 커밋·배포해 위험반경 축소 (커밋우선) (2026-06-23)
tsc/라이브 검증을 통과했으나 commit/push되지 않은 자산이 작업트리에 쌓인 상태에서 또 다른 대형 변경을 시작하면, 한 번의 충돌·되돌림이 여러 세션치 검증완 작업을 함께 위태롭게 한다(위험반경 확대). 규칙: **대형 리팩토링·재설계 착수 전, 이미 검증완료된 미커밋 자산을 먼저 커밋(필요 시 배포)해 베이스라인을 고정**한다 — 이후 변경은 깨끗한 출발선 위에서 독립적으로 되돌릴 수 있다. 단, 비가역·발행 경로는 여전히 대표 GO 게이트(#46)를 따른다. #136(검증 규율)·#88(완료=검증)과 결합.

## 작업원칙 #140 — 인라인 style이 Tailwind 반응형 유틸(lg:hidden 등)을 무력화 → 반응형 표시 토글은 클래스로만·인라인 display 금지 (2026-06-23 studio Stage1 핫픽스)
같은 요소에 인라인 `style={{display:...}}`와 Tailwind 반응형 표시 유틸(`lg:hidden`·`hidden lg:flex` 등)을 함께 쓰면 인라인 스타일이 항상 클래스를 이긴다(인라인 specificity 최상위). 결과: `lg:hidden`(=lg에서 display:none)이 인라인 `display:flex`에 무력화돼 데스크톱에서도 모바일 블록이 렌더 → **이중 렌더 + 페이지 전체 스크롤**(prod에도 존재한 결함). 사례: AtelierShell 모바일 블록 `className="lg:hidden" style={{display:"flex",...}}` → `className="flex flex-col gap-3 lg:hidden"`로 이관(인라인은 padding 등 비충돌만 잔존). 규칙: **반응형 표시/방향 토글은 클래스로만, 요소에 인라인 `display` 금지.** 전 컴포넌트 #62 점검(동일 요소에 인라인 display + 반응형 toggle 0건 정합 — 본 세션 전수 스캔으로 AtelierShell 유일 발생지 확인·수정 후 0). 검증=lg 폭에서 모바일 블록 computed display:none·가로오버플로 0. #73(직관·정합)·#62(전상품)와 결합.

## 작업원칙 #141 — 고정 뷰포트 워크스페이스 높이 calc(100vh - 매직넘버) 금지 → flex-fill (2026-06-23 studio Stage1)
독립 스크롤 컬럼 등 '페이지 전체는 스크롤하지 않는' 고정 뷰포트 워크스페이스의 높이를 `height: calc(100vh - 매직넘버px)`로 잡으면, 헤더·패딩·네비 높이가 바뀔 때 매직넘버가 어긋나 페이지가 수십px 넘쳐 의도한 'no page scroll'이 깨진다. 실측: AtelierShell `calc(100vh - 60px)` vs 실제 글로벌 헤더 76px(main.top) → 세로 ~100px 잔존 오버플로(이중렌더 버그와 무관·별개 선재). 규칙: 고정 뷰포트 높이는 매직넘버 대신 **flex-fill**로 — 부모 `flex flex-col` + 셸 `flex-1 min-h-0`(min-h-0 없으면 flex 자식이 콘텐츠로 늘어나 오버플로). 단 셸이 글로벌 main 레이아웃을 공유하면 전환 시 **전 페이지(dashboard 등) 회귀 셀프체크 필수**·tsc 0. (본 핫픽스 세션은 커밋우선(#139)으로 잔존을 Stage2 편입·calc 보정 보류.) #88(완료=검증)·#32(build)·#136(dev중 build금지)·#140과 결합.

## 작업원칙 #142 — 색상 중앙 클렌징(토큰 단일 출처) — 제네릭 색은 :root 정규 토큰으로, 의미색은 리터럴 유지 (2026-06-24 studio Stage2 S2-A)
스튜디오/작업화면의 장식·브랜드 색을 컴포넌트마다 하드코드(`#FFCCEA` 등)하면 리스킨 시 누락이 생기고 시안 변경이 반영 안 된다. 규칙: **제네릭 브랜드/장식 색은 `globals.css :root` 정규 토큰으로 중앙화** — `--brand-red`(#E62310·액션/활성)·`--pink-soft`(#FFCCEA·틴트/뱃지/장식보더)·`--cream`(#FAF8F3·배경). 한 번 수정 = 스튜디오 전체 리스킨. 단 **신호등 의미색(emerald 양호/amber 검수/red 보강)은 토큰화하지 않고 리터럴 유지** — 의미가 곧 색이라 추상화하면 가독성만 떨어진다. 기존 `--gp-*`/`--color-*` 시스템 토큰과 충돌 0(신규는 동값 의미 별칭). 전거 docs/design/STUDIO_UI_UX_GUIDELINES.md §3. #143·#144와 한 세트.

## 작업원칙 #143 — 시안=참조, 브랜드·로직은 우리 기준 (2026-06-24 studio Stage2 S2-A)
Figma/외부 시안·레퍼런스 구현체는 **참조일 뿐 권위가 아니다.** 시안이 채택한 특정 구현(예: `pink-500` 색, `execCommand` 에디팅, Zustand 상태관리)을 그대로 베끼지 않는다 — 우리 브랜드 토큰(#142)·기존 스택(React state/hooks)·기존 로직 계약을 우선한다. 시안에서 가져오는 것은 **레이아웃 의도·정보 위계·인터랙션 패턴**이지 구현 디테일이 아니다. 채택/비채택을 명시적으로 판단하고 비채택 사유를 남긴다. #132(재배치만·로직불변)·#28(production source of truth)와 결합.

## 작업원칙 #144 — 반응형 4종 하드닝(전상품) — truncate/break-words · minmax(0,1fr) · min-w-0 · 인라인 display 금지 (2026-06-24 studio Stage2 S2-A)
가로 폭발(11506px 실측·A-GRID)·세로 오버플로 재발을 막는 4종을 전 작업화면(studio/crawl/products·new/dashboard)에 의무 적용: **(a)** 넘칠 수 있는 텍스트는 `truncate` 또는 `break-words` · **(b)** 모든 그리드 트랙은 `minmax(0,1fr)`(bare `1fr`은 `min-width:auto`=min-content라 넓은 자식이 트랙을 폭발시킴; Tailwind `grid-cols-*`는 이미 minmax 내장이라 인라인 `gridTemplateColumns`만 교정) · **(c)** 모든 flex/grid 자식 `min-width:0`(없으면 a·b가 무동작) · **(d)** 인라인 `display` 금지(#140). 검증=1440/1024/375 폭에서 `scrollWidth===clientWidth`(가로 overflow 0). 전거 docs/design/STUDIO_UI_UX_GUIDELINES.md §4. #62(전상품)·#140·#141과 결합.

## 작업원칙 #145 — 앱 전역 색 오버라이드는 border까지 덮어야 한다 + 단일출처 토큰 리스킨은 새 셸뿐 아니라 내부 컴포넌트 전수 열거 (2026-06-24 studio S2-A.1)
두 갈래 교훈. (1) **border 누락**: globals.css의 회색 클렌징이 bg/text만 덮고 `border-gray-*`를 빼면, 카드/인풋의 회색 보더가 전역으로 새어 브랜드가 반쪽만 적용된 것처럼 보인다. 더 깊은 근본은 Tailwind preflight의 `borderColor.DEFAULT`(=gray-200)라 색-없는 bare `border`까지 회색 → **tailwind.config `borderColor.DEFAULT`를 브랜드 토큰으로 재정의**해야 진짜 0. 더해 `.border-gray-*/.border-stone-*` 클래스 오버라이드는 NON-important + @tailwind utilities 이후 배치(소스순으로 base utility를 이기되 higher-specificity hover/focus는 살림). (2) **전수 열거**: '제네릭 핑크 전량 치환' 류 단일출처 리스킨을 서브스테이지로 분리하지 않으면 새 셸에만 적용되고 기존 내부 컴포넌트(AssetBrowser 카드·중앙 step 카드·ControlTower)는 누락된다 → 리스킨은 **새 셸 + 내부 컴포넌트 전부**를 대상으로 명시. 실측 검증: /studio·/products·new 전 요소 회색 보더 0(`rgb(229,231,235)` 0건)·바 hex 핑크 0·pink-* 유틸 computed=브랜드 토큰. 단일출처(#142) 레버리지=Tailwind `pink` 팔레트를 config에서 브랜드 토큰으로 재정의(클래스 전수 편집 대신). #142·#62·#132와 결합.

## 작업원칙 #146 — 전역 색 오버라이드는 class 한정(인라인/arbitrary 사각지대) + 의미 중립색은 sweep에서 제외 (2026-06-24 studio S2-A.2)
두 갈래. (1) **사각지대**: globals.css의 회색→브랜드 sweep과 tailwind.config preflight 재정의는 **Tailwind 클래스에만** 적용된다. 컴포넌트의 **인라인 style 보더**(`border:'1px solid #e5e7eb'`)·arbitrary value(`border-[#e5e7eb]`)는 전역 규칙이 못 잡아 회색이 잔존 → **컴포넌트 단위 수정** 필요(예: SourcingRecommendWidget 인라인 #e5e7eb→var(--color-border)). 사각지대는 상시 재발하므로 인라인 색 grep(`#e5e7eb`/`#f3f4f6` 등)을 리스킨 검증에 포함. (2) **의미 중립색 제외**: '미적용·비활성·disabled' 같은 inactive 상태 뱃지/보더를 회색→핑크 sweep에 통과시키면 비활성이 브랜드(활성)처럼 보여 의미가 뒤집힌다. → 전용 semantic neutral 토큰(`--status-neutral-bg/-fg`, 웜 중립·핑크 아님)으로 분리하고 sweep 대상 클래스(`bg-gray-*`)를 쓰지 않는다. 공용 `StatusBadge`(tone: neutral/brand/success/warning/danger)로 의미↔색 매핑 일원화(신호등 의미색=리터럴 유지·#142). 실측: /studio·/products 미적용 뱃지 computed bg=#ECE8E0(중립·핑크 아님)·적용=브랜드. 잔존 백로그(#62 후속): ProductLifecycle/LowStockAlert 등 dashboard 위젯 인라인 보더 #e5e7eb = 동일 사각지대·차기 sweep. #142·#145·#62·#144와 결합.

## 작업원칙 #147 — 데이터 패널 "격상" 시 기존 기능 인벤토리 먼저 (과빌드 금지) (2026-06-24 P1-e)

**맥락**: P1-b에서 /products/new 우패널(Tower)을 "구조 격상"하며 히어로 2지표 블록 + SEO 신호칩 5종 + TowerSection 접이식 래퍼를 추가했으나, 이 셋은 모두 이미 존재하는 패널(꿀통지수·SEO 검색최적화 점수상세 체크리스트·각 패널 자체 카드/접힘) 위에 덧대진 중복 레이어였다. 동일 타이틀이 이중으로 접히고(double-collapse), 점수·체크리스트가 두 번 표시되어 운영자가 "더 지저분해졌다"며 거부 → P1-e에서 전부 제거(순감 -131줄).

**원칙**: 작동 중인 데이터 패널을 "격상/정돈"하기 전에, **기존 기능을 먼저 인벤토리**하라. 새 히어로/점수/접이식 래퍼를 기존 점수·체크리스트·접힘 위에 덧대지 말 것. 중복 레이어는 제목 중복·과밀(#73 과밀금지)을 만든다. **재배치(reorder) + 가벼운 폴리시**가 새 래퍼 레이어보다 거의 항상 낫다. 광범위 카드/구조 통일은 "정본 패턴" 디자인 결정이 필요하므로 추측 금지 → 운영자 1줄 확정 후 착수(사이클 낭비 방지). [[작업원칙-73]] 직관우선·과밀금지와 결합.

## 작업원칙 #148 — 검증은 전역 chrome·transient infra와 "기능"을 구분하라 (2026-06-24 S2-B.1)

**맥락 2건**: (1) /studio 재배치 검증 중 `document.querySelector('aside')`로 첫 aside를 잡았더니 그건 **전역 앱 사이드바**(KKOTIUM GARDEN nav)였고 기능 패널(배양실)이 아니었다 → "단계 카드가 사라졌다"는 거짓 음성. 실제론 aside[1](배양실·pressed=true)에 카드가 정상 이주돼 있었다. (2) preview **dev 서버**가 `.next`를 점유한 상태로 `npm run build`를 돌리니 무관 라우트(/api/ai/seo-workflow) page-collection 오류 → dev 정지 + `.next` 클린 후 재빌드하니 통과(거짓 실패).

**원칙**: 라이브 검증 시 (a) DOM 프로브는 **기능 컨테이너로 스코프**하라 — 전역 셸/사이드바/헤더(앱 chrome)는 기능 영역과 섞이므로 `querySelector` 첫 매치를 신뢰하지 말고 컨테이너(예: AtelierShell aside 인덱스·aria-label·data-속성)로 좁힌다. (b) 프로덕션 빌드는 **러닝 dev 서버와 격리**하라 — preview dev가 `.next`를 점유하면 build collection이 오염될 수 있으니 dev 정지 + `.next` 클린 후 빌드. 거짓 음성/거짓 실패를 코드 결함으로 오인하지 말 것. [[작업원칙-88]] 완료=검증, [[작업원칙-45]] 3-tier fact-check와 결합.


---

## 작업원칙 #149 — P1-f 공용 포털 프리미티브(ElevatedDropdown)로 overflow:hidden 탈출 (2026-06-24 rev40)

**규칙**: 드롭다운/팝오버가 `overflow:hidden` 컨테이너(USection 등)에 잘리는 문제는 개별 컴포넌트마다 땜질하지 않고 **공용 포털 프리미티브**(`createPortal(body)` + `fixed` + `z-9999` + anchor rect 동기화 + scroll(capture)/resize/ResizeObserver 추적 + 뷰포트 하단 flip-up + anchor/panel 인지 outside-close)로 일반화한다. D4 OverflowMenu의 포털 메커니즘을 재사용해 플랫폼/공급사 드롭다운 등에 동형 적용. 근거: 컨테이너별 개별 수정은 동일 결함이 신규 드롭다운마다 재발한다 — 프리미티브 1곳 수정이 전체를 해결.

## 작업원칙 #150 — 저장 페이로드는 schema-allowlist 가드 필수 (2026-06-24 rev41, BUG-SAVE CRITICAL)

**맥락**: 저장 페이로드가 프론트 필드명(`asGuide`)을 그대로 전송했으나 Prisma 컬럼은 다른 이름(`asInfo`)이라 `Unknown arg` 500이 발생, 16개 필드 중 1개만 무효인데도 **전체 저장이 실패**했다(명화 백필/발행 차단).

**규칙**: PUT/PATCH 핸들러의 REJECT_KEYS(denylist) 방식은 신규 필드 추가 시 놓치기 쉽다 — 저장 경로는 **schema-allowlist**(Prisma 컬럼과 1:1 검증된 키만 통과, stray 키는 조용히 무해화)로 가드해 필드명 드리프트가 전체 저장을 깨지 않게 한다. 한 필드 오류가 나머지 15개 필드까지 함께 실패시키는 것은 부분 실패가 아니라 설계 결함.

## 작업원칙 #151 — SEO 진단/생성 로직은 PURE 공용 lib, 룰/금지어는 데이터 파일로 분리 (2026-06-24 rev43~45)

**규칙**: 상품명·카피 진단/생성 로직(`product-name-diagnosis.ts`, `copy-tone.ts` 등)은 **부작용 없는 PURE 함수**로 작성하고, 금지어·밴드 기준 등 튜닝 가능한 룰은 코드가 아니라 **데이터 파일**(`banned-words.ko.json` 등)로 분리한다. 여러 진입점(HOOK/NAME-DIAG/COPY-AUTO)이 동일 PURE lib+데이터를 공유해 판정 기준의 드리프트를 막는다.

## 작업원칙 #152 — 키워드 경쟁도 계산은 원시 토큰이 아니라 카테고리 검증된 키워드로 제한 (2026-06-24 rev47, NAME-DIAG-2.1)

**맥락**: keyword-competition의 head 키워드 후보 풀을 상품명 원시 토큰에서 뽑으면 교차 카테고리 오염(예: "차량용 방향제"에서 "에어컨"이 head로 잘못 선택)이 생긴다.

**규칙**: head 키워드 풀은 **카테고리 검증된 `ctx.keywords`로 제한**한다(원시 토큰 전체가 아님). 검색량 데이터가 실측과 다르게 나올 수 있음을 숨기지 말고 그대로 노출(honest — 브리프 가정과 실측이 다르면 실측을 따른다).

## 작업원칙 #153 — 카피 톤은 가격대·카테고리 기반 자동 분류 + 사유 노출, 배너에서 1클릭 전환 (2026-06-24 rev47, HOOK-HYBRID-1)

**규칙**: 카피 생성 시 톤(trust/benefit/emotion)을 가격대·카테고리로 **자동 분류하고 분류 사유를 함께 응답**한다(신선/보장→trust 강제·저가/소모품→benefit·고가/선물→emotion). UI는 추천 톤 배너 + 톤칩 1클릭 즉시전환(추가 API 호출 0)으로 운영자가 근거를 보고 바꿀 수 있게 한다. 카피는 미사여구 금지·구체적 수치/TPO 강제.

## 작업원칙 #154 — 키워드 포함 판정은 공백 무시 정규화로 (SEO 신호등 substring false-negative 방지) (2026-06-24 rev48, SEO-MATCH-1)

**맥락**: 카피에 "차량용 방향제로"가 있어도 셀러태그가 "차량용방향제"(공백 없음)면 단순 substring 매칭이 "키워드 없음"으로 오판했다(false-negative, 2개 호출처 동일 결함).

**규칙**: 키워드 포함 검사는 공용 PURE `normalizeForMatch`(소문자+전체 공백 제거) 기반 `includesNormalized`로 통일한다. 토큰 부분겹침 같은 과설계는 하지 않는다(#147 과설계 금지) — 공백 무시만으로 실사용 오탐의 대부분을 해결.

## 작업원칙 #155 — AI 제공자 체인은 무료 우선 + 라운드로빈 + 유료 폴백은 명시적 게이트 (2026-06-24 rev50, GEMINI-RESTORE/COPY-AUTO-1)

**규칙**: AI 호출 체인은 **Groq(무료)→Gemini(무료, 다중 키 라운드로빈)→Anthropic(유료)** 순서로 폴백하며, 429/quota 시 다음 키→다음 제공자로 자동 전환한다. **유료 폴백(`allowPaidFallback`)은 기본값 false**이고 운영자의 명시적 액션(사냥 버튼 클릭)에서만 true가 된다 — 무료 쿼터 소진이 조용히 과금으로 새지 않게 한다. 키 값은 로그/에러에 절대 포함하지 않고 index만 남긴다(#43 연장).

## 작업원칙 #156 — 시크릿 스캔은 히스토리+현재추적 양쪽, 값 노출 없이 prefix만 리포트 (2026-06-24 rev50, SECRETS-GUARD)

**규칙**: 시크릿 유출 점검은 **git 히스토리**(`git log -G` / `git grep`, gitleaks 부재 시 폴백)와 **현재 추적 파일** 양쪽을 스캔한다. 발견된 키는 리포트에 **값을 절대 노출하지 않고 prefix만**(예: `gsk_9pDP…`) 남긴다. 히스토리에 노출된 키는 파일 수정만으로 해결되지 않으므로 **운영자 키 ROTATION이 필수**임을 명시한다(#43 backup 패턴 금지의 연장 — 스캔 자체도 재유출을 만들지 않아야 함).

## 작업원칙 #181 — verify-first: 외부 API/기존 스키마는 구현 전 라이브 실측, 스펙 문서를 맹신하지 않는다 (2026-06-24~07-07, 반복 확인)

**맥락**: 리서치 스펙 문서의 권고("`from`→`lastChangedFrom` 리네임")가 라이브에서 400 에러로 반증되는 등, 문서 기반 가정과 실제 API 응답이 어긋나는 사례가 반복됐다(주문 배송지 중첩 경로, 옵션 shape, 활동 기록 스키마 등).

**규칙**: 외부 API 호출·기존 스키마 참조·필드 매핑을 구현하기 전에 **throwaway 프로브 또는 라이브 호출로 실제 shape/응답을 먼저 실측**한다(스펙 문서는 참고일 뿐 권위 아님). 실측 없이 문서만 믿고 구현하면 라이브에서 반증되어 재작업이 생긴다. [[작업원칙-45]](추측 금지·실측), [[작업원칙-88]](완료=검증)와 결합 — 구현 전 검증판.

## 작업원칙 #182 — 활성 탭만 마운트하는 셸은 탭 전환 후 재검증 필수 (2026-06-30, STUDIO IA SF-1)

**규칙**: `AtelierShell`처럼 `activeTab.content`만 렌더하는(비활성 탭은 언마운트) 셸 구조에서는, 특정 탭의 UI 변경 검증을 **그 탭이 활성화된 상태에서** 수행해야 한다 — 다른 탭이 활성인 채로 DOM을 조회하면 대상 컴포넌트 자체가 마운트돼 있지 않아 거짓 실패가 난다.

## 작업원칙 #183 — 넓은 중앙 레이아웃을 좁은 사이드바(384px)로 이동 시 반응형 회귀 점검 의무 (2026-06-30, STUDIO IA)

**규칙**: 넓은 중앙 컬럼 전제로 만들어진 컴포넌트를 좁은 고정폭 사이드바(예 384px)로 옮길 때는 **반응형 회귀를 의무 점검**한다 — `minWidth:0`이 자식에 없으면 좁은 컨테이너에서 넘침이 발생한다(#144 반응형 4종 하드닝의 전조 사례).

## 작업원칙 #184 — 카피/섹션 영속은 기존 평면 필드 재사용, 신규 필드 0 (2026-06-30~07-03, SF-2/SF-3b)

**규칙**: 섹션 카피 영속 같은 신규 기능은 가능하면 **기존 평면 필드**(`Product.description` 등)를 재사용하고 신규 DB 필드를 만들지 않는다. `detail_images`(string[])도 마찬가지로 섹션을 평탄화해 기존 배열 필드에 저장한다 — 계약(평면 string[] 등)은 불변으로 유지해 하위 소비자(발행 경로)를 깨지 않는다.

## 작업원칙 #185 — 슬롯 배정 저장은 debounce+silent+dirty 게이트로 autosave (2026-06-30, SF-2)

**규칙**: 보드형 편집 UI(섹션 클릭 활성화→트레이 클릭 추가→슬롯 내 순서/제거)의 저장은 **debounce + silent(토스트 스팸 금지) + savingRef + dirty 게이트**로 autosave한다. "현재 조립됨" 상태는 항상 DB(`detail_images`)를 진실원천으로 표시.

## 작업원칙 #186 — 보드 섹션 활성화는 섹션 카드 컨테이너 클릭, 헤더 클릭이 아니다 (2026-07-03, SF-2 prod 검증)

**규칙**: `DetailAssemblyBoard` 같은 섹션형 보드에서 "섹션 활성화" 인터랙션은 **카드 컨테이너 전체 클릭**으로 트리거되며, 헤더 텍스트만의 클릭 영역이 아니다. UI 검증/QA 시 이 클릭 타겟을 정확히 구분해야 거짓 실패를 피한다.

## 작업원칙 #187 — prod 빌드에서 React fiber introspection은 false-negative 가능, 관찰 가능한 상태변화로 검증 (2026-07-03)

**규칙**: 프로덕션 빌드는 `__reactProps$` 등 React 내부 fiber 프로퍼티명이 난독화/최적화로 검증 스크립트가 기대하는 형태와 달라질 수 있다 — **fiber introspection으로 UI 상호작용을 검증하지 않는다.** 대신 **관찰 가능한 상태 변화**(DOM 텍스트 변경, 토스트, 프롬프트 등)로 검증한다. [[작업원칙-45]] 3-tier fact-check의 prod 빌드 특화 보강.

## 작업원칙 #188 — Desktop 설계 문서(docs/design/*)는 항상 sync 커밋에 포함 (2026-07-03)

**규칙**: Desktop이 작성한 설계 스펙 문서(`docs/design/*`)는 코드 변경과 별개로 **항상 git sync 커밋에 포함**한다. 미커밋 설계 문서는 유실 리스크가 있다 — 문서만 있고 커밋이 없으면 다음 세션이 근거 문서를 잃는다(#62 프로세스 수정 사례).

## 작업원칙 #189 — 네이버 상세페이지는 HTML 조립 우선, 이미지 합성은 옵션 (2026-07-03, SF-4a+SF-3b)

**규칙**: 네이버 상세페이지는 **이미지 합성(단일 롱이미지)보다 HTML 조립(섹션별 텍스트+이미지 마크업)을 우선**한다 — SEO(텍스트 인덱싱)와 유지보수(섹션별 개별 수정) 양쪽에서 유리하다. 프리미엄 합성 이미지는 별도 옵션(SF-4b)으로 분리하고 기본 발행 경로에 강제하지 않는다.

## 작업원칙 #190 — 신규 개입점은 기존 Operator Action Queue(C-9)에 통합, 별도 큐/카드 신설 금지 (2026-07-06, SF-5)

**규칙**: 새로운 운영자 개입 필요 상황(예: 상세 조립 미완)이 생겨도 **별도의 큐/카드/컬럼을 만들지 않고 기존 C-9 큐에 개입 타입 1종을 추가**하는 방식으로 통합한다. [[작업원칙-87]](단일 관제탑)의 직접 적용 — 개입 표면이 여러 곳으로 흩어지면 운영자가 확인할 곳이 늘어난다.

## 작업원칙 #191 — 활동 기록은 기존 이벤트 소스 집계, 신규 로깅 인프라 금지 (2026-07-06, J2-1)

**규칙**: "활동 기록" 같은 타임라인 기능은 **기존 이벤트 소스(crawl_logs·asset_jobs·asset_registry·Product 등)를 집계**해 만들고, 이를 위한 신규 로깅 테이블/인프라를 새로 만들지 않는다. 통일된 shape(`{ts, kind, label, target}`)으로 여러 소스를 합쳐 시간 역순 정렬하면 충분한 경우가 대부분.

## 작업원칙 #192 — 주문 상태 전이 동기화는 3-endpoint 변경분 흐름, 리서치 권고도 라이브 검증 필수 (2026-07-06, ORDER-SYNC)

**규칙**: 주문 상태 전이 동기화는 `last-changed-statuses`(≤24h 변경 ID 조회) → `query POST`(상세 평면 조회) → dedup+upsert의 **3-endpoint 흐름**을 쓴다. 리서치 문서의 권고(예: 파라미터 리네임)라도 **라이브 검증 없이 채택하지 않는다**([[작업원칙-181]] verify-first) — 실제로 해당 권고는 400 에러로 반증됐다.

## 작업원칙 #193 — 동기화는 수동+자동(cron) 병행, 주문은 플랜 daily 상한 내에서 staggered (2026-07-06, ORDER-SYNC)

**규칙**: 데이터 동기화는 운영자 수동 트리거와 cron 자동 실행을 **병행**한다. 주문처럼 빈번한 변경이 있는 엔티티도 **Vercel cron 플랜의 daily 상한을 넘지 않는 범위**에서 스케줄을 짠다(여러 엔티티가 겹치면 시간을 분산·staggered).

## 작업원칙 #194 — vercel.json cron 빈도는 플랜 상한을 준수해야 하며, 변경 시 반드시 배포 검증 (2026-07-06, ORDER-SYNC)

**규칙**: `vercel.json`의 cron 빈도(예: sub-daily·hourly)가 플랜 상한(daily)을 초과하면 **배포 자체가 거부**된다. cron 설정을 변경할 때는 일반 코드 변경과 동일하게 [[작업원칙-36]](push 후 `verify-vercel-deploy.sh --wait`)를 적용해 배포가 실제로 반영됐는지 확인한다 — cron 설정 오류는 겉보기엔 배포된 것처럼 보이지만 실행되지 않을 수 있다.

## 작업원칙 #195 — 주문(Order) 개입은 대시보드 서피스로, 상품 C-9 매트릭스와는 엔티티가 다르다 (2026-07-07, ORDER-QUEUE-1)

**규칙**: 주문 관련 개입 알림(발송 필요·클레임 응대 등)은 상품 개입용 C-9 Action Queue 매트릭스에 억지로 끼워 넣지 않고, **대시보드 "오늘 처리 액션" 서피스**에 별도 노출한다 — 주문과 상품은 서로 다른 엔티티이며 개입 트리거 조건도 다르다(Order.status PAID/PAYED=발송 필요, CANCEL_REQUESTED/RETURN_REQUESTED=클레임). [[작업원칙-190]](C-9 통합 원칙)은 *상품* 개입에 한정되고, 엔티티가 다르면 서피스도 분리한다.

## 작업원칙 #196 — 네이버 v2 상품 PUT은 전량 full-replace: 모든 push는 GET-merge 필수, 부분 PUT 절대 금지 (2026-07-07, PRODUCT-LINK 리서치)

**규칙**: 네이버 Commerce API `PUT /v2/products/origin-products/{no}`는 **요청 body에 없는 필드를 상품에서 제거하는 전량 교체(full-replace)** 방식이다. 따라서 이 엔드포인트로 향하는 **모든 push는 예외 없이 GET-merge**(현재 전체 상태를 GET → 변경할 필드만 교체 → 전체 payload PUT)를 거쳐야 하며, `{stockQuantity}`처럼 일부 필드만 담은 부분 PUT은 절대 금지한다. 예외: `detailContent`만 생략 시 기존 값 유지(다른 필드와 달리 생략=유지), `seoInfo`는 빈 값 전송 시 삭제로 처리되므로 유지하려면 **항상 명시 전송**해야 한다.

**근거**: 부분 PUT은 명시하지 않은 필드(상품명·가격·이미지·옵션·원산지·상세 등)를 네이버 상품에서 통째로 날린다(commerce-api discussion #1650). CLAUDE.md §3-7에 이미 코드 절대 규칙으로 격상되어 있으며, `api-client.ts`의 `updateStock`/`setProductOutOfStock`/`bulkUpdateStock`이 이 GET-merge 패턴으로 교정 완료된 것이 실제 적용 사례.

## 작업원칙 #197 — 네이버 양방향 동기화는 필드별 SoR(Source of Record) 고정 + syncHash 에코 방지 + CONFLICT는 운영자 큐로 (2026-07-07, PRODUCT-LINK 리서치)

**규칙**: 네이버-앱 양방향 동기화는 필드마다 **SoR을 고정**한다 — **재고는 네이버가 SoR**(실주문 보호, 앱이 임의로 덮어쓰지 않음), **상세/가격/옵션은 앱이 SoR**(앱에서 편집한 값이 권위). push 전에는 반드시 **pull을 먼저 수행**(최신 네이버 상태 확인 없이 push하면 GET-merge의 GET이 스테일해짐). 앱이 쓴 값을 다시 pull해서 자기 자신의 변경을 변경으로 오인하지 않도록 **syncHash로 에코를 방지**한다. 두 SoR이 동시에 바뀐 **충돌(CONFLICT)은 자동 해소하지 않고 운영자 큐**로 넘긴다.

**근거**: 재고를 앱이 SoR로 삼으면 네이버에서 실시간 주문으로 빠진 재고를 앱이 덮어써 초과판매를 유발할 수 있다. 반대로 상세/가격은 운영자가 앱에서 편집하는 워크플로이므로 앱이 권위가 맞다. [[작업원칙-196]](full-replace PUT)과 결합 — SoR이 다른 필드가 섞인 payload를 GET-merge 없이 보내면 한쪽 SoR의 최신 값을 반대쪽이 덮어쓴다.

## 작업원칙 #198 — 상품 식별자는 origin/channel 유형을 함께 저장, 매핑키는 originProductNo (2026-07-07, PRODUCT-LINK 리서치)

**규칙**: 네이버 상품 식별자는 origin(상품 단위)과 channel(채널 단위) 두 유형이 있고 **번호 공간이 겹칠 수 있어(숫자 충돌 가능) 유형을 함께 저장**해야 한다. 앱-네이버 매핑의 기준 키는 **originProductNo**로 고정한다.

## 작업원칙 #199 — 임포트/동기화는 선택 소수 상품 전제, 대량 일괄은 금지 (2026-07-07, PRODUCT-LINK 리서치)

**규칙**: 네이버 상품 임포트·동기화 기능은 **운영자가 목록에서 선택한 소수 상품**(체크박스 또는 번호 직접입력) 전제로 설계한다 — full-replace PUT은 건당 ~2초가 걸리고 네이버 API에 429(rate limit) 위험이 있으므로 **대량 일괄 처리는 금지**한다.

## 작업원칙 #200 — 외부 API 필드 매핑은 필드별로 개별 라이브 실측, "한 필드 정상"이 "전 필드 정상"을 보장하지 않는다 (2026-07-07, ORDER-SYNC-2)

**맥락**: 주문 배송지가 전량 빈값이었던 근본 원인은 `customerName`(정상 경로 `order.ordererName`)은 맞게 매핑됐지만 배송지는 `productOrder.shippingAddress`라는 **다른 중첩 경로**를 써야 하는데 `el.shippingAddress`(부재)를 조회했기 때문이다. 한 필드가 정상이라고 나머지도 정상이라 가정한 것이 결함의 원인.

**규칙**: 외부 API 응답의 필드 매핑을 구현/점검할 때는 **필드마다 개별적으로 라이브 실측**한다 — 같은 응답 객체 안에서도 필드별로 중첩 경로가 다를 수 있다. [[작업원칙-181]](verify-first)의 확장.

## 작업원칙 #201 — 동기화 검증은 건수뿐 아니라 필드 완전성까지 확인한다 (2026-07-07, ORDER-SYNC-2)

**규칙**: "동기화됨"의 검증 기준은 **행 개수 일치만으로 충분하지 않다** — 실무에 필수적인 핵심 필드(배송지·수령인·연락처 등, 없으면 발송 자체가 불가능한 필드)가 채워졌는지까지 **필드 완전성 체크리스트**로 확인한다. 24건이 동기화됐어도 배송지가 전부 빈값이면 실무상 무용지물이다.

## 작업원칙 #202 — 동기화(sync) 수정은 DB뿐 아니라 UI 표출까지 완결해야 완료다 (2026-07-07, ORDER-UI-1)

**규칙**: 데이터 동기화 버그를 고칠 때 **DB 값만 고치고 화면(UI)에 노출하지 않으면 실무상 미해결**이다 — 셀러는 화면을 보고 작업하므로, sync 수정은 항상 **DB 수정 + UI 표출**을 한 쌍으로 완결한다. [[작업원칙-201]](필드 완전성)의 표출 확장.

## 작업원칙 #203 — 앱의 주문 기능 스코프는 "정보 동기화+조회 전용", 실제 발송/운영은 네이버 스토어에서 (2026-07-07, ORDER 워크스트림 확정, 운영자 확정 스코프)

**규칙**: 앱 내 주문 기능의 스코프는 **정보 동기화와 조회에 한정**한다 — 실제 발송 처리·주문 운영은 네이버 스토어 자체에서 수행한다(앱 내 인라인 발송 기능은 스코프아웃). 앱의 목표는 "오류 없는 정확한 동기화"이지 네이버 스토어의 주문 관리 기능을 복제하는 것이 아니다. 향후 주문 관련 기능 제안 시 이 스코프를 기준으로 판단한다.

## 작업원칙 #216~#222 — 대시보드·셸 리팩터 확정 규칙 묶음 (2026-07-09, DASHBOARD_SHELL_REFACTOR 마일스톤)

**맥락**: Phase 1(IA)·2(미감)·2b(브랜드팔레트)·3(장식/모션)·배경중립화를 아우르는 대시보드/셸 전면 리팩터. 권위 문서: `DASHBOARD_SHELL_REFACTOR_SPEC` / `DASHBOARD_SHELL_REDESIGN_RESEARCH` / `CONCEPT_DESIGN_TOKENS` / `KKOTIUM_BRAND_PALETTE` / `BACKGROUND_FONT_NEUTRALIZE_SPEC`.

**규칙**:
- **#216 (Phase 1 IA)**: 대시보드 최상단은 단일 "오늘 할 일" 큐(발송/클레임/품절/상품개입 병합, "지금 N건" + primary 1)로 통합하고, KPI는 4카드(오늘매출/신규주문/정산예정/품절경보, 외부 데이터 정직 degrade는 [[작업원칙-82]]/[[작업원칙-45]] 준수)로 압축한다. 기존 22개 위젯은 손실 없이 핵심 노출+점진적 공개로 재배치한다([[작업원칙-134]] 점진적 공개와 결합).
- **#221 (팔레트 불변)**: 트렌디 시맨틱 색(민트/앰버/코랄/스카이)과 레거시 `--kk-red`/`--gp-red-*` 토큰은 `--brand-red` 등 신규 토큰을 경유하도록만 리다이렉트하고, 팔레트 자체(주색 2색 고정)는 변경하지 않는다.
- **#222 (가독 폰트 + 배경중립화)**: 밀집 데이터(테이블 셀 등)에는 `.kk-readable`(Pretendard) 클래스를 행 컨테이너 앵커 단위로 적용해 가독성을 높이되, 제목 폰트(display/body)의 역할은 오염시키지 않는다.

## 작업원칙 #223 — KPI 시계열은 기존 트랜잭션 테이블 직접 집계, 신규 metrics 테이블 회피 (2026-07-09, 비운영자 병렬 큐 P1)

**규칙**: KPI 시계열 데이터는 신규 `metrics` 집계 테이블을 만들지 않고 **기존 트랜잭션 테이블(Order 등)을 직접 집계**한다(중복 데이터원 방지, [[작업원칙-191]] 신규 인프라 금지와 동일 정신). 로컬에서 집계한 실값은 외부(네이버) API degrade 상태와 명확히 구분해 **항상 실값으로 표시**한다(0도 실값 — [[작업원칙-82]]). 스파크라인 등 소규모 시각화는 차트 라이브러리 도입 없이 **경량 인라인 SVG**로 구현한다.

## 작업원칙 #224 — 상태 색 통일은 도메인별 다상태 택소노미를 보존한 채로 (4토큰 축소 금지) (2026-07-09, Phase 2c)

**규칙**: 상태 배지 색을 마스터 시스템으로 트렌디 통일할 때, **일반적인 단일의미 시맨틱**(success/warning/danger/info) 4토큰과 **도메인별 다상태 택소노미**(예: 주문 상태 5종, 관제탑 OVERALL 5종)를 혼동하지 않는다. 도메인 다상태는 **보존**하되 색상 팔레트만 마스터 12색 체계로 통일한다 — 4토큰으로 축소하면 상태 구분 정보 자체가 소실된다.

## 작업원칙 #226 — 상태 배지 색 규칙: 배경/텍스트/포인트 컬러 역할 분리 + 솔리드는 대형·볼드 한정 (2026-07-09, MASTER_STATE_COLOR_SYSTEM)

**규칙**: 상태 배지의 색 적용은 역할별로 분리한다 — **배경(-bg)**은 틴트, **텍스트(-tx)**는 AA 대비를 만족하는 다크 톤, **점/보더(-fg)**는 포인트 컬러로 사용한다. 솔리드 배경 + 흰 텍스트 조합은 **대형·볼드 배지에만** 한정 사용한다(작은 배지에 솔리드+흰텍스트를 쓰면 대비/가독이 깨지기 쉬움). Lucide 아이콘 색은 `style={{color}}`로 직접 지정(Tailwind 클래스 상속에 의존하지 않음).

## 작업원칙 #227 — 상태 택소노미는 페이지군별 즉흥 정의 금지, 단일 마스터 12색 (2026-07-09, MASTER_STATE_COLOR_SYSTEM)

**규칙**: 전체 앱의 상태 택소노미는 **단일 마스터 12색 체계**로 관리하며, 페이지/위젯마다 색을 즉흥적으로 새로 정의하지 않는다. 신규 상태 유형이 필요하면 마스터 팔레트에서 매핑하고, 팔레트 자체를 확장할 때만 중앙에서 추가한다(#224 다상태 보존과 결합 — 축소가 아니라 통일).

---

**이관 경위 및 잔여 갭 (2026-07-14 Code 세션)**: 위 항목들은 `docs/plan/PARALLEL_WORK_TRACKER.md`의 이전 커밋(5c9e9f5 직전, `git show 5c9e9f5^:docs/plan/PARALLEL_WORK_TRACKER.md`로 복구)에 남아있던 rev40~rev50 원문에서 "원칙 #NNN 박제" 표기를 grep해 추출·정식화했다. **주의**: 커밋 5c9e9f5("rev51 — 3주 문서 갱신 공백 보정")는 커밋 메시지에 "rev50 이하 원문 보존"이라 명시했으나, 실제로는 PARALLEL_WORK_TRACKER.md에서 해당 원문 528줄을 전량 삭제했다(그 결과 HEAD의 "## rev50 이하 원문" 섹션은 헤더만 남고 본문이 없었다) — 이번 이관은 git 히스토리에서 복구한 원문을 근거로 했다. #149~#253 범위 중 **#165, #217~#220, #225, #231은 원문 grep 결과 개별 규칙 본문이 존재하지 않았다**(이전 인덱스의 "확인된 번호 범위" 기재가 부정확했음 — #216~#222는 하나의 묶음 커밋 메시지에서 언급된 범위 표기였을 뿐 전 번호가 개별 정의를 가진 것은 아니었다). [[작업원칙-115]](의도적 결번 표기, #110~#112 선례)와 동일하게, 이 6개 번호는 실제 정의가 없는 결번으로 간주한다.

---

## 작업원칙 #254 — 상품 IA=라이프사이클 단계 구성·역할버킷·포커스모드 (2026-07-12/13, PRODUCT_IA_REDESIGN_V2 확정)

**규칙**: 상품 관리 메뉴 구조는 상품의 라이프사이클 단계(소싱→작성중→발행연동→사후관리)를 따라 구성하고, 각 메뉴는 "역할 버킷"(그 단계에서 필요한 기능 전부를 흡수)과 "포커스 모드"(다른 단계 관심사는 노출하지 않음)를 가진다. 나눔 기준 = 발행 여부. 확정 명명(SoT): 꿀통 창고(소싱+창고 통합·크롤링탭+작성중탭) / 온실아틀리에(씨앗심기+꽃단장 작업실) / 꽃밭 돌보기(연동+앱등록 통합·SEO진단+품절대체 흡수). 권위: `docs/design/PRODUCT_IA_REDESIGN_V2_CONFIRMED_2026-07-12.md`.

## 작업원칙 #255 — 네이버 미제공 지표는 자체지수로 우회하되 정직 caveat 필수 (2026-07-12/13)

**규칙**: 네이버가 API로 제공하지 않는 운영 지표(예: 재고 회전율, 판매 추세 세부)는 자체 산출 지수(튜닝 필요도 지수·좀비 감지 점수 등)로 우회할 수 있으나, UI에 반드시 "이 지수는 근사치이며 실제 네이버 데이터와 다를 수 있다"는 정직 caveat를 노출한다. 추정치를 확정 사실처럼 표시 금지(#46 거짓 라벨 금지의 연장).

## 작업원칙 #256 — 메뉴 명명은 운영자 확정 은유가 SoT, 라우트는 보존 (2026-07-12/13)

**규칙**: 사이드바 메뉴명(꿀통 창고/온실아틀리에/꽃밭 돌보기 등)은 운영자가 확정한 은유적 명명이 유일한 SoT이며, 절대 재질문 없이 그대로 사용한다. 단 내부 라우트 경로(`/crawl`, `/products/new`, `/products/link` 등)는 이름 변경과 무관하게 보존한다(딥링크·북마크·코드 참조 안정성). 명명 변경 시 표시 라벨만 바꾸고 라우트는 유지.

## 작업원칙 #257 — "작동하지만 조용함" vs "고장"을 구분하고 가시화로 신뢰 확보 (2026-07-12/13)

**규칙**: 기능이 정상 작동하지만 결과가 사용자에게 보이지 않는 상태("조용히 작동")와, 실제로 고장난 상태("고장")를 UI에서 명확히 구분한다. 조용히 작동하는 기능은 결과를 가시화하는 UI(배지·인디케이터·로그)를 추가해 운영자가 "이게 되고 있나?"를 재차 묻지 않게 한다. #54(적용현황 상시 명시)의 연장 — 결과가 안 보이면 운영자 입장에서는 고장과 구분 불가능하다.

## 작업원칙 #258 — 알림 개선은 실물 발송 확인이 필수(코드 존재 ≠ 실제 노출) (2026-07-12/13)

**규칙**: 디스코드/카카오 등 알림 콘텐츠 개선(문구·페르소나·데이터 정확도)은 코드 배포만으로 "완료" 처리하지 않는다. 실제로 1회 이상 발송해 운영자가 눈으로 확인해야 완료(#88 완료=검증의 알림 도메인 적용). 코드가 정상이어도 실제 발송 트리거(cron 조건·환경변수·시크릿)가 막혀 있으면 무용지물이므로, 실발송 검증을 발행 게이트처럼 취급한다.

## 작업원칙 #259 — 꼬띠 페르소나 SoT는 KKOTTI_PERSONA_VOICE_GUIDE.md, 디스코드+앱 전체 적용 (2026-07-12/13)

**규칙**: 꼬띠(마스코트)의 목소리/톤/모드 분기(정원사🌷 vs 카우걸🤠)는 `docs/design/KKOTTI_PERSONA_VOICE_GUIDE.md`가 유일한 권위 문서다. 디스코드 알림뿐 아니라 앱 UI 전체(빈 상태·토스트·에러 문구)에 일관 적용한다. 신규 사용자 대면 문구 작성 시 이 가이드를 먼저 참조하고, 가이드에 없는 새 상황은 가이드 자체를 갱신해 드리프트를 막는다.

---

## 작업원칙 #260 — 재고 스냅샷 qty=-1/status=unknown은 UI에 "재고 N개"로 노출 금지(폴링 실패와 진짜 0 재고 혼동 방지) (2026-07-14 Desktop 발견)

**배경**: `/products`(꽃밭돌보기) 상품 카드가 명화 상품에 "재고 -1개"를 표시. 근본 원인 추적 결과 `inventory_snapshots.qty=-1`은 도매매(domeggook) `getItemView` API가 해당 productNo를 찾지 못했을 때(`dcode:ITEM_ERROR, dmessage:"해당 정보가 존재하지 않습니다"`) 어댑터가 반환하는 **명시적 "폴링 실패/알 수 없음" 센티널 값**이지 실재고가 아니다(`src/lib/sources/domemae-adapter.ts` getInventory 함수 참조). 폴링 대상 3개 상품(명화·달항아리·1건 추가) 전부가 2주 이상(2026-06-28~07-13 확인) 연속으로 이 상태다 — `source='NATIVE'`(직접 등록) 상품에 채워진 `supplier_product_code`가 실제 도매매 상품번호와 매핑되지 않는 것으로 보임(소싱 당시 값 오기입 또는 매핑 정책 미비 추정, 미확정).

**규칙**: (1) `qty=-1` 또는 `status='unknown'`인 스냅샷은 UI에 **절대 숫자 그대로 노출 금지** — "재고 확인 실패" 또는 "폴링 대기" 같은 명시적 상태 문구로 표시한다(#46 거짓 라벨 금지 연장 — 음수 재고는 사용자에게 데이터 이상으로 오인되거나, 반대로 무시되어 진짜 폴링 결함을 숨긴다). (2) `source='NATIVE'`(직접 등록) 상품을 도매매 실시간 재고 폴링 대상에 포함시킬지 여부를 재검토한다 — 크롤링 기원이 아닌 상품은 애초에 도매매 실물 매핑이 보장되지 않으므로, 폴러 대상 필터(`loadProductsToPoll`, `dome-inventory-poller.ts`)가 `source`를 무시하고 `supplier_product_code IS NOT NULL`만 보는 현재 로직이 근본 결함일 가능성이 있다. (3) 폴링이 N회 연속 실패하는 상품은 개입 대기열에 "재고 확인 불가 — 소싱 코드 재확인 필요" 카드로 표면화한다(#56 자연스러운 개입 노출).

**상태**: 코드 수정 미실시(진단만 완료 — 명화 발행과 무관한 별도 이슈이므로 운영자 확인 후 착수, 명화 발행 자체는 보류 중이며 이 항목도 발행과 독립적으로 처리 가능). 실측 근거: `inventory_snapshots` 테이블 SQL 조회(Supabase MCP) + `/api/crawler/domemae` POST 라이브 호출로 도매매 API 원문 에러 확보(2026-07-14). 전상품 확인 완료(#62) — 폴링 대상 3건 전부 동일 증상, 명화 단건 이슈 아님.


## 작업원칙 #271 — 공급처 단절(소싱처 소멸)은 재고 실패 센티널의 "지속성"으로 판정한다 (2026-07-18)

**맥락**: qty=-1(#260 조회 실패 센티널)만으로는 "일시적 폴링 실패"와 "공급사가 도매꾹에서 상품을 내린 영구 소멸"을 구분할 수 없다. 실제로 명화·아이스틀·달항아리 모두 2주+ 연속 -1이었으나(#270 파서 버그), 파서 정상화 후 아이스틀·달항아리는 다음 폴에서 실재고로 복구되고 명화만 -1이 지속됐다.

**판정 규칙(전상품 범용·#55)**:
1. 최신 스냅샷 qty=-1 **이면서** 최근 연속 N회(현재 3) 이상 -1이 지속되면 `sourceGone=true`(공급처 단절).
2. 살아있는 상품의 일시 실패는 1~2폴 안에 자가 복구되므로 걸리지 않는다. 하차 상품은 -1이 무한 지속돼 걸린다.
3. 판정은 스냅샷 히스토리 in-memory 집계로(추가 DB 쿼리 0). 명화 전용 하드코딩 금지(#55·CLAUDE.md §0).

**UX**: 공급처 단절은 재고 신호가 아니라 **운영 신호**("이 상품은 다시 못 들여오니 정리하세요") → "공급처 단절 · 삭제 권장" 자주빛 배지(활성 재고 빨강과 색 구분). 배지가 삭제를 유도하고, 삭제 게이트(#46 강경고)가 안전판.

**연계 개선(미착수)**: 좀비/건강 판정(zombie-verdict)에도 sourceGone을 반영해야 함 — 공급처 소멸 상품에 "잘 자라는 중" 건강 배지가 붙는 모순 방지(#62 전체 정합).


## 작업원칙 #272 — 상품 삭제는 "지킬 자산이 있는가"로 판단한다. 판매 이력이 있으면 삭제가 아니라 대체 소싱 (2026-07-18)

**맥락**: 명화(소싱처 소멸) 삭제 후 운영자 질문 — "품절 상품도 삭제가 좋은가, 보관이 좋은가?"

**핵심 사실**: 네이버 스마트스토어의 실질 자산은 **상품 URL에 누적된 이력**이다.
- 리뷰·구매평 (삭제 시 영구 소멸, 복구 불가)
- 판매 건수·찜 수 (0으로 리셋)
- 상품ID 기준으로 축적된 검색 순위 (처음부터 다시)

리뷰 50개 달린 상품을 지우고 재등록하면 **리뷰 0개 신규 상품**이 되고 순위 회복에 수개월이 걸린다. 파워셀러가 품절 상품을 절대 지우지 않는 이유이며, 유료 셀러툴들도 삭제 대신 "판매중지 + 대체 소싱"을 민다.

**판단 규칙(전상품 범용·#55)**:

| 상황 | 권장 액션 |
|---|---|
| 일시 품절 | 품절 처리(OUTOFSTOCK) — 상품 살려두고 재고만 0 |
| 장기 품절 | 판매중지(SUSPENSION) — 검색 하락하나 URL·리뷰 보존 |
| 소싱 단절 + 판매 이력 O | **판매중지 + 대체 소싱** — 같은 URL에서 공급처만 교체해 순위·리뷰 승계. **삭제 금지** |
| 소싱 단절 + 판매 이력 X | 삭제 안전 — 지킬 자산이 없음 |

**앱 구현 원칙**:
1. 자산 유무 판정은 `sales-assets.ts` 단일 권위(salesCount>0 또는 lastSaleDate 존재).
2. 공급처 단절 배지는 자산 유무로 권장 액션을 분기한다("삭제 권장" vs "대체 소싱 권장").
3. 삭제 경고는 **잃을 것에 비례**한다 — 자산이 있으면 구체적 손실(리뷰·순위)을 명시하고 대안을 제시, 없으면 단순 확인. 무조건 강경고는 경고 피로를 만들어 오히려 위험하다.

**부수 원칙(클라/서버 경계)**: 클라이언트 컴포넌트(`'use client'`)에서 쓰는 판정 로직은 prisma 의존 모듈에서 분리한다. tsc는 통과하지만 build/런타임에서 터지므로 **build 검증이 필수**(#32 재확인).

---

## 작업원칙 #273 — "신호"까지가 아니라 "결론"까지 앱이 낸다. 처분 권고는 단일 엔진이 판정한다 (2026-07-21)

**맥락**: #272에서 삭제 vs 보관 정책을 문서로 정리했으나, 앱은 여전히 *신호*(재고 배지·공급처 단절·좀비 지수)만 보여주고 *결론*은 운영자 머릿속에 있었다. 운영자 요청 — "권고사항대로 앱이 이 판단을 대신하게 해달라".

**발견한 실제 결함**: `/products/out-of-stock` 페이지의 `getOosAdvice`가 판매 이력을 모른 채 "30일 품절 + 꿀통 낮음 = 정리 권장"을 띄우고 있었다. 리뷰·순위가 쌓인 상품에도 그대로 떠서 **#272를 정면으로 위반**했다. 정책을 문서에만 두면 코드가 조용히 어긋난다.

**규칙**:
1. 처분 결론은 `disposition.ts` 단일 권위가 낸다(#62). 소비처(배지·품절 페이지·삭제 게이트)는 자체 규칙을 두지 않는다.
2. 판정은 **가중치 합산이 아니라 우선순위 분기**다. 소싱 단절은 확정 신호로 다른 조건을 덮어쓴다(#271과 같은 사상).
3. **이미 조치된 상품에는 권고하지 않는다.** 네이버 상태가 SUSPENSION이거나, 단기 품절인데 이미 OUTOFSTOCK이면 `NONE`. 처리 끝난 상품에까지 배지가 남으면 경고 피로가 생겨 진짜 권고까지 무시하게 된다(#272의 "경고는 잃을 것에 비례" 연장).
4. **판단 근거와 무관한 점수를 판단에 섞지 않는다.** 꿀통지수는 *재입고 우선순위*에만 쓰고 *처분 여부*에는 쓰지 않는다 — 점수가 높다고 자산이 지켜지는 것도, 낮다고 지워도 되는 것도 아니다.
5. 권고는 **기존 배지를 승격**해 싣는다. 배지를 새로 추가하지 않는다(#233 과밀).

**판정표**(전상품 범용 #55):

| 조건 | 권고 | 색 |
|---|---|---|
| 소싱 단절 + 판매이력 O | 대체 소싱 | 자주 |
| 소싱 단절 + 판매이력 X | 삭제 | 자주 |
| 품절 + 스토어 판매중 | 품절 처리 | 빨강 |
| 품절 14일 이상 | 판매중지 | 주황 |
| 미발행 / 조회실패 / 조치완료 / 재고정상 | 권고 없음 | — |

**임계값 근거(14일)**: 네이버는 장기 품절 상품의 노출을 점진적으로 낮춘다. 품절로 방치하면 순위가 서서히 깎이지만 판매중지는 검색에서만 내려가고 URL·리뷰는 보존된다. 2주면 공급사 재입고 여부가 판가름나는 시점과, 순위 손상이 누적되기 전인 시점이 맞물린다(운영자 결정).

**검증 방식(참고)**: 프로덕션 DB에 테스트 데이터를 주입하는 대신 **임시 프리뷰 라우트**에 전 분기를 한 화면에 렌더해 육안 확인 후 라우트를 삭제했다. 실데이터 오염 위험 0이고 분기 누락도 한눈에 보인다 — 배지·카드류 검증의 기본형으로 삼는다. 로직은 별도 15케이스 테이블 테스트로 경계값(임계 정확히/임계-1)까지 확인.

---

## 작업원칙 #274 — 배지는 지우지 말고 줄을 세워라. 순서 기준은 "돈이 새는 순서" (2026-07-21)

**맥락**: 상품 행 이름칸에 배지가 7개까지 쌓여 행 높이 178px. 매일 보는 목록이라 스캔 비용이 그대로 운영 비용이 된다(#233).

**핵심 판단**: 배지는 **각자 필요해서 생긴 것**이라 지우면 정보가 사라진다. 삭제가 아니라 **순서 + 접기**가 답이다 — 상시 노출은 들어가는 만큼만, 나머지는 "+N"으로 접는다. 정보 손실 0, 스캔 비용만 감소.

**순서의 기준**(`badge-priority.ts` 단일 권위 #62): 디자인 취향이나 구현 편의가 아니라 **"이 배지를 못 보고 지나치면 얼마를 잃는가"**로 줄을 세운다.

| 급 | 성격 | 예 | 값 |
|---|---|---|---|
| 1 | 사고 — 되돌릴 수 없는 손실 | 처분 권고(#273) | 10 |
| 2 | 매출 — 지금 돈이 새는 중 | 좀비·마진 위기 | 20 |
| 3 | 신뢰 — 판단 근거가 틀어짐 | 앱↔네이버 불일치 | 30 |
| 4 | 상태 — 사실 정보 | 재고·발행상태·준비도 | 40~60 |
| 5 | 개선 — 여지 | 상품명 등급 | 70 |
| 6 | 메타 — 분류 | 출처 태그 | 80 |
| 7 | 식별자 | SKU | 90 |

값을 10단위로 띄우는 이유: 새 배지가 생겨도 기존 값을 안 건드리고 사이에 끼운다.

**★ 고정 개수가 아니라 실측이다**: 처음엔 "상위 3개 고정 노출"로 만들었으나 좁은 칸에서 3개가 안 들어가 잘렸다. 배지 폭은 내용에 따라 34~199px로 제각각이라 **개수로는 절대 못 맞춘다**. 미러 측정(visibility:hidden) + ResizeObserver로 컨테이너 폭과 각 배지 실제 폭을 재서 들어가는 만큼만 노출한다. 화면폭·컬럼구성·문구가 바뀌어도 스스로 맞는다.

**부수 규칙**: 행 전체가 클릭 가능한 목록에서 쓰이므로 "+N" 트리거와 팝오버는 반드시 `stopPropagation` — 배지를 보려다 패널이 열리면 안 된다. 팝오버 구현 관례(포털·viewport clamp·Escape·바깥클릭)는 기존 `OverflowMenu`를 그대로 계승한다(#62 — 같은 앱에서 같은 종류의 UI가 다르게 동작하면 안 된다).

---

## 작업원칙 #275 — 데이터 테이블에서 열이 "조용히 사라지는" 것보다 가로 스크롤이 언제나 낫다 (2026-07-21)

**발견 경위**: #274 작업 중 브라우저로 행 높이를 실측하다 **상품명 칸의 width가 0px**인 것을 발견했다. 배지 정리 때문이 아니라 **원래 그랬다**.

**원인**: `grid-template-columns: 36px 1fr 90px 110px 130px 62px 90px 72px 70px`에서 `1fr`은 `minmax(auto, 1fr)`이다. 고정 트랙 합(660px) + gap(64px) = 724px가 컨테이너 가용폭(약 710px)을 넘는 순간 `1fr` 트랙이 **0px로 붕괴**한다. 목록에서 가장 중요한 상품명과 SKU가 모든 데스크톱 폭에서 보이지 않았고, 배지만 블록 요소라 밖으로 흘러넘쳐 "뭔가 보이니까 정상"처럼 착시를 일으켰다.

**규칙**:
1. 데이터 테이블의 주요 정보 열에는 **반드시 하한**을 준다 — `1fr`이 아니라 `minmax(260px, 1fr)`.
2. 그래도 안 들어가면 **침묵 붕괴가 아니라 가로 스크롤**로 넘긴다. 없어진 정보는 운영자가 없어진 줄도 모른다. 스크롤은 최소한 "더 있다"는 사실을 알려준다.
3. 최소 테이블 폭은 **컬럼 정의 문자열에서 계산**한다. 상수를 따로 두면 컬럼을 바꿀 때 어긋난다(#62).

**검증 방법(중요)**: 이 결함은 스크린샷만으로는 못 잡는다(배지가 흘러넘쳐 채워 보임). **DOM 실측**(`getBoundingClientRect().width`)이 필요했다. 앞으로 레이아웃 변경 시 스크린샷과 DOM 실측을 **둘 다** 본다 — #265("수치 PASS ≠ 화면 정상")의 역방향 짝: **화면이 그럴듯해도 수치가 0일 수 있다.**

**전수 확인**: 같은 패턴을 앱 전체(대시보드·주문·소싱·재활성화·크롤·시장·성장·관제탑 등)에서 스캔 — 0폭 트랙을 가진 그리드는 상품 목록 하나뿐이었음을 브라우저 실측으로 확인. 단건 수습이 아니라 전수 확인까지가 한 세트다.

---

## 작업원칙 #276 — 밀집 목록의 배지는 "무엇"만 말하고 "왜"는 hover로 내린다 (2026-07-21)

**맥락**: 배지 레일(#274)을 적용했는데도 배지 하나가 199px를 먹어 다른 신호를 전부 밀어냈다. 범인은 `TuningBadge`의 인라인 사유("좀비 발견 · 순마진 0.0% — 마진 위기").

**규칙**: 목록 행처럼 밀집된 맥락의 배지는 **라벨(무엇)만** 인라인으로 두고, 사유·수치·제안(왜)은 hover 툴팁으로 내린다. 툴팁에 이미 전문이 있으므로 **정보 손실 0**이면서 폭은 199px → 75px로 줄어든다.

**구현 관례**: 배지 컴포넌트는 `compact?: boolean` prop을 받아 밀집 맥락에서 켠다. 상세 화면처럼 여유 있는 곳에서는 기본값(전체 노출)을 그대로 쓴다 — 같은 컴포넌트가 맥락에 따라 밀도를 바꾸는 것이지, 컴포넌트를 두 벌 만드는 게 아니다(#62).

**일반화**: "한 요소가 공용 공간을 독점하면, 그 요소를 빼는 게 아니라 그 요소의 밀도를 낮춘다."
