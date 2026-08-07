# 결과 보고 — 트랙③구현: 카테고리 정밀화 1단계 (Claude Code 레인)

> **담당**: Claude Code
> **작성**: 2026-08-07
> **명세**: `docs/handoff/TRACK3_IMPL_HANDOFF_2026-08-07.md`
> **BASELINE**: main `d075fc2`(착수 전 git pull 확인, 명세 baseline `6532d2f`보다 최신 — rev109 트랙C-3 커밋 포함된 상태에서 착수)
> **결과 커밋**: `6b8b585` — "feat: 트랙③ 1단계 — 카테고리 전환 한정어 사전 + detectCategoryMismatch"
> **배포**: `verify-vercel-deploy.sh --wait` OK — production `6b8b585`

---

## 1. 변경 내용

- `src/lib/category-mismatch-dict.ts`(신규): 명세 §3-1·설계 §4-4 그대로 6개 축(`bodyPart`·`animal`·`placeVehicle`·`targetDevice`·`ageUser`·`miniature`) 블랙리스트 + `WHITELIST_MODIFIERS`(정상 하위속성) + `HEAD_NOUN_WHITELIST`(head noun별 확장용, 초기 빈 객체 — 운영자 오탐 신고 누적 시 채우는 구조만 마련).
- `src/lib/wholesale-matcher.ts`: `detectCategoryMismatch(productName, keyword)` 함수 추가(export, 단위 테스트 가능한 순수 함수). `WholesaleProduct` 인터페이스에 `categoryMismatch: 'suspect'|null`·`categoryMismatchAxis`·`categoryMismatchModifier` 3필드 추가. `searchDomeggookMarket` 내부에서 매칭 결과 생성 시 채움. **정렬 로직은 손대지 않음**(명세 §4 지시대로 — 정렬/표시 반영은 Desktop의 후속 작업).

## 2. ★ 실측 중 발견·수정한 오탐 (설계 §5 체크리스트 3번이 예견한 위험의 실제 사례)

단순 substring 매칭(공백 전부 제거 후 `modifier+keyword` 포함 여부)으로 1차 구현했으나, **실 DB 데이터로 교차검증하는 과정에서 실제 오탐을 발견**했다:

- 키워드 `"멀티탭"`, 상품명 `"...와이파이 멀티탭..."` → 공백을 통째로 제거하면 `"...파이멀티탭..."`이 되어, 축A(bodyPart) 한정어 `"이"`(치아/이)가 `"이"+"멀티탭"`으로 **우연히 매칭**됐다. `"이"`는 `"와이파이"`의 마지막 음절일 뿐 신체부위 의미가 전혀 아니다.

**근본원인**: 공백을 전부 지우고 비교하면 원래 서로 다른 단어(토큰)였던 두 단어가 인위적으로 이어붙어, 단일 음절 한정어(특히 `"이"`처럼 흔한 음절)가 무관한 단어의 말음절과 우연히 결합할 수 있다.

**수정**: `hasTokenBoundedPrefixMatch()` 헬퍼를 추가해 판정을 토큰(띄어쓰기) 단위로 재설계했다.
1. **같은 토큰 안에서 수식어+키워드가 붙어있는 경우** (예: `"귀청소기"`, `"차량용청소기"` — 셀러가 공백 없이 입력한 정상 복합어) → 매칭.
2. **수식어가 그 자체로 독립된 토큰이고, 바로 다음 토큰이 키워드로 시작하는 경우** (예: `"차량용 청소기"` — 설계 §4-4 경계사례에서 명시적으로 실존을 확인한 패턴) → 매칭.
3. 그 외(서로 다른 단어에 걸쳐 우연히 이어붙는 경우, 예의 `"와이파이"+"멀티탭"`) → 매칭 안 함.

이 방식은 설계 §5 체크리스트가 미리 지적한 "단순 substring 매칭 시 오탐 위험 — 토큰 경계 확인 권장"을 그대로 구현한 것이며, 명세가 제시한 접두 패턴 판정 로직의 정신(수식어가 head noun 바로 앞)을 유지하면서 교차-토큰 우연 결합만 차단한다.

## 3. 검증 결과

- **tsc**: 0 errors
- **build**: 0 errors
- **알려진 케이스 단위 검증**(9건, 명세 §6-2 지정 케이스 + 추가 경계 케이스, Node/tsx로 순수함수 직접 호출):

| 상품명 | 키워드 | 결과 |
|---|---|---|
| 귀청소기 고막세정기 이어스코프 | 청소기 | `suspect` / bodyPart / "귀" |
| 어항청소기 수족관 자동 청소 | 청소기 | `suspect` / animal / "어항" |
| 차량용청소기 무선 미니 진공 | 청소기 | `suspect` / placeVehicle / "차량용" |
| 무선청소기 스틱형 강력흡입 | 청소기 | `null` (정상 — 화이트리스트 계열 무선, 블랙리스트에 없음) |
| 삼성 로봇청소기 물걸레 겸용 | 청소기 | `null` (정상) |
| 미니청소기 탁상용 소형 | 청소기 | `null` (정상 — "미니"는 블랙리스트 아님, "미니어처"만 등재) |
| 미니어처청소기 인형의집 소품 | 청소기 | `suspect` / miniature / "미니어처" |
| 강아지청소기 반려동물 털제거 | 청소기 | `suspect` / animal / "강아지" |
| 귀청소기 전용 필터 5개입 | **귀청소기** | `null` (키워드 자체가 한정어 "귀" 포함 → 스킵 정상 작동) |

전 케이스 기대대로 판정됨. "미니청소기"(정상, 크기)와 "미니어처청소기"(전환, 완구)의 형태소 경계 구분(명세 §5 체크리스트)도 정확히 동작.

- **실 DB 교차확인**(`sourcingOpportunityRecord.wholesaleMatches`, 22건 스캔, 참고용·배포 영향 없음):
  - 최초 구현(토큰 경계 수정 전): suspect 3건 — 이 중 1건이 위 §2의 오탐(`"이"` 우연매칭)
  - 수정 후: suspect **2건**, 전부 실제 카테고리 전환 사례로 확인:
    - 키워드 "공기청정기" ← "우디 **차량용** 공기청정기 화이트..." (placeVehicle/차량용) — 실제 차량용 제품, 정확한 신호
    - 키워드 "청소기" ← "...**귀**청소기"(귀이개류 상품명) (bodyPart/귀) — 실제 귀 관리용품, 정확한 신호

## 4. write set 준수

명세대로 `category-mismatch-dict.ts`(신규)·`wholesale-matcher.ts` 2파일만 수정. 금지 파일(`sourcing-recommend/route.ts`·`SourcingRecommendWidget.tsx`) 미접촉. `git status` 확인 결과 이 2파일 외 변경 0.

## 5. 커밋·배포

- 커밋 `6b8b585`, main 직접 push(#36 — 신규 순수 함수 추가, route/위젯 미변경으로 저위험 판단)
- `verify-vercel-deploy.sh --wait`: **OK** — production `6b8b585` 확인
- sentinel grep 0건

## 6. 다음 단계 제안 (Desktop 2단계 몫)

1. **표시부 반영**: `SourcingRecommendWidget.tsx`(또는 카드)에 `categoryMismatch==='suspect'` 배지("다른 카테고리 의심")와 후순위 정렬 적용. `wholesale-matcher.ts`의 기존 정렬(`accessoryRisk` 우선)에 `categoryMismatch`를 추가 기준으로 넣을지, 아니면 accessoryRisk와 별개 축으로 둘지 설계 §4-1 3단계 등급과 함께 결정 필요.
2. **프로덕션 브라우저 실사용 검증**: tsc/build로는 사전 정확도를 못 잡는다(#310) — "청소기"·"가습기" 등 알려진 동음이의 키워드로 실제 소싱 스캔 후 배지 렌더 확인.
3. **효과 관찰 기간**(설계 §4-1): 1단계만으로 얼마나 잡히는지, 오탐 신고가 있는지 확인 후 필요 시 2단계(대분류 대조, categoryCode 앞 2자리 비교) 착수 여부 판단.
4. **HEAD_NOUN_WHITELIST 운영**: 운영자가 "이건 아닌데"라고 신고하는 한정어가 나오면 이 맵에 키워드별로 추가해 완화(설계 §4-1 완화 조건).
